# Triển khai trên iNET — Ubuntu 24.04.1, 2 vCPU, khoảng 3,8 GB RAM, 60 GB

Máy đang dùng: **Ubuntu 24.04.1**, 2 vCPU, khoảng 3,8 GB RAM, 60 GB đĩa, đặt tại **Hà Nội**. SSH nghe cổng **24700**, không phải 22. Agent giám sát **OneDash** của iNET đã cài và phải được giữ nguyên: script harden không stop, không disable, không gỡ unit của agent đó.

Ảnh ứng dụng, ảnh Caddy và ảnh lịch được build trên GitHub Actions rồi đẩy lên GHCR. VPS chỉ `docker compose pull`. File `deploy/docker-compose.yml` không có khối `build`.

## Ngân sách nhớ trên máy khoảng 3,8 GB

OneDash và Ubuntu cần phần RAM còn lại. Hạn mức container cộng khoảng 1,9 GB:

| Service | Hạn mức |
|---|---|
| Postgres | 640 MB, `shared_buffers=128MB`, tối đa 40 kết nối |
| Next.js | 896 MB |
| Caddy | 96 MB |
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
6. Nếu chuyển dữ liệu từ Neon: `bash deploy/scripts/migrate-from-neon.sh` khi database cục bộ còn trống. Script không xóa gì trên Neon.
7. Trên GitHub, bấm workflow **Deploy VPS**. Workflow không chạy khi push. Secret `SSH_PORT` để trống thì workflow dùng 24700.

`up.sh` dùng `docker compose up -d --wait --no-build`. Thiếu ảnh thì dừng, không build tại chỗ.

## Cache

Caddy đặt `Cache-Control: no-cache, no-store, must-revalidate` cho `index.html`, file `.html`, `sw.js`, `service-worker.js`, và mọi đường không nằm trong `/_next/static/`. Chỉ file trong `/_next/static/` (trừ service worker) nhận `public, max-age=31536000, immutable`.

## Việc cấm

- `prisma migrate reset`
- `prisma db push`, kể cả `--accept-data-loss`
- `pg_restore --clean` vào database đang phục vụ
- Build `next build` hoặc `docker build` trên VPS

Entrypoint từ chối đối số `reset` và `push`.

## Sau khi chạy

Đối chiếu `docs/CHECKLIST_SAU_DEPLOY.md` và `deploy/docs/CAT_DNS.md`. Backup hằng ngày lúc 02:15 giờ Việt Nam. Thử khôi phục bằng `deploy/scripts/restore-test.sh` vào database tạm `quanlihocau_restore_test`, rồi script xóa đúng database tạm đó.
