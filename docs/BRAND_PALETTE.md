# Quản Lí Hồ Câu — Bảng màu thương hiệu

Hướng thiết kế: **Sổ hồ câu**. Giấy sáng, xanh hồ dịu, chữ mực đậm; nền phía sau chữ thường để trong suốt. Dùng màu theo vai trò, không chọn màu ngẫu nhiên cho từng trang.

Nguồn dùng chung: `src/styles/brand-tokens.css`. Landing mới sử dụng các biến này; các màn hình nghiệp vụ chưa được tự động đổi màu.

- `--brand-primary` **#24684F**: nút chính, liên kết quan trọng, trạng thái bình thường.
- `--brand-primary-hover` **#1B523E**: trạng thái trỏ/chạm nút chính.
- `--brand-on-primary` **#FFFFFF**: chữ trên nút xanh.
- `--brand-header` **#E5F3E9**: nền tiêu đề và vùng giới thiệu.
- `--brand-background` **#F8FAF4**: nền app/trang giới thiệu.
- `--brand-paper` **#FFFEF9**: trang sổ, biểu mẫu và bề mặt nội dung.
- `--brand-ink` **#203D32**: chữ chính, tên hồ, tiêu đề, số tiền.
- `--brand-muted` **#53665A**: mô tả và nhãn phụ; không giảm opacity chữ quan trọng.
- `--brand-border` **#D6E2D6**: đường phân vùng.
- `--brand-rule` **#D9E5EF**: dòng kẻ sổ, nằm bên dưới chữ.
- `--brand-margin` **#E6B8A8**: lề sổ trang trí.
- `--brand-warning` **#805313**, nền **#FFF2D8**: lưu ý cần đọc.
- `--brand-danger` **#B42318**, nền **#FFF1ED**: lỗi và cảnh báo thời gian cần xử lý; luôn có nhãn chữ đi kèm.

Chữ dùng Arial/system sans-serif, tiêu đề/nút/số liệu đậm. Nội dung thường từ 16px; chữ phụ từ 12px. Số tiền canh phải, chữ số có độ rộng đều; không đổi công thức tính tiền hoặc ngưỡng cảnh báo khi áp dụng màu.

## Phạm vi và kiểm chứng

- Landing có nội dung ngắn, nút đăng ký/đăng nhập dùng route hiện hữu và thời gian dùng thử lấy từ `TRIAL_DAYS`.
- Người đã đăng nhập vẫn đi vào `/sessions`. Không thay đổi cookie, quyền, database hoặc cách tính giờ.
- Giao diện mẫu trên landing là dữ liệu minh họa, không đọc dữ liệu khách thật.
- Trang Sites dùng để xem trước; không đồng nghĩa đã triển khai app tại quanlihocau.com.

## Điện thoại và ngoài trời

- Giữ bảng màu thương hiệu ở chế độ thường. Nút **☀ Ngoài trời** trên đầu app chuyển sang nền trắng, chữ đậm, viền rõ và xanh đậm `#166534` để tăng tương phản; cảnh báo đỏ vẫn giữ nguyên ý nghĩa.
- Ngoài trời dùng chữ phụ từ 13px; tabbar có đủ 5 mục, chữ 12px (13px ngoài trời), vùng cao tối thiểu 60px. Nút ngoài trời và trợ giúp có vùng chạm tối thiểu 44px.
- Cho phép phóng to bằng cử chỉ trên điện thoại. Biểu mẫu vẫn dùng chữ 16px, không khóa khả năng phóng to.
- Landing xếp nút theo chiều dọc ở màn hình hẹp; tên hồ, nhãn và số tiền được phép xuống dòng. Dòng kẻ sổ luôn nằm dưới nội dung.
- Kiểm tra trình duyệt bằng bản dựng tĩnh từ thành phần app thật với dữ liệu minh họa, không truy cập database. Khả năng nhìn dưới nắng cần kiểm tra tiếp trên thiết bị thật vì còn phụ thuộc độ sáng và độ phản chiếu màn hình.
