#!/bin/sh
# SITE_WWW trống thì chỉ có SITE_ADDRESS. Không khai báo host www, không xin chứng chỉ www.
# Thử trên IP: SITE_ADDRESS=http://<ip> và SITE_WWW trống.
set -eu

out=/tmp/Caddyfile
cp /etc/caddy/site.caddy "$out"
address="${SITE_ADDRESS:-quanlihocau.com}"
printf '%s {\n\timport site\n}\n' "$address" >> "$out"
if [ -n "${SITE_WWW:-}" ]; then
    printf '%s {\n\timport site\n}\n' "$SITE_WWW" >> "$out"
fi
exec caddy run --config "$out" --adapter caddyfile "$@"
