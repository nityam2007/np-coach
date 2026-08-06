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

Persistent data is stored in the named volumes `mariadb_data`, `redis_data`, `directus_uploads`, and `directus_extensions`. Never delete or rename these volumes during a normal deployment.

## Source of truth

- Git contains application code, the Directus schema snapshot, safe seed content, and starter media.
- Directus is the production source of truth for edited content and transactional records.
- MariaDB is accessed only by Directus; the Next.js app never receives database credentials.
- Production secrets live only in Coolify environment variables.
- Live SQL dumps and production uploads must never be committed to Git.

The schema and bootstrap services are idempotent. Redeployments reuse existing records and files and do not intentionally overwrite editor-managed values.

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

Only `NEXT_PUBLIC_*` variables should be enabled as build variables. Treat every other credential as runtime-only and secret.

## Post-deploy smoke checks

- Website loads over HTTPS with CMS images.
- CMS admin loads and accepts the intended human administrator account.
- Browser console has no blocking application or asset errors.
- Contact and quote forms pass Turnstile, create Directus records, notify staff, and acknowledge the customer.
- Customer OTP/account flow delivers the code; a forced SMTP failure shows an error instead of false success.
- A Stripe test/live booking and lost-property payment reaches `paid` through the signed webhook.
- The booking email is sent once; lost property sends customer and staff messages once; Directus email status fields show `sent`.
- Cookie consent, security headers, sitemap, robots.txt, and llms.txt respond correctly.
- MariaDB and Redis have no public Coolify domain or published host port.

## Backups and recovery

Before accepting live customer transactions, schedule encrypted off-site backups for:

- Daily MariaDB logical dumps with retention.
- The `directus_uploads` volume.
- Coolify configuration and SSH recovery material.

Restore-test both the database and uploads. A backup that has not been restored in a test is not considered verified.

For an application rollback, select the last known-good Git commit in Coolify and redeploy it without deleting volumes. If the release changed the Directus schema, review backward compatibility before rolling application code back.

## Known first-deployment protections

- The schema snapshot is packaged inside `Dockerfile.schema`; it is not a deployment-host bind mount.
- Coolify-generated secret identifiers deliberately contain no underscores so all required MariaDB and Directus values are populated.
- Every CMS bootstrap phase paces Directus requests and retries `429`/temporary upstream responses with bounded backoff. The configured 50-request/second Redis-backed limiter remains enabled; bootstrap defaults to 20 requests/second. Interrupted imports safely resume by matching existing file titles.
- `DIRECTUS_SERVER_TOKEN` may be blank for the infrastructure bootstrap, but protected application writes remain disabled until a scoped token is configured.

## CMS operations

Use Directus for site copy, navigation, footer, fleet, routes, pricing, SEO, media, FAQs, testimonials, blog content, and operational records. Do not edit MariaDB directly.

Seed and configuration scripts fill missing baseline data; they are not a substitute for production backups. Before changing schema, create a backup, test the migration, regenerate `directus/schema-snapshot.yaml`, and deploy the matching Directus version.

## Remaining production acceptance

Confirm each item with the project owner; some may already have been supplied in Coolify:

- Scoped `DIRECTUS_SERVER_TOKEN` and least-privilege permissions.
- Cloudflare proxy, Full (strict), WAF rules, and the existing Managed widget's `TURNSTILE_SECRET`.
- Stripe live keys, signed webhook, and real low-value transaction test.
- End-to-end Postfix delivery for contact, quote, OTP, booking, and lost-property customer/staff emails.
- Encrypted off-site backup schedule and successful restore test.
- Lighthouse/accessibility review and key-page mobile QA.
- Required WordPress-to-Next.js 301 redirects.
- Final content, legal, fare, route, and contact-detail approval.

Detailed deployment instructions are in [DEPLOY_COOLIFY.md](DEPLOY_COOLIFY.md). Development architecture and open work are in [AIDATA/CONTINUE.md](AIDATA/CONTINUE.md).
