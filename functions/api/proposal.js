/**
 * MTM Proposal Generator v2 — Pages Function
 * Route: POST /api/proposal
 *
 * Hormozi Grand Slam Offer model: AI analyzes discovery data and builds
 * a custom offer with guarantee-based pricing. No fixed packages —
 * every proposal is tailored to the prospect's pain and desired outcome.
 *
 * Environment Variables Required:
 *   ANTHROPIC_API_KEY — MTM Anthropic key
 *
 * Hard Floors (enforced post-AI):
 *   Minimum setup fee:   $500
 *   Minimum intro monthly: $200
 *   Guarantees: only metrics MTM can track and achieve
 *              (website traffic, online leads, social followers, engagement)
 *              NEVER sales, revenue, or conversions the client controls
 */

const MIN_SETUP = 500;
const MIN_MONTHLY_INTRO = 200;
const OUT_OF_SCOPE_RATE = 50;

const SERVICE_CATALOG = [
  { id: 'website',      name: 'Website Design & Development',          costBasis: 800,  type: 'setup' },
  { id: 'crm',          name: 'GoHighLevel CRM + Lead Automation',     costBasis: 400,  type: 'setup' },
  { id: 'social',       name: 'Social Media Management',               costBasis: 500,  type: 'monthly' },
  { id: 'email_sms',    name: 'Advanced Email + SMS Automation',        costBasis: 300,  type: 'monthly' },
  { id: 'content_film', name: 'Monthly Content Filming & Production',  costBasis: 800,  type: 'monthly' },
  { id: 'paid_ads',     name: 'Paid Ads Management (Meta/Google)',      costBasis: 600,  type: 'monthly' },
  { id: 'seo',          name: 'SEO Foundation & Optimization',          costBasis: 300,  type: 'setup' },
  { id: 'review_auto',  name: 'Google Review Request Automation',       costBasis: 200,  type: 'setup' },
  { id: 'reporting',    name: 'Monthly Performance Reporting',          costBasis: 150,  type: 'monthly' },
];

const ALLOWED_METRICS = [
  'Monthly Website Traffic (Unique Visitors)',
  'Monthly Qualified Leads (GHL Pipeline)',
  'Instagram Followers',
  'Facebook Page Followers',
  'Google Business Profile Views',
  'Social Media Engagement Rate',
  'Email Open Rate',
  'Website Form Submissions',
  'Google Review Count',
];

