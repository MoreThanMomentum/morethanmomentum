/**
 * MTM Report Slides Generator — Pages Function
 * Route: POST /api/report-slides
 *
 * Generates a Google Slides deck from a monthly performance report.
 * Uses OAuth refresh token instead of service account (service accounts
 * cannot create files in personal Drive).
 *
 * Environment Variables Required:
 *   GOOGLE_OAUTH_CLIENT_ID     — OAuth 2.0 Client ID (Web Application type)
 *   GOOGLE_OAUTH_CLIENT_SECRET — OAuth 2.0 Client Secret
 *   GOOGLE_OAUTH_REFRESH_TOKEN — Long-lived refresh token (generate once via oauth-setup)
 *
 * Setup: Run the one-time OAuth flow at /tools and click "Connect Google Account"
 * to generate the refresh token, then add it as a Cloudflare env var.
 */

const SLIDES_API  = 'https://slides.googleapis.com/v1/presentations';
const TOKEN_URL   = 'https://oauth2.googleapis.com/token';

// MTM Brand Colors (hex → Slides RGB)
const C = {
  black:   { red: 0.047, green: 0.047, blue: 0.047 },  // #0C0C0C
  dark:    { red: 0.067, green: 0.067, blue: 0.067 },  // #111111
  card:    { red: 0.102, green: 0.102, blue: 0.102 },  // #1A1A1A
  blue:    { red: 0.176, green: 0.420, blue: 0.894 },  // #2D6BE4
  accent:  { red: 0.357, green: 0.561, blue: 0.941 },  // #5B8FF0
  yellow:  { red: 0.961, green: 0.773, blue: 0.094 },  // #F5C518
  green:   { red: 0.290, green: 0.871, blue: 0.502 },  // #4ade80
  white:   { red: 0.957, green: 0.957, blue: 0.949 },  // #F4F4F2
  gray:    { red: 0.533, green: 0.533, blue: 0.533 },  // #888
};

// Slide dimensions: 9144000 x 5143500 EMU (10" x 5.625" widescreen)
const W = 9144000, H = 5143500;
const emu = (inches) => Math.round(inches * 914400);

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const { report: r } = await request.json();
    if (!r) return new Response(JSON.stringify({ error: 'Report data required.' }), { status: 400, headers });

    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REFRESH_TOKEN) {
      return new Response(JSON.stringify({
        error: 'Google OAuth not configured. Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN to Cloudflare environment variables.',
        setupRequired: true,
      }), { status: 500, headers });
    }

    const accessToken = await getAccessToken(env);
    const title = `MTM Report — ${r.client?.name || 'Client'} — ${r.period?.label || ''}`;
    const presId = await createPresentation(title, accessToken);
    const slideRequests = buildReportSlides(r);
    await batchUpdate(presId, slideRequests, accessToken);

    return new Response(JSON.stringify({
      success: true,
      url: `https://docs.google.com/presentation/d/${presId}/edit`,
    }), { headers });

  } catch (err) {
    console.error('Report slides error:', err.message);
    return new Response(JSON.stringify({ error: err.message || 'Slides generation failed.' }), { status: 500, headers });
  }
}

// ── OAUTH TOKEN ───────────────────────────────────────────────────────────────

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

// ── SLIDES API HELPERS ────────────────────────────────────────────────────────

