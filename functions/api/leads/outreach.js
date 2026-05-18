/**
 * MTM Tool 07 — GHL Outreach Push
 * Route: POST /api/leads/outreach
 *
 * Takes scored leads from D1 and upserts them into GoHighLevel (v2 API) as
 * contacts with the right tags to trigger GHL automation workflows. On
 * success, marks the lead as contacted in D1 and stores the returned GHL
 * contact id so we can correlate later.
 *
 * Body — one of:
 *   { leadIds: [1,2,3], dryRun?: false }
 * or tier mode (uncontacted leads only, unless includeContacted is true):
 *   { tier: "Hot" | "Warm" | "Cold", limit?: 20, dryRun?: false }
 * or re-process mode (re-enrich + re-upsert every lead in a batch, *including*
 * ones already marked contacted — no scraping happens, the existing D1 rows
 * are sent back through the full enrichment chain and GHL upsert):
 *   { sourceBatch: "Manchester-NH-2026-05-03", limit?: 100, dryRun?: false }
 * Precedence when more than one is set: leadIds > sourceBatch > tier.
 *
 * includeContacted: false (default) — preserves the existing safety guards:
 *   tier-mode SQL filters `contacted = 0` and leadIds-mode skips rows where
 *   `contacted === 1` with `skipped: 'already_contacted'`. Set to true to
 *   bypass both — needed when re-processing a bad push (e.g. after a fix
 *   to the payload builder) where you want already-contacted leads to flow
 *   back through the pipeline. sourceBatch mode always includes contacted,
 *   so this flag is a no-op there.
 *
 * dryRun: true → builds the GHL payload and returns it without calling GHL
 * or touching D1. Use this to verify tag logic before going live.
 *
 * Returns:
 *   {
 *     success, attempted, pushed, failed, skipped_already_contacted,
 *     dryRun, results: [{ id, business_name, ok, ghl_contact_id?,
 *     tags_applied?, custom_fields_updated?, error?, skipped? }]
 *   }
 *
 * ─── Required environment variables (Cloudflare Pages → Settings → Env) ───
 *   ADMIN_PASSWORD_HASH | TOOLS_PASSWORD_HASH — auth (Bearer)
 *   DB                  — D1 binding
 *   GHL_API_KEY         — GHL private integration API key
 *                         (GHL → Settings → Integrations → API Keys)
 *   GHL_LOCATION_ID     — sub-account location id
 *                         (GHL → Settings, bottom of page)
 *
 * ─── Optional environment variables (enable owner-name enrichment) ───
 *   GOOGLE_PLACES_API_KEY — when set, enrichOwnerName() calls Places Text
 *                           Search + Place Details to look for an owner reply
 *                           on reviews (author_is_owner) before falling back
 *                           to the business-name split. No key → source is
 *                           skipped silently. Facebook enrichment also runs
 *                           when lead.facebook_url is present (no key needed).
 *
 * ─── D1 migration (run once in Cloudflare D1 console before deploying) ───
 *   ALTER TABLE leads_outreach ADD COLUMN ghl_contact_id TEXT;
 *
 * ─── GHL custom fields to create manually before custom-field updates work ───
 * Create these under GHL → Settings → Custom Fields → Contact, with the exact
 * field keys below (GHL prefixes keys with `contact.` internally — we pass
 * the bare key, which is what the v2 API expects):
 *
 *   Name              | Field Key         | Type
 *   ------------------+-------------------+------------------
 *   MTM Score         | mtm_score         | Number (or Text)
 *   MTM Tier          | mtm_tier          | Single Line / Dropdown
 *   MTM Score Reason  | mtm_score_reason  | Multi-Line Text
 *   MTM Category      | mtm_category      | Single Line
 *   MTM Source Batch  | mtm_source_batch  | Single Line
 *
 * If these don't exist yet, the upsert still succeeds — the second PUT call
 * to set custom fields is best-effort and logs `custom_fields_updated: false`
 * in the per-lead result.
 */

import { jsonResponse, corsPreflight, requireAdmin, requireDb } from './_auth.js';

export const onRequestOptions = () => corsPreflight();

const GHL_BASE      = 'https://services.leadconnectorhq.com';
const GHL_VERSION   = '2021-07-28';
const BATCH_CHUNK   = 5;          // concurrent GHL calls per chunk
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;
const RATE_RETRY_MS = 1000;       // wait before single retry on 429

