/**
 * MTM Proposal Generator v3 — Pages Function
 * Route: POST /api/proposal
 *
 * Three-checkbox architecture: Website / Backend & Lead Gen / Social Media
 * Hormozi Grand Slam Offer with variable pricing, specific contract scopes,
 * Monday billing, exact benchmark metrics, and full playbook knowledge.
 *
 * Hard Floors:
 *   Min setup fee:              $1,000
 *   Min monthly WITHOUT social: $200
 *   Min monthly WITH social:    $2,500
 *   Min term: website-only 30d, website+backend 45d, social 60d, all 60d
 *   Out-of-scope rate:          $50/hr (fixed)
 */

const MIN_SETUP = 1000;
const MIN_MONTHLY_NO_SOCIAL = 200;
const MIN_MONTHLY_WITH_SOCIAL = 2500;
const OUT_OF_SCOPE_RATE = 50;

const ALLOWED_METRICS = [
  'Monthly Website Traffic (Unique Visitors)',
  'Monthly Qualified Leads (GHL Pipeline)',
  'Monthly Website Form Submissions',
  'Instagram Followers',
  'Facebook Page Followers',
  'TikTok Followers',
  'Google Business Profile Views',
  'Social Media Engagement Rate',
  'Email Open Rate',
  'Google Review Count',
];

