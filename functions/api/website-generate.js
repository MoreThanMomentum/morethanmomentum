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
      // Sanitize the serialized JSON before transmission. Prevents any
      // in-string control character from leaking into the SSE payload and
      // breaking the frontend JSON.parse on receive.
      const safeJson = sanitizeJsonString(JSON.stringify(obj));
      await writer.write(encoder.encode(safeJson + '\n'));
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
// research call. Extracted data gets injected into the prompt as ground truth
// AND re-applied post-parse via mergeWebsiteData so direct extraction always
// wins over Claude's guesses. All fail-soft — fetch errors return null and
// the research call proceeds without ground truth (lower confidence but
// generation continues).

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
  const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
  const counts = new Map();
  let match;
  while ((match = hexRegex.exec(html)) !== null) {
    let hex = match[1].toLowerCase();
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    } else if (hex.length === 4) {
      hex = hex.slice(0, 3).split('').map(c => c + c).join('');
    } else if (hex.length === 8) {
      hex = hex.slice(0, 6);
    } else if (hex.length !== 6) {
      continue;
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) continue;
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
  parts.push(`The following data was fetched and parsed directly from ${websiteData.url} BEFORE this research call. These values are AUTHORITATIVE — DO NOT contradict them. Use these for the corresponding fields, then fill in everything else from web_search.`);
  parts.push('');
  // ALL scraped text values are JSON.stringify'd so quotes, backslashes, and
  // control characters are properly escaped before they touch the prompt.
  // Without this, a `"` or backtick in scraped HTML would close the embedded
  // string literal in the prompt and leak the rest of the value into the
  // surrounding instructions — Claude then echoes the malformed shape into
  // its JSON response, producing parse errors at unpredictable positions.
  if (websiteData.title) parts.push(`Website title: ${JSON.stringify(websiteData.title)}`);
  if (websiteData.metaDescription) parts.push(`Meta description: ${JSON.stringify(websiteData.metaDescription)}`);
  if (websiteData.colors.length > 0) {
    parts.push(`Most-used hex colors (CSS frequency-counted): ${websiteData.colors.slice(0, 5).join(', ')}`);
    parts.push(`  → Use ${websiteData.colors[0]} as branding.primaryColor`);
    if (websiteData.colors[1]) parts.push(`  → Use ${websiteData.colors[1]} as branding.secondaryColor`);
  }
  if (websiteData.headings.length > 0) {
    parts.push(`Page headlines (H1/H2): ${websiteData.headings.slice(0, 8).map(h => JSON.stringify(h)).join(' | ')}`);
  }
  if (websiteData.trustSignals.length > 0) {
    parts.push(`Trust signal phrases found in HTML: ${websiteData.trustSignals.map(s => JSON.stringify(s)).join(', ')}`);
    parts.push(`  → Include all of these in business.trustSignals`);
  }
  if (websiteData.bodyTextSample) {
    // Slice first, stringify second, so the truncation marker is outside the
    // escaped string for clarity in the prompt.
    parts.push(`Body text excerpt (first 800 chars, JSON-encoded): ${JSON.stringify(websiteData.bodyTextSample.slice(0, 800))}`);
  }
  parts.push('═══════════════════════════════════════════════════════════════════════════════');
  return parts.join('\n');
}

