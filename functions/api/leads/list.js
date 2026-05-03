/**
 * MTM Tool 07 — List / Filter Leads
 * Route: GET /api/leads/list?tier=Hot&sort=score&dir=desc&limit=500&unscored=1
 *
 * Query params (all optional):
 *   tier      — "Hot" | "Warm" | "Cold"
 *   contacted — "0" | "1"
 *   unscored  — "1"  (only rows where score IS NULL)
 *   sort      — "score" | "created_at" | "business_name"  (default: "score")
 *   dir       — "asc" | "desc"  (default: "desc")
 *   limit     — integer, max 1000 (default 500)
 *   offset    — integer (default 0)
 *
 * Returns:
 *   { success: true, total: N, results: [...], summary: { hot, warm, cold, unscored, contacted } }
 *
 * Environment Variables:
 *   ADMIN_PASSWORD_HASH | TOOLS_PASSWORD_HASH — auth (Bearer)
 *   DB — D1 binding
 */

import { jsonResponse, corsPreflight, requireAdmin, requireDb } from './_auth.js';

export const onRequestOptions = () => corsPreflight();

export async function onRequestGet(context) {
  const { request, env } = context;
  const authErr = requireAdmin(request, env); if (authErr) return authErr;
  const dbErr   = requireDb(env);             if (dbErr)   return dbErr;

  const url = new URL(request.url);
  const tier      = url.searchParams.get('tier');
  const contacted = url.searchParams.get('contacted');
  const unscored  = url.searchParams.get('unscored');
  const sortRaw   = url.searchParams.get('sort') || 'score';
  const dirRaw    = (url.searchParams.get('dir') || 'desc').toLowerCase();
  const limit     = Math.min(parseInt(url.searchParams.get('limit') || '500', 10) || 500, 1000);
  const offset    = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  const sortCol = ['score', 'created_at', 'business_name', 'tier'].includes(sortRaw) ? sortRaw : 'score';
  const sortDir = dirRaw === 'asc' ? 'ASC' : 'DESC';

  const where = [];
  const args  = [];
  if (tier && ['Hot', 'Warm', 'Cold'].includes(tier))           { where.push('tier = ?');       args.push(tier); }
  if (contacted === '0' || contacted === '1')                   { where.push('contacted = ?');  args.push(parseInt(contacted, 10)); }
  if (unscored === '1')                                         { where.push('score IS NULL');  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // NULL-safe sort: NULLs always last regardless of direction.
  const orderSql = `ORDER BY (${sortCol} IS NULL), ${sortCol} ${sortDir}, id ${sortDir}`;

  try {
    const listSql  = `SELECT * FROM leads_outreach ${whereSql} ${orderSql} LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) AS total FROM leads_outreach ${whereSql}`;

    const [listRes, countRes, summaryRes] = await Promise.all([
      env.DB.prepare(listSql).bind(...args, limit, offset).all(),
      env.DB.prepare(countSql).bind(...args).first(),
      env.DB.prepare(`
        SELECT
          SUM(CASE WHEN tier = 'Hot'  THEN 1 ELSE 0 END) AS hot,
          SUM(CASE WHEN tier = 'Warm' THEN 1 ELSE 0 END) AS warm,
          SUM(CASE WHEN tier = 'Cold' THEN 1 ELSE 0 END) AS cold,
          SUM(CASE WHEN score IS NULL THEN 1 ELSE 0 END) AS unscored,
          SUM(CASE WHEN contacted = 1 THEN 1 ELSE 0 END) AS contacted,
          COUNT(*) AS total
        FROM leads_outreach
      `).first(),
    ]);

    return jsonResponse({
      success: true,
      total:   countRes?.total || 0,
      results: listRes.results || [],
      summary: {
        hot:       summaryRes?.hot       || 0,
        warm:      summaryRes?.warm      || 0,
        cold:      summaryRes?.cold      || 0,
        unscored:  summaryRes?.unscored  || 0,
        contacted: summaryRes?.contacted || 0,
        total:     summaryRes?.total     || 0,
      },
    });
  } catch (err) {
    return jsonResponse({ error: 'Query failed: ' + err.message }, { status: 500 });
  }
}
