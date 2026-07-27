# NP Coaches

Rebuild of [np-coaches.co.uk](https://np-coaches.co.uk) — a UK coach-hire operator — as a fast, CMS-driven Next.js site.

> **Status:** P0–P7 in-app complete — marketing, CMS content, protected forms, Stripe Daily Express booking, paid lost-property claims, home-to-school pages, compliance and the production Docker/Traefik stack. Launch still needs the VPS, Cloudflare and live Stripe configuration; branded M365 confirmation emails remain the main in-app follow-up. Read [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md) before continuing.
>
> **Payments and forms:** prices are computed server-side; Stripe Checkout receives the customer email; pending orders become paid only after a verified Checkout session or signed idempotent webhook. Tickets and claim completion are hidden while payment is pending. Contact and quote submissions pass server-side validation, honeypot, rate-limit and Turnstile checks, then use the scoped Directus server token—there is no anonymous create permission.
>
> **CMS and pages:** Directus drives settings, services, fleet copy/photos/galleries/seating plans, pages and hero images, tours, routes, blog posts/thumbnails and testimonials, with `site-content.json` as the offline fallback. `/fleet` and all six vehicle pages use the archived fleet structure; `/timetable` and the archived content/legal routes are migrated; blog thumbnails render on cards, articles and Open Graph metadata. The homepage remains independently CMS-driven.
>
> **SEO and UI:** canonical/Open Graph/Twitter metadata, sitemap/robots/llms.txt and JSON-LD are site-wide. Interior content pages share `PageHero` and the upgraded image/prose layout; bespoke fleet, route, blog, tour and school pages retain their structured designs.
## Current payment and form controls

- Contact and quote records are created only by protected server actions (not by Directus' public role); each action validates input, uses a honeypot, verifies Turnstile, and is rate-limited.
- Stripe Checkout receives the customer's email for receipts. A booking, ticket, or lost-property claim is shown as complete only after Stripe verifies the Checkout session; public booking references cannot complete an order.
- Run `npm run seed` and then `npm run media` after deployment to apply the latest CMS fields and attach the archived fleet, page and blog media without overwriting editor-set files.

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