const FORBIDDEN_METRICS = [
  'sales', 'revenue', 'profit', 'conversions', 'close rate',
  'appointments booked', 'customers acquired', 'ROI',
];

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await request.json();
    const {
      businessName, contactName, city, businessType,
      avgCustomerValue, currentMarketingSpend,
      painPoint, desiredOutcome, triedBefore,
      meetingCadence, meetingDay, discoveryNotes,
    } = body;

    if (!businessName || !contactName || !city || !businessType) {
      return new Response(JSON.stringify({ error: 'businessName, contactName, city, and businessType are required.' }), { status: 400, headers });
    }

    const custValue = parseFloat(avgCustomerValue) || 0;
    const mktSpend  = parseFloat(currentMarketingSpend) || 0;

    const aiOffer = await generateGrandSlamOffer(
      { businessName, contactName, city, businessType, custValue, mktSpend, painPoint, desiredOutcome, triedBefore, meetingCadence, meetingDay, discoveryNotes },
      env.ANTHROPIC_API_KEY
    );

    // Enforce hard floors
    if (aiOffer.setupFee < MIN_SETUP) aiOffer.setupFee = MIN_SETUP;
    if (aiOffer.introMonthly < MIN_MONTHLY_INTRO) aiOffer.introMonthly = MIN_MONTHLY_INTRO;
    if (aiOffer.standardMonthly <= aiOffer.introMonthly) aiOffer.standardMonthly = Math.max(aiOffer.introMonthly * 3, 600);

    // Strip forbidden guarantee metrics
    aiOffer.guaranteeMetrics = (aiOffer.guaranteeMetrics || []).filter(m => {
      const lower = (m.metric || '').toLowerCase();
      return !FORBIDDEN_METRICS.some(f => lower.includes(f));
    });

    // Clamp minimum term
    if (!aiOffer.minimumTermDays || aiOffer.minimumTermDays < 30) aiOffer.minimumTermDays = 60;
    if (aiOffer.minimumTermDays > 90) aiOffer.minimumTermDays = 90;

    const meetingDesc = buildMeetingDescription(meetingCadence, meetingDay);

    const roi = custValue > 0 ? {
      avgCustomerValue: custValue,
      introMonthly: aiOffer.introMonthly,
      breakEvenLeads: Math.ceil(aiOffer.introMonthly / custValue),
      headline: custValue >= aiOffer.introMonthly
        ? `One new customer covers ${Math.floor(custValue / aiOffer.introMonthly)} month${Math.floor(custValue / aiOffer.introMonthly) !== 1 ? 's' : ''} of your intro rate.`
        : `${Math.ceil(aiOffer.introMonthly / custValue)} new customers per month covers your full investment.`,
    } : null;

    const socialInScope = (aiOffer.services || []).some(s =>
      s.id === 'social' || s.id === 'content_film' || (s.name || '').toLowerCase().includes('social')
    );

    // Compute minimum term end date
    const effectiveDate = new Date();
    const termEnd = new Date(effectiveDate);
    termEnd.setDate(termEnd.getDate() + (aiOffer.minimumTermDays || 60));

    return new Response(JSON.stringify({
      success: true,
      proposal: {
        businessName, contactName, city, businessType,
        offerName: aiOffer.offerName || `${businessName} Growth System`,
        offerTagline: aiOffer.offerTagline || '',
        services: aiOffer.services || [],
        setupFee: aiOffer.setupFee,
        introMonthly: aiOffer.introMonthly,
        standardMonthly: aiOffer.standardMonthly,
        minimumTermDays: aiOffer.minimumTermDays,
        minimumTermEndDate: termEnd.toISOString(),
        guaranteeMetrics: aiOffer.guaranteeMetrics || [],
        painPoints: aiOffer.painPoints || [],
        sellingTips: aiOffer.sellingTips || [],
        nextSteps: aiOffer.nextSteps || [],
        timeline: aiOffer.timeline || [],
        valueStack: aiOffer.valueStack || '',
        roi,
        socialInScope,
        meetingCadence: meetingCadence || 'monthly_email',
        meetingDay: meetingDay || '',
        meetingDescription: meetingDesc,
        outOfScopeRate: OUT_OF_SCOPE_RATE,
        effectiveDate: effectiveDate.toISOString(),
        generatedAt: new Date().toISOString(),
      },
    }), { headers });

  } catch (err) {
    console.error('Proposal function error:', err.message);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), { status: 500, headers });
  }
}

// ── MEETING DESCRIPTION ──────────────────────────────────────────────────────

function buildMeetingDescription(cadence, day) {
  const dayStr = day ? ` on ${day}s` : '';
  switch (cadence) {
    case 'weekly':
      return `MTM and the Client shall meet once per week${dayStr}, for a maximum of one (1) hour, to review performance, discuss upcoming content, address change requests, and align on strategy. This weekly meeting is the designated channel for the Client to communicate change requests and content direction. MTM shall complete all reasonable change requests discussed and agreed upon during the meeting within seven (7) business days.`;
    case 'biweekly':
      return `MTM and the Client shall meet once every two (2) weeks${dayStr}, for a maximum of thirty (30) minutes, to review performance, discuss content direction, and address any change requests. Between meetings, the Client may submit change requests via email, which MTM will address within seven (7) business days.`;
    case 'monthly_email':
    default:
      return `MTM shall deliver a written monthly performance report to the Client via email by the fifth (5th) business day of each calendar month, covering the prior month's metrics and activity. The Client may submit change requests via email at any time, which MTM will address within seven (7) business days.`;
  }
}

// ── AI GRAND SLAM OFFER ──────────────────────────────────────────────────────

