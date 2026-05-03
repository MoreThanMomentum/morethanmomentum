/**
 * MTM Tool 07 — Source Leads from Google Places (New)
 * Route: POST /api/leads/source
 *
 * What it does:
 *   1. Geocodes the user-supplied location string (e.g. "Keene, NH") via the
 *      Google Geocoding API to get a lat/lng centre point.
 *   2. Calls Google Places API (New) /v1/places:searchText with a circular
 *      locationBias around that centre and the user-chosen radius.
 *   3. Maps each returned place to the leads_outreach schema.
 *   4. De-duplicates against (a) opt_outs (matched on business_name OR phone)
 *      and (b) existing leads_outreach rows with the same business_name AND
 *      address.
 *   5. Inserts the survivors via batched D1 INSERTs (≤25 per batch).
 *   6. Returns counts + the inserted business objects so the UI can render a
 *      preview table immediately.
 *
 * Body:
 *   {
 *     "searchTerm": "HVAC",            // required — also used as the category
 *     "location":   "Keene, NH",       // required — free text city/state
 *     "radius":     40000,             // optional — meters, default 40000 (~25mi)
 *     "maxResults": 20                 // optional — 1-60, default 20
 *   }
 *
 * Returns:
 *   {
 *     "success": true,
 *     "pulled": 20,
 *     "inserted": 14,
 *     "skipped_duplicate": 4,
 *     "skipped_optout": 2,
 *     "businesses": [ { id, business_name, category, address, phone,
 *                       website_url, email } ]
 *   }
 *
 * Environment Variables Required:
 *   ADMIN_PASSWORD_HASH | TOOLS_PASSWORD_HASH — auth (Bearer token)
 *   GOOGLE_PLACES_API_KEY — single Google Cloud API key with Places API (New)
 *                           AND Geocoding API enabled. Set as a Secret in
 *                           Cloudflare Pages → Settings → Environment vars.
 *   DB — D1 binding pointing at the mtm_outreach database
 */

import { jsonResponse, corsPreflight, requireAdmin, requireDb } from './_auth.js';

export const onRequestOptions = () => corsPreflight();

const PLACES_URL    = 'https://places.googleapis.com/v1/places:searchText';
const GEOCODE_URL   = 'https://maps.googleapis.com/maps/api/geocode/json';
const FIELD_MASK    = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.primaryTypeDisplayName',
].join(',');

const DEFAULT_RADIUS = 40000;        // ~25 miles
const MAX_RADIUS     = 50000;        // Google Places hard cap on circle radius
const DEFAULT_MAX    = 20;
const HARD_MAX       = 60;
const D1_BATCH_SIZE  = 25;

