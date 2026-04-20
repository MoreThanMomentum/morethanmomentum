/**
 * MTM Recall.ai Bot Creator — Pages Function
 * Route: POST /api/create-bot
 *
 * Starts a Recall.ai bot that joins a Google Meet URL,
 * records the transcript, and fires a webhook to /api/process-notes
 * when the call ends.
 *
 * Environment Variables Required:
 *   RECALL_AI_API_KEY — Recall.ai API key
 *
 * Accepts: { meetingUrl: "https://meet.google.com/..." }
 * Returns: { success: true, botId, message }
 */

const RECALL_API = 'https://us-east-1.recall.ai/api/v1';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const { meetingUrl } = await request.json();

    if (!meetingUrl || !meetingUrl.includes('meet.google.com')) {
      return new Response(JSON.stringify({ error: 'Valid Google Meet URL required.' }), { status: 400, headers });
    }

    if (!env.RECALL_AI_API_KEY) {
      return new Response(JSON.stringify({ error: 'RECALL_AI_API_KEY not configured in Cloudflare environment variables.' }), { status: 500, headers });
    }

    const resp = await fetch(`${RECALL_API}/bot/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${env.RECALL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: 'MTM Notes',
        transcription_options: {
          provider: 'default', // uses Recall's built-in transcription
        },
        webhook_url: 'https://morethanmomentum.com/api/process-notes',
        // Bot joins ~30 seconds after creation
        join_at: null, // null = join immediately
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('Recall.ai bot creation failed:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.detail || data.message || 'Bot creation failed.' }), { status: resp.status, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      botId: data.id,
      message: 'MTM Notes bot is joining the meeting. It will appear as "MTM Notes" in your participant list. When the call ends, notes will automatically appear in Tool 02.',
    }), { headers });

  } catch (err) {
    console.error('Create bot error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
