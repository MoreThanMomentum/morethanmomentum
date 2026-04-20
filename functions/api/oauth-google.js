/**
 * MTM Google OAuth Setup Handler — Pages Function
 * Route: GET /api/oauth-google
 *
 * Two modes:
 *   GET ?action=init  → redirect to Google consent screen
 *   GET ?code=...     → exchange code for tokens, store refresh token in KV,
 *                       redirect back to /tools with ?oauth=success
 *
 * Environment Variables Required:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   MTM_CLIENT_PROFILES (KV binding — already exists)
 *
 * OAuth scopes needed:
 *   https://www.googleapis.com/auth/presentations
 *   https://www.googleapis.com/auth/drive.file
 *
 * Google Cloud Console setup:
 *   1. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web Application)
 *   2. Add authorized redirect URI: https://morethanmomentum.com/api/oauth-google
 *   3. Save Client ID and Secret as Cloudflare env vars
 *   4. Run the flow once from the Tools dashboard to generate the refresh token
 *   5. Copy the refresh token from KV (or the success page) and save as GOOGLE_OAUTH_REFRESH_TOKEN env var
 */

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

const REDIRECT_URI = 'https://morethanmomentum.com/api/oauth-google';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // ── INITIATE ──
  if (action === 'init') {
    if (!env.GOOGLE_OAUTH_CLIENT_ID) {
      return new Response('GOOGLE_OAUTH_CLIENT_ID not set in Cloudflare environment variables.', { status: 500 });
    }
    const authUrl = new URL(AUTH_URL);
    authUrl.searchParams.set('client_id', env.GOOGLE_OAUTH_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent'); // force refresh token issuance
    return Response.redirect(authUrl.toString(), 302);
  }

  // ── CALLBACK ──
  if (error) {
    return Response.redirect(`/tools?oauth=error&reason=${encodeURIComponent(error)}`, 302);
  }

  if (code) {
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return Response.redirect('/tools?oauth=error&reason=missing_credentials', 302);
    }

    try {
      const tokenResp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_OAUTH_CLIENT_ID,
          client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResp.json();

      if (!tokenData.refresh_token) {
        return Response.redirect(`/tools?oauth=error&reason=no_refresh_token`, 302);
      }

      // Store refresh token in KV so it's accessible to Workers
      if (env.MTM_CLIENT_PROFILES) {
        await env.MTM_CLIENT_PROFILES.put('mtm:google_refresh_token', tokenData.refresh_token);
      }

      // Redirect back to tools with success + token (so it can be copied into env vars)
      const successUrl = new URL('/tools', REDIRECT_URI);
      successUrl.searchParams.set('oauth', 'success');
      successUrl.searchParams.set('hint', 'Copy the refresh token to GOOGLE_OAUTH_REFRESH_TOKEN in Cloudflare env vars');
      return Response.redirect(successUrl.toString(), 302);

    } catch (err) {
      console.error('OAuth exchange error:', err.message);
      return Response.redirect(`/tools?oauth=error&reason=${encodeURIComponent(err.message)}`, 302);
    }
  }

  return new Response('Invalid request.', { status: 400 });
}
