#!/bin/sh
# Chạy trên VPS, trong thư mục checkout /opt/quanlihocau, sau khi đã có file .env.
# Biến APP_IMAGE và SCHEDULER_IMAGE do workflow truyền vào. Không in giá trị bí mật.
set -eu

cd "$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"

if [ ! -f .env ]; then
    echo "deploy: thiếu /opt/quanlihocau/.env" >&2
    exit 1
fi

if [ -z "${APP_IMAGE:-}" ] || [ -z "${SCHEDULER_IMAGE:-}" ]; then
    echo "deploy: thiếu APP_IMAGE hoặc SCHEDULER_IMAGE" >&2
    exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

previous=""
previous_scheduler=""
app_id="$(docker compose ps -q app 2>/dev/null || true)"
sched_id="$(docker compose ps -q scheduler 2>/dev/null || true)"
if [ -n "$app_id" ]; then
    previous="$(docker inspect --format '{{.Config.Image}}' "$app_id" 2>/dev/null || true)"
fi
if [ -n "$sched_id" ]; then
    previous_scheduler="$(docker inspect --format '{{.Config.Image}}' "$sched_id" 2>/dev/null || true)"
fi

if [ -n "${GHCR_PULL_USER:-}" ] && [ -n "${GHCR_PULL_TOKEN:-}" ]; then
    printf '%s' "$GHCR_PULL_TOKEN" | docker login ghcr.io -u "$GHCR_PULL_USER" --password-stdin >/dev/null
fi

export APP_IMAGE SCHEDULER_IMAGE

docker compose pull app migrate scheduler

docker compose up -d --wait db

if [ "${PRE_DEPLOY_BACKUP:-1}" = "1" ]; then
    docker compose run --rm --no-deps --entrypoint /cron/backup.sh scheduler
fi

if ! docker compose up -d --wait; then
    echo "deploy: stack không khỏe. Đưa lại ảnh đang chạy trước đó nếu còn." >&2
    if [ -n "$previous" ]; then
        APP_IMAGE="$previous"
        export APP_IMAGE
        if [ -n "$previous_scheduler" ]; then
            SCHEDULER_IMAGE="$previous_scheduler"
            export SCHEDULER_IMAGE
        fi
        docker compose up -d --wait || true
    fi
    exit 1
fi

echo "deploy: xong ${APP_IMAGE}"