const FORBIDDEN_METRICS = [
  'sales', 'revenue', 'profit', 'conversions', 'close rate',
  'appointments booked', 'customers acquired', 'ROI', 'bookings',
];

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await request.json();
    const {
      businessName, contactName, contactEmail, contactPhone, businessAddress,
      city, businessType,
      // Service checkboxes
      serviceWebsite, serviceBackend, serviceSocial,
      // Discovery data
      avgCustomerValue, budgetBeforeResults, currentMarketingSpend,
      painPoint, desiredOutcome, triedBefore, socialGoal,
      meetingCadence, meetingDay, discoveryNotes,
      // Website scope
      websitePages, websiteXmlSitemap, websiteMinImages, websiteMinVideos, websiteLeadCapture,
      // Social scope
      socialSamePostsPerWeek, socialDiffPostsPerWeek, socialPlatforms,
      // Current metrics (for benchmarks)
      currentWebsiteTraffic, currentLeadsPerMonth,
      currentInstagramFollowers, currentFacebookFollowers, currentTiktokFollowers,
      currentGoogleReviews,
      // Overrides
      setupFeeOverride, introMonthlyOverride, standardMonthlyOverride,
      minimumTermOverride, setupPaymentStructure,
    } = body;

    if (!businessName || !contactName || !city || !businessType) {
      return new Response(JSON.stringify({ error: 'businessName, contactName, city, and businessType are required.' }), { status: 400, headers });
    }

    if (!serviceWebsite && !serviceBackend && !serviceSocial) {
      return new Response(JSON.stringify({ error: 'Select at least one service: Website, Backend & Lead Gen, or Social Media.' }), { status: 400, headers });
    }

    const hasSocial = !!serviceSocial;
    const hasWebsite = !!serviceWebsite;
    const hasBackend = !!serviceBackend;
    const custValue = parseFloat(avgCustomerValue) || 0;
    const budget = parseFloat(budgetBeforeResults) || 0;
    const mktSpend = parseFloat(currentMarketingSpend) || 0;

    // Compute minimum term based on services
    let defaultMinTerm = 60;
    if (hasWebsite && !hasBackend && !hasSocial) defaultMinTerm = 30;
    else if (hasWebsite && hasBackend && !hasSocial) defaultMinTerm = 45;
    else if (hasSocial) defaultMinTerm = 60;

    // Generate AI offer
    const aiOffer = await generateGrandSlamOffer({
      businessName, contactName, city, businessType,
      hasWebsite, hasBackend, hasSocial,
      custValue, budget, mktSpend, painPoint, desiredOutcome,
      triedBefore, socialGoal, meetingCadence, meetingDay, discoveryNotes,
      websitePages, websiteXmlSitemap, websiteMinImages, websiteMinVideos, websiteLeadCapture,
      socialSamePostsPerWeek, socialDiffPostsPerWeek, socialPlatforms,
      currentWebsiteTraffic, currentLeadsPerMonth,
      currentInstagramFollowers, currentFacebookFollowers, currentTiktokFollowers,
      currentGoogleReviews,
      defaultMinTerm, budget,
    }, env.ANTHROPIC_API_KEY);

    // Apply overrides if provided
    let setupFee = setupFeeOverride ? parseInt(setupFeeOverride) : aiOffer.setupFee;
    let introMonthly = introMonthlyOverride ? parseInt(introMonthlyOverride) : aiOffer.introMonthly;
    let standardMonthly = standardMonthlyOverride ? parseInt(standardMonthlyOverride) : aiOffer.standardMonthly;
    let minimumTermDays = minimumTermOverride ? parseInt(minimumTermOverride) : (aiOffer.minimumTermDays || defaultMinTerm);
    let setupPayment = setupPaymentStructure || aiOffer.setupPaymentStructure || 'half_upfront';

    // Enforce hard floors
    if (setupFee < MIN_SETUP) setupFee = MIN_SETUP;
    const minMonthly = hasSocial ? MIN_MONTHLY_WITH_SOCIAL : MIN_MONTHLY_NO_SOCIAL;
    if (introMonthly < minMonthly) introMonthly = minMonthly;
    if (standardMonthly <= introMonthly) standardMonthly = Math.max(introMonthly * 3, minMonthly * 3);
    if (minimumTermDays < 30) minimumTermDays = 30;
    if (minimumTermDays > 90) minimumTermDays = 90;

    // Strip forbidden metrics
    let guaranteeMetrics = (aiOffer.guaranteeMetrics || []).filter(m => {
      const lower = (m.metric || '').toLowerCase();
      return !FORBIDDEN_METRICS.some(f => lower.includes(f));
    });

    // Filter metrics to only selected services
    if (!hasWebsite && !hasBackend) {
      guaranteeMetrics = guaranteeMetrics.filter(m => {
        const lower = (m.metric || '').toLowerCase();
        return !lower.includes('website') && !lower.includes('form submission') && !lower.includes('lead');
      });
    }
    if (!hasSocial) {
      guaranteeMetrics = guaranteeMetrics.filter(m => {
        const lower = (m.metric || '').toLowerCase();
        return !lower.includes('instagram') && !lower.includes('facebook') && !lower.includes('tiktok') && !lower.includes('engagement') && !lower.includes('follower');
      });
    }

    const meetingDesc = buildMeetingDescription(meetingCadence, meetingDay);

    const roi = custValue > 0 ? {
      avgCustomerValue: custValue,
      introMonthly,
      breakEvenLeads: Math.ceil(introMonthly / custValue),
      headline: custValue >= introMonthly
        ? `One new customer covers ${Math.floor(custValue / introMonthly)} month${Math.floor(custValue / introMonthly) !== 1 ? 's' : ''} of your intro rate.`
        : `${Math.ceil(introMonthly / custValue)} new customers per month covers your full investment.`,
    } : null;

    // Dates
    const effectiveDate = new Date();
    const termEnd = new Date(effectiveDate);
    termEnd.setDate(termEnd.getDate() + minimumTermDays);
    // Find first Monday on or after effective date for billing
    const firstBillingMonday = new Date(effectiveDate);
    const dow = firstBillingMonday.getDay();
    const daysUntilMonday = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
    firstBillingMonday.setDate(firstBillingMonday.getDate() + daysUntilMonday);

    // Website scope defaults
    const webScope = {
      pages: parseInt(websitePages) || 5,
      xmlSitemap: websiteXmlSitemap !== false && websiteXmlSitemap !== 'false',
      minImages: parseInt(websiteMinImages) || 3,
      minVideos: parseInt(websiteMinVideos) || 1,
      leadCapture: websiteLeadCapture || 'contact_form',
    };

    // Social scope defaults
    const socScope = {
      samePostsPerWeek: parseInt(socialSamePostsPerWeek) || 3,
      diffPostsPerWeek: parseInt(socialDiffPostsPerWeek) || 1,
      platforms: socialPlatforms || (hasSocial ? 'Instagram, Facebook, TikTok' : ''),
    };

    return new Response(JSON.stringify({
      success: true,
      proposal: {
        businessName, contactName, contactEmail: contactEmail || '', contactPhone: contactPhone || '',
        businessAddress: businessAddress || '', city, businessType,
        serviceWebsite: hasWebsite, serviceBackend: hasBackend, serviceSocial: hasSocial,
        offerName: aiOffer.offerName || `${businessName} Growth System`,
        offerTagline: aiOffer.offerTagline || '',
        services: aiOffer.services || [],
        setupFee, introMonthly, standardMonthly, minimumTermDays,
        setupPaymentStructure: setupPayment,
        minimumTermEndDate: termEnd.toISOString(),
        firstBillingMonday: firstBillingMonday.toISOString(),
        guaranteeMetrics,
        painPoints: aiOffer.painPoints || [],
        sellingTips: aiOffer.sellingTips || [],
        nextSteps: aiOffer.nextSteps || [],
        timeline: aiOffer.timeline || [],
        valueStack: aiOffer.valueStack || '',
        roi,
        webScope, socScope,
        meetingCadence: meetingCadence || 'monthly_email',
        meetingDay: meetingDay || '',
        meetingDescription: meetingDesc,
        outOfScopeRate: OUT_OF_SCOPE_RATE,
        effectiveDate: effectiveDate.toISOString(),
        generatedAt: new Date().toISOString(),
      },
    }), { headers });

  } catch (err) {
    console.error('Proposal error:', err.message);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), { status: 500, headers });
  }
}

