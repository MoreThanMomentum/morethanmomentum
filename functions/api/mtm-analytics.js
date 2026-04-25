/*
 * /functions/api/mtm-analytics.js
 * More Than Momentum — Content Studio: MTM Analytics Dashboard
 *
 * Pulls live data from three sources in parallel:
 *   1. GHL (via MTM MCP Analytics Server) — pipeline, leads, revenue
 *   2. Meta Graph API — Facebook Page + Instagram Business metrics
 *   3. Google Analytics (GA4) — website traffic
 *
 * ─── ENV VARS ────────────────────────────────────────────────────────────
 *
 * REQUIRED:
 *   MTM_GHL_SECRET         Bearer token for MTM's entry on the MCP server.
 *                          Get it by running the curl command in the Analytics tab.
 *
 * OPTIONAL (each source degrades gracefully if not set):
 *   MTM_META_PAGE_TOKEN    Long-lived Facebook Page Access Token (never expires).
 *                          How to get: see SETUP GUIDE below.
 *   MTM_META_PAGE_ID       Facebook Page numeric ID (e.g. "123456789012345")
 *   MTM_META_IG_USER_ID    Instagram Business Account ID (different from username)
 *   MTM_GA4_PROPERTY_ID    GA4 Property ID (numeric only, e.g. "123456789")
 *
 * KV BINDING REQUIRED for GA4:
 *   GOOGLE_KV              Must match the KV binding used by your existing /api/report
 *                          function. Stores the key "google_tokens" as JSON with
 *                          { access_token, refresh_token, expiry_date }.
 *                          If your existing binding is named differently, update line ~190.
 *
 * ─── META SETUP GUIDE ─────────────────────────────────────────────────────
 * 1. Go to developers.facebook.com → Create App → Business type
 * 2. Add "Facebook Login" and "Instagram Basic Display" products to the app
 * 3. In Graph API Explorer (developers.facebook.com/tools/explorer):
 *    a. Select your app
 *    b. Generate a User Token with these permissions:
 *       pages_read_engagement, pages_show_list, pages_manage_posts,
 *       instagram_basic, instagram_manage_insights
 *    c. Click "Generate Access Token"
 * 4. Exchange for long-lived token (60 days):
 *    GET https://graph.facebook.com/v19.0/oauth/access_token
 *      ?grant_type=fb_exchange_token
 *      &client_id=YOUR_APP_ID
 *      &client_secret=YOUR_APP_SECRET
 *      &fb_exchange_token=SHORT_LIVED_TOKEN
 * 5. Get the Page Access Token (never expires):
 *    GET https://graph.facebook.com/v19.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN
 *    Copy the access_token value for your MTM page → save as MTM_META_PAGE_TOKEN
 * 6. Get your Page ID and IG User ID from the same response or from the page settings.
 *    Your IG User ID: GET https://graph.facebook.com/v19.0/{your-ig-username}?fields=id&access_token={page_token}
 *
 * ─── GA4 SETUP ────────────────────────────────────────────────────────────
 * 1. Find your MTM GA4 Property ID:
 *    Google Analytics → Admin → Property Settings → Property ID (numeric)
 * 2. Add as env var: MTM_GA4_PROPERTY_ID = "123456789"
 * 3. Make sure your Google account is connected (the existing Google button in the header)
 *    — the OAuth token stored in KV grants GA4 access automatically.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

const MCP_SERVER_URL = 'https://mtm-mcp-server.coleblanco.workers.dev';
const META_API_BASE  = 'https://graph.facebook.com/v19.0';
const GA4_API_BASE   = 'https://analyticsdata.googleapis.com/v1beta';
const GOOGLE_TOKEN_KEY = 'google_tokens';

/* ═══════════════════════════════════════════════════════════════════════════
   GHL — via MTM MCP Analytics Server
   ═══════════════════════════════════════════════════════════════════════════ */
