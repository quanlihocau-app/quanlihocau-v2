#!/bin/bash
# Việc làm tay trước khi đổi ảnh trên VPS. Script này không deploy và không đụng database.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "1. Trên trang iNET, chụp snapshot máy trước."
echo "2. Chạy backup database (deploy/scripts/backup.sh trong container lịch, hoặc đợi cron 02:15) và kiểm tra bản off-site (rclone/Google Drive hoặc S3/R2)."
echo "3. Đọc migration mới trong prisma/migrations. Chỉ được prisma migrate deploy."
echo "4. Cấm prisma migrate reset và prisma db push --accept-data-loss."

hits="$(grep -RInE 'prisma migrate reset|db push --accept-data-loss|prisma db push' \
    --include='*.sh' --include='*.yml' --include='Dockerfile*' \
    --exclude=pre-deploy-check.sh \
    deploy Dockerfile .github/workflows || true)"
if [[ -n "$hits" ]]; then
    echo "pre-deploy-check: thấy lệnh phá dữ liệu:" >&2
    printf '%s\n' "$hits" >&2
    exit 1
fi

if ! grep -q 'migrate deploy' deployment/docker/docker-entrypoint.sh; then
    echo "pre-deploy-check: entrypoint không gọi migrate deploy." >&2
    exit 1
fi

echo "pre-deploy-check: không thấy migrate reset hay db push trong đường deploy. Có thể bấm workflow khi snapshot và backup đã xong."
