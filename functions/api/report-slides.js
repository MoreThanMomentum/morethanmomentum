/**
 * MTM Client Report Slides Generator — Pages Function
 * Route: POST /api/report-slides
 *
 * Creates a branded Google Slides deck from report data.
 * Uses OAuth refresh token — files go directly into MTM's Google Drive.
 *
 * Environment Variables Required:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REFRESH_TOKEN
 */

const SLIDES_BASE = 'https://slides.googleapis.com/v1';
const DRIVE_BASE  = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL   = 'https://oauth2.googleapis.com/token';

// MTM brand colors
const C = {
  BLACK:        { red: 0.047, green: 0.047, blue: 0.047 },   // #0C0C0C
  DARK:         { red: 0.067, green: 0.067, blue: 0.067 },   // #111111
  CARD:         { red: 0.102, green: 0.102, blue: 0.102 },   // #1A1A1A
  BORDER:       { red: 0.165, green: 0.165, blue: 0.165 },   // #2A2A2A
  WHITE:        { red: 0.957, green: 0.957, blue: 0.949 },   // #F4F4F2
  BLUE:         { red: 0.176, green: 0.420, blue: 0.894 },   // #2D6BE4
  ACCENT_LIGHT: { red: 0.357, green: 0.561, blue: 0.941 },   // #5B8FF0
  YELLOW:       { red: 0.961, green: 0.773, blue: 0.094 },   // #F5C518
  GREEN:        { red: 0.290, green: 0.867, blue: 0.502 },   // #4ADE80
  GRAY:         { red: 0.533, green: 0.533, blue: 0.533 },   // #888888
  MID:          { red: 0.333, green: 0.333, blue: 0.333 },   // #555555
};

// Slide dimensions (10" x 5.625" in EMU)
const SW = 9144000;
const SH = 5143500;

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Probe request — just check if OAuth is configured
  try {
    const body = await request.json();
    if (body._probe) {
      const configured = !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REFRESH_TOKEN);
      return new Response(JSON.stringify({ configured, setupRequired: !configured }), { headers });
    }

    const { report } = body;
    if (!report) {
      return new Response(JSON.stringify({ error: 'report data is required.' }), { status: 400, headers });
    }

    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REFRESH_TOKEN) {
      return new Response(JSON.stringify({
        error: 'Google OAuth not configured. Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN to Cloudflare environment variables.',
        setupRequired: true,
      }), { status: 500, headers });
    }

    const accessToken = await getOAuthAccessToken(env);

    const presentationId = await createPresentation(report, accessToken, env.MTM_REPORTS_FOLDER_ID);

    const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    return new Response(JSON.stringify({ success: true, url }), { headers });

  } catch (err) {
    console.error('Slides function error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to create presentation.' }),
      { status: 500, headers }
    );
  }
}

// ── OAUTH TOKEN ───────────────────────────────────────────────────────────────