async function fetchGHL(secret, month, year) {
  // Format: "YYYY-MM"
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const mcpBody = {
    jsonrpc: '2.0',
    id:      '1',
    method:  'tools/call',
    params:  {
      name:      'get_monthly_snapshot',
      arguments: { month: monthStr },
    },
  };

  const res = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify(mcpBody),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MCP server returned ${res.status}: ${txt.slice(0, 200)}`);
  }

  const mcpData = await res.json();

  // MCP response: result.content[0].text is a JSON string
  const contentText = mcpData?.result?.content?.[0]?.text;
  if (!contentText) throw new Error('Empty MCP response content');

  let snapshot;
  try {
    snapshot = JSON.parse(contentText);
  } catch {
    // Some implementations return pre-parsed objects
    snapshot = mcpData?.result?.content?.[0];
  }

  // Also pull lead source breakdown in parallel
  const sourcesBody = {
    jsonrpc: '2.0',
    id:      '2',
    method:  'tools/call',
    params:  { name: 'get_lead_source_breakdown', arguments: { limit: 8 } },
  };

  const [sourcesRes, pipelineRes] = await Promise.allSettled([
    fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify(sourcesBody),
    }),
    fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify({
        jsonrpc: '2.0', id: '3', method: 'tools/call',
        params: { name: 'get_pipeline_summary', arguments: { status: 'open', limit: 10 } },
      }),
    }),
  ]);

  let leadSources = [];
  let openOpportunities = [];

  if (sourcesRes.status === 'fulfilled' && sourcesRes.value.ok) {
    try {
      const sd = await sourcesRes.value.json();
      const raw = JSON.parse(sd?.result?.content?.[0]?.text || '{}');
      leadSources = raw.sources || raw.leadSources || [];
    } catch { /* graceful */ }
  }

  if (pipelineRes.status === 'fulfilled' && pipelineRes.value.ok) {
    try {
      const pd = await pipelineRes.value.json();
      const raw = JSON.parse(pd?.result?.content?.[0]?.text || '{}');
      openOpportunities = raw.opportunities || raw.pipeline || [];
    } catch { /* graceful */ }
  }

  // Normalise snapshot — the MCP server may return different shapes
  const ghl = snapshot || {};
  return {
    totalLeads:        ghl.newLeads       ?? ghl.totalLeads        ?? 0,
    wonDeals:          ghl.wonDeals       ?? 0,
    wonRevenue:        ghl.wonRevenue     ?? ghl.totalWonRevenue   ?? 0,
    lostDeals:         ghl.lostDeals      ?? 0,
    openDeals:         ghl.openDeals      ?? ghl.openOpportunities ?? 0,
    openPipelineValue: ghl.openPipelineValue ?? ghl.pipelineValue  ?? 0,
    topSource:         ghl.topSource      ?? (leadSources[0]?.source || '—'),
    leadSources:       leadSources,
    openOpportunities: openOpportunities,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   META — Facebook Page + Instagram Business
   ═══════════════════════════════════════════════════════════════════════════ */
async function fetchMeta(pageToken, pageId, igUserId) {
  const result = { facebook: null, instagram: null };

  // ── Date range: current month ─────────────────────────────────────────
  const now    = new Date();
  const since  = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
  const until  = Math.floor(now.getTime() / 1000);

  // ── Facebook Page ─────────────────────────────────────────────────────
  if (pageId) {
    try {
      const [pageRes, insightsRes] = await Promise.allSettled([
        // Basic page info: fan_count, name
        fetch(`${META_API_BASE}/${pageId}?fields=fan_count,name,followers_count&access_token=${pageToken}`),
        // Insights: reach + new followers for current month
        fetch(
          `${META_API_BASE}/${pageId}/insights` +
          `?metric=page_impressions_unique,page_fan_adds_unique,page_engaged_users,page_views_total` +
          `&period=day&since=${since}&until=${until}` +
          `&access_token=${pageToken}`
        ),
      ]);

      let fans = 0, followers = 0;
      if (pageRes.status === 'fulfilled' && pageRes.value.ok) {
        const pd = await pageRes.value.json();
        fans      = pd.fan_count       || 0;
        followers = pd.followers_count || fans;
      }

      // Aggregate the daily insights into monthly totals
      let reach28 = 0, newFollowers = 0, engaged = 0, pageViews = 0;
      if (insightsRes.status === 'fulfilled' && insightsRes.value.ok) {
        const id = await insightsRes.value.json();
        const metrics = id.data || [];
        for (const metric of metrics) {
          const sum = (metric.values || []).reduce((acc, v) => acc + (v.value || 0), 0);
          switch (metric.name) {
            case 'page_impressions_unique': reach28      = sum; break;
            case 'page_fan_adds_unique':   newFollowers  = sum; break;
            case 'page_engaged_users':     engaged       = sum; break;
            case 'page_views_total':       pageViews     = sum; break;
          }
        }
      }

      result.facebook = { followers, fans, reach28Days: reach28, newFollowers28Days: newFollowers, engagedUsers28Days: engaged, pageViews28Days: pageViews };

    } catch (err) {
      console.error('Meta Facebook error:', err.message);
      result.facebook = { error: 'Could not load Facebook data.' };
    }
  }

  // ── Instagram Business ────────────────────────────────────────────────
  if (igUserId) {
    try {
      const [igRes, igInsightsRes, igMediaRes] = await Promise.allSettled([
        // Account info
        fetch(`${META_API_BASE}/${igUserId}?fields=followers_count,media_count,biography&access_token=${pageToken}`),
        // Account-level insights (days_28 period)
        fetch(
          `${META_API_BASE}/${igUserId}/insights` +
          `?metric=reach,impressions,profile_views,website_clicks` +
          `&period=days_28&access_token=${pageToken}`
        ),
        // Recent media for post performance
        fetch(
          `${META_API_BASE}/${igUserId}/media` +
          `?fields=id,timestamp,like_count,comments_count,media_type,permalink` +
          `&limit=10&access_token=${pageToken}`
        ),
      ]);

      let followers = 0, mediaCount = 0;
      if (igRes.status === 'fulfilled' && igRes.value.ok) {
        const igd = await igRes.value.json();
        followers  = igd.followers_count || 0;
        mediaCount = igd.media_count     || 0;
      }

      let reach28 = 0, impressions28 = 0, profileViews28 = 0, websiteClicks28 = 0;
      if (igInsightsRes.status === 'fulfilled' && igInsightsRes.value.ok) {
        const iid = await igInsightsRes.value.json();
        for (const metric of (iid.data || [])) {
          const val = metric?.values?.[0]?.value || metric?.value || 0;
          switch (metric.name) {
            case 'reach':          reach28         = val; break;
            case 'impressions':    impressions28   = val; break;
            case 'profile_views':  profileViews28  = val; break;
            case 'website_clicks': websiteClicks28 = val; break;
          }
        }
      }

      let recentPosts = [];
      if (igMediaRes.status === 'fulfilled' && igMediaRes.value.ok) {
        const imd = await igMediaRes.value.json();
        recentPosts = (imd.data || []).slice(0, 6).map(post => ({
          id:        post.id,
          timestamp: post.timestamp,
          likes:     post.like_count    || 0,
          comments:  post.comments_count|| 0,
          type:      post.media_type    || 'IMAGE',
          url:       post.permalink     || '',
        }));
      }

      result.instagram = {
        followers,
        mediaCount,
        reach28Days:         reach28,
        impressions28Days:   impressions28,
        profileViews28Days:  profileViews28,
        websiteClicks28Days: websiteClicks28,
        recentPosts,
      };

    } catch (err) {
      console.error('Meta Instagram error:', err.message);
      result.instagram = { error: 'Could not load Instagram data.' };
    }
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GA4 — Google Analytics (reuses existing OAuth token from KV)
   ═══════════════════════════════════════════════════════════════════════════ */
async function fetchGA4(kv, propertyId, month, year) {
  if (!kv) throw new Error('GOOGLE_KV binding not available');

  // Load stored OAuth tokens
  const raw = await kv.get(GOOGLE_TOKEN_KEY);
  if (!raw) throw new Error('Google not connected — no tokens in KV');

  let tokens;
  try { tokens = JSON.parse(raw); } catch { throw new Error('Invalid token data in KV'); }

  // Refresh if expired (or within 5 minutes of expiry)
  let accessToken = tokens.access_token;
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 300_000) {
    accessToken = await refreshGoogleToken(kv, tokens);
  }

  // Build date range for the requested month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay   = new Date(year, month, 0).getDate();
  const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const body = {
    dateRanges:  [{ startDate, endDate }],
    dimensions:  [{ name: 'sessionDefaultChannelGroup' }],
    metrics:     [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
  };

  const res = await fetch(
    `${GA4_API_BASE}/properties/${propertyId}:runReport`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const rows = data.rows || [];

  let totalSessions = 0, totalUsers = 0, bounceRate = 0, avgDuration = 0;
  const channels = [];

  for (const row of rows) {
    const channel  = row.dimensionValues?.[0]?.value || 'Unknown';
    const sessions = parseInt(row.metricValues?.[0]?.value || '0');
    const users    = parseInt(row.metricValues?.[1]?.value || '0');
    const bounce   = parseFloat(row.metricValues?.[2]?.value || '0');
    const duration = parseFloat(row.metricValues?.[3]?.value || '0');

    totalSessions += sessions;
    totalUsers    += users;
    channels.push({ channel, sessions, users });

    // Weighted bounce rate and duration
    if (sessions > 0) {
      bounceRate  += bounce   * sessions;
      avgDuration += duration * sessions;
    }
  }

  // Finalise weighted averages
  if (totalSessions > 0) {
    bounceRate  = Math.round((bounceRate  / totalSessions) * 100);
    avgDuration = Math.round(avgDuration  / totalSessions);
  }

  // Sort channels by sessions
  channels.sort((a, b) => b.sessions - a.sessions);

  return {
    sessions:               totalSessions,
    users:                  totalUsers,
    bounceRate:             bounceRate,
    avgSessionDurationSec:  avgDuration,
    trafficChannels:        channels.slice(0, 6),
  };
}

/* ─── Google Token Refresh ─────────────────────────────────────────────── */
async function refreshGoogleToken(kv, tokens) {
  // The client credentials are stored as a separate KV key
  const credsRaw = await kv.get('google_credentials');
  if (!credsRaw) throw new Error('Google credentials not in KV');
  const creds = JSON.parse(credsRaw);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: tokens.refresh_token,
      grant_type:    'refresh_token',
    }),
  });

  if (!res.ok) throw new Error('Token refresh failed');
  const newTokens = await res.json();

  const updated = {
    ...tokens,
    access_token: newTokens.access_token,
    expiry_date:  Date.now() + (newTokens.expires_in * 1000),
  };

  await kv.put(GOOGLE_TOKEN_KEY, JSON.stringify(updated));
  return newTokens.access_token;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */
export async function onRequestPost(context) {
  const { env, request } = context;

  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // ── Check MTM GHL is configured ──────────────────────────────────────
  if (!env.MTM_GHL_SECRET) {
    return new Response(JSON.stringify({ notConfigured: true }), { status: 200, headers });
  }

  let body = {};
  try { body = await request.json(); } catch { /* use defaults */ }

  const now   = new Date();
  const month = body.month || (now.getMonth() + 1);
  const year  = body.year  || now.getFullYear();

  // ── Parallel fetch — each source fails independently ─────────────────
  const [ghlResult, metaResult, ga4Result] = await Promise.allSettled([

    fetchGHL(env.MTM_GHL_SECRET, month, year),

    (env.MTM_META_PAGE_TOKEN && env.MTM_META_PAGE_ID)
      ? fetchMeta(env.MTM_META_PAGE_TOKEN, env.MTM_META_PAGE_ID, env.MTM_META_IG_USER_ID || null)
      : Promise.reject(new Error('Meta not configured')),

    (env.MTM_GA4_PROPERTY_ID && env.GOOGLE_KV)
      ? fetchGA4(env.GOOGLE_KV, env.MTM_GA4_PROPERTY_ID, month, year)
      : Promise.reject(new Error('GA4 not configured')),

  ]);

  // ── Build response ────────────────────────────────────────────────────
  const response = {
    success: ghlResult.status === 'fulfilled',
    period:  { month, year, label: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}` },
    ghl:     ghlResult.status === 'fulfilled'
               ? ghlResult.value
               : { error: ghlResult.reason?.message || 'GHL data unavailable' },
    meta:    metaResult.status === 'fulfilled'
               ? metaResult.value
               : null,   // null = not configured, don't show error state
    ga4:     ga4Result.status === 'fulfilled'
               ? ga4Result.value
               : null,
  };

  // Surface GHL error if it failed (so frontend can show an error message)
  if (ghlResult.status === 'rejected') {
    response.error = ghlResult.reason?.message || 'Could not connect to GHL.';
  }

  return new Response(JSON.stringify(response), { status: 200, headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
