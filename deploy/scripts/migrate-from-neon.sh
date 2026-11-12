#!/bin/bash
# Chuyển dữ liệu Neon (PostgreSQL 18.6) sang Postgres 18 trên VPS.
# VPS mở được TCP 5432 tới Neon. Chạy dump-to và restore trên VPS,
# trong checkout /opt/quanlihocau.
#
# 1) NEON_DATABASE_URL='postgresql://...' bash deploy/scripts/migrate-from-neon.sh dump-to /tmp/neon.dump
#    Lệnh này không in URL. Bỏ bảng demo playing_with_neon.
#    Sinh /tmp/neon.dump và /tmp/neon.dump.counts
# 2) Database cục bộ còn trống:
#      bash deploy/scripts/migrate-from-neon.sh restore /tmp/neon.dump
#    pg_restore chạy trong container postgres:18 và đối chiếu số dòng từng bảng.
#
# COMPOSE_FILES (ngăn bởi dấu :) để `up -d db` dùng đúng file override đang chạy,
# không tạo lại container db với volume hoặc lệnh khác.
# Không xóa object trên Neon và không ghi đè database đã có bảng.
set -euo pipefail

PG_IMAGE="postgres:18"
# shellcheck disable=SC1091
source "$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compose.sh"
ROOT="$(qlhc_repo_root)"
cd "$ROOT"
if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source ./.env
    set +a
fi
qlhc_compose_array "$ROOT"

usage() {
    echo "Cách dùng:" >&2
    echo "  NEON_DATABASE_URL=... bash deploy/scripts/migrate-from-neon.sh dump-to /đường/dẫn.dump" >&2
    echo "  bash deploy/scripts/migrate-from-neon.sh restore /đường/dẫn.dump" >&2
    exit 1
}

write_service_file() {
    python3 - "$1" <<'PY'
import os
import sys
from urllib.parse import unquote, urlparse

raw = os.environ["NEON_DATABASE_URL"]
parsed = urlparse(raw)
if parsed.scheme not in ("postgresql", "postgres") or not parsed.hostname or not parsed.path:
    sys.exit("URL Neon không phải postgresql://")
name = parsed.path.lstrip("/").split("?")[0]
port = parsed.port or 5432
user = unquote(parsed.username or "")
password = unquote(parsed.password or "")
sslmode = "require"
for part in (parsed.query or "").split("&"):
    if part.startswith("sslmode="):
        sslmode = part.split("=", 1)[1]
open(sys.argv[1], "w", encoding="utf-8").write("\n".join([
    "[neon]",
    f"host={parsed.hostname}",
    f"port={port}",
    f"user={user}",
    f"password={password}",
    f"dbname={name}",
    f"sslmode={sslmode}",
    "",
]))
PY
}

dump_to() {
    local dest="$1"
    if [[ -z "${NEON_DATABASE_URL:-}" ]]; then
        echo "dump-to: thiếu NEON_DATABASE_URL." >&2
        exit 1
    fi
    echo "dump-to: pg_dump từ Neon bằng ${PG_IMAGE}. Không in URL."
    umask 077
    local work
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' RETURN
    write_service_file "$work/neon.conf"
    unset NEON_DATABASE_URL
    mkdir -p "$(dirname "$dest")"
    echo "dump-to: pg_dump bằng ${PG_IMAGE}, bỏ playing_with_neon"
    docker run --rm \
        -e PGSERVICEFILE=/work/neon.conf \
        -e PGSERVICE=neon \
        -v "$work:/work" \
        --entrypoint pg_dump \
        "$PG_IMAGE" \
        --format=custom --no-owner --no-acl \
        --exclude-table=playing_with_neon \
        --file=/work/neon.dump
    docker run --rm \
        -e PGSERVICEFILE=/work/neon.conf \
        -e PGSERVICE=neon \
        -v "$work:/work" \
        --entrypoint psql \
        "$PG_IMAGE" \
        -Atc "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'playing_with_neon' ORDER BY 1;" \
        > "$work/tables.txt"
    : > "$work/counts.tsv"
    while IFS= read -r table; do
        [[ -n "$table" ]] || continue
        printf 'SELECT count(*) FROM public.%s;\n' "\"${table//\"/\"\"}\"" > "$work/count.sql"
        local n
        n="$(docker run --rm -e PGSERVICEFILE=/work/neon.conf -e PGSERVICE=neon -v "$work:/work" --entrypoint psql "$PG_IMAGE" -Atf /work/count.sql)"
        printf '%s\t%s\n' "$table" "$n" >> "$work/counts.tsv"
    done < "$work/tables.txt"
    cp "$work/neon.dump" "$dest"
    cp "$work/counts.tsv" "${dest}.counts"
    echo "dump-to: đã ghi dump và ${dest}.counts. Chép cả hai file lên VPS rồi chạy restore."
}

