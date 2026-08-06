# NP Coaches — Standalone Traefik Deployment Alternative

> Production currently runs through Coolify. Use [DEPLOY_COOLIFY.md](DEPLOY_COOLIFY.md) and `docker-compose.coolify.yml` for normal releases. This file is retained only as the standalone Traefik alternative and must not be deployed alongside Coolify's proxy.

Production runbook for the Hostinger **VPS KVM2 (2 vCPU / 8 GB)**, Docker + Traefik, behind **Cloudflare** (DNS · Proxy/CDN · SSL Full-strict · WAF · Turnstile). The app never touches MariaDB — only Directus does.

```
Cloudflare (DNS·Proxy·SSL·WAF·Turnstile) ─Origin cert─► VPS · Traefik
   ├─ np-coaches.co.uk      → Next.js app (web)
   └─ cms.np-coaches.co.uk  → Directus (admin/API) ─► MariaDB (internal only)
```

Files: [Dockerfile](Dockerfile) · [docker-compose.prod.yml](docker-compose.prod.yml) · [traefik/dynamic/tls.yml](traefik/dynamic/tls.yml) · [scripts/backup-db.sh](scripts/backup-db.sh) · env template in [.env.example](.env.example) (the prod-deploy block).

---

## 1. VPS hardening (one-time)

```bash
# Firewall: only SSH + HTTP/HTTPS
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
# fail2ban + unattended security upgrades
apt-get update && apt-get install -y fail2ban unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
# Docker + compose plugin (per Docker's official install), then deploy as a non-root user.
```
Harden SSH (key-only, no root login) and keep Docker patched.

## 2. Cloudflare

1. DNS: **A** records for `np-coaches.co.uk` and `cms.np-coaches.co.uk` → VPS IP, **Proxied** (orange cloud).
2. SSL/TLS mode: **Full (strict)**.
3. SSL/TLS → Origin Server → **Create Certificate** → save the cert as `traefik/certs/origin.pem` and key as `traefik/certs/origin-key.pem` on the VPS (gitignored).
4. Turnstile: use the existing MAIN Managed widget; keep its public key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and its server-only secret in `TURNSTILE_SECRET`.
5. WAF: enable the managed ruleset; optionally rate-limit `/api/*`.

## 3. Configure + first deploy

```bash
git clone https://github.com/nityam2007/np-coach.git /opt/np-coaches && cd /opt/np-coaches
cp .env.example .env.prod   # fill in: hosts, DB creds, DIRECTUS_KEY/SECRET (openssl rand -hex 32),
                            # Stripe live keys + webhook secret, Turnstile keys, NEXT_PUBLIC_* https URLs
# place Cloudflare origin cert/key in traefik/certs/

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
# Bootstrap Directus (point the scripts at the live Directus URL):
DIRECTUS_URL=https://cms.np-coaches.co.uk npm run seed
DIRECTUS_URL=https://cms.np-coaches.co.uk npm run media
DIRECTUS_URL=https://cms.np-coaches.co.uk npm run configure
```
Change the Directus admin password immediately after first login.

## 4. Stripe (go-live)

- Use **live** keys in `.env.prod`.
- Add a webhook endpoint in the Stripe dashboard → `https://np-coaches.co.uk/api/stripe/webhook`, event `checkout.session.completed`; copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
- The webhook is signature-verified + idempotent (`stripe_session_id` unique). Test with Stripe CLI before launch.

## 5. Backups (cron)

```bash
crontab -e
30 3 * * * cd /opt/np-coaches && ./scripts/backup-db.sh >> /var/log/np-backup.log 2>&1
```
Set `RCLONE_REMOTE` (e.g. an R2/S3 rclone remote) in `.env.prod` to also push dumps offsite. Keeps 14 days locally by default. Restore: `gunzip -c backups/<file>.sql.gz | docker compose -f docker-compose.prod.yml exec -T db mariadb -uroot -p"$DB_ROOT_PASSWORD" $DB_DATABASE`.

## 6. Post-deploy checks

- `https://np-coaches.co.uk` loads; security headers present (CSP/HSTS) — `curl -sI https://np-coaches.co.uk`.
- Cookie-consent banner appears on first visit (and not after a choice).
- A test Daily Express booking + Lost Property pass complete via Stripe → webhook flips the row to `paid`.
- Contact + Get-a-Quote submit and appear in Directus.
- Lighthouse pass (perf/SEO/a11y); confirm images load from Directus and ISR works.

## Still TODO (cross-cutting, not blocking deploy)

- **M365 SMTP email** for forms/bookings/pass confirmations — deferred (Basic auth deprecating; wire OAuth2/Graph). Stripe sends its own receipt meanwhile.
- 301 `redirects` for any old WordPress URLs that changed.
- Pin Directus + Traefik to exact patch versions before using this standalone stack.
