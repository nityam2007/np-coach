# NP Coaches — Coolify Production Runbook

This is the active production path on the Hostinger VPS. The full stack completed its first successful deployment on 6 August 2026. Coolify owns the reverse proxy and TLS; do not deploy the repository's separate Traefik service at the same time. Operational ownership, rollback, and acceptance are documented in [HANDOVER.md](HANDOVER.md).

## What the stack deploys

| Service | Public? | Persistence | Purpose |
| --- | --- | --- | --- |
| `web` | Yes, port 3000 through a Coolify domain | Container image | Next.js standalone app |
| `directus` | Yes, port 8055 through a separate Coolify domain | `directus_uploads`, `directus_extensions` | CMS, API, admin |
| `database` | No | `mariadb_data` | MariaDB, used only by Directus |
| `redis` | No | `redis_data` | Password-protected Directus cache/rate-limit store |
| `schema-migrate` | No; one-shot | Container image | Bootstraps/upgrades Directus system tables without reconciling app schema |
| `cms-bootstrap` | No; one-shot | Writes through Directus | Idempotently seeds content, admin configuration, and media |

No host ports are published. Coolify creates the isolated stack network, and containers use the service names `database`, `redis`, and `directus` internally.
Postfix is an existing internal relay, not a service created by this Compose file. The `web` container must share a Docker network with it and `SMTP_HOST` must be a hostname that resolves on that network. Do not publish the SMTP port to the internet.


## Repository-backed bootstrap

The first deployment does not need a database dump:

- `directus/schema-snapshot.yaml` is retained for reviewed, manual, backup-first schema migrations only.
- `src/lib/site-content.json` is the content seed and application fallback.
- `directus/seed-media/` contains the committed starter media archive.
- `scripts/seed-directus.mjs`, `configure-directus.mjs`, and `upload-media.mjs` are idempotent.

`schema-migrate` runs only `node /directus/cli.js bootstrap`, which installs/upgrades Directus's system tables through the CLI bundled in the pinned image. It deliberately does **not** run `schema apply` during a Git deployment. `cms-bootstrap` then creates missing app collections/fields, repairs missing single-file relations to `directus_files`, applies admin metadata, and fills first-run content/media before the web container starts.

On an existing instance, settings and dashboard panels remain client-owned. The seed only adds missing nested keys and never writes transactional rows. It records counts for `customers`, `bookings`, `pass_purchases`, `contact_submissions`, and `quote_requests` before and after bootstrap and fails the release if any count decreases. Exact snapshot apply is available only through `scripts/schema.sh apply`, which always shows a dry-run and refuses the apply without `CONFIRM_SCHEMA_APPLY=I_HAVE_A_VERIFIED_BACKUP`.

Directus's Redis-backed API limiter remains enabled at an explicit 50 requests per IP per one-second window. The bootstrap deliberately stays below that burst ceiling (20 requests/second by default). A bootstrap `429` therefore means the one-shot deployment worker sent admin requests too quickly; it is not evidence that normal website traffic exhausted hourly capacity. Even 1,000 page views/hour averages only 0.28 views/second, while Next.js ISR and Cloudflare prevent every visitor from becoming an equivalent burst of Directus API calls.

Do not commit a live SQL dump. It can contain customers, bookings, password hashes, tokens, and other personal data. Production data belongs in encrypted off-site backups, not Git.

## 1. Create the Coolify resource

