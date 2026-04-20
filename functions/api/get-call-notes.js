/**
 * MTM Call Notes Fetcher — Pages Function
 * Route: GET /api/get-call-notes
 *
 * Returns the latest extracted call notes from KV for pre-filling Tool 02.
 *
 * Also handles:
 *   POST /api/create-bot — starts a Recall.ai bot for a Google Meet URL
 *
 * Environment Variables Required:
 *   MTM_CLIENT_PROFILES  — KV namespace binding
 *   RECALL_AI_API_KEY    — Recall.ai API key
 */

export async function onRequestGet(context) {
  const { env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    if (!env.MTM_CLIENT_PROFILES) {
      return new Response(JSON.stringify({ error: 'KV not configured.' }), { status: 500, headers });
    }

    const raw = await env.MTM_CLIENT_PROFILES.get('session:latest_call_notes');
    if (!raw) {
      return new Response(JSON.stringify({ success: false, reason: 'No call notes found. Run a meeting with the Recall.ai bot first.' }), { headers });
    }

    const data = JSON.parse(raw);
    return new Response(JSON.stringify({ success: true, ...data }), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
