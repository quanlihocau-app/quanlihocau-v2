# Cắt DNS tại iNET

Chưa có IP máy. Chưa đổi DNS trong đợt này.

Chụp nguyên zone trước khi sửa. Hạ TTL của bản ghi sẽ đổi xuống 300 từ hôm trước.

Chỉ đổi bản ghi web:

- `A` của `@` sang IP VPS
- `A` hoặc `CNAME` của `www` để `www` cũng tới VPS

Giữ nguyên bản ghi thư. Theo kế hoạch nội bộ đó là `MX` tới máy thư oxmail, TXT SPF, TXT `_dmarc`, và `CNAME mail`. Zone đang sống chưa được đọc lại trong đợt này. Nếu ảnh chụp khác danh sách đó thì giữ đúng ảnh chụp, không sửa thư theo đoạn này.

Sửa một nơi quản lý DNS. Đừng ghi cùng lúc ở iNET và ở Cloudflare.

Quay lại: trỏ lại `A` của `@` và `www` về đích cũ. Không đụng `MX`, SPF, DMARC, `CNAME mail`.
