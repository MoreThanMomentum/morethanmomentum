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

  const { businessName, city, websiteUrl, tone, siteType } = body;

  if (!businessName || !city) {
    return jsonResponse({ error: 'Business name and city are required.' }, 400);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'API key not configured. Add ANTHROPIC_API_KEY to environment variables.' }, 500);
  }

  const normalizedSiteType = normalizeSiteType(siteType);

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

      // ─── STAGE B — GENERATION (STREAMING) ──────────────────────────────
      console.log(`${ts()} [wgen] STAGE B generation START`);
      await send({ event: 'generate_start' });
      const files = await runGenerationStreaming({
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
      console.log(`${ts()} [wgen] STAGE B generation DONE — files=${Object.keys(files).length} totalBytes=${Object.values(files).reduce((n, c) => n + c.length, 0)}`);

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
  'inventory',
  'restaurant',
  'real-estate',
  'portfolio',
]);

function normalizeSiteType(raw) {
  if (!raw) return 'brochure';
  const v = String(raw).toLowerCase().trim();
  return SUPPORTED_SITE_TYPES.has(v) ? v : 'brochure';
}

function siteTypeHint(siteType) {
  // Short hint text injected into both research and generation prompts.
  // Once Cole's template library lands these will be replaced by full
  // template definitions, but for now a clear directional hint is enough
  // to bias Claude's structural decisions.
  switch (siteType) {
    case 'service-business':
      return 'Site type: SERVICE BUSINESS (HVAC, plumbing, roofing, landscaping, cleaning, similar trades). Emphasize booking, service-area coverage, emergency/24-7 if applicable, and trust signals (license, insurance, years in business, reviews). Standard 4-page structure (Home, Services, About, Contact) but lead with a clear service-area + booking CTA on Home.';
    case 'inventory':
      return 'Site type: INVENTORY / DEALER (golf carts, vehicles, equipment, products with stock). The Services page should be reframed as an Inventory or Browse page with a placeholder grid for individual product listings (each card: image placeholder, model name, price, "View details" link). Add a clear "Sell or trade-in" CTA on Home and a financing-info section if relevant. Keep the contact/booking placeholders intact for the Phase 2 GHL embed.';
    case 'restaurant':
      return 'Site type: RESTAURANT / FOOD SERVICE. Replace the Services page with a Menu page (sections: appetizers, mains, drinks, desserts) with placeholder rows for items. The Home hero should emphasize cuisine type, location, hours, and reservations. Replace the booking placeholder section with a reservation prompt — same comment marker so the Phase 2 GHL booking embed still drops in cleanly.';
    case 'real-estate':
      return 'Site type: REAL ESTATE / AGENT. The Services page should be reframed as a Listings page with placeholder cards for individual properties (each: image placeholder, price, beds/baths/sqft, "View listing" link). Add an Agent Bio section to the About page. Keep contact + booking placeholders intact — Phase 2 swaps in GHL forms.';
    case 'portfolio':
      return 'Site type: PORTFOLIO / CREATIVE. The Services page should be reframed as Work or Projects, with placeholder cards for case-study items (each: image placeholder, title, client, brief description, link). Tone leans expressive; whitespace is heavier; typography hierarchy is the visual workhorse. Keep contact placeholder intact.';
    case 'brochure':
    default:
      return 'Site type: BROCHURE (general small-business marketing site). Standard 4-page structure (Home, Services, About, Contact) with the GHL contact form + booking embed placeholders on the Contact page. This is the default catch-all when no specialized template applies.';
  }
}

// ─── STAGE A — RESEARCH CALL ──────────────────────────────────────────────────

