// ============================================================
// MTM — submit-lead.js
// Cloudflare Pages Function: /functions/submit-lead.js
// URL path: https://morethanmomentum.com/submit-lead
//
// Replaces Formspree. Receives form submissions from all MTM
// lead capture points (hero form, contact form, slide-in,
// pricing modal, exit intent) and creates a GHL contact.
// The "Contact Created" workflow in GHL fires automatically
// from there — tag, SMS, email, pipeline card, notification.
//
// Required environment variables (set in Cloudflare Pages
// Settings → Environment Variables):
//   GHL_API_KEY      — GHL API key (MTM sub-account)
//   GHL_LOCATION_ID  — GHL Location ID (MTM sub-account)
// ============================================================

const ALLOWED_ORIGIN = 'https://morethanmomentum.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Content-Type': 'application/json',
};

// ── PREFLIGHT (OPTIONS) ───────────────────────────────────
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}

// ── MAIN HANDLER (POST) ───────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // ── Parse incoming form data ──────────────────────────
    const formData = await request.formData();

    const raw = {
      name:     (formData.get('name')     || '').trim(),
      email:    (formData.get('email')    || '').trim(),
      phone:    (formData.get('phone')    || '').trim(),
      business: (formData.get('business') || '').trim(),
      service:  (formData.get('service')  || '').trim(),
      message:  (formData.get('message')  || '').trim(),
      plan:     (formData.get('plan')     || '').trim(),
      source:   (formData.get('_source')  || 'website').trim(),
      page:     (formData.get('_page')    || '/').trim(),
    };

    // ── Validate ──────────────────────────────────────────
    if (!raw.email || !raw.email.includes('@')) {
      return jsonResponse({ error: 'Valid email is required' }, 400);
    }

    // ── Split name into first / last ──────────────────────
    const parts     = raw.name.split(' ').filter(Boolean);
    const firstName = parts[0]  || 'Unknown';
    const lastName  = parts.slice(1).join(' ') || '';

    // ── Build tags array ──────────────────────────────────
    // Tag every lead with source so you can filter in GHL
    const tags = ['inbound-lead', raw.source];
    if (raw.service) tags.push(`interest-${raw.service.toLowerCase().replace(/\s+/g, '-')}`);
    if (raw.plan)    tags.push(`plan-${raw.plan.toLowerCase().replace(/\s+/g, '-')}`);

    // ── GHL contact payload ───────────────────────────────
    // GHL API v2 rule: NEVER include customField arrays or
    // notes in POST body — the API rejects the entire request.
    const contactPayload = {
      locationId: env.GHL_LOCATION_ID_MTM,
      firstName,
      lastName,
      email:      raw.email,
      source:     'website',
      tags,
    };

    // Only include optional fields if they have values
    if (raw.phone)    contactPayload.phone       = raw.phone;
    if (raw.business) contactPayload.companyName = raw.business;

    // ── Create contact in GHL ─────────────────────────────
    const ghlRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GHL_API_KEY_MTM}`,
        'Version':       '2021-07-28',
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(contactPayload),
    });

    // Log GHL errors to Cloudflare dashboard without
    // exposing them to the user — always return 200 to
    // the browser so the form shows a success state.
    if (!ghlRes.ok) {
      const errorBody = await ghlRes.text();
      console.error(`GHL API ${ghlRes.status}: ${errorBody}`);
      console.error('Payload was:', JSON.stringify(contactPayload));
      // Still return success — the lead is logged in console
      // and you can investigate from the Cloudflare dashboard.
    } else {
      const ghlData = await ghlRes.json();
      console.log(`GHL contact created: ${ghlData?.contact?.id} — ${raw.email} (${raw.source})`);
    }

    return jsonResponse({ success: true }, 200);

  } catch (err) {
    console.error('submit-lead unexpected error:', err.message);
    return jsonResponse({ error: 'Server error — please try again' }, 500);
  }
}

// ── HELPER ────────────────────────────────────────────────
function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}
