# Tool 07 — Lead Scoring & Outreach (Phase 1)

The Tool 07 module lives entirely inside the existing MTM website / tools dashboard. It uses Cloudflare Pages Functions for the API, Cloudflare D1 for storage, and the Anthropic API for scoring. No third-party SaaS.

## Files

```
functions/api/leads/
  _auth.js          shared auth + JSON helpers
  source.js         POST /api/leads/source     pull from Google Places (New)
  upload.js         POST /api/leads/upload     parse CSV/JSON → D1
  list.js           GET  /api/leads/list       filterable, sortable
  score.js          POST /api/leads/score      AI scoring batch (≤25)
  contacted.js      POST /api/leads/contacted  toggle done flag
  export.js         GET  /api/leads/export     download as CSV

migrations/
  0001_leads_outreach.sql   D1 schema (leads_outreach + opt_outs + scoring_runs)
  0002_optout_extras.sql    add business_name + phone columns to opt_outs

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

### 2. Apply the migrations

```bash
# remote production database
npx wrangler d1 execute mtm_outreach --remote --file=./migrations/0001_leads_outreach.sql
npx wrangler d1 execute mtm_outreach --remote --file=./migrations/0002_optout_extras.sql
```

`0002` adds `business_name` and `phone` columns to `opt_outs` so the Source Leads tab can suppress businesses by name or phone (Google Places never returns email addresses, so an email-only suppression list cannot filter them).

For local dev (`wrangler pages dev`) drop `--remote` from each command.

### 3. Set environment variables

Cloudflare dashboard → **Pages → Momentum-website → Settings → Environment variables → Production**:

| Variable | Type | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | MTM's internal Anthropic key (already set if other tools work). Used by `/api/leads/score`. |
| `GOOGLE_PLACES_API_KEY` | Secret | **Required for the Source Leads tab.** A single Google Cloud API key with **Places API (New)** AND **Geocoding API** enabled. ~$0.032 per Text Search call. The Source tab returns a clear error if this is missing rather than silently failing. |
| `ADMIN_PASSWORD_HASH` | Plain | Optional — set a stricter password just for Tool 07. If absent, falls back to existing `TOOLS_PASSWORD_HASH`. |

#### Getting the Google Places API key

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create or pick a project. Enable **Places API (New)** and **Geocoding API** under APIs & Services → Library.
3. APIs & Services → Credentials → Create credentials → API key. Copy it.
4. Restrict the key (recommended): under **Application restrictions** pick **HTTP referrers** and add `*.morethanmomentum.com/*`; under **API restrictions** pick the two APIs above. This stops the key being abused if it ever leaks.
5. Paste it into Cloudflare Pages → Settings → Environment variables → Production → Add variable, name `GOOGLE_PLACES_API_KEY`, **Encrypt** ticked.

Generate a hash:

```bash
echo -n "your-strong-password" | shasum -a 256 | cut -d' ' -f1
```

### 4. Redeploy

Push to `main` — Cloudflare Pages auto-deploys within ~60s. Open `/tools.html`, log in with the dashboard password, click the **Lead Scoring & Outreach** card.

## Day-to-day usage

The full pipeline is **Source → Score → Rank → Outreach** and runs entirely inside the Tool 07 slide-in panel.

### Recommended path — Source Leads tab (fastest)

1. Open Tool 07. The **Source Leads** tab is the default landing tab.
2. Type a category (e.g. `HVAC`, `Plumber`, `Landscaping`), a location (`Keene, NH`), pick a radius (10 / 25 / 50 mi) and a max-results count (10 / 20 / 40 / 60).
3. Click **Search Google Maps**. The endpoint geocodes the location, calls Google Places (New) Text Search around it, and inserts every business it finds — minus duplicates (matched on `business_name + address`) and minus opt-outs (matched on `business_name` or `phone`).
4. The stat row shows `Pulled / Added / Duplicates Skipped / Opt-Outs Skipped`. The preview table shows what was just inserted.
5. Click **Go to Score Queue →**. The panel jumps to the Score Queue tab.
6. Click **Run Scoring on Next Batch** until the unscored counter hits 0.
7. Switch to **Ranked Leads** — table sorted by score desc, filterable by tier. Click phone/email to call/mail directly. Tick **Done** after you've reached out.
8. Repeat steps 2–7 for additional categories or cities. Within ~15 minutes you have a fully scored, ranked outreach list for an entire local market.

### Alternate path — manual CSV upload (still supported)

1. Pull a CSV from any source (Outscraper, hand-built, exported from another tool). Required column: `business_name`. Recognised optional columns: `category`, `address`, `phone`, `website`, `email`.
2. Open Tool 07 → **Upload** tab → drop the file (or paste raw CSV/JSON). Add a batch label like `Manchester-NH-2026-05-03` so you can find this run later.
3. Continue from step 6 above.

### Source Leads — endpoint summary

| Item | Detail |
|---|---|
| Method | `POST /api/leads/source` |
| Body | `{ "searchTerm": "HVAC", "location": "Keene, NH", "radius": 40234, "maxResults": 20 }` |
| Auth | Same Bearer token used by every other Tool 07 endpoint |
| Cost | ~$0.032 per call (Google Places Text Search) + ~$0.005 per geocode |
| Response | `{ success, pulled, inserted, skipped_duplicate, skipped_optout, businesses[] }` |

CSV export at any time via the **⇩ Export CSV** button on the Ranked Leads tab.

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