async function runResearch({ businessName, city, websiteUrl, toneOverride, siteType, apiKey, log = () => {} }) {
  const userMessage = websiteUrl
    ? `Research this business and produce the structured JSON template:\n\nBusiness: "${businessName}"\nLocation: "${city}"\nWebsite: ${websiteUrl}\n\nSearch their existing site, Google Business profile, and any active social presence. Extract real services, real prices if listed publicly, real brand colors, real review language. Return ONLY the JSON.`
    : `Research this business and produce the structured JSON template:\n\nBusiness: "${businessName}"\nLocation: "${city}"\n\nFind their existing website if one exists. Search Google Business profile, Yelp, Facebook, Instagram. Extract real services, real prices if listed publicly, brand colors from any visual assets you can find, review language. If they have no web presence at all, infer reasonable defaults from the industry + location. Return ONLY the JSON.`;

  const systemPrompt = `You are the research engine behind More Than Momentum's pre-call website generator. Your job: take a target business, do thorough web research, and emit a normalized JSON template that drives the website generator.

Quality standard: this template determines whether the generated site looks like "you already understand my business" (closes deals) or "this is AI slop with my name on it" (doesn't). Pull real services with real prices when they're publicly listed. Pull brand colors from logos or existing site CSS when accessible. Sample voice from review responses. Don't invent specifics that you can verify — but DO infer reasonable industry defaults when the business has no web presence to scrape.

${siteTypeHint(siteType)}

Tone selection rule: pick ONE of professional|friendly|luxury|authoritative|casual based on what the existing brand actually feels like. Trade businesses (HVAC, plumbing, roofing, landscaping) usually land on friendly or authoritative. Premium retail / service (golf carts, custom homes, financial advisors) lands on luxury or professional. Default to friendly when ambiguous.${toneOverride ? `\n\nTONE OVERRIDE FROM USER: "${toneOverride}" — use exactly this tone, ignore your own inference.` : ''}

CRITICAL: Your ENTIRE response must be a single valid JSON object. Start with { and end with }. No text before, no text after, no markdown fences, no commentary. Just the raw JSON conforming to this schema:

{
  "slug": "lowercase-hyphen-business-slug-max-50-chars",
  "business": {
    "name": "Exact business name as found",
    "industry": "concise industry phrase, e.g. 'HVAC contractor' or 'golf cart dealer'",
    "tagline": "One short sentence that captures the business's positioning",
    "yearFounded": "YYYY or null if unknown",
    "location": {
      "city": "city",
      "state": "ST",
      "address": "full street address if found, else null",
      "serviceArea": "the geographic area they serve, e.g. 'Greater Manchester NH and surrounding towns'"
    },
    "contact": {
      "phone": "+1 555 123 4567 format, or null",
      "email": "email address or null",
      "website": "existing site URL or null"
    },
    "hours": {
      "Mon": "8am-5pm",
      "Tue": "8am-5pm",
      "Wed": "8am-5pm",
      "Thu": "8am-5pm",
      "Fri": "8am-5pm",
      "Sat": "Closed",
      "Sun": "Closed"
    }
  },
  "branding": {
    "primaryColor": "#hexcode — pull from existing brand if findable, else industry-appropriate",
    "secondaryColor": "#hexcode — complementary",
    "accentColor": "#hexcode — for CTAs",
    "font": "a Google Font name appropriate to the tone, e.g. 'Inter', 'DM Sans', 'Playfair Display'",
    "tone": "professional|friendly|luxury|authoritative|casual"
  },
  "services": [
    { "name": "Service Name", "description": "1-2 sentence description grounded in what this business actually offers", "price": "public price if listed, else null", "icon": "single emoji that matches the service" }
  ],
  "content": {
    "uniqueValue": "One sentence stating what makes this business different — derived from real research, not generic platitudes",
    "benefits": ["specific benefit 1", "specific benefit 2", "specific benefit 3", "specific benefit 4"],
    "testimonials": [
      { "text": "Pulled from actual reviews if available, else realistic-but-generic", "author": "Reviewer first name + last initial, or 'Verified Customer'" }
    ],
    "faqs": [
      { "question": "Q grounded in what real customers ask this kind of business", "answer": "A in the brand's tone" }
    ],
    "aboutStory": "2-3 paragraph about-us story. If you found real history (founder name, year founded, origin), use it. If not, write a credible industry-typical origin story.",
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
    "competitorContext": "1-2 sentences on the local competitive landscape if found",
    "researchConfidence": "high|medium|low — how grounded in real data this template is"
  }
}

Aim for 4-6 services, 3-4 testimonials, 4-5 FAQs. If you can't find real data for a section, fill in industry-typical defaults but flag researchConfidence accordingly.`;

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
      max_tokens: 8000,
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

  // Sanity-fill missing fields so generation never breaks on undefined access.
  research.business = research.business || {};
  research.branding = research.branding || {};
  research.services = research.services || [];
  research.content = research.content || {};
  research.automation = research.automation || { enableContactForm: true, enableBooking: true, enableChatWidget: false };
  research.researchNotes = research.researchNotes || {};
  research.researchNotes.siteType = siteType; // forward-compat: stamp the chosen type into the audit trail
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function robustJsonParse(text) {
  const raw = text.trim();

  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}

    const partial = cleaned.slice(start, end + 1);
    for (let extra = 1; extra <= 5; extra++) {
      try { return JSON.parse(partial + '}'.repeat(extra)); } catch {}
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