async function getOAuthAccessToken(env) {
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
  if (!data.access_token) throw new Error(`OAuth token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}


// ── PRESENTATION BUILDER ──────────────────────────────────────────────────────

async function createPresentation(report, token, mtmReportsFolder) {
  const ghl = report.ghl || {};
  const ga4 = report.ga4 || {};
  const title = `${report.client.name} — ${report.period.label} Performance Report`;

  // Step 1: Create via Slides API — returns presentation with 1 default slide
  const createResp = await fetch(`${SLIDES_BASE}/presentations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const presentation = await createResp.json();
  const pid = presentation.presentationId;
  if (!pid) throw new Error(`Failed to create presentation: ${JSON.stringify(presentation)}`);

  // Move to reports folder if configured
  if (mtmReportsFolder) {
    await fetch(`${DRIVE_BASE}/files/${pid}?addParents=${mtmReportsFolder}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  }

  // The default slide becomes slide_cover. We duplicate it 5x for the other slides.
  // duplicateObject avoids addSlide entirely.
  const sourceId = presentation.slides?.[0]?.objectId;
  if (!sourceId) throw new Error('No default slide in new presentation');

  const S = {
    cover:     sourceId,
    metrics:   'slide_metrics',
    sources:   'slide_sources',
    deals:     'slide_deals',
    website:   'slide_website',
    takeaways: 'slide_takeaways',
  };

  // Step 2: Duplicate source slide 5 times — each gets a custom objectId
  await doBatchUpdate(pid, [
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.metrics   } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.sources   } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.deals     } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.website   } } },
    { duplicateObject: { objectId: sourceId, objectIds: { [sourceId]: S.takeaways } } },
  ], token);

  // Step 3: Set all slide backgrounds to black
  await doBatchUpdate(pid, Object.values(S).map(id => ({
    updatePageProperties: {
      objectId: id,
      pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: C.BLACK } } } },
      fields: 'pageBackgroundFill',
    },
  })), token);

  // Step 4: Add all content
  const contentReqs = [
    // ══ SLIDE 1 — COVER ══════════════════════════════════════════════════════
    ...rect('cover_bar', S.cover, 0, 0, SW, px(6), C.BLUE),
    ...text('cover_mtm', S.cover, 'MORE THAN MOMENTUM', px(56), px(28), SW - px(112), px(30),
      { size: 11, bold: true, color: C.ACCENT_LIGHT, spacing: 2 }),
    ...text('cover_client', S.cover, report.client.name || '', px(56), px(68), SW - px(112), px(90),
      { size: 42, bold: true, color: C.WHITE }),
    ...text('cover_type', S.cover, 'Monthly Performance Report', px(56), px(162), SW - px(112), px(36),
      { size: 18, bold: false, color: C.GRAY }),
    ...text('cover_period', S.cover, report.period.label || '', px(56), px(202), SW - px(300), px(36),
      { size: 16, bold: true, color: C.BLUE }),
    ...text('cover_date', S.cover, `Generated ${new Date(report.generatedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`,
      px(56), px(242), SW - px(112), px(26), { size: 11, color: C.MID }),
    ...rect('cover_bottom', S.cover, 0, SH - px(4), SW, px(4), C.CARD),
    ...text('cover_footer', S.cover, 'morethanmomentum.com', px(56), SH - px(28), SW - px(112), px(20),
      { size: 9, color: C.MID }),
    // ══ SLIDE 2 — PIPELINE SUMMARY ═══════════════════════════════════════════
    ...slideHeader('metrics_bar', 'metrics_title', S.metrics, 'Pipeline Summary'),
    ...metricCard('mc1', S.metrics, px(48),  px(100), fmtCurrency(ghl.wonRevenue),        'WON REVENUE',   `${fmtNum(ghl.wonDeals)} deals closed`, C.GREEN),
    ...metricCard('mc2', S.metrics, px(320), px(100), fmtNum(ghl.totalLeads),             'TOTAL LEADS',   `Top: ${ghl.topSource || '—'}`, C.ACCENT_LIGHT),
    ...metricCard('mc3', S.metrics, px(592), px(100), fmtCurrency(ghl.openPipelineValue), 'OPEN PIPELINE', `${fmtNum(ghl.openDeals)} opportunities`, C.WHITE),
    ...metricCard('mc4', S.metrics, px(864), px(100), fmtNum(ghl.lostDeals),             'LOST DEALS',    'This period', C.GRAY),
    // ══ SLIDE 3 — LEAD SOURCES ═══════════════════════════════════════════════
    ...slideHeader('sources_bar', 'sources_title', S.sources, 'Lead Sources'),
    ...buildSourcesSlide(S.sources, ghl.leadSources || []),
    // ══ SLIDE 4 — WON DEALS ══════════════════════════════════════════════════
    ...slideHeader('deals_bar', 'deals_title', S.deals, 'Won Deals'),
    ...buildDealsSlide(S.deals, ghl.wonDealsList || [], ghl.wonRevenue),
    // ══ SLIDE 5 — WEBSITE PERFORMANCE ════════════════════════════════════════
    ...slideHeader('website_bar', 'website_title', S.website, 'Website — Google Analytics'),
    ...buildGA4Slide(S.website, ga4),
    // ══ SLIDE 6 — KEY TAKEAWAYS ══════════════════════════════════════════════
    ...slideHeader('takeaways_bar', 'takeaways_title', S.takeaways, 'Key Takeaways'),
    ...buildTakeawaysSlide(S.takeaways, report.takeaways || []),
  ];
  await doBatchUpdate(pid, contentReqs, token);

  return pid;
}

async function doBatchUpdate(pid, requests, token) {
  if (!requests.length) return;
  const resp = await fetch(`${SLIDES_BASE}/presentations/${pid}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(`batchUpdate failed: ${JSON.stringify(data.error)}`);
  return data;
}


// ── SLIDE SECTION BUILDERS ────────────────────────────────────────────────────

function buildSourcesSlide(slideId, sources) {
  if (!sources || sources.length === 0) {
    return text('no_sources', slideId, 'No lead source data available for this period.',
      px(56), px(110), SW - px(112), px(40), { size: 14, color: C.GRAY, italic: true });
  }

  const reqs = [];
  const maxSources = Math.min(sources.length, 6);
  const rowH = px(52);
  const startY = px(94);
  const barMaxW = SW - px(400);

  sources.slice(0, maxSources).forEach((s, i) => {
    const y = startY + i * rowH;
    const barW = Math.max(px(4), Math.round(barMaxW * (s.percentage / 100)));
    const id = `src_${i}`;

    // Source name
    reqs.push(...text(`${id}_name`, slideId, s.source, px(56), y + px(6), px(200), px(36),
      { size: 13, color: C.WHITE }));
    // Bar background
    reqs.push(...rect(`${id}_bg`, slideId, px(270), y + px(16), barMaxW, px(8), C.CARD));
    // Bar fill
    reqs.push(...rect(`${id}_bar`, slideId, px(270), y + px(16), barW, px(8), C.BLUE));
    // Percentage
    reqs.push(...text(`${id}_pct`, slideId, `${s.percentage}%`, SW - px(110), y + px(6), px(54), px(36),
      { size: 13, bold: true, color: C.BLUE, align: 'END' }));
    // Count
    reqs.push(...text(`${id}_cnt`, slideId, `${s.count}`, SW - px(56), y + px(6), px(40), px(36),
      { size: 12, color: C.GRAY, align: 'END' }));
  });

  return reqs;
}

function buildDealsSlide(slideId, deals, totalRevenue) {
  const reqs = [];

  if (!deals || deals.length === 0) {
    return text('no_deals', slideId, 'No won deals recorded this period.',
      px(56), px(110), SW - px(112), px(40), { size: 14, color: C.GRAY, italic: true });
  }

  // Total revenue callout
  reqs.push(...rect('deals_total_bg', slideId, px(48), px(92), px(280), px(60), C.CARD));
  reqs.push(...text('deals_total_label', slideId, 'TOTAL REVENUE', px(60), px(100), px(256), px(22),
    { size: 9, color: C.GRAY, bold: true }));
  reqs.push(...text('deals_total_val', slideId, fmtCurrency(totalRevenue), px(60), px(124), px(256), px(36),
    { size: 22, bold: true, color: C.GREEN }));

  // Deal rows
  const maxDeals = Math.min(deals.length, 5);
  const startY = px(168);
  const rowH = px(52);

  deals.slice(0, maxDeals).forEach((d, i) => {
    const y = startY + i * rowH;
    const id = `deal_${i}`;

    // Row background
    reqs.push(...rect(`${id}_bg`, slideId, px(48), y, SW - px(96), px(44), i % 2 === 0 ? C.CARD : C.BLACK));
    // Deal name
    reqs.push(...text(`${id}_name`, slideId, d.name || 'Unknown', px(60), y + px(8), SW - px(340), px(30),
      { size: 13, color: C.WHITE }));
    // Source
    reqs.push(...text(`${id}_src`, slideId, d.source || '—', SW - px(270), y + px(8), px(180), px(30),
      { size: 11, color: C.GRAY }));
    // Value
    reqs.push(...text(`${id}_val`, slideId, fmtCurrency(d.value), SW - px(80), y + px(8), px(68), px(30),
      { size: 13, bold: true, color: C.GREEN, align: 'END' }));
  });

  if (deals.length > 5) {
    const moreY = startY + 5 * rowH + px(8);
    reqs.push(...text('deals_more', slideId, `+ ${deals.length - 5} more deals`, px(60), moreY, px(200), px(24),
      { size: 11, color: C.GRAY, italic: true }));
  }

  return reqs;
}

function buildGA4Slide(slideId, ga4) {
  if (ga4.error) {
    return text('ga4_err', slideId, ga4.error, px(56), px(110), SW - px(112), px(40),
      { size: 14, color: C.GRAY, italic: true });
  }

  const reqs = [];

  // 4 stat boxes
  const stats = [
    { label: 'SESSIONS',    value: fmtNum(ga4.sessions) },
    { label: 'USERS',       value: fmtNum(ga4.users) },
    { label: 'BOUNCE RATE', value: ga4.bounceRate != null ? `${ga4.bounceRate}%` : '—' },
    { label: 'AVG SESSION', value: fmtDuration(ga4.avgSessionDurationSec) },
  ];

  const boxW = Math.floor((SW - px(96) - px(36)) / 4);
  stats.forEach((s, i) => {
    const x = px(48) + i * (boxW + px(12));
    const id = `ga4_stat_${i}`;
    reqs.push(...rect(`${id}_bg`, slideId, x, px(92), boxW, px(90), C.CARD));
    reqs.push(...text(`${id}_label`, slideId, s.label, x + px(14), px(100), boxW - px(20), px(22),
      { size: 8, bold: true, color: C.GRAY }));
    reqs.push(...text(`${id}_val`, slideId, s.value, x + px(14), px(122), boxW - px(20), px(44),
      { size: 26, bold: true, color: C.WHITE }));
  });

  // Traffic channels
  const channels = ga4.trafficChannels || [];
  if (channels.length > 0) {
    reqs.push(...text('ga4_ch_label', slideId, 'TRAFFIC CHANNELS', px(48), px(200), SW - px(96), px(22),
      { size: 8, bold: true, color: C.GRAY }));

    const maxCh = Math.min(channels.length, 5);
    const chBarMax = SW - px(380);
    channels.slice(0, maxCh).forEach((ch, i) => {
      const y = px(228) + i * px(46);
      const pct = ga4.sessions > 0 ? Math.round((ch.sessions / ga4.sessions) * 100) : 0;
      const barW = Math.max(px(4), Math.round(chBarMax * (pct / 100)));
      const id = `ch_${i}`;

      reqs.push(...text(`${id}_name`, slideId, ch.channel, px(48), y + px(4), px(200), px(32),
        { size: 12, color: C.WHITE }));
      reqs.push(...rect(`${id}_bg`, slideId, px(262), y + px(12), chBarMax, px(8), C.CARD));
      reqs.push(...rect(`${id}_bar`, slideId, px(262), y + px(12), barW, px(8), C.ACCENT_LIGHT));
      reqs.push(...text(`${id}_cnt`, slideId, `${fmtNum(ch.sessions)} sessions`, SW - px(48), y + px(4), px(160), px(32),
        { size: 11, color: C.GRAY, align: 'END' }));
    });
  }

  return reqs;
}

function buildTakeawaysSlide(slideId, takeaways) {
  if (!takeaways || takeaways.length === 0) {
    return text('no_takeaways', slideId, 'No takeaways generated.',
      px(56), px(110), SW - px(112), px(40), { size: 14, color: C.GRAY, italic: true });
  }

  const reqs = [];
  const maxT = Math.min(takeaways.length, 5);
  const startY = px(94);
  const rowH = px(72);

  takeaways.slice(0, maxT).forEach((t, i) => {
    const y = startY + i * rowH;
    const id = `t_${i}`;
    // Arrow
    reqs.push(...text(`${id}_arrow`, slideId, '→', px(56), y + px(4), px(30), px(36),
      { size: 14, bold: true, color: C.BLUE }));
    // Text
    reqs.push(...text(`${id}_text`, slideId, t, px(96), y + px(4), SW - px(152), px(60),
      { size: 13, color: C.WHITE }));
    // Divider
    if (i < maxT - 1) {
      reqs.push(...rect(`${id}_divider`, slideId, px(56), y + px(66), SW - px(112), px(1), C.BORDER));
    }
  });

  return reqs;
}

// ── PRIMITIVE BUILDERS ────────────────────────────────────────────────────────

function slideHeader(barId, titleId, slideId, title) {
  return [
    ...rect(barId, slideId, 0, 0, SW, px(5), C.BLUE),
    ...text(titleId, slideId, title, px(48), px(18), SW - px(96), px(48),
      { size: 22, bold: true, color: C.WHITE }),
    ...rect(`${barId}_rule`, slideId, px(48), px(74), SW - px(96), px(1), C.BORDER),
  ];
}

function metricCard(id, slideId, x, y, value, label, sub, valueColor) {
  const cardW = px(248);
  const cardH = px(240);
  return [
    ...rect(`${id}_bg`, slideId, x, y, cardW, cardH, C.CARD),
    ...rect(`${id}_top`, slideId, x, y, cardW, px(4), C.BORDER),
    ...text(`${id}_label`, slideId, label, x + px(18), y + px(18), cardW - px(36), px(22),
      { size: 8, bold: true, color: C.GRAY }),
    ...text(`${id}_val`, slideId, String(value), x + px(18), y + px(48), cardW - px(36), px(60),
      { size: 30, bold: true, color: valueColor || C.WHITE }),
    ...text(`${id}_sub`, slideId, sub || '', x + px(18), y + px(116), cardW - px(36), px(30),
      { size: 10, color: C.MID }),
  ];
}

// rect: creates a filled rectangle with no border
function rect(id, slideId, x, y, w, h, color) {
  return [
    {
      createShape: {
        objectId: id,
        shapeType: 'RECTANGLE',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width:  { magnitude: Math.round(w), unit: 'EMU' },
            height: { magnitude: Math.round(h), unit: 'EMU' },
          },
          transform: { scaleX: 1, scaleY: 1, translateX: Math.round(x), translateY: Math.round(y), unit: 'EMU' },
        },
      },
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: color } } },
          outline: { propertyState: 'NOT_RENDERED' },
        },
        fields: 'shapeBackgroundFill,outline',
      },
    },
  ];
}