function mergeWebsiteData(research, websiteData) {
  if (!websiteData) return;
  research.business = research.business || {};
  research.branding = research.branding || {};

  if (websiteData.colors[0]) {
    research.branding.primaryColor = websiteData.colors[0];
  }
  if (websiteData.colors[1]) {
    research.branding.secondaryColor = websiteData.colors[1];
  }

  if (!research.business.tagline && websiteData.title) {
    research.business.tagline = websiteData.title;
  }

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
  // ── Source 1: direct website extraction (runs BEFORE Anthropic call) ─────
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

CRITICAL: Your ENTIRE response must be a single valid JSON object. Start with { and end with }. No text before, no text after, no markdown fences, no commentary. Just the raw JSON conforming to this schema.

JSON FORMATTING RULES (these break parsing if violated):
- All string values must use \\n for newlines, never raw line breaks. Multi-paragraph fields like aboutStory must be a single string with \\n\\n between paragraphs.
- Use \\t for tabs, \\" for quotes inside strings, \\\\ for literal backslashes.
- Never embed raw control characters (\\u0000-\\u001F) in string values.
- Numbers must not have leading zeros (use 5 not 05).
- Use null for missing values, not the string "null" or "undefined".

Schema:

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
    "contactPageHeadline": "Page title for contact page using the product noun, e.g. \\"Let's Talk Carts.\\" or \\"Let's Talk Boats.\\" — only set if natural, else null",
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
    "trustStatLabel": "stat-bar trust label, e.g. 'Veteran-Owned & Operated' or 'Family-Owned & Operated' or 'Locally Owned & Operated'",
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

For lifestyleUseCases: pick 4 use cases that fit THIS business's ideal customer. Map each to one of the four CSS gradient classes (lake|campground|wedding|neighborhood). Examples: golf cart dealer → lake houses, campgrounds, weddings, neighborhoods. Bar/brewery → date nights ('wedding'), after-work ('campground'), weekends ('lake'), events ('neighborhood'). Pure trades / generic SMB → return [] (empty array; section is optional).

For trustSignals: include any explicit trust phrases the business uses. Don't invent. If GROUND TRUTH listed phrases, those MUST appear in your trustSignals array.

For typewriterPhrases: 4-6 short phrases (≤30 chars each, ending in period). Tied to brand identity.`;

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
      // Prompt caching on the (large, static) system prompt — input tokens for
      // it count once per 5-min window, big ITPM relief.
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
      ],
      messages: [{ role: 'user', content: userMessage }],
      tools: [
        // max_uses caps search-result accumulation — without this Claude
        // routinely runs 10-20 searches and pulls full page content, easily
        // burning 25K+ input tokens on a single business and tripping the
        // 30K/min ITPM cap on Anthropic Tier 1.
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
  ).join('\n');

  const benefitsBlock = (content.benefits || []).map(b => `- ${b}`).join('\n');
  const testimonialsBlock = (content.testimonials || []).map(t => `- "${t.text}" — ${t.author}`).join('\n');
  const faqsBlock = (content.faqs || []).map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');

  return `You are building a multi-page website for ${business.name}, a ${business.industry} business in ${business.location?.city || ''}, ${business.location?.state || ''}.

${siteTypeHint(siteType)}

═══════════════════════════════════════════════════════════════════════════════
BUSINESS PROFILE
═══════════════════════════════════════════════════════════════════════════════
Name: ${business.name}
Industry: ${business.industry}
Tagline: ${business.tagline || ''}
Location: ${business.location?.address || ''} · ${business.location?.city || ''}, ${business.location?.state || ''}
Service area: ${business.location?.serviceArea || ''}
Phone: ${business.contact?.phone || '(blank — leave the format placeholder so they can fill it in)'}
Email: ${business.contact?.email || ''}
Hours: ${hoursLine}
${business.yearFounded ? `Year founded: ${business.yearFounded}` : ''}

═══════════════════════════════════════════════════════════════════════════════
BRANDING
═══════════════════════════════════════════════════════════════════════════════
Primary color: ${branding.primaryColor}
Secondary color: ${branding.secondaryColor}
Accent color: ${branding.accentColor || branding.primaryColor}
Font: ${branding.font}
Tone: ${branding.tone}

═══════════════════════════════════════════════════════════════════════════════
SERVICES
═══════════════════════════════════════════════════════════════════════════════
${servicesBlock}

═══════════════════════════════════════════════════════════════════════════════
UNIQUE VALUE
═══════════════════════════════════════════════════════════════════════════════
${content.uniqueValue || ''}

═══════════════════════════════════════════════════════════════════════════════
BENEFITS
═══════════════════════════════════════════════════════════════════════════════
${benefitsBlock}

═══════════════════════════════════════════════════════════════════════════════
TESTIMONIALS
═══════════════════════════════════════════════════════════════════════════════
${testimonialsBlock || '(none — skip the testimonials section)'}

═══════════════════════════════════════════════════════════════════════════════
FAQS
═══════════════════════════════════════════════════════════════════════════════
${faqsBlock || '(none — skip the FAQ section)'}

═══════════════════════════════════════════════════════════════════════════════
ABOUT STORY
═══════════════════════════════════════════════════════════════════════════════
${content.aboutStory || ''}

═══════════════════════════════════════════════════════════════════════════════
DELIVERABLES — STRICT FORMAT
═══════════════════════════════════════════════════════════════════════════════

You will output EXACTLY 8 files in this order, each delimited by a marker on
its own line. The marker format is literal — three equals, FILE:, exact path,
three equals. Do NOT use markdown fences. Do NOT add explanatory text between
files. The very first byte of your response must be the first marker.

===FILE: index.html===
<full HTML for the home page>
===FILE: services.html===
<full HTML for the services / inventory / menu / listings / work page — adapt name to site type but keep filename as services.html for routing simplicity>
===FILE: about.html===
<full HTML for the about page>
===FILE: contact.html===
<full HTML for the contact page>
===FILE: style.css===
<shared stylesheet>
===FILE: script.js===
<shared minimal JS>
===FILE: README.md===
<deploy instructions in markdown>
===FILE: _redirects===
<Cloudflare Pages redirects file>
===END===

═══════════════════════════════════════════════════════════════════════════════
HTML REQUIREMENTS — APPLY TO ALL FOUR PAGES
═══════════════════════════════════════════════════════════════════════════════

1. Each page is a complete <!DOCTYPE html> document with <html>, <head>, <body>.
2. <head> includes: charset, viewport, page-specific <title>, meta description,
   Open Graph tags, the Google Font import for ${branding.font}, and a single
   <link rel="stylesheet" href="style.css">. Same CSS file for all pages.
3. Every page has the SAME header/nav and the SAME footer. Use these
   navigation links exactly:
       Home → index.html
       Services → services.html
       About → about.html
       Contact → contact.html
   (The "Services" nav label may be relabeled to match the site type — e.g.
   "Inventory", "Menu", "Listings", "Work" — but the filename stays services.html.)
4. The nav also includes one prominent CTA button. The CTA goes to contact.html.
5. <body> includes <script src="script.js" defer></script> at the end.
6. Mobile-first responsive. Hamburger menu on small screens.
7. Copy is in the ${branding.tone} tone.
8. Use the business's actual phone number ${business.contact?.phone || '(NOT YET SET — leave a clear styled placeholder span like <span class="phone-placeholder">[Phone TBD]</span> and reference it in the README so it can be filled in later)'} in the footer and in the contact section.
9. Image references: use semantic placeholder paths under /images/ (e.g.
   /images/hero.jpg, /images/about-team.jpg, /images/service-${slugify(services[0]?.name || 'one')}.jpg).
   Do NOT inline base64 images. The README will list every expected path so
   real photos can be dropped in later.

═══════════════════════════════════════════════════════════════════════════════
PAGE-SPECIFIC REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

INDEX.HTML (home)
- Hero section with the tagline, a sub-headline, and a primary CTA to contact.html
- Featured strip — show the top 3 services / products / menu items / listings as cards with the icons
- "Why us" section — show 3-4 benefits as feature cards
- Brief about teaser — 1 paragraph + a "Read more" link to about.html
- Testimonials block (if testimonials are listed above) — at least 2 quotes
- Closing CTA section linking to contact.html

SERVICES.HTML (or Inventory / Menu / Listings / Work — content adapts to site type)
- Page intro / value statement
- Full grid of every service / product / menu item / listing listed above. Each card
  includes icon, name, description, price (if provided), and an "Inquire" / "View"
  link to contact.html#form.
- Bottom CTA back to contact

ABOUT.HTML
- The about story rendered as flowing paragraphs, NOT as a list
- A values / approach section (3-4 short value cards)
- Service area note: "${business.location?.serviceArea || ''}"
- Mission/closing line + CTA to contact

CONTACT.HTML — CRITICAL, READ CAREFULLY
- Page intro
- A two-column section: left column has phone, email, address, hours, service
  area; right column has the contact form area.
- The contact form area is the GHL placeholder zone. Render this:

    <section id="contact">
      <div class="contact-form-wrap">
        <!-- CONTACT_FORM_PLACEHOLDER -->
      </div>
    </section>

  The comment <!-- CONTACT_FORM_PLACEHOLDER --> MUST appear exactly once,
  on its own line, with no surrounding text. The post-sale Phase 2 step
  swaps this comment for the client's actual GoHighLevel form iframe.

- Below the contact section, add a booking section:

    <section id="booking">
      <h2>Book a Time</h2>
      <p>Pick a slot that works for you.</p>
      <!-- BOOKING_CALENDAR_PLACEHOLDER -->
    </section>

  Same rule — comment exactly once, on its own line, inside the section.

- DO NOT include a working <form> element inside the placeholder zone. Phase 2
  replaces the comment with an iframe; if a real form is there it would just
  be invisible / dead. Style the wrap with a "Form loads here" hint inside a
  styled div — that hint will be visually replaced by the iframe at Phase 2,
  but at demo-time it visually communicates that the form exists.

═══════════════════════════════════════════════════════════════════════════════
STYLE.CSS REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
- CSS custom properties for colors and font:
    :root {
      --primary: ${branding.primaryColor};
      --secondary: ${branding.secondaryColor};
      --accent: ${branding.accentColor || branding.primaryColor};
      --font: '${branding.font}', sans-serif;
    }
- Mobile-first, max-width container approach
- Polished button, card, hero, footer styles
- Responsive nav with hamburger on small screens (the JS toggle is in script.js)
- Sufficient typographic hierarchy — h1 is large and confident, body is comfortable

═══════════════════════════════════════════════════════════════════════════════
SCRIPT.JS REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
- Minimal: hamburger menu toggle, smooth scroll for in-page anchors, year stamp
  for footer copyright. Nothing else. No frameworks, no libraries.

═══════════════════════════════════════════════════════════════════════════════
README.MD REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
- "${business.name} — Website Bundle" title
- One-paragraph summary of what's included
- A "Deploy to Cloudflare Pages" section with the exact CLI / dashboard steps
- A "Phase 2 — GHL Integration" section listing every placeholder that needs
  to be replaced post-sale, with the EXACT comment string and the file/line
  context. The two placeholders to list:
    1. <!-- CONTACT_FORM_PLACEHOLDER --> in contact.html
    2. <!-- BOOKING_CALENDAR_PLACEHOLDER --> in contact.html
- A "Customizations needed" section listing every image path expected under
  /images/ and any phone/email TBDs
- A short "Technologies" section: vanilla HTML/CSS/JS, no framework

═══════════════════════════════════════════════════════════════════════════════
_REDIRECTS REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
- A simple Cloudflare Pages _redirects file that handles common 404s.
  At minimum:
      /home    /index.html    301
      /index    /index.html    301

GO. Output the eight files now, marker-delimited, no preamble.`;
}

function extractFiles(text) {
  const files = {};
  const fileMarker = /^===FILE:\s*([^=\n]+?)\s*===\s*$/gm;

  // Slice off anything before the first marker (defensive — Claude sometimes
  // adds a brief preamble despite instructions).
  const firstMarkerIdx = text.search(/^===FILE:/m);
  const trimmed = firstMarkerIdx === -1 ? text : text.slice(firstMarkerIdx);

  const matches = [];
  let m;
  fileMarker.lastIndex = 0;
  while ((m = fileMarker.exec(trimmed)) !== null) {
    matches.push({ path: m[1].trim(), markerEnd: m.index + m[0].length });
  }

  if (matches.length === 0) {
    throw new Error('Generation output had no FILE markers. Claude likely ignored the format directive. First 300 chars: ' + text.slice(0, 300));
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].markerEnd;
    const remainder = trimmed.slice(start);
    const nextMarkerIdx = remainder.search(/^===(?:FILE:|END===)/m);
    const content = nextMarkerIdx === -1 ? remainder : remainder.slice(0, nextMarkerIdx);
    files[matches[i].path] = content.replace(/^\n+/, '').replace(/\n+$/, '\n');
  }

  return files;
}

function validateFiles(files, research) {
  const required = ['index.html', 'services.html', 'about.html', 'contact.html', 'style.css', 'script.js', 'README.md'];
  for (const path of required) {
    if (!files[path] || files[path].length < 100) {
      throw new Error(`Generation output missing or too short: ${path} (${files[path]?.length || 0} chars)`);
    }
  }

  if (!files['contact.html'].includes('<!-- CONTACT_FORM_PLACEHOLDER -->')) {
    throw new Error('contact.html is missing the <!-- CONTACT_FORM_PLACEHOLDER --> comment. This breaks the Phase 2 GHL injection contract.');
  }
  if (research.automation?.enableBooking && !files['contact.html'].includes('<!-- BOOKING_CALENDAR_PLACEHOLDER -->')) {
    throw new Error('contact.html is missing the <!-- BOOKING_CALENDAR_PLACEHOLDER --> comment. This breaks the Phase 2 GHL booking embed.');
  }

  for (const path of ['index.html', 'services.html', 'about.html', 'contact.html']) {
    const html = files[path];
    if (!html.includes('</body>') || !html.includes('</html>')) {
      throw new Error(`${path} appears truncated (no </body> or </html>). Length: ${html.length} chars.`);
    }
  }
}

// ─── DEALER TEMPLATE BRANCH ───────────────────────────────────────────────────
// Fast, deterministic generation path for the inventory/dealer site type.
// Reads templates/inventory/tokens.json from this Pages deployment's static
// assets, fetches each template file, performs token substitution, prunes
// excluded pages, generates per-client config, and bundles. ~3-5s total.

async function runDealerTemplate({ research, requestedPages, origin, log }) {
  const TEMPLATE_BASE = `${origin}/templates/inventory`;
  log(`template base URL: ${TEMPLATE_BASE}`);

  // ── 1. Fetch the token contract ──
  log('fetching tokens.json');
  const tokensResp = await fetch(`${TEMPLATE_BASE}/tokens.json`);
  if (!tokensResp.ok) {
    throw new Error(`Could not fetch tokens.json from ${TEMPLATE_BASE}: ${tokensResp.status}`);
  }
  // Manual text+sanitize+parse instead of resp.json() so a stray control
  // character in tokens.json doesn't break the dealer build.
  const tokensText = await tokensResp.text();
let tokensSpec;
try {
  tokensSpec = JSON.parse(sanitizeJsonString(tokensText));
} catch (e) {
  console.error(`[wgen][T] FAILED to parse tokens.json: ${e.message}`);
  throw new Error(`Could not parse tokens.json: ${e.message}`);
}
  log(`tokens.json loaded — version ${tokensSpec.version}`);

  // ── 2. Generate the per-client admin password (random, secure) ──
  const adminPassword = generateAdminPassword();
  log('admin password generated (16 chars, alphanumeric)');

  // ── 3. Resolve all tokens from research ──
  const tokenMap = resolveTokens(research, adminPassword);
  log(`resolved ${Object.keys(tokenMap).length} tokens`);

  // ── 4. Determine which files to fetch (page filtering) ──
  const pageFiles = (tokensSpec.files && tokensSpec.files.page_files) || {};
  const alwaysInclude = (tokensSpec.files && tokensSpec.files.always_include) || [];
  const alwaysExclude = new Set((tokensSpec.files && tokensSpec.files.always_exclude_per_client) || []);

  // Default: all pages with `home` and `contact` always required
  const pages = (Array.isArray(requestedPages) && requestedPages.length > 0)
    ? requestedPages
    : ['home', 'shop', 'services', 'about', 'contact', 'privacy'];
  if (!pages.includes('home')) pages.unshift('home');
  if (!pages.includes('contact')) pages.push('contact');

  const requestedPageFiles = pages.map(p => pageFiles[p]).filter(Boolean);

  // Compute which page files were excluded — used to prune nav links from the
  // pages that ARE included. E.g. if "rentals" is unchecked, every other HTML
  // file's nav menu should drop the `<li><a href="rentals.html">` entry.
  const allPageFilenames = Object.values(pageFiles);
  const excludedPageFilenames = allPageFilenames.filter(fn => !requestedPageFiles.includes(fn));
  log(`pages: included=[${requestedPageFiles.join(', ')}] excluded=[${excludedPageFilenames.join(', ')}]`);

  // Build the full fetch list: page HTML files + always_include files
  const filesToFetch = [];
  for (const fn of requestedPageFiles) {
    if (!alwaysExclude.has(fn) && !filesToFetch.includes(fn)) filesToFetch.push(fn);
  }
  for (const fn of alwaysInclude) {
    if (!alwaysExclude.has(fn) && !filesToFetch.includes(fn)) filesToFetch.push(fn);
  }
  log(`will fetch ${filesToFetch.length} files`);

  // ── 5. Fetch all files in parallel ──
  const fetched = await Promise.all(filesToFetch.map(async (path) => {
    const url = `${TEMPLATE_BASE}/${path}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        log(`WARN: ${path} returned ${resp.status} — skipping`);
        return null;
      }
      // Skip binary files (favicon, fonts, icons). Client adds real images
      // separately per the SETUP_README instructions. The placeholder visual
      // language renders the missing-image state gracefully.
      if (/\.(png|jpe?g|webp|gif|mp4|webm|ico|woff2?|ttf|otf|eot)$/i.test(path)) {
        log(`SKIP binary: ${path}`);
        return null;
      }
      const content = await resp.text();
      return { path, content };
    } catch (e) {
      log(`WARN: fetch failed for ${path}: ${e.message}`);
      return null;
    }
  }));

  // ── 6. Substitute tokens + prune excluded nav links ──
  const files = {};
  for (const item of fetched) {
    if (!item) continue;
    let content = substituteTokens(item.content, tokenMap);
    if (item.path.endsWith('.html')) {
      content = pruneNavLinksForExcludedPages(content, excludedPageFilenames);
    }
    files[item.path] = content;
  }
  log(`substituted tokens across ${Object.keys(files).length} text files`);

  // ── 7. Generate per-client config files ──
  files['inventory.json'] = generateEmptyInventoryJson();
  files['sitemap.xml'] = generateSitemapXml({
    siteDomain: tokenMap['{{SITE_DOMAIN}}'],
    pages,
    pageFiles,
  });
  files['_redirects'] = '/home    /index.html    301\n/index    /index.html    301\n';
  files['SETUP_README.md'] = generateSetupReadme({
    research,
    tokenMap,
    adminPassword,
    pages,
  });
  log('generated inventory.json, sitemap.xml, _redirects, SETUP_README.md');

  return files;
}

