# Parallel work board — NP Coaches build

This file lets several agents (in separate chats) continue the build **in parallel** without colliding. Read [../CLAUDE.md](../CLAUDE.md) + [../INFO.md](../INFO.md) + [PLAN.md](PLAN.md) first, then pick **one** unclaimed task below.

## Current state (done)

- **P0** — Next.js 16 + TS + Tailwind v4 under `src/`; brand tokens (navy/grey-blue/white) + Geist/Inter; Docker dev stack (MariaDB + Directus + app); modular `Header`/`Footer`/`Hero`.
- **P1** — Directus data layer: `settings` (singleton) + `services`, public read, typed fetch lib (`src/lib/directus.ts`) with ISR + fallback, idempotent seed (`npm run seed`).
- **P2 (partial)** — branded Directus admin + Marketplace on; **`fleet`** collection → `/fleet` + per-vehicle SEO pages (`/[slug]`); **`pages`** collection → editable content pages via the same `/[slug]` resolver (About, Contact seeded); `robots.ts`, `sitemap.ts`, Organization JSON-LD; homepage sections (accreditation strip, fleet teaser, stats band).
- **P2 (marketing complete — T1–T5, T7)** — content/legal pages (FAQs, Lost Property, Safeguarding, Vacancies, Downloads, rewritten Privacy, Cookie, Terms, Home-to-School) seeded into `pages[]`; **`tours`** collection → `/uk-tours` + `/uk-tours/[destination]` SEO pages; **`routes`** collection → `/daily-express-service` hub + the 3 route pages via `/[slug]` (with timetables + BusTrip JSON-LD); **`blog_posts`** collection → `/blog` + `/blog/[slug]`; **`testimonials`** collection + homepage `TestimonialCarousel`, `FaqAccordion` (FAQPage JSON-LD), `CoverageMap` and the presentational `QuoteWidget` (in the hero); sitemap extended. **Remaining: T6 forms (P3) + the booking/payment phases (P4–P7).**

## Run / verify

```bash
docker compose up            # MariaDB + Directus + app  (or: docker compose up db directus, then host npm run dev)
npm run seed                 # idempotent: creates/extends collections + seeds; safe to re-run
npm run build && npm run lint # must both pass before committing
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
- [x] **T6 — Forms (P3, email pending).** `contact_submissions` + `quote_requests` collections — **public CREATE, no read** (anonymous can submit, only staff read in admin). Coded routes `/contact-us` + `/get-a-quote` (removed the `contact-us` `pages[]` entry to avoid shadowing). Server actions in [`src/app/actions.ts`](../src/app/actions.ts) → **zod** validate → honeypot → in-memory rate-limit → **Cloudflare Turnstile** verify (graceful if keys unset) → write to Directus ([`src/lib/forms.ts`](../src/lib/forms.ts)). QuoteForm prefills from the QuoteWidget's `from/to/date/passengers` query params. **Email via M365 SMTP is NOT wired yet** (Directus-only for now — Basic SMTP auth is being deprecated; revisit with OAuth2/Graph). Verified: anon create → 204, anon read → 403, rows persist with `created_at`.
- [x] **T7 — Homepage polish to mockup.** `testimonials` collection + `TestimonialCarousel`; `FaqAccordion` (FAQPage JSON-LD, `settings.faqs`); `CoverageMap` (`settings.coverage`); presentational `QuoteWidget` in the hero (links to `/get-a-quote` until P4).

## Later phases (not parallel-friendly yet)

- ✅ **P4** Daily Express booking (Stripe) — done. `/daily-express-service/book` → server-priced from Directus `routes` → `pending` `bookings` row → **Stripe Checkout** → signed idempotent webhook `/api/stripe/webhook` → `paid` → `/booking/success`. Fares editable in CMS (`price_single`/`price_return`, pence). Verified: server price, idempotency, unique session id, bookings locked to public. *Our M365 confirmation email deferred (Stripe receipt for now).*
- ✅ **Booking model + admin polish** — Daily Express booking is now **stop-to-stop** (6-stop corridor `stops` collection; flat corridor fares in `settings.pricing`) matching np-coaches.co.uk; grouped dropdown nav (Services / School Transport). Directus admin organised via **`npm run configure`** (collection groups, field UX, display templates, status colours, Insights dashboard). `npm run dev:poll` gives reliable hot-reload where Turbopack's watcher misses saves.
- ✅ **Hero search + images + SEO + migration (2026-07-04)** — tabbed `HeroSearch` (stop dropdowns → booking prefill incl. date/pax); full live-site image archive (91 originals, `npm run crawl` → "Live site archive" Directus folder); real logo + hero background wired via `settings.logo`/`settings.hero_image`; footer **Daily Express** column (routes no longer orphaned); OG/Twitter defaults + canonicals + `public/llms.txt` + sitemap additions; **`npm run bootstrap`** (seed+configure+media) and **`schema:snapshot`/`schema:apply`** (`directus/schema-snapshot.yaml`) for local → prod migration.
- ✅ **P5** Lost Property pass (Stripe) — done. `/lost-property/claim` (live-site fields) → fee + VAT server-computed from CMS `settings.pricing` (£5 + 20% = £6.00) → `pass_purchases` `pending` → **Stripe Checkout** → shared webhook (`metadata.kind`) → `paid` → `/pass/success`. **Per-fee configurable VAT** in `settings.pricing` (`lostPropertyVat`/`dailyExpressVat`); re-seed preserves client-edited rates. Verified: £6.00 math, idempotency, unique session id, collection locked to public.
- ✅ **P6** school transport — `/home-to-school` hub → `/home-to-school/<school>` pages from a `school_routes` CMS collection + `settings.school_transport` (Trackaroo buy URLs, ShuttleID waitlist/tracking, spaces flag). PSA (Burnham/Langley) + HGS (XR1/XR2/XR3/S/N) timetables; breadcrumb + route quick-nav.
- ✅ **P7** compliance + deploy artifacts — cookie consent (UK PECR), security headers (CSP/HSTS in `next.config.ts`), production `Dockerfile` (build-verified), `docker-compose.prod.yml` + Traefik (Cloudflare Origin cert), cron backup `scripts/backup-db.sh`, runbook [DEPLOY.md](../DEPLOY.md). **Launch itself needs the VPS** (provision + Cloudflare + live Stripe).
- *Remaining cross-cutting: wire M365 SMTP email (forms + bookings + pass) once auth method chosen; 301 `redirects`; pin Directus/Traefik versions.*
