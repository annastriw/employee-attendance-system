#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly ROOT=/opt/attendance
readonly BACKEND_COMPOSE="$ROOT/compose.backend.yml"
readonly INFRA_COMPOSE="$ROOT/compose.infra.yml"
readonly RELEASE_FILE="$ROOT/backend-release.env"
readonly BACKUP_DIR="$ROOT/backups"
readonly REGISTRY=ghcr.io/annastriw/employee-attendance-system
readonly DB_CONTAINER=attendance-prod-mysql-1
readonly DB_NETWORK=attendance-prod-backend
readonly DB_NAME=attendance_prod
readonly LOCK_FILE=/run/lock/attendance-deploy.lock
readonly HEALTH_PORTS=(3000 3001 3002 3003 3004)

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

[[ $# -eq 2 ]] || fail 'expected release SHA and migrations-changed flag'
release_sha=$1
migrations_changed=$2
[[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || fail 'invalid release SHA'
[[ "$migrations_changed" == true || "$migrations_changed" == false ]] || fail 'invalid migration flag'
[[ -f "$BACKEND_COMPOSE" && -f "$INFRA_COMPOSE" && -f "$RELEASE_FILE" && -d "$BACKUP_DIR" ]] || fail 'production files or backup directory are missing'
[[ -s "$ROOT/.secrets/migrator.env" ]] || fail 'migrator credential file is missing'
[[ "$(docker inspect --format '{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null)" == healthy ]] || fail 'production database is not healthy'

exec 9>"$LOCK_FILE"
flock -n 9 || fail 'another production deployment is running'

current_sha=$(sed -n 's/^BACKEND_RELEASE_SHA=//p' "$RELEASE_FILE")
[[ "$current_sha" =~ ^[0-9a-f]{40}$ ]] || fail 'current release SHA is invalid'
if [[ "$current_sha" == "$release_sha" ]]; then
  printf 'PASS: release %s is already active\n' "$release_sha"
  exit 0
fi

timestamp=$(date -u +%Y%m%d-%H%M%S)
release_backup="$BACKUP_DIR/backend-release-$timestamp.env"
install -m 600 "$RELEASE_FILE" "$release_backup"
candidate_file=$(mktemp "$ROOT/.backend-release.XXXXXX")
health_ok=false
release_switched=false

cleanup() {
  rm -f -- "$candidate_file"
}
trap cleanup EXIT

printf 'BACKEND_RELEASE_SHA=%s\n' "$release_sha" > "$candidate_file"
chmod 600 "$candidate_file"

compose() {
  docker compose --env-file "$1" -f "$BACKEND_COMPOSE" "${@:2}"
}

health_check() {
  local port response
  for port in "${HEALTH_PORTS[@]}"; do
    response=''
    for _ in {1..30}; do
      if response=$(curl --fail --silent --show-error --max-time 3 "http://127.0.0.1:$port/health" 2>/dev/null); then
        break
      fi
      sleep 2
    done
    [[ -n "$response" ]] || return 1
    [[ "$response" == *'"status":"ok"'* || "$response" == *'"status": "ok"'* ]] || return 1
  done
}

rollback_app() {
  local rollback_file
  rollback_file=$(mktemp "$ROOT/.backend-rollback.XXXXXX")
  install -m 600 "$release_backup" "$rollback_file"
  mv -f -- "$rollback_file" "$RELEASE_FILE"
  compose "$RELEASE_FILE" up -d --wait --wait-timeout 120 || return 1
  health_check
}

printf 'Deploying %s (migrations changed: %s)\n' "$release_sha" "$migrations_changed"
compose "$candidate_file" config --quiet
compose "$candidate_file" pull
if [[ "$migrations_changed" == true ]]; then
  docker pull "$REGISTRY/migrator:sha-$release_sha"

  db_backup="$BACKUP_DIR/pre-migration-$timestamp.sql.gz"
  docker exec "$DB_CONTAINER" sh -c \
    'MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysqldump -uroot --single-transaction --no-tablespaces attendance_prod' \
    | gzip -c > "$db_backup"
  chmod 600 "$db_backup"
  gzip -t "$db_backup" || fail 'database backup verification failed'
  printf 'PASS: database backup saved at %s\n' "$db_backup"

  docker run --rm \
    --network "$DB_NETWORK" \
    --env-file "$ROOT/.secrets/migrator.env" \
    --env MIGRATOR_DATABASE_HOST="$DB_CONTAINER" \
    --env MIGRATOR_DATABASE_NAME="$DB_NAME" \
    "$REGISTRY/migrator:sha-$release_sha" \
    migrate deploy --config /tooling/infra/prisma-migrator.config.ts
fi

mv -f -- "$candidate_file" "$RELEASE_FILE"
release_switched=true
if compose "$RELEASE_FILE" up -d --wait --wait-timeout 120 && health_check; then
  health_ok=true
fi

if [[ "$health_ok" != true ]]; then
  printf 'FAIL: new release health check failed; restoring application image %s\n' "$current_sha" >&2
  if [[ "$release_switched" == true ]] && rollback_app && health_check; then
    printf 'PASS: previous application release restored; database migration, if any, remains applied\n' >&2
  else
    printf 'CRITICAL: automatic application rollback failed; investigate VPS through SSH\n' >&2
  fi
  exit 1
fi

printf 'PASS: production release %s is healthy on all backend ports\n' "$release_sha"