async function generateGrandSlamOffer(data, apiKey) {
  if (!apiKey) return buildFallbackOffer(data);

  const { businessName, contactName, city, businessType, custValue, mktSpend, painPoint, desiredOutcome, triedBefore, meetingCadence, meetingDay, discoveryNotes } = data;

  const prompt = `You are a sales strategist for More Than Momentum (MTM), an AI-powered digital growth agency. You use Alex Hormozi's Grand Slam Offer framework to create offers so good prospects feel stupid saying no.

THE HORMOZI VALUE EQUATION:
Value = (Dream Outcome x Perceived Likelihood of Achievement) / (Time Delay x Effort & Sacrifice)

Your job: maximize the top (dream + certainty) and minimize the bottom (time + effort). Remove every obstacle between the prospect and their desired outcome. Stack value so the price feels insignificant.

MTM PRICING PLAYBOOK — USE THIS AS CONTEXT FOR BUILDING THE OFFER:

MTM operates on TWO TRACKS. Every client fits one:

TRACK A — BUILD & HAND OFF (One-Time Fee)
For owners who want a professional asset delivered, paid once, and handed to them to run. Good for technically comfortable owners or businesses with someone internal to maintain things.
- Launch Site ($1,000 one-time): Custom website, mobile-first, up to 5 pages, contact form, one revision round. No automation, no ongoing.
- Launch System ($1,500 one-time): Everything in Launch Site + full AI automation (lead capture, instant SMS/email follow-up, appointment booking, review requests, pipeline tracking, training walkthrough). No ongoing maintenance included.

TRACK B — ONGOING PARTNERSHIP (Monthly Retainer)
For owners who want MTM in the trenches with them monthly. This is where MTM delivers the most value and earns recurring revenue.
- Stay Current ($500/mo, add-on to Launch System only): Ongoing system monitoring, new features added, workflow tweaks, priority support, quarterly check-ins. No content creation.
- Content Partner ($1,500/mo): Custom website + full automation (built during onboarding) + ongoing updates + owner films raw footage, MTM edits and posts + content calendar + monthly performance report. No on-site filming.
- Full Momentum ($3,000 setup + $2,500/mo): Everything + MTM shows up on-site to film + broadcast-quality editing + strategic content calendar + monthly strategy call + full performance dashboard. Flagship package.

DECISION TREE — use the prospect's answers to lean toward the right structure:
- "I just need a better website" → lean toward Launch Site territory, but stack automation value
- "I want automation but no monthly bill" → Launch System territory, mention Stay Current as optional
- "I'll film my own stuff but need help editing/posting" → Content Partner territory
- "I need everything, I have no time" → Full Momentum territory

IMPORTANT: These packages are REFERENCE POINTS, not rigid boxes. Your job is to build a CUSTOM offer that uses Hormozi's framework — the packages tell you what the market expects at different price points. You can mix, adjust, and create entirely new structures based on discovery data. The intro rate / standard rate model with performance guarantees is what makes MTM's offer a Grand Slam — the client pays less until we prove it works.

OBJECTION CONTEXT — the offer should preemptively address these:
- "Too expensive" → reframe around customer value ROI
- "Tried agencies before" → one-time build option removes long-term risk, performance guarantees shift risk to MTM
- "I can build my own website" → quantify time cost: 40+ hours = what they could earn running their business
- "I want to think about it" → the offer structure (low intro rate + guarantees) IS the answer to their hesitation

PROSPECT INFORMATION:
- Business: ${businessName} (${businessType}) in ${city}
- Contact: ${contactName}
- Average customer value: ${custValue > 0 ? '$' + custValue : 'Not provided'}
- Current marketing spend: ${mktSpend > 0 ? '$' + mktSpend + '/month' : 'Not provided'}
- Primary pain point: ${painPoint || 'Not specified'}
- Desired outcome (what would make them sign today): ${desiredOutcome || 'Not specified'}
- What they have tried before: ${triedBefore || 'Not specified'}
- Meeting preference: ${meetingCadence || 'monthly_email'}${meetingDay ? ' on ' + meetingDay + 's' : ''}
${discoveryNotes ? '- Discovery notes from call: ' + discoveryNotes : ''}

MTM SERVICE CATALOG (select what fits — do NOT include everything, only what serves their pain):
${SERVICE_CATALOG.map(s => `- ${s.id}: ${s.name} (${s.type}, cost basis ~$${s.costBasis})`).join('\n')}

PRICING STRATEGY:
1. Hard floors: setup >= $${MIN_SETUP}, intro monthly >= $${MIN_MONTHLY_INTRO}
2. Standard monthly should be 3-5x the intro rate
3. Intro rate = "prove it" rate. Client pays less while MTM earns trust.
4. Standard rate kicks in ONLY when ALL performance benchmarks are simultaneously met
5. The math MUST work: once benchmarks hit and standard rate activates, MTM earns back the discount period within 3-4 months
6. If prospect currently spends $${mktSpend || 0}/month on marketing, price the intro at or below that — make switching feel risk-free
7. Use the customer value ($${custValue || 0}) to anchor ROI: "this pays for itself with X customers"
8. Think like Hormozi: the offer should feel like a steal at the intro rate, and fair at the standard rate

GUARANTEE METRICS (pick 3-4, ONLY from this approved list):
${ALLOWED_METRICS.map(m => '- ' + m).join('\n')}
NEVER guarantee: sales, revenue, profit, close rate, conversions, or anything the client controls.
Each metric needs: name, baseline ("TBD at first month close" if unknown), target (specific number or percentage), and data source.
Targets MUST be realistically achievable by MTM within 60-90 days.

MINIMUM TERM: Choose 30-90 days. Default to 60. Consider scope complexity and client risk tolerance. The term must give MTM enough runway to demonstrate results, but not scare the prospect. Frame it as protection for both parties — "we need X days to prove this works."

Return ONLY a JSON object with this structure:
{
  "offerName": "Specific, compelling name for this offer",
  "offerTagline": "One sentence — makes them feel stupid saying no",
  "services": [
    {
      "id": "service_id",
      "name": "Service name",
      "desc": "2-3 sentences specific to their business type",
      "valueHighlight": "Dollar or outcome value (e.g. 'Worth $2,000/month in recovered leads')"
    }
  ],
  "setupFee": 800,
  "introMonthly": 300,
  "standardMonthly": 1500,
  "minimumTermDays": 60,
  "guaranteeMetrics": [
    { "metric": "Metric Name", "baseline": "Current or TBD", "target": "Specific target", "source": "Data source" }
  ],
  "painPoints": ["4-5 specific pain points for 'What You Are Losing Right Now' — quantify with dollars where possible, use their business type language"],
  "sellingTips": ["4-5 internal tips for the sales person — objection handlers, pivots, hooks"],
  "valueStack": "2-3 sentences showing total value vs intro price — make the gap massive",
  "nextSteps": ["3-4 steps, first is signing, last is 'We start building within 48 hours'"],
  "timeline": [
    { "phase": "Phase name", "days": "Days X-Y", "desc": "What happens" }
  ]
}

CRITICAL: Valid JSON only. No markdown. No backticks. No intro text.`;

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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const result = await resp.json();
    const text = result.content?.[0]?.text || '{}';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Claude offer error:', err.message);
    return buildFallbackOffer(data);
  }
}

