# NP Coaches — Production Handover

> Production infrastructure was deployed successfully through Coolify on 6 August 2026. This document is the operational handover for maintainers and project owners. It contains no credentials.

## Project ownership

| Responsibility | Owner |
| --- | --- |
| Delivery brand | **Blustdio** |
| Product Manager | [Rohan](https://rohanxblu.in/) |
| Development | [Nityam](https://nsheth.in/) |
| Source repository | [nityam2007/np-coach](https://github.com/nityam2007/np-coach) |
| Production branch | `main` |

NP Coaches remains the product and customer-facing brand. Blustdio is the delivery brand for this implementation.

## Production topology

| Item | Production value |
| --- | --- |
| Website | `https://np-coaches.co.uk` |
| Current acceptance hostname | `https://demo.np-coaches.co.uk` |
| CMS / admin | `https://cms.np-coaches.co.uk/admin` |
| Platform | Hostinger VPS with Coolify |
| Compose file | `/docker-compose.coolify.yml` |
| Edge | Cloudflare |
| Application | Next.js standalone container |
| CMS / API | Directus |
| Database | MariaDB, private Docker network only |
| Cache / rate limiting | Redis, private Docker network only |
| Transactional email | Internal Postfix relay, private Docker network only |

Only `web:3000` and `directus:8055` receive Coolify domains. MariaDB, Redis, Postfix, schema migration, and CMS bootstrap must never receive public domains or host port mappings.

Persistent data is stored in the named volumes `mariadb_data`, `redis_data`, and `directus_uploads`. Never delete or rename these volumes during a normal deployment. Repository Directus extensions are application code baked into `Dockerfile.directus`, not persistent data.

## Source of truth

- Git contains application code, the Directus schema snapshot, safe seed content, and starter media.
- Directus is the production source of truth for edited content and transactional records.
- MariaDB is accessed only by Directus; the Next.js app never receives database credentials.
- Production secrets live only in Coolify environment variables.
- Live SQL dumps and production uploads must never be committed to Git.

Routine deployments are additive and idempotent: they reuse the named MariaDB/uploads volumes, preserve populated CMS settings and dashboard panels, and verify that protected business-table counts do not decrease. Exact schema reconciliation is never automatic.

## Routine deployment

1. Review and merge a tested change into `main`.
2. Confirm the commit exists in the [production repository](https://github.com/nityam2007/np-coach).
3. Push the approved commit to `main`; the configured GitHub webhook should queue Coolify automatically.
4. If no deployment is queued, inspect GitHub's webhook delivery and use Coolify's manual Deploy button as a fallback.
5. Confirm `database`, `redis`, `directus`, and `web` are healthy.
6. Confirm `schema-migrate` and `cms-bootstrap` exited successfully with code 0.
7. Run the smoke checks below.

Do not run the standalone Traefik stack from `docker-compose.prod.yml` on the Coolify server. Coolify already owns the reverse proxy and ports 80/443.

## Environment and secret ownership

Use [`.env.coolify.example`](.env.coolify.example) as the variable inventory. It contains names and safe defaults only.

| Secret group | Stored in | Notes |
| --- | --- | --- |
| MariaDB, Redis, Directus key/secret, auth secret | Coolify-generated `SERVICE_*` variables | Preserve the single-word identifiers from the Compose file |
| Directus human admin password | Coolify runtime variable | Change through a coordinated maintenance action |
| Scoped app token | `DIRECTUS_SERVER_TOKEN` in Coolify | Required for forms, accounts, bookings, and pass writes; never use the bootstrap admin token |
| Stripe keys and webhook secret | Coolify runtime variables | Use live-mode values only in production |
| Turnstile secret | `TURNSTILE_SECRET` in Coolify | Runtime only; existing MAIN widget stays in Managed mode |
| Postfix SMTP settings | Coolify runtime variables | No username/password; web and Postfix must share a private network and `SMTP_HOST` must resolve there |
The internal recipient mailboxes are not Directus users and consume no Studio seats. Contact/lost-property notifications go to `info@np-coaches.co.uk`; quote notifications go to `bookings@np-coaches.co.uk`.

Only `NEXT_PUBLIC_*` variables should be enabled as build variables. Treat every other credential as runtime-only and secret.

## Post-deploy smoke checks

- Website loads over HTTPS with CMS images.
- CMS admin loads and accepts the intended human administrator account.
- Browser console has no blocking application or asset errors.
- Contact and quote forms pass Turnstile, create Directus records, notify staff, and acknowledge the customer.
- Customer OTP/account flow delivers the code; a forced SMTP failure shows an error instead of false success.
- A Stripe test/live booking and lost-property payment reaches `paid` through the signed webhook.
- Booking sends customer and staff messages once; lost property also sends customer and staff messages once. Directus parent email fields and the matching **Email Logs** rows must all show `sent`. Repeat this once through Stripe, once with a 100% coupon/no PaymentIntent, and once by changing a test record to Paid in Directus; neither path may duplicate email or inventory.
- Force one SMTP failure and confirm Email Logs shows `failed` with an attempt count and safe error code, then run maintenance and confirm the same logical row becomes `sent` without duplicating the paid order or inventory.
- Cookie consent, security headers, sitemap, robots.txt, and llms.txt respond correctly.
- GA4 makes no network request before explicit consent; accepting loads `G-3GXSRDBP55`, rejecting/withdrawing disables analytics and clears accessible first-party GA cookies.
- Search Console verification, apex canonicals, root sitemap URLs, and the CMS-backed LocalBusiness/service JSON-LD are present after the domain cutover.
- MariaDB and Redis have no public Coolify domain or published host port.
- Directus Studio renders the sign-in application (not an empty `Loading…` shell) on pinned 12.3.0; `/server/ping` alone is not sufficient evidence.

## Backups and recovery

Before accepting live customer transactions, schedule encrypted off-site backups for:

- Daily MariaDB logical dumps with retention.
- The `directus_uploads` volume.
- Coolify configuration and SSH recovery material.

Restore-test both the database and uploads. A backup that has not been restored in a test is not considered verified.

For an application rollback, select the last known-good Git commit in Coolify and redeploy it without deleting volumes. If the release changed the Directus schema, review backward compatibility before rolling application code back.

## Known first-deployment protections

- Routine Git deploys run only Directus system bootstrap plus additive app seeding; they never run exact `schema apply`.
- Manual `scripts/schema.sh apply` prints a dry-run and requires `CONFIRM_SCHEMA_APPLY=I_HAVE_A_VERIFIED_BACKUP`.
- Coolify-generated secret identifiers deliberately contain no underscores so all required MariaDB and Directus values are populated.
- Every CMS bootstrap phase paces Directus requests and retries `429`/temporary upstream responses with bounded backoff. The configured 50-request/second Redis-backed limiter remains enabled; bootstrap defaults to 20 requests/second. Interrupted imports safely resume by matching existing file titles.
- The August client media revision is guarded by settings.client_media_revision = client-review-2026-08-20-v2: its 23 committed assets are assigned once, and subsequent deploys preserve client-edited Directus media.
- `DIRECTUS_SERVER_TOKEN` may be blank for the infrastructure bootstrap, but protected application writes remain disabled until a scoped token is configured.
- `email_logs` is written through the secret-protected internal Directus endpoint, so the scoped app role does not need direct collection create/update permission. CMS staff may read the overview according to their Directus role.
- Paid booking/pass email status is also claimed and completed through the private Directus extension. After deployment, a paid row stuck at `pending` should move through `sending` to `sent` when its Stripe return page, authenticated ticket, CMS Paid hook or hourly maintenance retry runs.

## CMS operations

Use Directus for site copy, navigation, footer, fleet, routes, pricing, SEO, media, FAQs, testimonials, blog content, and operational records. Singular item pages show all safe fields; system fields are read-only and OTP/session hashes deliberately remain hidden. **Email Logs** appears after Customer Sessions and stores delivery metadata only. Do not edit MariaDB directly.

Seed and configuration scripts fill missing baseline data without replacing populated settings, dashboard panels, or transactional rows; they are not a substitute for production backups. Before changing schema, create and restore-test a backup, inspect the schema dry-run, regenerate `directus/schema-snapshot.yaml`, and apply it manually during a maintenance window.

## Remaining production acceptance

Confirm each item with the project owner; some may already have been supplied in Coolify:

- Scoped `DIRECTUS_SERVER_TOKEN` and least-privilege permissions.
- Cloudflare proxy, Full (strict), WAF rules, and the existing Managed widget's `TURNSTILE_SECRET`.
- Stripe live keys, signed webhook, and real low-value transaction test.
- End-to-end Postfix delivery for contact, quote, OTP, booking, and lost-property customer/staff emails, with Email Logs evidence and a failed-then-retried message.
- Encrypted off-site backup schedule and successful restore test.
- Lighthouse/accessibility review and key-page mobile QA.
- Required WordPress-to-Next.js 301 redirects.
- Final content, legal, fare, route, and contact-detail approval.

Detailed deployment instructions are in [DEPLOY_COOLIFY.md](DEPLOY_COOLIFY.md). Development architecture and open work are in [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md).

## 20 August 2026 audit release

The code-level production-readiness remediation is complete; the authoritative control and acceptance list is [SECURITY_AND_OPERATIONS.md](SECURITY_AND_OPERATIONS.md).

Release sequence:

1. Keep `DAILY_EXPRESS_BOOKINGS_ENABLED=false`; deploy the baked Directus extension image and let the additive bootstrap add sessions, delivery leases, `service_runs`, unique constraints, and booking inventory fields. An unauthenticated `POST /np-internal/inventory/status` must return 401 (not 404), the web availability API must report `inventoryReady: true`, and Directus startup logs must show the payment-events hook before sales are enabled.
2. Configure all six independent audit secrets, including `INTERNAL_API_SECRET` on both Directus and web, and optionally the revalidation Flow. Confirm the app token remains scoped, the internal endpoint rejects unauthorised calls, and public file metadata is restricted.
3. Enter approved route capacities, schedule `POST /api/maintenance` hourly, run `npm run check`, parse `docker-compose.coolify.yml`, and concurrency-test single/return last-seat cases before deliberately enabling bookings.
4. Configure and run encrypted off-site backup plus disposable restore, then complete live Stripe (including refund/dispute), Postfix relay!� M365 mailbox delivery, Cloudflare, legal/ICO, access-control, accessibility/mobile, SEO/redirect, and content/fare/timetable acceptance.
