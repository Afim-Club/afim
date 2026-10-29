#!/usr/bin/env bash
# Pull-based auto update for the afim-cms Dockge stack (run by a systemd timer).
# When the image tag in the stack has a new build on GHCR it:
#   1. dumps the database (mysqldump in a throwaway container; aborts on failure),
#   2. recreates only this stack's container,
#   3. waits for the container healthcheck and rolls back to the previous image if it fails.
# Nothing else on the host is touched (no prune, no other stacks, no docker logout).
set -euo pipefail

STACK_DIR=${STACK_DIR:-/data/stacks/afim-cms}
BACKUP_DIR=${BACKUP_DIR:-/data/backups/afim-cms}
KEEP_BACKUPS=${KEEP_BACKUPS:-14}
SERVICE=${SERVICE:-cms}
DUMP_IMAGE=${DUMP_IMAGE:-mysql:8.4}
# Empty Docker config for pulls: the image is public, and root's old ghcr.io login (another org) is denied.
PULL_CONFIG=${PULL_CONFIG:-/var/lib/afim-cms-update/docker}
# Image id that failed its healthcheck; skipped until a newer build is published.
FAILED_FILE=${FAILED_FILE:-/var/lib/afim-cms-update/failed-image}

log() { echo "afim-cms-update: $*"; }
# Value of a variable in the stack's .env (last occurrence, surrounding quotes removed).
env_val() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true; }

exec 9>/run/afim-cms-update.lock
flock -n 9 || { log "another run in progress"; exit 0; }

cd "$STACK_DIR"
image=$(docker compose config --images | head -n1)
repo=${image%:*}

# Keep the running image as :previous before pulling (an untagged image may be garbage collected).
cid=$(docker compose ps -q "$SERVICE")
old=$([ -n "$cid" ] && docker inspect -f '{{.Image}}' "$cid" || true)
rollback=false
if [ -n "$old" ]; then
  prev=$(docker image inspect -f '{{.Id}}' "$repo:previous" 2>/dev/null || true)
  if docker tag "$old" "$repo:previous" 2>/dev/null; then
    rollback=true
    # Drop the image replaced last time (now neither running nor :previous)
    [ -n "$prev" ] && [ "$prev" != "$old" ] && { docker rmi "$prev" >/dev/null 2>&1 || true; }
  fi
fi

mkdir -p "$PULL_CONFIG"
DOCKER_CONFIG=$PULL_CONFIG docker pull -q "$image" >/dev/null
new=$(docker image inspect -f '{{.Id}}' "$image")
[ "$new" = "$old" ] && exit 0
[ "$new" = "$(cat "$FAILED_FILE" 2>/dev/null)" ] && exit 0
log "new image for $image: ${old:-none} -> $new"
$rollback || log "running image is gone locally, no automatic rollback this time"

# 1. Backup (the update stops here if the dump fails)
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
file="$BACKUP_DIR/afim-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
ssl=PREFERRED
[ "$(env_val DATABASE_SSL)" = "true" ] && ssl=REQUIRED
db_host=$(env_val DATABASE_HOST)
db_port=$(env_val DATABASE_PORT)
db_user=$(env_val DATABASE_USERNAME)
db_name=$(env_val DATABASE_NAME)
(
  umask 077
  # Password goes through the environment, not the command line.
  MYSQL_PWD=$(env_val DATABASE_PASSWORD) docker run --rm --network host -e MYSQL_PWD "$DUMP_IMAGE" \
    mysqldump -h "$db_host" -P "${db_port:-3306}" -u "${db_user:-afim}" --ssl-mode="$ssl" \
    --single-transaction --no-tablespaces --set-gtid-purged=OFF "${db_name:-afim}" | gzip > "$file.tmp"
) || { rm -f "$file.tmp"; log "backup failed, not updating"; exit 1; }
mv "$file.tmp" "$file"
log "backup $file ($(du -h "$file" | cut -f1))"
ls -1t "$BACKUP_DIR"/afim-*.sql.gz | tail -n +"$((KEEP_BACKUPS + 1))" | xargs -r rm -f

# 2. Update
docker compose up -d "$SERVICE"

# 3. Healthcheck (the image's HEALTHCHECK: 60 s start period, 15 s interval)
for _ in $(seq 1 30); do
  sleep 10
  cid=$(docker compose ps -q "$SERVICE")
  status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo missing)
  if [ "$status" = healthy ]; then
    log "healthy on $new"
    rm -f "$FAILED_FILE"
    exit 0
  fi
  [ "$status" = unhealthy ] && break
done

echo "$new" > "$FAILED_FILE"
log "NOT healthy ($status) on $new (database backup: $file)"
if $rollback; then
  log "rolling back to $old"
  docker tag "$repo:previous" "$image"
  docker compose up -d "$SERVICE"
fi
exit 1
