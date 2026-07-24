# RULES

Operating rules for anyone (human or AI) working in this repo. Read before making changes. Pairs with [CLAUDE.md](CLAUDE.md) (build guidance) and [CHANGELOG.md](CHANGELOG.md) (append-only history).

---

## AI / assistant rules (do NOT do these)

- **Never run `npm run dev`, `npm run dev:poll`, or `npm run build`.** They start long-running servers or heavy compiles the human owns. The assistant verifies with `tsc --noEmit`, `npm run lint`, `npm run seed`, and live Directus checks (`curl`) only. The human restarts the dev server and confirms the UI.
- **Never commit real `.env`.** Only `.env.example`. The app holds scoped Directus tokens + Stripe/M365 creds — never DB creds.
- **Never add AI / "Co-Authored-By" trailers to commits.** Commit as `nityam2007`.
- **Never hardcode user-facing content.** Copy, images, fleet, routes, prices, SEO, nav, footer all come from Directus. Add a collection/field + seed, don't inline it.
- **Never add a new dependency for what a few lines do.** Reuse what's installed. Ladder: does it need to exist → already here → stdlib → native platform → installed dep → one line → minimal new code.
- **Never fix only the path a bug report names.** Grep every caller and fix at the shared root, so sibling callers aren't left broken.
- **Never connect the app to MariaDB directly.** Only Directus talks to the DB. No Prisma.

## Common errors & their fixes

### `ChunkLoadError: … SyntaxError: Invalid regular expression: missing /`
Corrupted Turbopack build cache — **not** a source bug. The bad regex is inside Next's own emitted chunk (e.g. `node_modules_next_dist_*.js`), not your code. Same `[cause]` across unrelated pages (`/` and `/account/login`) confirms it's one shared bad chunk.
**Fix:** stop dev server → `rm -rf .next` → restart. If it recurs, also `rm -rf node_modules/.cache`, or use `npm run dev:poll` (webpack instead of Turbopack) to sidestep Turbopack entirely.

### Directus health check returns `403`
`GET /server/health` is auth-gated — a 403 means Directus is **up**, not broken. To check data, hit `/items/<collection>` with `Authorization: Bearer $DIRECTUS_SERVER_TOKEN`.

### Homepage renders blank / missing sections
Data path, not code. Confirm the seed ran and the `settings` singleton carries `homepage.*`, `faqs`, `stats`, `coverage`, `school`:
`curl -s -H "Authorization: Bearer $DIRECTUS_SERVER_TOKEN" localhost:8055/items/settings` — the page destructures those keys directly. `faqs` lives inside `settings`, not as a top-level collection.

### Server vs browser Directus URL
Host dev → `localhost:8055`. Inside Docker the `web` service overrides `DIRECTUS_URL` to `http://directus:8055`. `NEXT_PUBLIC_DIRECTUS_URL` is the browser-facing one. Mixing them up causes fetch failures that look like "CMS down".

## Verify before done

`docker compose up` · `npm run seed` · `npx tsc --noEmit` · `npm run lint` — all clean. (Build/dev are the human's step.) Log the change in [CHANGELOG.md](CHANGELOG.md).
