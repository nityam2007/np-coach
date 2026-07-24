# NP Coaches — Build Plan

Rebuild np-coaches.co.uk (currently WordPress) as a fast, CMS-driven Next.js site.
**Goals:** fast as fire · secure as a prison · best UX. Keep it **simple, modular, dynamic, responsive** — don't over-engineer.

---

## Architecture (the one diagram that matters)

```
Cloudflare (DNS·Proxy/CDN·SSL·WAF·Turnstile) ─Origin cert─► Hostinger VPS KVM2 (2c/8GB) · Docker + Traefik
                                                              ├─ Next.js app ─REST/GraphQL─► Directus ─► MariaDB
                                                              ├─ Directus (admin/API)          └─ uploads → volume
                                                              └─ 2 other static sites
                                       Next.js → Stripe (payments)   ·   Next.js → M365 SMTP (email)
```

**Hard rule:** the Next.js app never connects to MariaDB directly — only Directus does. The app holds scoped Directus tokens (read-only for content, server-only write token for forms/bookings), never DB creds. No Prisma. Full stack table in [../INFO.md](../INFO.md).

### Hosting — self-hosted VPS (original SOW stack)
- **Host:** Hostinger **VPS KVM2 (2 vCPU / 8 GB)**, Linux + **Docker / Docker Compose**. EU/UK region.
- **Reverse proxy:** **Traefik** routes containers by domain; origin TLS via a **Cloudflare Origin certificate** (Full-strict).
- **Edge:** **Cloudflare** — DNS, Proxy/CDN, SSL, WAF, Turnstile in front of the VPS.
- **Media:** Directus uploads on a Docker volume (Cloudflare caches; R2 optional later).
- **Robust, not over-engineered:** Compose healthchecks + restart policies; cron MariaDB dumps offsite; firewall (80/443/22), fail2ban, unattended-upgrades. The VPS also serves the 2 other (static) sites via Traefik.

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

- **P0 — Foundation ✅ done:** git init · Next.js 16 + TS + Tailwind v4 app at repo root · `docker-compose.yml` (MariaDB + Directus + app, bind-mounted code) · brand tokens (navy `#0e0f27`, grey-blue `#a8abbc`, white `#fdfdfd`; **Geist** + **Inter** via `next/font`) · base layout with `Header`/`Hero`/`Footer` + `lib/site-config.ts` · README. *(Traefik + prod Dockerfile come at P7/deploy.)*
- **P1 — CMS + data layer ✅ done:** Directus `settings` (singleton) + `services` collections with **public read** · typed fetch lib (`src/lib/directus.ts`, ISR 30s + graceful fallback) · idempotent seed script (`npm run seed`) · layout/Header/Footer/Hero/page now render from Directus. *(Remaining collections — pages, fleet, tours, blog, routes, forms — are added with their pages in P2. On-publish webhook revalidation lands at deploy/P7; time-based ISR for now.)*
- **P2 — Marketing site (in progress):**
  - ✅ **Fleet:** `fleet` collection (public read) + `/fleet` listing + `/[slug]` SEO landing pages per vehicle (WP slugs preserved, e.g. `/19-seat-coaches`) with per-page metadata + Service JSON-LD.
  - ✅ **SEO infra:** `robots.ts` (AI crawlers allowed), `sitemap.ts` (home + fleet), site-wide Organization/LocalBusiness JSON-LD. Homepage enriched (accreditation strip, fleet teaser, stats band) — all CMS-driven (`settings.stats` / `settings.accreditations`).
  - ✅ **Content-page system:** generic `pages` collection (public read) + a `PageTemplate`; the `/[slug]` route now resolves a fleet vehicle **or** a content page. About + Contact seeded — most remaining marketing pages are now CMS-only (no code).
  - ✅ **Content/legal pages (T1, T5):** FAQs · Lost Property · Safeguarding · Vacancies · Downloads · **rewritten** Privacy (UK GDPR/DPA/PECR) · Cookie · Terms · Home-to-School (ShuttleID links) — all `pages[]` entries via `/[slug]`.
  - ✅ **UK Tours (T2):** `tours` collection + `/uk-tours` listing + `/uk-tours/[destination]` SEO pages (Service JSON-LD).
  - ✅ **Daily Express + routes (T3):** `routes` collection + `/daily-express-service` hub + 3 route pages (`/[slug]`) with timetables + BusTrip JSON-LD.
  - ✅ **Blog (T4):** `blog_posts` collection + `/blog` + `/blog/[slug]` (BlogPosting JSON-LD).
  - ✅ **Homepage polish (T7):** `testimonials` collection + TestimonialCarousel · FaqAccordion (FAQPage JSON-LD) · CoverageMap · presentational QuoteWidget in the hero.
  - ⬜ **Remaining:** forms (T6 → P3) · 301 `redirects` · migrate remaining `schema-snippets.json` / keep `llms.txt`.
