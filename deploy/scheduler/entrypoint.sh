#!/bin/sh
set -eu
if [ ! -f /etc/qlhc.crontab ]; then
    echo "scheduler: thiếu /etc/qlhc.crontab" >&2
    exit 1
fi
ln -sfn /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime
printf '%s\n' Asia/Ho_Chi_Minh > /etc/timezone
crontab /etc/qlhc.crontab
exec cron -f
