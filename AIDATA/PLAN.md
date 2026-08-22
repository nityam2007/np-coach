# NP Coaches — Implementation and Operations Plan

The CMS-driven Next.js rebuild is implemented and deployed through Coolify; this plan records the architecture, completed phases, and remaining production acceptance.
**Goals:** fast as fire · secure as a prison · best UX. Keep it **simple, modular, dynamic, responsive** — don't over-engineer.

---

## Architecture (the one diagram that matters)

```
Cloudflare (DNS·Proxy/CDN·SSL·WAF·Turnstile) ─► Hostinger VPS · Docker + Coolify proxy
                                                     ├─ Next.js ─REST/GraphQL─► Directus
                                                     ├─ Directus ─► MariaDB (private)
                                                     ├─ Next.js ─► Redis (shared action rate limits)
                                                     ├─ Directus ─► Redis (content/schema/API cache)
                                                     └─ Directus uploads → persistent volume

                              Next.js → Stripe · Next.js → Microsoft 365 (when configured)
```

**Hard rule:** the Next.js app never connects to MariaDB directly — only Directus does. The app holds scoped Directus tokens (read-only for content, server-only write token for forms/bookings), never DB creds. No Prisma. Full stack table in [../INFO.md](../INFO.md).

### Hosting — active self-hosted production
- **Host:** Hostinger **VPS KVM2 (2 vCPU / 8 GB)**, Linux + **Docker / Docker Compose**. EU/UK region.
- **Reverse proxy:** **Coolify proxy** routes production services. Traefik remains a standalone alternative only.
- **Edge:** **Cloudflare** — DNS, Proxy/CDN, SSL, WAF, Turnstile in front of the VPS.
- **Media:** Directus uploads on a Docker volume (Cloudflare caches; R2 optional later).
- **Robust, not over-engineered:** healthchecks, restart policies, private database/cache networking, named volumes, pinned images, Cloudflare WAF, and encrypted off-site backups with restore tests.

### Dev environment
- `docker compose up` → MariaDB + Directus locally.
- `npm run dev` → Next.js app.
- `.env.example` committed; real `.env` never committed (Directus URL + tokens, Stripe keys, M365 SMTP — never DB creds in the app).

---

## Content model (Directus collections)

`settings` (global: nav, footer, contact info, socials, global SEO) · `pages` · `fleet` · `tours` · `routes` (Daily Express timetable + price) · `blog_posts` · `faqs` · `testimonials` · `downloads` · `redirects` · **transactional:** `quote_requests` · `contact_submissions` · `bookings` · `pass_purchases`.

**Directus roles/tokens:** a read-only **Public** token for content (used at build/ISR) and a separate **server-only write token** for form/booking writes; admin panel role-gated for the client. Whole site editable from Directus — nothing user-facing hardcoded.

---

## Modular UI (the "1 module → referenced everywhere" rule)

Each is a single self-contained component module; layouts/pages compose them. **All content comes from Directus — nothing hardcoded.** Mobile-first responsive.

`Header` (sticky nav + phone + Get-a-Quote) · `Footer` · `QuoteWidget` (instant-quote bar — reused in hero, mid-page, sticky bottom) · `Hero` · `ServiceCard` · `FleetCard` + `FleetCarousel` · `AccreditationStrip` · `SchoolTransportBlock` · `CoverageMap` · `StatsBand` · `TestimonialCarousel` · `FaqAccordion` · `CtaSection` · `SeoHead` (metadata + JSON-LD). UI matches `WEB PAGE STYLE REF.jpeg` (page) and `FOOTER REF.jpeg` (footer/FAQ/testimonials).

---

## Phases (ship incrementally; commit + update README each phase)

