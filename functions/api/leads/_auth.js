/**
 * MTM Tool 07 — Shared admin-auth helper
 *
 * Every /api/leads/* endpoint imports this. The Authorization header from the
 * front-end carries the same session token used by the rest of the dashboard
 * (the SHA-256 hash of the dashboard password, stored in sessionStorage as
 * mtm_tools_token). On the server we accept it if it matches EITHER:
 *
 *   ADMIN_PASSWORD_HASH  — preferred, lets you set a stricter password just
 *                          for the outreach tool
 *   TOOLS_PASSWORD_HASH  — fallback, the existing dashboard password
 *
 * Set ADMIN_PASSWORD_HASH in Cloudflare Pages → Settings → Environment
 * variables → Production. Generate the hash locally:
 *
 *   echo -n "your-strong-password" | shasum -a 256
 */

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...(init.headers || {}),
    },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Returns null if authorized, otherwise a Response to short-circuit with.
 */
export function requireAdmin(request, env) {
  const adminHash = env.ADMIN_PASSWORD_HASH || env.TOOLS_PASSWORD_HASH;
  if (!adminHash) {
    return jsonResponse(
      { error: 'Server misconfigured — set ADMIN_PASSWORD_HASH or TOOLS_PASSWORD_HASH in Cloudflare env vars.' },
      { status: 500 }
    );
  }
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== adminHash) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function requireDb(env) {
  if (!env.DB) {
    return jsonResponse(
      { error: 'D1 binding "DB" not configured. Bind it under Pages → Settings → Functions → D1.' },
      { status: 500 }
    );
  }
  return null;
}
