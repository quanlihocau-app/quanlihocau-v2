#!/bin/bash
# pg_dump hằng ngày. Đích mặc định là rclone (Google Drive). S3/R2 vẫn dùng được.
# Cùng một ngày thì ghi đè đúng một file. Không in URL, token hay khóa ra log.
set -euo pipefail

LIBPQ_PARAMS="sslmode sslcert sslkey sslrootcert sslcrl sslcrldir sslcompression sslnegotiation ssl_min_protocol_version ssl_max_protocol_version sslpassword sslsni channel_binding connect_timeout application_name options keepalives keepalives_idle keepalives_interval keepalives_count tcp_user_timeout target_session_attrs gssencmode krbsrvname gsslib replication require_auth load_balance_hosts"

sanitize_database_url() {
    local url="$1"
    local base query part key kept=""
    case "$url" in
        postgresql://*|postgres://*) ;;
        *)
            echo "backup: DATABASE_URL không phải postgresql." >&2
            return 1
            ;;
    esac
    case "$url" in
        *\?*)
            base="${url%%\?*}"
            query="${url#*\?}"
            ;;
        *)
            printf '%s' "$url"
            return 0
            ;;
    esac
    local old_ifs="$IFS"
    IFS='&'
    set -f
    for part in $query; do
        [ -n "$part" ] || continue
        key="${part%%=*}"
        case " $LIBPQ_PARAMS " in
            *" $key "*)
                if [ -n "$kept" ]; then
                    kept="${kept}&${part}"
                else
                    kept="$part"
                fi
                ;;
        esac
    done
    set +f
    IFS="$old_ifs"
    if [ -n "$kept" ]; then
        printf '%s?%s' "$base" "$kept"
    else
        printf '%s' "$base"
    fi
}

if [ "${1:-}" = "--check-url" ]; then
    cleaned="$(sanitize_database_url "${DATABASE_URL:-}")" || exit 1
    case "$cleaned" in
        *schema=*|*connection_limit=*|*pool_timeout=*|*pgbouncer=*)
            echo "backup: còn tham số không thuộc libpq." >&2
            exit 1
            ;;
    esac
    case "$cleaned" in
        *sslmode=require*) ;;
        *)
            echo "backup: mất sslmode." >&2
            exit 1
            ;;
    esac
    echo ok
    exit 0
fi

TARGET="${BACKUP_TARGET:-}"
if [ -z "$TARGET" ]; then
    if [ -n "${S3_BUCKET:-}" ]; then
        TARGET="s3"
    else
        TARGET="rclone"
    fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "backup: thiếu DATABASE_URL." >&2
    exit 1
fi

case "$TARGET" in
    s3)
        if [ -z "${S3_BUCKET:-}" ] || [ -z "${S3_ACCESS_KEY_ID:-}" ] || [ -z "${S3_SECRET_ACCESS_KEY:-}" ] || [ -z "${S3_ENDPOINT:-}" ]; then
            echo "backup: thiếu S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY hoặc S3_ENDPOINT." >&2
            exit 1
        fi
        export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
        export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
        export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
        unset AWS_SESSION_TOKEN || true
        ;;
    rclone)
        if [ -z "${RCLONE_REMOTE:-}" ]; then
            echo "backup: thiếu RCLONE_REMOTE (ví dụ gdrive:quanlihocau-backups)." >&2
            exit 1
        fi
        RCLONE_CONFIG="${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
        if [ ! -f "$RCLONE_CONFIG" ]; then
            echo "backup: thiếu file rclone $RCLONE_CONFIG." >&2
            exit 1
        fi
        ;;
    *)
        echo "backup: BACKUP_TARGET phải là rclone hoặc s3." >&2
        exit 1
        ;;
esac

DB_URL="$(sanitize_database_url "$DATABASE_URL")" || exit 1
PREFIX="${S3_PREFIX:-quanlihocau}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
WEEKLY_KEEP="${BACKUP_WEEKLY_KEEP:-8}"
STAMP="$(TZ=Asia/Ho_Chi_Minh date +%Y-%m-%d)"
DOW="$(TZ=Asia/Ho_Chi_Minh date +%u)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

pg_dump --dbname="$DB_URL" --format=custom --no-owner --no-acl --file="$WORKDIR/dump"
if [ ! -s "$WORKDIR/dump" ]; then
    echo "backup: file dump rỗng, không tải lên và không xóa bản cũ." >&2
    exit 1
fi
if ! pg_restore --list "$WORKDIR/dump" > "$WORKDIR/list"; then
    echo "backup: pg_restore --list thất bại, không tải lên và không xóa bản cũ." >&2
    exit 1
