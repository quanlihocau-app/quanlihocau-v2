#!/bin/sh
# pg_dump hằng ngày lên đích tương thích S3 (Cloudflare R2 hoặc tương đương).
# Cùng một ngày thì ghi đè đúng một file. Không in URL hay khóa ra log.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
    echo "backup: thiếu DATABASE_URL." >&2
    exit 1
fi
if [ -z "${S3_BUCKET:-}" ] || [ -z "${S3_ACCESS_KEY_ID:-}" ] || [ -z "${S3_SECRET_ACCESS_KEY:-}" ] || [ -z "${S3_ENDPOINT:-}" ]; then
    echo "backup: thiếu S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY hoặc S3_ENDPOINT." >&2
    exit 1
fi

export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
unset AWS_SESSION_TOKEN || true

PREFIX="${S3_PREFIX:-quanlihocau}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
WEEKLY_KEEP="${BACKUP_WEEKLY_KEEP:-8}"
STAMP="$(TZ=Asia/Ho_Chi_Minh date +%Y-%m-%d)"
DOW="$(TZ=Asia/Ho_Chi_Minh date +%u)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

NAME="daily-${STAMP}.dump.gz"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl | gzip -c > "$WORKDIR/$NAME"

if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
    age -r "$BACKUP_AGE_RECIPIENT" -o "$WORKDIR/$NAME.age" "$WORKDIR/$NAME"
    rm -f "$WORKDIR/$NAME"
    NAME="$NAME.age"
fi

aws s3 cp "$WORKDIR/$NAME" "s3://${S3_BUCKET}/${PREFIX}/daily/${NAME}" \
    --endpoint-url "$S3_ENDPOINT" --only-show-errors

if [ "$DOW" = "7" ]; then
    aws s3 cp "s3://${S3_BUCKET}/${PREFIX}/daily/${NAME}" "s3://${S3_BUCKET}/${PREFIX}/weekly/${NAME}" \
        --endpoint-url "$S3_ENDPOINT" --only-show-errors
fi

prune() {
    kind="$1"
    keep_days="$2"
    cutoff="$(TZ=Asia/Ho_Chi_Minh date -d "-${keep_days} days" +%Y-%m-%d)"
    aws s3api list-objects-v2 \
        --bucket "$S3_BUCKET" \
        --prefix "${PREFIX}/${kind}/" \
        --endpoint-url "$S3_ENDPOINT" \
        --query "Contents[].Key" \
        --output text 2>/dev/null | tr '\t' '\n' | while IFS= read -r key; do
        [ -n "$key" ] || continue
        file_date="$(printf "%s" "$key" | sed -n 's/.*\([0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\).*/\1/p')"
        if [ -n "$file_date" ] && [ "$file_date" \< "$cutoff" ]; then
            aws s3 rm "s3://${S3_BUCKET}/${key}" --endpoint-url "$S3_ENDPOINT" --only-show-errors
        fi
    done
}

prune daily "$RETENTION_DAYS"
prune weekly "$((WEEKLY_KEEP * 7))"
echo "backup: đã đẩy bản ${STAMP}"
