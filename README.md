# NP Coaches

Rebuild of [np-coaches.co.uk](https://np-coaches.co.uk) — a UK coach-hire operator — as a fast, CMS-driven Next.js site.

> **Status:** P0–P7 in-app complete — marketing, CMS content, protected forms, Stripe Daily Express booking, paid lost-property claims, home-to-school pages, compliance, and production Docker stacks for Coolify or standalone Traefik. Launch still needs the live VPS resource, Cloudflare, Stripe, scoped Directus token, and M365 credentials. Read [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md) before continuing.
>
> **Payments and forms:** prices are computed server-side; Stripe Checkout receives the customer email; pending orders become paid only after a verified Checkout session or signed idempotent webhook. Tickets and claim completion are hidden while payment is pending. Contact and quote submissions pass server-side validation, honeypot, rate-limit and Turnstile checks, then use the scoped Directus server token—there is no anonymous create permission.
>
> **CMS and pages:** Directus drives settings, services, fleet copy/photos/galleries/seating plans, pages and hero images, tours, routes, blog posts/thumbnails and testimonials, with `site-content.json` as the offline fallback. `/fleet` and all six vehicle pages use the archived fleet structure; `/timetable` and the archived content/legal routes are migrated; blog thumbnails render on cards, articles and Open Graph metadata. The homepage remains independently CMS-driven.
>
> **SEO and UI:** canonical/Open Graph/Twitter metadata, sitemap/robots/llms.txt and JSON-LD are site-wide. Interior content pages share `PageHero` and the upgraded image/prose layout; blog articles use the same light editorial treatment and remain fully CMS-managed. Bespoke fleet, route, tour and school pages retain their structured designs.
> The header and footer navigation are CMS-managed; Contact Us remains a primary menu item. `/faqs` is a dedicated SEO-ready accordion page sourced from the same editable FAQ settings as the homepage, with the homepage showing the four priority questions only.
## Current payment and form controls

- Contact and quote records are created only by protected server actions (not by Directus' public role); each action validates input, uses a honeypot, verifies Turnstile, and is rate-limited.
- Stripe Checkout receives the customer's email for receipts. A booking, ticket, or lost-property claim is shown as complete only after Stripe verifies the Checkout session; public booking references cannot complete an order.
- Coolify deployments apply the committed schema and run the idempotent content/admin/media bootstrap automatically. Standalone deployments can still run `npm run bootstrap` manually.

## Stack

| Layer    | Choice |
|----------|--------|
| Frontend | **Next.js 16** · TypeScript · Tailwind · `motion` (framer-motion) for scroll/hover/parallax (Dockerized) |
| CMS / admin | **Directus** (Dockerized) — content + transactional, one client admin |
| Database | **MariaDB** (Dockerized) — reached only by Directus, **no Prisma** |
| Media    | Directus uploads (Docker volume) |
| Cache / rate limits | Redis (private, password-protected in production) |
| Reverse proxy | Coolify proxy (recommended) or bundled Traefik · **Cloudflare** at the edge |
| Payments | Stripe |
| Email    | Microsoft 365 SMTP |
| Host     | Hostinger VPS — KVM2 (2 vCPU / 8 GB), Docker |

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

`npm run seed` is idempotent — re-run it any time; it only creates what's missing and won't overwrite content you've edited in Directus (it merges new `settings.pricing` keys without clobbering edited fares). `npm run media` uploads the real fleet/tour photos + school logos (from `directus/seed-media/`) into Directus and links them to the items (skips anything already set). `npm run configure` is also idempotent — it groups the collections (Content · Marketing · Daily Express · Bookings & Payments · Leads), adds field notes/widths/status colours + display templates, and builds the **NP Coaches** Insights dashboard (paid bookings, pass purchases, revenue, recent leads).

Images are served and resized by Directus (`/assets/<id>`); a custom `next/image` loader ([src/lib/directus-loader.ts](src/lib/directus-loader.ts)) points at it. **Note:** for host `npm run dev`, `DIRECTUS_URL` must be `http://localhost:8055` (not the Docker hostname) — otherwise the app can't reach the CMS and silently falls back to `site-content.json`.

**App on host, services in Docker** (if you prefer running Next.js directly):

```bash
docker compose up db directus   # MariaDB + Directus only
npm install && npm run dev      # Next.js app on http://localhost:3000
```

`npm run dev` uses Turbopack (fast). If edits don't hot-reload on your machine (some Linux/WSL/VM/container filesystems drop watch events with Turbopack), use **`npm run dev:poll`** — it runs the webpack dev server with file-system polling so saves always reload.

`npm run build` for a production build, `npm run lint` to lint. Never commit `.env`.

## Coolify production deployment

Use the root-level [`docker-compose.coolify.yml`](docker-compose.coolify.yml) with Coolify's Docker Compose build pack. It deploys the Next.js app, Directus, MariaDB, Redis, an exact-schema migration, and an idempotent CMS/media bootstrap as one private stack; only the web and CMS services receive domains.

Copy [`.env.coolify.example`](.env.coolify.example) into Coolify's environment-variable editor and follow [`DEPLOY_COOLIFY.md`](DEPLOY_COOLIFY.md). The older [`docker-compose.prod.yml`](docker-compose.prod.yml) and [`DEPLOY.md`](DEPLOY.md) are the non-Coolify alternative.

Do not deploy the standalone Traefik service inside Coolify—Coolify already owns the VPS reverse proxy and ports 80/443.

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
docker-compose.coolify.yml  production stack managed by Coolify
Dockerfile.bootstrap    one-shot committed CMS/content/media bootstrap
Dockerfile.schema       packages the Directus snapshot for Coolify migration
AIDATA/                 plan, brand, UI mockups, SEO assets, Pages OLD/ archive (read-only)
```

Root config: `package.json` · `tsconfig.json` · `next.config.ts` · `postcss.config.mjs` · `eslint.config.mjs` · `.env.example` · `.env.coolify.example`.

---
_Keep this README updated as the build progresses._
