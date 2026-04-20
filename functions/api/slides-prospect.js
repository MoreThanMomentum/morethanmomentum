/**
 * MTM Prospect Slides Generator — Pages Function
 * Route: POST /api/slides-prospect
 *
 * Generates a Google Slides prospect audit deck from Tool 01 brief data.
 * Used by sales person on Zoom discovery calls — 7 slides showing
 * what the prospect is missing and what MTM proposes.
 *
 * Environment Variables Required:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REFRESH_TOKEN
 */

const SLIDES_API = 'https://slides.googleapis.com/v1/presentations';
const TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const W = 9144000, H = 5143500;
const emu = (inches) => Math.round(inches * 914400);

const C = {
  black:  { red: 0.047, green: 0.047, blue: 0.047 },
  dark:   { red: 0.067, green: 0.067, blue: 0.067 },
  card:   { red: 0.102, green: 0.102, blue: 0.102 },
  blue:   { red: 0.176, green: 0.420, blue: 0.894 },
  accent: { red: 0.357, green: 0.561, blue: 0.941 },
  yellow: { red: 0.961, green: 0.773, blue: 0.094 },
  green:  { red: 0.290, green: 0.871, blue: 0.502 },
  red:    { red: 0.973, green: 0.427, blue: 0.427 },
  white:  { red: 0.957, green: 0.957, blue: 0.949 },
  gray:   { red: 0.533, green: 0.533, blue: 0.533 },
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const { brief: b } = await request.json();
    if (!b) return new Response(JSON.stringify({ error: 'Brief data required.' }), { status: 400, headers });

    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REFRESH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Google OAuth not configured.', setupRequired: true }), { status: 500, headers });
    }

    const token = await getAccessToken(env);
    const title = `MTM Prospect Audit — ${b.businessName || 'Prospect'} — ${new Date().toLocaleDateString()}`;
    const presId = await createPresentation(title, token);
    const requests = buildProspectSlides(b);
    await batchUpdate(presId, requests, token);

    return new Response(JSON.stringify({
      success: true,
      url: `https://docs.google.com/presentation/d/${presId}/edit`,
    }), { headers });

  } catch (err) {
    console.error('Prospect slides error:', err.message);
    return new Response(JSON.stringify({ error: err.message || 'Slides generation failed.' }), { status: 500, headers });
  }
}

// ── OAUTH ─────────────────────────────────────────────────────────────────────