export async function onRequestPost(context) {
  const { request, env } = context;

  const authErr = requireAdmin(request, env); if (authErr) return authErr;
  const dbErr   = requireDb(env);             if (dbErr)   return dbErr;

  let body = {};
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const dryRun = !!body.dryRun;

  // Credential checks happen only when we're actually going to call GHL.
  if (!dryRun) {
    if (!env.GHL_API_KEY) {
      return jsonResponse(
        { error: 'GHL_API_KEY env var missing. Add it under Pages → Settings → Environment variables.' },
        { status: 500 }
      );
    }
    if (!env.GHL_LOCATION_ID) {
      return jsonResponse(
        { error: 'GHL_LOCATION_ID env var missing. Find it under GHL → Settings (bottom of page).' },
        { status: 500 }
      );
    }
  }

  // ─── Resolve the work set ───
  const explicitIds = Array.isArray(body.leadIds)
    ? body.leadIds.map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n > 0)
    : null;
  const tier        = body.tier && ['Hot', 'Warm', 'Cold'].includes(body.tier) ? body.tier : null;
  const sourceBatch = typeof body.sourceBatch === 'string' && body.sourceBatch.trim()
    ? body.sourceBatch.trim()
    : null;
  const includeContacted = !!body.includeContacted;

  // Re-process mode defaults to MAX_LIMIT so an entire batch (up to the cap)
  // goes through in one call; tier mode keeps the smaller DEFAULT_LIMIT.
  const defaultLimit = sourceBatch ? MAX_LIMIT : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(parseInt(body.limit || defaultLimit, 10) || defaultLimit, 1), MAX_LIMIT);

  if (!explicitIds?.length && !tier && !sourceBatch) {
    return jsonResponse(
      { error: 'Body must include `leadIds` (array of ids), `tier` ("Hot"|"Warm"|"Cold"), or `sourceBatch` (string).' },
      { status: 400 }
    );
  }

  let leads;
  try {
    if (explicitIds?.length) {
      const placeholders = explicitIds.map(() => '?').join(',');
      const r = await env.DB.prepare(
        `SELECT id, business_name, category, address, phone, email, website_url,
                facebook_url, score, tier, score_reason, source_batch, contacted
         FROM leads_outreach WHERE id IN (${placeholders})`
      ).bind(...explicitIds).all();
      leads = r.results || [];
    } else if (sourceBatch) {
      // Re-process: include already-contacted leads. The GHL upsert is idempotent
      // (matches on email/phone) so this updates existing contacts rather than
      // duplicating them. contacted_at gets refreshed to the current time.
      const r = await env.DB.prepare(
        `SELECT id, business_name, category, address, phone, email, website_url,
                facebook_url, score, tier, score_reason, source_batch, contacted
         FROM leads_outreach
         WHERE source_batch = ?
         ORDER BY id ASC
         LIMIT ?`
      ).bind(sourceBatch, limit).all();
      leads = r.results || [];
    } else {
      // tier-mode: by default we only push uncontacted leads. includeContacted
      // = true drops that filter so re-processing a bad push (or refreshing a
      // bunch of contacts after a payload-builder fix) can flow through.
      const tierWhere = includeContacted ? 'WHERE tier = ?' : 'WHERE tier = ? AND contacted = 0';
      const r = await env.DB.prepare(
        `SELECT id, business_name, category, address, phone, email, website_url,
                facebook_url, score, tier, score_reason, source_batch, contacted
         FROM leads_outreach
         ${tierWhere}
         ORDER BY score DESC, id ASC
         LIMIT ?`
      ).bind(tier, limit).all();
      leads = r.results || [];
    }
  } catch (err) {
    return jsonResponse({ error: 'Could not load leads: ' + err.message }, { status: 500 });
  }

  if (!leads.length) {
    return jsonResponse({
      success: true, attempted: 0, pushed: 0, failed: 0,
      skipped_already_contacted: 0, dryRun, results: [],
      message:
        explicitIds?.length ? 'No matching leads.'
        : sourceBatch     ? `No leads found with source_batch = "${sourceBatch}".`
        : includeContacted ? 'No leads in that tier.'
        :                    'No uncontacted leads in that tier.',
    });
  }

  const results = [];
  let pushed = 0, failed = 0, skippedContacted = 0;

  // Process in chunks of 5 — keeps us under GHL rate limits while still parallel.
  for (let i = 0; i < leads.length; i += BATCH_CHUNK) {
    const chunk = leads.slice(i, i + BATCH_CHUNK);
    await Promise.all(chunk.map(async (lead) => {
      // Skip rows that were explicitly requested but are already contacted —
      // in tier mode the SQL filter does this (unless includeContacted is on).
      // includeContacted = true bypasses this guard so the same leads can be
      // re-pushed (idempotent upsert; existing GHL contact gets updated).
      if (explicitIds?.length && lead.contacted === 1 && !includeContacted) {
        skippedContacted++;
        results.push({
          id: lead.id, business_name: lead.business_name, ok: false,
          skipped: 'already_contacted',
        });
        return;
      }

      // Enrichment chain (all best-effort, errors swallowed):
      //   1. discoverSocialUrls — fetch lead.website_url and harvest social
      //      links + any "Owned by / Founded by" mention in the body text.
      //   2. enrichOwnerName    — if discoverSocialUrls didn't already set
      //      ownerFirstName, try Google Places (owner replies) and Facebook.
      // Either step may populate lead.ownerFirstName / lead.ownerLastName,
      // which buildContactPayload then prefers over splitBusinessName.
      await discoverSocialUrls(lead);
      await enrichOwnerName(lead, env);

      const payload = buildContactPayload(lead, env.GHL_LOCATION_ID || '<GHL_LOCATION_ID>');

      // GHL requires phone or email; without either the upsert will 422.
      if (!payload.phone && !payload.email) {
        failed++;
        results.push({
          id: lead.id, business_name: lead.business_name, ok: false,
          skipped: 'skipped_no_contact_info',
          error: 'Lead has neither phone nor email — GHL requires at least one.',
        });
        return;
      }

      if (dryRun) {
        results.push({
          id: lead.id, business_name: lead.business_name, ok: true,
          dryRun: true,
          tags_applied: payload.tags,
          ghl_payload: payload,
          custom_fields_preview: buildCustomFields(lead),
        });
        pushed++;
        return;
      }

      try {
        const upsertRes = await ghlUpsertContact(payload, env);
        const contactId = upsertRes?.contact?.id || upsertRes?.id || null;
        if (!contactId) {
          throw new Error('GHL upsert returned no contact id: ' + JSON.stringify(upsertRes).slice(0, 200));
        }

        // Custom fields are best-effort — they require the fields to exist in
        // GHL already (see header comment). Don't fail the whole push if this
        // step errors out.
        let cfUpdated = false, cfError = null;
        try {
          await ghlUpdateCustomFields(contactId, buildCustomFields(lead), env);
          cfUpdated = true;
        } catch (err) {
          cfError = err.message;
        }

        // Mark contacted in D1.
        try {
          await env.DB.prepare(
            `UPDATE leads_outreach
             SET contacted = 1, contacted_at = datetime('now'), ghl_contact_id = ?
             WHERE id = ?`
          ).bind(contactId, lead.id).run();
        } catch (err) {
          // D1 update failure shouldn't roll back the GHL push — surface it but
          // count as success since the contact is in GHL.
          results.push({
            id: lead.id, business_name: lead.business_name, ok: true,
            ghl_contact_id: contactId,
            tags_applied: payload.tags,
            custom_fields_updated: cfUpdated,
            custom_fields_error: cfError,
            warning: 'D1 update failed (ghl_contact_id column missing? run the migration): ' + err.message,
          });
          pushed++;
          return;
        }

        results.push({
          id: lead.id, business_name: lead.business_name, ok: true,
          ghl_contact_id: contactId,
          tags_applied: payload.tags,
          custom_fields_updated: cfUpdated,
          ...(cfError ? { custom_fields_error: cfError } : {}),
        });
        pushed++;
      } catch (err) {
        results.push({
          id: lead.id, business_name: lead.business_name, ok: false,
          error: err.message,
        });
        failed++;
      }
    }));
  }

  return jsonResponse({
    success: failed === 0,
    attempted: leads.length,
    pushed,
    failed,
    skipped_already_contacted: skippedContacted,
    dryRun,
    results,
  });
}

