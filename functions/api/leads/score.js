/**
 * MTM Tool 07 — AI Scoring Worker
 * Route: POST /api/leads/score
 *
 * Pulls up to `batchSize` (default 10, max 25) unscored leads from D1, fetches
 * each website (10s timeout), and scores it via Anthropic claude-sonnet-4-20250514.
 * Writes score + tier + reason + scored_at back to D1. Logs the run in
 * scoring_runs.
 *
 * Body (optional):
 *   { batchSize?: 10, leadIds?: [1,2,3] }
 *     leadIds — re-score specific rows even if already scored.
 *
 * Returns:
 *   { success: true, runId, attempted, scored, failed, results: [...] }
 *
 * Environment Variables:
 *   ADMIN_PASSWORD_HASH | TOOLS_PASSWORD_HASH — auth (Bearer)
 *   ANTHROPIC_API_KEY — MTM's Anthropic key
 *   DB — D1 binding
 */

import { jsonResponse, corsPreflight, requireAdmin, requireDb } from './_auth.js';

export const onRequestOptions = () => corsPreflight();

const MODEL          = 'claude-sonnet-4-6';
const MAX_BATCH      = 25;
const FETCH_TIMEOUT  = 10_000;            // ms
const HTML_CHAR_CAP  = 12_000;            // truncated body sent to Claude

const SCORING_SYSTEM = `You are a digital marketing analyst evaluating a small local business website for an agency called More Than Momentum. Score this website from 0 to 100 based on how urgently this business needs a new website and digital marketing help. A higher score means they need more help — they are a hotter lead. Evaluate based on these criteria and their point values:

- No mobile responsiveness or poor mobile layout: +25 points
- No visible lead capture form or contact CTA: +20 points
- Visually outdated design (looks like it was built before 2018): +20 points
- No clear value proposition or confusing messaging: +15 points
- Missing or broken pages, slow load indicators, placeholder content: +10 points
- No social media links or dead social links: +5 points
- No SSL / not HTTPS: +5 points

Return a JSON object only — no preamble, no markdown. Format: {"score": integer, "reason": "one sentence explaining the top issues found"}`;

export async function onRequestPost(context) {
  const { request, env } = context;

  const authErr = requireAdmin(request, env); if (authErr) return authErr;
  const dbErr   = requireDb(env);             if (dbErr)   return dbErr;
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY env var missing.' }, { status: 500 });
  }

  let body = {};
  try { body = await request.json(); } catch { /* empty body OK */ }
  const batchSize = Math.min(Math.max(parseInt(body.batchSize || 10, 10) || 10, 1), MAX_BATCH);
  const explicitIds = Array.isArray(body.leadIds) ? body.leadIds.filter(n => Number.isInteger(n)) : null;

  // Fetch the work set
  let leads;
  try {
    if (explicitIds && explicitIds.length) {
      const placeholders = explicitIds.map(() => '?').join(',');
      const r = await env.DB.prepare(
        `SELECT id, business_name, website_url FROM leads_outreach WHERE id IN (${placeholders})`
      ).bind(...explicitIds).all();
      leads = r.results || [];
    } else {
      const r = await env.DB.prepare(
        `SELECT id, business_name, website_url
         FROM leads_outreach
         WHERE score IS NULL
         ORDER BY id ASC
         LIMIT ?`
      ).bind(batchSize).all();
      leads = r.results || [];
    }
  } catch (err) {
    return jsonResponse({ error: 'Could not load lead batch: ' + err.message }, { status: 500 });
  }

  if (!leads.length) {
    return jsonResponse({ success: true, attempted: 0, scored: 0, failed: 0, results: [], message: 'No unscored leads.' });
  }

  // Begin run log
  let runId = null;
  try {
    const runRes = await env.DB.prepare(
      `INSERT INTO scoring_runs (batch_size, attempted) VALUES (?, ?) RETURNING id`
    ).bind(leads.length, leads.length).first();
    runId = runRes?.id || null;
  } catch { /* scoring_runs table is optional */ }

  const results = [];
  let scored_ok = 0, scored_failed = 0;

 // Process leads in chunks of 5 to stay under Anthropic rate limits.
  for (let i = 0; i < leads.length; i += 5) {
    const chunk = leads.slice(i, i + 5);
    await Promise.all(chunk.map(async (lead) => {
      try {
        const out = await scoreOne(lead, env);
        await env.DB.prepare(
          `UPDATE leads_outreach
           SET score = ?, tier = ?, score_reason = ?, scored_at = datetime('now'),
           email = CASE WHEN email IS NULL AND ? IS NOT NULL THEN ? ELSE email END
           WHERE id = ?`
        ).bind(out.score, out.tier, out.reason, out.email, out.email, lead.id).run();
        results.push({ id: lead.id, business_name: lead.business_name, ok: true, ...out });
        scored_ok++;
      } catch (err) {
        results.push({ id: lead.id, business_name: lead.business_name, ok: false, error: err.message });
        scored_failed++;
      }
    }));
  }

  // Close run log
  if (runId) {
    try {
      await env.DB.prepare(
        `UPDATE scoring_runs SET finished_at = datetime('now'), scored_ok = ?, scored_failed = ? WHERE id = ?`
      ).bind(scored_ok, scored_failed, runId).run();
    } catch { /* non-fatal */ }
  }

  return jsonResponse({
    success: true,
    runId,
    attempted: leads.length,
    scored: scored_ok,
    failed: scored_failed,
    results,
  });
}

