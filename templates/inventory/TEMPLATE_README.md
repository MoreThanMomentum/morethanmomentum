# Inventory Template (Dealer / Catalog)

Production-ready website template for high-ticket inventory businesses — golf cart dealers, vehicle dealers, RV/boat/motorcycle/equipment dealers, machinery sellers. The Tool 06 generator picks this template when a prospect chooses **Dealer / Catalog** as their site type.

---

## What this template gives a client

- **Home page** with hero, animated stats bar, dynamic featured inventory grid, lifestyle photos, testimonials, CTA strip
- **Shop page** with full catalog grid + filter bar (seats / make / color, all data-driven from `inventory.json`)
- **Rentals page** with package tiers + use cases (omit from generation if client doesn't rent)
- **Services page** with repair / battery upgrade / LSV detail blocks (omit if client doesn't offer service)
- **About page** with owner story + values list
- **Contact page** with lead form posting to GHL
- **Privacy + Terms page** (full SMS-compliant boilerplate)
- **Admin panel** (`/admin.html`) — desktop-only, password-gated, edits inventory + photos via GitHub commits
- **GHL calendar embed** in the home hero card for appointment booking
- **Sitemap.xml + favicon + GA4 tracking** scaffolding
- **Mobile-first responsive** at 480 / 767 / 1024 / 1280px breakpoints

The whole package is ~9000 lines of HTML/CSS/JS, ~600 lines of API functions, and 47 token placeholders that the generator fills from research data.

---

## How the generator uses this template

1. **Tool 06 frontend** receives `{ businessName, city, websiteUrl, tone, siteType: "dealer", pages: [...] }` POST body
2. **Backend** (`Momentum-website/functions/api/website-generate.js`) runs Stage A research as usual
3. When `siteType === "dealer"`, the backend takes the **template branch** (skips the AI-generation Stage B):
   - Fetches each file in this template via the Pages static-asset URL
   - Reads `tokens.json` to know what each `{{TOKEN}}` should become
   - Resolves token values from the research blob (or computes them, or pulls from env)
   - Substitutes tokens in every file
   - Filters files by the `pages` array from the request (e.g. drops `rentals.html` if unchecked)
   - Writes a fresh empty `inventory.json` and a freshly-generated `sitemap.xml`
   - Bundles into a ZIP
   - Streams a NDJSON success event back to the frontend
4. **Generation time** drops from ~90s (full AI generation) to ~5s (research + token substitution).

---

## Token contract

See `tokens.json` for the full declarative contract. Categories:

- **String tokens** — single-value substitutions (business name, phone, address)
- **Color tokens** — `:root` CSS variables driven by research branding
- **Block tokens** — full HTML blocks rendered from research data (testimonials, trust pills, trust badges)
- **Optional tokens** — empty fallback when not provided (finance partners, used inventory link)

**Token naming convention:** `{{UPPER_SNAKE_CASE}}`, no spaces, regex pattern `\{\{[A-Z_0-9]+\}\}`.

---

## Per-client setup steps (post-generation)

The generator outputs a per-client setup README with these steps filled in. Quick reference:

1. **Create GitHub repo** under the `MoreThanMomentum` org. Naming: `{{BUSINESS_NAME_SLUG}}-website`.
2. **Push the generated bundle** to that repo's `main` branch.
3. **Connect Cloudflare Pages** to the repo.
4. **Configure Cloudflare Pages env vars** (Settings → Environment Variables):
   - `GHL_API_KEY` — GHL sub-account API key
   - `GHL_LOCATION_ID` — GHL location ID
   - `GHL_CALENDAR_EMBED_URL` — from GHL → Calendars → Share → Embed
   - `GITHUB_TOKEN` — PAT with repo scope (for admin panel commits)
   - `GITHUB_REPO` — `MoreThanMomentum/{{BUSINESS_NAME_SLUG}}-website`
   - `ADMIN_PASSWORD` — random value generated per-client (printed once at gen time)
5. **Set up the GHL sub-account**: contact create custom fields (`cart_model`, `service_description`), calendar, location.
6. **Hand admin password to client** via secure channel (NOT email — use 1Password share link, encrypted message, or in-person handoff).
7. **Custom domain** — connect client domain in Cloudflare Pages.
8. **Google Search Console** — drop in client's own verification HTML file at the repo root (replaces the SNH-specific one which is excluded by default).
9. **Optional: real images** — replace placeholder paths under `/images/` with actual photos. See `tokens.json → files.image_placeholders` for the list.

---

## Admin panel access

The admin panel at `/admin.html` is desktop-only and password-gated. Two ways in:

1. **Direct URL** — type `/admin.html` in the address bar
2. **Hidden trigger** — triple-click the site logo in the nav within 2 seconds

Both methods bail out if the device is touch (no fine pointer) or the viewport is < 900px wide. `<head>`-level redirect on admin.html catches direct mobile visits before paint.

The admin panel commits inventory + photo changes directly to GitHub via the `/api/update-inventory` and `/api/upload-photo` Pages Functions, which means changes are live within ~60 seconds of saving (Cloudflare Pages auto-deploy from the main branch).

---

## File structure

```
templates/inventory/
├── index.html          ← homepage with hero card + GHL embed
├── shop.html           ← inventory grid + filters
├── rentals.html        ← rental packages (optional page)
├── services.html       ← repair / upgrade / LSV (optional page)
├── about.html          ← owner story
├── contact.html        ← lead form
├── privacy.html        ← privacy + terms
├── admin.html          ← admin panel (desktop-only)
├── styles.css          ← main stylesheet (1644 lines)
├── mobile.css          ← responsive overrides (624 lines)
├── main.js             ← site JS — nav, animations, filters, gallery (885 lines)
├── tokens.json         ← THIS template's token contract
├── TEMPLATE_README.md  ← (this file)
├── inventory.json      ← SAMPLE inventory data (regenerated empty per client)
├── sitemap.xml         ← SAMPLE sitemap (regenerated dynamically per client)
├── google495*.html     ← SNH-specific GSC verification (excluded per client)
├── images/             ← placeholder images + lifestyle stock
├── videos/             ← hero video placeholder
└── functions/api/
    ├── submit-service.js   ← service request → GHL contact + note
    ├── buy-now.js          ← cart purchase intent → GHL contact + note
    ├── update-inventory.js ← admin: write inventory.json to GitHub
    ├── upload-photo.js     ← admin: upload product photos to /images/inventory/
    ├── get-slots.js        ← DEPRECATED stub (GHL embed handles slots)
    └── book-appointment.js ← DEPRECATED stub (GHL embed handles booking)
```

---

## Things NOT in this template (intentionally)

- **No AI Cart Finder** — was SNH-specific; removed in Commit 1 of the template-grounding work.
- **No Anthropic API call from the deployed site** — the only place Anthropic gets called is the generator itself, not the client's running site.
- **No custom calendar widget** — replaced with GHL iframe embed in Commit 2.
- **No timezone-handling code** — GHL embed handles its own time zones.
- **No hardcoded testimonials** — fully driven by `{{REVIEWS_GRID_HTML}}` block token from research data.
- **No hardcoded trust pills** — `{{HERO_TRUST_PILLS_HTML}}` and `{{FOOTER_TRUST_BADGES_HTML}}` are research-driven.
- **No vocabulary substitution at template time** — golf-cart language stays in the SAMPLE template; the generator does an AI naturalization pass for non-golf-cart inventory clients (bakery → "pastries", boat dealer → "boats" etc.). This pass is a single Claude call after token substitution, not full from-scratch generation.

---

## Versioning

- **v1.0.0** — Initial template-grounding release. 47 tokens. Inventory site type. Tool 06 backend skips Stage B for this template.

When this template's token contract changes (new tokens added, renamed, or removed), bump `tokens.json::version` and document the change here.

---

## Editing this template

If you need to update the template (add a new section, change copy, fix a bug), edit the files here directly. Token placeholders stay as `{{TOKEN}}` — never hardcode values.

When adding a new piece of content that varies per client, decide:

- **String token** if it's a single-value swap (a name, phone, URL)
- **Color token** if it's a brand color
- **Block token** if it's a chunk of HTML rendered from a list or conditional
- **Always-static** if it applies to every client identically (legal disclaimers, generic instructions)

After edits, run a sanity grep for stray business-specific strings:
```
grep -rE 'SNH|Bill|6037777|snhgolfcarts|veteran-owned' --include='*.html' --include='*.css' --include='*.js' .
```
Should return nothing.