- **P3 — Forms (storage ✅ done; email pending):** `/contact-us` + `/get-a-quote` coded routes → server actions → **zod** + honeypot + in-memory rate-limit + **Cloudflare Turnstile** (graceful if unset) → persist to Directus `contact_submissions` / `quote_requests` (**public create, no read** — staff read in admin). Email via **M365 SMTP** is deferred (Basic SMTP auth being deprecated → wire with OAuth2/Graph later).
- **P4 — Daily Express booking ✅ (storage+payment done; our email deferred):** **stop-to-stop** like the live site — `/daily-express-service/book` → pick any From/To from a 6-stop corridor (`stops` collection) + single/return + date + passengers → server prices the leg from the flat corridor fares in `settings.pricing` (`dailyExpressSingle`/`Return`, pence + `dailyExpressVat` — **never trusts the client**) → `bookings` row (`from_stop`/`to_stop`) created `pending` → **Stripe Checkout (hosted)** → signed, **idempotent** webhook (`/api/stripe/webhook`, `checkout.session.completed`, unique `stripe_session_id`, routes by `metadata.kind`) flips `pending → paid` → `/booking/success`. `bookings` is server-write only. Confirmation relies on Stripe's receipt; M365 email later. Graceful "being set up" notice when `STRIPE_SECRET_KEY` is unset.
- **Directus admin ✅ (`npm run configure`):** collections grouped (Content · Marketing · Daily Express · Bookings & Payments · Leads); field notes/widths/required/interfaces; display templates + status colours (pending/paid/failed); list-view sort defaults; **Insights dashboard** (paid bookings, paid passes, revenue, recent quotes/contacts). Idempotent; separate from `npm run seed`.
- **Dev hot-reload:** `npm run dev:poll` (webpack + polling) for filesystems where the default Turbopack watcher misses saves.
- **P5 — Lost Property pass ✅ (payment done; our email deferred):** `/lost-property/claim` form (mirrors the live-site fields: travel date/time, school-route school+route, where left, item description, two consents) → fee + VAT computed server-side from CMS `settings.pricing` (`lostPropertyFee` net + `lostPropertyVat` %, default £5 + 20% = £6.00) → `pass_purchases` row `pending` → **Stripe Checkout** → shared signed/idempotent webhook (`metadata.kind` routes to the right collection) → `paid` → `/pass/success`. **Configurable VAT** lives in `settings.pricing` with separate rates per fee (`lostPropertyVat`, `dailyExpressVat`) — re-seeding never clobbers client-edited rates. Stripe receipt for now; our M365 email later.
- **P6 — School transport ✅:** `/home-to-school` hub → per-school pages `/home-to-school/<school>` (Pioneer Secondary Academy, Herschel Grammar School) driven by a CMS `school_routes` collection (code, name, timetable `stops`, return note) + `settings.school_transport` (slugs, intro, Trackaroo buy URL, ShuttleID waitlist, spaces flag). Each school page lists its routes with timetables + route quick-nav + breadcrumb; "Buy Tickets" → Trackaroo, waiting-list → ShuttleID, track-bus → passenger.shuttleid.uk. Old slugs preserved under `/home-to-school/*`.
- **P7 — Compliance + launch ✅ (deploy artifacts ready; awaiting VPS):** cookie-consent banner (UK PECR; `np_consent` cookie, accept/reject) · privacy/cookie/terms pages (done in P2) · security headers (CSP/HSTS/X-Frame/etc. in `next.config.ts`) · production `Dockerfile` (multi-stage standalone, **build-verified**) · `docker-compose.prod.yml` (Traefik + app + Directus + MariaDB, healthchecks/restart) · Traefik TLS via Cloudflare Origin cert · cron MariaDB backup (`scripts/backup-db.sh`) · full runbook in [../DEPLOY.md](../DEPLOY.md). **Remaining for actual launch:** point at the VPS, Cloudflare DNS/SSL + origin cert, live Stripe keys + webhook, Lighthouse pass.

---

## Cross-cutting (apply in every phase)

- **Fast:** SSG/ISR for content, `next/image`, `next/font`, minimal client JS, CDN caching, lazy carousels.
- **Secure:** app never holds DB creds (only Directus does); Stripe server-side only with webhook signature verification; validated + rate-limited forms (Turnstile); secrets in env; HTTPS + security headers; data minimization (esp. school-transport PII/DBS).
- **Compliance — UK law governs the website & all customer data** (UK GDPR + Data Protection Act 2018, PECR for cookies/consent, ICO guidance, UK consumer/distance-selling rules). India only matters as the *developer's* location — no India-law obligations on the live site. Host in EU/UK (VPS region, Stripe, M365). Cookie consent before any non-essential cookie/analytics.
- **Data safety:** all submissions/bookings/payments persisted at each step before the next; idempotent Stripe webhooks; automated MariaDB dumps to offsite storage on a cron.

---

## Source content map

Live-site archive lives in `Pages OLD/` (root pages, `Fleet/`, `Routes/`, `Info/`, `Legal/`, `Services/`, `School Transport/`). Canonical business facts (name, depot, phone, accreditations) → `SEO - OLD/llms.txt`. **Note:** scraped privacy policy contains boilerplate (`gamechique.com`) — rewrite for NP Coaches. `Routes/`: only Wolverhampton→London, London→Leicester, Leicester→London have live pages. `Fleet/76-seat-coaches.md` content is actually a 72-seat coach. The mockup footer's address/phone (Tamworth / 0121…) is template placeholder — **use the real Iver depot details from `llms.txt`.**
