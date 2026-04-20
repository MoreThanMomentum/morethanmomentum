/**
 * MTM Proposal Generator — Pages Function
 * Route: POST /api/proposal
 *
 * Environment Variables Required:
 *   ANTHROPIC_API_KEY — MTM Anthropic key
 *
 * Accepts: {
 *   businessName, contactName, city, businessType,
 *   avgCustomerValue, packageId, discoveryNotes
 * }
 *
 * Returns: { success: true, proposal: { ... } }
 */

// ── PACKAGE DEFINITIONS ─────────────────────────────────────────────────────

const PACKAGES = {
  starter: {
    name: 'The Starter',
    tagline: 'Get found, look professional, and never miss a lead again.',
    setupFee: 1000,
    introMonthly: 500,
    fullMonthly: 1500,
    services: [
      { name: 'Professional Website Build', desc: 'Mobile-first, conversion-optimized site connected to your CRM — designed to turn visitors into leads.' },
      { name: 'CRM + Basic Lead Automation', desc: 'Full pipeline setup with automatic email + SMS follow-up sequences. Every lead gets contacted instantly — no one falls through the cracks.' },
      { name: 'Social Media Management', desc: '3 posts per week across 2 platforms, plus a monthly content calendar and marketing plan built around your business goals.' },
    ],
    deliveryWeeks: 3,
  },
  growth: {
    name: 'The Growth Engine',
    tagline: 'Turn your online presence into a lead machine that runs without you.',
    setupFee: 2500,
    introMonthly: 500,
    fullMonthly: 1500,
    services: [
      { name: 'Everything in The Starter', desc: 'Professional website, CRM, basic automation, and social media management — the full foundation.' },
      { name: 'Advanced Email + SMS Automation', desc: 'Multi-step nurture sequences, re-engagement campaigns for cold leads, automated Google review requests, and custom lead scoring.' },
      { name: '5 Posts Per Week', desc: 'Higher volume social content across platforms — graphics, carousels, and short-form content designed to build authority.' },
      { name: 'Monthly Reporting Dashboard', desc: 'Live metrics on leads, pipeline value, social growth, and conversion rates — delivered in a branded monthly report.' },
    ],
    deliveryWeeks: 3,
  },
  full: {
    name: 'The Full System',
    tagline: 'Your outsourced marketing department — strategy, content, automation, and ads.',
    setupFee: 3500,
    introMonthly: 500,
    fullMonthly: 2500,
    services: [
      { name: 'Everything in The Growth Engine', desc: 'Website, CRM, advanced automation, 5 posts/week, and monthly reporting — the complete digital foundation.' },
      { name: 'Monthly Content Filming', desc: '1 on-site shoot per month with 4–6 edited short-form videos (Reels, TikToks, YouTube Shorts) delivered and scheduled.' },
      { name: 'Paid Ads Management', desc: 'Meta or Google campaign management — audience targeting, creative, A/B testing, and monthly performance reporting. Ad budget separate.' },
      { name: 'Monthly Strategy Call', desc: '60-minute review and planning session each month to align on goals, review results, and plan next steps.' },
    ],
    deliveryWeeks: 4,
  },
};

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const {
      businessName,
      contactName,
      city,
      businessType,
      avgCustomerValue,
      packageId,
      discoveryNotes,
    } = body;

    // Validate required fields
    if (!businessName || !contactName || !city || !businessType || !packageId) {
      return new Response(
        JSON.stringify({ error: 'businessName, contactName, city, businessType, and packageId are required.' }),
        { status: 400, headers }
      );
    }

    const pkg = PACKAGES[packageId];
    if (!pkg) {
      return new Response(
        JSON.stringify({ error: `Invalid package: "${packageId}". Use: starter, growth, or full.` }),
        { status: 400, headers }
      );
    }

    const customerValue = parseFloat(avgCustomerValue) || 0;

    // Generate AI-powered proposal content
    const aiContent = await generateProposalContent(
      { businessName, contactName, city, businessType, customerValue, pkg, discoveryNotes },
      env.ANTHROPIC_API_KEY
    );

    // Build delivery timeline
    const timeline = buildTimeline(pkg, packageId);

    // Build investment summary
    const investment = {
      setupFee: pkg.setupFee,
      introMonthly: pkg.introMonthly,
      fullMonthly: pkg.fullMonthly,
      introLabel: '$500/month introductory rate',
      fullLabel: `$${pkg.fullMonthly.toLocaleString()}/month after performance milestones are met`,
      metricsNote: 'Monthly rate adjusts to the full rate once agreed-upon performance benchmarks are achieved. Specific milestones will be defined together during onboarding.',
    };

    // ROI calculation
    const roi = customerValue > 0
      ? {
          avgCustomerValue: customerValue,
          monthlyInvestment: pkg.introMonthly,
          breakEvenLeads: Math.ceil(pkg.introMonthly / customerValue),
          annualUpside: customerValue * 12,
          headline: customerValue >= pkg.introMonthly
            ? `One new customer pays for ${Math.floor(customerValue / pkg.introMonthly)} month${Math.floor(customerValue / pkg.introMonthly) !== 1 ? 's' : ''} of service.`
            : `${Math.ceil(pkg.introMonthly / customerValue)} new customers per month covers your full investment.`,
        }
      : null;

    return new Response(JSON.stringify({
      success: true,
      proposal: {
        businessName,
        contactName,
        city,
        businessType,
        packageId,
        package: {
          name: pkg.name,
          tagline: pkg.tagline,
          services: pkg.services,
        },
        investment,
        roi,
        painPoints: aiContent.painPoints || [],
        sellingTips: aiContent.sellingTips || [],
        nextSteps: aiContent.nextSteps || [],
        timeline,
        generatedAt: new Date().toISOString(),
      },
    }), { headers });

  } catch (err) {
    console.error('Proposal function error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers }
    );
  }
}

