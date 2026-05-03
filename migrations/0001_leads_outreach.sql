-- ─────────────────────────────────────────────────────────────────────────────
-- MTM Tool 07 — Local Business Outreach & Lead Scoring
-- Migration 0001 — leads_outreach + supporting tables
--
-- Apply (local):
--   npx wrangler d1 execute mtm_outreach --local --file=./migrations/0001_leads_outreach.sql
--
-- Apply (remote — production):
--   npx wrangler d1 execute mtm_outreach --remote --file=./migrations/0001_leads_outreach.sql
--
-- D1 binding name (configure in Cloudflare Pages → Settings → Functions → D1):
--   DB  →  mtm_outreach
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads_outreach (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name   TEXT    NOT NULL,
  category        TEXT,
  address         TEXT,
  phone           TEXT,
  website_url     TEXT,
  email           TEXT,
  score           INTEGER,
  tier            TEXT CHECK (tier IN ('Hot','Warm','Cold') OR tier IS NULL),
  score_reason    TEXT,
  scored_at       TEXT,                                            -- ISO 8601 string
  contacted       INTEGER NOT NULL DEFAULT 0,                      -- 0 = false, 1 = true
  contacted_at    TEXT,
  source_batch    TEXT,                                            -- e.g. "Manchester-NH-2026-05-03"
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_leads_score    ON leads_outreach (score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tier     ON leads_outreach (tier);
CREATE INDEX IF NOT EXISTS idx_leads_unscored ON leads_outreach (id) WHERE score IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_contact  ON leads_outreach (contacted);

-- Suppression list — referenced by Phase 1 (avoid re-importing opt-outs)
-- and consumed by the Phase 2 sender to suppress sends.
CREATE TABLE IF NOT EXISTS opt_outs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT    NOT NULL UNIQUE,
  reason       TEXT,
  opted_out_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_optouts_email ON opt_outs (email);

-- Audit trail of every scoring run (useful for debugging spend / failures)
CREATE TABLE IF NOT EXISTS scoring_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT,
  batch_size    INTEGER,
  attempted     INTEGER DEFAULT 0,
  scored_ok     INTEGER DEFAULT 0,
  scored_failed INTEGER DEFAULT 0,
  notes         TEXT
);