// ── MEETING DESCRIPTION ──────────────────────────────────────────────────────

function buildMeetingDescription(cadence, day) {
  const dayStr = day ? ` on ${day}s` : '';
  switch (cadence) {
    case 'weekly':
      return `MTM and the Client shall meet once per week${dayStr}, for a maximum of one (1) hour, to review performance, discuss upcoming deliverables, and address change requests. This meeting is the designated channel for change requests and content direction. MTM shall complete approved change requests within seven (7) business days.`;
    case 'biweekly':
      return `MTM and the Client shall meet once every two (2) weeks${dayStr}, for a maximum of thirty (30) minutes, to review performance and address change requests. Between meetings, the Client may submit requests via email. MTM shall address email requests within seven (7) business days.`;
    case 'monthly_email':
    default:
      return `MTM shall deliver a written monthly performance report to the Client via email by the fifth (5th) business day following the close of each billing cycle. The Client may submit change requests via email at any time. MTM shall address email requests within seven (7) business days.`;
  }
}

// ── AI GRAND SLAM OFFER ──────────────────────────────────────────────────────

async function generateGrandSlamOffer(data, apiKey) {
  if (!apiKey) return buildFallbackOffer(data);

  const {
    businessName, contactName, city, businessType,
    hasWebsite, hasBackend, hasSocial,
    custValue, budget, mktSpend, painPoint, desiredOutcome,
    triedBefore, socialGoal, meetingCadence, meetingDay, discoveryNotes,
    websitePages, websiteMinImages, websiteMinVideos, websiteLeadCapture,
    socialSamePostsPerWeek, socialDiffPostsPerWeek,
    currentWebsiteTraffic, currentLeadsPerMonth,
    currentInstagramFollowers, currentFacebookFollowers, currentTiktokFollowers,
    currentGoogleReviews, defaultMinTerm, budget: budgetCeiling,
  } = data;

  const selectedServices = [];
  if (hasWebsite) selectedServices.push('Website Design');
  if (hasBackend) selectedServices.push('Backend & Lead Generation (GoHighLevel CRM)');
  if (hasSocial) selectedServices.push('Social Media Management (filming, editing, posting)');

  const prompt = `You are a sales strategist for More Than Momentum (MTM). You use Alex Hormozi's Grand Slam Offer framework.

VALUE EQUATION: Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort & Sacrifice)

MTM PRICING PLAYBOOK:
- Two tracks: Build & Hand Off (one-time) or Ongoing Partnership (monthly)
- Reference packages: Launch Site ($1,000), Launch System ($1,500), Stay Current ($500/mo), Content Partner ($1,500/mo), Full Momentum ($3,000+$2,500/mo)
- These are REFERENCE POINTS. Build a CUSTOM offer using the Grand Slam framework.
- Intro rate / standard rate model: client pays less until benchmarks hit
- Make the offer so good they feel stupid saying no

SELECTED SERVICES: ${selectedServices.join(' + ')}
${hasWebsite && !hasBackend && !hasSocial ? 'CLIENT ONLY WANTS WEBSITE — no recurring metrics to track on backend/social. Offer structure should be: reduced setup upfront, remaining on completion, then small monthly for updates/maintenance. Performance benchmarks limited to website traffic and form submissions only.' : ''}
${!hasSocial ? 'NO SOCIAL MEDIA — do not include any social metrics in guarantees.' : ''}
${hasSocial ? 'SOCIAL MEDIA INCLUDED — minimum monthly is $2,500 due to manual filming/editing labor.' : ''}

PROSPECT:
- Business: ${businessName} (${businessType}) in ${city}
- Contact: ${contactName}
- Customer value: ${custValue > 0 ? '$' + custValue : 'Unknown'}
- Budget before results: ${budget > 0 ? '$' + budget : 'Unknown'}
- Current marketing spend: ${mktSpend > 0 ? '$' + mktSpend + '/mo' : 'Unknown'}
- Pain: ${painPoint || 'Not specified'}
- Desired outcome: ${desiredOutcome || 'Not specified'}
- Tried before: ${triedBefore || 'Unknown'}
${hasSocial ? '- Social goal: ' + (socialGoal || 'Not specified') : ''}
- Meeting: ${meetingCadence || 'monthly_email'}${meetingDay ? ' on ' + meetingDay + 's' : ''}
${discoveryNotes ? '- Notes: ' + discoveryNotes : ''}

CURRENT METRICS (use these as baselines in benchmarks):
${hasWebsite || hasBackend ? '- Website traffic: ' + (currentWebsiteTraffic || 'Unknown') + ' visitors/month' : ''}
${hasBackend ? '- Leads per month: ' + (currentLeadsPerMonth || 'Unknown') : ''}
${hasSocial ? '- Instagram: ' + (currentInstagramFollowers || 'Unknown') + ' followers' : ''}
${hasSocial ? '- Facebook: ' + (currentFacebookFollowers || 'Unknown') + ' followers' : ''}
${hasSocial ? '- TikTok: ' + (currentTiktokFollowers || 'Unknown') + ' followers' : ''}
- Google reviews: ${currentGoogleReviews || 'Unknown'}

WEBSITE SCOPE (if website selected): ${websitePages || 5} pages, min ${websiteMinImages || 3} images, min ${websiteMinVideos || 1} video, lead capture: ${websiteLeadCapture || 'contact form'}
SOCIAL SCOPE (if social selected): ${socialSamePostsPerWeek || 3} same posts/week cross-posted, ${socialDiffPostsPerWeek || 1} unique posts/week

PRICING RULES:
1. Min setup: $${MIN_SETUP}. Min monthly: $${hasSocial ? MIN_MONTHLY_WITH_SOCIAL : MIN_MONTHLY_NO_SOCIAL}
2. If budget provided ($${budget || 0}), try to keep total upfront cost at or below that
3. Standard monthly = 3-5x intro rate
4. Setup payment: recommend half upfront + half on completion for website-only, or full upfront for ongoing partnerships. But choose what makes the offer irresistible.
5. Default minimum term: ${defaultMinTerm} days

GUARANTEE RULES:
- ONLY metrics from this list: ${ALLOWED_METRICS.join(', ')}
- NEVER guarantee: sales, revenue, profit, close rate, conversions, bookings, appointments, ROI
- Use EXACT baseline numbers from current metrics above. If unknown, write "TBD at first month close"
- Targets must be specific numbers (not just percentages): e.g. "from 500 to 750 visitors/month (+50%)"
- Only include metrics relevant to selected services
- 2-4 metrics maximum

Return ONLY valid JSON:
{
  "offerName": "Compelling name",
  "offerTagline": "One sentence — irresistible",
  "services": [
    { "id": "service_id", "name": "Service", "desc": "2-3 sentences specific to their business — be VERY specific about deliverables, no vague promises", "valueHighlight": "Dollar/outcome value" }
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
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
    });
    const result = await resp.json();
    const text = result.content?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim());
  } catch (err) {
    console.error('Claude offer error:', err.message);
    return buildFallbackOffer(data);
  }
}

// ── FALLBACK ─────────────────────────────────────────────────────────────────

function buildFallbackOffer(data) {
  const services = [];
  if (data.hasWebsite) services.push({ id: 'website', name: 'Website Design & Development', desc: 'Custom-built, mobile-first website with specified page count, images, and lead capture integration.', valueHighlight: 'Your digital storefront' });
  if (data.hasBackend) services.push({ id: 'crm', name: 'GoHighLevel CRM & Lead Automation', desc: 'Configured sales pipeline, automated lead capture, and follow-up sequences via email and SMS.', valueHighlight: 'Automated lead management' });
  if (data.hasSocial) services.push({ id: 'social', name: 'Social Media Management', desc: 'Content filming, editing, and posting across specified platforms at agreed-upon frequency.', valueHighlight: 'Professional content engine' });

  return {
    offerName: `${data.businessName} Growth System`,
    offerTagline: 'Your digital infrastructure — built, managed, and performance-guaranteed.',
    services,
    setupFee: MIN_SETUP,
    introMonthly: data.hasSocial ? MIN_MONTHLY_WITH_SOCIAL : MIN_MONTHLY_NO_SOCIAL,
    standardMonthly: data.hasSocial ? 2500 : 1000,
    minimumTermDays: data.defaultMinTerm || 60,
    setupPaymentStructure: (data.hasWebsite && !data.hasBackend && !data.hasSocial) ? 'half_upfront' : 'full_upfront',
    guaranteeMetrics: [],
    painPoints: ['Every day without a system is leads walking to competitors.'],
    sellingTips: ['AI unavailable — use handbook talking points.'],
    valueStack: 'Combined market value of these services exceeds the standard rate.',
    nextSteps: ['Sign the agreement.', 'Complete brand questionnaire.', 'We start within 48 hours.'],
    timeline: [
      { phase: 'Discovery & Strategy', days: 'Days 1-2', desc: 'Questionnaire, audit, planning.' },
      { phase: 'Build', days: 'Days 3-14', desc: 'Design, development, configuration.' },
      { phase: 'Launch', days: 'Day 21', desc: 'Go live, walkthrough, handoff.' },
    ],
  };
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