/* ────────────────────── core scoring ────────────────────── */

async function scoreOne(lead, env) {
  const url = lead.website_url ? String(lead.website_url).trim() : '';

  // Rule 1: no website → base score 85
  if (!url) {
    return finalize(85, 'No website found.');
  }

  // Rule 2: try to fetch the site (with timeout). Failure → score 80
  let html = '';
  let isHttps = /^https:\/\//i.test(url);
  try {
    html = await fetchWithTimeout(url, FETCH_TIMEOUT);
  } catch {
    return finalize(80, 'Site unreachable — likely outdated or broken.');
  }
  const extractedEmail = extractEmails(html); // extract before truncation

  // Rule 3: pass HTML to Claude for scoring
  const truncated = stripAndTrim(html, HTML_CHAR_CAP);
  const userMsg = `Business: ${lead.business_name}
URL: ${url}
HTTPS: ${isHttps ? 'yes' : 'no'}

HTML (truncated to ${HTML_CHAR_CAP} chars):
${truncated}`;

  const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: SCORING_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!apiRes.ok) {
    const txt = await apiRes.text().catch(() => '');
    throw new Error(`Anthropic API ${apiRes.status}: ${txt.slice(0, 200)}`);
  }

  const json = await apiRes.json();
  const content = (json.content && json.content[0] && json.content[0].text) || '';
  const parsed = extractJson(content);
  if (!parsed || typeof parsed.score !== 'number') {
    throw new Error('Could not parse score JSON from model output: ' + content.slice(0, 200));
  }
  let score = Math.max(0, Math.min(100, Math.round(parsed.score)));

  // Add the +5 HTTPS bump if the site doesn't have HTTPS but Claude missed it
  if (!isHttps && !/https/i.test(parsed.reason || '')) {
    score = Math.min(100, score + 5);
  }

  return finalize(score, (parsed.reason || '').toString().slice(0, 400), extractedEmail);
}

function finalize(score, reason, email = null) {
  const tier = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';
  return { score, tier, reason, email };
}

/* ────────────────────── helpers ────────────────────── */

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MTM-LeadScorer/1.0; +https://morethanmomentum.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function stripAndTrim(html, cap) {
  // Remove scripts/styles/comments to reduce noise sent to the model.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > cap ? cleaned.slice(0, cap) : cleaned;
}

function extractJson(text) {
  if (!text) return null;
  // direct attempt
  try { return JSON.parse(text); } catch {}
  // strip markdown fences then retry
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  // first {...} substring
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function extractEmails(html) {
  const matches = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return null;
  const filtered = [...new Set(matches)].filter(e =>
    !e.includes('sentry') &&
    !e.includes('example') &&
    !e.includes('domain') &&
    !e.includes('wix') &&
    !e.includes('wordpress') &&
    !e.includes('schema') &&
    !e.includes('jquery') &&
    !e.includes('@2x') &&
    !e.includes('.png') &&
    !e.includes('.jpg') &&
    !e.includes('.svg')
  );
  return filtered[0] || null;
}
