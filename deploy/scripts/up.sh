#!/bin/bash
# Chạy trên VPS, trong checkout /opt/quanlihocau. Chỉ pull, không build.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f deploy/docker-compose.yml --env-file .env)

if [[ ! -f .env ]]; then
    echo "up: thiếu .env" >&2
    exit 1
fi
set -a
# shellcheck disable=SC1091
. ./.env
set +a

if [[ -z "${APP_IMAGE:-}" || -z "${SCHEDULER_IMAGE:-}" || -z "${CADDY_IMAGE:-}" ]]; then
    echo "up: thiếu APP_IMAGE, SCHEDULER_IMAGE hoặc CADDY_IMAGE" >&2
    exit 1
fi

bash deploy/scripts/pre-deploy-check.sh

previous=""
previous_scheduler=""
previous_caddy=""
app_id="$("${COMPOSE[@]}" ps -q app 2>/dev/null || true)"
sched_id="$("${COMPOSE[@]}" ps -q scheduler 2>/dev/null || true)"
caddy_id="$("${COMPOSE[@]}" ps -q caddy 2>/dev/null || true)"
if [[ -n "$app_id" ]]; then previous="$(docker inspect --format '{{.Config.Image}}' "$app_id")"; fi
if [[ -n "$sched_id" ]]; then previous_scheduler="$(docker inspect --format '{{.Config.Image}}' "$sched_id")"; fi
if [[ -n "$caddy_id" ]]; then previous_caddy="$(docker inspect --format '{{.Config.Image}}' "$caddy_id")"; fi

if [[ -n "${GHCR_PULL_USER:-}" && -n "${GHCR_PULL_TOKEN:-}" ]]; then
    printf '%s' "$GHCR_PULL_TOKEN" | docker login ghcr.io -u "$GHCR_PULL_USER" --password-stdin >/dev/null
fi

export APP_IMAGE SCHEDULER_IMAGE CADDY_IMAGE
"${COMPOSE[@]}" pull

if [[ "${PRE_DEPLOY_BACKUP:-1}" == "1" ]]; then
    "${COMPOSE[@]}" run --rm --no-deps --entrypoint /scripts/backup.sh scheduler
fi

if ! "${COMPOSE[@]}" up -d --wait --no-build; then
    echo "up: stack không khỏe. Đưa lại ảnh cũ nếu còn." >&2
    if [[ -n "$previous" ]]; then
        APP_IMAGE="$previous"
        export APP_IMAGE
        if [[ -n "$previous_scheduler" ]]; then SCHEDULER_IMAGE="$previous_scheduler"; export SCHEDULER_IMAGE; fi
        if [[ -n "$previous_caddy" ]]; then CADDY_IMAGE="$previous_caddy"; export CADDY_IMAGE; fi
        "${COMPOSE[@]}" up -d --wait --no-build || true
    fi
    exit 1
fi
echo "up: xong ${APP_IMAGE}"
