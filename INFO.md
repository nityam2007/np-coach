# NP Coaches — Project Info (TECH · BRAND · FACTS)

Single source of truth for stack, brand, and business facts. Build details/phases live in [AIDATA/PLAN.md](AIDATA/PLAN.md); working rules in [CLAUDE.md](CLAUDE.md).

**Project:** Rebuild np-coaches.co.uk (UK coach-hire operator, currently WordPress) as a fast, CMS-driven app. Goals: **fast as fire · secure as a prison · best UX.** Simple, modular, dynamic, responsive — don't over-engineer.

---

## TECH (locked)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js 16** · TypeScript · Tailwind (Dockerized) | SSG/ISR, minimal client JS. Talks to Directus over REST/GraphQL. |
| CMS / admin | **Directus** (Dockerized) | Headless CMS + admin panel + API. Owns content **and** transactional data; client gets one admin. |
| Database | **MariaDB** (Dockerized) | Reached **only by Directus** — the app never connects directly. **No Prisma.** |
| Media | **Directus uploads** → Docker volume | Cloudflare caches them. (R2 optional later if CDN-backed media is wanted.) |
| Reverse proxy | **Traefik** (Dockerized) | Routes containers by domain; origin TLS via a Cloudflare Origin cert. |
| Edge | **Cloudflare** — DNS · Proxy/CDN · SSL (Full-strict) · WAF · **Turnstile** | In front of the VPS. |
| Payments | **Stripe** | Server-side only; prices computed server-side; webhook signatures verified. |
| Email | **Microsoft 365 SMTP** (nodemailer) | Works from the VPS Node app. Booking confirmations, pass receipts, contact/quote notifications. No Resend. |

**Host:** Hostinger **VPS — KVM2 (2 vCPU / 8 GB RAM)**, Linux + Docker. Fully self-hosted & owned. Hosting is paid (VPS + Cloudflare) — expected. *Directus is source-available (MSCL): free for NP Coaches under its Innovation Grant (org well under $5M revenue / 50 staff).*

### Architecture

```
        Cloudflare  (DNS · Proxy/CDN · SSL Full-strict · WAF · Turnstile)
                              │  Origin cert
                              ▼
   Hostinger VPS — KVM2 (2 vCPU / 8 GB) · Docker + Traefik
        ├─ Next.js app   ──REST/GraphQL──►  Directus  ──►  MariaDB
        ├─ Directus (admin / API)               └─ uploads → volume
        └─ 2 other static sites

   Next.js ──► Stripe (payments)    ·    Next.js ──► Microsoft 365 (email, SMTP)
```

Directus owns all data — both **content** (pages, fleet, tours, blog, FAQs, testimonials) and **transactional** collections (bookings, pass purchases, contact + quote submissions) — with role-based access, giving the client one admin panel. The **whole site is editable from Directus** — nothing user-facing is hardcoded. See the collection list in [AIDATA/PLAN.md](AIDATA/PLAN.md).

### Local dev

- `docker compose up` → MariaDB + Directus (local).
- `npm run dev` → Next.js app.
- Commit `.env.example`; never commit real `.env` (Directus URL + scoped tokens, Stripe keys, M365 SMTP creds — never DB credentials in the app).

---

## BRAND

UI mockups are authoritative for layout: [WEB PAGE STYLE REF.jpeg](AIDATA/WEB%20PAGE%20STYLE%20REF.jpeg) (homepage — sticky nav, hero + instant-quote widget, accreditation strip, service cards, fleet carousel, school-transport block, coverage map, stats band) and [FOOTER REF.jpeg](AIDATA/FOOTER%20REF.jpeg) (testimonials, FAQ accordion, footer columns).

- **Colours:** Dark Navy `#0e0f27` · Light Grey-Blue `#a8abbc` · White `#fdfdfd` · accent blue for highlighted words/CTAs (per mockup).
- **Fonts:** Display/headings = **Geist**; body = **Inter** — both via `next/font`. (The brand board jpeg's "Optima" is superseded — ignore it.)
- **Tone:** Premium · Reliable · Safe · Professional. Strong navy foundations, generous white space, minimal dividers, polished fleet imagery, concise copy.
- **Logo:** NPC globe mark on navy. Not yet supplied — use a 1:1 placeholder.
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

1. **Logo asset:** awaiting the final NPC logo (1:1 placeholder until then).
2. **Directus behind Cloudflare proxy:** confirm large media uploads + admin websockets work through the proxy (standard config — set sensible body-size / timeouts at Traefik).
3. **Directus licence (MSCL):** free under the Innovation Grant today; re-check only if NP Coaches ever exceeds $5M revenue / 50 staff.
