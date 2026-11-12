FROM postgres:18-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl awscli gzip age cron tzdata \
    && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Ho_Chi_Minh
COPY scheduler/entrypoint.sh /entrypoint.sh
COPY scheduler/crontab /etc/qlhc.crontab
COPY scripts/backup.sh /scripts/backup.sh
COPY scripts/subscriptions-cron.sh /scripts/subscriptions-cron.sh
RUN chmod 755 /entrypoint.sh /scripts/backup.sh /scripts/subscriptions-cron.sh
ENTRYPOINT ["/entrypoint.sh"]
