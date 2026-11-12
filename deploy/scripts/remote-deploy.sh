#!/bin/bash
# GitHub Actions đẩy script này qua SSH. Nó chạy trên VPS.
# BUILD_LOCAL=1 thì up.sh build ảnh tại chỗ. Không thì chỉ pull ảnh GHCR.
set -euo pipefail

if [[ -z "${DEPLOY_REF:-}" ]]; then
    echo "remote-deploy: thiếu DEPLOY_REF." >&2
    exit 1
fi

cd /opt/quanlihocau
git fetch --force origin "$DEPLOY_REF"
git checkout --detach "$DEPLOY_REF"

if [[ "${BUILD_LOCAL:-0}" == "1" ]]; then
    export BUILD_LOCAL=1
    exec bash deploy/scripts/up.sh
fi

if [[ -z "${APP_IMAGE:-}" || -z "${SCHEDULER_IMAGE:-}" || -z "${CADDY_IMAGE:-}" ]]; then
    echo "remote-deploy: thiếu tên ảnh. Hoặc đặt BUILD_LOCAL=1." >&2
    exit 1
fi

export APP_IMAGE SCHEDULER_IMAGE CADDY_IMAGE
exec bash deploy/scripts/up.sh
