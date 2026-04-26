var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/content-ideate.js
var MODEL = "claude-sonnet-4-20250514";
var MAX_TOK = 2e3;
var SYSTEM_PROMPT = `You are MTM's AI content strategist. More Than Momentum (MTM) is an AI-native digital growth agency based in Londonderry, NH, founded by Blanco. MTM builds AI-powered digital infrastructure for local service businesses \u2014 primarily trades (HVAC, plumbing, roofing, landscaping) and local service providers (gyms, med spas, chiropractors).

\u2550\u2550\u2550 BRAND VOICE \u2550\u2550\u2550
Direct, confident, relatable, genuinely funny. Educator + Entertainer.
Smart enough to teach something. Relatable enough that people actually listen.
Talk like a smart friend who figured it out \u2014 not a corporate agency.

ALWAYS DO:
\u2022 "Your competitor got 3 leads today. Did you?"
\u2022 "Automation doesn't replace you \u2014 it just makes sure no lead goes cold."
\u2022 "Honestly? Most small businesses are invisible online. Let's fix that."
\u2022 "If your website was built in 2015, your competitors thank you."
\u2022 Short, punchy sentences. Real talk. No filler.

NEVER DO:
\u2022 "Our robust omnichannel solutions drive synergistic growth."
\u2022 "We leverage AI to optimize your customer acquisition funnel at scale."
\u2022 "Comprehensive digital marketing packages for SMBs."
\u2022 Corporate speak, vague promises, or jargon overload.

\u2550\u2550\u2550 TARGET AUDIENCES (post for all three simultaneously) \u2550\u2550\u2550
1. LOCAL BUSINESS OWNERS \u2014 HVAC, plumbing, landscaping, gyms, salons \u2014 1-20 employees, $150K\u2013$1M revenue. They're losing leads because no follow-up system exists. They made fast decisions once they feel seen.
2. MARKETING & AI CURIOUS \u2014 People who follow AI content, aspiring marketers, agency watchers. They want practical tool knowledge with no fluff.
3. GENERAL SCROLL-STOPPERS \u2014 Anyone who enjoys relatable business skits and humor. Entertainment that secretly teaches.

\u2550\u2550\u2550 THE 5 CONTENT PILLARS \u2550\u2550\u2550

P1 \u2014 Small Business Growth Mindset (40% of content)
The WHY. Content that makes a local business owner feel seen \u2014 missed leads, invisible online presence, competitor who followed up faster. This is the heart of the brand.
Formats: Hook graphics, truth-bomb text posts, stat posts, storytelling Reels, motivational owner content.
Goal: Make owners feel seen. Build trust before selling anything.
Example ideas: "You didn't lose that client to a better product. You lost them to a faster follow-up." | "What losing one lead a week actually costs over a year." | "3 signs your business is completely invisible online."

P2 \u2014 AI Tools & Automation (35% of content)
The HOW. Demystify AI and automation for non-tech business owners. Practical, specific, always tied to a real outcome. Be the translator between tech and business.
Formats: Tool walkthroughs, before/after results, demo clips, "5 tools" carousels, myth-busting posts.
Goal: Establish authority. Trigger curiosity about what's possible.
Example ideas: "I automated every follow-up. Here's what happened in 30 days." | "GoHighLevel explained in 60 seconds for people who hate tech." | "5 AI tools I'd give every local business owner today."

P3 \u2014 Relatable Business Skits (25% of content)
The HOOK. Short-form video content that's funny, relatable, and secretly educational. Skits recreate the painful moments every business owner has lived \u2014 then show the smarter path.
Formats: POV Reels, character-based recurring series, reaction content, day-in-the-life with a twist.
Goal: Stop the scroll. Drive shares. Create entertainment with a message.
Example ideas: "POV: A lead texts you and you see it... 4 hours later." | "Types of business owners: the 'I'll figure out social media later' guy." | "What your marketing looks like vs. what it could look like."

P4 \u2014 Behind the Build (NEW)
Real-time documentation of MTM building client infrastructure. Transparency play \u2014 show the work, the tools, the process. Builds trust and demonstrates capability simultaneously.
Formats: Screen recordings of systems being built, before/after website reveals, "building in public" LinkedIn posts, admin panel walkthroughs.
Goal: Show don't tell. Convert skeptics. Differentiate from agencies that hide their process.
Example ideas: "Here's the exact automation we built for a golf cart dealership in NH." | "Building a lead capture system from scratch \u2014 watch what happens." | "The website we launched in 2 weeks. Full breakdown."

P5 \u2014 Local Business Spotlight (NEW)
Content that features, celebrates, or references local businesses in the Southern NH community. Gets shared, tags businesses, builds local brand equity and word-of-mouth.
Formats: Shoutout posts tagging local businesses, community event coverage, "local gems" Reels, owner interviews.
Goal: Build local presence. Get discovered by the businesses we want to sign. Create genuine community connection.
Example ideas: "Shoutout to [Local Business] \u2014 this is what quality looks like." | "The local businesses crushing it online \u2014 and why." | "Toured 3 local trades businesses this week. Here's what the best ones have in common."

\u2550\u2550\u2550 THE 5 CAPTION FORMULAS \u2550\u2550\u2550
Use these as the structural backbone for every caption draft.

Formula 1 \u2014 Pain Hook: [Specific pain] \u2192 [Why it happens] \u2192 [The fix MTM offers] \u2192 [CTA]
Formula 2 \u2014 Stat Lead: [Bold number] \u2192 [What that means for their business specifically] \u2192 [MTM solution] \u2192 [Save/DM CTA]
Formula 3 \u2014 Story Post (LinkedIn): [Single punchy hook line] \u2192 [Story in 3-5 short paragraphs] \u2192 [The lesson] \u2192 [Question or CTA]
Formula 4 \u2014 The List: "[NUMBER] [things] every [audience] needs to know:" \u2192 [Punchy 1-line items] \u2192 [Wrap with MTM angle] \u2192 [CTA]
Formula 5 \u2014 Skit Caption: [Short setup or "POV:" tag] \u2192 [One-liner that lands the joke] \u2192 [The real lesson in 1 sentence] \u2192 [CTA]

\u2550\u2550\u2550 PROVEN HOOK LINES \u2014 USE AS INSPIRATION \u2550\u2550\u2550
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
"The local business that looks the most professional online wins \u2014 regardless of who's actually better."
"I built this in an afternoon. It now responds to leads at 2 AM."

\u2550\u2550\u2550 PLATFORM-SPECIFIC GUIDANCE \u2550\u2550\u2550
Instagram: Hook in FIRST 2 SECONDS of video. Bold text overlay on first frame. Reels 15-45 sec. Post 7-9am or 6-9pm EST. Carousels get saved, Reels get reach.
Facebook: Longer captions than IG. Text posts do well. Repurpose Reels. Good for local NH business community groups. Cross-post IG Reels.
LinkedIn: ALWAYS lead with one punchy standalone first line \u2014 that's all they see before "see more." Text-only posts outperform image posts. Post Sun 7-9pm or Tue/Thu 8-10am EST. Think in narrative, not bullet points.
Google Business: 50-150 words. Include "Londonderry NH" or "Southern NH businesses" naturally. One clear CTA. Always add a photo.

\u2550\u2550\u2550 OUTPUT FORMAT \u2550\u2550\u2550
Return ONLY valid JSON. No markdown code fences, no preamble, no explanation. Just the JSON object.

Schema:
{
  "ideas": [
    {
      "hook": "The exact scroll-stopping opening line or video hook text \u2014 specific, punchy, on-brand",
      "captionDraft": "The first 3-4 sentences of the full caption using the appropriate formula. Includes the setup, the pain or insight, and leads into the solution. End mid-thought \u2014 this is a draft, not the full caption.",
      "cta": "One specific CTA \u2014 e.g. 'Save this and DM us LEADS to see the system' or 'Comment YES if this happened to you this week'",
      "platform": "Primary platform recommendation (Instagram | Facebook | LinkedIn | Google Business)",
      "pillar": "P1 \u2014 Growth Mindset | P2 \u2014 AI & Automation | P3 \u2014 Relatable Skits | P4 \u2014 Behind the Build | P5 \u2014 Local Spotlight",
      "format": "Content format (Reel / Skit | Talking Head | Carousel | Quote Graphic | Stat Graphic | Long-form Text | Google Business Post)",
      "postingTime": "Optimal posting window (e.g. '7-9am or 6-9pm EST' or 'Sunday 7-9pm EST')"
    }
  ]
}`;
function buildUserMessage({ prompt, pillar, platform, format, count }) {
  const constraints = [];
  if (pillar && pillar !== "any") constraints.push(`Content Pillar: ${pillar}`);
  if (platform && platform !== "any") constraints.push(`Platform: ${platform}`);
  if (format && format !== "any") constraints.push(`Format: ${format}`);
  const constraintText = constraints.length > 0 ? `

Constraints (honor these):
${constraints.map((c) => `\u2022 ${c}`).join("\n")}` : "";
  return `Generate ${count || 5} content ideas for MTM's social media.

Prompt / Context: ${prompt}${constraintText}

Requirements:
\u2022 Each idea must be immediately usable \u2014 specific hooks, not generic concepts
\u2022 Each caption draft must sound like Blanco wrote it, not a marketing template
\u2022 Vary the formats and formulas across ideas unless a specific format was requested
\u2022 At least one idea should be on-camera video content if not format-constrained
\u2022 Hooks must be strong enough to stop a scroll cold \u2014 test them mentally

Return only the JSON object.`;
}
__name(buildUserMessage, "buildUserMessage");
async function onRequestPost(context) {
  const { env, request } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured in environment variables." }),
      { status: 500, headers }
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request body." }),
      { status: 400, headers }
    );
  }
  const { prompt, pillar, platform, format, count } = body;
  if (!prompt || prompt.trim().length < 2) {
    return new Response(
      JSON.stringify({ success: false, error: "A prompt is required." }),
      { status: 400, headers }
    );
  }
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOK,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage({ prompt, pillar, platform, format, count }) }]
      })
    });
    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", errText);
      return new Response(
        JSON.stringify({ success: false, error: "AI service error. Please try again." }),
        { status: 502, headers }
      );
    }
    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData?.content?.[0]?.text || "";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed. Raw:", rawText.slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: "AI returned unexpected format. Try rephrasing your prompt." }),
        { status: 500, headers }
      );
    }
    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      return new Response(
        JSON.stringify({ success: false, error: "Unexpected response structure. Try again." }),
        { status: 500, headers }
      );
    }
    const ideas = parsed.ideas.map((idea) => ({
      hook: String(idea.hook || "").slice(0, 300),
      captionDraft: String(idea.captionDraft || "").slice(0, 800),
      cta: String(idea.cta || "").slice(0, 200),
      platform: String(idea.platform || "Instagram"),
      pillar: String(idea.pillar || "P1 \u2014 Growth Mindset"),
      format: String(idea.format || "Reel / Skit"),
      postingTime: String(idea.postingTime || "7\u20139am or 6\u20139pm EST")
    }));
    return new Response(
      JSON.stringify({ success: true, ideas }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("content-ideate error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected server error. Please try again." }),
      { status: 500, headers }
    );
  }
}
__name(onRequestPost, "onRequestPost");
async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");