- **P0 — Foundation ✅ done:** git init · Next.js 16 + TS + Tailwind v4 app at repo root · Docker dev stack · current deep-blue `#172554`/accent `#2563eb` tokens + Geist/Inter · base layout and documentation.
- **P1 — CMS + data layer ✅ done:** Directus `settings` (singleton) + `services` collections with **public read** · typed fetch lib (`src/lib/directus.ts`, ISR 5s + graceful fallback) · idempotent seed script (`npm run seed`) · layout/Header/Footer/Hero/page now render from Directus. *(Remaining collections — pages, fleet, tours, blog, routes, forms — are added with their pages in P2. On-publish webhook revalidation lands at deploy/P7; time-based ISR for now.)*
- **P2 — Marketing site ✅ done:**
  - ✅ **Fleet:** `fleet` collection (public read) + `/fleet` listing + `/[slug]` SEO landing pages per vehicle (WP slugs preserved, e.g. `/19-seat-coaches`) with per-page metadata + Service JSON-LD.
  - ✅ **SEO infra:** `robots.ts` (AI crawlers allowed), `sitemap.ts` (home + fleet), site-wide Organization/LocalBusiness JSON-LD. Homepage enriched (accreditation strip, fleet teaser, stats band) — all CMS-driven (`settings.stats` / `settings.accreditations`).
  - ✅ **Content-page system:** generic `pages` collection (public read) + a `PageTemplate`; the `/[slug]` route now resolves a fleet vehicle **or** a content page. About + Contact seeded — most remaining marketing pages are now CMS-only (no code).
  - ✅ **Content/legal pages (T1, T5):** FAQs · Lost Property · Safeguarding · Vacancies · Downloads · **rewritten** Privacy (UK GDPR/DPA/PECR) · Cookie · Terms · Home-to-School (ShuttleID links) — all `pages[]` entries via `/[slug]`.
  - ✅ **UK Tours (T2):** `tours` collection + `/uk-tours` listing + `/uk-tours/[destination]` SEO pages (Service JSON-LD).
  - ✅ **Daily Express + routes (T3):** `routes` collection + `/daily-express-service` hub + 3 route pages (`/[slug]`) with timetables + BusTrip JSON-LD.
  - ✅ **Blog (T4):** `blog_posts` collection + `/blog` + `/blog/[slug]` (BlogPosting JSON-LD).
  - ✅ **Homepage polish (T7):** `testimonials` collection + TestimonialCarousel · FaqAccordion (FAQPage JSON-LD) · CoverageMap · presentational QuoteWidget in the hero.
  - **Follow-up:** add any required legacy 301 redirects; `llms.txt`, sitemap, robots, metadata, and structured data are implemented.
- **P3 — Forms (storage ✅ done; email pending):** `/contact-us` + `/get-a-quote` use protected server actions with zod, honeypot, rate limiting, Turnstile, and a scoped Directus server token. The public role has no create/read access. Microsoft 365 delivery remains production acceptance work.
- **P4 — Daily Express booking ✅ (storage+payment done; our email deferred):** **stop-to-stop** like the live site — `/daily-express-service/book` → pick any From/To from a 6-stop corridor (`stops` collection) + single/return + date + passengers → server prices the leg from the flat corridor fares in `settings.pricing` (`dailyExpressSingle`/`Return`, pence + `dailyExpressVat` — **never trusts the client**) → `bookings` row (`from_stop`/`to_stop`) created `pending` → **Stripe Checkout (hosted)** → signed, **idempotent** webhook (`/api/stripe/webhook`, `checkout.session.completed`, unique `stripe_session_id`, routes by `metadata.kind`) atomically creates paid-only dated inventory and flips `pending → paid` → `/booking/success`. `bookings` is server-write only. Confirmation relies on Stripe's receipt; M365 email later. Graceful "being set up" notice when `STRIPE_SECRET_KEY` is unset.
- **Directus admin ✅ (`npm run configure`):** collections grouped (Content · Marketing · Daily Express · Bookings & Payments · Leads); field notes/widths/required/interfaces; display templates + status colours (pending/paid/failed); list-view sort defaults; **Insights dashboard** (paid bookings, paid passes, revenue, recent quotes/contacts). Idempotent; separate from `npm run seed`.
- **Dev hot-reload:** `npm run dev:poll` (webpack + polling) for filesystems where the default Turbopack watcher misses saves.
- **P5 — Lost Property pass ✅ (payment done; our email deferred):** `/lost-property/claim` form (mirrors the live-site fields: travel date/time, school-route school+route, where left, item description, two consents) → fee + VAT computed server-side from CMS `settings.pricing` (`lostPropertyFee` net + `lostPropertyVat` %, default £5 + 20% = £6.00) → `pass_purchases` row `pending` → **Stripe Checkout** → shared signed/idempotent webhook (`metadata.kind` routes to the right collection) → `paid` → `/pass/success`. **Configurable VAT** lives in `settings.pricing` with separate rates per fee (`lostPropertyVat`, `dailyExpressVat`) — re-seeding never clobbers client-edited rates. Stripe receipt for now; our M365 email later.
- **P6 — School transport ✅:** `/home-to-school` hub → per-school pages `/home-to-school/<school>` (Pioneer Secondary Academy, Herschel Grammar School) driven by a CMS `school_routes` collection (code, name, timetable `stops`, return note) + `settings.school_transport` (slugs, intro, Trackaroo buy URL, ShuttleID waitlist, spaces flag). Each school page lists its routes with timetables + route quick-nav + breadcrumb; "Buy Tickets" → Trackaroo, waiting-list → ShuttleID, track-bus → passenger.shuttleid.uk. Old slugs preserved under `/home-to-school/*`.
- **P7 — Compliance + production deployment ✅:** cookie consent, legal pages, security headers, production images, Coolify Compose, MariaDB, Redis, Directus, automated schema/content/media bootstrap, and Next.js deployed successfully on 6 August 2026. The August client-review correction now renders CMS banner media as full hero backgrounds, exposes clearer Directus field guidance, and refreshes edited content through 5-second ISR. The follow-up fleet/coverage pass keeps its new copy in `settings.fleet_page`, uses capped WebP Directus image transforms, supplies image-less pages from three editor-managed fallback hero slots, reads the public CMS during Docker SSG before switching to the private runtime URL, and uses the private 768 MB Redis service for auto-purged Directus caching plus atomic application rate limits. Remaining production acceptance is tracked in [../HANDOVER.md](../HANDOVER.md).
- **Stripe promotion codes ✅:** both hosted payment flows accept active customer-entered Stripe promotion codes. The signed Checkout result is authoritative: its final `amount_total` is persisted before tickets and payment emails are produced, including fully discounted no-payment sessions.

