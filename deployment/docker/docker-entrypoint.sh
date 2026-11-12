#!/bin/sh
# serve: chạy Next standalone. migrate: chỉ áp migration rồi thoát.
# prisma migrate deploy chạy lại an toàn khi không có migration mới.
set -eu

if [ "${1:-serve}" = "reset" ] || [ "${1:-serve}" = "push" ]; then
    echo "docker-entrypoint: cấm migrate reset và db push. Chỉ migrate deploy." >&2
    exit 1
fi

if [ "${1:-serve}" = "migrate" ] || [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    if [ -z "${DATABASE_URL:-}" ]; then
        echo "docker-entrypoint: thiếu DATABASE_URL, không migrate." >&2
        exit 1
    fi
    node /app/node_modules/prisma/build/index.js migrate deploy
    if [ "${1:-serve}" = "migrate" ]; then
        exit 0
    fi
fi

exec node /app/server.js
