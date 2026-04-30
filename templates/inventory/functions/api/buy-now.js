// Cloudflare Pages Function: /functions/api/buy-now.js

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+1${digits}`;
}

async function findOrCreateContact({ GHL_API_KEY, GHL_LOCATION_ID, firstName, lastName, name, phone, email, source, tags }) {

  const authHeaders = {
    'Authorization': `Bearer ${GHL_API_KEY}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28'
  };

  const addTags = (id) => fetch(`https://services.leadconnectorhq.com/contacts/${id}/tags`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ tags })
  });

  // Step 1: Search by email
  const emailSearch = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`,
    { headers: authHeaders }
  );
  const emailData = await emailSearch.json();
  const byEmail   = emailData.contacts || emailData.data?.contacts || emailData.data || [];
  if (Array.isArray(byEmail) && byEmail[0]?.id) {
    await addTags(byEmail[0].id);
    return byEmail[0].id;
  }

  // Step 2: Try to create new contact (no customFields in POST body — GHL v2 rejects them)
  const createRes  = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ locationId: GHL_LOCATION_ID, firstName, lastName, name, phone, email, source, tags })
  });
  const createData = await createRes.json();

  if (createRes.ok) {
    const contactId = createData.contact?.id || createData.id;
    if (contactId) return contactId;
  }

  // Step 3: Creation failed (likely duplicate) — query search by email
  const querySearch = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(email)}`,
    { headers: authHeaders }
  );
  const queryData = await querySearch.json();
  const byQuery   = queryData.contacts || queryData.data?.contacts || queryData.data || [];
  if (Array.isArray(byQuery) && byQuery[0]?.id) {
    await addTags(byQuery[0].id);
    return byQuery[0].id;
  }

  // Step 4: Final fallback — search by phone
  const phoneSearch = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(phone)}`,
    { headers: authHeaders }
  );
  const phoneData = await phoneSearch.json();
  const byPhone   = phoneData.contacts || phoneData.data?.contacts || phoneData.data || [];
  if (Array.isArray(byPhone) && byPhone[0]?.id) {
    await addTags(byPhone[0].id);
    return byPhone[0].id;
  }

  throw new Error(createData.message || 'Could not find or create contact');
}

async function updateCartModel({ GHL_API_KEY, contactId, cartModel }) {
  try {
    const updateRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        customFields: [{ key: 'cart_model', field_value: cartModel }]
      })
    });
    const updateBody = await updateRes.json().catch(() => ({}));
    if (updateRes.ok) {
      console.log('[{{LOG_PREFIX}}] cart_model saved — value:', cartModel, '| contact:', contactId);
    } else {
      console.warn('[{{LOG_PREFIX}}] cart_model PUT failed:', updateRes.status, JSON.stringify(updateBody));
    }
  } catch (err) {
    console.warn('[{{LOG_PREFIX}}] updateCartModel error (non-fatal):', err.message);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await request.json();
    const { name, phone, email, cart_name } = body;

    if (!name || !phone || !email || !cart_name) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers }
      );
    }

    const GHL_API_KEY     = env.GHL_API_KEY;
    const GHL_LOCATION_ID = env.GHL_LOCATION_ID;

    // Dev mode fallback — return success without hitting GHL
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      console.log('[{{LOG_PREFIX}} Dev] Buy Now (dev mode):', { name, phone, email, cart_name });
      return new Response(
        JSON.stringify({
          success: true,
          dev: true,
          redirect_url: 'https://app.gohighlevel.com/v2/preview/qPVa56oMoBenJjCgLeyx'
        }),
        { status: 200, headers }
      );
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName  = nameParts.slice(1).join(' ') || '';
    const e164Phone = formatPhone(phone);

    // Step 1: Find or create contact in GHL
    // Explicitly pass `name` (full name) so GHL assembles contact.full_name correctly —
    // relying on firstName + lastName alone can leave full_name blank in some GHL versions.
    const contactId = await findOrCreateContact({
      GHL_API_KEY,
      GHL_LOCATION_ID,
      firstName,
      lastName,
      name,          // full name string — ensures {{contact.full_name}} is populated in GHL
      phone: e164Phone,
      email,
      source: '{{BUSINESS_NAME}} Website - Buy Now',
      tags:   ['website-lead', 'cart-buyer'],
    });

    // Step 2: Update cart_model custom field on the contact
    // Step 2: Update cart_model custom field — non-fatal so a field lookup
    // failure never blocks the purchase redirect.
    try {
      await updateCartModel({ GHL_API_KEY, contactId, cartModel: cart_name });
    } catch (fieldErr) {
      console.warn('[{{LOG_PREFIX}}] cart_model update failed (non-fatal):', fieldErr.message);
    }

    // Step 3: Add a note to the contact with full purchase details.
    // This gives {{OWNER_FIRST}} a reliable fallback on the contact record in GHL
    // even if the workflow email template has variable issues.
    const noteBody = [
      '=== CART DEPOSIT RECEIVED ===',
      `Cart:    ${cart_name}`,
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Phone:   ${e164Phone}`,
      `Source:  {{BUSINESS_NAME}} Website - Buy Now`,
      '==============================',
    ].join('\n');

    const noteRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({ userId: contactId, body: noteBody })
    });
    if (!noteRes.ok) console.warn('[{{LOG_PREFIX}}] Could not add note:', await noteRes.text());

    // Step 4: Return checkout funnel URL — GHL workflow handles payment + pickup calendar
    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: 'https://app.gohighlevel.com/v2/preview/qPVa56oMoBenJjCgLeyx'
      }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error('[{{LOG_PREFIX}}] buy-now error:', err.message);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Something went wrong. Please try again or call us at {{PHONE}}.'
      }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
