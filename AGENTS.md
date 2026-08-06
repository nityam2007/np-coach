# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project status: production deployment active

The application is implemented at the repository root and deployed from [`nityam2007/np-coach`](https://github.com/nityam2007/np-coach) through Coolify. P0–P7 are complete; MariaDB, Redis, schema migration, Directus, CMS bootstrap, and Next.js completed the first production deployment on 6 August 2026.

Treat archived source material under `AIDATA/Pages OLD/`, `AIDATA/SEO - OLD/`, the original SOW, brand references, and legal inputs as read-only. `AIDATA/CONTINUE.md`, `AIDATA/TASKS.md`, and `AIDATA/PLAN.md` are active handover documents and must stay current.

## Mission

Operate and improve np-coaches.co.uk as a fast, CMS-driven Next.js site. Three non-negotiables remain: **fast as fire** (SSG/ISR, CDN-cached, minimal client JS), **secure as a prison** (see Security below), **best UX** (mobile-first, responsive, accessible). User-facing content stays CMS-driven.

## Working rules (apply to every change)

> See [RULES.md](RULES.md) for AI don'ts + common errors & fixes, and log every change in the append-only [CHANGELOG.md](CHANGELOG.md).

- **DO NOT OVER-ENGINEER. Keep everything simple and to the point** — architecture, code, and docs. Smallest solution that fully meets the requirement.
- **Simple yet complete code.** No stubs, no empty/placeholder logic blocks, no TODO-shaped gaps — every piece must actually do its job. Code must be **secure, proper, consistent, complete, concise, unambiguous, and modular.**
- **Modular & composable.** Each UI piece is one self-contained module (e.g. `Header`); pages/layouts *reference* it rather than re-implement. One source of truth per component.
- **The whole site is editable from the CMS (Directus).** Everything user-facing — copy, images, fleet, routes, prices, SEO, nav, footer — comes from Directus. Nothing user-facing is hardcoded. Layouts are responsive, mobile → desktop.
- **The app never connects to MariaDB directly — only Directus does.** No Prisma. No DB creds in the app (it holds scoped Directus tokens only).
- **Persist data at every step** before moving on (form submissions, bookings, payments); Stripe webhooks must be idempotent.
- **UK law governs the live site and all customer data** (UK GDPR / Data Protection Act 2018, PECR for cookies, ICO guidance, UK consumer rules). India is only the *developer's* location and imposes nothing on the production site.
- **Keep `README.md` current** — update it as the build progresses.
- **Match existing code's idioms** once the app exists.
- **Read before editing.** Inspect every target file and its immediate caller/consumer first; extend the existing source of truth instead of adding duplicate UI around it.
- **Git:** commit as the repo's configured author (`nityam2007`); **never add AI / "Co-Authored-By" trailers.**

## Build status & extending (read before adding features)

**Continuing the build? Read [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md) FIRST** — it's the up-to-date handoff (where things are, how to run, gotchas, architecture patterns, what's next). Then [AIDATA/TASKS.md](AIDATA/TASKS.md) for the work board + extension recipe.

The app and Coolify deployment are complete through **P7**. Remaining work is production acceptance and enhancement: scoped Directus app access, live integration checks, M365 email, off-site restore-tested backups, redirects, and final QA. Start with [HANDOVER.md](HANDOVER.md) and [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md).

Quick map:
- `src/app/` — routes (incl. `[slug]` which resolves fleet vehicles **and** content pages; `fleet/`; `robots.ts`; `sitemap.ts`).
- `src/components/{layout,sections,seo}/` — self-contained UI modules.
- `src/lib/` — `directus.ts` (typed fetchers, ISR, fallback) · `site-config.ts` (types) · `site-content.json` (seed source + offline fallback).
- `scripts/seed-directus.mjs` — idempotent CMS bootstrap (`npm run seed`).
- **Pattern for any content:** Directus collection → seed → typed fetcher (with fallback) → component/route. Simple pages need **no code** — just add a `pages` entry in the CMS.
- **Agent-safe verify:** `npx tsc --noEmit --incremental false` · `npm run lint`. Use the full Docker/bootstrap/build checks when the relevant services are available and no user-owned process will be disrupted.

