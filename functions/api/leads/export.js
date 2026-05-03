/**
 * MTM Tool 07 — CSV Export
 * Route: GET /api/leads/export?tier=Hot
 *
 * Returns a CSV file of all leads (or filtered by tier) for the user to download.
 * Same auth & filter rules as /api/leads/list.
 *
 * Environment Variables:
 *   ADMIN_PASSWORD_HASH | TOOLS_PASSWORD_HASH — auth (Bearer)
 *   DB — D1 binding
 *
 * Note: Browsers cannot easily attach a Bearer header to a plain <a download>
 * link, so the Tool 07 UI fetches this endpoint via fetch() and converts the
 * response into a Blob for download.
 */

import { jsonResponse, corsPreflight, requireAdmin, requireDb } from './_auth.js';

export const onRequestOptions = () => corsPreflight();

export async function onRequestGet(context) {
  const { request, env } = context;
  const authErr = requireAdmin(request, env); if (authErr) return authErr;
  const dbErr   = requireDb(env);             if (dbErr)   return dbErr;

  const url = new URL(request.url);
  const tier = url.searchParams.get('tier');
  const where = [];
  const args  = [];
  if (tier && ['Hot', 'Warm', 'Cold'].includes(tier)) { where.push('tier = ?'); args.push(tier); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let rows;
  try {
    const r = await env.DB.prepare(
      `SELECT id, business_name, category, address, phone, email, website_url,
              score, tier, score_reason, scored_at, contacted, contacted_at,
              source_batch, created_at
       FROM leads_outreach
       ${whereSql}
       ORDER BY (score IS NULL), score DESC, id DESC`
    ).bind(...args).all();
    rows = r.results || [];
  } catch (err) {
    return jsonResponse({ error: 'Query failed: ' + err.message }, { status: 500 });
  }

  const headers = [
    'rank', 'id', 'business_name', 'category', 'tier', 'score', 'score_reason',
    'phone', 'email', 'website_url', 'address',
    'contacted', 'contacted_at', 'scored_at', 'source_batch', 'created_at',
  ];

  const lines = [headers.join(',')];
  rows.forEach((row, idx) => {
    const r = {
      rank: idx + 1,
      ...row,
      contacted: row.contacted ? 'yes' : 'no',
    };
    lines.push(headers.map(h => csvEscape(r[h])).join(','));
  });

  const filename = `mtm_leads_${tier || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
