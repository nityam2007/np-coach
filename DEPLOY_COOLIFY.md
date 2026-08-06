# NP Coaches — Coolify Production Runbook

This is the active production path on the Hostinger VPS. The full stack completed its first successful deployment on 6 August 2026. Coolify owns the reverse proxy and TLS; do not deploy the repository's separate Traefik service at the same time. Operational ownership, rollback, and acceptance are documented in [HANDOVER.md](HANDOVER.md).

## What the stack deploys

| Service | Public? | Persistence | Purpose |
| --- | --- | --- | --- |
| `web` | Yes, port 3000 through a Coolify domain | Container image | Next.js standalone app |
| `directus` | Yes, port 8055 through a separate Coolify domain | `directus_uploads`, `directus_extensions` | CMS, API, admin |
| `database` | No | `mariadb_data` | MariaDB, used only by Directus |
| `redis` | No | `redis_data` | Password-protected Directus cache/rate-limit store |
| `schema-migrate` | No; one-shot | Snapshot packaged in its image | Applies the committed Directus schema snapshot |
| `cms-bootstrap` | No; one-shot | Writes through Directus | Idempotently seeds content, admin configuration, and media |

No host ports are published. Coolify creates the isolated stack network, and containers use the service names `database`, `redis`, and `directus` internally.

## Repository-backed bootstrap

The first deployment does not need a database dump:

- `directus/schema-snapshot.yaml` is the exact CMS schema.
- `src/lib/site-content.json` is the content seed and application fallback.
- `directus/seed-media/` contains the committed starter media archive.
- `scripts/seed-directus.mjs`, `configure-directus.mjs`, and `upload-media.mjs` are idempotent.

`schema-migrate` applies the schema before Directus starts. Its tiny image packages the snapshot directly, avoiding deployment-host bind mounts. `cms-bootstrap` then fills only missing content/media and exits successfully before the web container starts. Redeploying is safe and does not overwrite editor-managed values covered by the existing seed safeguards.

Do not commit a live SQL dump. It can contain customers, bookings, password hashes, tokens, and other personal data. Production data belongs in encrypted off-site backups, not Git.

## 1. Create the Coolify resource

