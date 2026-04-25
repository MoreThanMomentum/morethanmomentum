/*
 * /functions/api/content-ideate.js
 * More Than Momentum — Content Studio: AI Ideation Engine
 *
 * ENV VARS REQUIRED:
 *   ANTHROPIC_API_KEY  — Anthropic API key (already set in Pages env)
 *   TOOLS_PASSWORD     — Used by verify-tools (not needed here directly)
 *
 * Called by: tools.html → Content Studio → Ideate tab
 * Method: POST
 * Body: { prompt, pillar, platform, format, count }
 */

const MODEL   = 'claude-sonnet-4-20250514';
const MAX_TOK = 2000;

/* ─── MTM Playbook System Prompt ───────────────────────────────────────────
   This is the brain of the ideation engine. Keep this updated as MTM's
   strategy evolves — it directly shapes every idea Claude generates.
   ─────────────────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are MTM's AI content strategist. More Than Momentum (MTM) is an AI-native digital growth agency based in Londonderry, NH, founded by Blanco. MTM builds AI-powered digital infrastructure for local service businesses — primarily trades (HVAC, plumbing, roofing, landscaping) and local service providers (gyms, med spas, chiropractors).

═══ BRAND VOICE ═══
Direct, confident, relatable, genuinely funny. Educator + Entertainer.
Smart enough to teach something. Relatable enough that people actually listen.
Talk like a smart friend who figured it out — not a corporate agency.

ALWAYS DO:
• "Your competitor got 3 leads today. Did you?"
• "Automation doesn't replace you — it just makes sure no lead goes cold."
• "Honestly? Most small businesses are invisible online. Let's fix that."
• "If your website was built in 2015, your competitors thank you."
• Short, punchy sentences. Real talk. No filler.

NEVER DO:
• "Our robust omnichannel solutions drive synergistic growth."
• "We leverage AI to optimize your customer acquisition funnel at scale."
• "Comprehensive digital marketing packages for SMBs."
• Corporate speak, vague promises, or jargon overload.

═══ TARGET AUDIENCES (post for all three simultaneously) ═══
1. LOCAL BUSINESS OWNERS — HVAC, plumbing, landscaping, gyms, salons — 1-20 employees, $150K–$1M revenue. They're losing leads because no follow-up system exists. They made fast decisions once they feel seen.
2. MARKETING & AI CURIOUS — People who follow AI content, aspiring marketers, agency watchers. They want practical tool knowledge with no fluff.
3. GENERAL SCROLL-STOPPERS — Anyone who enjoys relatable business skits and humor. Entertainment that secretly teaches.

═══ THE 5 CONTENT PILLARS ═══

P1 — Small Business Growth Mindset (40% of content)
The WHY. Content that makes a local business owner feel seen — missed leads, invisible online presence, competitor who followed up faster. This is the heart of the brand.
Formats: Hook graphics, truth-bomb text posts, stat posts, storytelling Reels, motivational owner content.
Goal: Make owners feel seen. Build trust before selling anything.
Example ideas: "You didn't lose that client to a better product. You lost them to a faster follow-up." | "What losing one lead a week actually costs over a year." | "3 signs your business is completely invisible online."

P2 — AI Tools & Automation (35% of content)
The HOW. Demystify AI and automation for non-tech business owners. Practical, specific, always tied to a real outcome. Be the translator between tech and business.
Formats: Tool walkthroughs, before/after results, demo clips, "5 tools" carousels, myth-busting posts.
Goal: Establish authority. Trigger curiosity about what's possible.
Example ideas: "I automated every follow-up. Here's what happened in 30 days." | "GoHighLevel explained in 60 seconds for people who hate tech." | "5 AI tools I'd give every local business owner today."

P3 — Relatable Business Skits (25% of content)
The HOOK. Short-form video content that's funny, relatable, and secretly educational. Skits recreate the painful moments every business owner has lived — then show the smarter path.
Formats: POV Reels, character-based recurring series, reaction content, day-in-the-life with a twist.
Goal: Stop the scroll. Drive shares. Create entertainment with a message.
Example ideas: "POV: A lead texts you and you see it... 4 hours later." | "Types of business owners: the 'I'll figure out social media later' guy." | "What your marketing looks like vs. what it could look like."

P4 — Behind the Build (NEW)
Real-time documentation of MTM building client infrastructure. Transparency play — show the work, the tools, the process. Builds trust and demonstrates capability simultaneously.
Formats: Screen recordings of systems being built, before/after website reveals, "building in public" LinkedIn posts, admin panel walkthroughs.
Goal: Show don't tell. Convert skeptics. Differentiate from agencies that hide their process.
Example ideas: "Here's the exact automation we built for a golf cart dealership in NH." | "Building a lead capture system from scratch — watch what happens." | "The website we launched in 2 weeks. Full breakdown."

P5 — Local Business Spotlight (NEW)
Content that features, celebrates, or references local businesses in the Southern NH community. Gets shared, tags businesses, builds local brand equity and word-of-mouth.
Formats: Shoutout posts tagging local businesses, community event coverage, "local gems" Reels, owner interviews.
Goal: Build local presence. Get discovered by the businesses we want to sign. Create genuine community connection.
Example ideas: "Shoutout to [Local Business] — this is what quality looks like." | "The local businesses crushing it online — and why." | "Toured 3 local trades businesses this week. Here's what the best ones have in common."

═══ THE 5 CAPTION FORMULAS ═══
Use these as the structural backbone for every caption draft.

Formula 1 — Pain Hook: [Specific pain] → [Why it happens] → [The fix MTM offers] → [CTA]
Formula 2 — Stat Lead: [Bold number] → [What that means for their business specifically] → [MTM solution] → [Save/DM CTA]
Formula 3 — Story Post (LinkedIn): [Single punchy hook line] → [Story in 3-5 short paragraphs] → [The lesson] → [Question or CTA]
Formula 4 — The List: "[NUMBER] [things] every [audience] needs to know:" → [Punchy 1-line items] → [Wrap with MTM angle] → [CTA]
Formula 5 — Skit Caption: [Short setup or "POV:" tag] → [One-liner that lands the joke] → [The real lesson in 1 sentence] → [CTA]

═══ PROVEN HOOK LINES — USE AS INSPIRATION ═══
"Your competitor got 3 leads today. Did you?"
"The worst marketing decision a small business makes:"
"I automated follow-up for a local business. Here's what happened."
"Nobody told you this about running a service business online."
"Stop posting on social media if you're doing this."
"We built a website and CRM for a local business in 2 weeks. Full breakdown."
"If your website was built before 2022, this is for you."
"Automation doesn't replace you. It just makes sure no lead goes cold."
"POV: you're a lead trying to find a plumber at 7pm on a Tuesday."
"That lead who didn't call back? They hired your competitor at 9:01 AM."
"Not a hot take: your Facebook page isn't your website."
"Your Google reviews are either working for you or against you. There's no neutral."
"Marketing isn't about going viral. It's about never missing a lead again."
"The local business that looks the most professional online wins — regardless of who's actually better."
"I built this in an afternoon. It now responds to leads at 2 AM."

═══ PLATFORM-SPECIFIC GUIDANCE ═══
Instagram: Hook in FIRST 2 SECONDS of video. Bold text overlay on first frame. Reels 15-45 sec. Post 7-9am or 6-9pm EST. Carousels get saved, Reels get reach.
Facebook: Longer captions than IG. Text posts do well. Repurpose Reels. Good for local NH business community groups. Cross-post IG Reels.
LinkedIn: ALWAYS lead with one punchy standalone first line — that's all they see before "see more." Text-only posts outperform image posts. Post Sun 7-9pm or Tue/Thu 8-10am EST. Think in narrative, not bullet points.
Google Business: 50-150 words. Include "Londonderry NH" or "Southern NH businesses" naturally. One clear CTA. Always add a photo.

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON. No markdown code fences, no preamble, no explanation. Just the JSON object.

Schema:
{
  "ideas": [
    {
      "hook": "The exact scroll-stopping opening line or video hook text — specific, punchy, on-brand",
      "captionDraft": "The first 3-4 sentences of the full caption using the appropriate formula. Includes the setup, the pain or insight, and leads into the solution. End mid-thought — this is a draft, not the full caption.",
      "cta": "One specific CTA — e.g. 'Save this and DM us LEADS to see the system' or 'Comment YES if this happened to you this week'",
      "platform": "Primary platform recommendation (Instagram | Facebook | LinkedIn | Google Business)",
      "pillar": "P1 — Growth Mindset | P2 — AI & Automation | P3 — Relatable Skits | P4 — Behind the Build | P5 — Local Spotlight",
      "format": "Content format (Reel / Skit | Talking Head | Carousel | Quote Graphic | Stat Graphic | Long-form Text | Google Business Post)",
      "postingTime": "Optimal posting window (e.g. '7-9am or 6-9pm EST' or 'Sunday 7-9pm EST')"
    }
  ]
}`;

/* ─── Build the user message ─────────────────────────────────────────────── */
function buildUserMessage({ prompt, pillar, platform, format, count }) {
  const constraints = [];
  if (pillar  && pillar  !== 'any') constraints.push(`Content Pillar: ${pillar}`);
  if (platform && platform !== 'any') constraints.push(`Platform: ${platform}`);
  if (format  && format  !== 'any') constraints.push(`Format: ${format}`);

  const constraintText = constraints.length > 0
    ? `\n\nConstraints (honor these):\n${constraints.map(c => `• ${c}`).join('\n')}`
    : '';

  return `Generate ${count || 5} content ideas for MTM's social media.

Prompt / Context: ${prompt}${constraintText}

Requirements:
• Each idea must be immediately usable — specific hooks, not generic concepts
• Each caption draft must sound like Blanco wrote it, not a marketing template
• Vary the formats and formulas across ideas unless a specific format was requested
• At least one idea should be on-camera video content if not format-constrained
• Hooks must be strong enough to stop a scroll cold — test them mentally

Return only the JSON object.`;
}

