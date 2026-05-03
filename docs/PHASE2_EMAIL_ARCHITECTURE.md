# Phase 2 — Self-Built Email Sending Infrastructure

> **Status:** documented, not yet built. Implement after Phase 1 (Tool 07 Lead Scoring) is in regular use and you are scaling outreach to multiple markets.

Phase 2 layers an automated, deliverability-aware email sender on top of the Phase 1 D1 lead database. Everything runs on infrastructure MTM owns: AWS SES does the sending, Cloudflare Workers orchestrate, D1 stores state, and a custom subdomain handles authentication and unsubscribe.

There is no third-party SaaS in the loop, no per-seat fees, no rate-limited API tier. SES costs roughly **$0.10 per 1,000 emails** — effectively free at the scale MTM cares about (≤ 6,000/month gives a ~$0.60 bill).

---

## 1. Domain Authentication

### 1.1 Use a sending subdomain — never the root

Create `outreach.morethanmomentum.com`. The root domain (`morethanmomentum.com`) keeps the marketing site reputation isolated from any cold-outreach reputation hit. If the subdomain ever gets blacklisted, the root still delivers transactional and marketing email cleanly.

### 1.2 DNS records (Cloudflare DNS)

Add the following records to the `morethanmomentum.com` zone in Cloudflare. SES generates the exact tokens in the SES console under **Verified identities → Create identity → Domain → Use Easy DKIM**.

