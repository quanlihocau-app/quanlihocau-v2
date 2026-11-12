#!/bin/bash
# Chạy trên VPS, trong checkout /opt/quanlihocau.
# Mặc định chỉ pull ảnh GHCR. BUILD_LOCAL=1 thì build tại VPS bằng Dockerfile trong repo.
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compose.sh"
ROOT="$(qlhc_repo_root)"
cd "$ROOT"

if [[ ! -f .env ]]; then
    echo "up: thiếu .env" >&2
    exit 1
fi
set -a
# shellcheck disable=SC1091
. ./.env
set +a
qlhc_compose_array "$ROOT"

if [[ "${BUILD_LOCAL:-0}" == "1" ]]; then
    sha="$(git rev-parse HEAD)"
    APP_IMAGE="qlhc-local/app:${sha}"
    SCHEDULER_IMAGE="qlhc-local/scheduler:${sha}"
    CADDY_IMAGE="qlhc-local/caddy:${sha}"
    export APP_IMAGE SCHEDULER_IMAGE CADDY_IMAGE
    echo "up: build local ${sha}"
    docker build -f Dockerfile -t "$APP_IMAGE" "$ROOT"
    docker build -f deploy/scheduler/Dockerfile -t "$SCHEDULER_IMAGE" "$ROOT/deploy"
    docker build -f deploy/caddy/Dockerfile -t "$CADDY_IMAGE" "$ROOT/deploy/caddy"
elif [[ -z "${APP_IMAGE:-}" || -z "${SCHEDULER_IMAGE:-}" || -z "${CADDY_IMAGE:-}" ]]; then
    echo "up: thiếu APP_IMAGE, SCHEDULER_IMAGE hoặc CADDY_IMAGE. Hoặc đặt BUILD_LOCAL=1." >&2
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
if [[ "${BUILD_LOCAL:-0}" == "1" ]]; then
    echo "up: dùng ảnh local, không pull GHCR."
else
    "${COMPOSE[@]}" pull
fi

secrets="${RCLONE_CONFIG_PATH:-$ROOT/secrets/rclone.conf}"
mkdir -p "$(dirname "$secrets")"
if [[ ! -f "$secrets" ]]; then
    if [[ "${BACKUP_TARGET:-rclone}" == "rclone" ]]; then
        echo "up: thiếu $secrets. Xem mục Google Drive trong deploy/README.md." >&2
        exit 1
    fi
    install -m 600 /dev/null "$secrets"
fi

if [[ "${PRE_DEPLOY_BACKUP:-1}" == "1" ]]; then
    "${COMPOSE[@]}" run --rm --no-deps --entrypoint /scripts/backup.sh scheduler
fi

echo "up: migrate deploy một lần, không gắn vào process của app"
"${COMPOSE[@]}" up -d --wait --no-build db
if ! "${COMPOSE[@]}" run --rm --no-deps app migrate; then
    echo "up: migrate thất bại. Không đổi app đang chạy." >&2
    exit 1
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
