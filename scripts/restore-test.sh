#!/usr/bin/env bash
# Destructively restores an encrypted backup only into a disposable MariaDB container.
set -euo pipefail

: "${1:?usage: restore-test.sh <database.sql.gz.age> <uploads.tar.gz.age>}"
: "${2:?usage: restore-test.sh <database.sql.gz.age> <uploads.tar.gz.age>}"
command -v age >/dev/null
command -v docker >/dev/null

WORK="$(mktemp -d)"
CONTAINER="npcoaches-restore-test-$$"
PASSWORD="restore-test-$RANDOM-$RANDOM"
cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf -- "$WORK"
}
trap cleanup EXIT

age -d -o "$WORK/database.sql.gz" "$1"
age -d -o "$WORK/uploads.tar.gz" "$2"
gzip -t "$WORK/database.sql.gz"
tar -tzf "$WORK/uploads.tar.gz" >/dev/null

docker run -d --rm --name "$CONTAINER" \
  -e MARIADB_ROOT_PASSWORD="$PASSWORD" \
  mariadb:11.8.8 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" mariadb-admin ping -uroot -p"$PASSWORD" --silent >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$CONTAINER" mariadb -uroot -p"$PASSWORD" -e 'CREATE DATABASE npcoaches;'
gzip -dc "$WORK/database.sql.gz" | docker exec -i "$CONTAINER" mariadb -uroot -p"$PASSWORD" npcoaches
TABLES="$(docker exec "$CONTAINER" mariadb -N -uroot -p"$PASSWORD" npcoaches -e 'SHOW TABLES' | wc -l)"
test "$TABLES" -gt 0
echo "Restore test passed: $TABLES tables and upload archive verified."
