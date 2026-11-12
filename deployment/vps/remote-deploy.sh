#!/bin/bash
echo "Đường deploy đã chuyển sang deploy/scripts/remote-deploy.sh" >&2
exec bash "$(dirname "$0")/../../deploy/scripts/remote-deploy.sh"
