#!/usr/bin/env bash
# MariaDB backup for the NP Coaches VPS. Dumps the Directus database from the running
# `db` container, gzips it with a timestamp, prunes old local copies, and (optionally)
# pushes offsite. Run from the deploy directory (where docker-compose.prod.yml lives).
#
# Cron (daily 03:30, keep 14 days locally):
#   30 3 * * * cd /opt/np-coaches && ./scripts/backup-db.sh >> /var/log/np-backup.log 2>&1
#
# Env (from .env.prod): DB_DATABASE, DB_ROOT_PASSWORD. Offsite: set RCLONE_REMOTE to an
# rclone remote (e.g. "r2:np-coaches-backups") to also copy the dump there.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.prod.yml}"

# Load deploy env if present (DB creds live here).
[ -f .env.prod ] && set -a && . ./.env.prod && set +a

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/npcoaches-$STAMP.sql.gz"

echo "[$(date -Is)] dumping ${DB_DATABASE:-npcoaches} → $OUT"
$COMPOSE exec -T db sh -c \
  "exec mariadb-dump --single-transaction --quick --routines --triggers -uroot -p\"\$MARIADB_ROOT_PASSWORD\" \"${DB_DATABASE:-npcoaches}\"" \
  | gzip > "$OUT"

# Prune old local dumps.
find "$BACKUP_DIR" -name 'npcoaches-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

# Optional offsite copy (requires rclone configured).
if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[$(date -Is)] copying offsite → $RCLONE_REMOTE"
  rclone copy "$OUT" "$RCLONE_REMOTE"
fi

echo "[$(date -Is)] backup complete: $OUT"
