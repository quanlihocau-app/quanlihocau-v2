#!/bin/bash
# Khôi phục thử một bản dump vào database tạm, rồi xóa đúng database tạm đó.
# Không đụng database đang phục vụ và không đụng Neon.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f deploy/docker-compose.yml --env-file .env)
LIVE_DB="${POSTGRES_DB:-quanlihocau}"
RESTORE_DB="quanlihocau_restore_test"
DUMP="${1:-}"

if [[ "$RESTORE_DB" == "$LIVE_DB" ]]; then
    echo "restore-test: tên database tạm trùng database đang chạy. Dừng." >&2
    exit 1
fi

if [[ -z "$DUMP" ]]; then
    echo "Cách dùng: bash deploy/scripts/restore-test.sh /đường/dẫn/file.dump.gz" >&2
    echo "File lấy từ bản backup đã tải về, không phải database đang phục vụ." >&2
    exit 1
fi
if [[ ! -f "$DUMP" ]]; then
    echo "restore-test: không thấy file dump." >&2
    exit 1
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
case "$DUMP" in
    *.gz) gunzip -c "$DUMP" > "$workdir/restore.dump" ;;
    *) cp "$DUMP" "$workdir/restore.dump" ;;
esac

echo "restore-test: tạo ${RESTORE_DB} rồi nạp dump"
"${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d postgres -v ON_ERROR_STOP=1 -c \
    "DROP DATABASE IF EXISTS ${RESTORE_DB};"
"${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d postgres -v ON_ERROR_STOP=1 -c \
    "CREATE DATABASE ${RESTORE_DB};"
docker cp "$workdir/restore.dump" "$("${COMPOSE[@]}" ps -q db)":/tmp/restore-test.dump
set +e
"${COMPOSE[@]}" exec -T db pg_restore -U "${POSTGRES_USER:-quanlihocau}" -d "$RESTORE_DB" \
    --no-owner --no-acl --exit-on-error /tmp/restore-test.dump
restore_status=$?
set -e
"${COMPOSE[@]}" exec -T db rm -f /tmp/restore-test.dump

tables="$("${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d "$RESTORE_DB" -Atc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")"
echo "restore-test: ${tables} bảng trong ${RESTORE_DB}, mã pg_restore ${restore_status}"

echo "restore-test: xóa database tạm ${RESTORE_DB}"
if [[ "$RESTORE_DB" != "quanlihocau_restore_test" ]]; then
    echo "restore-test: từ chối xóa vì tên không đúng database tạm." >&2
    exit 1
fi
"${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d postgres -v ON_ERROR_STOP=1 -c \
    "DROP DATABASE IF EXISTS quanlihocau_restore_test;"

if [[ "$restore_status" != "0" || "$tables" == "0" ]]; then
    echo "restore-test: bản dump không nạp được." >&2
    exit 1
fi
echo "restore-test: xong. Database ${LIVE_DB} không bị đổi."