| Type | Name | Value | TTL | Notes |
|------|------|-------|-----|-------|
| MX | `outreach` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | Auto | SES region-specific. Use the region you provision. |
| TXT | `outreach` | `v=spf1 include:amazonses.com ~all` | Auto | SPF — authorizes SES to send for the subdomain. |
| CNAME | `<token1>._domainkey.outreach` | `<token1>.dkim.amazonses.com` | Auto | DKIM key 1 (SES gives 3). |
| CNAME | `<token2>._domainkey.outreach` | `<token2>.dkim.amazonses.com` | Auto | DKIM key 2. |
| CNAME | `<token3>._domainkey.outreach` | `<token3>.dkim.amazonses.com` | Auto | DKIM key 3. |
| TXT | `_dmarc.outreach` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@morethanmomentum.com; pct=100; adkim=s; aspf=s` | Auto | DMARC — start at `p=quarantine`, move to `p=reject` after 30 days clean. |
| TXT | `_amazonses.outreach` | `<verification-token-from-SES>` | Auto | Domain ownership proof for SES. |

Verification typically completes within 15 minutes. SES marks the identity **Verified** in the console once SPF + DKIM resolve.

### 1.3 Custom MAIL FROM domain

In SES → **Verified identities → outreach.morethanmomentum.com → MAIL FROM domain** set `bounce.outreach.morethanmomentum.com`. Add the MX + SPF records SES requests. This makes bounce handling SPF-aligned, which is required for strict DMARC.

---

## 2. Database — D1 additions

Append to `migrations/0002_email_sending.sql` when ready:

```sql
-- Send queue — workers pull from here on the cron tick
CREATE TABLE IF NOT EXISTS send_queue (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id      INTEGER NOT NULL REFERENCES leads_outreach(id),
  template_id  TEXT    NOT NULL,        -- e.g. 'first-five-v1'
  scheduled_at TEXT    NOT NULL,        -- ISO 8601 — earliest send time
  status       TEXT    NOT NULL DEFAULT 'queued',
                                        -- queued | sent | failed | suppressed
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  ses_message_id TEXT,                  -- returned by SES on success
  sent_at      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_queue_status_time ON send_queue (status, scheduled_at);

-- Send log — append-only; one row per actual SES API call
CREATE TABLE IF NOT EXISTS send_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id      INTEGER REFERENCES send_queue(id),
  lead_id       INTEGER REFERENCES leads_outreach(id),
  to_email      TEXT NOT NULL,
  subject       TEXT,
  ses_response  TEXT,
  http_status   INTEGER,
  occurred_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bounce / complaint webhook events from SNS
CREATE TABLE IF NOT EXISTS ses_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT NOT NULL,            -- bounce | complaint | delivery
  to_email    TEXT,
  raw_json    TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The Phase 1 `opt_outs` table already exists and is the suppression list — Phase 2 honors it before every send.

---

## 3. Workers

### 3.1 `mtm-ses-sender` (cron-triggered)

Cloudflare Worker, separate codebase under `MoreThanMomentum/mtm-ses-sender`. Bound to the same D1 database as the Pages site.

Responsibilities:

1. Triggered by Cloudflare Cron Trigger `0 13 * * *` (every day 1pm UTC = 8am EST when on EDT, 9am EST otherwise — adjust seasonally or use `0 12 * * *` for fixed 8am EDT).
2. Compute today's send cap from the warming schedule (week-of-warming stored in KV: `WARMING_WEEK = "1" | "2" | "3" | "4" | "steady"`).
3. Pull the next N queued rows from `send_queue` where `scheduled_at <= now()` and `status = 'queued'`. Top up from `leads_outreach` if the queue is short — pull `tier IN ('Hot','Warm')`, `contacted = 0`, `email IS NOT NULL`, NOT IN `opt_outs`, ordered by score DESC.
4. For each row: render template, sign request with SigV4, POST to SES, log result.
5. Update `send_queue.status`, write to `send_log`, update `leads_outreach.contacted = 1` on success.
6. Sleep 1.5s between sends to keep well under SES per-second limits during warming.

Required env vars:

| Var | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user with `ses:SendEmail` only |
| `AWS_SECRET_ACCESS_KEY` | — |
| `AWS_REGION` | e.g. `us-east-1` |
| `SES_FROM_ADDRESS` | `cole@outreach.morethanmomentum.com` |
| `SES_REPLY_TO` | `cole@morethanmomentum.com` (your real inbox) |
| `WARMING_WEEK` | KV — current warming bucket |
| `LOOM_INTRO_URL` | The Loom video URL |
| `LOOM_INTRO_THUMBNAIL` | https://cdn.loom.com/sessions/thumbnails/... |
| `UNSUBSCRIBE_BASE` | `https://outreach.morethanmomentum.com/api/unsubscribe` |

SES SigV4 in a Worker: use the lightweight `aws4fetch` library — single dependency, ~6KB, no Node SDK needed.

### 3.2 `/api/unsubscribe` (Pages Function)

Add to the existing `Momentum-website` repo as `functions/api/unsubscribe.js`. Accepts a one-click GET (RFC 8058 List-Unsubscribe-Post) and a POST. Looks up the signed token, marks `opt_outs.email = <email>`, and returns a plain HTML "You've been removed" page.

Token format: `HMAC_SHA256(email, UNSUBSCRIBE_SECRET)` truncated to 16 hex chars, appended to the URL. No DB lookup needed to verify; just recompute and compare.

### 3.3 `/api/ses-webhook` (Pages Function, signed)

Receives bounce + complaint notifications from SES → SNS → HTTPS subscription. Validates SNS signature, writes to `ses_events`, and adds the `to_email` to `opt_outs` if event type is `complaint` or `permanent bounce`.

---

## 4. 4-Week Warming Schedule

| Week | Daily cap | Purpose |
|------|-----------|---------|
| 1 | **20** emails/day | Establish a baseline. Send only to manually-curated Hot leads. Watch SES reputation dashboard daily — bounce rate must stay < 2%, complaint rate < 0.1%. |
| 2 | **50** emails/day | Add tier=Warm leads. Begin checking deliverability with [mail-tester.com](https://www.mail-tester.com) on a couple of sends per day. |
| 3 | **100** emails/day | Continue mixed Hot+Warm. If bounce rate stays clean, start using cron-driven automated pulls instead of hand-picked. |
| 4 | **200** emails/day | Open the firehose. Sustain for at least 7 days at this volume before scaling further. |
| Steady-state | **≤ 500** emails/day | Hard ceiling per sending subdomain. To go above 500/day, provision a second subdomain (`outreach2.morethanmomentum.com`) with its own DKIM + warming cycle, and round-robin between them. |

The cap is enforced inside `mtm-ses-sender` — read `WARMING_WEEK` from KV, look up the cap from a constant table, exit early once cap is hit. Switch buckets manually:

```bash
npx wrangler kv:key put --binding=KV WARMING_WEEK "2"
```

---

## 5. Email Template

**Plain text only.** HTML cold email triggers spam filters and reads like a marketing blast. Plain text reads like one human writing to another, which is exactly what cold outreach should feel like.

Saved as `templates/first-five-v1.txt` in the sender Worker:

```
Subject: {{first_name}} — quick thought on {{business_name}}

Hi {{first_name}},

I run More Than Momentum — we build websites and digital marketing systems
for local {{category}} businesses. I took a look at {{business_name}}'s
site this morning and noticed {{score_reason_short}}.

I put together a 3-minute walkthrough of exactly what I'd change and the
kind of leads that fix would generate, you can watch it here:

{{loom_url}}

We're picking five local businesses to be our first portfolio clients —
full website rebuild + lead automation, at roughly half what we'll be
charging in 90 days. No catch, we just need the case studies.

If it's interesting, hit reply and I'll send a calendar link. If not,
no worries — and you can opt out of future notes from me at:
{{unsubscribe_url}}

— Cole Blanco
   More Than Momentum
   morethanmomentum.com
```

Merge fields, all populated by the sender Worker before the SES call:

| Field | Source |
|---|---|
| `{{first_name}}` | Best-effort: parse from `email` (`john@…`) → `John`, fallback to "there". |
| `{{business_name}}` | `leads_outreach.business_name` |
| `{{category}}` | `leads_outreach.category` (lowercased), fallback "service" |
| `{{score_reason_short}}` | First 90 chars of `leads_outreach.score_reason` |
| `{{loom_url}}` | `LOOM_INTRO_URL` env var |
| `{{unsubscribe_url}}` | `${UNSUBSCRIBE_BASE}?e=<urlenc-email>&t=<hmac-token>` |

Headers MUST include:

```
List-Unsubscribe: <mailto:unsubscribe@morethanmomentum.com>, <{{unsubscribe_url}}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

These two headers earn you the Gmail/Yahoo "one-click unsubscribe" treatment that bulk-sender requirements have made mandatory since Feb 2024.

---

## 6. Unsubscribe Flow (CAN-SPAM compliance)

1. Recipient clicks `https://outreach.morethanmomentum.com/api/unsubscribe?e=jane@biz.com&t=ab12cd34`.
2. Pages Function recomputes `HMAC_SHA256("jane@biz.com", UNSUBSCRIBE_SECRET)` — compares to `t`.
3. On match: `INSERT OR IGNORE INTO opt_outs (email, reason) VALUES (?, 'recipient_unsub')`.
4. Returns a 200 HTML page: "You've been removed from MTM outreach. Sorry for the noise."
5. The next cron run reads `opt_outs` before pulling from `leads_outreach`, so the recipient is filtered out forever.

For mailto-only clients (some legacy mailers), `unsubscribe@morethanmomentum.com` forwards into a Gmail filter that auto-replies and inserts the email into `opt_outs` via a small Apps Script trigger — or manually through the Tool 07 admin UI.

---

## 7. Monitoring

- **SES reputation dashboard** — bookmark; check daily during warming. Pause sends at first sign of bounce > 5% or complaint > 0.1%.
- **D1 query** — daily volume + bounce ratio:
  ```sql
  SELECT date(occurred_at) AS day,
         SUM(CASE WHEN http_status = 200 THEN 1 ELSE 0 END) AS sent,
         (SELECT COUNT(*) FROM ses_events WHERE date(occurred_at) = date('now') AND event_type = 'bounce') AS bounces
  FROM send_log
  GROUP BY date(occurred_at)
  ORDER BY day DESC LIMIT 14;
  ```
- **Add a "Sending" tab to Tool 07** that surfaces the same query as a chart.

---

## 8. Build Order When You're Ready

1. Verify subdomain in SES, add DNS records, confirm green checkmarks.
2. Move SES out of sandbox mode (open AWS support ticket — usually approved < 24h).
3. Apply `migrations/0002_email_sending.sql`.
4. Scaffold `mtm-ses-sender` Worker with `aws4fetch`, deploy with `WARMING_WEEK=1`.
5. Add `/api/unsubscribe` and `/api/ses-webhook` to Pages Functions.
6. Subscribe SES → SNS → webhook URL for bounces and complaints.
7. Manually queue 20 hand-picked sends, watch them go out, verify in Postmaster Tools.
8. Promote `WARMING_WEEK` weekly. Add the "Sending" tab to Tool 07 in week 2.

When all eight steps are done you have a fully owned, fully automated outreach pipeline that costs single-digit dollars per month and is not at the mercy of any third-party SaaS rate limit, deplatforming, or pricing change.