export async function onRequestPost(context) {
  const { request, env } = context;

  const authErr = requireAdmin(request, env); if (authErr) return authErr;
  const dbErr   = requireDb(env);             if (dbErr)   return dbErr;

  if (!env.GOOGLE_PLACES_API_KEY) {
    return jsonResponse({
      error: 'GOOGLE_PLACES_API_KEY env var missing. Add it as a Secret under Pages → Settings → Environment variables, then redeploy.',
    }, { status: 500 });
  }

  // ── Parse + validate body ──────────────────────────────────────────────
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const searchTerm = (body?.searchTerm || '').toString().trim();
  const location   = (body?.location   || '').toString().trim();
  const radius     = clampInt(body?.radius,     DEFAULT_RADIUS, 100, MAX_RADIUS);
  const maxResults = clampInt(body?.maxResults, DEFAULT_MAX,    1,   HARD_MAX);

  if (!searchTerm) return jsonResponse({ error: '`searchTerm` is required (e.g. "HVAC").' }, { status: 400 });
  if (!location)   return jsonResponse({ error: '`location` is required (e.g. "Keene, NH").' }, { status: 400 });

  // ── Step 1: Geocode the location string ────────────────────────────────
  // Falls back to text-only search if geocoding fails — Google's text query
  // ("HVAC in Keene NH") still produces good results without locationBias.
  let centre = null;
  try {
    centre = await geocode(location, env.GOOGLE_PLACES_API_KEY);
  } catch (err) {
    // Non-fatal — proceed without locationBias.
    console.warn('Geocoding failed, falling back to unbiased text search:', err.message);
  }

  // ── Step 2: Call Google Places (New) Text Search ───────────────────────
  const placesBody = {
    textQuery: `${searchTerm} in ${location}`,
    maxResultCount: maxResults,
  };
  if (centre) {
    placesBody.locationBias = {
      circle: { center: { latitude: centre.lat, longitude: centre.lng }, radius },
    };
  }

  let placesJson;
  try {
    const r = await fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'X-Goog-Api-Key':     env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask':   FIELD_MASK,
      },
      body: JSON.stringify(placesBody),
    });
    placesJson = await r.json();
    if (!r.ok) {
      const msg = placesJson?.error?.message || `Places API HTTP ${r.status}`;
      return jsonResponse({ error: 'Google Places error: ' + msg }, { status: 502 });
    }
  } catch (err) {
    return jsonResponse({ error: 'Could not reach Google Places API: ' + err.message }, { status: 502 });
  }

  const places = Array.isArray(placesJson?.places) ? placesJson.places : [];

  // ── Step 3: Map Google fields → leads_outreach columns ────────────────
  const candidates = places.map(p => ({
    business_name: p?.displayName?.text || '',
    address:       p?.formattedAddress  || null,
    phone:         p?.nationalPhoneNumber || null,
    website_url:   normalizeUrl(p?.websiteUri),
    category:      searchTerm,
    email:         null,
  })).filter(c => c.business_name);   // drop any place with no name (unusable)

  // ── Step 4: De-duplication ─────────────────────────────────────────────
  let optouts = [];
  try {
    const r = await env.DB.prepare(
      `SELECT business_name, phone FROM opt_outs
       WHERE business_name IS NOT NULL OR phone IS NOT NULL`
    ).all();
    optouts = r.results || [];
  } catch {
    // The 0002 migration may not be applied yet — opt_outs.business_name and
    // .phone won't exist. Treat as empty list and continue.
    optouts = [];
  }

  const optoutNames  = new Set(optouts.filter(o => o.business_name).map(o => normName(o.business_name)));
  const optoutPhones = new Set(optouts.filter(o => o.phone).map(o => normPhone(o.phone)));

  // Pull existing (name, address) pairs for this batch's name set so the
  // duplicate check is a single round-trip.
  const candidateNames = [...new Set(candidates.map(c => c.business_name))];
  const placeholders   = candidateNames.map(() => '?').join(',') || "''";
  let existing = [];
  try {
    const er = await env.DB.prepare(
      `SELECT business_name, address FROM leads_outreach
       WHERE business_name IN (${placeholders})`
    ).bind(...candidateNames).all();
    existing = er.results || [];
  } catch (err) {
    return jsonResponse({ error: 'Dedup query failed: ' + err.message }, { status: 500 });
  }
  const existingPairs = new Set(existing.map(e => dupKey(e.business_name, e.address)));

  let skipped_optout = 0, skipped_duplicate = 0;
  const toInsert = [];

  for (const c of candidates) {
    if (optoutNames.has(normName(c.business_name)) ||
        (c.phone && optoutPhones.has(normPhone(c.phone)))) {
      skipped_optout++;
      continue;
    }
    if (existingPairs.has(dupKey(c.business_name, c.address))) {
      skipped_duplicate++;
      continue;
    }
    // Mark as seen-in-this-batch too so duplicates inside the same Places
    // response don't double-insert.
    existingPairs.add(dupKey(c.business_name, c.address));
    toInsert.push(c);
  }

  // ── Step 5: Batched D1 insert ─────────────────────────────────────────
  const sourceLabel = `places-${searchTerm.toLowerCase().replace(/\s+/g, '-')}-${todayStamp()}`;
  const insertStmt = env.DB.prepare(
    `INSERT INTO leads_outreach
       (business_name, category, address, phone, website_url, email, source_batch)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id, business_name, category, address, phone, website_url, email`
  );

  const insertedRows = [];
  try {
    for (let i = 0; i < toInsert.length; i += D1_BATCH_SIZE) {
      const slice = toInsert.slice(i, i + D1_BATCH_SIZE);
      const stmts = slice.map(c => insertStmt.bind(
        c.business_name,
        c.category,
        c.address,
        c.phone,
        c.website_url,
        c.email,
        sourceLabel,
      ));
      const results = await env.DB.batch(stmts);
      results.forEach(r => {
        const row = (r.results && r.results[0]) || null;
        if (row) insertedRows.push(row);
      });
    }
  } catch (err) {
    return jsonResponse({
      error: 'D1 insert failed (did you run migrations 0001 and 0002?). Detail: ' + err.message,
      pulled: places.length,
      inserted: insertedRows.length,
      skipped_duplicate,
      skipped_optout,
    }, { status: 500 });
  }

  return jsonResponse({
    success: true,
    pulled:            places.length,
    inserted:          insertedRows.length,
    skipped_duplicate,
    skipped_optout,
    businesses:        insertedRows,
  });
}

/* ────────────────────── helpers ────────────────────── */

async function geocode(addressString, apiKey) {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(addressString)}&key=${encodeURIComponent(apiKey)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Geocoding HTTP ' + r.status);
  const j = await r.json();
  if (j.status !== 'OK' || !Array.isArray(j.results) || !j.results.length) {
    throw new Error('Geocoding status=' + j.status + (j.error_message ? ' (' + j.error_message + ')' : ''));
  }
  const loc = j.results[0]?.geometry?.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
    throw new Error('Geocoding returned no coordinates.');
  }
  return { lat: loc.lat, lng: loc.lng };
}

function normalizeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).toString(); } catch { return null; }
}

function clampInt(v, fallback, min, max) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normName(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function normPhone(s) { return String(s || '').replace(/\D+/g, ''); }
function dupKey(name, addr) { return normName(name) + '||' + String(addr || '').trim().toLowerCase(); }
function todayStamp() { return new Date().toISOString().slice(0, 10); }