/* ────────────────────── payload builders ────────────────────── */

function buildContactPayload(lead, locationId) {
  const business = (lead.business_name || '').trim();

  // Enriched owner name (from enrichOwnerName) wins over the business-name split.
  let firstName, lastName;
  if (lead.ownerFirstName) {
    firstName = lead.ownerFirstName;
    lastName  = lead.ownerLastName;
  } else {
    const split = splitBusinessName(business);
    firstName = split.firstName;
    lastName  = split.lastName;
  }

  const phone = normalizePhone(lead.phone);
  const email = lead.email ? String(lead.email).trim().toLowerCase() || null : null;
  const tags  = buildTags(lead);

  // NOTE: v2 rejects `customFields` and `notes` on the upsert body — those go
  // through the dedicated PUT /contacts/{id} call afterwards. customFields is
  // intentionally an empty array here.
  const payload = {
    locationId,
    firstName,
    companyName: business,
    tags,
    customFields: [],
  };
  if (lastName) payload.lastName = lastName;
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (lead.address) payload.address1 = String(lead.address).trim();
  if (lead.website_url) payload.website = String(lead.website_url).trim();

  return payload;
}

function buildTags(lead) {
  const tags = ['outreach-tool'];
  if (lead.tier) tags.unshift(`tier-${String(lead.tier).toLowerCase()}`);
  if (lead.category) {
    const norm = String(lead.category)
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (norm) tags.splice(1, 0, `category-${norm}`);
  }
  return tags;
}

