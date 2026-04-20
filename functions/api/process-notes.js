/**
 * MTM Call Notes Processor — Pages Function
 * Route: POST /api/process-notes
 *
 * Recall.ai webhook handler. When a Google Meet ends:
 *   1. Recall.ai sends transcript payload to this endpoint
 *   2. Worker extracts structured Tool 02 fields via Claude
 *   3. Result stored in KV under 'session:latest_call_notes'
 *   4. Tools dashboard shows "Load from Last Call" button in Tool 02
 *
 * Environment Variables Required:
 *   RECALL_AI_API_KEY         — Recall.ai API key
 *   RECALL_AI_WEBHOOK_SECRET  — Webhook secret for signature verification (optional but recommended)
 *   ANTHROPIC_API_KEY         — MTM Anthropic key
 *   MTM_CLIENT_PROFILES       — KV namespace binding (already exists)
 *
 * Recall.ai setup:
 *   1. Create account at recall.ai
 *   2. Go to Webhooks → Add webhook URL: https://morethanmomentum.com/api/process-notes
 *   3. Subscribe to: bot.done event
 *   4. Copy webhook secret → RECALL_AI_WEBHOOK_SECRET env var
 *   5. Copy API key → RECALL_AI_API_KEY env var
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const rawBody = await request.text();

    // Verify webhook signature if secret is configured
    if (env.RECALL_AI_WEBHOOK_SECRET) {
      const signature = request.headers.get('X-Recall-Signature') || request.headers.get('recall-signature');
      if (signature) {
        const isValid = await verifySignature(rawBody, signature, env.RECALL_AI_WEBHOOK_SECRET);
        if (!isValid) {
          console.warn('Recall.ai signature verification failed');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers });
        }
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event || payload.data?.status;

    // Only process completed bot calls
    if (event !== 'bot.done' && event !== 'done' && payload.data?.status?.code !== 'done') {
      return new Response(JSON.stringify({ received: true, action: 'ignored', event }), { headers });
    }

    const botData = payload.data || payload;
    const transcript = extractTranscript(botData);

    if (!transcript || transcript.length < 50) {
      return new Response(JSON.stringify({ received: true, action: 'ignored', reason: 'transcript too short' }), { headers });
    }

    // Extract Tool 02 fields via Claude
    const fields = await extractCallFields(transcript, env.ANTHROPIC_API_KEY);

    // Store in KV with timestamp
    const stored = {
      fields,
      transcript: transcript.slice(0, 3000), // store first 3000 chars for context
      botId: botData.id || botData.bot_id || 'unknown',
      processedAt: new Date().toISOString(),
    };

    if (env.MTM_CLIENT_PROFILES) {
      await env.MTM_CLIENT_PROFILES.put('session:latest_call_notes', JSON.stringify(stored));
    }

    return new Response(JSON.stringify({ success: true, fieldsExtracted: Object.keys(fields).length }), { headers });

  } catch (err) {
    console.error('Process notes error:', err.message);
    return new Response(JSON.stringify({ error: 'Processing failed.' }), { status: 500, headers });
  }
}

// ── TRANSCRIPT EXTRACTION ─────────────────────────────────────────────────────

function extractTranscript(botData) {
  // Handle various Recall.ai response formats
  const transcript = botData.transcript || botData.transcription || [];

  if (Array.isArray(transcript)) {
    // Array of {speaker, words} or {speaker, text} objects
    return transcript.map(seg => {
      const speaker = seg.speaker || 'Speaker';
      const text = seg.text || (Array.isArray(seg.words) ? seg.words.map(w => w.text || w.word).join(' ') : '');
      return `${speaker}: ${text}`;
    }).join('\n');
  }

  if (typeof transcript === 'string') return transcript;

  // Try nested path
  const raw = botData?.output?.[0]?.transcript;
  if (Array.isArray(raw)) {
    return raw.map(s => `${s.speaker||'Speaker'}: ${s.words?.map(w=>w.text).join(' ')||''}`).join('\n');
  }

  return '';
}

// ── CLAUDE FIELD EXTRACTION ───────────────────────────────────────────────────

async function extractCallFields(transcript, apiKey) {
  if (!apiKey) {
    return { error: 'ANTHROPIC_API_KEY not configured', rawTranscript: transcript.slice(0, 500) };
  }

  const prompt = `You are analyzing a sales discovery call transcript for More Than Momentum (MTM), a digital marketing agency.

Extract the following information from the transcript and return ONLY a JSON object. Use null for fields not mentioned.

Required fields:
{
  "businessName": "prospect's business name if mentioned",
  "contactName": "prospect's name",
  "city": "their city and state",
  "businessType": "type of business (HVAC, Plumbing, Gym, etc.)",
  "avgCustomerValue": "average job/customer value in dollars (number only, no $)",
  "budgetBeforeResults": "how much they're willing to spend before seeing results (number only)",
  "currentMarketingSpend": "current monthly marketing spend (number only)",
  "painPoint": "their #1 pain — pick closest: 'Losing leads — no follow-up system' | 'Website doesn't reflect business quality' | 'No online presence at all' | 'Inconsistent or zero social media' | 'Need more leads / customers' | 'Bad experience with previous agency' | 'Don't have time to manage marketing' | 'Other'",
  "desiredOutcome": "what outcome they said would make them say yes",
  "triedBefore": "what they've tried — pick closest: 'Nothing' | 'DIY social media' | 'Hired an agency before' | 'Hired a freelancer' | 'Ran paid ads' | 'Built own website' | 'Multiple things'",
  "socialGoal": "if social media mentioned: 'leads' | 'brand' | 'both'",
  "meetingCadence": "'weekly' | 'biweekly' | 'monthly_email'",
  "currentWebsiteTraffic": "monthly website visitors (number only)",
  "currentLeadsPerMonth": "leads per month (number only)",
  "currentInstagramFollowers": "Instagram followers (number only)",
  "currentFacebookFollowers": "Facebook followers (number only)",
  "currentGoogleReviews": "Google review count (number only)",
  "serviceInterests": {
    "website": true/false,
    "backend": true/false,
    "social": true/false
  },
  "discoveryNotes": "any other important context from the call (max 300 chars)"
}

TRANSCRIPT:
${transcript.slice(0, 4000)}

Return ONLY valid JSON. No markdown. No backticks. No explanation.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await resp.json();
    const text = data.content?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim());
  } catch (err) {
    console.error('Claude extraction error:', err.message);
    return { error: 'Extraction failed', rawTranscript: transcript.slice(0, 500) };
  }
}

// ── SIGNATURE VERIFICATION ────────────────────────────────────────────────────

async function verifySignature(body, signature, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = hexToBytes(signature.replace('sha256=', ''));
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
  } catch { return false; }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i/2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
