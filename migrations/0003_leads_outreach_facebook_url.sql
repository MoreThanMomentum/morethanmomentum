-- ─────────────────────────────────────────────────────────────────────────────
-- MTM Tool 07 — Migration 0003
-- Adds facebook_url to leads_outreach so the GHL outreach pipeline can read a
-- discovered (or manually populated) Facebook business page URL alongside the
-- existing website_url. Populated by discoverSocialUrls() in outreach.js when
-- a lead's website_url links out to facebook.com in its header / footer.
--
-- Apply (remote — production):
--   npx wrangler d1 execute mtm_outreach --remote --file=./migrations/0003_leads_outreach_facebook_url.sql
--
-- Apply (local):
--   npx wrangler d1 execute mtm_outreach --local  --file=./migrations/0003_leads_outreach_facebook_url.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads_outreach ADD COLUMN facebook_url TEXT;
