# Triển khai trên iNET — Ubuntu 24.04.1, 2 vCPU, khoảng 3,8 GB RAM, 60 GB

Máy đang dùng: **Ubuntu 24.04.1**, 2 vCPU, khoảng 3,8 GB RAM, 60 GB đĩa, đặt tại **Hà Nội**. SSH nghe cổng **24700**, không phải 22. Agent giám sát **OneDash** của iNET đã cài và phải được giữ nguyên: script harden không stop, không disable, không gỡ unit của agent đó.

Ảnh ứng dụng, ảnh Caddy và ảnh lịch được build trên GitHub Actions rồi đẩy lên GHCR. VPS chỉ `docker compose pull`. File `deploy/docker-compose.yml` không có khối `build`.

## Ngân sách nhớ trên máy khoảng 3,8 GB

OneDash và Ubuntu cần phần RAM còn lại. Hạn mức container cộng khoảng 1,9 GB:

| Service | Hạn mức |
|---|---|
| Postgres | 640 MB, `shared_buffers=128MB`, tối đa 40 kết nối |
| Next.js | 896 MB |
| Caddy | 192 MB |
| Lịch backup và cron gói | 256 MB |

`harden.sh` tạo swap 2 GB nếu máy chưa có swap. Nếu swap đã có thì không tạo thêm. Swap không thay cho việc giữ hạn mức.

Postgres chỉ gắn mạng `data` với `internal: true` và không có `ports`. Từ Internet không mở được cổng 5432.

## Harden

Phần user `deploy`, UFW, Fail2ban, swap và Docker có thể đang được làm trực tiếp trên máy. `deploy/scripts/harden.sh` chạy lại được, không `ufw reset`, không đổi cổng SSH trong `sshd_config`.

```bash
sudo bash deploy/scripts/harden.sh /đường/dẫn/deploy.pub 24700
```

Bỏ trống đối số cổng thì dùng 24700. Script mở cổng đó, rồi 80 và 443, rồi mới `ufw enable`.

## Thứ tự khi đã có IP

1. Phần harden cơ bản (user `deploy`, UFW, Fail2ban, swap, Docker) có thể đã làm trên máy. Nếu chạy lại script thì `sudo bash deploy/scripts/harden.sh /đường/dẫn/deploy.pub 24700`. Không đụng OneDash.
2. `git clone` repo vào `/opt/quanlihocau`.
3. Đăng nhập `ssh -p 24700 deploy@<ip>` bằng khóa. Script chỉ tắt mật khẩu SSH sau khi thấy đăng nhập khóa thành công.
4. Copy `.env.selfhost.example` thành `/opt/quanlihocau/.env`, `chmod 600`.
5. Chụp snapshot iNET. Chạy `bash deploy/scripts/pre-deploy-check.sh`.
6. Neon là PostgreSQL 18.6. VPS mở được cổng 5432 tới Neon, nên chạy dump ngay trên VPS: `NEON_DATABASE_URL=... bash deploy/scripts/migrate-from-neon.sh dump-to /tmp/neon.dump` (image `postgres:18`, bỏ bảng demo `playing_with_neon`). Database cục bộ còn trống thì `bash deploy/scripts/migrate-from-neon.sh restore /tmp/neon.dump`. Nếu stack đang dùng file compose phụ, đặt `COMPOSE_FILES` để lệnh này không tạo lại container database với cấu hình khác. Script đối chiếu số dòng từng bảng. Không xóa gì trên Neon. Volume Postgres 18 gắn tại `/var/lib/postgresql`, không phải `/var/lib/postgresql/data`.
7. Trên GitHub, bấm workflow **Deploy VPS**. Workflow không chạy khi push. Secret `SSH_PORT` để trống thì workflow dùng 24700. Nếu GHCR chưa có ảnh, bật input `build_local` hoặc trên VPS chạy `BUILD_LOCAL=1 bash deploy/scripts/up.sh`. Lệnh đó build bằng Dockerfile trong repo và gắn tag `qlhc-local/app:<sha>`, `qlhc-local/scheduler:<sha>`, `qlhc-local/caddy:<sha>`.