restore_dump() {
    local dest="$1"
    local counts="${dest}.counts"
    if [[ ! -f "$dest" ]]; then
        echo "restore: không thấy file dump." >&2
        exit 1
    fi
    if [[ ! -f "$counts" ]]; then
        echo "restore: thiếu ${counts}. File này đi cùng dump, dùng để đối chiếu số dòng." >&2
        exit 1
    fi
    echo "restore: bật Postgres 18 cục bộ"
    "${COMPOSE[@]}" up -d --wait db
    local db_id image
    db_id="$("${COMPOSE[@]}" ps -q db)"
    image="$(docker inspect --format '{{.Config.Image}}' "$db_id")"
    case "$image" in
        postgres:18|postgres:18-*|*/postgres:18|*/postgres:18-*) ;;
        *)
            echo "restore: container db đang là ${image}, cần postgres:18." >&2
            exit 1
            ;;
    esac
    local table_count
    table_count="$("${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d "${POSTGRES_DB:-quanlihocau}" -Atc \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")"
    if [[ "$table_count" != "0" ]]; then
        echo "restore: database cục bộ đã có ${table_count} bảng. Dừng, không ghi đè." >&2
        exit 2
    fi
    echo "restore: pg_restore trong container postgres:18"
    docker cp "$dest" "${db_id}:/tmp/neon.dump"
    "${COMPOSE[@]}" exec -T db pg_restore -U "${POSTGRES_USER:-quanlihocau}" -d "${POSTGRES_DB:-quanlihocau}" \
        --no-owner --no-acl --exit-on-error /tmp/neon.dump
    "${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d "${POSTGRES_DB:-quanlihocau}" -v ON_ERROR_STOP=1 -c \
        "DROP TABLE IF EXISTS public.playing_with_neon;"
    "${COMPOSE[@]}" exec -T db rm -f /tmp/neon.dump

    echo "restore: đối chiếu số dòng từng bảng, bỏ playing_with_neon"
    local fail=0 table expected local_n
    while IFS="$(printf '\t')" read -r table expected; do
        [[ -n "$table" ]] || continue
        if [[ "$table" == "playing_with_neon" ]]; then
            continue
        fi
        printf 'SELECT count(*) FROM public.%s;\n' "\"${table//\"/\"\"}\"" > /tmp/qlhc-count.sql
        local_n="$("${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d "${POSTGRES_DB:-quanlihocau}" -Atf - < /tmp/qlhc-count.sql)"
        if [[ "$local_n" != "$expected" ]]; then
            echo "Lệch bảng ${table}: Neon=${expected} VPS=${local_n}" >&2
            fail=1
        else
            echo "Khớp ${table}: ${local_n}"
        fi
    done < "$counts"
    rm -f /tmp/qlhc-count.sql
    if [[ "$fail" != "0" ]]; then
        echo "restore: số dòng không khớp. Không cắt DNS." >&2
        exit 1
    fi
    echo "restore: mọi bảng khớp. Có thể chạy deploy/scripts/up.sh"
}

cmd="${1:-}"
case "$cmd" in
    dump-to)
        [[ -n "${2:-}" ]] || usage
        dump_to "$2"
        ;;
    restore)
        [[ -n "${2:-}" ]] || usage
        restore_dump "$2"
        ;;
    *)
        usage
        ;;
esac
