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
COMPOSE="${COMPOSE:-docker compose -f docker-compose.coolify.yml}"

# Load deploy env if present (DB creds live here).
[ -f .env.prod ] && set -a && . ./.env.prod && set +a

command -v age >/dev/null || { echo "age is required" >&2; exit 1; }
command -v rclone >/dev/null || { echo "rclone is required" >&2; exit 1; }
: "${BACKUP_AGE_RECIPIENT:?set an age recipient for encrypted backups}"
: "${RCLONE_REMOTE:?set an encrypted off-site backup destination}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
SQL="$BACKUP_DIR/npcoaches-db-$STAMP.sql.gz"
UPLOADS="$BACKUP_DIR/npcoaches-uploads-$STAMP.tar.gz"
echo "[$(date -Is)] dumping MariaDB"
$COMPOSE exec -T database sh -c \
  "exec mariadb-dump --single-transaction --quick --routines --triggers -uroot -p\"\$MARIADB_ROOT_PASSWORD\" npcoaches" \
  | gzip > "$SQL"
echo "[$(date -Is)] archiving Directus uploads"
$COMPOSE exec -T directus sh -c 'tar -C /directus/uploads -czf - .' > "$UPLOADS"
age -r "$BACKUP_AGE_RECIPIENT" -o "$SQL.age" "$SQL"
age -r "$BACKUP_AGE_RECIPIENT" -o "$UPLOADS.age" "$UPLOADS"
rm -f -- "$SQL" "$UPLOADS"
find "$BACKUP_DIR" -name 'npcoaches-*.age' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Is)] copying encrypted backups off-site"
rclone copy "$SQL.age" "$RCLONE_REMOTE"
rclone copy "$UPLOADS.age" "$RCLONE_REMOTE"
echo "[$(date -Is)] backup complete: $SQL.age and $UPLOADS.age"
