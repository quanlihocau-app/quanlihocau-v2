# Tự host trên VPS và chuyển dữ liệu từ Neon

Tài liệu này mô tả các lệnh. PR này không chạy các lệnh đó trên máy thật, không đổi DNS, không đụng dữ liệu đang chạy.

Máy đang chạy: Ubuntu 24.04.1, 2 vCPU, khoảng 3,8 GB RAM, 60 GB, Hà Nội. SSH cổng 24700. Hướng dẫn vận hành nằm ở `deploy/README.md`. Ảnh ứng dụng build trên GitHub Actions. Postgres trên VPS là image `postgres:18`, cùng họ với Neon 18.6. VPS không mở được TCP 5432 tới Neon; dump tạo ở máy có mạng tới Neon, restore chạy trên VPS bằng `deploy/scripts/migrate-from-neon.sh`.

## Việc làm một lần trên VPS

1. Cài Docker Engine và plugin Compose. Chỉ SSH bằng khóa. Không mở cổng Postgres.
2. Tạo `/opt/quanlihocau` bằng `git clone` repo. File `.env` chỉ nằm trên máy, copy từ `.env.selfhost.example`, quyền `600`.
3. Thêm secret vào GitHub (mục cuối). Workflow `Deploy VPS` chỉ chạy khi bấm tay.
4. Lần đầu đặt `PRE_DEPLOY_BACKUP=0` vì chưa có bucket. Sau khi backup thử thành công thì đổi thành `1`.

`src/proxy.ts` lấy IP từ phần tử đầu của `X-Forwarded-For`, rồi tới `X-Real-IP`. Caddyfile ghi đè cả hai bằng địa chỉ kết nối thật tới Caddy, để client không tự khai IP. Nếu sau này Cloudflare đứng trước, phải đổi Caddyfile sang `CF-Connecting-IP`. Việc đó chưa làm.

## Chuyển dữ liệu Neon sang Postgres trên VPS

Neon đang là PostgreSQL 18.6, khoảng 19 MB, 28 migration đã áp, khoảng 11 nghìn dòng, kèm bảng demo `playing_with_neon`. Không lấy bảng đó.

VPS không mở được TCP 5432 tới Neon. Máy dev cũng không. Đừng chạy dump từ hai chỗ đó.

Trên một máy có mạng tới Neon:

```bash
NEON_DATABASE_URL='postgresql://...' bash deploy/scripts/migrate-from-neon.sh dump-to /tmp/neon.dump
```

Lệnh dùng `docker run postgres:18` cho `pg_dump` và đếm dòng. Không in URL. Sinh `/tmp/neon.dump` và `/tmp/neon.dump.counts`.

Chép cả hai file lên VPS. Database Postgres 18 trên VPS còn trống:

```bash
bash deploy/scripts/migrate-from-neon.sh restore /tmp/neon.dump
```

`pg_restore` chạy trong container `postgres:18`. Script đối chiếu số dòng từng bảng với file counts, bỏ `playing_with_neon`. Không `--clean`, không xóa database Neon.

Nếu volume cũ được tạo bởi Postgres 17 thì Postgres 18 không mở được. Dùng volume mới, đừng trỏ bản dump vào volume đang có dữ liệu khách.

Sau restore, app tự chạy `prisma migrate deploy` lúc khởi động. Dump đã có bảng `_prisma_migrations` thì lệnh này không thêm gì. Không dùng `--clean`.

## Cắt DNS

Chụp toàn bộ zone trước khi sửa. Hạ TTL của bản ghi sẽ đổi xuống 300 từ hôm trước.

Chỉ đổi:

- `A` của `@` sang IP VPS
- `A` hoặc `CNAME` của `www` sao cho `www` cũng tới VPS

Giữ nguyên mọi bản ghi mail. Kế hoạch nội bộ mô tả `MX` tới `gw.oxmail.vn`, TXT SPF, TXT `_dmarc`, và `CNAME mail`. Tài liệu này không kiểm tra được zone đang sống. Nếu ảnh chụp khác mô tả đó thì giữ đúng ảnh chụp, đừng sửa mail theo đoạn này.

Thống nhất zone đang sửa là ở nhà đăng ký hay ở Cloudflare trước khi ghi. Sửa hai nơi cùng lúc sẽ không biết bản nào đang trả lời.

Caddy tự xin chứng chỉ khi tên miền đã trỏ tới máy và cổng 80/443 mở. Kiểm tra `https://quanlihocau.com/api/health/live` trả `{"ok":true}`. Đường `/api/health` vẫn đòi `CRON_SECRET` và có kiểm tra database.

Quay lại: trỏ lại bản ghi `A` về đích cũ. Dữ liệu mới phát sinh trên VPS thì `pg_dump` trước khi bỏ.

## Backup hằng ngày

Service `scheduler` chạy `deployment/cron/backup.sh` lúc 02:15 giờ Việt Nam. File `daily-YYYY-MM-DD.dump.gz` ghi đè nếu chạy lại trong ngày. Giữ 14 bản ngày và 8 bản tuần khi đích S3 liệt kê được. Đích là bất kỳ API S3 nào. Cloudflare R2 dùng `S3_ENDPOINT` dạng `https://<accountid>.r2.cloudflarestorage.com`, `S3_REGION=auto`.

Khôi phục một bản vào database tạm, không vào database đang phục vụ:

```bash
aws s3 cp "s3://$S3_BUCKET/quanlihocau/daily/daily-YYYY-MM-DD.dump.gz" ./restore.dump.gz --endpoint-url "$S3_ENDPOINT"
gunzip -c restore.dump.gz > restore.dump
docker compose exec -T db createdb -U quanlihocau quanlihocau_restore
docker compose cp restore.dump db:/tmp/restore.dump
docker compose exec -T db pg_restore -U quanlihocau -d quanlihocau_restore --no-owner --no-acl /tmp/restore.dump
```

Xóa database tạm sau khi đối chiếu xong. Không trỏ `DATABASE_URL` của app sang database tạm.

## Rollback ảnh

Trên GitHub, chạy workflow `Deploy VPS`, chọn `rollback`, dán SHA của ảnh cũ. Workflow không chạy khi push. Migration đã áp thì không tự đảo. Chỉ thêm cột, không xóa, nên ảnh cũ vẫn đọc được database mới hơn một bước. Nếu một migration làm hỏng dữ liệu thì khôi phục từ bản `pg_dump` gần nhất, không lăn ảnh cho xong.

## Secret GitHub cho workflow này

Không commit giá trị.

| Tên | Dùng để |
|---|---|
| `SSH_HOST` | IP hoặc tên máy |
| `SSH_USER` | User SSH, không phải root nếu tránh được |
| `SSH_PRIVATE_KEY` | Khóa riêng, cả khối PEM |
| `SSH_PORT` | Cổng SSH của VPS. Bỏ trống thì workflow dùng 24700 |
| `SSH_KNOWN_HOSTS` | Một dòng `ssh-keyscan`. Nên có. Thiếu thì workflow chấp nhận khóa máy lần đầu |

`GITHUB_TOKEN` có sẵn, dùng để đẩy ảnh lên GHCR. Nếu package GHCR để riêng tư, đặt `GHCR_PULL_USER` và `GHCR_PULL_TOKEN` trong `.env` trên VPS, không đặt trong workflow.
