/**
 * MTM Tool 07 — Toggle "contacted" flag on a lead
 * Route: POST /api/leads/contacted
 *
 * Body: { id: <int>, contacted: <bool> }
 * Returns: { success: true, id, contacted, contacted_at }
 *
 * Environment Variables:
 *   ADMIN_PASSWORD_HASH | TOOLS_PASSWORD_HASH — auth (Bearer)
 *   DB — D1 binding
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

  const id = parseInt(body?.id, 10);
  const contacted = body?.contacted ? 1 : 0;
  if (!Number.isInteger(id) || id <= 0) {
    return jsonResponse({ error: 'Body must include a positive integer `id`.' }, { status: 400 });
  }

  try {
    const ts = contacted ? new Date().toISOString() : null;
    const res = await env.DB.prepare(
      `UPDATE leads_outreach SET contacted = ?, contacted_at = ? WHERE id = ?`
    ).bind(contacted, ts, id).run();
    if ((res.meta?.changes || 0) === 0) {
      return jsonResponse({ error: 'No lead with that id.' }, { status: 404 });
    }
    return jsonResponse({ success: true, id, contacted: !!contacted, contacted_at: ts });
  } catch (err) {
    return jsonResponse({ error: 'Update failed: ' + err.message }, { status: 500 });
  }
}