fi
if ! grep -Eq '^[0-9]+;' "$WORKDIR/list"; then
    echo "backup: dump không có mục dữ liệu, không tải lên và không xóa bản cũ." >&2
    exit 1
fi

NAME="daily-${STAMP}.dump.gz"
gzip -c "$WORKDIR/dump" > "$WORKDIR/$NAME"

if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
    age -r "$BACKUP_AGE_RECIPIENT" -o "$WORKDIR/$NAME.age" "$WORKDIR/$NAME"
    rm -f "$WORKDIR/$NAME"
    NAME="$NAME.age"
fi

local_size="$(wc -c < "$WORKDIR/$NAME" | tr -d ' ')"
if [ "$local_size" = "0" ]; then
    echo "backup: file sau nén rỗng, không tải lên." >&2
    exit 1
fi

remote_size() {
    if [ "$TARGET" = "s3" ]; then
        aws s3api head-object \
            --bucket "$S3_BUCKET" \
            --key "$1" \
            --endpoint-url "$S3_ENDPOINT" \
            --query 'ContentLength' \
            --output text
        return
    fi
    rclone lsl "${RCLONE_REMOTE}/$1" --config "$RCLONE_CONFIG" | awk 'NR==1 { print $1; exit }'
}

upload() {
    src="$1"
    key="$2"
    if [ "$TARGET" = "s3" ]; then
        aws s3 cp "$src" "s3://${S3_BUCKET}/${key}" --endpoint-url "$S3_ENDPOINT" --only-show-errors
    else
        rclone copyto "$src" "${RCLONE_REMOTE}/${key}" --config "$RCLONE_CONFIG"
    fi
    got="$(remote_size "$key" || true)"
    if [ -z "$got" ] || [ "$got" != "$local_size" ]; then
        echo "backup: kích thước không khớp, local=${local_size} remote=${got:-không thấy}. Không xóa bản cũ." >&2
        exit 1
    fi
}

if [ "$TARGET" = "s3" ]; then
    upload "$WORKDIR/$NAME" "${PREFIX}/daily/${NAME}"
    if [ "$DOW" = "7" ]; then
        aws s3 cp "s3://${S3_BUCKET}/${PREFIX}/daily/${NAME}" "s3://${S3_BUCKET}/${PREFIX}/weekly/${NAME}" \
            --endpoint-url "$S3_ENDPOINT" --only-show-errors
        got="$(remote_size "${PREFIX}/weekly/${NAME}" || true)"
        if [ -z "$got" ] || [ "$got" != "$local_size" ]; then
            echo "backup: bản weekly không khớp kích thước." >&2
            exit 1
        fi
    fi
else
    upload "$WORKDIR/$NAME" "daily/${NAME}"
    if [ "$DOW" = "7" ]; then
        rclone copyto "${RCLONE_REMOTE}/daily/${NAME}" "${RCLONE_REMOTE}/weekly/${NAME}" --config "$RCLONE_CONFIG"
        got="$(remote_size "weekly/${NAME}" || true)"
        if [ -z "$got" ] || [ "$got" != "$local_size" ]; then
            echo "backup: bản weekly không khớp kích thước." >&2
            exit 1
        fi
    fi
fi

prune() {
    kind="$1"
    keep_days="$2"
    cutoff="$(TZ=Asia/Ho_Chi_Minh date -d "-${keep_days} days" +%Y-%m-%d)"
    if [ "$TARGET" = "s3" ]; then
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "${PREFIX}/${kind}/" \
            --endpoint-url "$S3_ENDPOINT" \
            --query "Contents[].Key" \
            --output text | tr '\t' '\n' | while IFS= read -r key; do
            [ -n "$key" ] || continue
            file_date="$(printf '%s' "$key" | sed -n 's/.*\([0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\).*/\1/p')"
            if [ -n "$file_date" ] && [ "$file_date" \< "$cutoff" ]; then
                aws s3 rm "s3://${S3_BUCKET}/${key}" --endpoint-url "$S3_ENDPOINT" --only-show-errors
            fi
        done
        return
    fi
    rclone lsf "${RCLONE_REMOTE}/${kind}" --config "$RCLONE_CONFIG" | while IFS= read -r name; do
        [ -n "$name" ] || continue
        file_date="$(printf '%s' "$name" | sed -n 's/.*\([0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\).*/\1/p')"
        if [ -n "$file_date" ] && [ "$file_date" \< "$cutoff" ]; then
            rclone deletefile "${RCLONE_REMOTE}/${kind}/${name}" --config "$RCLONE_CONFIG"
        fi
    done
}

prune daily "$RETENTION_DAYS"
prune weekly "$((WEEKLY_KEEP * 7))"
echo "backup: đã đẩy bản ${STAMP} qua ${TARGET}"
