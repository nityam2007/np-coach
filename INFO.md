# NP Coaches — Project Info (TECH · BRAND · FACTS)

Single source of truth for stack, brand, and business facts. Build details/phases live in [AIDATA/PLAN.md](AIDATA/PLAN.md); working rules in [CLAUDE.md](CLAUDE.md).

**Project:** Production rebuild of np-coaches.co.uk as a fast, CMS-driven application. The Coolify stack was deployed successfully on 6 August 2026. Goals: **fast as fire · secure as a prison · best UX.** Simple, modular, dynamic, responsive — don't over-engineer.

## DELIVERY

| Responsibility | Owner |
| --- | --- |
| Delivery brand | **Blustdio** |
| Product Manager | [Rohan](https://rohanxblu.in/) |
| Development | [Nityam](https://nsheth.in/) |
| Repository | [nityam2007/np-coach](https://github.com/nityam2007/np-coach) |

---

## TECH (locked)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js 16** · TypeScript · Tailwind (Dockerized) | SSG/ISR, minimal client JS. Talks to Directus over REST/GraphQL. |
| CMS / admin | **Directus** (Dockerized) | Headless CMS + admin panel + API. Owns content **and** transactional data; client gets one admin. |
| Database | **MariaDB** (Dockerized) | Reached **only by Directus** — the app never connects directly. **No Prisma.** |
| Media | **Directus uploads** → Docker volume | Cloudflare caches them. (R2 optional later if CDN-backed media is wanted.) |
| Reverse proxy | **Coolify proxy** (production) · Traefik (standalone alternative) | Coolify owns production routing/TLS; never run both proxies together. |
| Edge | **Cloudflare** — DNS · Proxy/CDN · SSL (Full-strict) · WAF · **Turnstile** | In front of the VPS. |
| Payments | **Stripe** | Server-side only; prices computed server-side; webhook signatures verified. |
| Email | **Microsoft 365** | Production delivery for OTP, forms, booking, and pass messages must be configured and acceptance-tested; no Resend. |

**Host:** Hostinger **VPS — KVM2 (2 vCPU / 8 GB RAM)**, Linux + Docker + Coolify. The production stack is repository-backed and deployed from `main`. *Directus is source-available (MSCL): free for NP Coaches under its Innovation Grant (org well under $5M revenue / 50 staff).*

### Architecture

```
        Cloudflare  (DNS · Proxy/CDN · SSL Full-strict · WAF · Turnstile)
                              │
                              ▼
   Hostinger VPS — KVM2 (2 vCPU / 8 GB) · Docker + Coolify proxy
        ├─ Next.js app   ──REST/GraphQL──► Directus
        ├─ Directus (admin / API) ───────► MariaDB (private)
        ├─ Redis (private cache / rate limits)
        └─ Directus uploads → persistent volume

   Next.js ──► Stripe (payments) · Next.js ──► Microsoft 365 (when configured)
```

Directus owns all data — both **content** (pages, fleet, tours, blog, FAQs, testimonials) and **transactional** collections (bookings, pass purchases, contact + quote submissions) — with role-based access, giving the client one admin panel. The **whole site is editable from Directus** — nothing user-facing is hardcoded. See the collection list in [AIDATA/PLAN.md](AIDATA/PLAN.md).

### Local dev

- `docker compose up` → MariaDB + Directus (local).
- `npm run dev` → Next.js app.
- Commit `.env.example`; never commit real `.env` (Directus URL + scoped tokens, Stripe keys, M365 SMTP creds — never DB credentials in the app).

---

## BRAND

UI mockups are authoritative for layout: [WEB PAGE STYLE REF.jpeg](AIDATA/WEB%20PAGE%20STYLE%20REF.jpeg) (homepage — sticky nav, hero + instant-quote widget, accreditation strip, service cards, fleet carousel, school-transport block, coverage map, stats band) and [FOOTER REF.jpeg](AIDATA/FOOTER%20REF.jpeg) (testimonials, FAQ accordion, footer columns).

- **Colours:** Deep primary blue `#172554` · Light Grey-Blue `#a8abbc` · White `#fdfdfd` · accent blue `#2563eb`.
- **Fonts:** Display/headings = **Geist**; body = **Inter** — both via `next/font`. (The brand board jpeg's "Optima" is superseded — ignore it.)
- **Tone:** Premium · Reliable · Safe · Professional. Strong navy foundations, generous white space, minimal dividers, polished fleet imagery, concise copy.
- **Logo:** NPC globe mark from the migrated live-site media, stored and editable in Directus.
- **Mockup data is placeholder:** the mockup footer's Tamworth address / `0121…` phone is template filler — **use the real Iver depot details below.**

---

## BUSINESS FACTS (for copy + structured data)

- **New Punjab Coaches Ltd**, trading as **NP Coaches**. Founded **1999**, family-run.
- **Depot:** Willow Tree Farm, Love Lane, Iver, Buckinghamshire, **SL0 9QZ**.
- **Phone:** +44 208 843 1000 · **Email:** Info@np-coaches.co.uk (general), Bookings@np-coaches.co.uk.
- Fleet: **15+ Euro-6 ULEZ-compliant coaches, 19–98 seats.** ULEZ-compliant, DBS-checked drivers, CPT member, full UK PSV operator licence.
- **Daily Express routes:** London ↔ Wolverhampton / Birmingham / Coventry; London ↔ Leicester (Fri–Mon only).
- Canonical version: [AIDATA/SEO - OLD/llms.txt](AIDATA/SEO%20-%20OLD/llms.txt).

---

## COMPLIANCE

**UK law governs the live site and all customer data** — UK GDPR + Data Protection Act 2018, PECR (cookie consent before any non-essential cookie/analytics), ICO guidance, UK consumer rules. India is only the *developer's* location and imposes nothing on the production site. Host in **EU/UK** (Hostinger VPS region, Stripe, M365). Data minimisation for school-transport PII/DBS.

---

## RULES

- Keep it **simple** — smallest thing that works; don't over-engineer.
- **Modular & composable** — one self-contained module per UI piece (e.g. `Header`); pages/layouts *reference* it, never re-implement. One source of truth each.
- **Dynamic + responsive** — the **whole site is editable from Directus** (nothing user-facing hardcoded); mobile-first.
- **Simple yet complete code** — no stubs, empty logic blocks, or TODO-shaped gaps; every piece fully does its job.
- **Persist data at every step** before moving on; Stripe webhooks idempotent.
- **Security** — app never holds DB creds (only Directus does); Stripe server-side only; validated + rate-limited forms (Turnstile); secrets in env; HTTPS + security headers; PII out of any cache.
- **Keep [README.md](README.md) current** as the build progresses.

---

## OPEN ITEMS / VERIFY

1. Confirm the least-privilege `DIRECTUS_SERVER_TOKEN` before enabling protected writes.
2. Confirm Cloudflare Full (strict), WAF, Turnstile, Directus admin WebSockets, and public asset delivery.
3. Configure and test Stripe live mode plus the signed webhook.
4. Configure and test Microsoft 365 delivery for forms, OTPs, bookings, and passes.
5. Schedule and restore-test encrypted off-site database and upload backups.
6. Complete redirects, Lighthouse/accessibility review, and content/legal acceptance.
7. Re-check the Directus licence only if NP Coaches exceeds the Innovation Grant thresholds.