function buildCustomFields(lead) {
  return [
    { key: 'mtm_score',        field_value: lead.score != null ? String(lead.score) : '' },
    { key: 'mtm_tier',         field_value: lead.tier || '' },
    { key: 'mtm_score_reason', field_value: lead.score_reason || '' },
    { key: 'mtm_category',     field_value: lead.category || '' },
    { key: 'mtm_source_batch', field_value: lead.source_batch || '' },
  ];
}

/**
 * Strict split: only treat the business_name as a person's name when it is
 * *exactly* two capitalized single words with nothing after them
 * (e.g. "John Doe"). Anything with a trailing descriptor — "John Doe HVAC",
 * "East West Electric" — is treated as a company name, and the entire trimmed
 * string is used as firstName so GHL has something useful to display.
 */
function splitBusinessName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return { firstName: '' };

  const personal = trimmed.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
  if (personal) {
    return { firstName: personal[1], lastName: personal[2] };
  }
  return { firstName: trimmed };
}

/**
 * GHL v2 expects E.164 (+1XXXXXXXXXX for US). Anything we can't confidently
 * normalize gets returned as null so we don't ship bad data to GHL.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15 ? '+' + digits : null;
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return null;
}

/* ────────────────────── owner-name enrichment ────────────────────── */

/**
 * Best-effort: try to find the real owner's first/last name and attach them to
 * the lead as `ownerFirstName` / `ownerLastName`. Sources are tried in order
 * and the first confident hit wins. Never throws — any network or parse error
 * just causes that source to be skipped.
 *
 *   1. Google Places — Text Search → Place Details. Looks for owner replies on
 *      reviews (author_is_owner === true on the reply), then falls back to
 *      scanning editorial_summary for an "owned by / founded by" pattern.
 *      Requires env.GOOGLE_PLACES_API_KEY.
 *   2. Facebook business page — if lead.facebook_url is set, fetches the page
 *      HTML and looks for "Founded by", "Owner:", or page transparency labels.
 */
async function enrichOwnerName(lead, env) {
  // discoverSocialUrls runs first and may have already extracted the owner
  // name from the business's own website (no login wall, most reliable signal).
  // If so, don't overwrite it with a Places/Facebook guess.
  if (lead.ownerFirstName) return lead;

  if (env.GOOGLE_PLACES_API_KEY) {
    try {
      const found = await fetchOwnerFromGooglePlaces(lead, env);
      if (found?.firstName) {
        lead.ownerFirstName = found.firstName;
        if (found.lastName) lead.ownerLastName = found.lastName;
        return lead;
      }
    } catch { /* fall through to next source */ }
  }

  if (lead.facebook_url) {
    try {
      const found = await fetchOwnerFromFacebook(lead.facebook_url);
      if (found?.firstName) {
        lead.ownerFirstName = found.firstName;
        if (found.lastName) lead.ownerLastName = found.lastName;
        return lead;
      }
    } catch { /* fall through */ }
  }

  return lead;
}

