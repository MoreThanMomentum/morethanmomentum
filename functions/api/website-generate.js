/**
 * MTM Website Generator — Pre-call Demo Site Builder
 * Route: POST /api/website-generate
 *
 * STREAMING NDJSON response. The function returns a ReadableStream the moment
 * it's invoked, then pushes line-delimited JSON events as work progresses.
 * This is required because the synchronous "do everything, return one blob"
 * shape exceeded Cloudflare's 100s edge wall-clock and triggered HTTP 524.
 * Streaming keeps the connection healthy by emitting bytes continuously.
 *
 * Two-stage Claude flow:
 *   Stage A (research) — web_search-enabled Claude call extracts a normalized
 *     business profile (services, branding hints, tone, pricing if public,
 *     review-language samples, location context, etc.) from Google + the
 *     prospect's existing website + their socials. Single non-streaming call
 *     because web_search tool use isn't useful to surface mid-flight.
 *   Stage B (generation) — Claude Sonnet 4.6 produces a multi-page MTM
 *     template using `stream: true`. Text deltas are accumulated server-side
 *     and a heartbeat is pushed to the client every ~500 chars so the
 *     connection stays alive AND the user sees real progress.
 *
 * NDJSON event protocol (each line is a complete JSON object):
 *   {"event":"received", ...}                  — request validated, work starts
 *   {"event":"research_start"}                 — Stage A kicked off
 *   {"event":"research_done", "research":{...}} — Stage A returned
 *   {"event":"generate_start"}                  — Stage B kicked off
 *   {"event":"generate_progress", "chars":N}    — Stage B text-delta heartbeat
 *   {"event":"complete", "businessName", "slug", "files", "research"}
 *   {"event":"error", "message"}               — terminal; client should fail
 *
 * Forward-compat: the JSON template emitted by Stage A still matches the
 * schema accepted by colby-side/website-generator-worker — so the same
 * research blob can drive either the ZIP-download path (this file) or a
 * preview-subdomain deploy path later.
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY — same one the prospect/proposal/report tools use
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const t0 = Date.now();
  const ts = () => `[+${((Date.now() - t0) / 1000).toFixed(1)}s]`;

  // Parse + validate body up front so we can still return clean 4xx responses
  // for malformed input (the streaming path can only emit error EVENTS once
  // it's started, which is worse UX for "you forgot a field").
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const { businessName, city, websiteUrl, tone, siteType, pages } = body;

  if (!businessName || !city) {
    return jsonResponse({ error: 'Business name and city are required.' }, 400);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'API key not configured. Add ANTHROPIC_API_KEY to environment variables.' }, 500);
  }

  const normalizedSiteType = normalizeSiteType(siteType);
  const requestedPages = Array.isArray(pages) ? pages.map(String) : null;
  const requestOrigin = new URL(request.url).origin;

  // ─── STREAMING SETUP ────────────────────────────────────────────────────
  // TransformStream gives us a {readable, writable} pair. We hand `readable`
  // back as the Response body immediately and write events to `writable` from
  // the async runner below. The fetch() call above has already completed by
  // the time this Response is returned — the runner runs concurrently while
  // the client consumes the stream.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = async (obj) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(obj) + '\n'));
    } catch (e) {
      // Client disconnected mid-stream — log and stop. Don't throw, the
      // runner needs to cleanly close the writer in finally.
      console.error(`${ts()} [wgen] writer.write failed (client likely disconnected):`, e.message);
    }
  };

  // Kick off the async runner. Do NOT await it — we want the Response to
  // start streaming immediately.
  (async () => {
    try {
      console.log(`${ts()} [wgen] request received: business="${businessName}" city="${city}" url="${websiteUrl || ''}" tone="${tone || ''}" siteType="${normalizedSiteType}"`);
      await send({ event: 'received', businessName, city, siteType: normalizedSiteType });

      // ─── STAGE A — RESEARCH ────────────────────────────────────────────
      console.log(`${ts()} [wgen] STAGE A research START`);
      await send({ event: 'research_start' });
      const research = await runResearch({
        businessName, city, websiteUrl,
        toneOverride: tone,
        siteType: normalizedSiteType,
        apiKey: env.ANTHROPIC_API_KEY,
        log: (msg) => console.log(`${ts()} [wgen][A] ${msg}`),
      });
      console.log(`${ts()} [wgen] STAGE A research DONE — services=${research.services?.length || 0} confidence=${research.researchNotes?.researchConfidence || 'n/a'}`);
      await send({ event: 'research_done', research });

      // ─── STAGE B — GENERATION ──────────────────────────────────────────
      // Two branches:
      //   - DEALER: skips Stage B AI generation entirely. Fetches the inventory
      //     template files from this Pages deployment's static assets, runs
      //     token substitution per templates/inventory/tokens.json, generates
      //     per-client config (inventory.json, sitemap.xml, SETUP_README.md),
      //     filters by the `pages` array, and bundles. ~5s total.
      //   - OTHER: existing streaming AI generation (brochure / service /
      //     hospitality fall here until Cole builds templates for them).
      let files;
      if (normalizedSiteType === 'dealer') {
        console.log(`${ts()} [wgen] DEALER TEMPLATE branch — skipping Stage B AI generation`);
        await send({ event: 'generate_start' });
        files = await runDealerTemplate({
          research,
          requestedPages,
          origin: requestOrigin,
          log: (msg) => console.log(`${ts()} [wgen][T] ${msg}`),
        });
        console.log(`${ts()} [wgen] DEALER TEMPLATE done — files=${Object.keys(files).length} totalBytes=${totalBytes(files)}`);
      } else {
        console.log(`${ts()} [wgen] STAGE B generation START (AI path)`);
        await send({ event: 'generate_start' });
        files = await runGenerationStreaming({
          research,
          siteType: normalizedSiteType,
          apiKey: env.ANTHROPIC_API_KEY,
          onProgress: async (chars) => {
            // Keep the connection warm with a regular heartbeat. Sampling
            // approximately every 500 chars keeps the stream chatty enough to
            // pass any intermediary idle timeout while not flooding the client.
            await send({ event: 'generate_progress', chars });
          },
          log: (msg) => console.log(`${ts()} [wgen][B] ${msg}`),
        });
        console.log(`${ts()} [wgen] STAGE B generation DONE — files=${Object.keys(files).length} totalBytes=${totalBytes(files)}`);
      }

      console.log(`${ts()} [wgen] sending complete event`);
      await send({
        event: 'complete',
        businessName: research.business.name,
        slug: slugify(research.business.name),
        files,
        research,
      });
    } catch (err) {
      console.error(`${ts()} [wgen] ERROR:`, err.message, err.stack?.slice(0, 500));
      await send({ event: 'error', message: err.message || 'Something went wrong.' });
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-transform',
      // Disable proxy buffering — important so each NDJSON line arrives at
      // the client immediately rather than getting batched.
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ─── SITE TYPE NORMALIZATION ──────────────────────────────────────────────────

const SUPPORTED_SITE_TYPES = new Set([
  'brochure',
  'service-business',
  'dealer',
  'hospitality',
]);

// Backward-compat aliases. Old Tool 06 UI used `inventory` for what's now
// `dealer`, and had restaurant/real-estate/portfolio site types we've since
// dropped (not MTM target market). These aliases keep in-flight requests from
// breaking while the rollout completes.
const SITE_TYPE_ALIASES = {
  'inventory': 'dealer',
  'restaurant': 'hospitality',
  'real-estate': 'brochure',
  'portfolio': 'brochure',
};

function normalizeSiteType(raw) {
  if (!raw) return 'brochure';
  const v = String(raw).toLowerCase().trim();
  if (SUPPORTED_SITE_TYPES.has(v)) return v;
  if (SITE_TYPE_ALIASES[v]) return SITE_TYPE_ALIASES[v];
  return 'brochure';
}

function siteTypeHint(siteType) {
  // Short hint text injected into the AI generation prompt for non-template
  // site types (brochure, service-business, hospitality). The dealer site
  // type uses the inventory template directly and bypasses this prompt.
  switch (siteType) {
    case 'service-business':
      return 'Site type: SERVICE BUSINESS (HVAC, plumbing, roofing, landscaping, cleaning, electrical, salons, barbers, spas, dental, vet, fitness studios — anywhere the funnel is "book me"). Emphasize booking, service-area coverage, emergency/24-7 if applicable, and trust signals (license, insurance, years in business, reviews). Standard 4-page structure (Home, Services, About, Contact) but lead with a clear service-area + booking CTA on Home.';
    case 'dealer':
      return 'Site type: DEALER / CATALOG (golf carts, vehicles, RVs, boats, equipment, machinery, motorcycles — high-ticket inventory). The Services page should be reframed as a Shop or Inventory page with a placeholder grid for individual product listings (each card: image placeholder, model name, price, "View details" link). Add a clear "Get a Quote" CTA on Home and a financing-info section if relevant. Keep the contact/booking placeholders intact for the Phase 2 GHL embed.';
    case 'hospitality':
      return 'Site type: HOSPITALITY (bars, restaurants, breweries, coffee shops, cafes, food trucks, ice cream shops — visit-driven local businesses). Replace the Services page with a Menu page (sections appropriate to the business: food + drinks for restaurants, taps + bottles for breweries, etc.). The Home hero should emphasize cuisine/atmosphere, location, hours, and (if applicable) reservations. Keep the booking placeholder for venues that take reservations.';
    case 'brochure':
    default:
      return 'Site type: BROCHURE (general small-business marketing site). Standard 4-page structure (Home, Services, About, Contact) with the GHL contact form + booking embed placeholders on the Contact page. This is the default catch-all when no specialized template applies.';
  }
}

function totalBytes(files) {
  return Object.values(files).reduce((n, c) => typeof c === 'string' ? n + c.length : n, 0);
}

// ─── STAGE A SOURCE 1 — DIRECT WEBSITE EXTRACTION ────────────────────────────
// Fetch the client's existing website HTML and pull out hex colors, headlines,
// trust signal phrases, and a body text excerpt. Runs BEFORE the Anthropic
// research call, and the extracted data gets injected into the research prompt
// as authoritative ground truth (Claude is instructed not to contradict it).
// Then mergeWebsiteData re-applies the extracted values post-parse so direct
// extraction always wins over Claude's guesses.
//
// All fail-soft: if fetch errors, returns null and Claude's research call
// proceeds without ground truth (lower confidence but doesn't block generation).

const TRUST_SIGNAL_PATTERNS = [
  /\bveteran[- ]owned\b/i,
  /\bfamily[- ]owned\b/i,
  /\bwoman[- ]owned\b/i,
  /\blocally owned\b/i,
  /\blicensed\b/i,
  /\bcertified\b/i,
  /\binsured\b/i,
  /\baward[- ]winning\b/i,
  /\bauthorized dealer\b/i,
  /\b\d+\+?\s*years?\s+(?:of\s+)?experience\b/i,
  /\b\d+\+?\s*years\s+in\s+business\b/i,
  /\b\d+(?:\.\d+)?\s*[-‑]?\s*star\b/i,
];

async function fetchWebsiteData(rawUrl, log = () => {}) {
  // Normalize URL — accept bare domains
  let url = String(rawUrl).trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  log(`fetching ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let html;
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Realistic UA — many small-biz sites block "fetch/X" and other bot UAs.
        'User-Agent': 'Mozilla/5.0 (compatible; MTMResearch/1.0; +https://morethanmomentum.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch (e) {
    clearTimeout(timeoutId);
    throw new Error(`fetch failed: ${e.message}`);
  }

  // Cap at 1MB — anything larger is mostly tracking junk we don't need
  if (html.length > 1024 * 1024) html = html.slice(0, 1024 * 1024);

  const data = {
    url,
    title: extractTitle(html),
    metaDescription: extractMetaDescription(html),
    colors: extractColors(html),
    headings: extractHeadings(html),
    trustSignals: extractTrustSignals(html),
    bodyTextSample: stripHtml(html).slice(0, 4000),
  };

  log(`extracted: title="${(data.title || '').slice(0, 60)}" colors=${data.colors.slice(0, 3).join(',')} headings=${data.headings.length} trust=${data.trustSignals.length}`);
  return data;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m) return decodeEntities(m[1].trim()).slice(0, 200);
  const og = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  if (og) return decodeEntities(og[1]).slice(0, 200);
  return null;
}

function extractMetaDescription(html) {
  const m = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (m) return decodeEntities(m[1]).slice(0, 400);
  const og = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  if (og) return decodeEntities(og[1]).slice(0, 400);
  return null;
}

function extractColors(html) {
  // Match hex literals: #fff, #abcd, #abcdef, #abcdef00
  const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
  const counts = new Map();
  let match;
  while ((match = hexRegex.exec(html)) !== null) {
    let hex = match[1].toLowerCase();
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    } else if (hex.length === 4) {
      // 4-digit hex with alpha (#rgba) — drop the alpha
      hex = hex.slice(0, 3).split('').map(c => c + c).join('');
    } else if (hex.length === 8) {
      // 8-digit hex with alpha (#rrggbbaa) — drop the alpha
      hex = hex.slice(0, 6);
    } else if (hex.length !== 6) {
      continue;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) continue;

    // Skip near-white (background colors) and near-black (default text)
    if (r > 238 && g > 238 && b > 238) continue;
    if (r < 34 && g < 34 && b < 34) continue;

    const key = '#' + hex;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)
    .slice(0, 8);
}

function extractHeadings(html) {
  const headings = [];
  const hRegex = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi;
  let match;
  while ((match = hRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (text && text.length > 1 && text.length < 300) headings.push(text);
  }
  return headings.slice(0, 20);
}

function extractTrustSignals(html) {
  const text = stripHtml(html);
  const found = new Set();
  for (const pattern of TRUST_SIGNAL_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      // Title-case the matched phrase for display ("veteran-owned" → "Veteran-Owned")
      const phrase = m[0].trim().replace(/\b\w/g, c => c.toUpperCase());
      found.add(phrase);
    }
  }
  return Array.from(found).slice(0, 8);
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function buildGroundTruthBlock(websiteData) {
  if (!websiteData) return '';
  const parts = [];
  parts.push('═══════════════════════════════════════════════════════════════════════════════');
  parts.push('GROUND TRUTH — DIRECT EXTRACTION FROM CLIENT WEBSITE');
  parts.push('═══════════════════════════════════════════════════════════════════════════════');
  parts.push(`The following data was fetched and parsed directly from ${websiteData.url} BEFORE this research call ran. These values are AUTHORITATIVE — DO NOT contradict them. Use these for the corresponding fields, then fill in everything else from web_search.`);
  parts.push('');
  if (websiteData.title) parts.push(`Website title: "${websiteData.title}"`);
  if (websiteData.metaDescription) parts.push(`Meta description: "${websiteData.metaDescription}"`);
  if (websiteData.colors.length > 0) {
    parts.push(`Most-used hex colors (CSS frequency-counted): ${websiteData.colors.slice(0, 5).join(', ')}`);
    parts.push(`  → Use ${websiteData.colors[0]} as branding.primaryColor`);
    if (websiteData.colors[1]) parts.push(`  → Use ${websiteData.colors[1]} as branding.secondaryColor`);
  }
  if (websiteData.headings.length > 0) {
    parts.push(`Page headlines (H1/H2): ${websiteData.headings.slice(0, 8).map(h => `"${h}"`).join(' | ')}`);
  }
  if (websiteData.trustSignals.length > 0) {
    parts.push(`Trust signal phrases found in HTML: ${websiteData.trustSignals.join(', ')}`);
    parts.push(`  → Include all of these in business.trustSignals`);
  }
  if (websiteData.bodyTextSample) {
    parts.push(`Body text excerpt (first 800 chars): "${websiteData.bodyTextSample.slice(0, 800)}..."`);
  }
  parts.push('═══════════════════════════════════════════════════════════════════════════════');
  return parts.join('\n');
}

function mergeWebsiteData(research, websiteData) {
  if (!websiteData) return;
  research.business = research.business || {};
  research.branding = research.branding || {};

  // Brand colors — direct extraction always wins. Claude can over-confidently
  // claim a different brand color, but the site's own CSS is authoritative.
  if (websiteData.colors[0]) {
    research.branding.primaryColor = websiteData.colors[0];
  }
  if (websiteData.colors[1]) {
    research.branding.secondaryColor = websiteData.colors[1];
  }

  // Tagline — only fill if Claude didn't find one and we have a title
  if (!research.business.tagline && websiteData.title) {
    research.business.tagline = websiteData.title;
  }

  // Trust signals — merge extracted with Claude's, dedupe (case-insensitive)
  if (websiteData.trustSignals.length > 0) {
    const existing = Array.isArray(research.business.trustSignals)
      ? research.business.trustSignals : [];
    const seen = new Set(existing.map(s => String(s).toLowerCase()));
    for (const sig of websiteData.trustSignals) {
      if (!seen.has(sig.toLowerCase())) {
        existing.push(sig);
        seen.add(sig.toLowerCase());
      }
    }
    research.business.trustSignals = existing.slice(0, 8);
  }
}

// ─── STAGE A — RESEARCH CALL ──────────────────────────────────────────────────

async function runResearch({ businessName, city, websiteUrl, toneOverride, siteType, apiKey, log = () => {} }) {
  // ── Source 1: direct website extraction ──────────────────────────────────
  // Runs BEFORE the Anthropic call. Whatever we extract here is fed into the
  // research prompt as authoritative ground truth, then re-applied post-parse
  // so it always wins over Claude's guesses (Claude sometimes ignores the
  // ground truth and hallucinates a different brand color).
  let websiteData = null;
  if (websiteUrl) {
    try {
      websiteData = await fetchWebsiteData(websiteUrl, log);
    } catch (e) {
      log(`website extraction failed (continuing without): ${e.message}`);
    }
  }

  const groundTruth = buildGroundTruthBlock(websiteData);

  const userMessage = websiteUrl
    ? `Research this business and produce the structured JSON template.

Business: "${businessName}"
Location: "${city}"
Website: ${websiteUrl}

Use the GROUND TRUTH block in the system prompt as authoritative — those values were extracted directly from the website's HTML and CSS. Use web_search for everything else: Google Business profile (category, hours, phone, reviews), social media (Facebook/Instagram bios), Yelp, BBB. Return ONLY the JSON object — no preamble, no markdown fences.`
    : `Research this business and produce the structured JSON template.

Business: "${businessName}"
Location: "${city}"

No website URL was provided. Search for their existing website first, then Google Business profile, social media, Yelp, BBB. Extract real data wherever possible. If no web presence exists, infer reasonable defaults from the industry + location. Return ONLY the JSON object.`;

  const systemPrompt = `You are the research engine behind More Than Momentum's pre-call website generator. Your job: take a target business, do thorough web research, and emit a normalized JSON template that drives the website generator.

Quality standard: this template determines whether the generated site looks like "you already understand my business" (closes deals) or "this is AI slop with my name on it" (doesn't). Pull real data wherever you can — real services with real prices when publicly listed, real owner names from About pages, real review snippets from Google, real brand colors from existing site CSS, real trust signals (veteran-owned, X years in business, licensed, certified) from copy. Sample voice from review responses. Don't invent specifics you can't verify — but DO infer reasonable industry defaults when the business has no web presence.

${siteTypeHint(siteType)}

Tone selection rule: pick ONE of professional|friendly|luxury|authoritative|casual based on what the existing brand actually feels like. Trade businesses (HVAC, plumbing, roofing, landscaping) usually land on friendly or authoritative. Premium retail / service (golf carts, custom homes, financial advisors) lands on luxury or professional. Default to friendly when ambiguous.${toneOverride ? `\n\nTONE OVERRIDE FROM USER: "${toneOverride}" — use exactly this tone, ignore your own inference.` : ''}

${groundTruth}

CRITICAL: Your ENTIRE response must be a single valid JSON object. Start with { and end with }. No text before, no text after, no markdown fences, no commentary. Just the raw JSON conforming to this schema:

{
  "slug": "lowercase-hyphen-business-slug-max-50-chars",
  "business": {
    "name": "Exact business name as found",
    "legalName": "Full legal name with LLC/Inc/Corp suffix if applicable, else null",
    "shortName": "Short brand reference (initials or first word) if name has multiple words, else null",
    "industry": "concise industry phrase, e.g. 'HVAC contractor' or 'golf cart dealer' or 'craft brewery'",
    "tagline": "One short sentence that captures the business's positioning",
    "heroBadgeTagline": "Short hero-pill phrase like \\"Southern NH's #1 Golf Cart Dealer\\" — punchy, location-anchored",
    "metaDescription": "Full meta description for the home page (140-160 chars, keyword-rich)",
    "ogDescription": "Shorter Open Graph description (90-120 chars)",
    "inventoryHeadlineCopy": "Shop page hero subhead, e.g. '15+ models in stock — from cruisers to off-road beasts to street-legal LSVs.'",
    "inventoryDescriptor": "Short shop descriptor for meta description, e.g. '15+ models from $7,295. New carts, LSVs, off-road'",
    "lifestyleEyebrow": "Eyebrow above the lifestyle photo grid section, e.g. 'The SNH Life'",
    "contactPageHeadline": "Page title for contact page using the product noun, e.g. \\"Let's Talk Carts.\\" or \\"Let's Talk Boats.\\" — only set if you can use a natural product noun, else null",
    "serviceSectionHeadline": "Services page title with HTML <br /> break, e.g. \\"We Don't Just Sell Carts.<br />We Keep Them Running.\\" — only set if natural, else null",
    "startingPrice": "Lowest product starting price as displayed string with $ and comma, e.g. '$7,295', or 'Call for Pricing' if no public pricing",
    "yearFounded": "YYYY or null if unknown",
    "tone": "professional|friendly|luxury|authoritative|casual",
    "owner": {
      "fullName": "Owner's full name if discovered from About page or Google profile, else null",
      "firstName": "Owner's first name if known, else null"
    },
    "trustSignals": ["array of trust phrases found in copy or Google profile, e.g. 'Veteran-Owned LLC', '20+ Years Experience', 'Family-Owned', 'Licensed & Insured', 'Authorized Dealer'"],
    "trustQualifier": "single most-prominent trust phrase, e.g. 'Veteran-Owned' or 'Family-Owned' or 'Award-Winning', or empty string",
    "trustStatLabel": "stat-bar trust label using the qualifier, e.g. 'Veteran-Owned & Operated' or 'Family-Owned & Operated' or 'Locally Owned & Operated'",
    "useCases": ["array of 4-6 short lowercase use-case phrases like 'lake houses', 'campgrounds', 'neighborhoods', 'weddings' — adapted to the industry"],
    "lifestyleUseCases": [
      { "title": "Lake Houses", "subtitle": "Glide the shoreline in style", "image": "/images/dock.png", "gradient": "lake" },
      { "title": "Campgrounds", "subtitle": "Fleet packages for operators", "image": "/images/camping.png", "gradient": "campground" },
      { "title": "Weddings", "subtitle": "Arrive in unforgettable style", "image": "/images/wedding.png", "gradient": "wedding" },
      { "title": "Neighborhoods", "subtitle": "Your road. Your cart. Your rules.", "image": "/images/street.png", "gradient": "neighborhood" }
    ],
    "typewriterPhrases": ["array of 4-6 short phrases that cycle in the hero typewriter effect, ≤30 chars each ending in period — match brand voice"],
    "googleReviewsUrl": "URL to Google Maps reviews if found, else '#'",
    "financingPartners": [
      { "name": "Sheffield Financial", "url": "https://...", "tagline": "New cart financing — quick pre-qual online" }
    ],
    "partnerLinks": {
      "usedInventory": "URL to a separate used-inventory site if business operates one, else null"
    },
    "social": {
      "facebook": "URL or null",
      "instagram": "URL or null"
    },
    "tracking": {
      "ga4Id": "G-XXXXXXXXXX or null"
    },
    "location": {
      "city": "city",
      "state": "ST",
      "address": "full street address if found, else null",
      "zip": "ZIP as string or null",
      "serviceArea": "geographic area they serve, e.g. 'Greater Manchester NH and surrounding towns'",
      "regionShort": "Marketing-shorthand region, e.g. 'Southern NH'",
      "regionLong": "Long-form region name, e.g. 'Southern New Hampshire'"
    },
    "contact": {
      "phone": "Phone in display format like '603-777-7831', or null",
      "email": "Email or null",
      "website": "Existing site URL or null"
    },
    "hours": {
      "Mon": "8am-5pm", "Tue": "8am-5pm", "Wed": "8am-5pm", "Thu": "8am-5pm",
      "Fri": "8am-5pm", "Sat": "Closed", "Sun": "Closed"
    }
  },
  "branding": {
    "primaryColor": "#hex — IF GROUND TRUTH provided a color, use that exactly. Otherwise infer from brand cues",
    "primaryColorDark": "#hex (8-15% darker variant) or null to let generator compute",
    "primaryColorLight": "#hex (10-15% lighter variant) or null",
    "secondaryColor": "#hex — IF GROUND TRUTH provided a second color, use that. Otherwise complementary",
    "accentColor": "#hex — for CTAs, often the secondary color or a high-contrast highlight",
    "accentColorDark": "#hex or null",
    "accentColorLight": "#hex or null",
    "font": "Google Font name appropriate to tone, e.g. 'Inter', 'DM Sans', 'Playfair Display', 'Montserrat'",
    "tone": "professional|friendly|luxury|authoritative|casual"
  },
  "vocabulary": {
    "itemPlural": "lowercase plural noun for catalog items, e.g. 'carts', 'vehicles', 'boats', 'menu items'",
    "itemSingular": "lowercase singular noun, e.g. 'cart', 'vehicle', 'boat', 'menu item'",
    "catalogPageLabel": "title-case label for the shop/catalog page, e.g. 'Inventory', 'Carts', 'Menu', 'Vehicles'",
    "itemExampleName": "an example item name for admin placeholder text, like 'Apollo Rider' for golf carts or '2024 Sea Ray 280' for boats"
  },
  "services": [
    { "name": "Service Name", "description": "1-2 sentence description grounded in what this business actually offers", "price": "public price if listed, else null", "icon": "single emoji that matches the service" }
  ],
  "content": {
    "uniqueValue": "One sentence stating what makes this business different — derived from real research, not generic platitudes",
    "benefits": ["specific benefit 1", "specific benefit 2", "specific benefit 3", "specific benefit 4"],
    "testimonials": [
      { "text": "Pulled from actual Google reviews if available, else realistic-but-generic", "author": "Reviewer first name + last initial, or 'Verified Customer'" }
    ],
    "faqs": [
      { "question": "Q grounded in what real customers ask this kind of business", "answer": "A in the brand's tone" }
    ],
    "aboutStory": "2-3 paragraph about-us story. If you found real history (founder name, year founded, origin), use it. Otherwise write a credible industry-typical origin story.",
    "voiceSamples": ["short phrase 1 sampled from review responses or existing site copy", "short phrase 2"]
  },
  "automation": {
    "enableContactForm": true,
    "enableBooking": true,
    "enableChatWidget": false
  },
  "researchNotes": {
    "websiteFound": "URL or 'none'",
    "websitePlatform": "Wix|WordPress|Squarespace|Shopify|Custom|None|Unknown",
    "googleBusinessFound": true,
    "reviewSnapshot": "e.g. '47 reviews · 4.8 stars' or 'Not Found'",
    "socialPresence": { "instagram": "Active|Inactive|None", "facebook": "Active|Inactive|None" },
    "competitorContext": "1-2 sentences on the local competitive landscape if found"
  }
}

Aim for 4-6 services, 3-4 testimonials, 4-5 FAQs. If you can't find real data for a section, fill in industry-typical defaults.

For lifestyleUseCases: pick 4 use cases that fit THIS business's ideal customer. Map each to one of the four available CSS gradient classes (lake|campground|wedding|neighborhood) — pick whichever fits visually. Examples:
- Golf cart dealer → lake houses, campgrounds, weddings, neighborhoods (uses each gradient once)
- Bar / brewery → date nights ('wedding'), after-work ('campground'), weekends ('lake'), events ('neighborhood')
- Boat dealer → lake life ('lake'), tournaments ('wedding'), family fishing ('campground'), marina life ('neighborhood')
- Pure trades / generic SMB → return [] (empty array; the lifestyle section is optional)

For trustSignals: include any explicit trust phrases the business uses. Don't invent. If GROUND TRUTH listed phrases, those MUST appear in your trustSignals array.

For typewriterPhrases: 4-6 short phrases (≤30 chars each, ending in period). Tied to brand identity. Veteran golf cart dealer → ["By Someone Who Served.", "For Southern NH.", "For Lake Houses.", "For Life."]. Family bakery → ["Made by Hand.", "Made with Love.", "Baked Fresh Daily.", "For Your Table."].`;

  log('fetch -> api.anthropic.com (research)');
  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,  // expanded schema needs more output room
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
      ],
      messages: [{ role: 'user', content: userMessage }],
      tools: [
        { type: 'web_search_20250305', name: 'web_search', max_uses: 5 }
      ]
    })
  });
  log(`anthropic response status=${apiResponse.status}`);

  if (!apiResponse.ok) {
    const errText = await apiResponse.text();
    if (apiResponse.status === 429) {
      throw new Error(`Anthropic API rate limit hit during research. Wait 60 seconds and try again. (Tier 1 caps Sonnet at 30K input tokens/min.)`);
    }
    throw new Error(`Research stage failed: ${apiResponse.status} ${errText.slice(0, 300)}`);
  }

  const apiData = await apiResponse.json();
  log(`response parsed; usage=${JSON.stringify(apiData.usage || {})}`);

  const textContent = apiData.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  if (!textContent) {
    throw new Error('Research stage returned no text content. Try again.');
  }

  const research = robustJsonParse(textContent);
  if (!research) {
    throw new Error(`Research stage returned unparseable JSON. First 300 chars: ${textContent.slice(0, 300)}`);
  }

  // Sanity-fill nested objects so resolveTokens never crashes on undefined access
  research.business = research.business || {};
  research.business.location = research.business.location || {};
  research.business.contact = research.business.contact || {};
  research.business.social = research.business.social || {};
  research.business.tracking = research.business.tracking || {};
  research.business.partnerLinks = research.business.partnerLinks || {};
  research.branding = research.branding || {};
  research.vocabulary = research.vocabulary || {};
  research.services = research.services || [];
  research.content = research.content || {};
  research.automation = research.automation || { enableContactForm: true, enableBooking: true, enableChatWidget: false };
  research.researchNotes = research.researchNotes || {};

  // ── Re-apply ground-truth website data — direct extraction wins over Claude ──
  mergeWebsiteData(research, websiteData);

  // ── Confidence indicator ──
  // high   = website fetched + Google data found (reviews/category/snapshot)
  // medium = exactly one of the two succeeded
  // low    = only form-input data
  const websiteOk = websiteData != null && websiteData.colors.length > 0;
  const googleOk = research.researchNotes.googleBusinessFound === true
    || (Array.isArray(research.content.testimonials) && research.content.testimonials.length > 0)
    || (research.researchNotes.reviewSnapshot && research.researchNotes.reviewSnapshot !== 'Not Found');
  research.researchNotes.researchConfidence = (websiteOk && googleOk) ? 'high' : (websiteOk || googleOk) ? 'medium' : 'low';
  research.researchNotes.siteType = siteType;
  research.researchNotes.directExtractionUsed = !!websiteData;
  if (websiteData) {
    research.researchNotes.directExtractionSummary = {
      colorsFound: websiteData.colors.length,
      headingsFound: websiteData.headings.length,
      trustSignalsFound: websiteData.trustSignals.length,
      titleFound: !!websiteData.title,
    };
  }

  research.slug = research.slug || slugify(research.business.name || businessName);

  return research;
}

// ─── STAGE B — STREAMING GENERATION CALL ──────────────────────────────────────

async function runGenerationStreaming({ research, siteType, apiKey, onProgress = async () => {}, log = () => {} }) {
  const prompt = buildGenerationPrompt(research, siteType);
  log(`prompt built; chars=${prompt.length}`);

  // Brief pause between Stage A and Stage B — gives the 60s ITPM window a
  // head start before stacking another large input-token call onto it.
  await new Promise(r => setTimeout(r, 1500));

  log('fetch -> api.anthropic.com (generation, stream:true, max_tokens=32000)');
  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 32000,
      stream: true,
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }
      ] }],
    })
  });
  log(`anthropic stream response status=${apiResponse.status}`);

  if (!apiResponse.ok) {
    const errText = await apiResponse.text();
    if (apiResponse.status === 429) {
      throw new Error(`Anthropic API rate limit hit during generation. Wait 60 seconds and try again.`);
    }
    throw new Error(`Generation stage failed: ${apiResponse.status} ${errText.slice(0, 300)}`);
  }

  // ─── SSE PARSING ─────────────────────────────────────────────────────────
  // Anthropic SSE format: each event is `event: <name>\ndata: <json>\n\n`.
  // We only need the `data:` lines. Text deltas live at delta.text on
  // `content_block_delta` events whose delta.type === 'text_delta'. Stop
  // reason arrives via `message_delta.delta.stop_reason`.
  //
  // Gotcha noted in COLE_BRIEFING.md §7.3: text is in `event.delta.text`,
  // NOT `event.delta.content` — easy mis-parse.
  const reader = apiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let stopReason = null;
  let lastHeartbeatChars = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Split buffer on newlines, keep the last (possibly incomplete) line in the buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;

      let evt;
      try { evt = JSON.parse(dataStr); } catch { continue; }

      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && typeof evt.delta.text === 'string') {
        fullText += evt.delta.text;
        // Heartbeat sampling — every ~500 chars push a progress event back to the
        // client. This is what keeps the Cloudflare edge from idling-out on the
        // long Stage B generation, AND drives the user-visible progress UI.
        if (fullText.length - lastHeartbeatChars >= 500) {
          lastHeartbeatChars = fullText.length;
          await onProgress(fullText.length);
        }
      } else if (evt.type === 'message_delta' && evt.delta?.stop_reason) {
        stopReason = evt.delta.stop_reason;
      }
    }
  }
  log(`stream complete; chars=${fullText.length} stop_reason=${stopReason}`);

  if (stopReason === 'max_tokens') {
    throw new Error('Generation hit max_tokens — output is truncated. Retry, or simplify the input.');
  }
  if (!fullText) {
    throw new Error('Generation stage returned no text content.');
  }

  // Final progress beat so the UI lands at the actual final char count.
  await onProgress(fullText.length);

  const files = extractFiles(fullText);
  log(`extracted files=${Object.keys(files).join(',')}`);

  validateFiles(files, research);
  log('validation passed');

  return files;
}

function buildGenerationPrompt(research, siteType) {
  const { business, branding, services, content, automation } = research;

  const hoursLine = business.hours
    ? Object.entries(business.hours).map(([d, t]) => `${d}: ${t}`).join(' · ')
    : 'Mon-Fri 8am-5pm';

  const servicesBlock = services.map((s, i) =>
    `${i + 1}. ${s.icon || '•'} **${s.name}**${s.price ? ` (${s.price})` : ''}\n   ${s.description}`