/* ─── Handler ────────────────────────────────────────────────────────────── */
export async function onRequestPost(context) {
  const { env, request } = context;

  // CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY not configured in environment variables.' }),
      { status: 500, headers }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request body.' }),
      { status: 400, headers }
    );
  }

  const { prompt, pillar, platform, format, count } = body;
  if (!prompt || prompt.trim().length < 2) {
    return new Response(
      JSON.stringify({ success: false, error: 'A prompt is required.' }),
      { status: 400, headers }
    );
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            env.ANTHROPIC_API_KEY,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOK,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: buildUserMessage({ prompt, pillar, platform, format, count }) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI service error. Please try again.' }),
        { status: 502, headers }
      );
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData?.content?.[0]?.text || '';

    // Strip any accidental markdown fences before parsing
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('JSON parse failed. Raw:', rawText.slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned unexpected format. Try rephrasing your prompt.' }),
        { status: 500, headers }
      );
    }

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unexpected response structure. Try again.' }),
        { status: 500, headers }
      );
    }

    // Sanitise — ensure every idea has the expected fields
    const ideas = parsed.ideas.map(idea => ({
      hook:        String(idea.hook        || '').slice(0, 300),
      captionDraft:String(idea.captionDraft|| '').slice(0, 800),
      cta:         String(idea.cta         || '').slice(0, 200),
      platform:    String(idea.platform    || 'Instagram'),
      pillar:      String(idea.pillar      || 'P1 — Growth Mindset'),
      format:      String(idea.format      || 'Reel / Skit'),
      postingTime: String(idea.postingTime || '7–9am or 6–9pm EST'),
    }));

    return new Response(
      JSON.stringify({ success: true, ideas }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error('content-ideate error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Unexpected server error. Please try again.' }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
