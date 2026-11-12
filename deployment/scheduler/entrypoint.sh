#!/bin/sh
set -eu
if [ ! -f /cron/crontab ]; then
    echo "scheduler: thiếu /cron/crontab" >&2
    exit 1
fi
ln -sfn /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime
printf '%s\n' Asia/Ho_Chi_Minh > /etc/timezone
crontab /cron/crontab
exec cron -f
