FROM postgres:18-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl awscli gzip age cron tzdata \
    && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Ho_Chi_Minh
COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