`up.sh` mặc định `docker compose pull` rồi `up -d --wait --no-build`. `BUILD_LOCAL=1` là đường dự phòng khi thiếu ảnh GHCR. Compose không có khối `build`.

## Cache

Trang prerender như `/login`, `/register`, `/bang-gia`, `/thiet-bi-may-in` do Next gửi `Cache-Control: s-maxage=31536000`. Caddy đè thành `private, no-cache` cho mọi đường không phải file tĩnh. `/_next/static` (trừ service worker) nhận `public, max-age=31536000, immutable`. `/images`, `/icons` và favicon giữ header cache của app.

## Site và www

`SITE_WWW` trống thì Caddy không khai báo host www và không xin chứng chỉ www. Thử trên IP, chưa có DNS: `SITE_ADDRESS=http://<ip-vps>` và `SITE_WWW=` (để trống) để chỉ nghe HTTP.

## Backup ra khỏi VPS

Mặc định dùng rclone lên Google Drive, thư mục `quanlihocau-backups`. S3/R2 vẫn dùng được khi `BACKUP_TARGET=s3`.

Giữ 14 bản ngày và 8 bản tuần trên remote. Mọi bản đã qua `pg_restore --list` còn nằm ở `/opt/quanlihocau/backups` 7 ngày, kể cả khi tải lên thất bại. `BACKUP_TARGET=local` thì không tải lên. Script kiểm tra mục remote trong `rclone.conf` trước khi dump. Dump rỗng hoặc `pg_restore --list` thất bại thì không tải lên và không xóa bản cũ. Tham số `schema=public` của Prisma được bỏ trước `pg_dump`.

### Cấp quyền Google Drive

Làm trên máy có trình duyệt của chính chủ hồ. Không gửi mật khẩu Google, không gửi token rclone vào chat, email hay GitHub.

1. Cài rclone trên máy đó.
2. Chạy đúng lệnh này (scope `drive.file`, chỉ file do rclone tạo):

```bash
rclone authorize "drive" '{"scope":"drive.file"}'
```

3. Đăng nhập Google trong trình duyệt do lệnh mở ra. Lệnh in một đoạn token trên máy đó.
4. Trên VPS, chạy `rclone config`. Remote đặt tên `gdrive`, loại `drive`, scope `drive.file`, auto config chọn không, rồi dán token ngay trên VPS.
5. Đưa file cấu hình vào chỗ compose đọc, quyền chỉ chủ máy:

```bash
mkdir -p /opt/quanlihocau/secrets
install -m 600 ~/.config/rclone/rclone.conf /opt/quanlihocau/secrets/rclone.conf
```

File này bị gitignore. Trong `.env`:

```bash
BACKUP_TARGET=rclone
RCLONE_REMOTE=gdrive:quanlihocau-backups
```

Compose gắn file đó read-only vào `/etc/rclone/rclone.conf`.

## Việc cấm

- `prisma migrate reset`
- `prisma db push`, kể cả `--accept-data-loss`
- `pg_restore --clean` vào database đang phục vụ
- Build `next build` hoặc `docker build` trên VPS

Entrypoint từ chối đối số `reset` và `push`. `up.sh` chạy `migrate` một lần trước khi bật app. Lệnh khác với `serve` không chạy migration. `RUN_MIGRATIONS=1` chỉ có tác dụng khi lệnh là `serve`.

## Sau khi chạy

Đối chiếu `docs/CHECKLIST_SAU_DEPLOY.md` và `deploy/docs/CAT_DNS.md`. Backup hằng ngày lúc 02:15 giờ Việt Nam. Thử khôi phục bằng `deploy/scripts/restore-test.sh` vào database tạm `quanlihocau_restore_test`, rồi script xóa đúng database tạm đó.