// api/create-bot.js
var RECALL_API = "https://us-west-2.recall.ai/api/v1";
async function onRequestPost2(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    const { meetingUrl } = await request.json();
    if (!meetingUrl || !meetingUrl.includes("meet.google.com")) {
      return new Response(JSON.stringify({ error: "Valid Google Meet URL required." }), { status: 400, headers });
    }
    if (!env.RECALL_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "RECALL_AI_API_KEY not configured in Cloudflare environment variables." }), { status: 500, headers });
    }
    const resp = await fetch(`${RECALL_API}/bot/`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${env.RECALL_AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: "MTM Notes",
        transcription_options: {
          provider: "default"
          // uses Recall's built-in transcription
        },
        webhook_url: "https://morethanmomentum.com/api/process-notes",
        // Bot joins ~30 seconds after creation
        join_at: null
        // null = join immediately
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Recall.ai bot creation failed:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.detail || data.message || "Bot creation failed." }), { status: resp.status, headers });
    }
    return new Response(JSON.stringify({
      success: true,
      botId: data.id,
      message: 'MTM Notes bot is joining the meeting. It will appear as "MTM Notes" in your participant list. When the call ends, notes will automatically appear in Tool 02.'
    }), { headers });
  } catch (err) {
    console.error("Create bot error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
__name(onRequestPost2, "onRequestPost");
async function onRequestOptions2() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
__name(onRequestOptions2, "onRequestOptions");

// api/get-call-notes.js
async function onRequestGet(context) {
  const { env, request } = context;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    if (!env.MTM_CLIENT_PROFILES) {
      return new Response(JSON.stringify({ error: "KV not configured." }), { status: 500, headers });
    }
    const raw = await env.MTM_CLIENT_PROFILES.get("session:call_history");
    if (!raw) {
      return new Response(JSON.stringify({ success: true, calls: [], count: 0 }), { headers });
    }
    let calls = [];
    try {
      const parsed = JSON.parse(raw);
      calls = Array.isArray(parsed) ? parsed : [];
    } catch {
      return new Response(JSON.stringify({ success: true, calls: [], count: 0 }), { headers });
    }
    const url = new URL(request.url);
    const requestedId = url.searchParams.get("id");
    if (requestedId) {
      const call = calls.find((c) => c.id === requestedId);
      if (!call) {
        return new Response(JSON.stringify({ success: false, reason: "Call not found." }), { status: 404, headers });
      }
      return new Response(JSON.stringify({ success: true, call }), { headers });
    }
    return new Response(JSON.stringify({ success: true, calls, count: calls.length }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
__name(onRequestGet, "onRequestGet");
async function onRequestOptions3() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
__name(onRequestOptions3, "onRequestOptions");

// api/mtm-analytics.js
var MCP_SERVER_URL = "https://mtm-mcp-server.coleblanco.workers.dev";
var META_API_BASE = "https://graph.facebook.com/v19.0";
var GA4_API_BASE = "https://analyticsdata.googleapis.com/v1beta";
var GOOGLE_TOKEN_KEY = "google_tokens";
async function fetchGHL(secret, month, year) {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const mcpBody = {
    jsonrpc: "2.0",
    id: "1",
    method: "tools/call",
    params: {
      name: "get_monthly_snapshot",
      arguments: { month: monthStr }
    }
  };
  const res = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${secret}`
    },
    body: JSON.stringify(mcpBody)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MCP server returned ${res.status}: ${txt.slice(0, 200)}`);
  }
  const mcpData = await res.json();
  const contentText = mcpData?.result?.content?.[0]?.text;
  if (!contentText) throw new Error("Empty MCP response content");
  let snapshot;
  try {
    snapshot = JSON.parse(contentText);
  } catch {
    snapshot = mcpData?.result?.content?.[0];
  }
  const sourcesBody = {
    jsonrpc: "2.0",
    id: "2",
    method: "tools/call",
    params: { name: "get_lead_source_breakdown", arguments: { limit: 8 } }
  };
  const [sourcesRes, pipelineRes] = await Promise.allSettled([
    fetch(`${MCP_SERVER_URL}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${secret}` },
      body: JSON.stringify(sourcesBody)
    }),
    fetch(`${MCP_SERVER_URL}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${secret}` },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "3",
        method: "tools/call",
        params: { name: "get_pipeline_summary", arguments: { status: "open", limit: 10 } }
      })
    })
  ]);
  let leadSources = [];
  let openOpportunities = [];
  if (sourcesRes.status === "fulfilled" && sourcesRes.value.ok) {
    try {
      const sd = await sourcesRes.value.json();
      const raw = JSON.parse(sd?.result?.content?.[0]?.text || "{}");
      leadSources = raw.sources || raw.leadSources || [];
    } catch {
    }
  }
  if (pipelineRes.status === "fulfilled" && pipelineRes.value.ok) {
    try {
      const pd = await pipelineRes.value.json();
      const raw = JSON.parse(pd?.result?.content?.[0]?.text || "{}");
      openOpportunities = raw.opportunities || raw.pipeline || [];
    } catch {
    }
  }
  const ghl = snapshot || {};
  return {
    totalLeads: ghl.newLeads ?? ghl.totalLeads ?? 0,
    wonDeals: ghl.wonDeals ?? 0,
    wonRevenue: ghl.wonRevenue ?? ghl.totalWonRevenue ?? 0,
    lostDeals: ghl.lostDeals ?? 0,
    openDeals: ghl.openDeals ?? ghl.openOpportunities ?? 0,
    openPipelineValue: ghl.openPipelineValue ?? ghl.pipelineValue ?? 0,
    topSource: ghl.topSource ?? (leadSources[0]?.source || "\u2014"),
    leadSources,
    openOpportunities
  };
}
__name(fetchGHL, "fetchGHL");
async function fetchMeta(pageToken, pageId, igUserId) {
  const result = { facebook: null, instagram: null };
  const now = /* @__PURE__ */ new Date();
  const since = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1e3);
  const until = Math.floor(now.getTime() / 1e3);
  if (pageId) {
    try {
      const [pageRes, insightsRes] = await Promise.allSettled([
        // Basic page info: fan_count, name
        fetch(`${META_API_BASE}/${pageId}?fields=fan_count,name,followers_count&access_token=${pageToken}`),
        // Insights: reach + new followers for current month
        fetch(
          `${META_API_BASE}/${pageId}/insights?metric=page_impressions_unique,page_fan_adds_unique,page_engaged_users,page_views_total&period=day&since=${since}&until=${until}&access_token=${pageToken}`
        )
      ]);
      let fans = 0, followers = 0;
      if (pageRes.status === "fulfilled" && pageRes.value.ok) {
        const pd = await pageRes.value.json();
        fans = pd.fan_count || 0;
        followers = pd.followers_count || fans;
      }
      let reach28 = 0, newFollowers = 0, engaged = 0, pageViews = 0;
      if (insightsRes.status === "fulfilled" && insightsRes.value.ok) {
        const id = await insightsRes.value.json();
        const metrics = id.data || [];
        for (const metric of metrics) {
          const sum = (metric.values || []).reduce((acc, v) => acc + (v.value || 0), 0);
          switch (metric.name) {
            case "page_impressions_unique":
              reach28 = sum;
              break;
            case "page_fan_adds_unique":
              newFollowers = sum;
              break;
            case "page_engaged_users":
              engaged = sum;
              break;
            case "page_views_total":
              pageViews = sum;
              break;
          }
        }
      }
      result.facebook = { followers, fans, reach28Days: reach28, newFollowers28Days: newFollowers, engagedUsers28Days: engaged, pageViews28Days: pageViews };
    } catch (err) {
      console.error("Meta Facebook error:", err.message);
      result.facebook = { error: "Could not load Facebook data." };
    }
  }
  if (igUserId) {
    try {
      const [igRes, igInsightsRes, igMediaRes] = await Promise.allSettled([
        // Account info
        fetch(`${META_API_BASE}/${igUserId}?fields=followers_count,media_count,biography&access_token=${pageToken}`),
        // Account-level insights (days_28 period)
        fetch(
          `${META_API_BASE}/${igUserId}/insights?metric=reach,impressions,profile_views,website_clicks&period=days_28&access_token=${pageToken}`
        ),
        // Recent media for post performance
        fetch(
          `${META_API_BASE}/${igUserId}/media?fields=id,timestamp,like_count,comments_count,media_type,permalink&limit=10&access_token=${pageToken}`
        )
      ]);
      let followers = 0, mediaCount = 0;
      if (igRes.status === "fulfilled" && igRes.value.ok) {
        const igd = await igRes.value.json();
        followers = igd.followers_count || 0;
        mediaCount = igd.media_count || 0;
      }
      let reach28 = 0, impressions28 = 0, profileViews28 = 0, websiteClicks28 = 0;
      if (igInsightsRes.status === "fulfilled" && igInsightsRes.value.ok) {
        const iid = await igInsightsRes.value.json();
        for (const metric of iid.data || []) {
          const val = metric?.values?.[0]?.value || metric?.value || 0;
          switch (metric.name) {
            case "reach":
              reach28 = val;
              break;
            case "impressions":
              impressions28 = val;
              break;
            case "profile_views":
              profileViews28 = val;
              break;
            case "website_clicks":
              websiteClicks28 = val;
              break;
          }
        }
      }
      let recentPosts = [];
      if (igMediaRes.status === "fulfilled" && igMediaRes.value.ok) {
        const imd = await igMediaRes.value.json();
        recentPosts = (imd.data || []).slice(0, 6).map((post) => ({
          id: post.id,
          timestamp: post.timestamp,
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
          type: post.media_type || "IMAGE",
          url: post.permalink || ""
        }));
      }
      result.instagram = {
        followers,
        mediaCount,
        reach28Days: reach28,
        impressions28Days: impressions28,
        profileViews28Days: profileViews28,
        websiteClicks28Days: websiteClicks28,
        recentPosts
      };
    } catch (err) {
      console.error("Meta Instagram error:", err.message);
      result.instagram = { error: "Could not load Instagram data." };
    }
  }
  return result;
}
__name(fetchMeta, "fetchMeta");
async function fetchGA4(kv, propertyId, month, year) {
  if (!kv) throw new Error("GOOGLE_KV binding not available");
  const raw = await kv.get(GOOGLE_TOKEN_KEY);
  if (!raw) throw new Error("Google not connected \u2014 no tokens in KV");
  let tokens;
  try {
    tokens = JSON.parse(raw);
  } catch {
    throw new Error("Invalid token data in KV");
  }
  let accessToken = tokens.access_token;
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 3e5) {
    accessToken = await refreshGoogleToken(kv, tokens);
  }
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" }
    ]
  };
  const res = await fetch(
    `${GA4_API_BASE}/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API error ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const rows = data.rows || [];
  let totalSessions = 0, totalUsers = 0, bounceRate = 0, avgDuration = 0;
  const channels = [];
  for (const row of rows) {
    const channel = row.dimensionValues?.[0]?.value || "Unknown";
    const sessions = parseInt(row.metricValues?.[0]?.value || "0");
    const users = parseInt(row.metricValues?.[1]?.value || "0");
    const bounce = parseFloat(row.metricValues?.[2]?.value || "0");
    const duration = parseFloat(row.metricValues?.[3]?.value || "0");
    totalSessions += sessions;
    totalUsers += users;
    channels.push({ channel, sessions, users });
    if (sessions > 0) {
      bounceRate += bounce * sessions;
      avgDuration += duration * sessions;
    }
  }
  if (totalSessions > 0) {
    bounceRate = Math.round(bounceRate / totalSessions * 100);
    avgDuration = Math.round(avgDuration / totalSessions);
  }
  channels.sort((a, b) => b.sessions - a.sessions);
  return {
    sessions: totalSessions,
    users: totalUsers,
    bounceRate,
    avgSessionDurationSec: avgDuration,
    trafficChannels: channels.slice(0, 6)
  };
}
__name(fetchGA4, "fetchGA4");
async function refreshGoogleToken(kv, tokens) {
  const credsRaw = await kv.get("google_credentials");
  if (!credsRaw) throw new Error("Google credentials not in KV");
  const creds = JSON.parse(credsRaw);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token"
    })
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const newTokens = await res.json();
  const updated = {
    ...tokens,
    access_token: newTokens.access_token,
    expiry_date: Date.now() + newTokens.expires_in * 1e3
  };
  await kv.put(GOOGLE_TOKEN_KEY, JSON.stringify(updated));
  return newTokens.access_token;
}
__name(refreshGoogleToken, "refreshGoogleToken");
async function onRequestPost3(context) {
  const { env, request } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  if (!env.MTM_GHL_SECRET) {
    return new Response(JSON.stringify({ notConfigured: true }), { status: 200, headers });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {
  }
  const now = /* @__PURE__ */ new Date();
  const month = body.month || now.getMonth() + 1;
  const year = body.year || now.getFullYear();
  const [ghlResult, metaResult, ga4Result] = await Promise.allSettled([
    fetchGHL(env.MTM_GHL_SECRET, month, year),
    env.MTM_META_PAGE_TOKEN && env.MTM_META_PAGE_ID ? fetchMeta(env.MTM_META_PAGE_TOKEN, env.MTM_META_PAGE_ID, env.MTM_META_IG_USER_ID || null) : Promise.reject(new Error("Meta not configured")),
    env.MTM_GA4_PROPERTY_ID && env.GOOGLE_KV ? fetchGA4(env.GOOGLE_KV, env.MTM_GA4_PROPERTY_ID, month, year) : Promise.reject(new Error("GA4 not configured"))
  ]);
  const response = {
    success: ghlResult.status === "fulfilled",
    period: { month, year, label: `${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}` },
    ghl: ghlResult.status === "fulfilled" ? ghlResult.value : { error: ghlResult.reason?.message || "GHL data unavailable" },
    meta: metaResult.status === "fulfilled" ? metaResult.value : null,
    // null = not configured, don't show error state
    ga4: ga4Result.status === "fulfilled" ? ga4Result.value : null
  };
  if (ghlResult.status === "rejected") {
    response.error = ghlResult.reason?.message || "Could not connect to GHL.";
  }
  return new Response(JSON.stringify(response), { status: 200, headers });
}
__name(onRequestPost3, "onRequestPost");
async function onRequestOptions4() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions4, "onRequestOptions");

// api/oauth-google.js
var SCOPES = [
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/drive.file"
].join(" ");
var REDIRECT_URI = "https://morethanmomentum.com/api/oauth-google";
var TOKEN_URL = "https://oauth2.googleapis.com/token";
var AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
async function onRequestGet2(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (action === "init") {
    if (!env.GOOGLE_OAUTH_CLIENT_ID) {
      return new Response("GOOGLE_OAUTH_CLIENT_ID not set in Cloudflare environment variables.", { status: 500 });
    }
    const authUrl = new URL(AUTH_URL);
    authUrl.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    return Response.redirect(authUrl.toString(), 302);
  }
  if (error) {
    return Response.redirect(`/tools?oauth=error&reason=${encodeURIComponent(error)}`, 302);
  }
  if (code) {
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return Response.redirect("/tools?oauth=error&reason=missing_credentials", 302);
    }
    try {
      const tokenResp = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_OAUTH_CLIENT_ID,
          client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code"
        })
      });
      const tokenData = await tokenResp.json();
      if (!tokenData.refresh_token) {
        return Response.redirect(`/tools?oauth=error&reason=no_refresh_token`, 302);
      }
      if (env.MTM_CLIENT_PROFILES) {
        await env.MTM_CLIENT_PROFILES.put("mtm:google_refresh_token", tokenData.refresh_token);
      }
      const successUrl = new URL("/tools", REDIRECT_URI);
      successUrl.searchParams.set("oauth", "success");
      successUrl.searchParams.set("hint", "Copy the refresh token to GOOGLE_OAUTH_REFRESH_TOKEN in Cloudflare env vars");
      return Response.redirect(successUrl.toString(), 302);
    } catch (err) {
      console.error("OAuth exchange error:", err.message);
      return Response.redirect(`/tools?oauth=error&reason=${encodeURIComponent(err.message)}`, 302);
    }
  }
  return new Response("Invalid request.", { status: 400 });
}
__name(onRequestGet2, "onRequestGet");

// api/process-notes.js
var RECALL_API2 = "https://us-west-2.recall.ai/api/v1";
var MAX_CALLS = 5;
async function onRequestPost4(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    const rawBody = await request.text();
    if (env.RECALL_AI_WEBHOOK_SECRET) {
      const signature = request.headers.get("X-Recall-Signature") || request.headers.get("recall-signature");
      if (signature) {
        const isValid = await verifySignature(rawBody, signature, env.RECALL_AI_WEBHOOK_SECRET);
        if (!isValid) {
          console.warn("Recall.ai signature verification failed");
          return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers });
        }
      }
    }
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log("Received event:", event, "| Full payload keys:", Object.keys(payload).join(", "));
    if (event === "manual_paste") {
      const pastedText = payload.data?.transcript || "";
      if (!pastedText || pastedText.length < 30) {
        return new Response(JSON.stringify({ error: "Transcript too short." }), { status: 400, headers });
      }
      const transcript = typeof pastedText === "string" ? pastedText : pastedText.map((seg) => `${seg.speaker || "Speaker"}: ${seg.text || ""}`).join("\n");
      const fields = await extractCallFields(transcript, env.ANTHROPIC_API_KEY);
      const callEntry = {
        id: generateId(),
        meetingTitle: "Pasted Notes \u2014 " + (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        date: (/* @__PURE__ */ new Date()).toISOString(),
        botId: null,
        fields,
        transcript: transcript.slice(0, 3e3),
        processedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await addCallToHistory(env.MTM_CLIENT_PROFILES, callEntry);
      return new Response(JSON.stringify({ success: true, callId: callEntry.id }), { headers });
    }
    if (event === "recording.done") {
      const botId = payload.data?.bot?.id;
      if (!botId) {
        return new Response(JSON.stringify({ received: true, action: "ignored", reason: "no bot id" }), { headers });
      }
      console.log("recording.done for botId:", botId, "\u2014 triggering transcription");
      const meetingTitle = await fetchMeetingTitle(botId, env.RECALL_AI_API_KEY);
      if (env.MTM_CLIENT_PROFILES) {
        const pending = {
          botId,
          meetingTitle: meetingTitle || "Google Meet \u2014 " + (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          date: (/* @__PURE__ */ new Date()).toISOString()
        };
        await env.MTM_CLIENT_PROFILES.put(`pending:bot:${botId}`, JSON.stringify(pending), { expirationTtl: 7200 });
      }
      const triggerResult = await triggerAsyncTranscription(botId, env.RECALL_AI_API_KEY);
      console.log("Transcription trigger result:", JSON.stringify(triggerResult));
      return new Response(JSON.stringify({ received: true, action: "transcription_triggered", botId, triggerResult }), { headers });
    }
    if (event === "transcript.failed") {
      console.error("Transcript failed:", JSON.stringify(payload.data));
      return new Response(JSON.stringify({ received: true, action: "logged", event }), { headers });
    }
    if (event === "bot.done") {
      const botId = payload.data?.bot?.id;
      if (!botId) {
        console.warn("No bot ID in bot.done payload");
        return new Response(JSON.stringify({ received: true, action: "ignored", reason: "no bot id" }), { headers });
      }
      console.log("bot.done for botId:", botId);
      const meetingTitle = await fetchMeetingTitle(botId, env.RECALL_AI_API_KEY);
      console.log("Meeting title:", meetingTitle);
      if (env.MTM_CLIENT_PROFILES) {
        const pending = {
          botId,
          meetingTitle: meetingTitle || "Google Meet \u2014 " + (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          date: (/* @__PURE__ */ new Date()).toISOString()
        };
        await env.MTM_CLIENT_PROFILES.put(`pending:bot:${botId}`, JSON.stringify(pending), { expirationTtl: 7200 });
        console.log("Pending entry saved for botId:", botId);
      }
      const triggerResult = await triggerAsyncTranscription(botId, env.RECALL_AI_API_KEY);
      console.log("Transcription trigger result:", JSON.stringify(triggerResult));
      return new Response(JSON.stringify({
        received: true,
        action: "transcription_triggered",
        botId,
        triggerResult
      }), { headers });
    }
    if (event === "transcript.done") {
      const botId = payload.data?.bot?.id;
      const transcriptId = payload.data?.transcript?.id;
      console.log("transcript.done | botId:", botId, "| transcriptId:", transcriptId);
      if (!botId || !transcriptId) {
        console.warn("Missing bot ID or transcript ID in payload");
        return new Response(JSON.stringify({ received: true, action: "ignored", reason: "missing ids" }), { headers });
      }
      let pending = null;
      if (env.MTM_CLIENT_PROFILES) {
        const raw = await env.MTM_CLIENT_PROFILES.get(`pending:bot:${botId}`);
        if (raw) {
          try {
            pending = JSON.parse(raw);
          } catch {
            pending = null;
          }
          await env.MTM_CLIENT_PROFILES.delete(`pending:bot:${botId}`);
        }
      }
      const downloadUrl = await fetchTranscriptDownloadUrl(transcriptId, env.RECALL_AI_API_KEY);
      console.log("Download URL found:", !!downloadUrl);
      let transcript = "";
      if (downloadUrl) {
        transcript = await fetchTranscriptFromDownloadUrl(downloadUrl, env.RECALL_AI_API_KEY);
        console.log("Transcript from download_url, length:", transcript.length);
      }
      if (!transcript || transcript.length < 30) {
        transcript = await fetchTranscriptFromRecall(botId, env.RECALL_AI_API_KEY);
        console.log("Transcript from bot endpoint fallback, length:", transcript.length);
      }
      if (!transcript || transcript.length < 30) {
        console.warn("Transcript too short or empty for bot:", botId);
        return new Response(JSON.stringify({ received: true, action: "ignored", reason: "transcript too short" }), { headers });
      }
      const fields = await extractCallFields(transcript, env.ANTHROPIC_API_KEY);
      const callEntry = {
        id: generateId(),
        meetingTitle: pending?.meetingTitle || "Google Meet \u2014 " + (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        date: pending?.date || (/* @__PURE__ */ new Date()).toISOString(),
        botId,
        fields,
        transcript: transcript.slice(0, 3e3),
        processedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await addCallToHistory(env.MTM_CLIENT_PROFILES, callEntry);
      console.log("Call saved to history:", callEntry.id);
      return new Response(JSON.stringify({ success: true, callId: callEntry.id, fieldsExtracted: Object.keys(fields).length }), { headers });
    }
    return new Response(JSON.stringify({ received: true, action: "ignored", event }), { headers });
  } catch (err) {
    console.error("Process notes error:", err.message, err.stack);
    return new Response(JSON.stringify({ error: "Processing failed.", detail: err.message }), { status: 500, headers });
  }
}
__name(onRequestPost4, "onRequestPost");
async function triggerAsyncTranscription(botId, apiKey) {
  if (!apiKey) {
    console.error("RECALL_AI_API_KEY not configured");
    return { error: "no api key" };
  }
  try {
    const recordingId = await fetchRecordingId(botId, apiKey);
    if (!recordingId) {
      console.error("No recording found for bot:", botId);
      return { error: "no recording id found for bot" };
    }
    console.log("Recording ID for bot", botId, ":", recordingId);
    const url = `${RECALL_API2}/recording/${recordingId}/create_transcript/`;
    const body = {
      provider: {
        gladia_v2_async: {}
      }
    };
    console.log("Triggering async transcription at:", url);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const responseText = await resp.text();
    console.log("Async transcription response:", resp.status, responseText.slice(0, 300));
    if (!resp.ok) {
      return { error: `HTTP ${resp.status}`, detail: responseText.slice(0, 200) };
    }
    try {
      return JSON.parse(responseText);
    } catch {
      return { raw: responseText.slice(0, 200) };
    }
  } catch (err) {
    console.error("triggerAsyncTranscription error:", err.message);
    return { error: err.message };
  }
}
__name(triggerAsyncTranscription, "triggerAsyncTranscription");
async function fetchRecordingId(botId, apiKey) {
  if (!apiKey) return null;
  try {
    const resp = await fetch(`${RECALL_API2}/recording/?bot_id=${botId}`, {
      headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }
    });
    if (!resp.ok) {
      console.error("Recording list fetch failed:", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    const results = data.results || (Array.isArray(data) ? data : []);
    if (!results.length) {
      console.warn("No recordings found for bot:", botId);
      return null;
    }
    const done = results.find((r) => r.status?.code === "done") || results[0];
    console.log("Found recording:", done?.id, "| status:", done?.status?.code);
    return done?.id || null;
  } catch (err) {
    console.error("fetchRecordingId error:", err.message);
    return null;
  }
}
__name(fetchRecordingId, "fetchRecordingId");
async function fetchMeetingTitle(botId, apiKey) {
  if (!apiKey) return null;
  try {
    const resp = await fetch(`${RECALL_API2}/bot/${botId}/`, {
      headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }
    });
    if (!resp.ok) return null;
    const bot = await resp.json();
    return bot.meeting_metadata?.title || bot.calendar_meeting?.title || bot.meeting_metadata?.meeting_title || null;
  } catch (err) {
    console.error("fetchMeetingTitle error:", err.message);
    return null;
  }
}
__name(fetchMeetingTitle, "fetchMeetingTitle");
async function fetchTranscriptDownloadUrl(transcriptId, apiKey) {
  if (!transcriptId || !apiKey) return null;
  try {
    const resp = await fetch(`${RECALL_API2}/transcript/${transcriptId}/`, {
      headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }
    });
    if (!resp.ok) {
      console.error("Transcript object fetch failed:", resp.status);
      return null;
    }
    const data = await resp.json();
    const url = data.data?.download_url || null;
    console.log("Transcript download_url:", url ? "found" : "not found");
    return url;
  } catch (err) {
    console.error("fetchTranscriptDownloadUrl error:", err.message);
    return null;
  }
}
__name(fetchTranscriptDownloadUrl, "fetchTranscriptDownloadUrl");
async function fetchTranscriptFromDownloadUrl(downloadUrl, apiKey) {
  if (!downloadUrl) return "";
  try {
    const resp = await fetch(downloadUrl, {
      headers: { "Authorization": `Token ${apiKey}` }
    });
    if (!resp.ok) {
      console.error("Download URL fetch failed:", resp.status);
      return "";
    }
    const data = await resp.json();
    if (Array.isArray(data)) {
      return data.map((item) => {
        const speaker = item.participant?.name || "Speaker";
        const text2 = item.transcript || item.words?.map((w) => w.word || w.text || "").join(" ") || "";
        return `${speaker}: ${text2}`;
      }).filter((line) => line.trim().length > 2).join("\n");
    }
    console.warn("Unexpected download URL format:", JSON.stringify(data).slice(0, 200));
    return "";
  } catch (err) {
    console.error("fetchTranscriptFromDownloadUrl error:", err.message);
    return "";
  }
}
__name(fetchTranscriptFromDownloadUrl, "fetchTranscriptFromDownloadUrl");
async function fetchTranscriptFromRecall(botId, apiKey) {
  if (!apiKey) {
    console.error("RECALL_AI_API_KEY not configured");
    return "";
  }
  try {
    const resp = await fetch(`${RECALL_API2}/bot/${botId}/transcript/`, {
      headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }
    });
    if (!resp.ok) {
      console.error("Transcript fetch failed:", resp.status, await resp.text());
      return "";
    }
    const data = await resp.json();
    if (Array.isArray(data)) {
      return data.map((seg) => {
        const speaker = seg.speaker || "Speaker";
        const words = Array.isArray(seg.words) ? seg.words.map((w) => w.text || w.word || "").join(" ") : seg.text || "";
        return `${speaker}: ${words}`;
      }).filter((line) => line.trim().length > 0).join("\n");
    }
    if (data.segments && Array.isArray(data.segments)) {
      return data.segments.map((seg) => {
        const speaker = seg.speaker || "Speaker";
        const text2 = seg.text || "";
        return `${speaker}: ${text2}`;
      }).filter((line) => line.trim().length > 0).join("\n");
    }
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((seg) => {
        const speaker = seg.speaker || "Speaker";
        const text2 = seg.text || seg.words?.map((w) => w.text).join(" ") || "";
        return `${speaker}: ${text2}`;
      }).filter((line) => line.trim().length > 0).join("\n");
    }
    console.warn("Unexpected transcript format:", JSON.stringify(data).slice(0, 200));
    return "";
  } catch (err) {
    console.error("fetchTranscriptFromRecall error:", err.message);
    return "";
  }
}
__name(fetchTranscriptFromRecall, "fetchTranscriptFromRecall");
async function extractCallFields(transcript, apiKey) {
  if (!apiKey) {
    return { error: "ANTHROPIC_API_KEY not configured", rawTranscript: transcript.slice(0, 500) };
  }
  const prompt = `You are analyzing a meeting transcript for More Than Momentum (MTM), a digital marketing agency.

Determine the call type and extract all relevant information. Return ONLY a JSON object. Use null for fields not mentioned.

{
  "callType": "discovery | check-in | review | internal | other",
  "summary": "2-3 sentence summary of the call \u2014 key topics, decisions made, and next steps",
  "businessName": "prospect or client business name",
  "contactName": "prospect or client contact name",
  "city": "their city and state",
  "businessType": "type of business (HVAC, Plumbing, Gym, etc.)",
  "avgCustomerValue": "average job/customer value in dollars (number only, no $)",
  "budgetBeforeResults": "how much they're willing to spend before seeing results (number only)",
  "currentMarketingSpend": "current monthly marketing spend (number only)",
  "painPoint": "their #1 pain \u2014 pick closest: 'Losing leads \u2014 no follow-up system' | 'Website doesn\\'t reflect business quality' | 'No online presence at all' | 'Inconsistent or zero social media' | 'Need more leads / customers' | 'Bad experience with previous agency' | 'Don\\'t have time to manage marketing' | 'Other'",
  "desiredOutcome": "what outcome they said would make them say yes",
  "triedBefore": "pick closest: 'Nothing' | 'DIY social media' | 'Hired an agency before' | 'Hired a freelancer' | 'Ran paid ads' | 'Built own website' | 'Multiple things'",
  "socialGoal": "'leads' | 'brand' | 'both'",
  "meetingCadence": "'weekly' | 'biweekly' | 'monthly_email'",
  "currentWebsiteTraffic": "monthly visitors (number only)",
  "currentLeadsPerMonth": "leads per month (number only)",
  "currentInstagramFollowers": "Instagram followers (number only)",
  "currentFacebookFollowers": "Facebook followers (number only)",
  "currentGoogleReviews": "Google review count (number only)",
  "serviceInterests": { "website": true/false, "backend": true/false, "social": true/false },
  "actionItems": ["array of action items or next steps from the call"],
  "discoveryNotes": "any other important context (max 300 chars)"
}

TRANSCRIPT:
${transcript.slice(0, 4e3)}

Return ONLY valid JSON. No markdown. No backticks. No explanation.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await resp.json();
    const text2 = data.content?.[0]?.text || "{}";
    return JSON.parse(text2.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim());
  } catch (err) {
    console.error("Claude extraction error:", err.message);
    return { error: "Extraction failed", rawTranscript: transcript.slice(0, 500) };
  }
}
__name(extractCallFields, "extractCallFields");
async function addCallToHistory(kv, callEntry) {
  if (!kv) {
    console.error("MTM_CLIENT_PROFILES KV not bound");
    return;
  }
  let history = [];
  try {
    const raw = await kv.get("session:call_history");
    if (raw) {
      const parsed = JSON.parse(raw);
      history = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    history = [];
  }
  history.unshift(callEntry);
  if (history.length > MAX_CALLS) history = history.slice(0, MAX_CALLS);
  await kv.put("session:call_history", JSON.stringify(history));
}
__name(addCallToHistory, "addCallToHistory");
async function verifySignature(body, signature, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = hexToBytes(signature.replace("sha256=", ""));
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
  } catch {
    return false;
  }
}
__name(verifySignature, "verifySignature");
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}
__name(hexToBytes, "hexToBytes");
function generateId() {
  return "call_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}
__name(generateId, "generateId");
async function onRequestOptions5() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions5, "onRequestOptions");

