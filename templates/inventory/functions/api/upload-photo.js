// Cloudflare Pages Function: /functions/api/upload-photo.js
// Accepts a photo file upload, commits it to GitHub under /images/inventory/,
// and returns the public URL served by Cloudflare Pages.
//
// Uses the same env variables as update-inventory.js:
//   GITHUB_TOKEN  — GitHub Personal Access Token with repo write access
//   GITHUB_REPO   — e.g. "MoreThanMomentum/{{BUSINESS_NAME_SLUG}}-website"

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_REPO  = env.GITHUB_REPO;

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return new Response(
        JSON.stringify({ message: 'Server not configured. Set GITHUB_TOKEN and GITHUB_REPO.' }),
        { status: 500, headers }
      );
    }

    // ── Parse multipart form data ──
    const formData = await request.formData();
    const file     = formData.get('file');
    const cartId   = (formData.get('cartId') || 'cart').replace(/[^a-z0-9-]/g, '-');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ message: 'No file provided.' }), { status: 400, headers });
    }

    // ── Validate type ──
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return new Response(
        JSON.stringify({ message: 'Only JPG, PNG, and WebP images are allowed.' }),
        { status: 400, headers }
      );
    }

    // ── Validate size (5 MB max) ──
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ message: 'File too large. Max size is 5 MB.' }),
        { status: 400, headers }
      );
    }

    // ── Build path and filename ──
    const ext       = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const timestamp = Date.now();
    const filename  = `${cartId}-${timestamp}.${ext}`;
    const repoPath  = `images/inventory/${filename}`;

    // ── Convert file to base64 for GitHub API ──
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array  = new Uint8Array(arrayBuffer);
    let binary = '';
    // Process in chunks to avoid call stack overflow on large files
    const CHUNK = 8192;
    for (let i = 0; i < uint8Array.length; i += CHUNK) {
      binary += String.fromCharCode(...uint8Array.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);

    // ── Check if file already exists (needed for SHA if overwriting) ──
    const checkRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept':        'application/vnd.github.v3+json',
          'User-Agent':    '{{BUSINESS_NAME_SLUG}}-Admin-Panel',
        }
      }
    );

    const commitPayload = {
      message: `Admin: upload cart photo — ${filename}`,
      content: base64,
    };

    // Include SHA only if overwriting an existing file (rare with timestamps, but safe)
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.sha) commitPayload.sha = existing.sha;
    }

    // ── Commit image to GitHub ──
    const commitRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept':        'application/vnd.github.v3+json',
          'Content-Type':  'application/json',
          'User-Agent':    '{{BUSINESS_NAME_SLUG}}-Admin-Panel',
        },
        body: JSON.stringify(commitPayload),
      }
    );

    if (!commitRes.ok) {
      const errData = await commitRes.json();
      return new Response(
        JSON.stringify({ message: errData.message || 'GitHub upload failed.' }),
        { status: 500, headers }
      );
    }

    // ── Return the public URL (served via Cloudflare Pages, not raw GitHub) ──
    const publicUrl = `/${repoPath}`;

    return new Response(
      JSON.stringify({ success: true, url: publicUrl, filename }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error('[{{LOG_PREFIX}}] upload-photo error:', err.message);
    return new Response(
      JSON.stringify({ message: err.message }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
