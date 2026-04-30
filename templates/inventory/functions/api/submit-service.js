// Cloudflare Pages Function: /functions/api/submit-service.js

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+1${digits}`;
}

async function findOrCreateContact({ GHL_API_KEY, GHL_LOCATION_ID, firstName, lastName, phone, email, source, tags }) {

  const authHeaders = { 'Authorization': `Bearer ${GHL_API_KEY}`, 'Content-Type': 'application/json', 'Version': '2021-07-28' };

  const addTags = (id) => fetch(`https://services.leadconnectorhq.com/contacts/${id}/tags`, {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ tags })
  });

  // Step 1: Search by email field
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

  // Step 2: Try to create new contact
  const createRes  = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ locationId: GHL_LOCATION_ID, firstName, lastName, phone, email, source, tags })
  });
  const createData = await createRes.json();

  if (createRes.ok) {
    const contactId = createData.contact?.id || createData.id;
    if (contactId) return contactId;
  }

  // Step 3: Creation failed (duplicate) — general query search by email
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

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await request.json();
    const { name, phone, email, description } = body;

    if (!name || !phone || !email || !description) {
      return new Response(JSON.stringify({ success: false, message: 'Missing required fields' }), { status: 400, headers });
    }

    const GHL_API_KEY     = env.GHL_API_KEY;
    const GHL_LOCATION_ID = env.GHL_LOCATION_ID;

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      console.log('[{{LOG_PREFIX}} Dev] Service request (dev mode):', { name, phone, email, description });
      return new Response(JSON.stringify({ success: true, dev: true }), { status: 200, headers });
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName  = nameParts.slice(1).join(' ') || '';
    const e164Phone = formatPhone(phone);

    const contactId = await findOrCreateContact({
      GHL_API_KEY, GHL_LOCATION_ID,
      firstName, lastName,
      phone: e164Phone, email,
      source: '{{BUSINESS_NAME}} Website - Service Request',
      tags:   ['website-lead', 'service-request'],
    });

    // Save as a Note on the contact timeline
    const noteRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GHL_API_KEY}`, 'Content-Type': 'application/json', 'Version': '2021-07-28' },
      body: JSON.stringify({
        userId: contactId,
        body:   `SERVICE REQUEST\n\nIssue Description:\n${description}`,
      })
    });
    if (!noteRes.ok) console.warn('[{{LOG_PREFIX}}] Could not add note:', await noteRes.text());

    // Write description to Service Description custom field
    const fieldRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${GHL_API_KEY}`, 'Content-Type': 'application/json', 'Version': '2021-07-28' },
      body: JSON.stringify({
        customFields: [
          { key: 'service_description', field_value: description }
        ]
      })
    });
    if (!fieldRes.ok) console.warn('[{{LOG_PREFIX}}] Could not update service_description field:', await fieldRes.text());

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('[{{LOG_PREFIX}}] submit-service error:', err.message);
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
  });
}