---

## Cross-cutting (apply in every phase)

- **Fast:** SSG/ISR for content, `next/image`, `next/font`, minimal client JS, CDN caching, lazy carousels.
- **Secure:** app never holds DB creds (only Directus does); Stripe server-side only with webhook signature verification; validated + rate-limited forms (Turnstile); secrets in env; HTTPS + security headers; data minimization (esp. school-transport PII/DBS).
- **Compliance — UK law governs the website & all customer data** (UK GDPR + Data Protection Act 2018, PECR for cookies/consent, ICO guidance, UK consumer/distance-selling rules). India only matters as the *developer's* location — no India-law obligations on the live site. Host in EU/UK (VPS region, Stripe, M365). Cookie consent before any non-essential cookie/analytics.
- **Data safety:** all submissions/bookings/payments persisted at each step before the next; idempotent Stripe webhooks; automated MariaDB dumps to offsite storage on a cron.

---

## Source content map

Live-site archive lives in `Pages OLD/` (root pages, `Fleet/`, `Routes/`, `Info/`, `Legal/`, `Services/`, `School Transport/`). Canonical business facts (name, depot, phone, accreditations) → `SEO - OLD/llms.txt`. **Note:** scraped privacy policy contains boilerplate (`gamechique.com`) — rewrite for NP Coaches. `Routes/`: only Wolverhampton→London, London→Leicester, Leicester→London have live pages. `Fleet/76-seat-coaches.md` content is actually a 72-seat coach. The mockup footer's address/phone (Tamworth / 0121…) is template placeholder — **use the real Iver depot details from `llms.txt`.**

---

## Implemented foundation — Daily Express multi-service model (22 August 2026)

The original P4 payment/inventory foundation remains implemented, but new production evidence shows that the content model must be corrected before online sales are enabled. The current `routes` row combines an SEO direction with one timetable and cannot represent the two real daily services in each London–Midlands direction. Overlapping London/Leicester stops can also leak the wrong fare into a London–Midlands search.

The authoritative research, approved-data checklist, target model, implementation sequence, and copy-paste prompt are in [IMP-22-8-26.md](IMP-22-8-26.md).

Implemented in code and fallback data:

- keep `routes` as direction/SEO pages and preserve existing URLs;
- add individual `scheduled_services` with stable codes, operating days, ordered stops, boarding/dropping rules, stop-pair fares, sales mode, and editable default capacity (1–500);
- model two online 60-seat services per London–Midlands direction, all seven days;
- keep both Leicester services Friday–Monday and `driver_only`;
- select and price a real outward service and, for returns, a real reverse-direction service;
- key dated inventory by stable service code and keep the existing fail-closed/atomic Stripe protections;
- show complete outward/return details in confirmations, accounts, and tickets.

Do not enable DAILY_EXPRESS_BOOKINGS_ENABLED until the return/inventory rules are confirmed and the live concurrency/payment/email acceptance gate passes. The four WordPress bus admin timetables, all 48 numeric fare rows, and 60-seat capacity per online bus are now mirrored; blank placeholder prices still fail closed.

Production enablement remains gated by the authoritative brief. A one-time revision-guarded seed applies the approved four-bus timetable, 48 numeric fares and 60-seat capacities to existing Directus records, then preserves later CMS edits. The guarded Directus schema snapshot was not regenerated in this code-only pass.
