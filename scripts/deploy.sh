#!/usr/bin/env bash
# Deploy Ajaia Docs to the Oracle VM. Run from the repo root in Git Bash: ./scripts/deploy.sh
set -euo pipefail

VM_HOST="${VM_HOST:-51.170.90.86}"
VM_USER="${VM_USER:-ubuntu}"
VM_KEY="${VM_KEY:-/d/Aadil Laptop/Projects/jobkit/.keys/oracle-jobkit.key}"
REPO_URL="${REPO_URL:-https://github.com/aadilsal/AjaiConsultancyAssignment.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/ajaia-docs}"
WEB_PORT="${WEB_PORT:-8081}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
# local = build here and ship images over SSH (VM has 1 GB RAM); remote = build on the VM.
BUILD_MODE="${BUILD_MODE:-local}"
# Public HTTPS URL served by the shared Caddy (see docker-compose.edge.yml).
PUBLIC_URL="${PUBLIC_URL:-https://docs.51-170-90-86.sslip.io}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.edge.yml"

SSH=(ssh -i "$VM_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$VM_USER@$VM_HOST")
log() { printf '\n==> %s\n' "$*"; }

cd "$(dirname "$0")/.."

log "Syncing $REPO_URL ($BRANCH) into $APP_DIR"
"${SSH[@]}" bash -s -- "$REPO_URL" "$BRANCH" "$APP_DIR" <<'REMOTE'
set -euo pipefail
REPO_URL="$1"; BRANCH="$2"; APP_DIR="$3"
[ -d "$APP_DIR" ] || { sudo mkdir -p "$APP_DIR"; sudo chown "$(id -un):$(id -gn)" "$APP_DIR"; }
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --prune origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
REMOTE

log "Ensuring $APP_DIR/.env exists (secrets generated on the VM, never overwritten)"
"${SSH[@]}" bash -s -- "$APP_DIR" "$PUBLIC_URL" "$WEB_PORT" <<'REMOTE'
set -euo pipefail
APP_DIR="$1"; PUBLIC_URL="$2"; WEB_PORT="$3"
ENV_FILE="$APP_DIR/.env"
if [ -f "$ENV_FILE" ]; then echo ".env already present, keeping it"; exit 0; fi
umask 077
cat > "$ENV_FILE" <<EOF
POSTGRES_USER=ajaia
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=ajaia_docs
SESSION_SECRET=$(openssl rand -hex 32)
COOKIE_SECURE=true
TRUST_PROXY_HOPS=2
WEB_PORT=$WEB_PORT
ALLOWED_ORIGINS=$PUBLIC_URL
SEED_ON_START=true
IMAGE_TAG=latest
EOF
echo "created $ENV_FILE (mode 600)"
REMOTE

if [ "$BUILD_MODE" = "local" ]; then
  log "Building images locally (linux/amd64)"
  DOCKER_DEFAULT_PLATFORM=linux/amd64 IMAGE_TAG="$IMAGE_TAG" \
    docker compose --env-file .env.production.example build --pull
  log "Shipping images to the VM"
  docker save "ajaia-docs-api:$IMAGE_TAG" "ajaia-docs-web:$IMAGE_TAG" | gzip -1 | "${SSH[@]}" 'gunzip | sudo docker load'
  UP_FLAGS="--no-build"
else
  UP_FLAGS="--build"
fi

log "Starting stack and waiting for health checks"
"${SSH[@]}" "cd '$APP_DIR' && sudo IMAGE_TAG='$IMAGE_TAG' $COMPOSE up -d $UP_FLAGS --remove-orphans --wait --wait-timeout 300"

log "Status"
"${SSH[@]}" "cd '$APP_DIR' && sudo $COMPOSE ps && sudo docker image prune -f --filter label=com.docker.compose.project=ajaia-docs >/dev/null"

log "Smoke test"
"${SSH[@]}" "curl -fsS -m 10 http://localhost:$WEB_PORT/api/health && echo"
curl -fsS -m 20 "$PUBLIC_URL/api/health" && echo
echo "Deployed: $PUBLIC_URL"