// ─── TOKEN RESOLUTION ─────────────────────────────────────────────────────────
// Maps every {{TOKEN}} declared in tokens.json to its value, derived from the
// research blob plus computed fields (slugs, color variants, formatted phone).

function resolveTokens(research, adminPassword) {
  const map = {};
  const b = research.business || {};
  const branding = research.branding || {};

  // ── Identity ──
  const businessName = b.name || 'Your Business';
  const businessNameSlug = slugify(businessName);
  const ownerObj = (typeof b.owner === 'object' && b.owner) ? b.owner : null;
  const ownerName = (ownerObj && ownerObj.fullName) || (typeof b.owner === 'string' ? b.owner : null);
  const ownerFirst = (ownerObj && ownerObj.firstName) || (ownerName ? ownerName.split(/\s+/)[0] : null);

  // Logo text — split business name into primary + secondary
  const nameWords = businessName.split(/\s+/).filter(Boolean);
  let logoPrimary, logoSecondary;
  if (nameWords.length === 1) {
    logoPrimary = nameWords[0];
    logoSecondary = '';
  } else {
    logoPrimary = nameWords[0];
    logoSecondary = nameWords.slice(1).join(' ');
  }

  // Phone variants
  const phone = b.contact?.phone || '';
  const phoneDigits = phone.replace(/\D/g, '');

  // Address variants
  const city = b.location?.city || '';
  const state = b.location?.state || '';
  const zip = b.location?.zip || '';
  const cityState = (city && state) ? `${city}, ${state}` : '';
  const cityStateZip = zip ? `${cityState} ${zip}` : cityState;
  const cityStateNoComma = (city && state) ? `${city} ${state}` : '';

  // Industry + trust
  const trustQualifier = b.trustQualifier || '';
  const industry = b.industry || '';
  const industryDescriptor = (trustQualifier && industry)
    ? `${trustQualifier.toLowerCase()} ${industry.toLowerCase()}`
    : (industry.toLowerCase() || `${businessName.toLowerCase()} business`);
  const industryTitleDescriptor = (trustQualifier && industry)
    ? toTitleCase(`${trustQualifier} ${industry}`)
    : (toTitleCase(industry) || 'Local Business');

  // Site domain — strip protocol + trailing slash, fall back to slug.com
  let siteDomain = (b.contact?.website || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
  if (!siteDomain) siteDomain = `${businessNameSlug}.com`;

  // ── String tokens ──
  map['{{BUSINESS_NAME}}'] = businessName;
  map['{{BUSINESS_NAME_LLC}}'] = b.legalName || businessName;
  map['{{BUSINESS_NAME_SHORT}}'] = b.shortName || logoPrimary || businessName;
  map['{{BUSINESS_NAME_SLUG}}'] = businessNameSlug;
  map['{{OWNER_NAME}}'] = ownerName || 'the owner';
  map['{{OWNER_FIRST}}'] = ownerFirst || 'the team';
  map['{{ABOUT_NAV_LABEL}}'] = ownerFirst ? `About ${ownerFirst}` : 'About Us';

  map['{{PHONE}}'] = phone || '(000) 000-0000';
  map['{{PHONE_DIGITS}}'] = phoneDigits || '0000000000';
  map['{{EMAIL}}'] = b.contact?.email || `hello@${siteDomain}`;

  map['{{SITE_DOMAIN}}'] = siteDomain;

  map['{{ADDRESS_LINE_1}}'] = b.location?.address || '[Address TBD]';
  map['{{CITY_STATE}}'] = cityState || 'Your City, ST';
  map['{{CITY_STATE_ZIP}}'] = cityStateZip || 'Your City, ST 00000';
  map['{{CITY_STATE_NO_COMMA}}'] = cityStateNoComma || 'Your City ST';
  map['{{REGION_SHORT}}'] = b.location?.regionShort || cityState;
  map['{{REGION_LONG}}'] = b.location?.regionLong || cityState;

  map['{{LOGO_PRIMARY_TEXT}}'] = logoPrimary;
  map['{{LOGO_SECONDARY_TEXT}}'] = logoSecondary;
  map['{{LOG_PREFIX}}'] = (businessNameSlug || 'app').toUpperCase().replace(/-/g, '_');

  // GA4 — leave the placeholder if nothing in research; client sets via env later
  map['{{GA_ID}}'] = b.tracking?.ga4Id || 'G-XXXXXXXXXX';
  // GHL embed URL is per-client env var. Placeholder stays in HTML; Cloudflare
  // env injection at deploy time isn't a thing for static HTML, so the client
  // edits the iframe src after deploy OR we extend the SETUP_README to walk
  // them through it.
  map['{{GHL_CALENDAR_EMBED_URL}}'] = '{{GHL_CALENDAR_EMBED_URL}}';

  map['{{FACEBOOK_URL}}'] = b.social?.facebook || '#';
  map['{{INSTAGRAM_URL}}'] = b.social?.instagram || '#';
  map['{{GOOGLE_REVIEWS_URL}}'] = b.googleReviewsUrl || '#';

  map['{{FINANCE_PARTNER_1_URL}}'] = (b.financingPartners && b.financingPartners[0] && b.financingPartners[0].url) || '';
  map['{{FINANCE_PARTNER_2_URL}}'] = (b.financingPartners && b.financingPartners[1] && b.financingPartners[1].url) || '';
  map['{{USED_INVENTORY_URL}}'] = b.partnerLinks?.usedInventory || '';

  map['{{TRUST_QUALIFIER}}'] = trustQualifier;
  map['{{STAT_LABEL_TRUST}}'] = b.trustStatLabel || (trustQualifier ? `${trustQualifier} & Operated` : 'Locally Owned & Operated');
  map['{{INDUSTRY_DESCRIPTOR}}'] = industryDescriptor;
  map['{{INDUSTRY_TITLE_DESCRIPTOR}}'] = industryTitleDescriptor;

  map['{{META_DESCRIPTION}}'] = b.metaDescription
    || `${businessName} in ${cityState || 'your area'} — ${industry || 'local business'}.`;
  map['{{OG_DESCRIPTION}}'] = b.ogDescription || map['{{META_DESCRIPTION}}'];
  map['{{HERO_BADGE_TAGLINE}}'] = b.heroBadgeTagline
    || (cityState ? `Local Business in ${cityState}` : 'Local Business');
  map['{{HERO_USE_CASE_LIST}}'] = (Array.isArray(b.useCases) ? b.useCases.join(', ') : b.useCases) || 'all your needs';
  map['{{INVENTORY_HEADLINE_COPY}}'] = b.inventoryHeadlineCopy || 'Browse our full lineup.';
  map['{{INVENTORY_DESCRIPTOR}}'] = b.inventoryDescriptor || 'Our full lineup';
  map['{{LIFESTYLE_SECTION_EYEBROW}}'] = b.lifestyleEyebrow
    || `The ${map['{{BUSINESS_NAME_SHORT}}']} Life`;
  map['{{ITEM_PLACEHOLDER_EXAMPLE}}'] = research.vocabulary?.itemExampleName || 'Item Name';
  map['{{ITEM_NAME_PLURAL_LOWER}}'] = (research.vocabulary?.itemPlural || 'items').toLowerCase();
  map['{{STARTING_PRICE}}'] = b.startingPrice || 'Call for Pricing';

  // Typewriter phrases — client gets a sensible default. JSON.parse'd at runtime.
  const typewriterPhrases = Array.isArray(b.typewriterPhrases) && b.typewriterPhrases.length > 0
    ? b.typewriterPhrases
    : [
        cityState ? `For ${cityState}.` : 'For You.',
        'For Your Family.',
        'Built Local.',
        'For Life.',
      ];
  // Inject as a JSON-string LITERAL inside the JSON.parse('...') wrapper. We
  // need to escape single quotes in the JSON for the JS string literal to stay
  // valid; the wrapper expression in main.js is JSON.parse('{{TYPEWRITER_PHRASES_JSON}}').
  map['{{TYPEWRITER_PHRASES_JSON}}'] = JSON.stringify(typewriterPhrases).replace(/'/g, "\\'");

  // ── Vocabulary tokens ──
  // CATALOG_PAGE_LABEL: title-case noun for the shop/inventory page
  // PRODUCT_NOUN / PRODUCT_NOUN_SINGULAR: lowercase plural/singular for body copy
  const catalogPageLabel = research.vocabulary?.catalogPageLabel || 'Inventory';
  const productNounPlural = (research.vocabulary?.itemPlural
    || research.vocabulary?.productNoun
    || 'inventory').toLowerCase();
  const productNounSingular = (research.vocabulary?.itemSingular
    || research.vocabulary?.productNounSingular
    || 'item').toLowerCase();
  const productNounSingularTitle = productNounSingular.charAt(0).toUpperCase() + productNounSingular.slice(1);
  const productNounPluralTitle = productNounPlural.charAt(0).toUpperCase() + productNounPlural.slice(1);

  map['{{CATALOG_PAGE_LABEL}}'] = catalogPageLabel;
  map['{{PRODUCT_NOUN}}'] = productNounPlural;
  map['{{PRODUCT_NOUN_SINGULAR}}'] = productNounSingular;

  // CONTACT_PAGE_HEADLINE: derived from PRODUCT_NOUN. Generic noun → fall back
  // to "Get In Touch.", otherwise build "Let's Talk {ProductNounPluralTitle}."
  const isGenericProductNoun = productNounPlural === 'inventory' || productNounPlural === 'item' || productNounPlural === 'items';
  map['{{CONTACT_PAGE_HEADLINE}}'] = b.contactPageHeadline
    || (isGenericProductNoun ? 'Get In Touch.' : `Let's Talk ${productNounPluralTitle}.`);

  // SERVICE_SECTION_HEADLINE: derived from PRODUCT_NOUN_SINGULAR with a <br />
  map['{{SERVICE_SECTION_HEADLINE}}'] = b.serviceSectionHeadline
    || (isGenericProductNoun
        ? "We Don't Just Sell.<br />We Support Every Customer."
        : `We Don't Just Sell.<br />We Support Every ${productNounSingularTitle}.`);

  // ── Color tokens ──
  const primary = branding.primaryColor || '#1B2A4A';
  const accent = branding.accentColor || '#C9A84C';
  map['{{PRIMARY_COLOR}}'] = primary;
  map['{{PRIMARY_COLOR_DARK}}'] = branding.primaryColorDark || shadeHex(primary, -0.25);
  map['{{PRIMARY_COLOR_LIGHT}}'] = branding.primaryColorLight || shadeHex(primary, 0.15);
  map['{{ACCENT_COLOR}}'] = accent;
  map['{{ACCENT_COLOR_DARK}}'] = branding.accentColorDark || shadeHex(accent, -0.25);
  map['{{ACCENT_COLOR_LIGHT}}'] = branding.accentColorLight || shadeHex(accent, 0.15);

  // ── Block tokens ──
  const trustSignals = Array.isArray(b.trustSignals) ? b.trustSignals : [];
  map['{{HERO_TRUST_PILLS_HTML}}'] = renderTrustPills(trustSignals, cityState);
  map['{{FOOTER_TRUST_BADGES_HTML}}'] = renderTrustBadges(trustSignals);
  map['{{REVIEWS_GRID_HTML}}'] = renderReviewCards(research.content?.testimonials || []);
  map['{{ABOUT_VALUE_TRUST_LINE_HTML}}'] = renderTrustValueLine(trustQualifier);
  map['{{LIFESTYLE_SECTION_HTML}}'] = renderLifestyleSection({
    useCases: b.lifestyleUseCases || [],
    eyebrow: b.lifestyleEyebrow || `The ${map['{{BUSINESS_NAME_SHORT}}']} Life`,
    productNounSingular,
  });
  map['{{ABOUT_OWNER_NARRATIVE}}'] = renderAboutOwnerNarrative({
    business: b,
    ownerName: ownerName,
    ownerFirst: ownerFirst,
    trustSignals,
    trustQualifier,
    regionLong: map['{{REGION_LONG}}'],
    businessName,
    businessNameShort: map['{{BUSINESS_NAME_SHORT}}'],
    productNounSingular,
  });

  return map;
}

// ─── BLOCK RENDERERS ──────────────────────────────────────────────────────────
// Each renderer takes a slice of research data and returns the inner HTML for
// a block-level token placeholder.

const TRUST_ICON_PATTERNS = [
  [/\bveteran/i, '🎖️'],
  [/\bfamily/i, '👨‍👩‍👧'],
  [/\baward/i, '🏆'],
  [/\bcertified|authorized\b/i, '✅'],
  [/\b(\d+(?:\.\d+)?[ ‑-]?(?:star|stars))\b/i, '⭐'],
  [/\bgoogle rating\b/i, '⭐'],
  [/\byears?\b/i, '📅'],
  [/\blicensed\b/i, '✅'],
  [/\binsured\b/i, '🛡️'],
  [/\blocal\b/i, '📍'],
  [/\bpremier|premium\b/i, '⭐'],
];

function pickTrustIcon(text) {
  if (!text) return '✅';
  for (const [pattern, icon] of TRUST_ICON_PATTERNS) {
    if (pattern.test(text)) return icon;
  }
  return '✅';
}

function renderTrustPills(signals, cityState) {
  const top = (signals || []).slice(0, 3);
  const parts = top.map(s => `<span class="trust-pill">${pickTrustIcon(s)} ${escapeHtml(s)}</span>`);
  if (cityState) {
    parts.push(`<span class="trust-pill">📍 ${escapeHtml(cityState)}</span>`);
  }
  if (parts.length === 0) {
    return '<span class="trust-pill">📍 Local Business</span>';
  }
  return parts.join('\n      ');
}

function renderTrustBadges(signals) {
  const top = (signals || []).slice(0, 2);
  if (top.length === 0) return '';
  const inner = top.map(s => `<span class="footer-badge">${pickTrustIcon(s)} ${escapeHtml(s)}</span>`).join('\n        ');
  return `<div class="footer-trust-badges">\n        ${inner}\n      </div>`;
}

function renderReviewCards(testimonials) {
  const top = (testimonials || []).slice(0, 3);
  if (top.length === 0) {
    return '<p style="text-align:center;color:#6B7280;grid-column:1/-1;padding:2rem 0;">Reviews coming soon — we will populate this section after launch.</p>';
  }
  return top.map((t, i) => {
    const author = t.author || 'Verified Customer';
    const initial = (author.match(/[A-Za-z]/) || ['?'])[0].toUpperCase();
    const delay = i * 100;
    const delayAttr = delay > 0 ? ` data-delay="${delay}"` : '';
    return `<div class="review-card" data-animate="fade-up"${delayAttr}>
        <div class="review-stars-sm" aria-label="5 stars">★★★★★</div>
        <p class="review-text">${escapeHtml(t.text || '')}</p>
        <div class="reviewer">
          <div class="reviewer-avatar">${escapeHtml(initial)}</div>
          <div><p class="reviewer-name">${escapeHtml(author)}</p><p class="reviewer-meta">Verified Review</p></div>
        </div>
      </div>`;
  }).join('\n      ');
}

function renderTrustValueLine(qualifier) {
  if (!qualifier) return '';
  return `<li><span>&#9989;</span> ${escapeHtml(qualifier)} &mdash; built on service</li>`;
}

const LIFESTYLE_GRADIENT_CLASSES = {
  lake: 'lifestyle-tile--lake',
  campground: 'lifestyle-tile--campground',
  wedding: 'lifestyle-tile--wedding',
  neighborhood: 'lifestyle-tile--neighborhood',
};

function renderLifestyleSection({ useCases, eyebrow, productNounSingular }) {
  if (!Array.isArray(useCases) || useCases.length === 0) return '';
  const tiles = useCases.slice(0, 4).map((uc, i) => {
    const title = escapeHtml(uc.title || 'Use Case');
    const subtitle = escapeHtml(uc.subtitle || '');
    const image = escapeHtml(uc.image || `/images/lifestyle-${i + 1}.jpg`);
    const gradientClass = LIFESTYLE_GRADIENT_CLASSES[uc.gradient] || 'lifestyle-tile--neighborhood';
    const delay = i * 100;
    const delayAttr = delay > 0 ? ` data-delay="${delay}"` : '';
    const altText = `${title} use case for ${escapeHtml(productNounSingular || 'item')}`;
    return `      <div class="lifestyle-tile ${gradientClass}" data-animate="fade-up"${delayAttr}>
        <img src="${image}" alt="${altText}" loading="lazy" />
        <div class="lifestyle-overlay">
          <h3>${title}</h3>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
      </div>`;
  }).join('\n\n');
  return `<!-- ===== LIFESTYLE PHOTO GRID ===== -->
<section class="section lifestyle-section" id="lifestyle" aria-labelledby="lifestyle-heading">
  <div class="container">
    <div class="section-header">
      <p class="section-eyebrow">${escapeHtml(eyebrow || 'The Lifestyle')}</p>
      <h2 class="section-title" id="lifestyle-heading">Built For Your Life</h2>
    </div>
   <div class="lifestyle-grid">

${tiles}

    </div>

</section>`;
}

function renderAboutOwnerNarrative({ business, ownerName, ownerFirst, trustSignals, trustQualifier, regionLong, businessName, businessNameShort, productNounSingular }) {
  const isVeteran = (Array.isArray(trustSignals) && trustSignals.some(s => /veteran/i.test(s)))
    || /veteran/i.test(trustQualifier || '');
  const itemNoun = productNounSingular || 'product';
  const p = (text) => `        <p class="about-body">${text}</p>`;

  if (ownerName && ownerFirst && isVeteran) {
    return [
      p(`${escapeHtml(ownerName)} didn't open ${escapeHtml(businessName)} to push inventory. He built it the same way he served &mdash; with discipline, integrity, and real care for the people he works with.`),
      p(`After years of military service, ${escapeHtml(ownerFirst)} returned to ${escapeHtml(regionLong || 'his community')} and saw an opportunity to build something different. Not a dealership. A relationship. When you buy from ${escapeHtml(businessNameShort || businessName)}, you work directly with ${escapeHtml(ownerFirst)} &mdash; a veteran who knows your ${escapeHtml(itemNoun)}, knows your town, and will still pick up the phone after the sale.`),
      p(`That's not a marketing line. That's just how he runs things.`),
    ].join('\n');
  }
  if (ownerName && ownerFirst) {
    return [
      p(`${escapeHtml(ownerName)} built ${escapeHtml(businessName)} because the area needed somewhere honest to go. Real expertise, fair prices, and a person on the other end of the phone who actually picks up.`),
      p(`When you work with ${escapeHtml(businessNameShort || businessName)}, you work directly with ${escapeHtml(ownerFirst)} &mdash; someone who knows your ${escapeHtml(itemNoun)}, knows your community, and stands behind every sale long after the paperwork's done.`),
      p(`That's not marketing copy. That's just how ${escapeHtml(ownerFirst)} runs things.`),
    ].join('\n');
  }
  return [
    p(`${escapeHtml(businessName)} was built on a simple idea: do right by the customer, every time. Honest pricing, real expertise, and follow-through that lasts long after the sale.`),
    p(`When you choose ${escapeHtml(businessNameShort || businessName)}, you're not just buying a ${escapeHtml(itemNoun)} &mdash; you're getting a team that knows the product, knows the community, and shows up when it matters.`),
    p(`That's not a marketing line. That's just how the team operates.`),
  ].join('\n');
}

// ─── TEMPLATE FILE OPS ────────────────────────────────────────────────────────

function substituteTokens(content, tokenMap) {
  // Sort tokens by length desc so longer tokens substitute before shorter ones
  // that might be substrings (defensive — current token list doesn't have this
  // issue but cheap insurance).
  const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);
  let result = content;
  for (const token of tokens) {
    if (result.indexOf(token) !== -1) {
      result = result.split(token).join(tokenMap[token]);
    }
  }
  return result;
}

function pruneNavLinksForExcludedPages(html, excludedFilenames) {
  let result = html;
  for (const filename of excludedFilenames) {
    // Match nav <li> entries linking to this filename
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const navLi = new RegExp(`\\s*<li>\\s*<a\\s+href="${escaped}"[^>]*>[^<]*</a>\\s*</li>\\s*`, 'gi');
    result = result.replace(navLi, '\n      ');
    // Also strip plain footer <a href="filename">label</a> entries inside <ul>
    const footerLi = new RegExp(`\\s*<li>\\s*<a\\s+href="${escaped}"[^>]*>[^<]*</a>\\s*</li>\\s*`, 'gi');
    result = result.replace(footerLi, '\n      ');
  }
  return result;
}

function generateEmptyInventoryJson() {
  return JSON.stringify({
    filters: {
      makes: [],
      seats: [],
      colors: [],
    },
    carts: [],
    accessories: [],
  }, null, 2) + '\n';
}

function generateSitemapXml({ siteDomain, pages, pageFiles }) {
  const today = new Date().toISOString().slice(0, 10);
  const priorityMap = { home: '1.0', shop: '0.9', services: '0.8', rentals: '0.8', about: '0.7', contact: '0.7', privacy: '0.3' };
  const changefreqMap = { home: 'weekly', shop: 'weekly', services: 'monthly', rentals: 'monthly', about: 'monthly', contact: 'monthly', privacy: 'yearly' };

  const entries = pages.map(page => {
    const filename = pageFiles[page];
    if (!filename) return null;
    const loc = page === 'home' ? `https://${siteDomain}/` : `https://${siteDomain}/${filename}`;
    return `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreqMap[page] || 'monthly'}</changefreq>
    <priority>${priorityMap[page] || '0.5'}</priority>
  </url>`;
  }).filter(Boolean).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${entries}

</urlset>
`;
}

function generateSetupReadme({ research, tokenMap, adminPassword, pages }) {
  const businessName = tokenMap['{{BUSINESS_NAME}}'];
  const slug = tokenMap['{{BUSINESS_NAME_SLUG}}'];
  const owner = tokenMap['{{OWNER_FIRST}}'] !== 'the team' ? tokenMap['{{OWNER_FIRST}}'] : null;
  const phone = tokenMap['{{PHONE}}'];
  const email = tokenMap['{{EMAIL}}'];
  const address = tokenMap['{{ADDRESS_LINE_1}}'];
  const cityStateZip = tokenMap['{{CITY_STATE_ZIP}}'];
  const today = new Date().toISOString().slice(0, 10);

  return `# ${businessName} — Website Setup

> Generated by More Than Momentum's Tool 06 on ${today}.

## What this bundle is

A complete dealer/inventory website for **${businessName}** in ${tokenMap['{{CITY_STATE}}']}. Includes ${pages.length} pages (${pages.join(', ')}) plus an admin panel for inventory management, a GHL calendar embed for booking, and Cloudflare Pages Functions for contact form + admin commits.

The bundle is fully wired with research-driven content. Most fields are already populated from the prospect intelligence pass (business name, phone, email, address, owner story, trust signals, testimonials). What's left is the per-client integration steps below.

---

## Setup steps (do these in order)

### 1. Create a GitHub repo

\`\`\`
gh repo create MoreThanMomentum/${slug}-website --private
\`\`\`

Or via the web: github.com/organizations/MoreThanMomentum/repositories/new

### 2. Push this bundle to the repo

Unzip the bundle, \`cd\` into the folder, then:

\`\`\`
git init
git add .
git commit -m "Initial site for ${businessName}"
git branch -M main
git remote add origin https://github.com/MoreThanMomentum/${slug}-website.git
git push -u origin main
\`\`\`

### 3. Connect Cloudflare Pages

Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick \`${slug}-website\`.

Build settings: framework preset = none, build command = empty, build output dir = \`/\`.

### 4. Configure Cloudflare Pages environment variables

Cloudflare Pages → Settings → Environment Variables → add:

| Variable | Value | Where to get it |
|---|---|---|
| \`GHL_API_KEY\` | (paste your GHL sub-account key) | GHL → Settings → Business Profile → API Keys |
| \`GHL_LOCATION_ID\` | (paste your GHL location ID) | GHL → Settings → Business Profile → Location ID |
| \`GHL_CALENDAR_EMBED_URL\` | (paste your GHL calendar embed URL) | GHL → Calendars → [calendar] → Share → Embed → copy iframe **src** |
| \`GITHUB_TOKEN\` | (paste a PAT with repo scope) | GitHub → Settings → Developer settings → Personal access tokens |
| \`GITHUB_REPO\` | \`MoreThanMomentum/${slug}-website\` | (your new repo from step 1) |
| \`ADMIN_PASSWORD\` | (see step 6) | Auto-generated for this client |

### 5. Replace the GHL calendar iframe placeholder

Open \`index.html\`, search for \`{{GHL_CALENDAR_EMBED_URL}}\`, replace with your actual GHL embed URL.

(Future improvement: this could be a runtime env-var injection, but for now it's a one-time HTML edit.)

### 6. Set the admin password

Cloudflare Pages → Settings → Environment Variables → \`ADMIN_PASSWORD\`:

\`\`\`
${adminPassword}
\`\`\`

> ⚠️ **Hand this password to ${owner || 'the client'} via 1Password share, encrypted message, or in person.** Do NOT email or text it. The password is stored in Cloudflare env vars and is the only way into the admin panel.

### 7. Set up the GHL sub-account

If not already done:

- Create the GHL sub-account
- Add custom contact fields: \`cart_model\`, \`service_description\`
- Set up the booking calendar — name it (e.g.) "${businessName} Appointment"
- Grab the embed URL from Calendar → Share → Embed → copy iframe \`src\` for step 4 above

### 8. Custom domain

Cloudflare Pages → Custom domains → add the client's domain.

### 9. Drop in real images

The bundle ships with placeholder paths — every \`<img>\` references \`/images/[filename]\` but no actual image files exist. Add real assets at these locations:

- \`/images/logo.png\` — site logo (recommend 200×80 PNG with transparent background)
- \`/images/heroimage.png\` — homepage hero (1920×1080 JPG/PNG; used as fallback if no video)
- \`/videos/herovideo.mp4\` — homepage hero loop video (60-90s, no audio, ≤ 10 MB)
- \`/images/owner-portrait.png\` — about page owner photo (recommend 600×800 JPG)
- \`/images/owner-at-work.png\` — services page action shot (recommend 1200×800 JPG)
- \`/images/service-feature-1.png\` — battery upgrade / service feature image
- \`/images/lifestyle-feature.png\` — lifestyle hero image
- \`/images/dock.png\`, \`camping.png\`, \`wedding.png\`, \`street.png\` — lifestyle grid (4 use-case photos)

Replacing files at these paths and pushing to GitHub triggers a Cloudflare Pages auto-deploy (~60s).

### 10. Google Search Console verification

When ready to submit the site to Google:

- Search Console → Add property → DNS record verification (recommended) OR HTML file upload
- If HTML file: drop the \`google[hash].html\` file Google gives you at the repo root and push

---

## Admin panel access

Two ways for ${owner || 'the client'} to reach the admin panel from desktop:

1. **Direct URL**: type \`/admin.html\` in the address bar
2. **Hidden trigger**: triple-click the site logo within 2 seconds

Both bail out on mobile / narrow viewports — admin is desktop-only by design.

### Admin capabilities

- Add / edit / delete inventory items
- Upload product photos (5 MB max, JPG/PNG/WebP)
- Manage filter groups (makes, seats, colors)
- Manage accessories
- All changes auto-commit to the GitHub repo and trigger a Cloudflare Pages auto-deploy (~60s)

---

## What's already configured (no action needed)

The generator already substituted these from the research blob:

- **Business name**: ${businessName}
- **Phone**: ${phone}
- **Email**: ${email}
- **Address**: ${address}, ${cityStateZip}
${owner ? `- **Owner**: ${tokenMap['{{OWNER_NAME}}']}` : ''}
- **Brand colors**: primary ${tokenMap['{{PRIMARY_COLOR}}']}, accent ${tokenMap['{{ACCENT_COLOR}}']}
- **Pages included**: ${pages.join(', ')}
- **Trust signals + testimonials**: rendered from research data
- **Sitemap.xml**: auto-generated for the included pages

If anything's wrong, edit those values directly in the HTML files (search-and-replace works since values are now plain text, not tokens).

---

## What this template does NOT include (by design)

- **Real images / videos** — drop in at the paths listed in step 9
- **Custom email service** — emails go through GHL's built-in workflows
- **Online checkout / e-commerce** — inquire-only model (admin posts inventory; customers contact ${owner || 'you'} via the GHL form)
- **Live chat** — none. The site directs to phone or contact form.
- **AI Cart Finder** — was an SNH-specific bonus, not included by default. If a client requests it, can be added back as a follow-up.

---

## Troubleshooting

**Admin panel won't load**: Check that \`ADMIN_PASSWORD\` env var is set in Cloudflare Pages, and you're on a desktop with a real mouse/touchpad (not touch-only).

**Booking calendar shows blank**: The iframe \`src\` is still \`{{GHL_CALENDAR_EMBED_URL}}\` — replace with your GHL embed URL (step 5).

**Contact form submissions don't reach GHL**: Verify \`GHL_API_KEY\` and \`GHL_LOCATION_ID\` env vars are correct. Check Cloudflare Pages Function logs (Workers & Pages → [project] → Functions → Logs).

**Site doesn't deploy**: Check Cloudflare Pages build logs. Common issues: build command should be EMPTY (we have no build step), output dir should be \`/\`.

**Photo uploads fail in admin panel**: Check \`GITHUB_TOKEN\` has \`repo\` scope and \`GITHUB_REPO\` is correct format (\`org/repo\`).

---

Generated by More Than Momentum Tool 06 (template-grounding mode) — ${today}.
`;
}

// ─── ADMIN PASSWORD GENERATION ────────────────────────────────────────────────

function generateAdminPassword() {
  // 16 chars from a memorable-but-secure alphabet (no 0/O/1/l/I confusion).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let result = '';
  for (let i = 0; i < arr.length; i++) {
    result += chars[arr[i] % chars.length];
  }
  return result;
}

// ─── COLOR HELPERS ────────────────────────────────────────────────────────────
// shadeHex(hex, factor) — factor in [-1, 1]. Negative darkens, positive lightens.
//   shadeHex('#1B2A4A', -0.25) ≈ '#142036' (darker navy)
//   shadeHex('#C9A84C', 0.15) ≈ '#D5BC6E' (lighter gold)

function shadeHex(hex, factor) {
  const m = String(hex).match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  let r = parseInt(m[1], 16);
  let g = parseInt(m[2], 16);
  let b = parseInt(m[3], 16);
  if (factor < 0) {
    const k = 1 + factor;
    r = Math.round(r * k);
    g = Math.round(g * k);
    b = Math.round(b * k);
  } else {
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
  }
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const hx = (v) => clamp(v).toString(16).padStart(2, '0');
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}

// ─── HTML / TEXT HELPERS ──────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toTitleCase(s) {
  if (!s) return '';
  return String(s).split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Sanitize raw JSON text — when LLMs produce JSON, they sometimes embed raw
// control characters (literal newlines, tabs, etc.) inside string literals.
// JSON.parse rejects those because the spec requires control chars to be
// escaped as \n / \t / \r / \u####. This walks the JSON char-by-char,
// tracks whether we're inside a string literal, and escapes any control
// chars we see in-string. Outside-string control chars (between fields,
// indentation) are left alone — JSON.parse tolerates whitespace there.
function sanitizeJsonString(s) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const code = c.charCodeAt(0);

    if (!inString) {
      if (c === '"') inString = true;
      out += c;
      continue;
    }

    // Inside a string literal
    if (escaped) {
      escaped = false;
      // Backslash + raw control char (e.g. `\` followed by a literal newline)
      // is malformed JSON. Treat the control char as needing escape too.
      if (code < 0x20) {
        out += controlEscape(c, code);
      } else {
        out += c;
      }
      continue;
    }
    if (c === '\\') {
      escaped = true;
      out += c;
      continue;
    }
    if (c === '"') {
      inString = false;
      out += c;
      continue;
    }
    if (code < 0x20) {
      out += controlEscape(c, code);
    } else {
      out += c;
    }
  }
  return out;
}

