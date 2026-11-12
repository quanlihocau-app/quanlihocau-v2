#!/bin/sh
# serve: chạy Next standalone.
# migrate: áp migration rồi thoát. Đây là bước một lần, không gắn vào lệnh khác.
# Mọi lệnh khác được exec nguyên xi và không chạy migration.
# RUN_MIGRATIONS=1 chỉ có tác dụng khi lệnh là serve.
set -eu

cmd="${1:-serve}"

if [ "$cmd" = "reset" ] || [ "$cmd" = "push" ]; then
    echo "docker-entrypoint: cấm migrate reset và db push. Chỉ migrate deploy." >&2
    exit 1
fi

run_migrate() {
    if [ -z "${DATABASE_URL:-}" ]; then
        echo "docker-entrypoint: thiếu DATABASE_URL, không migrate." >&2
        exit 1
    fi
    node /app/node_modules/prisma/build/index.js migrate deploy
}

if [ "$cmd" = "migrate" ]; then
    run_migrate
    exit 0
fi

if [ "$cmd" != "serve" ]; then
    exec "$@"
fi

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    run_migrate
fi

exec node /app/server.js
