-- ─────────────────────────────────────────────────────────────────────────────
-- MTM Tool 07 — Migration 0002
-- Extends opt_outs so the Source Leads endpoint can suppress by business name
-- and phone number (not just email). This is required because Google Places
-- never returns emails — every Source-pulled record is email-null at insert
-- time, so an email-only opt-out list cannot suppress them.
--
-- Apply (remote):
--   npx wrangler d1 execute mtm_outreach --remote --file=./migrations/0002_optout_extras.sql
--
-- Apply (local):
--   npx wrangler d1 execute mtm_outreach --local  --file=./migrations/0002_optout_extras.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE opt_outs ADD COLUMN business_name TEXT;
ALTER TABLE opt_outs ADD COLUMN phone         TEXT;

-- The original UNIQUE constraint was on email and remains in force. The new
-- columns are optional — an opt-out row may carry any combination of email,
-- business_name, or phone. The Source endpoint matches on EITHER name OR
-- phone (case-insensitive for name, exact for phone digits).

CREATE INDEX IF NOT EXISTS idx_optouts_name_lc ON opt_outs (LOWER(business_name));
CREATE INDEX IF NOT EXISTS idx_optouts_phone   ON opt_outs (phone);
