#!/bin/bash
# cron không đưa biến của container vào job. Ghi env ra file chỉ root đọc,
# crontab source file đó. stdout/stderr của job gắn vào cron (PID 1).
set -euo pipefail

if [ ! -f /etc/qlhc.crontab ]; then
    echo "scheduler: thiếu /etc/qlhc.crontab" >&2
    exit 1
fi

ln -sfn /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime
printf '%s\n' Asia/Ho_Chi_Minh > /etc/timezone

umask 077
install -m 600 /dev/null /run/qlhc.env
while IFS= read -r -d '' assignment; do
    key="${assignment%%=*}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    case "$key" in
        _|SHLVL|PWD|OLDPWD) continue ;;
    esac
    printf 'export %q=%q\n' "$key" "${assignment#*=}" >> /run/qlhc.env
done < <(printenv -0)
chmod 600 /run/qlhc.env

crontab /etc/qlhc.crontab
exec cron -f