## Reference material (read before changing the relevant area)

- [AIDATA/PLAN.md](AIDATA/PLAN.md) — **the build plan: architecture, content model, modules, phases. Start here.**
- [AIDATA/SOW.md](AIDATA/SOW.md) — original statement of work (note: some decisions superseded below).
- [AIDATA/NP Coaches Rebuild Scope.md](AIDATA/NP Coaches Rebuild Scope.md) — full feature breakdown (pages, CMS, booking systems, payments, email, DB tables).
- [AIDATA/SiteMAP.md](AIDATA/SiteMAP.md) — the page tree to build (the `Pages OLD/SiteMAP - EXTRACT IT FOR ME.md` is the raw WordPress menu dump).
- [AIDATA/Brand Identity.md](AIDATA/Brand Identity.md) — fonts, colours, tone (see below).
- [AIDATA/Pages OLD/](AIDATA/Pages%20OLD/) — full markdown archive of the live WordPress pages (root pages + `Fleet/`, `Routes/`, `Info/`, `Legal/`, `Services/`, `School Transport/`); content migration source, **not** a design reference. Caveats: scraped privacy policy has `gamechique.com` boilerplate (rewrite it); `Fleet/76-seat-coaches.md` content is actually a 72-seat coach; only 3 Daily Express route pages exist live.
- [AIDATA/SEO - OLD/](AIDATA/SEO%20-%20OLD/) — existing `robots.txt`, `llms.txt`, `schema-snippets.json` (JSON-LD structured data), and the AI-SEO sprint pack. Migrate/preserve these.
- [AIDATA/Terms.md](AIDATA/Terms.md) — legal copy.

## Tech stack (locked) — full details in [INFO.md](INFO.md)

The implemented stack evolved from the original [SOW.md](AIDATA/SOW.md) and remains fully self-hosted.

- **Frontend:** Next.js 16 + TypeScript + Tailwind (Dockerized). SSG/ISR; talks to Directus over REST/GraphQL.
- **CMS / admin:** **Directus** (Dockerized) — headless CMS + admin panel + API. Owns content **and** transactional data; one client admin panel. *(Source-available MSCL — free for NP Coaches under the Innovation Grant.)*
- **Database:** **MariaDB** (Dockerized) — reached only by Directus. **No Prisma.**
- **Media:** Directus uploads → Docker volume (Cloudflare caches; R2 optional later).
- **Reverse proxy:** **Coolify proxy** in production. The bundled Traefik stack is a standalone alternative and must not run beside Coolify.
- **Edge:** **Cloudflare** — DNS, Proxy/CDN, SSL (Full-strict), WAF, Turnstile — in front of the VPS.
- **Payments:** Stripe (server-side only; prices computed server-side; webhook signatures verified).
- **Email:** Microsoft 365 delivery is the required provider; production integration/acceptance remains open. Do **not** add Resend.
- **Host:** Hostinger **VPS — KVM2 (2 vCPU / 8 GB)**, Linux + Docker + Coolify.

### Architecture

```
Cloudflare (DNS·Proxy/CDN·SSL·WAF·Turnstile) ─► Hostinger VPS · Docker + Coolify proxy
                                                     ├─ Next.js ─REST/GraphQL─► Directus
                                                     ├─ Directus ─► MariaDB (private)
                                                     ├─ Redis (private)
                                                     └─ uploads → persistent volume
                              Next.js → Stripe · Next.js → Microsoft 365 (when configured)
```

Directus owns all data — content **and** transactional collections (bookings, pass purchases, contact/quote submissions) — with role-based access (one client admin panel). The whole site is editable from Directus. See [AIDATA/PLAN.md](AIDATA/PLAN.md) for collections + modules.

**Robust, not over-engineered:** Coolify Docker Compose with healthchecks, restart policies, private internal services, named volumes, and Cloudflare WAF. Production also requires encrypted off-site database/upload backups and a tested restore.

