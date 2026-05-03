# Tool 07 — Lead Scoring & Outreach (Phase 1)

The Tool 07 module lives entirely inside the existing MTM website / tools dashboard. It uses Cloudflare Pages Functions for the API, Cloudflare D1 for storage, and the Anthropic API for scoring. No third-party SaaS.

## Files

```
functions/api/leads/
  _auth.js          shared auth + JSON helpers
  upload.js         POST /api/leads/upload     parse CSV/JSON → D1
  list.js           GET  /api/leads/list       filterable, sortable
  score.js          POST /api/leads/score      AI scoring batch (≤25)
  contacted.js      POST /api/leads/contacted  toggle done flag
  export.js         GET  /api/leads/export     download as CSV

migrations/
  0001_leads_outreach.sql   D1 schema (leads_outreach + opt_outs + scoring_runs)

tools.html        Tool 07 card + slide-in panel + frontend JS
docs/
  TOOL07_LEAD_SCORING.md         this file
  PHASE2_EMAIL_ARCHITECTURE.md   what gets built next
```

## One-time setup

### 1. Create the D1 database

```bash
npx wrangler d1 create mtm_outreach
```

Copy the `database_id` Wrangler prints. In Cloudflare dashboard → **Pages → Momentum-website → Settings → Functions → D1 database bindings**, add:

| Variable name | D1 database |
|---|---|
| `DB` | `mtm_outreach` |

### 2. Apply the migration

```bash
# remote production database
npx wrangler d1 execute mtm_outreach --remote --file=./migrations/0001_leads_outreach.sql
```

For local dev (`wrangler pages dev`) drop `--remote`.

### 3. Set environment variables

Cloudflare dashboard → **Pages → Momentum-website → Settings → Environment variables → Production**:

| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-…` | MTM's internal Anthropic key (already set if other tools work) |
| `ADMIN_PASSWORD_HASH` | `<sha256-hex>` | Optional — set a stricter password just for Tool 07. If absent, falls back to existing `TOOLS_PASSWORD_HASH`. |

Generate a hash:

```bash
echo -n "your-strong-password" | shasum -a 256 | cut -d' ' -f1
```

### 4. Redeploy

Push to `main` — Cloudflare Pages auto-deploys within ~60s. Open `/tools.html`, log in with the dashboard password, click the **Lead Scoring & Outreach** card.

## Day-to-day usage

1. Pull a CSV from Google Maps API or Outscraper. Make sure it has a `business_name` column. Other recognised columns: `category`, `address`, `phone`, `website` (or `website_url`), `email`.
2. Open Tool 07 → **Upload** tab → drop the file (or paste raw CSV/JSON). Add a batch label like `Manchester-NH-2026-05-03` so you can find this run later.
3. Switch to the **Score Queue** tab. Click **Run Scoring on Next Batch** repeatedly until the unscored counter hits 0. Each batch is 10 leads (~30–60s) by default; bump batch size to 25 for faster runs.
4. Switch to **Ranked Leads** — table is sorted by score desc, filterable by tier. Click the phone or email to call/mail directly. Tick the **Done** box after you've reached out and the row dims.
5. **Export CSV** at any time to take the list off-platform.

## Scoring rubric (lives in `score.js`)

| Penalty | Trigger |
|---|---|
| +25 | No mobile responsiveness or poor mobile layout |
| +20 | No visible lead capture form or contact CTA |
| +20 | Visually outdated design (pre-2018 vibe) |
| +15 | No clear value proposition or confusing messaging |
| +10 | Missing or broken pages, slow load indicators, placeholder content |
| +5  | No social media links or dead social links |
| +5  | No SSL / not HTTPS |

Special cases handled in code (deterministic, not by Claude):
- **No website URL on record** → score 85, reason "No website found."
- **Site fetch fails / times out at 10s** → score 80, reason "Site unreachable — likely outdated or broken."
- **Site is HTTP (not HTTPS)** → automatic +5 if Claude didn't already mention it.

Tier mapping:
- `score ≥ 70` → **Hot** (red)
- `40 ≤ score ≤ 69` → **Warm** (yellow)
- `score < 40` → **Cold** (green)

## Architecture

```
┌─────────────────┐    Authorization: Bearer <token>    ┌──────────────────────┐
│  tools.html UI  │ ──────────────────────────────────► │  Pages Functions     │
│  (browser)      │                                     │  /api/leads/*        │
│                 │ ◄────────────────────────────────── │                      │
└─────────────────┘            JSON                     └──────────┬───────────┘
                                                                   │
                                              ┌────────────────────┼──────────────────┐
                                              ▼                    ▼                  ▼
                                     ┌──────────────┐    ┌────────────────┐  ┌──────────────┐
                                     │ Cloudflare D1 │    │ Anthropic API  │  │ Prospect's   │
                                     │ leads_outreach│    │ claude-sonnet  │  │ website (HTTP│
                                     │ opt_outs     │    │ -4-20250514    │  │ fetch w/10s   │
                                     │ scoring_runs │    └────────────────┘  │ timeout)     │
                                     └──────────────┘                        └──────────────┘
```

The auth token is the SHA-256 hash of the dashboard password. The browser stores it in `sessionStorage` under `mtm_tools_token` after the existing `/api/verify-tools` login. Tool 07 reuses that token — no second login.

## What's next

Phase 2 (`docs/PHASE2_EMAIL_ARCHITECTURE.md`) bolts an AWS SES sender on top of this same database so the ranked list can be auto-emailed instead of worked manually. Build it once Phase 1 is in steady use and you're scaling outreach across multiple cities.
