// Cloudflare Pages Function: /functions/api/update-inventory.js
// This runs server-side so the GitHub token is never exposed to the browser.
// Set these in Cloudflare Pages → Settings → Environment Variables:
//   GITHUB_TOKEN  — a GitHub Personal Access Token with repo write access
//   GITHUB_REPO   — e.g. "MoreThanMomentum/{{BUSINESS_NAME_SLUG}}-website"
//   ADMIN_PASSWORD — must match the password in admin.html

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const { carts, accessories, filters } = body;

    if (!carts || !Array.isArray(carts)) {
      return new Response(JSON.stringify({ message: 'Invalid payload' }), { status: 400, headers });
    }

    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_REPO  = env.GITHUB_REPO;

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return new Response(JSON.stringify({ message: 'Server not configured. Set GITHUB_TOKEN and GITHUB_REPO.' }), { status: 500, headers });
    }

    // 1. Get current file SHA (required by GitHub API to update a file)
    const fileRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/inventory.json`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': '{{BUSINESS_NAME_SLUG}}-Admin-Panel',
        }
      }
    );

    if (!fileRes.ok) {
      return new Response(JSON.stringify({ message: 'Could not read inventory from GitHub.' }), { status: 500, headers });
    }

    const fileData = await fileRes.json();
    const sha = fileData.sha;

    // 2. Encode new content — preserve filters block alongside carts
    const payload    = { filters: filters || {}, carts: carts || [], accessories: accessories || [] };
    const newContent = JSON.stringify(payload, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(newContent)));

    // 3. Commit updated inventory.json
    const updateRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/inventory.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': '{{BUSINESS_NAME_SLUG}}-Admin-Panel',
        },
        body: JSON.stringify({
          message: 'Admin: update inventory',
          content: encoded,
          sha: sha,
        })
      }
    );

    if (!updateRes.ok) {
      const errData = await updateRes.json();
      return new Response(JSON.stringify({ message: errData.message || 'GitHub update failed.' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500, headers });
  }
}

// Handle OPTIONS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
