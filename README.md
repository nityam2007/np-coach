# NP Coaches

Rebuild of [np-coaches.co.uk](https://np-coaches.co.uk) — a UK coach-hire operator — as a fast, CMS-driven Next.js site.

| Project | Details |
| --- | --- |
| Repository | [nityam2007/np-coach](https://github.com/nityam2007/np-coach) |
| Delivery brand | **Blustdio** |
| Product Manager | [Rohan](https://rohanxblu.in/) |
| Developer | [Nityam](https://nsheth.in/) |

> **Status:** P0–P7 application work is complete and the full stack was deployed successfully through Coolify on 6 August 2026. MariaDB, Redis, schema migration, Directus, CMS bootstrap, and Next.js are operational. Transactional email is wired to the internal Postfix relay; production acceptance still requires end-to-end delivery checks, confirmation of the scoped Directus app token, Cloudflare/Turnstile, Stripe live webhook, off-site backups, redirects, and final QA as applicable. Start with [HANDOVER.md](HANDOVER.md), then [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md).
>
> **Payments and forms:** prices are computed server-side; pending orders become paid only after a verified Checkout session or signed webhook. Payment emails use per-record delivery state so webhook retries and success-page verification do not intentionally send duplicates. Tickets and claim completion are hidden while payment is pending. Contact and quote submissions pass server-side validation, honeypot, rate-limit and Turnstile checks, then use the scoped Directus server token—there is no anonymous create permission.
>
> **CMS and pages:** Directus drives settings, services, fleet copy/photos/galleries/seating plans, pages and hero images, tours, routes, blog posts/thumbnails and testimonials, with `site-content.json` as the offline fallback. `/fleet` and all six vehicle pages use the archived fleet structure; `/timetable` and the archived content/legal routes are migrated; blog thumbnails render on cards, articles and Open Graph metadata. The homepage remains independently CMS-driven. The August 2026 client-review media pack is committed under `directus/seed-media/client-2026-08/`; the additive bootstrap applies that revision once, then leaves subsequent Directus editor changes untouched. Three global Directus image/alt-text pairs form an editor-managed fallback hero pool for pages that do not have their own assigned media.
>
> **SEO and UI:** canonical/Open Graph/Twitter metadata, sitemap/robots/llms.txt and JSON-LD are site-wide. Interior content pages share `PageHero`; CMS banner images fill the hero behind a navy contrast overlay instead of rendering as a separate card; blog articles use the same light editorial treatment and remain fully CMS-managed. Bespoke fleet, route, tour and school pages retain their structured designs.
>
> **Analytics and CMS (2026-08-22):** GA4 `G-3GXSRDBP55` uses UK consent-gated basic mode and receives path-only page locations; Search Console's existing apex verification token is preserved at build time. Consent copy and Google disclosures are CMS-managed, while a revision guard updates the two existing legal pages once. LocalBusiness JSON-LD now includes the verified company/address/contact facts and a CMS service catalog. Directus is pinned to browser-verified 12.3.0 because the 12.1.0 Studio bundle crashed before Vue mounted.
> **CMS media and booking controls (2026-08-22):** additive bootstrap now repairs the real `directus_files` relation behind every single-file image/video field, so editors can choose or replace media from the File Library. `service_runs` remains visible as the automatically-created per-date/per-departure inventory ledger. Scheduled Services hold the normal capacity (60 initially; editable up to 500 for multiple/larger buses), while Service Runs can override capacity or cancel one date. Live availability and checkout now require the same authenticated atomic inventory endpoint, so an infrastructure fault cannot be shown as a false sold-out result.
> The header and footer navigation are CMS-managed; Contact Us remains a primary menu item. `/faqs` is a dedicated SEO-ready accordion page sourced from the same editable FAQ settings as the homepage, with the homepage showing the four priority questions only.

## Current payment and form controls

- Contact, quote, booking, lost-property, and OTP requests use the existing Managed Turnstile widget. Tokens are verified server-side through Cloudflare Siteverify and production fails closed when the server secret is absent or invalid.
- Stripe Checkout receives the customer's email for receipts and accepts active customer-entered promotion codes. A booking, ticket, or lost-property claim is shown as complete only after Stripe verifies the Checkout session; the verified discounted total is recorded, and public booking references cannot complete an order.
- Coolify deployments run Directus system bootstrap plus additive/idempotent content, field, admin and media setup. Routine pushes never apply an exact schema snapshot, overwrite populated settings, or recreate dashboard panels; protected business-table counts are checked before and after bootstrap.
- The internal Postfix relay sends branded HTML/plain-text OTP, booking-ticket, lost-property, contact, and quote mail. OTP requests fail visibly when SMTP fails; paid booking/pass messages are tracked idempotently in Directus, and form acknowledgements/notifications run only after the submission is stored.
- “Staff email” means the internal recipient mailbox only: contact/lost-property use `info@np-coaches.co.uk`, while quotes use `bookings@np-coaches.co.uk`. These recipients are not Directus users and consume no Directus Studio seats.

## Stack

| Layer    | Choice |
|----------|--------|
| Frontend | **Next.js 16** · TypeScript · Tailwind · `motion` for targeted transitions (Dockerized) |
| CMS / admin | **Directus** (Dockerized) — content + transactional, one client admin |
| Database | **MariaDB** (Dockerized) — reached only by Directus, **no Prisma** |
| Media    | Directus uploads (Docker volume) |
| Cache / rate limits | Redis (private; Directus content/schema/API cache plus shared Next.js form, checkout and OTP limits) |
| Reverse proxy | Coolify proxy (recommended) or bundled Traefik · **Cloudflare** at the edge |
| Payments | Stripe |
| Email    | Internal Postfix SMTP relay; branded transactional templates managed from Directus |
| Host     | Hostinger VPS — KVM2 (2 vCPU / 8 GB), Docker + Coolify |

**Architecture:** `Cloudflare → Coolify proxy → Next.js → Directus → MariaDB`, with Redis private beside Directus. The standalone Traefik stack remains available. The app never touches MariaDB directly — only Directus does; it holds a scoped Directus token, never DB credentials.

## Local development

First, copy env defaults: `cp .env.example .env` (the defaults work for local dev as-is).

**Everything in Docker** (recommended — code is bind-mounted, so edits hot-reload with no rebuild):

```bash
docker compose up                 # MariaDB + Directus + app
npm run seed                      # one-time: create Directus collections + seed content
npm run media                     # one-time: upload fleet/tour/school images into Directus + link them
npm run configure                 # one-time: organise the admin (groups, field UX, dashboard)
# web      → http://localhost:3000
# directus → http://localhost:8055   (admin: DIRECTUS_ADMIN_EMAIL / _PASSWORD from .env)
```

`npm run seed` is idempotent — re-run it any time; it only creates what's missing and won't overwrite content you've edited in Directus (it merges new `settings.pricing` keys without clobbering edited fares). `npm run media` uploads the real fleet/tour photos + school logos (from `directus/seed-media/`) into Directus and links them to the items (skips anything already set). `npm run configure` is also idempotent — it groups the collections (Content · Marketing · Daily Express · Bookings & Payments · Leads), adds field notes/widths/status colours + display templates (including clear page, route, tour, fleet, service and global-media guidance), and builds the **NP Coaches** Insights dashboard (paid bookings, pass purchases, revenue, recent leads).

Saved CMS content uses five-minute ISR and can be refreshed immediately through the protected revalidation endpoint. Images are served and resized by Directus (`/assets/<id>`); a custom `next/image` loader ([src/lib/directus-loader.ts](src/lib/directus-loader.ts)) requests cached WebP at responsive dimensions capped at 2560px with no upscaling; Directus runs at most eight transforms concurrently so browser bursts do not receive capacity errors. Shared page heroes keep foreground copy above decoded images with explicit stacking, and image-less pages select consistently from the three CMS fallback slots. Production builds use the public Directus URL for SSG when the private runtime hostname is unavailable, so first visitors do not receive build-time offline fallbacks. Production Redis has a 768 MB budget: Directus caches auto-purge after CMS writes, while Next.js uses atomic Redis counters for form, checkout and OTP limits with a bounded development fallback. **Note:** for host `npm run dev`, `DIRECTUS_URL` must be `http://localhost:8055` (not the Docker hostname) — otherwise the app can't reach the CMS and falls back to `site-content.json`.

**App on host, services in Docker** (if you prefer running Next.js directly):

```bash
docker compose up db directus   # MariaDB + Directus only
npm install && npm run dev      # Next.js app on http://localhost:3000
```

`npm run dev` uses Turbopack (fast). If edits don't hot-reload on your machine (some Linux/WSL/VM/container filesystems drop watch events with Turbopack), use **`npm run dev:poll`** — it runs the webpack dev server with file-system polling so saves always reload.

`npm run build` for a production build, `npm run lint` to lint. Never commit `.env`.

## Coolify production deployment

Use the root-level [`docker-compose.coolify.yml`](docker-compose.coolify.yml) with Coolify's Docker Compose build pack. It deploys the Next.js app, Directus, MariaDB, Redis, a non-destructive Directus database bootstrap, and an additive CMS/media bootstrap as one private stack; only the web and CMS services receive domains.

Copy [`.env.coolify.example`](.env.coolify.example) into Coolify's environment-variable editor and follow [`DEPLOY_COOLIFY.md`](DEPLOY_COOLIFY.md). The older [`docker-compose.prod.yml`](docker-compose.prod.yml) and [`DEPLOY.md`](DEPLOY.md) are the non-Coolify alternative.

Do not deploy the standalone Traefik service inside Coolify—Coolify already owns the VPS reverse proxy and ports 80/443.

For routine deployments, secret ownership, backups, rollback, and acceptance checks, use [HANDOVER.md](HANDOVER.md). Coolify's native GitHub webhook should be configured once so every approved push to `main` queues a redeployment automatically.

## Principles

Simple · modular · dynamic (whole site editable from Directus) · responsive · fast · secure. No over-engineering; simple-yet-complete code (no stubs). **UK law governs the live site and customer data** (UK GDPR / DPA 2018 / PECR).

Working rules and common-error fixes live in [RULES.md](RULES.md); every change is logged in the append-only [CHANGELOG.md](CHANGELOG.md). The client-ready image inventory, filenames, aspect ratios, and source dimensions are documented in [IMAGE_REQUIREMENTS.md](IMAGE_REQUIREMENTS.md).

All app code lives under `src/` (the `@/*` import alias maps to `src/`); config files stay at the repo root.

```
src/
  app/                  Next.js App Router (layout.tsx, page.tsx, globals.css)
  components/
    layout/             site chrome — Header, Footer
    sections/           page sections — Hero (service cards, carousels, … land here)
  lib/
    site-config.ts      shared CMS/fallback content types
directus/               Directus seed media and development uploads
extensions/             required private Directus endpoints (baked into production image)
docker-compose.yml      dev stack: MariaDB + Directus + app
docker-compose.coolify.yml  production stack managed by Coolify
Dockerfile.bootstrap    one-shot committed CMS/content/media bootstrap
Dockerfile.schema       Directus bootstrap image; snapshot reserved for manual backup-first migrations
HANDOVER.md              production ownership, operations, rollback, and acceptance
IMAGE_REQUIREMENTS.md    client media filenames, quantities, ratios, and source dimensions
AIDATA/                 active handoff/plan plus read-only brand, SEO, and Pages OLD archives
```

Root config: `package.json` · `tsconfig.json` · `next.config.ts` · `postcss.config.mjs` · `eslint.config.mjs` · `.env.example` · `.env.coolify.example`.

---
_Keep this README updated as the build progresses._

## Production-readiness controls (20 August 2026)

The security, payment, CMS-cache, timetable, QR-ticket, deployment, backup, accessibility, redirect, dependency, and CI findings from the August audit have been remediated in code. See [SECURITY_AND_OPERATIONS.md](SECURITY_AND_OPERATIONS.md) for the implemented controls and the production acceptance checklist.

Daily Express paid checkout is deliberately disabled in production by default (`DAILY_EXPRESS_BOOKINGS_ENABLED=false`). Atomic per-departure inventory is implemented through the private Directus extension; do not enable the launch switch until that extension and the additive schema are deployed, approved capacities are entered, and last-seat/payment concurrency tests pass. Quote and lost-property flows are unaffected.

Use `npm run check` for the full local gate. Production backups use `scripts/backup-db.sh`; validate each backup generation with `scripts/restore-test.sh` on a non-production Docker host.

The Daily Express multi-service correction is implemented additively: routes remains the direction/SEO source, while scheduled_services represents each real departure. The four online WordPress buses are mirrored with exact stop times, 60 seats each, and all 48 numeric fare rows; empty “Ex: 10” placeholders are deliberately omitted. Editors can change each Scheduled Service default capacity from 1–500 and use the automatically-created Service Run for a date-specific capacity override or cancellation. Online checkout requires explicit outward/return service choices and atomic inventory by service code/date. Leicester remains driver-sale only. Keep DAILY_EXPRESS_BOOKINGS_ENABLED=false until the return/inventory policy and live acceptance gate pass.

The revision-guarded additive seed updates existing online scheduled-service records once from the approved four-bus source data, then leaves future Directus editor changes untouched.