1. In Coolify, open the production project and choose **New resource → Public Repository** (or GitHub App/Deploy Key if the repository becomes private).
2. Paste the repository URL: [`https://github.com/nityam2007/np-coach`](https://github.com/nityam2007/np-coach).
3. Select the `main` branch and change the build pack from Nixpacks to **Docker Compose**.
4. Set **Base Directory** to `/`.
5. Set **Docker Compose Location** to `/docker-compose.coolify.yml` (the extension must match exactly).
6. Keep **Raw Compose Deployment** off. Keep **Connect to Predefined Network** off only when Postfix is already attached to this stack's network; if Postfix is a separate Coolify resource, enable it and use that resource's full generated service name (for example `postfix-<uuid>`) as `SMTP_HOST`. A bare `postfix` value is valid only when that DNS name/alias exists on the shared network.

The `coolify.zindad.frontend` label from the generic example is not a Coolify requirement. Standard Compose deployments are parsed by Coolify, which attaches its proxy automatically when a domain is assigned.

## 2. Configure environment variables

Open **Environment Variables → Developer view** and paste `.env.coolify.example`. Fill the required values before deploying:

```env
NEXT_PUBLIC_SITE_URL=https://np-coaches.co.uk
NEXT_PUBLIC_DIRECTUS_URL=https://cms.np-coaches.co.uk
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-3GXSRDBP55
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=PEWp9KTyvJeyPa_1TpAQO3fdLzljRv8RnNggD-h8gsg
DIRECTUS_ADMIN_EMAIL=admin@np-coaches.co.uk
DIRECTUS_ADMIN_PASSWORD=<long unique password>
```

Coolify creates and retains every `SERVICE_*` password/secret referenced by the Compose file. The identifier suffixes deliberately contain no underscores (`DBUSER`, `DBROOT`, `REDISPASS`, `DIRECTUSKEY`, `DIRECTUSSECRET`, `DIRECTUSADMIN`, `WEBAUTH`) for compatibility with Coolify releases that fail to generate compound identifiers. Do not rename or replace these generated values between deployments; they protect MariaDB, Redis, Directus sessions, the bootstrap admin token, and the Next.js session cookie.

Keep only the `NEXT_PUBLIC_*` values enabled as **Build Variables**. The admin password, Directus token, Stripe secrets, and Turnstile secret should be **Runtime only**. The internal Postfix setup has SMTP authentication disabled, so `SMTP_USER` and `SMTP_PASS` stay empty. If a secret contains `$`, enable Coolify's **Literal** option.

`NEXT_PUBLIC_*` values are intentionally built into the browser bundle and are not secrets.
The Analytics ID is loaded only after explicit consent. Keep the Search Console token present through the apex-domain cutover unless ownership is independently verified by DNS.

## 3. Assign domains

After Coolify parses the services, assign only these domains:

- `web`: `https://np-coaches.co.uk:3000`
- `directus`: `https://cms.np-coaches.co.uk:8055`

The port suffix tells Coolify which container port to proxy; visitors still use normal HTTPS port 443. Do not assign domains to `database`, `redis`, `schema-migrate`, or `cms-bootstrap`, and do not add `ports:` mappings.

If `www.np-coaches.co.uk` is required, add `https://www.np-coaches.co.uk:3000` to `web` and configure a permanent redirect to the canonical apex domain in Coolify or Cloudflare.

## 4. Cloudflare

1. Create proxied DNS records for the apex/`www` site and `cms` host pointing to the VPS. If certificate issuance has trouble, set them to DNS-only until Coolify reports valid TLS, then enable the proxy.
2. Set SSL/TLS mode to **Full (strict)** and enable Always Use HTTPS.
3. Keep the existing Cloudflare Turnstile **MAIN** widget in Managed mode. Its public site key is already recorded in `.env.coolify.example`; store only its private value as the runtime-only `TURNSTILE_SECRET` in Coolify. The legacy `TURNSTILE_SECRET_KEY` name is also accepted for compatibility.
4. Keep `/admin*`, `/auth*`, and API responses on the CMS hostname out of custom cache rules. A cache rule for public `cms.np-coaches.co.uk/assets/*` is safe when it respects Directus' cache headers.
5. Apply Cloudflare WAF/rate limiting to public form and API routes without blocking Stripe's webhook.

Coolify terminates TLS at the origin, so the old `traefik/certs` Cloudflare Origin-certificate workflow is not used by this stack.

## 5. First deployment and checks

Deploy the resource and inspect the service logs. A healthy first run has this order:

1. `database` and `redis` become healthy.
2. `schema-migrate` completes the non-destructive Directus system bootstrap and exits with code 0.
3. `directus` becomes healthy at `/server/ping`.
4. `cms-bootstrap` reports `Done` for seed, configuration, and media, then exits with code 0. Seed, admin configuration, and media import all pace requests and automatically retry Directus `429` plus temporary `408/425/502/503/504` responses. Retry log lines are expected during a transient burst; the service fails only after the bounded retry budget is exhausted.
5. `web` becomes healthy and Coolify routes traffic to it.

Verify:

- `https://np-coaches.co.uk` loads with CMS images.
- `https://cms.np-coaches.co.uk/admin` accepts the configured admin credentials.
- The admin title changes from `Loading…` to the Directus sign-in screen and the console has no `init_runtime_dom_esm_bundler` error; all Directus/Schema images must remain pinned to 12.3.0.
- Coolify shows `database` and `redis` without domains or published ports.
- `schema-migrate` and `cms-bootstrap` are exited-success one-shot containers, not crash loops.
- Before analytics consent, no request is made to `googletagmanager.com` or `google-analytics.com`; after accepting, GA4 receives a path-only `page_view` and `_ga` cookies appear.
- `/robots.txt` advertises `https://np-coaches.co.uk/sitemap.xml`; the sitemap and every canonical use the apex domain, and page source contains the Google verification meta tag.

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

- Stripe: set the appropriate test/live keys and create one endpoint for `checkout.session.completed`. During acceptance use `https://demo.np-coaches.co.uk/api/stripe/webhook`; change it to `https://np-coaches.co.uk/api/stripe/webhook` at the production-domain cutover. Save the endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`.
- Turnstile: keep the existing MAIN widget in Managed mode, set `TURNSTILE_SECRET` as Runtime only, and verify contact, quote, booking, lost-property, and OTP submissions. Production fails closed if the secret is absent or Siteverify rejects the token.
- SMTP: configure the internal relay exactly once in Coolify:

  ```env
  SMTP_HOST=postfix
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_AUTH=false
  SMTP_TLS=false
  SMTP_REQUIRE_TLS=false
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM=noreply@np-coaches.co.uk
  SMTP_FROM_NAME=NP Coaches
  CONTACT_TO=info@np-coaches.co.uk
  QUOTE_TO=bookings@np-coaches.co.uk
  LOST_PROPERTY_TO=info@np-coaches.co.uk
  ```

  If Postfix is a separate Coolify resource, replace `postfix` with its generated same-network hostname. From the running `web` container, verify DNS and TCP port 587 before testing the application. Postfix must trust only the relevant private Docker subnet/container; never create an unauthenticated public relay.
  “Staff” here means the internal recipient mailbox, not a Directus login. Contact and lost-property notifications use `CONTACT_TO`/`LOST_PROPERTY_TO` (`info@np-coaches.co.uk`); quote notifications use `QUOTE_TO` (`bookings@np-coaches.co.uk`). These mailboxes consume no Directus Studio users.

- Submit one real contact and quote form. Confirm each Directus record, staff notification, and customer acknowledgement.
- Request an OTP to a controlled mailbox. A failed SMTP delivery must show the customer an error instead of claiming a code was sent.
- Complete one booking and one lost-property payment. Confirm the signed webhook changes each row to `paid`, booking confirmation is sent once, and both lost-property customer/staff emails are sent once. In Directus, the corresponding email status fields must be `sent`.

## 8. Backups and updates

Coolify's own backup covers Coolify configuration, not application volumes. Before launch, schedule encrypted off-site backups for:

- MariaDB logical dumps from `mariadb_data` (daily, retained and restore-tested).
- The `directus_uploads` volume.
- Coolify's own configuration/SSH keys.

Never delete or rename the named volumes during a redeploy. Test a restore before accepting live bookings.

Images are deliberately pinned in `docker-compose.coolify.yml`. Upgrade MariaDB, Directus, Redis, or Node in a separate change after a backup and staging test. When Directus changes, regenerate and commit a compatible schema snapshot.

## 9. Automatic deployment from GitHub

Production follows the `main` branch of [nityam2007/np-coach](https://github.com/nityam2007/np-coach). Use Coolify's native GitHub webhook; no repository workflow or extra container registry is required.

One-time connection:

1. In the Coolify resource, open **Advanced** and enable **Auto Deploy**.
2. Open the resource's **Webhooks** page, set a long random **GitHub webhook secret**, and copy Coolify's GitHub webhook URL.
3. In GitHub, open **Settings → Webhooks → Add webhook** for the repository.
4. Paste Coolify's URL as the payload URL, paste the same secret, keep SSL verification enabled, select **Just the push event**, and activate it.
5. Send GitHub's test delivery and confirm Coolify accepts it. Then push a harmless commit to `main` and confirm a deployment is queued.

Routine release:

1. Run the repository checks and review the change.
2. Push the approved commit to `main`; the webhook should queue Coolify automatically.
3. Confirm both long-running and one-shot service states.
4. Run the smoke checks in this runbook and [HANDOVER.md](HANDOVER.md).

Before enabling Auto Deploy, save every required Coolify environment variable—especially `TURNSTILE_SECRET`—so the first automated release cannot activate incomplete production configuration. Never commit the GitHub webhook secret or Coolify URL.

If webhook delivery fails, use Coolify's manual Deploy button while inspecting GitHub's recent webhook deliveries. For an application-only rollback, redeploy the last known-good commit without deleting volumes. Review schema compatibility before rolling back a release that changed Directus collections or fields.

Do not rotate generated `SERVICE_*` values as part of a routine application release.

## Useful official references

- Coolify Docker Compose: https://coolify.io/docs/knowledge-base/docker/compose
- Coolify Compose build pack: https://coolify.io/docs/applications/build-packs/docker-compose
- Coolify environment variables: https://coolify.io/docs/knowledge-base/environment-variables
- Coolify GitHub auto-deploy: https://coolify.io/docs/applications/ci-cd/github/auto-deploy
- Directus deployment: https://directus.com/docs/self-hosting/deploying
- Directus security/limits: https://directus.com/docs/configuration/security-limits
