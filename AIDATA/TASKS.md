# Parallel work board — NP Coaches build

This file records completed phases and remaining work. Read [../HANDOVER.md](../HANDOVER.md), [CONTINUE.md](CONTINUE.md), [../CLAUDE.md](../CLAUDE.md), and [../INFO.md](../INFO.md) before claiming a change.

## Current state (done)

- **P0** — Next.js 16 + TS + Tailwind v4 under `src/`; brand tokens (navy/grey-blue/white) + Geist/Inter; Docker dev stack (MariaDB + Directus + app); modular `Header`/`Footer`/`Hero`.
- **P1** — Directus data layer: `settings` (singleton) + `services`, public read, typed fetch lib (`src/lib/directus.ts`) with ISR + fallback, idempotent seed (`npm run seed`).
- **P2 foundation** — branded Directus admin; **`fleet`** collection → `/fleet` + per-vehicle SEO pages (`/[slug]`); **`pages`** collection → editable content pages via the same resolver; `robots.ts`, `sitemap.ts`, Organization JSON-LD; homepage sections.
- **P2 marketing complete** — content/legal pages, tours, routes, blog, testimonials, FAQs, coverage, homepage content, sitemap, metadata, and structured data are implemented and CMS-driven. P3–P7 below are also complete.

## Run / verify

```bash
docker compose up            # MariaDB + Directus + app  (or: docker compose up db directus, then host npm run dev)
npm run seed                 # idempotent: creates/extends collections + seeds; safe to re-run
npx tsc --noEmit --incremental false && npm run lint # agent-safe checks; run full build when coordinated
```
App → http://localhost:3000 · Directus → http://localhost:8055 (`admin@np-coaches.co.uk` / `change-me`).

## Ground rules for a parallel agent

1. **Use a separate git branch or worktree** (`git worktree add ../np-<task> -b <task>`). The dev server + DB are a shared single instance — coordinate or run your own DB if you change schema heavily.
2. **Commit as `nityam2007`** (already set in repo git config). **Do NOT add any AI / "Co-Authored-By" trailer.**
3. Follow the **extension recipe** below. Keep changes additive and localized.
4. Everything user-facing comes from **Directus** with a **fallback** to `site-content.json`. Nothing hardcoded. Mobile-first, responsive. No stubs / empty logic. Don't over-engineer.
5. Preserve existing WordPress URLs (slugs). Add SEO: per-page `generateMetadata` + a `sitemap.ts` entry + JSON-LD where it helps.
6. Verify your pages render (build + lint + curl) before committing.

## Extension recipe (add a collection + pages)

1. **Seed** (`scripts/seed-directus.mjs`): add a `*_FIELDS` array, `ensureCollection(...)`, `ensurePublicRead(...)`, and a seed-if-empty block. Re-run `npm run seed`.
2. **Types** (`src/lib/site-config.ts`): add an interface + add the array to `SiteContent`.
3. **Fallback data** (`src/lib/site-content.json`): add the seed/fallback content.
4. **Fetchers** (`src/lib/directus.ts`): add `getX()` / `getX(slug)` following `getFleet`/`getPage` (raw `fetch` + `next:{revalidate,tags}` + fallback to `siteConfig`).
5. **UI**: module(s) under `src/components/sections/` + route under `src/app/...`. Reuse `PageTemplate` for simple content pages (often **no code needed — just a CMS/seed entry**).
6. **SEO**: extend `src/app/sitemap.ts`; add JSON-LD if relevant.

## Shared/hotspot files — edit **additively**, expect to rebase

`src/lib/site-content.json` · `src/lib/site-config.ts` · `src/lib/directus.ts` · `scripts/seed-directus.mjs` · `src/app/[slug]/page.tsx` · `src/app/sitemap.ts`

Use a distinct collection name per task so seed/content blocks don't overlap. Two agents touching `directus.ts`/`seed` will conflict on merge — keep each feature's additions in a clearly-commented block.

---

## Tasks (claim one; tick when done)