async function createPresentation(title, token) {
  const resp = await fetch(SLIDES_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const data = await resp.json();
  if (!data.presentationId) throw new Error(`Create presentation failed: ${JSON.stringify(data)}`);
  // Delete default blank slide
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

// ── SLIDE BUILDERS ────────────────────────────────────────────────────────────

function uid() { return `id_${Date.now()}_${Math.random().toString(36).substr(2,8)}`; }

function solidFill(color) { return { solidFill: { color: { rgbColor: color } } }; }

function addBg(slideId, color) {
  const id = uid();
  return [
    { createShape: { objectId: id, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId, size: { width: { magnitude: W, unit: 'EMU' }, height: { magnitude: H, unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'EMU' } } } },
    { updateShapeProperties: { objectId: id, fields: 'shapeBackgroundFill,outline', shapeProperties: { shapeBackgroundFill: solidFill(color), outline: { outlineFill: solidFill(color) } } } },
  ];
}

function addText(slideId, text, x, y, w, h, { size=24, bold=false, color=C.white, align='LEFT' }={}) {
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

function addSlide(requests) {
  const id = uid();
  requests.unshift({ addSlide: { objectId: id, slideLayoutReference: { predefinedLayout: 'BLANK' } } });
  // Replace placeholder slideId
  const fixed = requests.map(r => JSON.parse(JSON.stringify(r).replace(/SLIDE_ID/g, id)));
  return fixed;
}

function fmtCur(n) { if (!n && n!==0) return '—'; return '$'+Number(n).toLocaleString(); }
function fmtNum(n) { return (n||0).toLocaleString(); }

// ── REPORT SLIDE CONTENT ──────────────────────────────────────────────────────

function buildReportSlides(r) {
  const ghl = r.ghl || {};
  const ga4 = r.ga4 || {};
  const all = [];

  // SLIDE 1 — Cover
  all.push(...addSlide([
    ...addBg('SLIDE_ID', C.black),
    ...addRect('SLIDE_ID', 0, 0, 0.06, 5.625, C.blue),
    ...addText('SLIDE_ID', 'MORE THAN MOMENTUM', 0.4, 0.5, 9.2, 0.5, { size: 14, bold: true, color: C.blue }),
    ...addText('SLIDE_ID', 'Monthly Performance Report', 0.4, 1.2, 9.2, 0.8, { size: 36, bold: true, color: C.white }),
    ...addText('SLIDE_ID', r.client?.name || '', 0.4, 2.2, 9.2, 0.6, { size: 28, bold: true, color: C.accent }),
    ...addText('SLIDE_ID', r.period?.label || '', 0.4, 2.9, 9.2, 0.5, { size: 20, color: C.gray }),
    ...addText('SLIDE_ID', 'morethanmomentum.com', 0.4, 4.9, 9.2, 0.4, { size: 11, color: C.gray }),
  ]));

  // SLIDE 2 — Pipeline Summary (4 metric boxes)
  all.push(...addSlide([
    ...addBg('SLIDE_ID', C.dark),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.blue),
    ...addText('SLIDE_ID', 'Pipeline Summary', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    // Box 1 — Total Leads
    ...addRect('SLIDE_ID', 0.4, 1.2, 2.0, 1.6, C.card),
    ...addText('SLIDE_ID', 'TOTAL LEADS', 0.55, 1.35, 1.7, 0.35, { size: 9, color: C.gray }),
    ...addText('SLIDE_ID', fmtNum(ghl.totalLeads), 0.55, 1.75, 1.7, 0.7, { size: 40, bold: true, color: C.accent }),
    ...addText('SLIDE_ID', `Top: ${ghl.topSource||'—'}`, 0.55, 2.55, 1.7, 0.3, { size: 10, color: C.gray }),
    // Box 2 — Won Revenue
    ...addRect('SLIDE_ID', 2.65, 1.2, 2.0, 1.6, C.card),
    ...addText('SLIDE_ID', 'WON REVENUE', 2.8, 1.35, 1.7, 0.35, { size: 9, color: C.gray }),
    ...addText('SLIDE_ID', fmtCur(ghl.wonRevenue), 2.8, 1.75, 1.7, 0.7, { size: 36, bold: true, color: C.green }),
    ...addText('SLIDE_ID', `${fmtNum(ghl.wonDeals)} deals`, 2.8, 2.55, 1.7, 0.3, { size: 10, color: C.gray }),
    // Box 3 — Open Pipeline
    ...addRect('SLIDE_ID', 4.9, 1.2, 2.0, 1.6, C.card),
    ...addText('SLIDE_ID', 'OPEN PIPELINE', 5.05, 1.35, 1.7, 0.35, { size: 9, color: C.gray }),
    ...addText('SLIDE_ID', fmtCur(ghl.openPipelineValue), 5.05, 1.75, 1.7, 0.7, { size: 36, bold: true, color: C.white }),
    ...addText('SLIDE_ID', `${fmtNum(ghl.openDeals)} opportunities`, 5.05, 2.55, 1.7, 0.3, { size: 10, color: C.gray }),
    // Box 4 — Lost Deals
    ...addRect('SLIDE_ID', 7.15, 1.2, 2.0, 1.6, C.card),
    ...addText('SLIDE_ID', 'LOST DEALS', 7.3, 1.35, 1.7, 0.35, { size: 9, color: C.gray }),
    ...addText('SLIDE_ID', fmtNum(ghl.lostDeals), 7.3, 1.75, 1.7, 0.7, { size: 40, bold: true, color: C.white }),
    ...addText('SLIDE_ID', 'This period', 7.3, 2.55, 1.7, 0.3, { size: 10, color: C.gray }),
    // Lead sources
    ...addText('SLIDE_ID', 'Lead Sources', 0.4, 3.1, 9.2, 0.4, { size: 13, bold: true, color: C.gray }),
    ...addText('SLIDE_ID', (ghl.leadSources||[]).slice(0,5).map(s=>`${s.source}  ${s.percentage}%  (${s.count})`).join('\n'), 0.4, 3.55, 9.2, 1.4, { size: 13, color: C.white }),
  ]));

  // SLIDE 3 — Website (GA4)
  all.push(...addSlide([
    ...addBg('SLIDE_ID', C.dark),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.blue),
    ...addText('SLIDE_ID', 'Website Performance', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    ...addText('SLIDE_ID', 'Google Analytics 4', 0.4, 1.0, 9.2, 0.35, { size: 13, color: C.accent }),
    ...(ga4.error ? addText('SLIDE_ID', ga4.error, 0.4, 1.5, 9.2, 0.5, { size: 16, color: C.gray }) : [
      ...addRect('SLIDE_ID', 0.4, 1.5, 2.0, 1.4, C.card),
      ...addText('SLIDE_ID', 'SESSIONS', 0.55, 1.65, 1.7, 0.3, { size: 9, color: C.gray }),
      ...addText('SLIDE_ID', fmtNum(ga4.sessions), 0.55, 2.0, 1.7, 0.65, { size: 36, bold: true, color: C.white }),
      ...addRect('SLIDE_ID', 2.6, 1.5, 2.0, 1.4, C.card),
      ...addText('SLIDE_ID', 'USERS', 2.75, 1.65, 1.7, 0.3, { size: 9, color: C.gray }),
      ...addText('SLIDE_ID', fmtNum(ga4.users), 2.75, 2.0, 1.7, 0.65, { size: 36, bold: true, color: C.white }),
      ...addRect('SLIDE_ID', 4.8, 1.5, 2.0, 1.4, C.card),
      ...addText('SLIDE_ID', 'BOUNCE RATE', 4.95, 1.65, 1.7, 0.3, { size: 9, color: C.gray }),
      ...addText('SLIDE_ID', (ga4.bounceRate||0)+'%', 4.95, 2.0, 1.7, 0.65, { size: 36, bold: true, color: C.white }),
      ...addRect('SLIDE_ID', 7.0, 1.5, 2.1, 1.4, C.card),
      ...addText('SLIDE_ID', 'AVG SESSION', 7.15, 1.65, 1.8, 0.3, { size: 9, color: C.gray }),
      ...addText('SLIDE_ID', ga4.avgSessionDurationSec > 0 ? `${Math.floor(ga4.avgSessionDurationSec/60)}m ${ga4.avgSessionDurationSec%60}s` : '—', 7.15, 2.0, 1.8, 0.65, { size: 28, bold: true, color: C.white }),
      ...addText('SLIDE_ID', 'Traffic Channels', 0.4, 3.1, 9.2, 0.4, { size: 13, bold: true, color: C.gray }),
      ...addText('SLIDE_ID', (ga4.trafficChannels||[]).slice(0,5).map(c=>`${c.channel}  ${fmtNum(c.sessions)} sessions`).join('\n'), 0.4, 3.55, 9.2, 1.4, { size: 13, color: C.white }),
    ]),
  ]));

  // SLIDE 4 — Key Takeaways
  const takeaways = r.takeaways || [];
  all.push(...addSlide([
    ...addBg('SLIDE_ID', C.black),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.yellow),
    ...addText('SLIDE_ID', 'Key Takeaways', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    ...addText('SLIDE_ID', takeaways.map((t,i) => `${i+1}.  ${t}`).join('\n\n'), 0.4, 1.2, 9.2, 4.0, { size: 15, color: C.white }),
  ]));

  // SLIDE 5 — Won Deals
  const deals = (ghl.wonDealsList||[]).slice(0,8);
  all.push(...addSlide([
    ...addBg('SLIDE_ID', C.dark),
    ...addRect('SLIDE_ID', 0.4, 0.25, 1.5, 0.05, C.green),
    ...addText('SLIDE_ID', 'Won Deals', 0.4, 0.45, 9.2, 0.5, { size: 22, bold: true, color: C.white }),
    ...addText('SLIDE_ID', deals.length === 0 ? 'No won deals recorded this period.' : deals.map(d=>`${d.name}   ${fmtCur(d.value)}   ${d.source||'—'}`).join('\n'), 0.4, 1.2, 9.2, 4.0, { size: 14, color: C.white }),
  ]));

  // SLIDE 6 — Closing
  all.push(...addSlide([
    ...addBg('SLIDE_ID', C.black),
    ...addRect('SLIDE_ID', 0.4, 0.25, 9.2, 0.04, C.blue),
    ...addText('SLIDE_ID', 'More Than Momentum', 0.4, 0.6, 9.2, 0.5, { size: 14, bold: true, color: C.blue }),
    ...addText('SLIDE_ID', 'Questions?\nLet\'s talk.', 0.4, 1.4, 9.2, 1.8, { size: 52, bold: true, color: C.white }),
    ...addText('SLIDE_ID', 'morethanmomentum.com', 0.4, 4.9, 9.2, 0.4, { size: 13, color: C.gray }),
  ]));

  return all;
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
