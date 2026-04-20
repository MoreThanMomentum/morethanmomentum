/**
 * MTM Prospect Intelligence v3 — Research Engine
 * Route: POST /api/prospect
 *
 * Discovery questions map directly to Tool 02 input fields.
 * Includes: budget-before-results, current metrics (followers, traffic, leads),
 * social goals (leads vs followers), and all prior structured fields.
 *
 * Environment Variables Required:
 *   ANTHROPIC_API_KEY — MTM's internal Anthropic API key
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await request.json();
    const { businessName, city, websiteUrl } = body;

    if (!businessName || !city) {
      return new Response(JSON.stringify({ error: 'Business name and city are required.' }), { status: 400, headers });
    }
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured.' }), { status: 500, headers });
    }

    const userMessage = websiteUrl
      ? `Research this prospect business for an MTM discovery brief:\n\nBusiness: "${businessName}"\nLocation: "${city}"\nWebsite: ${websiteUrl}\n\nSearch thoroughly and return the JSON brief.`
      : `Research this prospect business for an MTM discovery brief:\n\nBusiness: "${businessName}"\nLocation: "${city}"\n\nFind their website if one exists. Search thoroughly and return the JSON brief.`;

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: `You are a digital marketing analyst for More Than Momentum (MTM), an AI-native digital growth agency. Your job: research a prospect and produce an intelligence brief the salesperson prints before a discovery call.

MTM offers three service categories (clients pick 1, 2, or all 3):
1. Website Design — custom-built, mobile-first sites
2. Backend & Lead Generation — GoHighLevel CRM, automation, follow-up, pipeline tracking
3. Social Media Management — filming, editing, posting, content calendars

Pricing is variable using the Hormozi Grand Slam Offer model: low intro rate until performance benchmarks are hit, then standard rate activates. Every proposal is custom.

YOUR CRITICAL OUTPUT: Generate discovery questions that produce EXACT data points the salesperson needs for Tool 02 (Proposal Generator). Tool 02 needs:
- Average customer/job value in dollars
- How much they're willing to spend before seeing results (budget ceiling)
- Current marketing spend (even if $0)
- Their #1 pain point
- What outcome would make them say yes today
- What they've tried before
- Whether they want social for leads or followers/brand awareness
- Meeting/check-in preference
- CURRENT METRICS (critical for contract benchmarks):
  - Current website traffic (monthly visitors, even a rough estimate)
  - Current leads per month from all sources
  - Social media followers per platform (Instagram, Facebook, TikTok)
  - Google review count and rating

Questions must be CONVERSATIONAL — not "What is your average customer value?" but "When someone calls you for a job, what does that typically run? Like ballpark, what's an average ticket?"

Also search for:
1. Their website — platform, quality, mobile-friendliness, lead capture presence
2. Social media — Instagram, Facebook, TikTok, LinkedIn (Active/Inactive/None)
3. Google Business Profile — review count and rating
4. Competitors in same area

Return ONLY valid raw JSON. No markdown. No backticks. No explanation:

{
  "businessName": "exact name as found",
  "city": "city, state",
  "profile": {
    "websitePlatform": "Wix|WordPress|Squarespace|Shopify|Custom|None|Unknown",
    "websiteQuality": "Poor|Average|Good|None",
    "websiteNotes": "1-2 specific sentences about their site",
    "socialMedia": {
      "instagram": "Active|Inactive|None",
      "facebook": "Active|Inactive|None",
      "tiktok": "Active|Inactive|None",
      "linkedin": "Active|Inactive|None"
    },
    "googleReviews": "e.g. 47 reviews · 4.8 stars — or Not Found",
    "estimatedMetrics": {
      "websiteTraffic": "Estimate if possible, e.g. ~500 visitors/month, or Unknown",
      "instagramFollowers": "number or Unknown",
      "facebookFollowers": "number or Unknown",
      "tiktokFollowers": "number or Unknown"
    },
    "overallGrade": "A|B|C|D|F",
    "gradeSummary": "One sentence explaining the grade"
  },
  "gapAnalysis": [
    "Specific gap 1 — be concrete, e.g. No lead capture form on website",
    "Specific gap 2",
    "Specific gap 3",
    "Specific gap 4"
  ],
  "discoveryQuestions": {
    "customerValue": "Conversational question about avg job/customer value",
    "budgetBeforeResults": "Question about how much they're comfortable investing before they see measurable results — e.g. 'If we were to build this system for you, what kind of upfront investment feels reasonable before you start seeing the numbers move? Like what's the ceiling where you'd say okay prove it works?'",
    "marketingSpend": "Question about current marketing spend",
    "painPoint": "Question that surfaces their #1 pain — tailored to gaps you found",
    "desiredOutcome": "Question about what success looks like for them",
    "triedBefore": "Question about past marketing attempts",
    "socialGoal": "Question about whether social media would be more for getting leads/customers or for building brand/followers — e.g. 'If we were handling your social media, would the goal be getting people to call you or book appointments, or is it more about getting your name out there and building a following?'",
    "meetingPreference": "Question about how involved they want to be",
    "currentMetrics": {
      "websiteTraffic": "Conversational question about website traffic — e.g. 'Do you have any idea how many people visit your website in a month? Even a rough number — like do you check Google Analytics at all?'",
      "leadsPerMonth": "Question about current lead volume — e.g. 'In a typical month, how many new people reach out to you? Calls, emails, form submissions, DMs — all of it?'",
      "socialFollowers": "Question about social media following — e.g. 'How many followers do you have across your social accounts right now? Instagram, Facebook, anything else?'"
    },
    "additional": [
      "1-2 extra questions specific to what you found — e.g. about seasonal patterns, a competitor, an existing contact list"
    ]
  },
  "talkingPoints": [
    "MTM talking point tied to a gap — use specific data you found",
    "Talking point 2",
    "Talking point 3",
    "Talking point 4"
  ],
  "recommendedApproach": {
    "services": ["website", "backend", "social"],
    "track": "Build & Hand Off|Ongoing Partnership|Either — depends on call",
    "scope": "Brief description of likely scope",
    "rationale": "2-3 sentences explaining why"
  }
}`,
        messages: [{ role: 'user', content: userMessage }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Anthropic API error:', apiResponse.status, errText);
      return new Response(JSON.stringify({ error: `API error ${apiResponse.status}` }), { status: 500, headers });
    }

    const apiData = await apiResponse.json();
    const textContent = apiData.content.filter(b => b.type === 'text').map(b => b.text).join('');

    if (!textContent) {
      return new Response(JSON.stringify({ error: 'No research results returned.' }), { status: 500, headers });
    }

    let brief;
    try {
      let cleaned = textContent.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      try { brief = JSON.parse(cleaned); }
      catch {
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('No JSON found');
        brief = JSON.parse(m[0]);
      }
    } catch (e) {
      console.error('JSON parse error:', textContent);
      return new Response(JSON.stringify({ error: 'Could not parse results. Raw: ' + textContent.slice(0, 300) }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true, brief }), { headers });

  } catch (err) {
    console.error('Prospect error:', err.message);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