/**
 * Best-effort: fetch the business's own website and harvest two things:
 *   (a) Outbound links to Facebook / Instagram / LinkedIn — these are nearly
 *       always present in the site header or footer and don't require auth,
 *       which is why we discover socials from the business site rather than
 *       hitting the platforms directly (FB serves a login wall).
 *   (b) An owner mention in the body text ("Owned by Jane Smith", "Founded by
 *       …"). About / Team pages frequently include this in plain prose.
 *
 * Mutates the lead in place: sets lead.facebook_url, lead.instagram_url,
 * lead.linkedin_url, lead.ownerFirstName, lead.ownerLastName when found.
 * Never throws — fetch errors, timeouts, and parse failures all return the
 * lead unchanged.
 */
async function discoverSocialUrls(lead) {
  if (!lead.website_url) return lead;

  const html = await fetchHtmlWithTimeout(String(lead.website_url).trim(), 5000);
  if (!html) return lead;

  // Pull every href value out of the HTML — cheap regex is fine for this.
  const hrefs = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    hrefs.push(m[1]);
  }

  for (const raw of hrefs) {
    const cleaned = cleanSocialUrl(raw);
    if (!cleaned) continue;

    if (!lead.facebook_url
        && /^https?:\/\/(?:[a-z0-9-]+\.)?facebook\.com\//i.test(cleaned)
        && !isFacebookNoise(cleaned)) {
      lead.facebook_url = cleaned;
    } else if (!lead.instagram_url
        && /^https?:\/\/(?:[a-z0-9-]+\.)?instagram\.com\//i.test(cleaned)
        && !isInstagramNoise(cleaned)) {
      lead.instagram_url = cleaned;
    } else if (!lead.linkedin_url
        && /^https?:\/\/(?:[a-z0-9-]+\.)?linkedin\.com\/(?:in|company)\//i.test(cleaned)) {
      lead.linkedin_url = cleaned;
    }

    if (lead.facebook_url && lead.instagram_url && lead.linkedin_url) break;
  }

  // While we have the HTML, scan the body text for an owner mention. If a
  // confident name is found, attach it directly — enrichOwnerName will see
  // ownerFirstName is set and bail out, so the website signal wins over the
  // Places/Facebook fallbacks.
  const text = stripHtmlToText(html);
  if (text) {
    const parsed = extractOwnerFromText(text);
    if (parsed?.firstName) {
      lead.ownerFirstName = parsed.firstName;
      if (parsed.lastName) lead.ownerLastName = parsed.lastName;
    }
  }

  return lead;
}

function cleanSocialUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function isFacebookNoise(url) {
  // Share buttons, pixels, plugin iframes, dialog URLs — none of these point
  // at a real business page.
  return /\/(?:sharer|share|tr|plugins|dialog|share_dialog|profile\.php)\b/i.test(url);
}

function isInstagramNoise(url) {
  return /\/(?:p|reel|reels|stories|explore|accounts)\b/i.test(url);
}

/**
 * Shared HTML fetch with a hard timeout. Returns the response body on 2xx,
 * or null for any error / non-2xx / abort. Never throws.
 */
async function fetchHtmlWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MTMOutreachBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripHtmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchOwnerFromGooglePlaces(lead, env) {
  const business = (lead.business_name || '').trim();
  if (!business) return null;

  const city = extractCityFromAddress(lead.address || '');
  const query = city ? `${business} ${city}` : business;

  const searchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    + `?query=${encodeURIComponent(query)}`
    + `&key=${encodeURIComponent(env.GOOGLE_PLACES_API_KEY)}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return null;
  const searchJson = await searchRes.json().catch(() => null);
  const placeId = searchJson?.results?.[0]?.place_id;
  if (!placeId) return null;

  const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json'
    + `?place_id=${encodeURIComponent(placeId)}`
    + '&fields=reviews,editorial_summary,website'
    + `&key=${encodeURIComponent(env.GOOGLE_PLACES_API_KEY)}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) return null;
  const detailsJson = await detailsRes.json().catch(() => null);
  const result = detailsJson?.result;
  if (!result) return null;

  // Primary signal: owner reply on a review.
  const reviews = Array.isArray(result.reviews) ? result.reviews : [];
  for (const r of reviews) {
    const reply = r?.reply || r?.owner_response || r?.author_reply;
    if (reply && reply.author_is_owner === true && reply.author_name) {
      const parsed = parsePersonName(reply.author_name);
      if (parsed) return parsed;
    }
  }

  // Secondary signal: editorial summary occasionally credits the owner.
  const editorial = result.editorial_summary?.overview || '';
  if (editorial) {
    const parsed = extractOwnerFromText(editorial);
    if (parsed) return parsed;
  }

  return null;
}

