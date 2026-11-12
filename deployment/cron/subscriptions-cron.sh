#!/bin/sh
# Gọi endpoint đánh dấu gói hết hạn. Chạy lại an toàn: server chỉ cập nhật
# hồ còn đúng trạng thái nguồn. Không in secret ra log.
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
    echo "subscriptions-cron: thiếu CRON_SECRET, không gọi." >&2
    exit 1
fi

if [ -z "${APP_BASE_URL:-}" ]; then
    echo "subscriptions-cron: thiếu APP_BASE_URL, không gọi." >&2
    exit 1
fi

BASE="${APP_BASE_URL%/}"
URL="${BASE}/api/cron/subscriptions"

attempt=1
while [ "$attempt" -le 3 ]; do
    status="$(curl --silent --show-error --output /tmp/qlhc-cron-body --write-out "%{http_code}" \
        --max-time 60 \
        --request POST \
        --header "Authorization: Bearer ${CRON_SECRET}" \
        --header "Content-Type: application/json" \
        "$URL" || true)"
    if [ "$status" = "200" ]; then
        echo "subscriptions-cron: ok $(cat /tmp/qlhc-cron-body)"
        rm -f /tmp/qlhc-cron-body
        exit 0
    fi
    echo "subscriptions-cron: lần ${attempt} trả HTTP ${status}" >&2
    attempt=$((attempt + 1))
    sleep 5
done

echo "subscriptions-cron: thất bại sau 3 lần." >&2
rm -f /tmp/qlhc-cron-body
exit 1
