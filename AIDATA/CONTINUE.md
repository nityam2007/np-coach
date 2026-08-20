# CONTINUE — NP Coaches development and production handoff

This is the **single source of truth for picking up development**. For production ownership and operations, read [../HANDOVER.md](../HANDOVER.md) first. Then read [../CLAUDE.md](../CLAUDE.md) → [PLAN.md](PLAN.md) → [TASKS.md](TASKS.md). Keep this file current as work continues.

> Convert relative dates to absolute. Today's reference when this file was last updated: **2026-08-06**.

---

## 1. Where the build is

Branch: **`main`**. Commit as `nityam2007`, **never add AI / Co-Authored-By trailers** (CLAUDE.md rule).

Repository: [nityam2007/np-coach](https://github.com/nityam2007/np-coach) · Delivery: **Blustdio** · Product Manager: [Rohan](https://rohanxblu.in/) · Developer: [Nityam](https://nsheth.in/).

**Done (P0–P7 application + first production deployment):**
- **P0** foundation · **P1** Directus data layer · **P2** full marketing site (fleet, UK tours, Daily Express + routes, blog, content/legal pages, homepage) · **P3** Contact + Get-a-Quote forms (zod + honeypot + rate-limit + Turnstile → Directus) · **P4** Daily Express booking (Stripe Checkout, **stop-to-stop**) · **P5** Lost Property pass (Stripe, configurable VAT) · **P6** home-to-school per-school pages · **P7** compliance + deploy artifacts.
- Real **images** uploaded to Directus and linked (fleet/tours/school logos).
- Directus admin organised (groups, field UX, display templates, status colours, Insights dashboard).
- **P7:** cookie-consent banner (UK PECR), security headers (CSP/HSTS/etc. in `next.config.ts` — **dev-aware**: unsafe-eval/ws only in dev), production `Dockerfile` (multi-stage standalone — **build + run verified**), `docker-compose.prod.yml` (Traefik + app + Directus + MariaDB), Traefik TLS (Cloudflare Origin cert), cron backup `scripts/backup-db.sh`, runbook [../DEPLOY.md](../DEPLOY.md).
- **Coolify production (2026-08-06):** the full root `docker-compose.coolify.yml` stack deployed successfully. Routine pushes now run non-destructive Directus system bootstrap plus additive CMS/media setup: no automatic exact schema apply, no populated-settings overwrite, no dashboard-panel recreation, and protected business-table counts must not decrease. See [../DEPLOY_COOLIFY.md](../DEPLOY_COOLIFY.md) and [../HANDOVER.md](../HANDOVER.md).
- **Transactional email (2026-08-06):** replaced deferred Microsoft 365 auth with the internal no-auth Postfix relay; added reusable NP Coaches HTML/plain-text templates with copy in Directus settings; OTP now fails visibly on delivery failure; persisted contact/quote submissions send staff + customer messages; verified payments send idempotent booking confirmations and lost-property customer + staff messages tracked per record.
- **Hero booking search** (2026-07-04): tabbed `HeroSearch` (Daily Express tickets ↔ private-hire quote) with From/To **stop dropdowns** from the CMS `stops`, date + passengers → prefills `/daily-express-service/book?from&to&date&pax` (BookingForm accepts `defaultDate`/`defaultPassengers`). Old QuoteWidget removed.
- **Live-site image archive** (2026-07-04): `npm run crawl` scraped **all 91 original images** from every np-coaches.co.uk page → `directus/seed-media/live/` (+ manifest.json) → uploaded to Directus in a "Live site archive" folder by `npm run media`. Real **logo** (`settings.logo`) now in the header; **hero background** (`settings.hero_image`) on the homepage — both CMS-editable, only set when unset (client edits win).
- **SEO hardening** (2026-07-04): OpenGraph + Twitter defaults in the root layout; `alternates.canonical` on fleet/pages/routes/tours/blog detail + the book page; `public/llms.txt` served; sitemap includes `/daily-express-service/book` + `/lost-property/claim`; footer gained a **Daily Express column** (book + timetable + the 3 route pages) so no route is orphaned.
- **UI pass (2026-07-04):** real **accreditation badge images** (CPT, UKCOA, CTA, Disability Confident, WeLoveCoaches, Transport for Bucks) via `settings.accreditation_logos`; **photo service cards** (`services.image`); header logo switched to the crisp **io.png** globe; hero background now the flagship coach (`DSC09341-3`); testimonial 5-star row; **lost-property claim page** redesigned (form + how-it-works/`Good to know` aside). Accreditations text list updated to the real set (mockup names were placeholder).
- **Local → production migration** (2026-07-04, hardened 2026-08-06): `npm run bootstrap` fills an empty Directus and is additive on existing instances. `npm run schema:snapshot` records the model; exact `schema:apply` is manual, dry-run-first, and requires verified-backup confirmation. Coolify never applies it automatically.
- **Fleet/content/media pass (2026-07-24):** rebuilt `/fleet` and all six vehicle pages from the archived WordPress structure (CMS copy, facility bands, per-vehicle galleries, seating plans, charter CTA and four booking steps); added `settings.fleet_page`, `fleet.group_label`, `fleet.layout_images` and `pages.image`; migrated `/timetable`; upgraded generic content pages with optional CMS imagery. Blog thumbnails now accept UUID or expanded Directus file values, render on cards/articles/Open Graph/BlogPosting schema, and `npm run media` safely assigns starter images when empty. Verified both blog assets as public `image/jpeg`, all fleet media counts, six updated routes at HTTP 200, fresh TypeScript and lint.

**Production acceptance and remaining work — pick up here:**

1. Confirm the least-privilege `DIRECTUS_SERVER_TOKEN` and its collection permissions before protected writes go live.
2. Confirm Cloudflare proxy/Full (strict)/WAF and test the existing `MAIN` Managed Turnstile widget end to end. The public key is committed as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; the private key must remain runtime-only as `TURNSTILE_SECRET` (`TURNSTILE_SECRET_KEY` is accepted as a compatibility alias).
3. Configure Stripe live keys and the signed webhook, then complete real low-value booking and lost-property tests.
4. Acceptance-test the internal Postfix network/DNS and real mailbox delivery for contact, quote, OTP, booking, and lost-property customer/staff messages.
5. Schedule encrypted off-site MariaDB/upload backups and complete a restore test.
6. Add required WordPress 301 redirects; complete Lighthouse/accessibility, mobile, content, fare, route, and legal approval.
7. The Coolify images are pinned; pin the standalone `docker-compose.prod.yml` Directus/Traefik images before that alternative is ever used.

---

## 2. Run / verify (always do before committing)

```bash
docker compose up db directus     # MariaDB + Directus (host dev) — app runs on host
npm run bootstrap                 # = seed + configure + media (all idempotent)
npm run dev:poll                  # dev server WITH working hot-reload (see gotcha #1)
npx tsc --noEmit && npm run lint  # agent-safe verification; the human owns dev/build processes
# extras: npm run crawl (refresh live-site image archive) ·
#         npm run schema:snapshot; schema:apply is manual and backup-gated (see scripts/schema.sh)
```
App → http://localhost:3000 · Directus → http://localhost:8055 (`admin@np-coaches.co.uk` / `change-me`).

---

## 3. Gotchas that cost time — read these

1. **Hot-reload:** `npm run dev` (Turbopack) silently misses file saves on this host. Use **`npm run dev:poll`** (webpack + polling). Already proven working.
2. **`DIRECTUS_URL` for host dev must be `http://localhost:8055`** in `.env`. The Docker `web` service overrides it to `http://directus:8055`. If it's the Docker hostname while running on host, the app **silently falls back to `site-content.json`** for ALL CMS reads (no error) — this masked the images for a while.
3. **Images:** served + resized by Directus (`/assets/<id>`); a custom `next/image` loader ([../src/lib/directus-loader.ts](../src/lib/directus-loader.ts)) points at it and bypasses Next's optimizer (Next 16 blocks optimizing private-IP/localhost sources). Don't re-add `images.remotePatterns` + the default optimizer for local Directus.
4. **Directus "custom permission rules" are edition-gated:** granting `create` with a *field allowlist* returns 403 (`custom_permission_rules_enabled is a restricted resource`). Use `fields: ["*"]` for create grants (see `ensurePublicCreate` in seed). Server actions still gate exactly what's written.
5. **Shell is zsh:** `filter[slug][_eq]=` in a curl URL breaks on the brackets; use `--get --data-urlencode 'filter={...}'`. Bash associative arrays don't work — use functions/parallel arrays. `pkill -f "next"` can kill the launching subshell (exit 144) — kill by PID or launch detached.
6. **`output: "standalone"`** in next.config → `npm run start` won't serve it; run `node .next/standalone/server.js` (copy `.next/static` + `public` next to it) if testing the prod server.

---

## 4. Architecture (what to copy when adding things)

**Data flow (one pattern for everything):**
Directus collection → seed (`scripts/seed-directus.mjs`) → typed in `src/lib/site-config.ts` → fetched in `src/lib/directus.ts` (raw `fetch`, `next:{revalidate:30, tags}`, **fallback to `siteConfig`**) → rendered. `site-content.json` is the single seed source **and** offline fallback.

**Payments (P4/P5 — reuse for any new paid flow):**
- Price **always computed server-side** from Directus (`src/lib/stripe.ts` — `priceBooking`, `priceLostPropertyPass`, `computeGross`). Client never sends an amount.
- Persist a `pending` row **before** redirecting → **Stripe Checkout** with customer-entered promotion codes → `/api/stripe/webhook` (raw body, `constructEvent` signature verify, **idempotent** `pending→paid` keyed by unique `stripe_session_id`, routed by `metadata.kind`). The verified `amount_total` replaces the pre-discount amount before emails/tickets are produced; no-payment checkouts are also accepted. Paid-email channels use atomic Directus delivery claims/status timestamps so webhook retries and success-page verification cooperate without intentional duplicates.
- Order collections (`bookings`, `pass_purchases`) are **server-write only** (no public read/create); written with `DIRECTUS_SERVER_TOKEN` (dev falls back to admin login).
- Graceful "being set up" notice when `STRIPE_SECRET_KEY` is unset.

**Forms (P3):** server actions in `src/app/actions.ts` (`submitContact`, `submitQuote`, `startBooking`, `startPassPurchase`); validation/helpers in `src/lib/forms.ts`; contact/quote writes use the scoped Directus server token after zod, honeypot, rate-limit and Turnstile checks. Submission collections have **no anonymous create/read permission**.

**Pricing/VAT:** `settings.pricing` (pence + whole-% VAT, per-fee): `lostPropertyFee`/`lostPropertyVat`, `dailyExpressVat`, `dailyExpressSingle`/`dailyExpressReturn`. Seed **merges new keys** without clobbering client-edited values.

**Images:** `npm run media` uploads from `directus/seed-media/`, idempotent (matched by file `title`), grants public read on `directus_files`, and links by slug without replacing editor-set media. It covers fleet exteriors/galleries/seating plans, tours, school logos, selected content-page heroes and starter blog thumbnails. `assetUrl(file)` accepts a UUID or expanded `{id}` file value and builds the bare `/assets/<id>` URL; the loader appends size/quality.

---

## 5. Directus collections (current)

Grouped (via `npm run configure`):
- **Content:** `pages` (+ optional `image`), `blog_posts` (+ `thumbnail`)
- **Marketing:** `fleet` (+`image`,`gallery`,`layout_images`,`group_label`), `tours` (+`image`), `testimonials`, `services`
- **Daily Express:** `routes` (timetable + per-route fares, now informational), `stops` (6 corridor stops → booking From/To), `school_routes` (home-to-school timetables)
- **Bookings & Payments:** `bookings`, `pass_purchases` (server-write only)
- **Leads:** `contact_submissions`, `quote_requests` (server-token create, no anonymous access)
- **Settings** (singleton): site config, nav (grouped/dropdown), footer, `pricing`, `coverage`, `faqs`, `fleet_page`, `school_transport` (schools list + `logos` by slug), and `email_templates` copy.

**Routes/URLs of note:** stop-to-stop booking at `/daily-express-service/book`; school pages at `/home-to-school/<slug>`; `/[slug]` resolves fleet vehicle OR content page OR Daily Express route; coded routes `/contact-us`, `/get-a-quote`, `/booking/success`, `/pass/success`, `/lost-property/claim`.

---

## 6. Live-site reference (match these)

Production WordPress site: **np-coaches.co.uk**. When unsure about content/flow, match it. Already mirrored: fleet grid + copy, UK Tours (incl. John Wesley), Daily Express stop-to-stop widget + 6 stops, home-to-school (Trackaroo buy URLs `tickets.trackaroo.co.uk/buy/np-coaches/<school>`, ShuttleID waitlist + tracking `passenger.shuttleid.uk`), grouped dropdown nav. Business facts (depot, phone, accreditations) → [SEO - OLD/llms.txt](SEO%20-%20OLD/llms.txt). Image notes: a few live "fleet" exteriors are AI-generated placeholders — carried over faithfully; swap in Directus anytime.

---

## 7. Working rules (from CLAUDE.md — non-negotiable)

Don't over-engineer · simple-yet-complete (no stubs) · **read every target file and its immediate caller before editing; extend the existing source of truth rather than layering duplicate UI** · everything user-facing from Directus with a fallback · mobile-first responsive · preserve WP URLs + SEO · **UK law governs** (UK GDPR / DPA 2018 / PECR — cookie consent before non-essential cookies) · app never touches MariaDB (only Directus) · Stripe server-side + signature-verified webhooks · commit as `nityam2007`, no AI trailers · keep README + this file current.

---

## 8. Client review revision — 2026-08-20

The six-slide client review and supplied Google Drive photos are implemented. The committed pack is `directus/seed-media/client-2026-08/` (23 files), and `npm run media` applies revision `client-review-2026-08-20` once after the additive seed creates its fields. Do not remove or change `settings.client_media_revision` casually: it is the guard that prevents later deployments from replacing media edited by the client in Directus.

Post-deploy, verify the homepage video, one-pin UK tactical globe, school block, accreditation row, Daily Express/Home-to-School/route banners, `/uk-tours` and all seven destination pages, `/fleet`, `/downloads`, `/lost-property`, both From/To selectors, and Facebook/Instagram footer links. The optimized homepage MP4 is approximately 4.5 MB; the current compliance document is the 2025–2026 pack. TypeScript, ESLint, both bootstrap-script syntax checks, and diff whitespace checks passed before push.