// api/proposal.js
var MIN_SETUP = 1e3;
var MIN_MONTHLY_NO_SOCIAL = 200;
var MIN_MONTHLY_WITH_SOCIAL = 2500;
var OUT_OF_SCOPE_RATE = 50;
var ALLOWED_METRICS = [
  "Monthly Website Traffic (Unique Visitors)",
  "Monthly Qualified Leads (GHL Pipeline)",
  "Monthly Website Form Submissions",
  "Instagram Followers",
  "Facebook Page Followers",
  "TikTok Followers",
  "Google Business Profile Views",
  "Social Media Engagement Rate",
  "Email Open Rate",
  "Google Review Count"
];
var FORBIDDEN_METRICS = [
  "sales",
  "revenue",
  "profit",
  "conversions",
  "close rate",
  "appointments booked",
  "customers acquired",
  "ROI",
  "bookings"
];
async function onRequestPost5(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    const body = await request.json();
    const {
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      businessAddress,
      city,
      businessType,
      // Service checkboxes
      serviceWebsite,
      serviceBackend,
      serviceSocial,
      // Discovery data
      avgCustomerValue,
      budgetBeforeResults,
      currentMarketingSpend,
      painPoint,
      desiredOutcome,
      triedBefore,
      socialGoal,
      meetingCadence,
      meetingDay,
      discoveryNotes,
      // Website scope
      websitePages,
      websiteXmlSitemap,
      websiteMinImages,
      websiteMinVideos,
      websiteLeadCapture,
      // Social scope
      socialSamePostsPerWeek,
      socialDiffPostsPerWeek,
      socialPlatforms,
      // Current metrics (for benchmarks)
      currentWebsiteTraffic,
      currentLeadsPerMonth,
      currentInstagramFollowers,
      currentFacebookFollowers,
      currentTiktokFollowers,
      currentGoogleReviews,
      // Overrides
      setupFeeOverride,
      introMonthlyOverride,
      standardMonthlyOverride,
      minimumTermOverride,
      setupPaymentStructure
    } = body;
    if (!businessName || !contactName || !city || !businessType) {
      return new Response(JSON.stringify({ error: "businessName, contactName, city, and businessType are required." }), { status: 400, headers });
    }
    if (!serviceWebsite && !serviceBackend && !serviceSocial) {
      return new Response(JSON.stringify({ error: "Select at least one service: Website, Backend & Lead Gen, or Social Media." }), { status: 400, headers });
    }
    const hasSocial = !!serviceSocial;
    const hasWebsite = !!serviceWebsite;
    const hasBackend = !!serviceBackend;
    const custValue = parseFloat(avgCustomerValue) || 0;
    const budget = parseFloat(budgetBeforeResults) || 0;
    const mktSpend = parseFloat(currentMarketingSpend) || 0;
    let defaultMinTerm = 60;
    if (hasWebsite && !hasBackend && !hasSocial) defaultMinTerm = 30;
    else if (hasWebsite && hasBackend && !hasSocial) defaultMinTerm = 45;
    else if (hasSocial) defaultMinTerm = 60;
    const aiOffer = await generateGrandSlamOffer({
      businessName,
      contactName,
      city,
      businessType,
      hasWebsite,
      hasBackend,
      hasSocial,
      custValue,
      budget,
      mktSpend,
      painPoint,
      desiredOutcome,
      triedBefore,
      socialGoal,
      meetingCadence,
      meetingDay,
      discoveryNotes,
      websitePages,
      websiteXmlSitemap,
      websiteMinImages,
      websiteMinVideos,
      websiteLeadCapture,
      socialSamePostsPerWeek,
      socialDiffPostsPerWeek,
      socialPlatforms,
      currentWebsiteTraffic,
      currentLeadsPerMonth,
      currentInstagramFollowers,
      currentFacebookFollowers,
      currentTiktokFollowers,
      currentGoogleReviews,
      defaultMinTerm,
      budget
    }, env.ANTHROPIC_API_KEY);
    let setupFee = setupFeeOverride ? parseInt(setupFeeOverride) : aiOffer.setupFee;
    let introMonthly = introMonthlyOverride ? parseInt(introMonthlyOverride) : aiOffer.introMonthly;
    let standardMonthly = standardMonthlyOverride ? parseInt(standardMonthlyOverride) : aiOffer.standardMonthly;
    let minimumTermDays = minimumTermOverride ? parseInt(minimumTermOverride) : aiOffer.minimumTermDays || defaultMinTerm;
    let setupPayment = setupPaymentStructure || aiOffer.setupPaymentStructure || "half_upfront";
    if (setupFee < MIN_SETUP) setupFee = MIN_SETUP;
    const minMonthly = hasSocial ? MIN_MONTHLY_WITH_SOCIAL : MIN_MONTHLY_NO_SOCIAL;
    if (introMonthly < minMonthly) introMonthly = minMonthly;
    if (standardMonthly <= introMonthly) standardMonthly = Math.max(introMonthly * 3, minMonthly * 3);
    if (minimumTermDays < 30) minimumTermDays = 30;
    if (minimumTermDays > 90) minimumTermDays = 90;
    let guaranteeMetrics = (aiOffer.guaranteeMetrics || []).filter((m) => {
      const lower = (m.metric || "").toLowerCase();
      return !FORBIDDEN_METRICS.some((f) => lower.includes(f));
    });
    if (!hasWebsite && !hasBackend) {
      guaranteeMetrics = guaranteeMetrics.filter((m) => {
        const lower = (m.metric || "").toLowerCase();
        return !lower.includes("website") && !lower.includes("form submission") && !lower.includes("lead");
      });
    }
    if (!hasSocial) {
      guaranteeMetrics = guaranteeMetrics.filter((m) => {
        const lower = (m.metric || "").toLowerCase();
        return !lower.includes("instagram") && !lower.includes("facebook") && !lower.includes("tiktok") && !lower.includes("engagement") && !lower.includes("follower");
      });
    }
    const meetingDesc = buildMeetingDescription(meetingCadence, meetingDay);
    const roi = custValue > 0 ? {
      avgCustomerValue: custValue,
      introMonthly,
      breakEvenLeads: Math.ceil(introMonthly / custValue),
      headline: custValue >= introMonthly ? `One new customer covers ${Math.floor(custValue / introMonthly)} month${Math.floor(custValue / introMonthly) !== 1 ? "s" : ""} of your intro rate.` : `${Math.ceil(introMonthly / custValue)} new customers per month covers your full investment.`
    } : null;
    const effectiveDate = /* @__PURE__ */ new Date();
    const termEnd = new Date(effectiveDate);
    termEnd.setDate(termEnd.getDate() + minimumTermDays);
    const firstBillingMonday = new Date(effectiveDate);
    const dow = firstBillingMonday.getDay();
    const daysUntilMonday = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
    firstBillingMonday.setDate(firstBillingMonday.getDate() + daysUntilMonday);
    const webScope = {
      pages: parseInt(websitePages) || 5,
      xmlSitemap: websiteXmlSitemap !== false && websiteXmlSitemap !== "false",
      minImages: parseInt(websiteMinImages) || 3,
      minVideos: parseInt(websiteMinVideos) || 1,
      leadCapture: websiteLeadCapture || "contact_form"
    };
    const socScope = {
      samePostsPerWeek: parseInt(socialSamePostsPerWeek) || 3,
      diffPostsPerWeek: parseInt(socialDiffPostsPerWeek) || 1,
      platforms: socialPlatforms || (hasSocial ? "Instagram, Facebook, TikTok" : "")
    };
    return new Response(JSON.stringify({
      success: true,
      proposal: {
        businessName,
        contactName,
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
        businessAddress: businessAddress || "",
        city,
        businessType,
        serviceWebsite: hasWebsite,
        serviceBackend: hasBackend,
        serviceSocial: hasSocial,
        offerName: aiOffer.offerName || `${businessName} Growth System`,
        offerTagline: aiOffer.offerTagline || "",
        services: aiOffer.services || [],
        setupFee,
        introMonthly,
        standardMonthly,
        minimumTermDays,
        setupPaymentStructure: setupPayment,
        minimumTermEndDate: termEnd.toISOString(),
        firstBillingMonday: firstBillingMonday.toISOString(),
        guaranteeMetrics,
        painPoints: aiOffer.painPoints || [],
        sellingTips: aiOffer.sellingTips || [],
        nextSteps: aiOffer.nextSteps || [],
        timeline: aiOffer.timeline || [],
        valueStack: aiOffer.valueStack || "",
        roi,
        webScope,
        socScope,
        meetingCadence: meetingCadence || "monthly_email",
        meetingDay: meetingDay || "",
        meetingDescription: meetingDesc,
        outOfScopeRate: OUT_OF_SCOPE_RATE,
        effectiveDate: effectiveDate.toISOString(),
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }), { headers });
  } catch (err) {
    console.error("Proposal error:", err.message);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 500, headers });
  }
}
__name(onRequestPost5, "onRequestPost");
function buildMeetingDescription(cadence, day) {
  const dayStr = day ? ` on ${day}s` : "";
  switch (cadence) {
    case "weekly":
      return `MTM and the Client shall meet once per week${dayStr}, for a maximum of one (1) hour, to review performance, discuss upcoming deliverables, and address change requests. This meeting is the designated channel for change requests and content direction. MTM shall complete approved change requests within seven (7) business days.`;
    case "biweekly":
      return `MTM and the Client shall meet once every two (2) weeks${dayStr}, for a maximum of thirty (30) minutes, to review performance and address change requests. Between meetings, the Client may submit requests via email. MTM shall address email requests within seven (7) business days.`;
    case "monthly_email":
    default:
      return `MTM shall deliver a written monthly performance report to the Client via email by the fifth (5th) business day following the close of each billing cycle. The Client may submit change requests via email at any time. MTM shall address email requests within seven (7) business days.`;
  }
}
__name(buildMeetingDescription, "buildMeetingDescription");
async function generateGrandSlamOffer(data, apiKey) {
  if (!apiKey) return buildFallbackOffer(data);
  const {
    businessName,
    contactName,
    city,
    businessType,
    hasWebsite,
    hasBackend,
    hasSocial,
    custValue,
    budget,
    mktSpend,
    painPoint,
    desiredOutcome,
    triedBefore,
    socialGoal,
    meetingCadence,
    meetingDay,
    discoveryNotes,
    websitePages,
    websiteMinImages,
    websiteMinVideos,
    websiteLeadCapture,
    socialSamePostsPerWeek,
    socialDiffPostsPerWeek,
    currentWebsiteTraffic,
    currentLeadsPerMonth,
    currentInstagramFollowers,
    currentFacebookFollowers,
    currentTiktokFollowers,
    currentGoogleReviews,
    defaultMinTerm,
    budget: budgetCeiling
  } = data;
  const selectedServices = [];
  if (hasWebsite) selectedServices.push("Website Design");
  if (hasBackend) selectedServices.push("Backend & Lead Generation (GoHighLevel CRM)");
  if (hasSocial) selectedServices.push("Social Media Management (filming, editing, posting)");
  const prompt = `You are a sales strategist for More Than Momentum (MTM). You use Alex Hormozi's Grand Slam Offer framework.

VALUE EQUATION: Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort & Sacrifice)

MTM PRICING PLAYBOOK:
- Two tracks: Build & Hand Off (one-time) or Ongoing Partnership (monthly)
- Reference packages: Launch Site ($1,000), Launch System ($1,500), Stay Current ($500/mo), Content Partner ($1,500/mo), Full Momentum ($3,000+$2,500/mo)
- These are REFERENCE POINTS. Build a CUSTOM offer using the Grand Slam framework.
- Intro rate / standard rate model: client pays less until benchmarks hit
- Make the offer so good they feel stupid saying no

SELECTED SERVICES: ${selectedServices.join(" + ")}
${hasWebsite && !hasBackend && !hasSocial ? "CLIENT ONLY WANTS WEBSITE \u2014 no recurring metrics to track on backend/social. Offer structure should be: reduced setup upfront, remaining on completion, then small monthly for updates/maintenance. Performance benchmarks limited to website traffic and form submissions only." : ""}
${!hasSocial ? "NO SOCIAL MEDIA \u2014 do not include any social metrics in guarantees." : ""}
${hasSocial ? "SOCIAL MEDIA INCLUDED \u2014 minimum monthly is $2,500 due to manual filming/editing labor." : ""}

PROSPECT:
- Business: ${businessName} (${businessType}) in ${city}
- Contact: ${contactName}
- Customer value: ${custValue > 0 ? "$" + custValue : "Unknown"}
- Budget before results: ${budget > 0 ? "$" + budget : "Unknown"}
- Current marketing spend: ${mktSpend > 0 ? "$" + mktSpend + "/mo" : "Unknown"}
- Pain: ${painPoint || "Not specified"}
- Desired outcome: ${desiredOutcome || "Not specified"}
- Tried before: ${triedBefore || "Unknown"}
${hasSocial ? "- Social goal: " + (socialGoal || "Not specified") : ""}
- Meeting: ${meetingCadence || "monthly_email"}${meetingDay ? " on " + meetingDay + "s" : ""}
${discoveryNotes ? "- Notes: " + discoveryNotes : ""}

CURRENT METRICS (use these as baselines in benchmarks):
${hasWebsite || hasBackend ? "- Website traffic: " + (currentWebsiteTraffic || "Unknown") + " visitors/month" : ""}
${hasBackend ? "- Leads per month: " + (currentLeadsPerMonth || "Unknown") : ""}
${hasSocial ? "- Instagram: " + (currentInstagramFollowers || "Unknown") + " followers" : ""}
${hasSocial ? "- Facebook: " + (currentFacebookFollowers || "Unknown") + " followers" : ""}
${hasSocial ? "- TikTok: " + (currentTiktokFollowers || "Unknown") + " followers" : ""}
- Google reviews: ${currentGoogleReviews || "Unknown"}

WEBSITE SCOPE (if website selected): ${websitePages || 5} pages, min ${websiteMinImages || 3} images, min ${websiteMinVideos || 1} video, lead capture: ${websiteLeadCapture || "contact form"}
SOCIAL SCOPE (if social selected): ${socialSamePostsPerWeek || 3} same posts/week cross-posted, ${socialDiffPostsPerWeek || 1} unique posts/week

PRICING RULES:
1. Min setup: $${MIN_SETUP}. Min monthly: $${hasSocial ? MIN_MONTHLY_WITH_SOCIAL : MIN_MONTHLY_NO_SOCIAL}
2. If budget provided ($${budget || 0}), try to keep total upfront cost at or below that
3. Standard monthly = 3-5x intro rate
4. Setup payment: recommend half upfront + half on completion for website-only, or full upfront for ongoing partnerships. But choose what makes the offer irresistible.
5. Default minimum term: ${defaultMinTerm} days

GUARANTEE RULES:
- ONLY metrics from this list: ${ALLOWED_METRICS.join(", ")}
- NEVER guarantee: sales, revenue, profit, close rate, conversions, bookings, appointments, ROI
- Use EXACT baseline numbers from current metrics above. If unknown, write "TBD at first month close"
- Targets must be specific numbers (not just percentages): e.g. "from 500 to 750 visitors/month (+50%)"
- Only include metrics relevant to selected services
- 2-4 metrics maximum

Return ONLY valid JSON:
{
  "offerName": "Compelling name",
  "offerTagline": "One sentence \u2014 irresistible",
  "services": [
    { "id": "service_id", "name": "Service", "desc": "2-3 sentences specific to their business \u2014 be VERY specific about deliverables, no vague promises", "valueHighlight": "Dollar/outcome value" }
  ],
  "setupFee": 1000,
  "introMonthly": 200,
  "standardMonthly": 1000,
  "minimumTermDays": ${defaultMinTerm},
  "setupPaymentStructure": "half_upfront|full_upfront",
  "guaranteeMetrics": [
    { "metric": "Metric Name", "baseline": "Current number or TBD", "target": "Exact target number with percentage", "source": "Data source" }
  ],
  "painPoints": ["4-5 specific, quantified pain points"],
  "sellingTips": ["4-5 internal sales tips"],
  "valueStack": "2-3 sentences showing total value vs price",
  "nextSteps": ["3-4 steps, first is signing"],
  "timeline": [{ "phase": "Phase", "days": "Days X-Y", "desc": "What happens" }]
}

CRITICAL: Valid JSON only. No markdown. No backticks.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2500, messages: [{ role: "user", content: prompt }] })
    });
    const result = await resp.json();
    const text2 = result.content?.[0]?.text || "{}";
    return JSON.parse(text2.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim());
  } catch (err) {
    console.error("Claude offer error:", err.message);
    return buildFallbackOffer(data);
  }
}
__name(generateGrandSlamOffer, "generateGrandSlamOffer");
function buildFallbackOffer(data) {
  const services = [];
  if (data.hasWebsite) services.push({ id: "website", name: "Website Design & Development", desc: "Custom-built, mobile-first website with specified page count, images, and lead capture integration.", valueHighlight: "Your digital storefront" });
  if (data.hasBackend) services.push({ id: "crm", name: "GoHighLevel CRM & Lead Automation", desc: "Configured sales pipeline, automated lead capture, and follow-up sequences via email and SMS.", valueHighlight: "Automated lead management" });
  if (data.hasSocial) services.push({ id: "social", name: "Social Media Management", desc: "Content filming, editing, and posting across specified platforms at agreed-upon frequency.", valueHighlight: "Professional content engine" });
  return {
    offerName: `${data.businessName} Growth System`,
    offerTagline: "Your digital infrastructure \u2014 built, managed, and performance-guaranteed.",
    services,
    setupFee: MIN_SETUP,
    introMonthly: data.hasSocial ? MIN_MONTHLY_WITH_SOCIAL : MIN_MONTHLY_NO_SOCIAL,
    standardMonthly: data.hasSocial ? 2500 : 1e3,
    minimumTermDays: data.defaultMinTerm || 60,
    setupPaymentStructure: data.hasWebsite && !data.hasBackend && !data.hasSocial ? "half_upfront" : "full_upfront",
    guaranteeMetrics: [],
    painPoints: ["Every day without a system is leads walking to competitors."],
    sellingTips: ["AI unavailable \u2014 use handbook talking points."],
    valueStack: "Combined market value of these services exceeds the standard rate.",
    nextSteps: ["Sign the agreement.", "Complete brand questionnaire.", "We start within 48 hours."],
    timeline: [
      { phase: "Discovery & Strategy", days: "Days 1-2", desc: "Questionnaire, audit, planning." },
      { phase: "Build", days: "Days 3-14", desc: "Design, development, configuration." },
      { phase: "Launch", days: "Day 21", desc: "Go live, walkthrough, handoff." }
    ]
  };
}
__name(buildFallbackOffer, "buildFallbackOffer");
async function onRequestOptions6() {
  return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
  });
}
__name(onRequestOptions6, "onRequestOptions");

// api/prospect.js
async function onRequestPost6(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  try {
    const body = await request.json();
    const { businessName, city, websiteUrl } = body;
    if (!businessName || !city) {
      return new Response(
        JSON.stringify({ error: "Business name and city are required." }),
        { status: 400, headers }
      );
    }
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured. Add ANTHROPIC_API_KEY to environment variables." }),
        { status: 500, headers }
      );
    }
    const userMessage = websiteUrl ? `Research this prospect business for an MTM discovery brief:

Business: "${businessName}"
Location: "${city}"
Website: ${websiteUrl}

Search thoroughly and return the JSON brief.` : `Research this prospect business for an MTM discovery brief:

Business: "${businessName}"
Location: "${city}"

Find their website if one exists. Search thoroughly and return the JSON brief.`;
    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4e3,
        system: `You are a digital marketing analyst for More Than Momentum (MTM), an AI-native digital growth agency serving small and mid-size local businesses \u2014 primarily trades and local service providers.

MTM's three packages:
- Starter ($800 setup + $1,200/month): AI content calendar, 2-platform social management, 8 posts/month, basic automation
- Growth Engine ($2,500 setup + $1,500/month): Everything in Starter + video production, advanced automation, 4 platforms, lead scoring
- Full System ($3,500 setup + $2,500/month): Everything in Growth Engine + custom AI agents, website build/redesign, paid ads management

Your job: Research the prospect business using web search and return a structured intelligence brief for MTM's sales team to use on a discovery call.

Search for:
1. Their website \u2014 platform (Wix/WordPress/Squarespace/Shopify/Custom/None), quality, mobile-friendliness, lead capture
2. Social media \u2014 Instagram, Facebook, TikTok, LinkedIn (Active = posted in last 30 days, Inactive = account exists but dormant, None = no account found)
3. Google Business Profile \u2014 review count and rating
4. Any obvious digital gaps or problems

CRITICAL: Your ENTIRE response must be a single valid JSON object. Start with { and end with }. No text before or after. No markdown. No backticks. No explanation. Just the raw JSON:

{
  "businessName": "exact name as found",
  "city": "city, state",
  "profile": {
    "websitePlatform": "Wix|WordPress|Squarespace|Shopify|Custom|None|Unknown",
    "websiteQuality": "Poor|Average|Good|None",
    "websiteNotes": "1-2 specific sentences describing exactly what you found about their site",
    "socialMedia": {
      "instagram": "Active|Inactive|None",
      "facebook": "Active|Inactive|None",
      "tiktok": "Active|Inactive|None",
      "linkedin": "Active|Inactive|None"
    },
    "googleReviews": "e.g. 47 reviews \xB7 4.8 stars  \u2014 or  Not Found",
    "overallGrade": "A|B|C|D|F",
    "gradeSummary": "One direct sentence explaining the grade based on what you found"
  },
  "gapAnalysis": [
    "Specific gap 1 \u2014 be concrete, e.g. No lead capture on website",
    "Specific gap 2",
    "Specific gap 3"
  ],
  "discoveryQuestions": [
    "Question tailored to their specific situation, e.g. What happens when someone calls and you miss it?",
    "Question 2",
    "Question 3",
    "Question 4"
  ],
  "talkingPoints": [
    "MTM talking point tied directly to a gap you found, e.g. Your competitor down the street has 180 Google reviews \u2014 here's how we close that gap fast.",
    "Talking point 2",
    "Talking point 3"
  ],
  "recommendedPackage": {
    "name": "Starter|Growth Engine|Full System",
    "rationale": "2-3 sentences explaining why this specific package fits based on what you found about this business"
  },
  "recommendedApproach": {
    "track": "Starter|Growth Engine|Full System",
    "scope": "One sentence describing what MTM would build",
    "rationale": "2-3 sentences explaining why based on what you found"
  }
}`,
        messages: [
          { role: "user", content: userMessage }
        ],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ]
      })
    });
    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error("Anthropic API error:", apiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `API error ${apiResponse.status} \u2014 check your ANTHROPIC_API_KEY in Cloudflare env vars.` }),
        { status: 500, headers }
      );
    }
    const apiData = await apiResponse.json();
    const textContent = apiData.content.filter((block) => block.type === "text").map((block) => block.text).join("");
    if (!textContent) {
      return new Response(
        JSON.stringify({ error: "No research results returned. Try again." }),
        { status: 500, headers }
      );
    }
    let brief;
    try {
      const raw = textContent.trim();
      let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      try {
        brief = JSON.parse(cleaned);
      } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          try {
            brief = JSON.parse(cleaned.slice(start, end + 1));
          } catch {
            const partial = cleaned.slice(start, end + 1);
            for (let extra = 1; extra <= 3; extra++) {
              try {
                brief = JSON.parse(partial + "}".repeat(extra));
                break;
              } catch {
              }
            }
          }
        }
        if (!brief) throw new Error("Could not extract JSON from response");
      }
    } catch (parseErr) {
      console.error("JSON parse error. Raw:", textContent.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Could not parse research results. Raw: " + textContent.slice(0, 300) }),
        { status: 500, headers }
      );
    }
    return new Response(JSON.stringify({ success: true, brief }), { headers });
  } catch (err) {
    console.error("Prospect function error:", err.message);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers }
    );
  }
}
__name(onRequestPost6, "onRequestPost");
async function onRequestOptions7() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions7, "onRequestOptions");

// api/report.js
var GHL_BASE = "https://services.leadconnectorhq.com";
var GA4_BASE = "https://analyticsdata.googleapis.com/v1beta";
async function onRequestPost7(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  try {
    const body = await request.json();
    const { clientId, month, year } = body;
    if (!clientId || !month || !year) {
      return new Response(
        JSON.stringify({ error: "clientId, month, and year are required." }),
        { status: 400, headers }
      );
    }
    const profile = await resolveClientProfile(clientId.toLowerCase(), env);
    if (!profile) {
      return new Response(
        JSON.stringify({ error: `Client "${clientId}" not found. Add to MTM_CLIENT_PROFILES KV or set env vars.` }),
        { status: 404, headers }
      );
    }
    const { startDate, endDate, monthLabel } = getDateRange(parseInt(month), parseInt(year));
    const [ghlResult, ga4Result] = await Promise.allSettled([
      fetchGHLData(profile, startDate, endDate),
      fetchGA4Data(profile.ga4PropertyId, startDate, endDate, env.GOOGLE_SERVICE_ACCOUNT)
    ]);
    const ghl = ghlResult.status === "fulfilled" ? ghlResult.value : { error: ghlResult.reason?.message || "GHL data unavailable" };
    const ga4 = ga4Result.status === "fulfilled" ? ga4Result.value : { error: ga4Result.reason?.message || "GA4 data unavailable" };
    const takeaways = await generateTakeaways(
      { ghl, ga4, clientName: profile.businessName, monthLabel },
      env.ANTHROPIC_API_KEY
    );
    return new Response(JSON.stringify({
      success: true,
      report: {
        client: {
          id: clientId,
          name: profile.businessName,
          industry: profile.industry || "Unknown"
        },
        period: {
          month: parseInt(month),
          year: parseInt(year),
          label: monthLabel,
          startDate,
          endDate
        },
        ghl,
        ga4,
        takeaways,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }), { headers });
  } catch (err) {
    console.error("Report function error:", err.message);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers }
    );
  }
}
__name(onRequestPost7, "onRequestPost");
async function resolveClientProfile(clientId, env) {
  try {
    if (env.MTM_CLIENT_PROFILES) {
      const raw = await env.MTM_CLIENT_PROFILES.get(`client:${clientId}`);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("KV profile read failed:", e.message);
  }
  const key = clientId.toUpperCase().replace(/-/g, "_");
  const ghlApiKey = env[`GHL_API_KEY_${key}`];
  const ghlLocationId = env[`GHL_LOCATION_ID_${key}`];
  const ga4PropertyId = env[`GA4_PROPERTY_${key}`] || null;
  if (!ghlApiKey || !ghlLocationId) return null;
  const nameMap = { SNH: "SNH Golf Carts" };
  return {
    id: clientId,
    businessName: nameMap[key] || clientId,
    industry: "Unknown",
    ghlApiKey,
    ghlLocationId,
    ga4PropertyId
  };
}
__name(resolveClientProfile, "resolveClientProfile");
function getDateRange(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const fmt = /* @__PURE__ */ __name((d) => d.toISOString().split("T")[0], "fmt");
  const monthLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { startDate: fmt(start), endDate: fmt(end), monthLabel };
}
__name(getDateRange, "getDateRange");
async function fetchGHLData(profile, startDate, endDate) {
  const { ghlApiKey, ghlLocationId } = profile;
  const ghlHeaders = {
    "Authorization": `Bearer ${ghlApiKey}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json"
  };
  const [contactsResp, oppsResp] = await Promise.all([
    fetch(
      `${GHL_BASE}/contacts/?locationId=${ghlLocationId}&limit=100&startDate=${startDate}&endDate=${endDate}`,
      { headers: ghlHeaders }
    ),
    fetch(
      `${GHL_BASE}/opportunities/search?location_id=${ghlLocationId}&limit=100`,
      { headers: ghlHeaders }
    )
  ]);
  const [contactsData, oppsData] = await Promise.all([
    contactsResp.json(),
    oppsResp.json()
  ]);
  const contacts = contactsData.contacts || [];
  const totalLeads = contacts.length;
  const sourceCounts = {};
  contacts.forEach((c) => {
    const source = c.source || c.attributionSource?.medium || c.attributionSource?.utmSource || "Direct / Unknown";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  const leadSources = Object.entries(sourceCounts).sort(([, a], [, b]) => b - a).map(([source, count]) => ({
    source,
    count,
    percentage: totalLeads > 0 ? Math.round(count / totalLeads * 100) : 0
  }));
  const topSource = leadSources[0]?.source || "Unknown";
  const allOpps = oppsData.opportunities || [];
  const inRange = /* @__PURE__ */ __name((opp) => {
    const d = new Date(opp.createdAt || opp.dateAdded);
    return d >= new Date(startDate) && d <= /* @__PURE__ */ new Date(endDate + "T23:59:59Z");
  }, "inRange");
  const wonDeals = allOpps.filter((o) => o.status === "won" && inRange(o));
  const lostDeals = allOpps.filter((o) => o.status === "lost" && inRange(o));
  const openDeals = allOpps.filter((o) => o.status === "open");
  const wonRevenue = wonDeals.reduce((s, o) => s + (parseFloat(o.monetaryValue) || 0), 0);
  const openPipelineValue = openDeals.reduce((s, o) => s + (parseFloat(o.monetaryValue) || 0), 0);
  const stageMap = {};
  openDeals.forEach((o) => {
    const stage = o.pipelineStage?.name || o.stage?.name || "Unknown";
    stageMap[stage] = (stageMap[stage] || 0) + 1;
  });
  return {
    totalLeads,
    leadSources,
    topSource,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    openDeals: openDeals.length,
    wonRevenue: parseFloat(wonRevenue.toFixed(2)),
    openPipelineValue: parseFloat(openPipelineValue.toFixed(2)),
    wonDealsList: wonDeals.slice(0, 10).map((o) => ({
      name: o.contact?.name || o.name || "Unknown",
      value: parseFloat(o.monetaryValue) || 0,
      source: o.contact?.source || "Unknown",
      closedAt: o.lastStatusChangeAt || o.updatedAt || null
    })),
    stageBreakdown: Object.entries(stageMap).map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count)
  };
}
__name(fetchGHLData, "fetchGHLData");
async function fetchGA4Data(propertyId, startDate, endDate, serviceAccountJson) {
  if (!propertyId || !serviceAccountJson) {
    return { error: "GA4 not configured for this client" };
  }
  const accessToken = await getGoogleAccessToken(
    serviceAccountJson,
    ["https://www.googleapis.com/auth/analytics.readonly"]
  );
  const [overviewResp, channelResp] = await Promise.all([
    fetch(`${GA4_BASE}/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" }
        ]
      })
    }),
    fetch(`${GA4_BASE}/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" }
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8
      })
    })
  ]);
  const [overview, channels] = await Promise.all([
    overviewResp.json(),
    channelResp.json()
  ]);
  const metrics = { sessions: 0, users: 0, pageviews: 0, bounceRate: 0, avgSessionDurationSec: 0 };
  if (overview.rows?.[0]) {
    const v = overview.rows[0].metricValues;
    metrics.sessions = parseInt(v[0]?.value || 0);
    metrics.users = parseInt(v[1]?.value || 0);
    metrics.pageviews = parseInt(v[2]?.value || 0);
    metrics.bounceRate = parseFloat((parseFloat(v[3]?.value || 0) * 100).toFixed(1));
    metrics.avgSessionDurationSec = parseInt(parseFloat(v[4]?.value || 0));
  }
  const trafficChannels = (channels.rows || []).map((row) => ({
    channel: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value)
  }));
  return {
    ...metrics,
    trafficChannels,
    topChannel: trafficChannels[0]?.channel || "Unknown"
  };
}
__name(fetchGA4Data, "fetchGA4Data");
async function getGoogleAccessToken(serviceAccountJson, scopes) {
  const sa = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  const now = Math.floor(Date.now() / 1e3);
  const b64url = /* @__PURE__ */ __name((obj) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"), "b64url");
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  });
  const signingInput = `${header}.${payload}`;
  const pemKey = sa.private_key.replace(/\\n/g, "\n");
  const pemBody = pemKey.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${signingInput}.${sigB64}`;
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    throw new Error(`Google auth failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}
__name(getGoogleAccessToken, "getGoogleAccessToken");
async function generateTakeaways({ ghl, ga4, clientName, monthLabel }, apiKey) {
  if (!apiKey) return ["Key Takeaways unavailable \u2014 ANTHROPIC_API_KEY not configured."];
  const dataContext = JSON.stringify({ ghl, ga4 }, null, 2);
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: `You are a performance analyst for More Than Momentum (MTM), a digital growth agency.
Write 4-5 Key Takeaways for a client monthly performance report.

Rules:
- Be direct and specific \u2014 use actual numbers from the data
- Flag wins clearly: "Lead volume up 40% \u2014 Facebook is your top source this month"
- Flag risks clearly: "Bounce rate at 74% \u2014 homepage needs attention"
- Connect metrics to business outcomes where possible
- Keep each point to 1-2 sentences max
- No corporate jargon, no vague statements
- Return ONLY the bullet points as a JSON array of strings, no markdown, no intro text

Example format: ["Lead volume increased to 24 this month, up from 18 in March.", "Facebook drove 62% of all leads \u2014 strongest performing channel by far."]`,
      messages: [{
        role: "user",
        content: `Client: ${clientName}
Reporting period: ${monthLabel}

Data:
${dataContext}

Return the Key Takeaways as a JSON array of strings.`
      }]
    })
  });
  const data = await resp.json();
  const text2 = data.content?.[0]?.text || "[]";
  try {
    const cleaned = text2.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const arr = JSON.parse(cleaned);
    return Array.isArray(arr) ? arr : [text2];
  } catch {
    return text2.split("\n").filter((l) => l.trim()).map((l) => l.replace(/^[-•*]\s*/, ""));
  }
}
__name(generateTakeaways, "generateTakeaways");
async function onRequestOptions8() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions8, "onRequestOptions");

