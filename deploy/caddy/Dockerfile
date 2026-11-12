FROM caddy:2-alpine
RUN apk add --no-cache wget ca-certificates
COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
