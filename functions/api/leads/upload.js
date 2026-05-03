/**
 * MTM Tool 07 — Lead Upload Endpoint
 * Route: POST /api/leads/upload
 *
 * Accepts a JSON body with one of:
 *   { format: "csv",  data: "<raw CSV text>", batch?: "<label>" }
 *   { format: "json", data: [ {...lead}, ... ],  batch?: "<label>" }
 *
 * Expected columns / fields (case-insensitive, flexible mapping):
 *   business_name | name | title          → business_name  (REQUIRED)
 *   category      | type | industry       → category
 *   address       | street | location     → address
 *   phone         | tel | phone_number    → phone
 *   website       | website_url | url     → website_url
 *   email         | contact_email         → email
 *
 * Returns: { success: true, inserted: N, skipped: N, errors: [...] }
 *
 * Environment Variables:
 *   ADMIN_PASSWORD_HASH | TOOLS_PASSWORD_HASH — auth (Bearer token)
 *   DB — D1 binding pointing at the mtm_outreach database
 */

import { jsonResponse, corsPreflight, requireAdmin, requireDb } from './_auth.js';

export const onRequestOptions = () => corsPreflight();

export async function onRequestPost(context) {
  const { request, env } = context;

  const authErr = requireAdmin(request, env); if (authErr) return authErr;
  const dbErr   = requireDb(env);             if (dbErr)   return dbErr;

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const { format, data, batch } = body || {};
  if (!format || !data) {
    return jsonResponse({ error: 'Body must include `format` ("csv" | "json") and `data`.' }, { status: 400 });
  }

  let rows;
  try {
    rows = format === 'csv' ? parseCsv(data) : normalizeJsonRows(data);
  } catch (err) {
    return jsonResponse({ error: 'Failed to parse input: ' + err.message }, { status: 400 });
  }

  if (!rows.length) {
    return jsonResponse({ error: 'No rows found after parsing input.' }, { status: 400 });
  }

  // Pull the opt-out list once so we can suppress on import.
  const optOuts = new Set();
  try {
    const r = await env.DB.prepare('SELECT email FROM opt_outs').all();
    (r.results || []).forEach(o => o.email && optOuts.add(String(o.email).toLowerCase()));
  } catch { /* opt_outs table is optional in early use */ }

  const insertStmt = env.DB.prepare(
    `INSERT INTO leads_outreach
      (business_name, category, address, phone, website_url, email, source_batch)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  let inserted = 0, skipped = 0;
  const errors = [];
  const batchLabel = (batch || '').toString().slice(0, 80) || null;

  // D1 batch — wraps inserts in a single transaction for speed and atomicity.
  const stmts = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.business_name || '').trim();
    if (!name) { skipped++; errors.push({ row: i + 1, reason: 'Missing business_name' }); continue; }

    const email = (row.email || '').trim().toLowerCase() || null;
    if (email && optOuts.has(email)) { skipped++; errors.push({ row: i + 1, reason: 'Email previously opted out' }); continue; }

    stmts.push(insertStmt.bind(
      name,
      (row.category || '').trim() || null,
      (row.address || '').trim() || null,
      (row.phone || '').trim() || null,
      normalizeUrl(row.website_url),
      email,
      batchLabel
    ));
  }

  try {
    if (stmts.length) {
      await env.DB.batch(stmts);
      inserted = stmts.length;
    }
  } catch (err) {
    return jsonResponse(
      { error: 'D1 insert failed. Did you run the migration? Detail: ' + err.message },
      { status: 500 }
    );
  }

  return jsonResponse({ success: true, inserted, skipped, errors: errors.slice(0, 25) });
}

/* ────────────────────── helpers ────────────────────── */

function normalizeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).toString(); } catch { return null; }
}

function normalizeJsonRows(arr) {
  if (!Array.isArray(arr)) throw new Error('JSON `data` must be an array of objects.');
  return arr.map(o => mapKeys(o || {}));
}

const KEY_MAP = {
  business_name: ['business_name', 'name', 'title', 'business'],
  category:      ['category', 'type', 'industry', 'business_type'],
  address:       ['address', 'street', 'location', 'full_address'],
  phone:         ['phone', 'phone_number', 'tel', 'telephone'],
  website_url:   ['website_url', 'website', 'url', 'site'],
  email:         ['email', 'contact_email', 'business_email', 'mail'],
};

function mapKeys(obj) {
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase().trim()] = obj[k];
  const out = {};
  for (const [target, aliases] of Object.entries(KEY_MAP)) {
    for (const a of aliases) {
      if (lower[a] != null && lower[a] !== '') { out[target] = lower[a]; break; }
    }
  }
  return out;
}

/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, embedded commas,
 * embedded newlines inside quotes, and double-quote escaping ("").
 */
function parseCsv(text) {
  const t = text.replace(/^﻿/, ''); // strip BOM
  const rows = [];
  let cur = [], field = '', inQ = false, i = 0;
  while (i < t.length) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { cur.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; i++; continue; }
    field += c; i++;
  }
  // Tail
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];

  const header = rows.shift().map(h => h.toLowerCase().trim());
  return rows
    .filter(r => r.some(v => v && v.trim() !== ''))
    .map(r => {
      const obj = {};
      header.forEach((h, idx) => obj[h] = (r[idx] != null ? r[idx] : '').trim());
      return mapKeys(obj);
    });
}