// text: creates a text box with styling
function text(id, slideId, content, x, y, w, h, opts = {}) {
  const {
    size     = 14,
    bold     = false,
    italic   = false,
    color    = C.WHITE,
    align    = 'START',
    spacing  = 0,
  } = opts;

  const reqs = [
    {
      createShape: {
        objectId: id,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width:  { magnitude: Math.round(w), unit: 'EMU' },
            height: { magnitude: Math.round(h), unit: 'EMU' },
          },
          transform: { scaleX: 1, scaleY: 1, translateX: Math.round(x), translateY: Math.round(y), unit: 'EMU' },
        },
      },
    },
    {
      insertText: {
        objectId: id,
        text: String(content || ''),
      },
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          outline: { propertyState: 'NOT_RENDERED' },
          shapeBackgroundFill: { propertyState: 'NOT_RENDERED' },
        },
        fields: 'outline,shapeBackgroundFill',
      },
    },
    {
      updateTextStyle: {
        objectId: id,
        textRange: { type: 'ALL' },
        style: {
          bold,
          italic,
          fontSize: { magnitude: size, unit: 'PT' },
          foregroundColor: { opaqueColor: { rgbColor: color } },
          fontFamily: 'Arial',
        },
        fields: 'bold,italic,fontSize,foregroundColor,fontFamily',
      },
    },
    {
      updateParagraphStyle: {
        objectId: id,
        textRange: { type: 'ALL' },
        style: { alignment: align },
        fields: 'alignment',
      },
    },
  ];

  return reqs;
}

// ── UNIT HELPERS ──────────────────────────────────────────────────────────────

// Convert screen pixels (at 96dpi) to EMU
function px(pixels) {
  return Math.round(pixels * 9144000 / 960);
}

// ── FORMAT HELPERS ────────────────────────────────────────────────────────────

function fmtCurrency(n) {
  if (!n && n !== 0) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(n) {
  return (n || 0).toLocaleString();
}

function fmtDuration(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