1. In Coolify, open the production project and choose **New resource → Public Repository** (or GitHub App/Deploy Key if the repository becomes private).
2. Paste the repository URL: [`https://github.com/nityam2007/np-coach`](https://github.com/nityam2007/np-coach).
3. Select the `main` branch and change the build pack from Nixpacks to **Docker Compose**.
4. Set **Base Directory** to `/`.
5. Set **Docker Compose Location** to `/docker-compose.coolify.yml` (the extension must match exactly).
6. Keep **Raw Compose Deployment** off and **Connect to Predefined Network** off.

The `coolify.zindad.frontend` label from the generic example is not a Coolify requirement. Standard Compose deployments are parsed by Coolify, which attaches its proxy automatically when a domain is assigned.

## 2. Configure environment variables

Open **Environment Variables → Developer view** and paste `.env.coolify.example`. Fill the required values before deploying:

```env
NEXT_PUBLIC_SITE_URL=https://np-coaches.co.uk
NEXT_PUBLIC_DIRECTUS_URL=https://cms.np-coaches.co.uk
DIRECTUS_ADMIN_EMAIL=admin@np-coaches.co.uk
DIRECTUS_ADMIN_PASSWORD=<long unique password>
```

Coolify creates and retains every `SERVICE_*` password/secret referenced by the Compose file. The identifier suffixes deliberately contain no underscores (`DBUSER`, `DBROOT`, `REDISPASS`, `DIRECTUSKEY`, `DIRECTUSSECRET`, `DIRECTUSADMIN`, `WEBAUTH`) for compatibility with Coolify releases that fail to generate compound identifiers. Do not rename or replace these generated values between deployments; they protect MariaDB, Redis, Directus sessions, the bootstrap admin token, and the Next.js session cookie.

Keep only the `NEXT_PUBLIC_*` values enabled as **Build Variables**. The admin password, Directus token, Stripe secrets, Turnstile secret, and SMTP password should be **Runtime only**. If a secret contains `$`, enable Coolify's **Literal** option.

`NEXT_PUBLIC_*` values are intentionally built into the browser bundle and are not secrets.

## 3. Assign domains

After Coolify parses the services, assign only these domains:

- `web`: `https://np-coaches.co.uk:3000`
- `directus`: `https://cms.np-coaches.co.uk:8055`

The port suffix tells Coolify which container port to proxy; visitors still use normal HTTPS port 443. Do not assign domains to `database`, `redis`, `schema-migrate`, or `cms-bootstrap`, and do not add `ports:` mappings.

If `www.np-coaches.co.uk` is required, add `https://www.np-coaches.co.uk:3000` to `web` and configure a permanent redirect to the canonical apex domain in Coolify or Cloudflare.

## 4. Cloudflare

1. Create proxied DNS records for the apex/`www` site and `cms` host pointing to the VPS. If certificate issuance has trouble, set them to DNS-only until Coolify reports valid TLS, then enable the proxy.
2. Set SSL/TLS mode to **Full (strict)** and enable Always Use HTTPS.
3. Create the Turnstile widget and add both keys to Coolify.
4. Keep `/admin*`, `/auth*`, and API responses on the CMS hostname out of custom cache rules. A cache rule for public `cms.np-coaches.co.uk/assets/*` is safe when it respects Directus' cache headers.
5. Apply Cloudflare WAF/rate limiting to public form and API routes without blocking Stripe's webhook.

Coolify terminates TLS at the origin, so the old `traefik/certs` Cloudflare Origin-certificate workflow is not used by this stack.

## 5. First deployment and checks

Deploy the resource and inspect the service logs. A healthy first run has this order:

1. `database` and `redis` become healthy.
2. `schema-migrate` exits with code 0.
3. `directus` becomes healthy at `/server/ping`.
4. `cms-bootstrap` reports `Done` for seed, configuration, and media, then exits with code 0. The media importer is idempotent and automatically paces/retries Directus `429` responses, so a redeploy safely resumes any interrupted first import.
5. `web` becomes healthy and Coolify routes traffic to it.

Verify:

- `https://np-coaches.co.uk` loads with CMS images.
- `https://cms.np-coaches.co.uk/admin` accepts the configured admin credentials.
- Coolify shows `database` and `redis` without domains or published ports.
- `schema-migrate` and `cms-bootstrap` are exited-success one-shot containers, not crash loops.

The bootstrap scripts authenticate with the generated `ADMIN_TOKEN`, so changing the human admin password later does not break redeployments. Do not rotate that admin API token in Directus without also updating the corresponding Coolify-generated value.

## 6. Create the scoped application token

Before enabling forms, customer accounts, booking, or Stripe:

1. In Directus, create a dedicated API-only role/user with no Data Studio access.
2. Grant only these collection permissions:
   - `contact_submissions`, `quote_requests`: create.
   - `bookings`, `pass_purchases`: read, create, update.
   - `customers`: read, create, update.
   - `otp_codes`: read, create, update, delete.
3. Generate a static token for that user.
4. Save it as `DIRECTUS_SERVER_TOKEN` in Coolify, mark it Runtime only, and redeploy.

Never put the generated bootstrap admin token in `DIRECTUS_SERVER_TOKEN`; the web app must not run with Directus administrator access.

## 7. Stripe, email, and launch

- Stripe: set the live keys, then create `https://np-coaches.co.uk/api/stripe/webhook` for `checkout.session.completed` and save its signing secret.
- Turnstile: both public and secret keys must be set before public forms go live.
- SMTP: add the Microsoft 365/Outlook credentials and submit real contact, quote, OTP, and lost-property tests.
- Smoke-test a booking and lost-property payment; confirm the signed webhook changes the Directus record from `pending` to `paid` exactly once.

## 8. Backups and updates

Coolify's own backup covers Coolify configuration, not application volumes. Before launch, schedule encrypted off-site backups for:

- MariaDB logical dumps from `mariadb_data` (daily, retained and restore-tested).
- The `directus_uploads` volume.
- Coolify's own configuration/SSH keys.

Never delete or rename the named volumes during a redeploy. Test a restore before accepting live bookings.

Images are deliberately pinned in `docker-compose.coolify.yml`. Upgrade MariaDB, Directus, Redis, or Node in a separate change after a backup and staging test. When Directus changes, regenerate and commit a compatible schema snapshot.

## 9. Routine releases

Production follows the `main` branch of [nityam2007/np-coach](https://github.com/nityam2007/np-coach).

1. Run the repository checks and review the change.
2. Push the approved commit to `main`.
3. Deploy that commit in Coolify.
4. Confirm both long-running and one-shot service states.
5. Run the smoke checks in this runbook and [HANDOVER.md](HANDOVER.md).

For an application-only rollback, redeploy the last known-good commit without deleting volumes. Review schema compatibility before rolling back any release that changed Directus collections or fields.

Do not rotate generated `SERVICE_*` values as part of a routine application release.

## Useful official references

- Coolify Docker Compose: https://coolify.io/docs/knowledge-base/docker/compose
- Coolify Compose build pack: https://coolify.io/docs/applications/build-packs/docker-compose
- Coolify environment variables: https://coolify.io/docs/knowledge-base/environment-variables
- Directus deployment: https://directus.com/docs/self-hosting/deploying
- Directus security/limits: https://directus.com/docs/configuration/security-limits