- [x] **T1 — Remaining content pages (CMS-only, low conflict).** Added `pages[]` entries for `/faqs`, `/lost-property`, `/safeguarding`, `/vacancies`, `/downloads`, `/privacy-policy` (**rewritten** — no more `gamechique.com`; UK GDPR/DPA/PECR), `/cookie-policy`, `/terms`. Render via the existing `/[slug]` resolver (no route code). *Note: seed only inserts `pages` when the collection is empty, to preserve client edits — re-seed against an empty `pages` collection, or add these rows in Directus, to publish them in the live CMS.*
- [x] **T2 — UK Tours.** `tours` collection (slug, destination, summary, body, seo). `/uk-tours` listing + `/uk-tours/[destination]` SEO pages (London, Windsor, Hampton Court, Cornwall, Salisbury, Bath) with Service JSON-LD. Source: `Pages OLD/Services/uk-tours.md`.
- [x] **T3 — Daily Express + routes (informational).** `routes` collection (from, to, days, summary, `stops` JSON). `/daily-express-service` hub + the 3 route pages (`/wolverhampton-to-london`, `/london-to-leicester`, `/leicester-to-london`) resolved by `/[slug]`, with a shared `RouteTimetable` and BusTrip JSON-LD. (Booking flow = P4.)
- [x] **T4 — Blog.** `blog_posts` collection (slug, title, excerpt, author, date, body, seo). `/blog` listing + `/blog/[slug]` with BlogPosting JSON-LD.
- [x] **T5 — School transport.** `/home-to-school` page (a `pages` entry) with the **ShuttleID** portal links + school FAQ + GoCardless billing note. Source: `Pages OLD/School Transport/`.
- [x] **T6 — Forms (P3).** `contact_submissions` + `quote_requests` are written only by protected server actions using a scoped Directus token; the public role has no create/read access. Server actions in [`src/app/actions.ts`](../src/app/actions.ts) perform zod validation, honeypot, rate limiting, and Cloudflare Turnstile before persistence. Email uses the internal Postfix relay; real Microsoft 365 mailbox delivery remains production acceptance work.
- [x] **T7 — Homepage polish to mockup.** `testimonials` collection + `TestimonialCarousel`; `FaqAccordion` (FAQPage JSON-LD, `settings.faqs`); `CoverageMap` (`settings.coverage`); presentational `QuoteWidget` in the hero (links to `/get-a-quote` until P4).

## Completed later phases and remaining operations

- ✅ **P4** Daily Express booking (Stripe) — done. `/daily-express-service/book` → server-priced from Directus `routes` → `pending` `bookings` row → **Stripe Checkout** with customer-entered promotion codes → signed idempotent webhook `/api/stripe/webhook` records Stripe's verified discounted total → `paid` → `/booking/success`. Fares editable in CMS (`price_single`/`price_return`, pence). Verified: server price, idempotency, unique session id, bookings locked to public. *Our M365 confirmation email deferred (Stripe receipt for now).*
- ✅ **Booking model + admin polish** — Daily Express booking is now **stop-to-stop** (6-stop corridor `stops` collection; flat corridor fares in `settings.pricing`) matching np-coaches.co.uk; grouped dropdown nav (Services / School Transport). Directus admin organised via **`npm run configure`** (collection groups, field UX, display templates, status colours, Insights dashboard). `npm run dev:poll` gives reliable hot-reload where Turbopack's watcher misses saves.
- ✅ **Hero search + images + SEO + migration (2026-07-04)** — tabbed `HeroSearch` (stop dropdowns → booking prefill incl. date/pax); full live-site image archive (91 originals, `npm run crawl` → "Live site archive" Directus folder); real logo + hero background wired via `settings.logo`/`settings.hero_image`; footer **Daily Express** column (routes no longer orphaned); OG/Twitter defaults + canonicals + `public/llms.txt` + sitemap additions; **`npm run bootstrap`** (seed+configure+media) and **`schema:snapshot`/`schema:apply`** (`directus/schema-snapshot.yaml`) for local → prod migration.
- ✅ **P5** Lost Property pass (Stripe) — done. `/lost-property/claim` (live-site fields) → fee + VAT server-computed from CMS `settings.pricing` (£5 + 20% = £6.00) → `pass_purchases` `pending` → **Stripe Checkout** with customer-entered promotion codes → shared webhook (`metadata.kind`) records Stripe's verified discounted total → `paid` → `/pass/success`. **Per-fee configurable VAT** in `settings.pricing` (`lostPropertyVat`/`dailyExpressVat`); re-seed preserves client-edited rates. Verified: £6.00 math, idempotency, unique session id, collection locked to public.
- ✅ **P6** school transport — `/home-to-school` hub → `/home-to-school/<school>` pages from a `school_routes` CMS collection + `settings.school_transport` (Trackaroo buy URLs, ShuttleID waitlist/tracking, spaces flag). PSA (Burnham/Langley) + HGS (XR1/XR2/XR3/S/N) timetables; breadcrumb + route quick-nav.
- ✅ **P7** compliance + production deployment — cookie consent, security headers, production images, health-gated Coolify Compose stack, automatic schema/content/media bootstrap, and deployment runbooks are complete. The full stack deployed successfully on 6 August 2026.
- ✅ **Client review (2026-08-20)** — all six review slides implemented with the approved Drive media pack. Follow-up correction: banner photos now fill the hero behind a navy overlay, route selectors overlay surrounding sections correctly, accreditation logos start in colour, UK Tours receives the supplied homepage card, and Directus editor guidance plus 5-second ISR make saved media/copy changes practical. The v2 media revision remains additive and CMS-safe.
- ✅ **Fleet/coverage/Redis follow-up (2026-08-20)** — simplified the coverage visual to the white interactive globe plus the UK depot only; redesigned the fleet introduction and individual coach detail sections; stored new fleet labels/highlights inside the existing one-fetch `settings.fleet_page` JSON; enabled responsive Directus image transforms; and expanded Redis to shared application rate limits plus a 768 MB LFU Directus cache with editor-write auto-purge.
- ✅ **Production image-loading correction (2026-08-20)** — verified the client London/Leicester, Wolverhampton, Daily Express, tours, fleet, school and lost-property media are assigned in Directus; production hashes match the committed files. Replaced 3840px automatic AVIF requests (10–30 second cold transforms) with WebP capped at 2560px, removed the 3840px Next image candidate, and allowed eight concurrent Directus transforms with a 15-second ceiling so normal browser bursts are accepted.
- ✅ **CMS hero fallback and stacking correction (2026-08-20)** — fixed decoded route/tour/school/fleet images painting above hero copy; all hero foregrounds now have an explicit z-layer. Added three Directus image selectors with matching alt-text fields, populated idempotently from the approved Wolverhampton, London–Leicester and Daily Express banners. Shared PageHero pages plus booking and lost-property claim reuse those CMS UUIDs only when no page-specific image exists.
- ✅ **Build-time CMS hydration correction (2026-08-20)** — server reads now use the public Directus URL during Docker SSG when the private runtime hostname is unavailable, while deployed containers still prefer `http://directus:8055`. This prevents the offline striped fallback from being baked into static pages and requiring a visitor refresh to trigger ISR repair.
- **Remaining:** production acceptance in [../HANDOVER.md](../HANDOVER.md), Postfix relay → Microsoft 365 mailbox delivery, required 301 redirects, off-site restore-tested backups, final live integrations/QA, and exact remaining image pins before the standalone Traefik alternative is used.

