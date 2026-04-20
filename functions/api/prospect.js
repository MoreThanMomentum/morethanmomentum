/**
 * MTM Prospect Intelligence — Research Engine (v2)
 * Route: POST /api/prospect
 *
 * Updated: Discovery questions now map directly to Tool 02 (Proposal Generator)
 * input fields. The workflow: Tool 01 researches → generates targeted discovery
 * questions → salesperson asks on the call → answers feed into Tool 02 → AI
 * builds the Grand Slam Offer.
 *
 * Environment Variables Required:
 *   ANTHROPIC_API_KEY — MTM's internal Anthropic API key
 *
 * Accepts: { businessName, city, websiteUrl? }
 * Returns: { success: true, brief: { ... } }
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const { businessName, city, websiteUrl } = body;

    if (!businessName || !city) {
      return new Response(
        JSON.stringify({ error: 'Business name and city are required.' }),
        { status: 400, headers }
      );
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY to environment variables.' }),
        { status: 500, headers }
      );
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
        max_tokens: 2500,
        system: `You are a digital marketing analyst for More Than Momentum (MTM), an AI-native digital growth agency serving small and mid-size local businesses — primarily trades and local service providers.

MTM uses a variable pricing model based on client needs. There are no fixed packages — every proposal is custom-built from discovery call data. The salesperson uses Tool 01 (this tool) to research the prospect, then uses Tool 02 (Proposal Generator) to build a custom Grand Slam Offer based on the answers they get during the discovery call.

YOUR JOB: Research the prospect and produce a brief that:
1. Audits their current digital presence
2. Identifies specific gaps and problems
3. Generates the EXACT discovery questions the salesperson needs to ask during the call — these questions must directly produce the data needed for Tool 02
4. Provides talking points to use during the conversation
5. Recommends a general approach (not a fixed package)

THE DISCOVERY QUESTIONS ARE CRITICAL. Tool 02 needs these specific data points from the call:
- Average customer/job value in dollars
- Current monthly marketing spend (even if $0)
- Their #1 pain point (losing leads, bad website, no social presence, no time, bad agency experience, etc.)
- What specific outcome would make them say yes today
- What they have tried before (nothing, DIY social, hired agency, freelancer, ran ads, built own site)
- Meeting/check-in preference (weekly, biweekly, or just monthly email reports)
- Any other relevant details (existing contact lists, seasonal patterns, competitor concerns)

Your discovery questions should be conversational versions of these — not "What is your average customer value?" but "When someone calls you for a job, what does that typically run? Like ballpark, what's an average ticket for you?"

MTM's core capabilities:
- Custom websites (mobile-first, conversion-focused, not templates)
- AI-powered automation (lead capture, instant follow-up, appointment booking, pipeline tracking, review requests)
- Social media management (filming, editing, posting, content calendars)
- Two tracks: Build & Hand Off (one-time fee) or Ongoing Partnership (monthly retainer)

Search for:
1. Their website — platform, quality, mobile-friendliness, lead capture
2. Social media — Instagram, Facebook, TikTok, LinkedIn (Active/Inactive/None)
3. Google Business Profile — review count and rating
4. Competitors in the same area and niche
5. Any obvious digital gaps or problems

Return ONLY a valid raw JSON object. No markdown. No backticks. No explanation. Just JSON:

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
    "googleReviews": "e.g. 47 reviews · 4.8 stars  — or  Not Found",
    "overallGrade": "A|B|C|D|F",
    "gradeSummary": "One sentence explaining the grade"
  },
  "gapAnalysis": [
    "Specific gap 1 — be concrete",
    "Specific gap 2",
    "Specific gap 3",
    "Specific gap 4"
  ],
  "discoveryQuestions": {
    "customerValue": "Conversational question to find out their average job/customer value — e.g. 'When someone calls you for a job, what does that typically run?'",
    "marketingSpend": "Question about current marketing spend — e.g. 'Are you spending anything on marketing right now? Even just boosting posts or paying for a website?'",
    "painPoint": "Question that surfaces their #1 pain — tailored to gaps you found — e.g. 'I noticed your website doesn't have a way for people to request a quote. Where do your leads usually come from right now?'",
    "desiredOutcome": "Question about what success looks like — e.g. 'If we could fix one thing about your online presence in the next 30 days, what would make the biggest difference for you?'",
    "triedBefore": "Question about past marketing attempts — e.g. 'Have you ever worked with a marketing company or tried running ads? How did that go?'",
    "meetingPreference": "Question about how involved they want to be — e.g. 'Some of our clients like a weekly check-in, others just want a monthly report. What works better for how you run things?'",
    "additional": [
      "1-2 extra questions specific to what you found in the research — e.g. about an existing contact list, seasonal patterns, a competitor they are losing to, etc."
    ]
  },
  "talkingPoints": [
    "MTM talking point tied to a gap — e.g. 'Your competitor has 180 Google reviews to your 12 — our review automation system fixes that in 60 days.'",
    "Talking point 2",
    "Talking point 3",
    "Talking point 4"
  ],
  "recommendedApproach": {
    "track": "Build & Hand Off|Ongoing Partnership|Either — depends on call",
    "scope": "Brief description of what you'd likely include — e.g. 'Website rebuild + CRM automation + social media management'",
    "rationale": "2-3 sentences explaining why this approach fits based on what you found"
  }
}`,
        messages: [
          { role: 'user', content: userMessage }
        ],
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ]
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Anthropic API error:', apiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `API error ${apiResponse.status} — check your ANTHROPIC_API_KEY.` }),
        { status: 500, headers }
      );
    }

    const apiData = await apiResponse.json();

    const textContent = apiData.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: 'No research results returned. Try again.' }),
        { status: 500, headers }
      );
    }

    let brief;
    try {
      let cleaned = textContent.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      try {
        brief = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found in response');
        brief = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('JSON parse error. Raw response:', textContent);
      return new Response(
        JSON.stringify({ error: 'Could not parse research results. Raw: ' + textContent.slice(0, 300) }),
        { status: 500, headers }
      );
    }

    return new Response(JSON.stringify({ success: true, brief }), { headers });

  } catch (err) {
    console.error('Prospect function error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers }
    );
  }
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
