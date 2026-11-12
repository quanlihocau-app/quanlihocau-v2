#!/bin/bash
# GitHub Actions đẩy script này qua SSH. Nó chạy trên VPS và chỉ pull ảnh.
set -euo pipefail

if [[ -z "${DEPLOY_REF:-}" || -z "${APP_IMAGE:-}" || -z "${SCHEDULER_IMAGE:-}" || -z "${CADDY_IMAGE:-}" ]]; then
    echo "remote-deploy: thiếu DEPLOY_REF hoặc tên ảnh." >&2
    exit 1
fi

cd /opt/quanlihocau
git fetch --force origin "$DEPLOY_REF"
git checkout --detach "$DEPLOY_REF"
export APP_IMAGE SCHEDULER_IMAGE CADDY_IMAGE
exec bash deploy/scripts/up.sh