// ── TIMELINE BUILDER ────────────────────────────────────────────────────────

function buildTimeline(pkg, packageId) {
  const base = [
    { phase: 'Discovery & Strategy', days: 'Days 1–2', desc: 'Brand questionnaire, competitor audit, goal-setting call, and messaging framework.' },
    { phase: 'Website Build', days: 'Days 3–14', desc: 'AI-powered design and development, mobile optimization, content writing, and client preview.' },
    { phase: 'CRM + Automation Setup', days: 'Days 10–16', desc: 'GoHighLevel sub-account created, pipeline configured, follow-up sequences built and tested.' },
    { phase: 'Revisions & QA', days: `Days ${pkg.deliveryWeeks === 4 ? '15–20' : '15–18'}`, desc: 'Up to 2 rounds of revisions, full QA testing, domain configuration.' },
    { phase: 'Launch & Handoff', days: `Day ${pkg.deliveryWeeks * 7 - 2}`, desc: 'Site goes live, CRM connected, client walkthrough, and Growth Tools kickoff.' },
  ];

  if (packageId === 'growth' || packageId === 'full') {
    base.push({ phase: 'Content Strategy Kickoff', days: `Week ${pkg.deliveryWeeks}`, desc: 'First month content calendar built, platform strategy locked, posting begins.' });
  }

  if (packageId === 'full') {
    base.push({ phase: 'First Filming Session', days: `Week ${pkg.deliveryWeeks + 1}`, desc: 'On-site video shoot, ad creative planning, paid campaign setup begins.' });
  }

  return base;
}

// ── CLAUDE AI CONTENT ───────────────────────────────────────────────────────

async function generateProposalContent(data, apiKey) {
  if (!apiKey) {
    return {
      painPoints: ['AI-generated pain points unavailable — ANTHROPIC_API_KEY not configured.'],
      sellingTips: ['Configure ANTHROPIC_API_KEY to enable AI-powered proposal content.'],
      nextSteps: ['Sign the agreement and pick a start date.', 'Complete the brand questionnaire.', 'We begin building within 48 hours.'],
    };
  }

  const { businessName, contactName, city, businessType, customerValue, pkg, discoveryNotes } = data;

  const prompt = `You are a sales strategist for More Than Momentum (MTM), an AI-powered digital growth agency that serves local service businesses.

Generate proposal content for a prospect. Return ONLY a JSON object with these three arrays:

1. "painPoints" — 4-5 bullet points for a "What You're Losing Right Now" section in a client-facing proposal. These should be specific to their business type (${businessType}), emotionally resonant, and tied to real revenue loss. Reference concrete scenarios a ${businessType} business owner would recognize. Each point should make inaction feel expensive.

2. "sellingTips" — 4-5 internal-only tips for the MTM sales person presenting this proposal. Include specific objection handlers, conversation pivots, and emotional hooks that work for this business type. Reference the handbook sales approach: make the cost of inaction greater than the cost of saying yes.

3. "nextSteps" — 3-4 clear, action-oriented next steps for the end of the proposal. The first should be signing the agreement, the last should be "We start building within 48 hours of kickoff."

Context:
- Business: ${businessName} (${businessType}) in ${city}
- Contact: ${contactName}
- Package: ${pkg.name} — ${pkg.tagline}
- Average customer value: ${customerValue > 0 ? '$' + customerValue : 'Not provided'}
- Setup fee: $${pkg.setupFee} | Intro rate: $${pkg.introMonthly}/mo | Full rate: $${pkg.fullMonthly}/mo
${discoveryNotes ? `- Discovery notes: ${discoveryNotes}` : ''}

Rules:
- Be specific to ${businessType} — use industry language they would use
- Pain points should quantify loss where possible ("If you miss 2 leads per week at $${customerValue || 'X'} each, that's $${customerValue ? (customerValue * 8).toLocaleString() : 'X,XXX'}/month walking out the door")
- No corporate jargon — write like a smart friend explaining the problem
- Return ONLY valid JSON, no markdown, no intro text`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const result = await resp.json();
    const text = result.content?.[0]?.text || '{}';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
      sellingTips: Array.isArray(parsed.sellingTips) ? parsed.sellingTips : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    };
  } catch (err) {
    console.error('Claude proposal error:', err.message);
    return {
      painPoints: [
        'Every missed call or slow follow-up sends a potential customer to a competitor who answered first.',
        'Without a modern website, prospects judge your business before they ever talk to you.',
        'Inconsistent or absent social media makes your business invisible to the people actively searching for what you offer.',
        'Manual follow-up means leads go cold while you are busy doing the actual work.',
      ],
      sellingTips: ['AI content generation failed — use standard handbook talking points.'],
      nextSteps: ['Sign the agreement and pick a start date.', 'Complete the brand questionnaire we will send within 24 hours.', 'We start building within 48 hours of kickoff.'],
    };
  }
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
