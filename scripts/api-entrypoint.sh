#!/bin/sh
# API container entrypoint: migrate, seed (idempotent), then start the server.
set -eu

API_MAIN="${API_MAIN:-dist/src/main.js}"
SEED_SCRIPT="${SEED_SCRIPT:-dist/prisma/seed.js}"
SEED_ON_START="${SEED_ON_START:-true}"

echo "[entrypoint] applying database migrations"
node node_modules/prisma/build/index.js migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  if [ -f "$SEED_SCRIPT" ]; then
    echo "[entrypoint] seeding database ($SEED_SCRIPT)"
    node "$SEED_SCRIPT"
  else
    echo "[entrypoint] seed script $SEED_SCRIPT not found, skipping"
  fi
fi

echo "[entrypoint] starting API ($API_MAIN)"
exec node "$API_MAIN"
