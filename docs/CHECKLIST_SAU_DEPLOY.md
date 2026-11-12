# Checklist sau khi site trả lời trên VPS

Làm trên trình duyệt thật, sau khi Caddy đã có chứng chỉ. Chưa làm trên production trong đợt code này.

- [ ] `https://quanlihocau.com/api/health/live` trả `{"ok":true}` và ổ khóa trình duyệt hợp lệ, không cảnh báo chứng chỉ.
- [ ] `www.quanlihocau.com` cũng vào được cùng site.
- [ ] `NEXTAUTH_URL` trên máy là `https://quanlihocau.com`.
- [ ] Google Cloud Console, OAuth client, Authorized redirect URI có `https://quanlihocau.com/api/auth/callback/google`. Nếu URI cũ khác, thêm URI này chứ không xóa URI đang dùng cho đến khi đăng nhập Google trên tên miền mới thành công.
- [ ] Đăng nhập bằng mật khẩu của một tài khoản nhân viên thử.
- [ ] Đăng nhập bằng OTP điện thoại.
- [ ] Đăng nhập bằng Google của chủ hồ.
- [ ] Tạo một vé câu. Giờ vào và giờ hết hiện đúng.
- [ ] Để vé chạy vài phút hoặc đặt giờ vào trong quá khứ trên vé thử, rồi đóng phiên. Tiền giờ và phụ thu khớp đồng hồ, không nhân đôi.
- [ ] In vé khổ 58 mm ra máy in đang dùng ở hồ. Chữ không tràn khổ.
- [ ] Trên điện thoại, thêm màn hình chính (PWA). Tải lại trang sau một bản deploy và thấy bản mới, không kẹt file `sw.js` cũ. Header của trang HTML và `sw.js` là `no-cache, no-store, must-revalidate`.
- [ ] `curl -sI https://quanlihocau.com/_next/static/` của một file hash có `max-age=31536000`.
- [ ] Gửi một webhook ngân hàng thử nếu cổng thanh toán vẫn trỏ tên miền này.
- [ ] Cron gói: gọi tay `POST /api/cron/subscriptions` với `CRON_SECRET`, lần hai không đổi thêm hồ đã chuyển trạng thái.
- [ ] File backup trong ngày đã nằm trên R2 hoặc đích S3 đã cấu hình.

Nếu một mục fail, dừng và xem log `docker compose -f deploy/docker-compose.yml logs --tail=100`. Không chạy lệnh xóa database để "thử lại".
