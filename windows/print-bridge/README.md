# Hỗ trợ MP210/PT210 USB trên Windows

## Dùng trên máy khách

1. Cắm MP210/PT210 USB, bật nguồn. Thiết bị được hỗ trợ hiện tại: VID 28E9, PID 0289, USB printer class. Windows dùng usbprint.inf của Microsoft; không thay driver bằng WinUSB hoặc driver serial.
2. Tải và mở QuanLiHoCau-PrintBridge.exe từ mục Máy in trong app. Chương trình tự chép vào LocalAppData và tạo shortcut Startup cho tài khoản hiện tại, không yêu cầu admin. Cần Windows x64 có .NET Framework 4.x và quyền người dùng cho phép chạy chương trình.
3. Bộ hỗ trợ tự mở https://quanlihocau.com/settings/printer?setup=windows. App yêu cầu kết nối USB tự động sau đăng nhập. Nếu không mở tự động, vào Máy in và bấm “Kết nối MP210 qua USB Windows”. Cho phép truy cập thiết bị cục bộ nếu trình duyệt hỏi; đồng ý tại hộp thoại hỗ trợ in Windows hiển thị địa chỉ trang app.
4. App lưu quyền và máy in, nối lại khi mở app/quay lại app hoặc trước khi in. USB không yêu cầu tạo hàng đợi máy in: chương trình gửi ESC/POS trực tiếp qua giao tiếp usbprint.sys.

Bản exe hiện chưa ký số; cần ký và kiểm chứng bản phát hành trước khi phân phối rộng. Đây không phải bộ cập nhật driver đa hãng. Bluetooth vẫn dùng đường Web Serial SPP và ghép đôi Windows lần đầu.

## Bảo vệ giao tiếp

Chỉ lắng nghe 127.0.0.1:17858; kiểm tra Host và Origin; chỉ chấp nhận HTTPS hoặc localhost phát triển. Mỗi origin phải được người dùng đồng ý và có token ngẫu nhiên 256 bit. Không in qua GET, không truy cập thiết bị ngoài VID/PID đã xác minh, không tự chọn nếu nhiều máy cùng loại. Không tự in lại sau lỗi gửi một phần.

## Build và kiểm tra

Chạy build.ps1 bằng PowerShell trên Windows x64. Biên dịch nguồn C# bằng compiler .NET Framework có sẵn, xuất vào public/downloads/QuanLiHoCau-PrintBridge.exe. Bản exe được build sẵn để app tải trực tiếp, không cần compiler trên máy khách.

--diagnose chỉ kiểm tra mở giao tiếp USB; --test gửi đúng một vé ASCII kiểm tra. Kết quả ghi vào %LOCALAPPDATA%/QuanLiHoCau/PrintBridge/diagnostic.json. Thành công nghĩa là Windows chấp nhận toàn bộ bytes, không chứng minh giấy đã chạy ra hay máy còn giấy.

Đã mở và gửi vé thử trên thiết bị USB 28E9:0289 đang cắm tại PC này. Người dùng đã xác nhận giấy vé thử chạy ra thành công trên máy MP210/PT210 này. Đã kiểm tra HTTP từ chối origin/token không hợp lệ, CORS preflight và TypeScript adapter. Kiểm tra triển khai production được ghi trong docs/mp210-printing.md.

## Gỡ và cập nhật

Để cập nhật bản hỗ trợ đang chạy, thoát tiến trình QuanLiHoCau-PrintBridge trong Task Manager rồi mở bản exe mới. Hiện chưa có tự cập nhật chương trình; không tự tải/cài driver.

Để gỡ, thoát tiến trình, xóa shortcut QuanLiHoCau PrintBridge.lnk trong shell:startup và thư mục %LOCALAPPDATA%/QuanLiHoCau/PrintBridge. Quyền trang app được lưu trong approvals.json; xóa file này và khởi động lại để thu hồi tất cả quyền.

## Quyền máy in trong bản v2

Thay hộp thoại Windows bằng trang đồng ý http://127.0.0.1:17858/consent được mở bởi bộ hỗ trợ. Trang hiển thị đúng origin yêu cầu; chỉ chấp nhận POST từ origin localhost và nonce ngẫu nhiên còn hiệu lực. Chặn iframe, không cache, không cho trang bên ngoài tự gửi đồng ý qua CORS. Người dùng vẫn phải bấm đồng ý; không tự cấp quyền.

/health trả version 2 trước khi app yêu cầu kết nối, giúp nhận biết bộ hỗ trợ cũ/mất kết nối trong 5 giây. Server xử lý các socket riêng qua ThreadPool, giới hạn 8 kết nối, không để kết nối chờ làm chặn HTTP khác. Chỉ ghi method/path không có query/token để chẩn đoán.

Tab trình duyệt trong Codex chưa gửi request đến bộ hỗ trợ trong kiểm tra thực tế này; cần kiểm tra bằng Chrome/Edge trên PC. Không coi kiểm tra health trực tiếp là bằng chứng đã kết nối từ trình duyệt.
