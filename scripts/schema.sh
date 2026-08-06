#!/usr/bin/env sh
# Directus schema snapshot/apply — the exact-schema half of the local → prod migration.
# (Content/prefill is `npm run bootstrap`; this captures every field/interface tweak
# made by hand in the admin, beyond what the seed scripts define.)
#
#   scripts/schema.sh snapshot   # local Directus → directus/schema-snapshot.yaml (commit it)
#   scripts/schema.sh apply      # directus/schema-snapshot.yaml → the Directus in compose
#
# Runs against the `directus` service of the current docker compose project. On the
# production VPS run it next to docker-compose.prod.yml, e.g.:
#   COMPOSE_FILE=docker-compose.prod.yml scripts/schema.sh apply
set -e

CMD="${1:-snapshot}"
FILE="directus/schema-snapshot.yaml"

case "$CMD" in
  snapshot)
    docker compose exec -T directus npx directus schema snapshot --yes /tmp/schema.yaml >/dev/null
    docker compose exec -T directus cat /tmp/schema.yaml > "$FILE"
    echo "✓ schema snapshot written to $FILE ($(wc -l < "$FILE") lines) — commit it"
    ;;
  apply)
    [ -f "$FILE" ] || { echo "✗ $FILE not found — run 'scripts/schema.sh snapshot' first"; exit 1; }
    docker compose exec -T directus sh -c 'cat > /tmp/schema.yaml' < "$FILE"
    echo "Schema dry-run (review destructive collection/field changes before continuing):"
    docker compose exec -T directus npx directus schema apply --dry-run /tmp/schema.yaml
    [ "${CONFIRM_SCHEMA_APPLY:-}" = "I_HAVE_A_VERIFIED_BACKUP" ] || {
      echo "✗ Refusing schema apply without a verified backup."
      echo "  Review the dry-run above, verify a backup, then re-run with:"
      echo "  CONFIRM_SCHEMA_APPLY=I_HAVE_A_VERIFIED_BACKUP scripts/schema.sh apply"
      exit 1
    }
    echo "Applying confirmed schema snapshot..."
    docker compose exec -T directus npx directus schema apply --yes /tmp/schema.yaml
    echo "✓ schema applied from $FILE"
    ;;
  *)
    echo "usage: scripts/schema.sh [snapshot|apply]"
    exit 1
    ;;
esac
