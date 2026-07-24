# NP Coaches

Rebuild of [np-coaches.co.uk](https://np-coaches.co.uk) — a UK coach-hire operator — as a fast, CMS-driven Next.js site.

> **Status:** P0–P7 in-app complete — marketing site, forms, Stripe booking + lost-property pass, home-to-school pages, real CMS images, and the **deploy stack** (cookie consent + security headers + production Dockerfile + `docker-compose.prod.yml` + Traefik + cron backups; see [DEPLOY.md](DEPLOY.md)). Launch needs the VPS + Cloudflare + live Stripe. Remaining in-app: M365 confirmation emails. New chat/agent picking this up → read [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md) first. Both Stripe flows compute price **server-side** with **per-fee configurable VAT** in `settings.pricing`, persist a `pending` record, pay via **Stripe Checkout**, and a shared signed **idempotent** webhook (`/api/stripe/webhook`) marks them `paid`. `bookings` / `pass_purchases` are server-write only (no public access). The Daily Express booking is **stop-to-stop** like the live site — pick any From/To from a 6-stop corridor (`stops` collection), priced from the flat corridor fares in `settings.pricing`. The Directus admin is organised into groups with a custom Insights dashboard (`npm run configure`). **Forms:** `/contact-us` + `/get-a-quote` server actions validate (zod + honeypot + rate-limit + Cloudflare Turnstile) and persist to Directus `contact_submissions` / `quote_requests` (public create, staff-only read). **Booking:** `/daily-express-service/book` computes the price **server-side** from CMS route fares, creates a `pending` `bookings` row, pays via **Stripe Checkout**, and a signed **idempotent** webhook (`/api/stripe/webhook`) marks it `paid` → `/booking/success`. Email delivery is env-driven (`src/lib/email.ts`, Outlook/M365 SMTP) and no-ops until creds are set; the **lost-property claim notification** to `info@np-coaches.co.uk` is wired (fill `SMTP_PASS`). Booking/quote confirmations still deferred. Built so far: brand system + modular layout (`Header`/`Hero`/`Footer`); Docker dev stack (MariaDB + Directus + app); **branded Directus admin** with the Marketplace enabled; all site content served from **Directus** with a graceful fallback to `src/lib/site-content.json`. Collections: `settings` (incl. nav/footer, stats, accreditations, coverage, FAQs), `services`, `fleet`, `pages`, `tours`, `routes`, `blog_posts`, `testimonials`. **Pages:** `/fleet` + per-vehicle SEO pages; editable content + legal pages (About, Contact, FAQs, Lost Property, Safeguarding, Vacancies, Downloads, Privacy, Cookie, Terms, Home-to-School) via `/[slug]`; `/uk-tours` + per-destination pages; `/daily-express-service` + the 3 route pages with timetables; `/blog` + posts. **Homepage:** hero quote widget, accreditation strip, fleet teaser, stats band, coverage map, testimonial carousel, FAQ accordion. **SEO (site-wide):** `robots.txt` (AI crawlers allowed) + `sitemap.xml`; every page has a title/description via a shared `buildMetadata()` helper (`src/lib/seo.ts`) with **canonical** + per-page OpenGraph/Twitter; JSON-LD across the site — Organization / Service / BusTrip / BlogPosting / FAQPage + **ItemList** (listings), **ContactPage**, and **BreadcrumbList**. Interior pages share a `PageHero` (animated navy header w/ breadcrumb) so they match the homepage; motion via `motion` (framer-motion) in reusable primitives (`src/components/ui/motion.tsx`, `Backdrops.tsx`). Continuing the build (incl. in parallel)? See **[`AIDATA/TASKS.md`](AIDATA/TASKS.md)**, then [`INFO.md`](INFO.md), [`AIDATA/PLAN.md`](AIDATA/PLAN.md), [`CLAUDE.md`](CLAUDE.md).

## Stack

| Layer    | Choice |
|----------|--------|
| Frontend | **Next.js 16** · TypeScript · Tailwind · `motion` (framer-motion) for scroll/hover/parallax (Dockerized) |
| CMS / admin | **Directus** (Dockerized) — content + transactional, one client admin |
| Database | **MariaDB** (Dockerized) — reached only by Directus, **no Prisma** |
| Media    | Directus uploads (Docker volume) |
| Reverse proxy | Traefik · **Cloudflare** for DNS · Proxy/CDN · SSL · WAF |
| Payments | Stripe |
| Email    | Microsoft 365 SMTP |
| Host     | Hostinger VPS — KVM2 (2 vCPU / 8 GB), Docker |

**Architecture:** `Cloudflare (DNS/Proxy/SSL/WAF) → Hostinger VPS (Docker + Traefik) → Next.js → Directus → MariaDB`. Fully self-hosted (the original [SOW.md](AIDATA/SOW.md) stack). The app never touches MariaDB directly — only Directus does; it holds scoped Directus tokens, never DB creds.

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

`npm run seed` is idempotent — re-run it any time; it only creates what's missing and won't overwrite content you've edited in Directus (it merges new `settings.pricing` keys without clobbering edited fares). `npm run media` uploads the real fleet/tour photos + school logos (from `directus/seed-media/`) into Directus and links them to the items (skips anything already set). `npm run configure` is also idempotent — it groups the collections (Content · Marketing · Daily Express · Bookings & Payments · Leads), adds field notes/widths/status colours + display templates, and builds the **NP Coaches** Insights dashboard (paid bookings, pass purchases, revenue, recent leads).

Images are served and resized by Directus (`/assets/<id>`); a custom `next/image` loader ([src/lib/directus-loader.ts](src/lib/directus-loader.ts)) points at it. **Note:** for host `npm run dev`, `DIRECTUS_URL` must be `http://localhost:8055` (not the Docker hostname) — otherwise the app can't reach the CMS and silently falls back to `site-content.json`.

**App on host, services in Docker** (if you prefer running Next.js directly):

```bash
docker compose up db directus   # MariaDB + Directus only
npm install && npm run dev      # Next.js app on http://localhost:3000
```

`npm run dev` uses Turbopack (fast). If edits don't hot-reload on your machine (some Linux/WSL/VM/container filesystems drop watch events with Turbopack), use **`npm run dev:poll`** — it runs the webpack dev server with file-system polling so saves always reload.

`npm run build` for a production build, `npm run lint` to lint. Never commit `.env`.

## Principles

Simple · modular · dynamic (whole site editable from Directus) · responsive · fast · secure. No over-engineering; simple-yet-complete code (no stubs). **UK law governs the live site and customer data** (UK GDPR / DPA 2018 / PECR).

Working rules and common-error fixes live in [RULES.md](RULES.md); every change is logged in the append-only [CHANGELOG.md](CHANGELOG.md).

All app code lives under `src/` (the `@/*` import alias maps to `src/`); config files stay at the repo root.

```
src/
  app/                  Next.js App Router (layout.tsx, page.tsx, globals.css)
  components/
    layout/             site chrome — Header, Footer
    sections/           page sections — Hero (service cards, carousels, … land here)
  lib/
    site-config.ts      single source of truth for nav/footer/contact (→ Directus in P1)
directus/               Directus uploads + extensions (bind-mounted in dev)
docker-compose.yml      dev stack: MariaDB + Directus + app
AIDATA/                 plan, brand, UI mockups, SEO assets, Pages OLD/ archive (read-only)
```

Root config: `package.json` · `tsconfig.json` · `next.config.ts` · `postcss.config.mjs` · `eslint.config.mjs` · `.env.example`.

---
_Keep this README updated as the build progresses._
