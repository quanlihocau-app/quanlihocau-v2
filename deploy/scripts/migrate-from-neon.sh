#!/bin/bash
# Đọc Neon (chỉ pg_dump và SELECT count) rồi nạp vào Postgres trên VPS.
# Không xóa object trên Neon và không ghi đè database đã có bảng.
# Chuỗi kết nối lấy từ NEON_DATABASE_URL hoặc từ file dòng đầu (đối số 1). Không in chuỗi đó.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f deploy/docker-compose.yml --env-file .env)

if [[ -n "${1:-}" && -f "$1" ]]; then
    NEON_DATABASE_URL="$(head -n 1 "$1" | tr -d '\r')"
    export NEON_DATABASE_URL
fi
if [[ -z "${NEON_DATABASE_URL:-}" ]]; then
    echo "migrate-from-neon: đặt NEON_DATABASE_URL hoặc truyền file chứa một dòng URL." >&2
    exit 1
fi

umask 077
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

python3 - "$workdir/neon.conf" <<'PY'
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
query = parsed.query
sslmode = "require"
for part in query.split("&"):
    if part.startswith("sslmode="):
        sslmode = part.split("=", 1)[1]
text = "\n".join([
    "[neon]",
    f"host={parsed.hostname}",
    f"port={port}",
    f"user={user}",
    f"password={password}",
    f"dbname={name}",
    f"sslmode={sslmode}",
    "",
])
open(sys.argv[1], "w", encoding="utf-8").write(text)
PY
unset NEON_DATABASE_URL

echo "migrate-from-neon: bật Postgres cục bộ, chưa chạy app"
"${COMPOSE[@]}" up -d --wait db

table_count="$("${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d "${POSTGRES_DB:-quanlihocau}" -Atc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")"
if [[ "$table_count" != "0" ]]; then
    echo "migrate-from-neon: database cục bộ đã có ${table_count} bảng. Dừng, không ghi đè." >&2
    exit 2
fi

DUMPER="${SCHEDULER_IMAGE:-postgres:17-bookworm}"

echo "migrate-from-neon: pg_dump từ Neon (không in URL)"
docker run --rm \
    -e PGSERVICEFILE=/work/neon.conf \
    -e PGSERVICE=neon \
    -v "$workdir:/work" \
    --entrypoint pg_dump \
    "$DUMPER" \
    --format=custom --no-owner --no-acl --file=/work/neon.dump

echo "migrate-from-neon: pg_restore vào database cục bộ"
docker cp "$workdir/neon.dump" "$("${COMPOSE[@]}" ps -q db)":/tmp/neon.dump
"${COMPOSE[@]}" exec -T db pg_restore -U "${POSTGRES_USER:-quanlihocau}" -d "${POSTGRES_DB:-quanlihocau}" \
    --no-owner --no-acl --exit-on-error /tmp/neon.dump
"${COMPOSE[@]}" exec -T db rm -f /tmp/neon.dump

echo "migrate-from-neon: đối chiếu số dòng từng bảng"
python3 - "$workdir/tables.sql" <<'PY'
import sys
open(sys.argv[1], "w", encoding="utf-8").write(
    "SELECT format('%I', tablename) FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;\n"
)
PY

docker run --rm \
    -e PGSERVICEFILE=/work/neon.conf \
    -e PGSERVICE=neon \
    -v "$workdir:/work" \
    --entrypoint psql \
    "$DUMPER" \
    -Atf /work/tables.sql > "$workdir/tables.txt"

fail=0
while IFS= read -r table; do
    [[ -n "$table" ]] || continue
    sql="SELECT count(*) FROM public.${table};"
    printf '%s\n' "$sql" > "$workdir/count.sql"
    neon_n="$(docker run --rm -e PGSERVICEFILE=/work/neon.conf -e PGSERVICE=neon -v "$workdir:/work" --entrypoint psql "$DUMPER" -Atf /work/count.sql)"
    local_n="$("${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER:-quanlihocau}" -d "${POSTGRES_DB:-quanlihocau}" -Atf - < "$workdir/count.sql")"
    if [[ "$neon_n" != "$local_n" ]]; then
        echo "Lệch bảng ${table}: Neon=${neon_n} VPS=${local_n}" >&2
        fail=1
    else
        echo "Khớp ${table}: ${local_n}"
    fi
done < "$workdir/tables.txt"

if [[ "$fail" != "0" ]]; then
    echo "migrate-from-neon: số dòng không khớp. Không cắt DNS." >&2
    exit 1
fi
echo "migrate-from-neon: mọi bảng khớp. Có thể chạy deploy/scripts/up.sh"