### Dev environment

- `docker compose up` → MariaDB + Directus locally.
- `npm run dev` → the Next.js app.
- Commit `.env.example`; never commit real `.env` (Directus URL + scoped tokens, Stripe keys, M365 SMTP creds — never DB creds in the app).

## Brand identity & UI reference (drives all UI work)

- **UI mockups (authoritative for layout):** [WEB PAGE STYLE REF.jpeg](AIDATA/WEB%20PAGE%20STYLE%20REF.jpeg) (full homepage — sticky nav, hero + instant-quote widget, accreditation strip, service cards, fleet carousel, school-transport block, coverage map, stats band) and [FOOTER REF.jpeg](AIDATA/FOOTER%20REF.jpeg) (testimonials, FAQ accordion, footer columns). Build to match these.
- **Colours:** Deep primary blue `#172554`, Light Grey-Blue `#a8abbc`, White `#fdfdfd`, accent blue `#2563eb`.
- **Fonts:** Headings/display = **Geist**, body = **Inter** — both via `next/font`. (The brand board jpeg's "Optima" is the old, superseded choice — ignore it.)
- **Tone / visual direction:** Premium, reliable, safe, professional. Strong navy foundations, generous white space, minimal dividers, polished fleet imagery, concise copy.
- The migrated NPC globe logo is stored in Directus and remains CMS-editable.
- **Mockup data is placeholder:** the footer in the mockup shows a Tamworth address / `0121…` phone — **ignore it**; use the real Iver depot details (below).

## Domain model & key features (from the scope)

The site is a **coach/bus operator site** with three transactional systems beyond marketing pages:

- **Daily Express booking** — route selection → date → passenger details → Stripe payment → email confirmation. Routes are London ↔ Wolverhampton / Birmingham / Coventry, and London ↔ Leicester (Fri–Mon only). The "Shop / Cart / Checkout" pages in the sitemap are this ticket-booking flow.
- **Lost Property Pass** — a paid token purchase (£5 admin fee) via Stripe with an emailed receipt.
- **Home-to-School transport** — informational page that links out to / iframes an **external portal** (ShuttleID); this is *not* built in-app.
- **Contact & Get-a-Quote** forms — stored in Directus and emailed via M365 SMTP.

Planned collections (Rebuild Scope): Users, Bookings, Pass Purchases, Contact Submissions, Quote Requests, Blog Posts, Pages, SEO Data — all in Directus.

## SEO requirements (a primary goal of the rebuild — do not regress)

- **Preserve existing URL structure** from the WordPress site where possible (e.g. `/about-us/`, `/uk-tours/`, `/daily-express-service/`, `/19-seat-coaches/`, route pages like `/wolverhampton-to-london/`). Each fleet vehicle and each UK-tour destination gets its own SEO landing page.
- Migrate meta titles/descriptions, Open Graph tags, XML sitemap, `robots.txt`, and JSON-LD structured data from `AIDATA/SEO - OLD/`.
- `robots.txt` explicitly **allows AI crawlers** (GPTBot, ClaudeBot, PerplexityBot, etc.) and ships an `llms.txt` — keep both; AI citeability is an intentional part of the SEO strategy.

## Business facts (for content/structured-data accuracy)

New Punjab Coaches Ltd, trading as NP Coaches. Founded 1999, family-run. Depot: Willow Tree Farm, Love Lane, Iver, Buckinghamshire, SL0 9QZ. Phone +44 208 843 1000. 15+ Euro-6 ULEZ-compliant coaches, 19–98 seats. Use these consistently in copy and schema — the canonical version lives in [AIDATA/SEO - OLD/llms.txt](AIDATA/SEO%20-%20OLD/llms.txt).

## Commands

No `package.json` exists yet. Target dev workflow (see Dev environment above): `docker compose up` for MariaDB + Directus, `npm run dev` for the app. Fill in the real `build` / `lint` / `test` commands here as soon as the app is scaffolded.