## August production-readiness audit

- [x] Sanitize CMS HTML/URLs and escape JSON-LD.
- [x] Harden Directus failure/cache/revalidation behaviour, OTP/rate limits, Stripe reconciliation, signed ticket verification, deployment isolation, backups, dependency checks, and CI.
- [x] Correct dates, service days, direction, fares, return journeys, cutoff handling, timetable data, stable stop codes, terms consent, and persisted booking detail.
- [x] Add company disclosure, legacy redirects, security contact, canonical home metadata, accessible route selection/skip navigation, and persistent cookie controls.
- [x] Implement atomic `service_runs`, two-leg row-lock reservations, safe failure release, and fail-closed capacity checks through Directus.
- [ ] Deploy the required Directus extension and additive schema, enter approved route capacities, concurrency-test the last-seat/payment cases, then deliberately enable `DAILY_EXPRESS_BOOKINGS_ENABLED`.
- [ ] Complete the external production acceptance checklist in [`../SECURITY_AND_OPERATIONS.md`](../SECURITY_AND_OPERATIONS.md); these checks require service-owner access and evidence.
- [ ] After deployment, run the live smoke/reconciliation/payment/email/accessibility/restore checks and record the evidence in `HANDOVER.md`.

## Planned enhancement — Daily Express multi-service correction (22 August 2026)

Authoritative brief: [IMP-22-8-26.md](IMP-22-8-26.md).

- [ ] Obtain NP Coaches approval for the seven documented timetable conflicts.
- [ ] Obtain the complete stop-pair fare matrix for all four online services and confirm Adult/Child/Infant plus return-pricing rules.
- [x] Add the additive `scheduled_services` CMS/fallback model; preserve `routes` as direction/SEO pages and retain legacy fields during cutover.
- [x] Exclude Friday–Monday Leicester driver-sale services from online selectors, inventory, Stripe, and online Offer schema.
- [x] Replace first-route matching with explicit outward/return scheduled-service selection and fail-closed fare resolution.
- [x] Key atomic dated inventory by stable service code; keep whole-service capacity for launch unless segment reuse is separately approved.
- [x] Persist immutable leg/fare snapshots and show both legs in email, account, boarding pass, and QR verification.
- [ ] Complete the remaining fare/return/output acceptance tests from the brief. Core deterministic resolver, cutoff, two-service, Leicester-exclusion and two-leg atomic inventory tests pass locally.
- [ ] Deploy additively with bookings disabled; enter approved CMS data and complete the full concurrency/Stripe/email/accessibility acceptance gate before enabling sales.