// api/report-slides.js
var SLIDES_BASE = "https://slides.googleapis.com/v1";
var DRIVE_BASE = "https://www.googleapis.com/drive/v3";
var TOKEN_URL2 = "https://oauth2.googleapis.com/token";
var C = {
  BLACK: { red: 0.047, green: 0.047, blue: 0.047 },
  // #0C0C0C
  DARK: { red: 0.067, green: 0.067, blue: 0.067 },
  // #111111
  CARD: { red: 0.102, green: 0.102, blue: 0.102 },
  // #1A1A1A
  BORDER: { red: 0.165, green: 0.165, blue: 0.165 },
  // #2A2A2A
  WHITE: { red: 0.957, green: 0.957, blue: 0.949 },
  // #F4F4F2
  BLUE: { red: 0.176, green: 0.42, blue: 0.894 },
  // #2D6BE4
  ACCENT_LIGHT: { red: 0.357, green: 0.561, blue: 0.941 },
  // #5B8FF0
  YELLOW: { red: 0.961, green: 0.773, blue: 0.094 },
  // #F5C518
  GREEN: { red: 0.29, green: 0.867, blue: 0.502 },
  // #4ADE80
  GRAY: { red: 0.533, green: 0.533, blue: 0.533 },
  // #888888
  MID: { red: 0.333, green: 0.333, blue: 0.333 }
  // #555555
};
var SW = 9144e3;
var SH = 5143500;
async function onRequestPost8(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  try {
    const body = await request.json();
    if (body._probe) {
      const configured = !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REFRESH_TOKEN);
      return new Response(JSON.stringify({ configured, setupRequired: !configured }), { headers });
    }
    const { report } = body;
    if (!report) {
      return new Response(JSON.stringify({ error: "report data is required." }), { status: 400, headers });
    }
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REFRESH_TOKEN) {
      return new Response(JSON.stringify({
        error: "Google OAuth not configured. Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN to Cloudflare environment variables.",
        setupRequired: true
      }), { status: 500, headers });
    }
    const accessToken = await getOAuthAccessToken(env);
    const presentationId = await createPresentation(report, accessToken, env.MTM_REPORTS_FOLDER_ID);
    const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;
    return new Response(JSON.stringify({ success: true, url }), { headers });
  } catch (err) {
    console.error("Slides function error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create presentation." }),
      { status: 500, headers }
    );
  }
}
__name(onRequestPost8, "onRequestPost");
async function getOAuthAccessToken(env) {
  const resp = await fetch(TOKEN_URL2, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`OAuth token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}
__name(getOAuthAccessToken, "getOAuthAccessToken");
async function createPresentation(report, token, mtmReportsFolder) {
  const ghl = report.ghl || {};
  const ga4 = report.ga4 || {};
  const title = `${report.client.name} \u2014 ${report.period.label} Performance Report`;
  const createResp = await fetch(`${SLIDES_BASE}/presentations`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });
  const presentation = await createResp.json();
  const pid = presentation.presentationId;
  if (!pid) throw new Error(`Failed to create presentation: ${JSON.stringify(presentation)}`);
  if (mtmReportsFolder) {
    await fetch(`${DRIVE_BASE}/files/${pid}?addParents=${mtmReportsFolder}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
  }
  const sourceId = presentation.slides?.[0]?.objectId;
  if (!sourceId) throw new Error("No default slide in new presentation");
  const S = {
    cover: sourceId,
    metrics: "slide_metrics",
    sources: "slide_sources",
    deals: "slide_deals",
    website: "slide_website",
    takeaways: "slide_takeaways"
  };
  await doBatchUpdate(pid, [
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.metrics } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.sources } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.deals } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.website } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.takeaways } } }
  ], token);
  await doBatchUpdate(pid, Object.values(S).map((id) => ({
    updatePageProperties: {
      objectId: id,
      pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: C.BLACK } } } },
      fields: "pageBackgroundFill"
    }
  })), token);
  const contentReqs = [
    // ══ SLIDE 1 — COVER ══════════════════════════════════════════════════════
    ...rect("cover_bar", S.cover, 0, 0, SW, px(6), C.BLUE),
    ...text(
      "cover_mtm",
      S.cover,
      "MORE THAN MOMENTUM",
      px(56),
      px(28),
      SW - px(112),
      px(30),
      { size: 11, bold: true, color: C.ACCENT_LIGHT, spacing: 2 }
    ),
    ...text(
      "cover_client",
      S.cover,
      report.client.name || "",
      px(56),
      px(68),
      SW - px(112),
      px(90),
      { size: 42, bold: true, color: C.WHITE }
    ),
    ...text(
      "cover_type",
      S.cover,
      "Monthly Performance Report",
      px(56),
      px(162),
      SW - px(112),
      px(36),
      { size: 18, bold: false, color: C.GRAY }
    ),
    ...text(
      "cover_period",
      S.cover,
      report.period.label || "",
      px(56),
      px(202),
      SW - px(300),
      px(36),
      { size: 16, bold: true, color: C.BLUE }
    ),
    ...text(
      "cover_date",
      S.cover,
      `Generated ${new Date(report.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      px(56),
      px(242),
      SW - px(112),
      px(26),
      { size: 11, color: C.MID }
    ),
    ...rect("cover_bottom", S.cover, 0, SH - px(4), SW, px(4), C.CARD),
    ...text(
      "cover_footer",
      S.cover,
      "morethanmomentum.com",
      px(56),
      SH - px(28),
      SW - px(112),
      px(20),
      { size: 9, color: C.MID }
    ),
    // ══ SLIDE 2 — PIPELINE SUMMARY ═══════════════════════════════════════════
    ...slideHeader("metrics_bar", "metrics_title", S.metrics, "Pipeline Summary"),
    ...metricCard("mc1", S.metrics, px(48), px(100), fmtCurrency(ghl.wonRevenue), "WON REVENUE", `${fmtNum(ghl.wonDeals)} deals closed`, C.GREEN),
    ...metricCard("mc2", S.metrics, px(320), px(100), fmtNum(ghl.totalLeads), "TOTAL LEADS", `Top: ${ghl.topSource || "\u2014"}`, C.ACCENT_LIGHT),
    ...metricCard("mc3", S.metrics, px(592), px(100), fmtCurrency(ghl.openPipelineValue), "OPEN PIPELINE", `${fmtNum(ghl.openDeals)} opportunities`, C.WHITE),
    ...metricCard("mc4", S.metrics, px(864), px(100), fmtNum(ghl.lostDeals), "LOST DEALS", "This period", C.GRAY),
    // ══ SLIDE 3 — LEAD SOURCES ═══════════════════════════════════════════════
    ...slideHeader("sources_bar", "sources_title", S.sources, "Lead Sources"),
    ...buildSourcesSlide(S.sources, ghl.leadSources || []),
    // ══ SLIDE 4 — WON DEALS ══════════════════════════════════════════════════
    ...slideHeader("deals_bar", "deals_title", S.deals, "Won Deals"),
    ...buildDealsSlide(S.deals, ghl.wonDealsList || [], ghl.wonRevenue),
    // ══ SLIDE 5 — WEBSITE PERFORMANCE ════════════════════════════════════════
    ...slideHeader("website_bar", "website_title", S.website, "Website \u2014 Google Analytics"),
    ...buildGA4Slide(S.website, ga4),
    // ══ SLIDE 6 — KEY TAKEAWAYS ══════════════════════════════════════════════
    ...slideHeader("takeaways_bar", "takeaways_title", S.takeaways, "Key Takeaways"),
    ...buildTakeawaysSlide(S.takeaways, report.takeaways || [])
  ];
  await doBatchUpdate(pid, contentReqs, token);
  await fetch(`${DRIVE_BASE}/files/${pid}/permissions?sendNotificationEmail=false`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" })
  });
  return pid;
}
__name(createPresentation, "createPresentation");
async function doBatchUpdate(pid, requests, token) {
  if (!requests.length) return;
  const resp = await fetch(`${SLIDES_BASE}/presentations/${pid}:batchUpdate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests })
  });
  const data = await resp.json();
  if (data.error) throw new Error(`batchUpdate failed: ${JSON.stringify(data.error)}`);
  return data;
}
__name(doBatchUpdate, "doBatchUpdate");
function buildSourcesSlide(slideId, sources) {
  if (!sources || sources.length === 0) {
    return text(
      "no_sources",
      slideId,
      "No lead source data available for this period.",
      px(56),
      px(110),
      SW - px(112),
      px(40),
      { size: 14, color: C.GRAY, italic: true }
    );
  }
  const reqs = [];
  const maxSources = Math.min(sources.length, 6);
  const rowH = px(52);
  const startY = px(94);
  const barMaxW = SW - px(400);
  sources.slice(0, maxSources).forEach((s, i) => {
    const y = startY + i * rowH;
    const barW = Math.max(px(4), Math.round(barMaxW * (s.percentage / 100)));
    const id = `src_${i}`;
    reqs.push(...text(
      `${id}_name`,
      slideId,
      s.source,
      px(56),
      y + px(6),
      px(200),
      px(36),
      { size: 13, color: C.WHITE }
    ));
    reqs.push(...rect(`${id}_bg`, slideId, px(270), y + px(16), barMaxW, px(8), C.CARD));
    reqs.push(...rect(`${id}_bar`, slideId, px(270), y + px(16), barW, px(8), C.BLUE));
    reqs.push(...text(
      `${id}_pct`,
      slideId,
      `${s.percentage}%`,
      SW - px(110),
      y + px(6),
      px(54),
      px(36),
      { size: 13, bold: true, color: C.BLUE, align: "END" }
    ));
    reqs.push(...text(
      `${id}_cnt`,
      slideId,
      `${s.count}`,
      SW - px(56),
      y + px(6),
      px(40),
      px(36),
      { size: 12, color: C.GRAY, align: "END" }
    ));
  });
  return reqs;
}
__name(buildSourcesSlide, "buildSourcesSlide");
function buildDealsSlide(slideId, deals, totalRevenue) {
  const reqs = [];
  if (!deals || deals.length === 0) {
    return text(
      "no_deals",
      slideId,
      "No won deals recorded this period.",
      px(56),
      px(110),
      SW - px(112),
      px(40),
      { size: 14, color: C.GRAY, italic: true }
    );
  }
  reqs.push(...rect("deals_total_bg", slideId, px(48), px(92), px(280), px(60), C.CARD));
  reqs.push(...text(
    "deals_total_label",
    slideId,
    "TOTAL REVENUE",
    px(60),
    px(100),
    px(256),
    px(22),
    { size: 9, color: C.GRAY, bold: true }
  ));
  reqs.push(...text(
    "deals_total_val",
    slideId,
    fmtCurrency(totalRevenue),
    px(60),
    px(124),
    px(256),
    px(36),
    { size: 22, bold: true, color: C.GREEN }
  ));
  const maxDeals = Math.min(deals.length, 5);
  const startY = px(168);
  const rowH = px(52);
  deals.slice(0, maxDeals).forEach((d, i) => {
    const y = startY + i * rowH;
    const id = `deal_${i}`;
    reqs.push(...rect(`${id}_bg`, slideId, px(48), y, SW - px(96), px(44), i % 2 === 0 ? C.CARD : C.BLACK));
    reqs.push(...text(
      `${id}_name`,
      slideId,
      d.name || "Unknown",
      px(60),
      y + px(8),
      SW - px(340),
      px(30),
      { size: 13, color: C.WHITE }
    ));
    reqs.push(...text(
      `${id}_src`,
      slideId,
      d.source || "\u2014",
      SW - px(270),
      y + px(8),
      px(180),
      px(30),
      { size: 11, color: C.GRAY }
    ));
    reqs.push(...text(
      `${id}_val`,
      slideId,
      fmtCurrency(d.value),
      SW - px(80),
      y + px(8),
      px(68),
      px(30),
      { size: 13, bold: true, color: C.GREEN, align: "END" }
    ));
  });
  if (deals.length > 5) {
    const moreY = startY + 5 * rowH + px(8);
    reqs.push(...text(
      "deals_more",
      slideId,
      `+ ${deals.length - 5} more deals`,
      px(60),
      moreY,
      px(200),
      px(24),
      { size: 11, color: C.GRAY, italic: true }
    ));
  }
  return reqs;
}
__name(buildDealsSlide, "buildDealsSlide");
function buildGA4Slide(slideId, ga4) {
  if (ga4.error) {
    return text(
      "ga4_err",
      slideId,
      ga4.error,
      px(56),
      px(110),
      SW - px(112),
      px(40),
      { size: 14, color: C.GRAY, italic: true }
    );
  }
  const reqs = [];
  const stats = [
    { label: "SESSIONS", value: fmtNum(ga4.sessions) },
    { label: "USERS", value: fmtNum(ga4.users) },
    { label: "BOUNCE RATE", value: ga4.bounceRate != null ? `${ga4.bounceRate}%` : "\u2014" },
    { label: "AVG SESSION", value: fmtDuration(ga4.avgSessionDurationSec) }
  ];
  const boxW = Math.floor((SW - px(96) - px(36)) / 4);
  stats.forEach((s, i) => {
    const x = px(48) + i * (boxW + px(12));
    const id = `ga4_stat_${i}`;
    reqs.push(...rect(`${id}_bg`, slideId, x, px(92), boxW, px(90), C.CARD));
    reqs.push(...text(
      `${id}_label`,
      slideId,
      s.label,
      x + px(14),
      px(100),
      boxW - px(20),
      px(22),
      { size: 8, bold: true, color: C.GRAY }
    ));
    reqs.push(...text(
      `${id}_val`,
      slideId,
      s.value,
      x + px(14),
      px(122),
      boxW - px(20),
      px(44),
      { size: 26, bold: true, color: C.WHITE }
    ));
  });
  const channels = ga4.trafficChannels || [];
  if (channels.length > 0) {
    reqs.push(...text(
      "ga4_ch_label",
      slideId,
      "TRAFFIC CHANNELS",
      px(48),
      px(200),
      SW - px(96),
      px(22),
      { size: 8, bold: true, color: C.GRAY }
    ));
    const maxCh = Math.min(channels.length, 5);
    const chBarMax = SW - px(380);
    channels.slice(0, maxCh).forEach((ch, i) => {
      const y = px(228) + i * px(46);
      const pct = ga4.sessions > 0 ? Math.round(ch.sessions / ga4.sessions * 100) : 0;
      const barW = Math.max(px(4), Math.round(chBarMax * (pct / 100)));
      const id = `ch_${i}`;
      reqs.push(...text(
        `${id}_name`,
        slideId,
        ch.channel,
        px(48),
        y + px(4),
        px(200),
        px(32),
        { size: 12, color: C.WHITE }
      ));
      reqs.push(...rect(`${id}_bg`, slideId, px(262), y + px(12), chBarMax, px(8), C.CARD));
      reqs.push(...rect(`${id}_bar`, slideId, px(262), y + px(12), barW, px(8), C.ACCENT_LIGHT));
      reqs.push(...text(
        `${id}_cnt`,
        slideId,
        `${fmtNum(ch.sessions)} sessions`,
        SW - px(48),
        y + px(4),
        px(160),
        px(32),
        { size: 11, color: C.GRAY, align: "END" }
      ));
    });
  }
  return reqs;
}
__name(buildGA4Slide, "buildGA4Slide");
function buildTakeawaysSlide(slideId, takeaways) {
  if (!takeaways || takeaways.length === 0) {
    return text(
      "no_takeaways",
      slideId,
      "No takeaways generated.",
      px(56),
      px(110),
      SW - px(112),
      px(40),
      { size: 14, color: C.GRAY, italic: true }
    );
  }
  const reqs = [];
  const maxT = Math.min(takeaways.length, 5);
  const startY = px(94);
  const rowH = px(72);
  takeaways.slice(0, maxT).forEach((t, i) => {
    const y = startY + i * rowH;
    const id = `t_${i}`;
    reqs.push(...text(
      `${id}_arrow`,
      slideId,
      "\u2192",
      px(56),
      y + px(4),
      px(30),
      px(36),
      { size: 14, bold: true, color: C.BLUE }
    ));
    reqs.push(...text(
      `${id}_text`,
      slideId,
      t,
      px(96),
      y + px(4),
      SW - px(152),
      px(60),
      { size: 13, color: C.WHITE }
    ));
    if (i < maxT - 1) {
      reqs.push(...rect(`${id}_divider`, slideId, px(56), y + px(66), SW - px(112), px(1), C.BORDER));
    }
  });
  return reqs;
}
__name(buildTakeawaysSlide, "buildTakeawaysSlide");
function slideHeader(barId, titleId, slideId, title) {
  return [
    ...rect(barId, slideId, 0, 0, SW, px(5), C.BLUE),
    ...text(
      titleId,
      slideId,
      title,
      px(48),
      px(18),
      SW - px(96),
      px(48),
      { size: 22, bold: true, color: C.WHITE }
    ),
    ...rect(`${barId}_rule`, slideId, px(48), px(74), SW - px(96), px(1), C.BORDER)
  ];
}
__name(slideHeader, "slideHeader");
function metricCard(id, slideId, x, y, value, label, sub, valueColor) {
  const cardW = px(248);
  const cardH = px(240);
  return [
    ...rect(`${id}_bg`, slideId, x, y, cardW, cardH, C.CARD),
    ...rect(`${id}_top`, slideId, x, y, cardW, px(4), C.BORDER),
    ...text(
      `${id}_label`,
      slideId,
      label,
      x + px(18),
      y + px(18),
      cardW - px(36),
      px(22),
      { size: 8, bold: true, color: C.GRAY }
    ),
    ...text(
      `${id}_val`,
      slideId,
      String(value),
      x + px(18),
      y + px(48),
      cardW - px(36),
      px(60),
      { size: 30, bold: true, color: valueColor || C.WHITE }
    ),
    ...text(
      `${id}_sub`,
      slideId,
      sub || "",
      x + px(18),
      y + px(116),
      cardW - px(36),
      px(30),
      { size: 10, color: C.MID }
    )
  ];
}
__name(metricCard, "metricCard");
function rect(id, slideId, x, y, w, h, color) {
  return [
    {
      createShape: {
        objectId: id,
        shapeType: "RECTANGLE",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: Math.round(w), unit: "EMU" },
            height: { magnitude: Math.round(h), unit: "EMU" }
          },
          transform: { scaleX: 1, scaleY: 1, translateX: Math.round(x), translateY: Math.round(y), unit: "EMU" }
        }
      }
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: color } } },
          outline: { propertyState: "NOT_RENDERED" }
        },
        fields: "shapeBackgroundFill,outline"
      }
    }
  ];
}
__name(rect, "rect");
function text(id, slideId, content2, x, y, w, h, opts = {}) {
  const {
    size = 14,
    bold = false,
    italic = false,
    color = C.WHITE,
    align = "START",
    spacing = 0
  } = opts;
  const reqs = [
    {
      createShape: {
        objectId: id,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: Math.round(w), unit: "EMU" },
            height: { magnitude: Math.round(h), unit: "EMU" }
          },
          transform: { scaleX: 1, scaleY: 1, translateX: Math.round(x), translateY: Math.round(y), unit: "EMU" }
        }
      }
    },
    {
      insertText: {
        objectId: id,
        text: String(content2 || "")
      }
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          outline: { propertyState: "NOT_RENDERED" },
          shapeBackgroundFill: { propertyState: "NOT_RENDERED" }
        },
        fields: "outline,shapeBackgroundFill"
      }
    },
    {
      updateTextStyle: {
        objectId: id,
        textRange: { type: "ALL" },
        style: {
          bold,
          italic,
          fontSize: { magnitude: size, unit: "PT" },
          foregroundColor: { opaqueColor: { rgbColor: color } },
          fontFamily: "Arial"
        },
        fields: "bold,italic,fontSize,foregroundColor,fontFamily"
      }
    },
    {
      updateParagraphStyle: {
        objectId: id,
        textRange: { type: "ALL" },
        style: { alignment: align },
        fields: "alignment"
      }
    }
  ];
  return reqs;
}
__name(text, "text");
function px(pixels) {
  return Math.round(pixels * 9144e3 / 960);
}
__name(px, "px");
function fmtCurrency(n) {
  if (!n && n !== 0) return "\u2014";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
__name(fmtCurrency, "fmtCurrency");
function fmtNum(n) {
  return (n || 0).toLocaleString();
}
__name(fmtNum, "fmtNum");
function fmtDuration(sec) {
  if (!sec) return "\u2014";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
__name(fmtDuration, "fmtDuration");
async function onRequestOptions9() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions9, "onRequestOptions");

// api/slides-prospect.js
var SLIDES_API = "https://slides.googleapis.com/v1/presentations";
var DRIVE_API = "https://www.googleapis.com/drive/v3/files";
var TOKEN_URL3 = "https://oauth2.googleapis.com/token";
var W = 9144e3;
var H = 5143500;
var em = /* @__PURE__ */ __name((i) => Math.round(i * 914400), "em");
var C2 = {
  black: { red: 0.047, green: 0.047, blue: 0.047 },
  dark: { red: 0.067, green: 0.067, blue: 0.067 },
  card: { red: 0.102, green: 0.102, blue: 0.102 },
  blue: { red: 0.176, green: 0.42, blue: 0.894 },
  accent: { red: 0.357, green: 0.561, blue: 0.941 },
  yellow: { red: 0.961, green: 0.773, blue: 0.094 },
  green: { red: 0.29, green: 0.871, blue: 0.502 },
  red: { red: 0.973, green: 0.427, blue: 0.427 },
  white: { red: 0.957, green: 0.957, blue: 0.949 },
  gray: { red: 0.533, green: 0.533, blue: 0.533 }
};
async function onRequestPost9(context) {
  const { request, env } = context;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    const { brief: b } = await request.json();
    if (!b) return new Response(JSON.stringify({ error: "Brief data required." }), { status: 400, headers });
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REFRESH_TOKEN) {
      return new Response(JSON.stringify({ error: "Google OAuth not configured.", setupRequired: true }), { status: 500, headers });
    }
    const token = await getToken(env);
    const title = `MTM Audit \u2014 ${b.businessName || "Prospect"} \u2014 ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`;
    const url = await buildDeck(b, title, token);
    return new Response(JSON.stringify({ success: true, url }), { headers });
  } catch (err) {
    console.error("Prospect slides:", err.message);
    return new Response(JSON.stringify({ error: err.message || "Failed." }), { status: 500, headers });
  }
}
__name(onRequestPost9, "onRequestPost");
async function getToken(env) {
  const r = await fetch(TOKEN_URL3, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.GOOGLE_OAUTH_CLIENT_ID, client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: "refresh_token" }) });
  const d = await r.json();
  if (!d.access_token) throw new Error(`OAuth failed: ${JSON.stringify(d)}`);
  return d.access_token;
}
__name(getToken, "getToken");
async function batch(pid, requests, token) {
  if (!requests.length) return;
  const r = await fetch(`${SLIDES_API}/${pid}:batchUpdate`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ requests }) });
  const d = await r.json();
  if (d.error) throw new Error(`batchUpdate failed: ${JSON.stringify(d.error)}`);
}
__name(batch, "batch");
async function buildDeck(b, title, token) {
  const cr = await fetch(SLIDES_API, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
  const pres = await cr.json();
  const pid = pres.presentationId;
  if (!pid) throw new Error(`Create failed: ${JSON.stringify(pres)}`);
  const src = pres.slides?.[0]?.objectId;
  if (!src) throw new Error("No default slide");
  const S = { cover: src, grade: "sp_grade", social: "sp_social", gaps: "sp_gaps", comp: "sp_comp", proposal: "sp_proposal", cta: "sp_cta" };
  await batch(pid, [
    { duplicateObject: { objectId: src, objectIds: { [src]: S.grade } } },
    { duplicateObject: { objectId: src, objectIds: { [src]: S.social } } },
    { duplicateObject: { objectId: src, objectIds: { [src]: S.gaps } } },
    { duplicateObject: { objectId: src, objectIds: { [src]: S.comp } } },
    { duplicateObject: { objectId: src, objectIds: { [src]: S.proposal } } },
    { duplicateObject: { objectId: src, objectIds: { [src]: S.cta } } }
  ], token);
  const p = b.profile || {};
  const gc = { A: C2.green, B: C2.accent, C: C2.yellow, D: { red: 0.984, green: 0.545, blue: 0.23 }, F: C2.red }[p.overallGrade] || C2.gray;
  const bgs = { [S.cover]: C2.black, [S.grade]: C2.dark, [S.social]: C2.dark, [S.gaps]: C2.black, [S.comp]: C2.dark, [S.proposal]: C2.black, [S.cta]: C2.black };
  await batch(pid, Object.entries(bgs).map(([id, c]) => ({ updatePageProperties: { objectId: id, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: c } } } }, fields: "pageBackgroundFill" } })), token);
  await batch(pid, content(b, S, gc, p), token);
  await fetch(`${DRIVE_API}/${pid}/permissions?sendNotificationEmail=false`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ role: "reader", type: "anyone" }) });
  return `https://docs.google.com/presentation/d/${pid}/edit`;
}
__name(buildDeck, "buildDeck");
function content(b, S, gc, p) {
  const sm = p.socialMedia || {};
  const gaps = b.gapAnalysis || [];
  const tps = b.talkingPoints || [];
  const ap = b.recommendedApproach || b.recommendedPackage || {};
  const sc = /* @__PURE__ */ __name((s) => s === "Active" ? C2.green : s === "Inactive" ? C2.yellow : C2.gray, "sc");
  const r = [];
  r.push(...bg(S.cover, C2.black), ...rx(S.cover, 0, 0, 0.06, 5.625, C2.blue), ...tx(S.cover, "MORE THAN MOMENTUM", 0.4, 0.5, 9.2, 0.5, { size: 13, bold: true, color: C2.blue }), ...tx(S.cover, "Digital Presence Audit", 0.4, 1.1, 9.2, 0.8, { size: 42, bold: true, color: C2.white }), ...tx(S.cover, b.businessName || "", 0.4, 2.2, 9.2, 0.7, { size: 30, bold: true, color: C2.accent }), ...tx(S.cover, b.city || "", 0.4, 2.95, 9.2, 0.5, { size: 18, color: C2.gray }), ...tx(S.cover, (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 0.4, 4.9, 9.2, 0.4, { size: 11, color: C2.gray }));
  r.push(...bg(S.grade, C2.dark), ...rx(S.grade, 0.4, 0.25, 1.8, 0.05, gc), ...tx(S.grade, "Your Digital Grade", 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C2.white }), ...rx(S.grade, 0.4, 1.2, 1.6, 1.6, gc), ...tx(S.grade, p.overallGrade || "?", 0.45, 1.25, 1.5, 1.5, { size: 80, bold: true, color: C2.white, align: "CENTER" }), ...tx(S.grade, p.gradeSummary || "", 2.3, 1.3, 7, 1.4, { size: 22, color: C2.white }), ...tx(S.grade, `Website: ${p.websitePlatform || "Unknown"} \xB7 ${p.websiteQuality || "Unknown"}`, 2.3, 2.8, 7, 0.4, { size: 14, color: C2.gray }), ...tx(S.grade, `Google Reviews: ${p.googleReviews || "Not Found"}`, 2.3, 3.2, 7, 0.4, { size: 14, color: C2.gray }));
  r.push(...bg(S.social, C2.dark), ...rx(S.social, 0.4, 0.25, 1.5, 0.05, C2.blue), ...tx(S.social, "Social Media Presence", 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C2.white }));
  [["Instagram", "instagram"], ["Facebook", "facebook"], ["TikTok", "tiktok"], ["LinkedIn", "linkedin"]].forEach(([n, k], i) => {
    const st = sm[k] || "None", x = 0.4 + i % 2 * 4.7, y = 1.3 + Math.floor(i / 2) * 1.7;
    r.push(...rx(S.social, x, y, 4.3, 1.4, C2.card), ...rx(S.social, x, y, 0.04, 1.4, sc(st)), ...tx(S.social, n, x + 0.2, y + 0.2, 3, 0.45, { size: 16, bold: true, color: C2.white }), ...tx(S.social, st, x + 0.2, y + 0.7, 3, 0.45, { size: 22, bold: true, color: sc(st) }));
  });
  r.push(...bg(S.gaps, C2.black), ...rx(S.gaps, 0.4, 0.25, 1.5, 0.05, C2.yellow), ...tx(S.gaps, "What's Missing", 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C2.white }), ...tx(S.gaps, "These gaps are costing you leads right now.", 0.4, 0.98, 9.2, 0.4, { size: 14, color: C2.gray }));
  gaps.forEach((g, i) => r.push(...rx(S.gaps, 0.4, 1.65 + i * 0.7, 0.04, 0.45, C2.yellow), ...tx(S.gaps, g, 0.7, 1.65 + i * 0.7, 8.8, 0.5, { size: 14, color: C2.white })));
  r.push(...bg(S.comp, C2.dark), ...rx(S.comp, 0.4, 0.25, 1.5, 0.05, C2.red), ...tx(S.comp, "While You're Not Here...", 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C2.white }), ...tx(S.comp, "Your competitors are.", 0.4, 0.98, 9.2, 0.4, { size: 14, color: C2.gray }));
  tps.forEach((t, i) => r.push(...rx(S.comp, 0.4, 1.65 + i * 0.8, 0.04, 0.55, C2.blue), ...tx(S.comp, t, 0.7, 1.65 + i * 0.8, 8.8, 0.6, { size: 13, color: C2.white })));
  r.push(...bg(S.proposal, C2.black), ...rx(S.proposal, 0.4, 0.25, 1.5, 0.05, C2.green), ...tx(S.proposal, "What We'd Build For You", 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C2.white }), ...tx(S.proposal, ap.track || "", 0.4, 1.1, 9.2, 0.4, { size: 12, color: C2.accent }), ...tx(S.proposal, ap.scope || ap.name || "", 0.4, 1.55, 9.2, 0.6, { size: 20, bold: true, color: C2.white }), ...tx(S.proposal, ap.rationale || "", 0.4, 2.3, 9.2, 1.5, { size: 15, color: C2.gray }), ...rx(S.proposal, 0.4, 4.2, 9.2, 0.06, C2.blue), ...tx(S.proposal, "Performance-based pricing. You pay less until we prove it works.", 0.4, 4.35, 9.2, 0.4, { size: 13, color: C2.accent }));
  r.push(...bg(S.cta, C2.black), ...rx(S.cta, 0.4, 0.25, 9.2, 0.05, C2.blue), ...tx(S.cta, "More Than Momentum", 0.4, 0.5, 9.2, 0.5, { size: 14, bold: true, color: C2.blue }), ...tx(S.cta, "Ready to\nfix this?", 0.4, 1.2, 9.2, 2, { size: 56, bold: true, color: C2.white }), ...tx(S.cta, "Let's talk next steps.", 0.4, 3.4, 9.2, 0.5, { size: 20, color: C2.gray }), ...tx(S.cta, "morethanmomentum.com", 0.4, 4.9, 9.2, 0.4, { size: 12, color: C2.gray }));
  return r;
}
__name(content, "content");
function uid() {
  return `sp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
__name(uid, "uid");
function fill(c) {
  return { solidFill: { color: { rgbColor: c } } };
}
__name(fill, "fill");
function bg(sid, c) {
  const id = uid();
  return [{ createShape: { objectId: id, shapeType: "RECTANGLE", elementProperties: { pageObjectId: sid, size: { width: { magnitude: W, unit: "EMU" }, height: { magnitude: H, unit: "EMU" } }, transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: "EMU" } } } }, { updateShapeProperties: { objectId: id, fields: "shapeBackgroundFill,outline", shapeProperties: { shapeBackgroundFill: fill(c), outline: { outlineFill: fill(c) } } } }];
}
__name(bg, "bg");
function rx(sid, x, y, w, h, c) {
  const id = uid();
  return [{ createShape: { objectId: id, shapeType: "RECTANGLE", elementProperties: { pageObjectId: sid, size: { width: { magnitude: em(w), unit: "EMU" }, height: { magnitude: em(h), unit: "EMU" } }, transform: { scaleX: 1, scaleY: 1, translateX: em(x), translateY: em(y), unit: "EMU" } } } }, { updateShapeProperties: { objectId: id, fields: "shapeBackgroundFill,outline", shapeProperties: { shapeBackgroundFill: fill(c), outline: { outlineFill: fill(c) } } } }];
}
__name(rx, "rx");
function tx(sid, text2, x, y, w, h, { size = 18, bold = false, color = C2.white, align = "START" } = {}) {
  if (!text2) return [];
  const id = uid();
  return [{ createShape: { objectId: id, shapeType: "TEXT_BOX", elementProperties: { pageObjectId: sid, size: { width: { magnitude: em(w), unit: "EMU" }, height: { magnitude: em(h), unit: "EMU" } }, transform: { scaleX: 1, scaleY: 1, translateX: em(x), translateY: em(y), unit: "EMU" } } } }, { insertText: { objectId: id, text: String(text2) } }, { updateTextStyle: { objectId: id, fields: "fontSize,bold,foregroundColor,fontFamily", style: { fontSize: { magnitude: size, unit: "PT" }, bold, foregroundColor: { opaqueColor: { rgbColor: color } }, fontFamily: "Arial" } } }, { updateParagraphStyle: { objectId: id, fields: "alignment", style: { alignment: align } } }];
}
__name(tx, "tx");
async function onRequestOptions10() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
__name(onRequestOptions10, "onRequestOptions");

// api/verify-tools.js
async function onRequestPost10(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  try {
    const body = await request.json();
    const storedHash = env.TOOLS_PASSWORD_HASH;
    if (!storedHash) {
      return new Response(
        JSON.stringify({ success: false, error: "Server misconfiguration \u2014 env var missing." }),
        { status: 500, headers }
      );
    }
    if (body.token) {
      const isValid = body.token === storedHash;
      return new Response(JSON.stringify({ success: isValid }), { headers });
    }
    if (body.password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(body.password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      const isValid = hashHex === storedHash;
      return new Response(
        JSON.stringify({
          success: isValid,
          token: isValid ? storedHash : null
        }),
        { headers }
      );
    }
    return new Response(JSON.stringify({ success: false }), { headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Request error." }),
      { status: 400, headers }
    );
  }
}
__name(onRequestPost10, "onRequestPost");
async function onRequestOptions11() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions11, "onRequestOptions");

// submit-lead.js
var ALLOWED_ORIGIN = "https://morethanmomentum.com";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Content-Type": "application/json"
};
async function onRequestOptions12() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept"
    }
  });
}
__name(onRequestOptions12, "onRequestOptions");
async function onRequestPost11(context) {
  const { request, env } = context;
  try {
    const formData = await request.formData();
    const raw = {
      name: (formData.get("name") || "").trim(),
      email: (formData.get("email") || "").trim(),
      phone: (formData.get("phone") || "").trim(),
      business: (formData.get("business") || "").trim(),
      service: (formData.get("service") || "").trim(),
      message: (formData.get("message") || "").trim(),
      plan: (formData.get("plan") || "").trim(),
      source: (formData.get("_source") || "website").trim(),
      page: (formData.get("_page") || "/").trim()
    };
    if (!raw.email || !raw.email.includes("@")) {
      return jsonResponse({ error: "Valid email is required" }, 400);
    }
    const parts = raw.name.split(" ").filter(Boolean);
    const firstName = parts[0] || "Unknown";
    const lastName = parts.slice(1).join(" ") || "";
    const tags = ["inbound-lead", raw.source];
    if (raw.service) tags.push(`interest-${raw.service.toLowerCase().replace(/\s+/g, "-")}`);
    if (raw.plan) tags.push(`plan-${raw.plan.toLowerCase().replace(/\s+/g, "-")}`);
    const contactPayload = {
      locationId: env.GHL_LOCATION_ID_MTM,
      firstName,
      lastName,
      email: raw.email,
      source: "website",
      tags
    };
    if (raw.phone) contactPayload.phone = raw.phone;
    if (raw.business) contactPayload.companyName = raw.business;
    const ghlRes = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GHL_API_KEY_MTM}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contactPayload)
    });
    if (!ghlRes.ok) {
      const errorBody = await ghlRes.text();
      console.error(`GHL API ${ghlRes.status}: ${errorBody}`);
      console.error("Payload was:", JSON.stringify(contactPayload));
    } else {
      const ghlData = await ghlRes.json();
      console.log(`GHL contact created: ${ghlData?.contact?.id} \u2014 ${raw.email} (${raw.source})`);
    }
    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error("submit-lead unexpected error:", err.message);
    return jsonResponse({ error: "Server error \u2014 please try again" }, 500);
  }
}
__name(onRequestPost11, "onRequestPost");
function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS
  });
}
__name(jsonResponse, "jsonResponse");

// ../.wrangler/tmp/pages-w96Q8N/functionsRoutes-0.42193752869280443.mjs
var routes = [
  {
    routePath: "/api/content-ideate",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/content-ideate",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/create-bot",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/create-bot",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/get-call-notes",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/get-call-notes",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/mtm-analytics",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/mtm-analytics",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/oauth-google",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/process-notes",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions5]
  },
  {
    routePath: "/api/process-notes",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/proposal",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions6]
  },
  {
    routePath: "/api/proposal",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/prospect",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions7]
  },
  {
    routePath: "/api/prospect",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/report",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions8]
  },
  {
    routePath: "/api/report",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/report-slides",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions9]
  },
  {
    routePath: "/api/report-slides",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/slides-prospect",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions10]
  },
  {
    routePath: "/api/slides-prospect",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost9]
  },
  {
    routePath: "/api/verify-tools",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions11]
  },
  {
    routePath: "/api/verify-tools",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost10]
  },
  {
    routePath: "/submit-lead",
    mountPath: "/",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions12]
  },
  {
    routePath: "/submit-lead",
    mountPath: "/",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost11]
  }
];

// ../../../../../../AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../../AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
