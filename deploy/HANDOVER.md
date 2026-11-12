# Bàn giao VPS cho Antigravity

Tài liệu này mô tả máy đang chạy và cách đưa một commit lên máy đó. Không có mật khẩu, khóa, token hay chuỗi kết nối database.

PR hạ tầng là [#53](https://github.com/quanlihocau-app/quanlihocau-v2/pull/53), nhánh `cursor/infra-selfhost-vps-7110`. Chưa merge. PR mobile [#52](https://github.com/quanlihocau-app/quanlihocau-v2/pull/52) cũng chưa merge.

## Máy đang chạy

- iNET Cloud Server, IP `103.57.220.60`, Hà Nội.
- Ubuntu 24.04, 2 vCPU, 4 GB RAM, 60 GB đĩa.
- SSH cổng `24700`, user `deploy`, chỉ khóa. Root và đăng nhập bằng mật khẩu đã tắt.
- UFW chỉ mở `24700`, `80`, `443`. Fail2ban theo `ssh.service`. `unattended-upgrades` bật. Swap 2 GB.
- Docker 29 và Compose v5. Log Docker xoay 10 MB, giữ 3 file.
- App nằm ở `/opt/quanlihocau`, owner `deploy`.
- Commit đang chạy trên máy: `f2a32055be6020613bf1a759cc802094fd634ee2`. Đó là nhánh tạm `cursor/trial-merge-ag-infra`: #53 lúc `9da047d` cộng `antigravity/giao-dien` lúc `c2eb284`. Máy chưa chạy HEAD mới của #53.
- HTTP trên IP, chưa có HTTPS tên miền. Ảnh build tại chỗ: `qlhc-local/app`, `qlhc-local/scheduler`, `qlhc-local/caddy`, tag `f2a3205`.
- Trong `.env` trên máy: `SITE_ADDRESS=http://103.57.220.60`. `SITE_WWW=http://localhost` là cách né tạm, không phải cấu hình đúng.
- Container: `db` (`postgres:18`, volume `deploy_pgdata`, bản copy Neon lúc 18:36 cộng 3 migration `20261104*`), `app`, `scheduler`, `caddy`.
- Database tạm, chỉ dữ liệu test, được xóa: `qlhc_selftest`, `qlhc_itest`.
- Backup nằm ở `/opt/quanlihocau/backups-local` và `neon-dumps/neon-20261112-1836.dump`.
- SSH cho Antigravity: Huân gửi public key, rồi thêm vào `authorized_keys` của user `deploy`. Không gửi private key.

## Đưa một commit lên máy

Làm snapshot iNET và backup database trước. Không chạy `prisma migrate reset`. Không chạy `prisma db push`, kể cả `--accept-data-loss`.

```bash
cd /opt/quanlihocau
git fetch origin
git checkout --detach <SHA>
bash deploy/scripts/pre-deploy-check.sh
```

Nếu GHCR đã có ảnh của SHA đó, đặt `APP_IMAGE`, `SCHEDULER_IMAGE`, `CADDY_IMAGE` rồi:

```bash
bash deploy/scripts/up.sh
```

Nếu chưa có ảnh GHCR, build tại máy. Tag là `qlhc-local/app:<sha>`, `qlhc-local/scheduler:<sha>`, `qlhc-local/caddy:<sha>`:

```bash
BUILD_LOCAL=1 bash deploy/scripts/up.sh
```

`up.sh` gọi `prisma migrate deploy` một lần qua lệnh `migrate` của container app, rồi `docker compose up -d --wait`. Compose không build. Ảnh Caddy phải build lại thì entrypoint mới (bỏ www khi `SITE_WWW` trống, và header no-cache) mới có hiệu lực.

## Dump Neon lúc cắt DNS

Chỉ làm khi Huân đồng ý cắt DNS và site đang ngưng ghi. Chạy trên VPS. Đặt URL trong biến của phiên SSH, không echo, không dán vào chat, GitHub hay file git. Script không in URL.

```bash
cd /opt/quanlihocau
umask 077
export NEON_DATABASE_URL   # gán trong shell, không echo
bash deploy/scripts/migrate-from-neon.sh dump-to /opt/quanlihocau/neon-dumps/neon-cutover.dump
unset NEON_DATABASE_URL
```

Database Postgres 18 trên VPS còn trống, hoặc là volume mới:

```bash
bash deploy/scripts/migrate-from-neon.sh restore /opt/quanlihocau/neon-dumps/neon-cutover.dump
```

Script bỏ bảng demo `playing_with_neon`, đối chiếu số dòng từng bảng với file `.counts`, và dừng nếu lệch. Không xóa gì trên Neon. Không dùng cờ xóa object cũ khi restore.

## Việc kiểm sau khi chạy

Danh sách đầy đủ: `docs/CHECKLIST_SAU_DEPLOY.md`.

- `http://103.57.220.60/api/health/live` trả `{"ok":true}` khi còn HTTP theo IP. Sau DNS, kiểm `https://quanlihocau.com/api/health/live` và ổ khóa trình duyệt.
- `/`, `/login`, `/register`, `/bang-gia`, `/thiet-bi-may-in` mở được. Header `Cache-Control` của các trang đó là `private, no-cache`, không còn chỉ `s-maxage=31536000`. File trong `/_next/static/` vẫn cache dài. `/images`, `/icons`, favicon giữ cache của app.
- Đăng nhập mật khẩu, OTP, Google. Google chỉ sau khi sửa callback OAuth.
- Mở vé, để giờ chạy, đóng vé. Tiền giờ và phụ thu khớp, không nhân đôi.
- In vé 58 mm. Dòng gói dài phải xuống dòng, không bị cắt cụt.
- Scheduler sống (`pgrep cron` trong container). Gọi tay cron gói hai lần, lần hai không đổi thêm hồ đã chuyển trạng thái.
- `backup.sh` ghi file local và, khi rclone đã cấu hình, file xuất hiện trên Drive. `restore-test.sh` nạp vào database tạm rồi xóa đúng database tạm.
- Sau DNS và chứng chỉ: `NEXTAUTH_URL=https://quanlihocau.com`. Thêm redirect URI `https://quanlihocau.com/api/auth/callback/google`, chưa xóa URI cũ cho đến khi đăng nhập Google trên tên miền mới thành công.

## Việc đã sửa trong HEAD của #53, và việc máy đang chạy chưa có

HEAD git đã có các sửa sau. Container đang chạy vẫn là `f2a3205`, nên máy thật chưa nhận chúng cho đến lần deploy kế tiếp.

| Việc | Trong HEAD #53 |
|---|---|
| `/login`, `/register`, `/bang-gia`, `/thiet-bi-may-in` bị cache `s-maxage` | Đã sửa: Caddy ghi `private, no-cache` cho mọi đường không phải file tĩnh |
| `backup.sh` giữ bản local và kiểm tra mục trong `rclone.conf` trước khi dump | Đã sửa. `BACKUP_TARGET=local` không tải lên. Bản đã kiểm tra nằm 7 ngày dù tải lên lỗi |
| Không có ảnh GHCR, không có cách build tại VPS | Đã sửa: `BUILD_LOCAL=1` hoặc input `build_local` của workflow |
| `pre-deploy-check.sh` chỉ nói R2 | Đã sửa: backup off-site là rclone/Google Drive hoặc S3/R2 |
| `SITE_WWW` trống vẫn xin chứng chỉ www | Đã sửa: giá trị trống không thêm site www |
| Caddy giới hạn 96 MB | Đã sửa: 192 MB |
| Test tích hợp xóa hồ/chòi khi còn khóa ngoại | Đã sửa: `tests/cleanup-lake.mjs` xóa bảng con trước |
| Test admin thêm chủ hồ thứ hai, đụng `Membership_active_owner_key` | Đã sửa: người dùng mục tiêu là `STAFF` |
| Rate limit 429 khi nhiều test cùng một IP | Đã sửa một phần: `POST /api/test/reset-rate-limits` chỉ khi `ALLOW_TEST_RATE_LIMIT_RESET=1` và `NODE_ENV` khác `production`. Production luôn 404. Process test trên VPS phải đặt hai biến đó |

## Dữ liệu mẫu hồ (`seed-sample-lake`)

Chưa sửa. Nhánh `cursor/sample-lake-flag-7110` không có commit nào hơn `main`. Không có PR.

Hiện `clearSampleSessions` tìm theo tên chứa `Mẫu` hoặc số điện thoại mẫu, nên có thể hủy vé thật. Nó không xóa khu, chòi, gói, sản phẩm, tồn kho, khách mẫu. Hóa đơn nháp của vé mẫu vẫn vào báo cáo ca vì báo cáo lấy hóa đơn không void.

Hướng sửa, chưa làm: thêm cột `isSample` bằng migration chỉ thêm cột (default false, không sửa cột cũ). Lệnh xóa chỉ xóa bản ghi có cờ đó trong đúng một hồ, theo thứ tự khóa ngoại. Mọi truy vấn báo cáo thêm `isSample: false`. Có test: vé thật của khách tên chứa `Mẫu` và khách có số điện thoại mẫu không bị xóa, và không hiện trong báo cáo.

## rclone lên Google Drive

Làm trên máy có trình duyệt. Huân tự đăng nhập Google. Không gửi mật khẩu hay token vào chat.

```bash
rclone authorize "drive" '{"scope":"drive.file"}'
```

Trên VPS, `rclone config`, remote tên `gdrive`, loại `drive`, scope `drive.file`, dán token tại máy. File đặt tại `/opt/quanlihocau/secrets/rclone.conf`, quyền `600`. Remote dùng trong backup: `gdrive:quanlihocau-backups`.

Chạy thử backup trong container scheduler, rồi mở Drive kiểm tra file trong thư mục đó.

## DNS, chỉ sau khi Huân đồng ý

Đổi:

- `A` của `@`: `76.76.21.21` thành `103.57.220.60`.
- `www`: CNAME Vercel thành `A` `103.57.220.60`, hoặc CNAME về `@`.
- Xóa `AAAA` của `@` và `www` nếu có.

Giữ nguyên:

- MX `gw.oxmail.vn`
- SPF `v=spf1 include:_spf.oxmail.vn -all`
- DMARC
- CNAME `mail` về `mail.oxmail.vn`

Sau khi DNS trỏ đúng, sửa `.env`: `SITE_ADDRESS=quanlihocau.com`, `SITE_WWW=www.quanlihocau.com`, rồi khởi động lại Caddy để lấy chứng chỉ Let's Encrypt. Đặt `NEXTAUTH_URL=https://quanlihocau.com`.

## Việc Huân còn làm

- Snapshot iNET trước mỗi lần đổi máy.
- Cấp quyền rclone như trên.
- Duyệt cắt DNS.
- Thêm callback Google OAuth cho tên miền mới.
- Tài khoản Apple và Google Play cho app mobile. Phần đó nằm ở PR #52, chưa merge.
