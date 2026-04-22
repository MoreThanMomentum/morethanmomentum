/**
 * MTM Call Notes Fetcher — Pages Function
 * Route: GET /api/get-call-notes
 *
 * Returns the rolling call history (up to 5 most recent calls).
 *
 * Query params:
 *   ?id=call_xxx  — returns a single specific call by ID
 *   (none)        — returns the full array of recent calls
 *
 * Environment Variables Required:
 *   MTM_CLIENT_PROFILES — KV namespace binding
 */

export async function onRequestGet(context) {
  const { env, request } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    if (!env.MTM_CLIENT_PROFILES) {
      return new Response(JSON.stringify({ error: 'KV not configured.' }), { status: 500, headers });
    }

    const raw = await env.MTM_CLIENT_PROFILES.get('session:call_history');

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

    // Check if a specific call ID was requested
    const url = new URL(request.url);
    const requestedId = url.searchParams.get('id');

    if (requestedId) {
      const call = calls.find(c => c.id === requestedId);
      if (!call) {
        return new Response(JSON.stringify({ success: false, reason: 'Call not found.' }), { status: 404, headers });
      }
      return new Response(JSON.stringify({ success: true, call }), { headers });
    }

    // Return full history
    return new Response(JSON.stringify({ success: true, calls, count: calls.length }), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