async function getAccessToken(env) {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── SLIDES API ────────────────────────────────────────────────────────────────

async function createPresentation(title, token) {
  const resp = await fetch(SLIDES_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const data = await resp.json();
  if (!data.presentationId) throw new Error(`Create failed: ${JSON.stringify(data)}`);
  if (data.slides?.length > 0) {
    await batchUpdate(data.presentationId, [{ deleteObject: { objectId: data.slides[0].objectId } }], token);
  }
  return data.presentationId;
}

async function batchUpdate(presId, requests, token) {
  if (!requests.length) return;
  const resp = await fetch(`${SLIDES_API}/${presId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(`batchUpdate failed: ${JSON.stringify(data.error)}`);
  return data;
}

function uid() { return `id_${Date.now()}_${Math.random().toString(36).substr(2,8)}`; }
function solidFill(c) { return { solidFill: { color: { rgbColor: c } } }; }

function addBg(slideId, color) {
  const id = uid();
  return [
    { createShape: { objectId: id, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId, size: { width: { magnitude: W, unit: 'EMU' }, height: { magnitude: H, unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'EMU' } } } },
    { updateShapeProperties: { objectId: id, fields: 'shapeBackgroundFill,outline', shapeProperties: { shapeBackgroundFill: solidFill(color), outline: { outlineFill: solidFill(color) } } } },
  ];
}

function addText(slideId, text, x, y, w, h, { size=18, bold=false, color=C.white, align='LEFT' }={}) {
  if (!text) return [];
  const id = uid();
  return [
    { createShape: { objectId: id, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId, size: { width: { magnitude: emu(w), unit: 'EMU' }, height: { magnitude: emu(h), unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: emu(x), translateY: emu(y), unit: 'EMU' } } } },
    { insertText: { objectId: id, text: String(text) } },
    { updateTextStyle: { objectId: id, fields: 'fontSize,bold,foregroundColor,fontFamily', style: { fontSize: { magnitude: size, unit: 'PT' }, bold, foregroundColor: { opaqueColor: { rgbColor: color } }, fontFamily: 'DM Sans' } } },
    { updateParagraphStyle: { objectId: id, fields: 'alignment', style: { alignment: align } } },
  ];
}

function addRect(slideId, x, y, w, h, color) {
  const id = uid();
  return [
    { createShape: { objectId: id, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId, size: { width: { magnitude: emu(w), unit: 'EMU' }, height: { magnitude: emu(h), unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: emu(x), translateY: emu(y), unit: 'EMU' } } } },
    { updateShapeProperties: { objectId: id, fields: 'shapeBackgroundFill,outline', shapeProperties: { shapeBackgroundFill: solidFill(color), outline: { outlineFill: solidFill(color) } } } },
  ];
}

function addSlideWrapper(requests) {
  const id = uid();
  requests.unshift({ addSlide: { objectId: id, slideLayoutReference: { predefinedLayout: 'BLANK' } } });
  return requests.map(r => JSON.parse(JSON.stringify(r).replace(/SLIDE_ID/g, id)));
}

// ── PROSPECT SLIDE CONTENT ────────────────────────────────────────────────────

function buildProspectSlides(b) {
  const p = b.profile || {};
  const sm = p.socialMedia || {};
  const gaps = b.gapAnalysis || [];
  const tps = b.talkingPoints || [];
  const approach = b.recommendedApproach || b.recommendedPackage || {};
  const allRequests = [];

  // Grade color
  const gradeColor = { A: C.green, B: C.accent, C: C.yellow, D: { red: 0.984, green: 0.545, blue: 0.230 }, F: C.red }[p.overallGrade] || C.gray;

  // SLIDE 1 — Cover
  allRequests.push(...addSlideWrapper([
    ...addBg('SLIDE_ID', C.black),
    ...addRect('SLIDE_ID', 0, 0, 0.06, 5.625, C.blue),
    ...addText('SLIDE_ID', 'MORE THAN MOMENTUM', 0.4, 0.5, 9.2, 0.5, { size: 13, bold: true, color: C.blue }),
    ...addText('SLIDE_ID', 'Digital Presence Audit', 0.4, 1.1, 9.2, 0.8, { size: 42, bold: true, color: C.white }),
    ...addText('SLIDE_ID', b.businessName || '', 0.4, 2.2, 9.2, 0.7, { size: 30, bold: true, color: C.accent }),
    ...addText('SLIDE_ID', b.city || '', 0.4, 2.95, 9.2, 0.5, { size: 18, color: C.gray }),
    ...addText('SLIDE_ID', new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }), 0.4, 4.9, 9.2, 0.4, { size: 11, color: C.gray }),
  ]));

  // SLIDE 2 — The Grade
  allRequests.push(...addSlideWrapper([
    ...addBg('SLIDE_ID', C.dark),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.8, 0.05, gradeColor),
    ...addText('SLIDE_ID', 'Your Digital Grade', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    // Big grade
    ...addRect('SLIDE_ID', 0.4, 1.2, 1.6, 1.6, gradeColor),
    ...addText('SLIDE_ID', p.overallGrade || '?', 0.45, 1.25, 1.5, 1.5, { size: 80, bold: true, color: C.white, align: 'CENTER' }),
    ...addText('SLIDE_ID', p.gradeSummary || '', 2.3, 1.3, 7.0, 1.4, { size: 22, color: C.white }),
    ...addText('SLIDE_ID', `Website: ${p.websitePlatform||'Unknown'} · ${p.websiteQuality||'Unknown'}`, 2.3, 2.8, 7.0, 0.4, { size: 14, color: C.gray }),
    ...addText('SLIDE_ID', `Google Reviews: ${p.googleReviews||'Not Found'}`, 2.3, 3.2, 7.0, 0.4, { size: 14, color: C.gray }),
  ]));

  // SLIDE 3 — Social Media Status
  const platforms = [['Instagram','instagram'],['Facebook','facebook'],['TikTok','tiktok'],['LinkedIn','linkedin']];
  const statusColor = s => s==='Active' ? C.green : s==='Inactive' ? C.yellow : C.gray;
  allRequests.push(...addSlideWrapper([
    ...addBg('SLIDE_ID', C.dark),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.blue),
    ...addText('SLIDE_ID', 'Social Media Presence', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    ...platforms.flatMap(([name, key], i) => {
      const status = sm[key] || 'None';
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.4 + col * 4.7;
      const y = 1.3 + row * 1.7;
      return [
        ...addRect('SLIDE_ID', x, y, 4.3, 1.4, C.card),
        ...addRect('SLIDE_ID', x, y, 0.04, 1.4, statusColor(status)),
        ...addText('SLIDE_ID', name, x + 0.2, y + 0.2, 3.0, 0.45, { size: 16, bold: true, color: C.white }),
        ...addText('SLIDE_ID', status, x + 0.2, y + 0.7, 3.0, 0.45, { size: 22, bold: true, color: statusColor(status) }),
      ];
    }),
  ]));

  // SLIDE 4 — Gap Analysis
  allRequests.push(...addSlideWrapper([
    ...addBg('SLIDE_ID', C.black),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.yellow),
    ...addText('SLIDE_ID', 'What\'s Missing', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    ...addText('SLIDE_ID', 'These gaps are costing you leads right now.', 0.4, 0.98, 9.2, 0.4, { size: 14, color: C.gray }),
    ...gaps.flatMap((gap, i) => {
      const y = 1.65 + i * 0.7;
      return [
        ...addRect('SLIDE_ID', 0.4, y, 0.04, 0.45, C.yellow),
        ...addText('SLIDE_ID', gap, 0.7, y, 8.8, 0.5, { size: 14, color: C.white }),
      ];
    }),
  ]));

  // SLIDE 5 — What Competitors Are Doing
  allRequests.push(...addSlideWrapper([
    ...addBg('SLIDE_ID', C.dark),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.red),
    ...addText('SLIDE_ID', 'While You\'re Not Here...', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    ...addText('SLIDE_ID', 'Your competitors are.', 0.4, 0.98, 9.2, 0.4, { size: 14, color: C.gray }),
    ...tps.flatMap((tp, i) => {
      const y = 1.65 + i * 0.8;
      return [
        ...addRect('SLIDE_ID', 0.4, y, 0.04, 0.55, C.blue),
        ...addText('SLIDE_ID', tp, 0.7, y, 8.8, 0.6, { size: 13, color: C.white }),
      ];
    }),
  ]));

  // SLIDE 6 — What MTM Proposes
  allRequests.push(...addSlideWrapper([
    ...addBg('SLIDE_ID', C.black),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.green),
    ...addText('SLIDE_ID', 'What We\'d Build For You', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    ...addText('SLIDE_ID', approach.track || '', 0.4, 1.1, 9.2, 0.4, { size: 12, color: C.accent }),
    ...addText('SLIDE_ID', approach.scope || approach.name || '', 0.4, 1.55, 9.2, 0.6, { size: 20, bold: true, color: C.white }),
    ...addText('SLIDE_ID', approach.rationale || '', 0.4, 2.3, 9.2, 1.5, { size: 15, color: C.gray }),
    ...addRect('SLIDE_ID', 0.4, 4.2, 9.2, 0.06, C.blue),
    ...addText('SLIDE_ID', 'Performance-based pricing. You pay less until we prove it works.', 0.4, 4.35, 9.2, 0.4, { size: 13, color: C.accent }),
  ]));

  // SLIDE 7 — Next Steps
  allRequests.push(...addSlideWrapper([
    ...addBg('SLIDE_ID', C.black),
    ...addRect('SLIDE_ID', 0.4, 0.25, 9.2, 0.05, C.blue),
    ...addText('SLIDE_ID', 'More Than Momentum', 0.4, 0.5, 9.2, 0.5, { size: 14, bold: true, color: C.blue }),
    ...addText('SLIDE_ID', 'Ready to\nfix this?', 0.4, 1.2, 9.2, 2.0, { size: 56, bold: true, color: C.white }),
    ...addText('SLIDE_ID', 'Let\'s talk next steps.', 0.4, 3.4, 9.2, 0.5, { size: 20, color: C.gray }),
    ...addText('SLIDE_ID', 'morethanmomentum.com', 0.4, 4.9, 9.2, 0.4, { size: 12, color: C.gray }),
  ]));

  return allRequests;
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