async function fetchOwnerFromFacebook(url) {
  // m.facebook.com returns a much lighter HTML doc with fewer login redirects
  // than the SPA-heavy www.facebook.com.
  const mobileUrl = String(url).replace(
    /^(https?:\/\/)(?:www\.|web\.)?facebook\.com\//i,
    '$1m.facebook.com/'
  );

  const html = await fetchHtmlWithTimeout(mobileUrl, 5000);
  if (!html) return null;

  const text = stripHtmlToText(html);
  if (!text) return null;

  // Login-wall detection — m.facebook.com still serves a login page for some
  // pages/regions. Walls are short and pepper "log in" / "create account"
  // throughout; real About content has neither in any volume.
  const loginHits =
      (text.match(/\blog in\b/gi)        || []).length
    + (text.match(/\bcreate account\b/gi) || []).length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (loginHits >= 2 && wordCount < 500) return null;

  return extractOwnerFromText(text);
}

function extractOwnerFromText(text) {
  if (!text) return null;
  // Patterns we expect on FB About / page transparency / editorial summaries.
  const patterns = [
    /\bFounded by\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z'’\-]+))?/,
    /\bOwned by\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z'’\-]+))?/i,
    /\bOwner[:\s]+([A-Z][a-z]+)(?:\s+([A-Z][a-z'’\-]+))?/i,
    /\bFounder[:\s]+([A-Z][a-z]+)(?:\s+([A-Z][a-z'’\-]+))?/i,
    /\bProprietor[:\s]+([A-Z][a-z]+)(?:\s+([A-Z][a-z'’\-]+))?/i,
    /\bPage managers?\s*[:\-]?\s*([A-Z][a-z]+)(?:\s+([A-Z][a-z'’\-]+))?/i,
    /\bPage admin\s*[:\-]?\s*([A-Z][a-z]+)(?:\s+([A-Z][a-z'’\-]+))?/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      return { firstName: m[1], lastName: m[2] || undefined };
    }
  }
  return null;
}

function parsePersonName(raw) {
  const cleaned = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  const parts = cleaned.split(' ');
  // Skip handle-style names ("ABC HVAC Owner Reply") and single-token names.
  if (parts.length < 2 || parts.length > 4) return null;
  // Each part should look like a name token (starts capital, mostly letters).
  if (!parts.every(p => /^[A-Z][A-Za-z'’\-\.]{0,30}$/.test(p))) return null;
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function extractCityFromAddress(address) {
  // US-style "123 Main St, Phoenix, AZ 85001" — city is third-from-last when
  // we have street/city/state-zip; falls back to the first chunk for "City, ST".
  const parts = String(address).split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length === 2) return parts[0];
  return '';
}

/* ────────────────────── GHL calls ────────────────────── */

async function ghlUpsertContact(payload, env) {
  return ghlFetch('POST', '/contacts/upsert', payload, env);
}

async function ghlUpdateCustomFields(contactId, customFields, env) {
  return ghlFetch('PUT', `/contacts/${encodeURIComponent(contactId)}`, { customFields }, env);
}

async function ghlFetch(method, path, body, env) {
  const doFetch = () => fetch(GHL_BASE + path, {
    method,
    headers: {
      'Authorization': `Bearer ${env.GHL_API_KEY}`,
      'Version': GHL_VERSION,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let res = await doFetch();
  // Single retry on 429 — GHL's rate limiter is bursty but recovers quickly.
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, RATE_RETRY_MS));
    res = await doFetch();
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GHL API ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}
