#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  : "${MIGRATOR_PASSWORD:?MIGRATOR_PASSWORD is required}"
  : "${MIGRATOR_DATABASE_HOST:?MIGRATOR_DATABASE_HOST is required}"
  : "${MIGRATOR_DATABASE_NAME:?MIGRATOR_DATABASE_NAME is required}"
  database_port=${MIGRATOR_DATABASE_PORT:-3306}
  DATABASE_URL="mysql://attendance_migrator:${MIGRATOR_PASSWORD}@${MIGRATOR_DATABASE_HOST}:${database_port}/${MIGRATOR_DATABASE_NAME}"
  export DATABASE_URL
fi

exec /tooling/node_modules/.bin/prisma "$@"