// ── FALLBACK ─────────────────────────────────────────────────────────────────

function buildFallbackOffer(data) {
  return {
    offerName: `${data.businessName} Growth System`,
    offerTagline: 'Your digital infrastructure — built, managed, and guaranteed to perform.',
    services: [
      { id: 'website', name: 'Website Design & Development', desc: 'Professional, mobile-first website built to convert visitors into leads.', valueHighlight: 'Foundation of your online presence' },
      { id: 'crm', name: 'GoHighLevel CRM + Lead Automation', desc: 'Full pipeline setup with automatic follow-up sequences — no lead falls through the cracks.', valueHighlight: 'Never miss a lead again' },
      { id: 'social', name: 'Social Media Management', desc: 'Consistent posting across platforms with a monthly content calendar and strategy.', valueHighlight: 'Stay visible without lifting a finger' },
    ],
    setupFee: 1000, introMonthly: 500, standardMonthly: 1500, minimumTermDays: 60,
    guaranteeMetrics: [
      { metric: 'Monthly Website Traffic (Unique Visitors)', baseline: 'TBD at first month close', target: '+50% increase', source: 'Google Analytics GA4' },
      { metric: 'Monthly Qualified Leads (GHL Pipeline)', baseline: 'TBD at first month close', target: '15 leads/month', source: 'GoHighLevel Pipeline Dashboard' },
    ],
    painPoints: [
      'Every missed call or slow follow-up sends a customer to the competitor who answered first.',
      'An outdated website tells prospects your business is behind before they ever call.',
      'Without consistent social media, you are invisible to people actively searching for what you offer.',
      'Manual follow-up means leads go cold while you are busy doing the actual work.',
    ],
    sellingTips: ['AI generation unavailable — use handbook talking points.'],
    valueStack: 'The combined value of a professional website, CRM automation, and managed social media exceeds $3,000/month at market rates. You start at a fraction of that while we prove results.',
    nextSteps: ['Sign the agreement and pick a start date.', 'Complete the brand questionnaire within 24 hours.', 'Provide account access within 48 hours.', 'We start building within 48 hours of kickoff.'],
    timeline: [
      { phase: 'Discovery & Strategy', days: 'Days 1-2', desc: 'Brand questionnaire, competitor audit, goal-setting call.' },
      { phase: 'Website & CRM Build', days: 'Days 3-14', desc: 'Design, development, CRM configuration, automation setup.' },
      { phase: 'Revisions & QA', days: 'Days 15-18', desc: 'Up to 2 rounds of revisions, full QA testing.' },
      { phase: 'Launch & Handoff', days: 'Day 21', desc: 'Site live, CRM connected, client walkthrough, growth tools kickoff.' },
    ],
  };
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
