# Security and production operations

Last reviewed: 22 August 2026.

The August production-readiness findings that can be addressed in this repository are implemented. This is not a claim that production services are configured or accepted: the checks below still require evidence from Coolify, Directus, Cloudflare, Stripe, the internal Postfix relay and Microsoft 365 mailboxes, the off-site backup destination, and the live site.

## Controls implemented

- CMS rich text is server-sanitized with an allowlist. CMS URLs use safe schemes, and embedded JSON-LD is escaped against script termination.
- Directus reads have eight-second timeouts, five-minute ISR, cache tags, explicit outage fallback, correct empty-result handling, and a protected on-demand revalidation endpoint.
- Public content collections use published/draft workflow enforcement. Anonymous access is removed from transactional, customer, OTP, session, and inventory collections; public file reads expose only display-safe fields.
- OTP values use an email-bound keyed HMAC, attempt caps, expiry, and SQL-level atomic one-time consumption. Delivery failure invalidates the code immediately.
- Customer sessions are opaque, hashed, server-validated, expiring, and revocable; logout revokes the stored session as well as clearing the cookie.
- Rate-limit identities use keyed HMACs. Production trusts Cloudflare's connecting-IP header and fails closed when configured Redis is unavailable; the bounded local limiter is development fallback only.
- Daily Express validates route direction, service day, date range, return journey, departure, cutoff, terms, CMS fare, and CMS capacity. Both journey legs are reserved under row locks in one MariaDB transaction through a private authenticated Directus endpoint; the Next.js app never connects to MariaDB.
- Booking inventory is held before Checkout, committed by the paid transition, and safely released for failed, expired, or stale pending orders. Lost responses bias toward a reconcilable capacity leak instead of a double release or oversell.
- Stripe references, Checkout sessions, and PaymentIntent relationships are unique. Paid, failed, expired, refunded, and disputed transitions are fail-closed and database-atomic. Webhook and success-page retries share lease-token notification delivery state.
- Contact and quote records are persisted before email. A bounded maintenance retry worker uses atomic delivery leases; payment and lead delivery failures remain visible in Directus.
- Ticket QR codes contain signed validation URLs, not passenger data. Verification checks the live paid booking and returns no personal data.
- Header navigation, lightboxes, route selectors, form errors, skip navigation, carousel motion, and hero video controls received keyboard, focus, reduced-motion, and Save-Data handling.
- MariaDB and Redis are on private Compose networks. Redis uses `noeviction`; unused Directus transports are disabled; the required internal extensions are baked into the pinned Directus production image and Directus fails startup if they cannot load.
- Backups include MariaDB and Directus uploads, require age encryption and an off-site rclone destination, and have a disposable restore-test script.
- The standard gate runs unit tests, migration/extension syntax checks, TypeScript, ESLint, and a production build. CI separately audits production dependencies.

## Required production acceptance

Keep `DAILY_EXPRESS_BOOKINGS_ENABLED=false` until the new extension and additive schema are deployed, route capacities are approved and entered, and concurrency/payment acceptance passes. Capacity enforcement is implemented; the flag remains a deliberate launch switch.

Before enabling Daily Express payments or signing off the release, an operator must:

1. Generate independent `OTP_PEPPER`, `RATE_LIMIT_PEPPER`, `REVALIDATION_SECRET`, `MAINTENANCE_SECRET`, `TICKET_SIGNING_SECRET`, and `INTERNAL_API_SECRET` values in Coolify. Keep the scoped Directus, Stripe, Turnstile, and SMTP credentials server-only.
2. Confirm the scoped `DIRECTUS_SERVER_TOKEN` can access only the required protected collections and fields. Confirm an unauthenticated `POST /np-internal/inventory/status` returns 401 rather than 404, incorrect secrets are rejected, the web availability API reports `inventoryReady: true`, and Directus starts with `EXTENSIONS_MUST_LOAD=true`.
3. Run the additive CMS bootstrap, verify `service_runs` and new session/delivery/inventory fields exist, enter approved non-zero route capacities, and concurrency-test the last-seat case for single and return journeys before changing the booking flag.
4. Schedule an hourly authenticated `POST /api/maintenance` job and alert on non-2xx results. Configure a Directus Flow to call `/api/revalidate` after relevant content writes, or accept the five-minute ISR window.
5. Verify Cloudflare Full (strict), proxy/WAF rules, Turnstile, origin restrictions, and that untrusted clients cannot reach the origin directly.
6. Run real low-value Stripe completed, delayed-success, failed, expired, duplicate, out-of-order, fully-discounted, refund, and dispute scenarios. Reconcile booking/pass, inventory, email, and Stripe states after each case.
7. Complete internal Postfix relay!� Microsoft 365 mailbox delivery tests for contact, quote, OTP, booking, and lost-property customer/staff messages, including a forced failure followed by maintenance retry.
8. Schedule `scripts/backup-db.sh`, confirm encrypted off-site copies, then run `scripts/restore-test.sh` against the newest database and upload archives. Record observed recovery point and recovery time.
9. Have the business/legal owner approve privacy, cookies, terms, cancellation/refund, retention, controller, and company wording and verify ICO obligations.
10. Run authenticated Directus permission tests, key-page mobile/keyboard/screen-reader QA, Lighthouse checks, redirects, sitemap/indexing, security headers, and live content/fare/timetable sign-off.

## Restore test

```sh
./scripts/restore-test.sh backups/npcoaches-db-YYYYMMDD-HHMMSS.sql.gz.age \
  backups/npcoaches-uploads-YYYYMMDD-HHMMSS.tar.gz.age
```

The test decrypts into a temporary directory, validates both archives, restores SQL into a disposable MariaDB container, checks that tables exist, and removes the container and plaintext files on exit. It never writes to production data.