function controlEscape(c, code) {
  switch (c) {
    case '\n': return '\\n';
    case '\r': return '\\r';
    case '\t': return '\\t';
    case '\b': return '\\b';
    case '\f': return '\\f';
    default:   return '\\u' + code.toString(16).padStart(4, '0');
  }
}

function robustJsonParse(text) {
  const raw = text.trim();

  // Strip markdown fences first — some prompts wrap JSON in ```json ... ```
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  let lastError = null;

  // Strategy 1 — parse as-is (works when Claude produces clean JSON)
  try { return JSON.parse(cleaned); } catch (e) { lastError = e; }

  // Strategy 2 — sanitize control chars inside string literals, then parse.
  // Catches raw \n / \r / \t embedded in multi-paragraph fields.
  try { return JSON.parse(sanitizeJsonString(cleaned)); } catch (e) { lastError = e; }

  // Strategy 3 — clip to outermost braces (Claude sometimes adds a leading
  // or trailing comment despite the prompt telling it not to)
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const clipped = cleaned.slice(start, end + 1);
    try { return JSON.parse(clipped); } catch (e) { lastError = e; }

    // Strategy 4 — clip + sanitize
    try { return JSON.parse(sanitizeJsonString(clipped)); } catch (e) { lastError = e; }

    // Strategy 5 — clip + pad missing closing braces (truncation recovery)
    for (let extra = 1; extra <= 5; extra++) {
      try { return JSON.parse(sanitizeJsonString(clipped + '}'.repeat(extra))); } catch (e) { lastError = e; }
    }
  }

  // All strategies failed — log a diagnostic context window around the
  // failure position so we can see the exact offending bytes in production
  // logs. This reveals whether the bad char is a control char (handled by
  // sanitizer), a smart-quote artifact, an unpaired Unicode surrogate, or
  // something else entirely.
  if (lastError) {
    const msg = lastError.message || '';
    const posMatch = msg.match(/position (\d+)/);
    console.error(`[wgen][robustJsonParse] ALL STRATEGIES FAILED. Error: "${msg}"`);
    console.error(`[wgen][robustJsonParse] Cleaned input length: ${cleaned.length} chars`);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const ctxStart = Math.max(0, pos - 250);
      const ctxEnd = Math.min(cleaned.length, pos + 250);
      const before = cleaned.slice(ctxStart, pos);
      const offending = cleaned[pos] || '<EOF>';
      const after = cleaned.slice(pos + 1, ctxEnd);
      const codepoint = offending === '<EOF>'
        ? 'N/A'
        : '0x' + offending.charCodeAt(0).toString(16).padStart(4, '0');
      console.error(`[wgen][robustJsonParse] Char at pos ${pos}: ${JSON.stringify(offending)} (codepoint ${codepoint})`);
      console.error(`[wgen][robustJsonParse] Context (250 chars before): ${JSON.stringify(before)}`);
      console.error(`[wgen][robustJsonParse] Context (250 chars after):  ${JSON.stringify(after)}`);
    } else {
      console.error(`[wgen][robustJsonParse] No position info in error. First 500 chars of cleaned: ${cleaned.slice(0, 500)}`);
      console.error(`[wgen][robustJsonParse] Last 500 chars of cleaned:  ${cleaned.slice(-500)}`);
    }
  }

  return null;
}

function slugify(name) {
  return (name || 'business')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
