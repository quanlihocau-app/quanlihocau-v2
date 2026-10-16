# MP210 / RPP02N, giấy 58 mm

## Thông số xác nhận từ self-test

MP210, Version 8009(MP210), USB & BT, baud 115200, CMD ESC, tên Bluetooth RPP02N, PIN 0000, giấy 58 mm. Tờ self-test không xác nhận USB serial hay USB printer-class.

## Phần đã triển khai

- Windows USB MP210/PT210 28E9:0289: hỗ trợ native PrintBridge dùng driver USB Microsoft có sẵn, gửi ESC/POS trực tiếp; app cấp quyền và lưu kết nối.
- Windows Bluetooth: chọn cổng bằng Web Serial, gửi ESC/POS thật; tự nối lại một cổng đã được cấp quyền khi mở app, quay lại app hoặc bấm in.
- Chỉ tự nối khi có đúng một cổng đã được cấp quyền và thông tin giao tiếp khớp cấu hình; nhiều máy phải chọn thủ công.
- Android native: nhận một MP210/RPP02N theo tên từ USB hoặc danh sách Bluetooth đã ghép đôi, ưu tiên USB; lưu cấu hình để nối lại.
- Android 12 trở lên: yêu cầu quyền Nearby Devices qua Capacitor. USB dùng đúng device ID, kiểm tra claimInterface và gửi hết dữ liệu khi bulkTransfer chỉ gửi một phần.
- Bỏ mô phỏng kết nối/in thành công. Khổ giấy mặc định vẫn là 58 mm.

## Điều kiện và giới hạn

Web Serial chỉ dùng được với giao tiếp serial/COM (USB serial hoặc Bluetooth Classic SPP); USB printer-class dùng Windows spooler không được hỗ trợ bằng đường này. Baud mặc định 115200 theo ảnh self-test MP210 bản 8009 được cung cấp. Không coi tên MP210 hay firmware 8009 là bằng chứng USB serial.

Lần đầu Windows cần ghép đôi Bluetooth SPP và cấp quyền chọn cổng trong Chrome/Edge. Android cần cho phép Nearby Devices/USB và ghép đôi Bluetooth lần đầu. Quét Android hiện là danh sách đã ghép đôi, không discovery máy chưa ghép đôi. Quyền USB hiện cần thử lại sau khi cho phép. Không có cơ chế tự cập nhật driver.

Kho mã đã có Windows USB PrintBridge và exe tải về; xem windows/print-bridge/README.md. Chưa có dự án Gradle Android đầy đủ/MainActivity đăng ký ThermalPrinterPlugin, nên chưa kiểm chứng plugin Android trên thiết bị. Bản Windows chưa ký số; app production đã triển khai bản cập nhật máy in.

## Kiểm tra

`node --test tests/printing-serial.test.mjs` kiểm tra bytes, chia gói, ngắt kết nối và nối lại an toàn. `npx tsc --noEmit` và ESLint kiểm tra phần TypeScript. Các kiểm tra này không chứng minh máy thật đã in vé.

## Kiểm tra USB thực tế trên PC

Windows nhận thiết bị `USB\VID_28E9&PID_0289\000000000004`, tên bus `micro-printer`, USB class 07 / subclass 01 / protocol 02. Driver đang dùng là `usbprint.inf`, nhà cung cấp Microsoft, trạng thái OK. Có cổng spooler `USB001` (UnknownPrinter) và child `USBPRINT\UNKNOWNPRINTER`. Chưa có print queue cho MP210/PT210.

Đây là USB printer-class, không phải USB serial. Web Serial không hỗ trợ giao tiếp USB của máy này. Không thay driver USB đang hoạt động bằng driver serial/WinUSB. Windows PrintBridge đã mở giao tiếp usbprint.sys và gửi hết bytes vé thử trực tiếp trên thiết bị này, không cần hàng đợi. Người dùng đã xác nhận giấy vé thử chạy ra thành công. Chưa xác nhận in từ app production.

## Vé câu gọn, mục tiêu khoảng 12 cm

Vé mở ca dùng Font B (9 x 17 dots trên máy hỗ trợ ESC/POS), cỡ chữ 1x1, 42 ký tự trên vùng in 48 mm, giãn dòng 24 dots. Đã sửa lỗi cỡ 2x2 của tiêu đề bị giữ lại cho toàn bộ thân vé. Giảm QR từ 4 xuống 3, một dòng footer và một dòng kéo giấy. Giữ mã vé, chòi, gói, khách, giờ vào/hết, tiền đã thu/còn thu và QR; tên/ghi chú dài xuống dòng, không cắt mất nội dung.

Mục tiêu vé thông thường khoảng 12 cm trở xuống; độ dài thực tế phụ thuộc font firmware, số món, tên chòi và ghi chú. Không thêm giấy trắng để cố đủ 12 cm. Đã gửi vé mẫu VE-NGAN-12CM qua USB; chưa nhận số đo thực tế từ người dùng.

Luồng tạo vé thu trước/thu sau và kết thúc ca dùng cấu hình tự in, thử nối lại máy đã lưu, kiểm tra PrintResult và báo lỗi in mà không yêu cầu ghi nhận thanh toán lần nữa. Lệnh in được xếp hàng và job ID thành công được chống trùng trong phiên app. Hai mẫu từ bộ tạo ESC/POS thật (mở ca và kết thúc ca) đã gửi qua USB trên PC. 16 kiểm tra tự động bao gồm luồng, hàng đợi, lỗi, kết nối serial/native Windows và bố cục vé gọn.

### Điều chỉnh cuối theo phản hồi người dùng

Người dùng thấy Font B quá nhỏ, yêu cầu bỏ QR và tăng cỡ chữ. Bản phát hành cuối dùng Font A tiêu chuẩn (32 ký tự trên giấy 58 mm), cỡ 1x1, giãn dòng 26 dots; đã bỏ QR hoàn toàn khỏi vé mở ca, vẫn giữ mã vé dạng chữ. Đã gửi mẫu VE-RO-KHONG-QR qua USB. Nội dung dài vẫn xuống dòng và có thể vượt 12 cm; chưa có số đo chiều dài thực tế của mẫu cuối.

## Phát hành production đã xác nhận

quanlihocau.com đang trỏ đến deployment dpl_6qqhK9GT5isimvFrVL3bF2wj6Mzi (quanlihocau-v2-m9em-bz91fzt9j-huan-tran-v2.vercel.app), trạng thái READY. Domain /api/ping trả 200; /downloads/QuanLiHoCau-PrintBridge.exe trả 200 và SHA256 trùng bản đã build. Link thiết lập được giữ qua chuyển hướng đăng nhập. Build Next.js production, TypeScript, ESLint và 16 kiểm tra in đạt. Chưa tạo giao dịch thử trên dữ liệu khách hàng production; luồng in dùng dữ liệu mẫu và đã gửi vé thật qua USB trên PC.

## Kiểm tra nhận lại USB

Đã triển khai dpl_CUrCjKpNRi9fkL5VJRM7dJjixvXK lên quanlihocau.com. App kiểm tra nền mỗi 5 giây cho MP210 USB đã được thiết lập; mất máy thì cập nhật disconnected, cắm lại thì nối lại. Chủ động ngắt kết nối tạm dừng tự nối. 17 kiểm tra tự động đạt, bao gồm mô phỏng mất/cắm USB và ngắt chủ động.

Người dùng đã rút/cắm lại dây trên PC: số giao tiếp USB thực tế từ 0 về 1, driver Microsoft OK và mở lại được giao tiếp. Trình duyệt kiểm tra đang ở trang đăng nhập; chưa xác nhận badge connected trong phiên app đã đăng nhập. Cập nhật bộ hỗ trợ đang chạy ở LocalAppData chưa hoàn tất vì file đang được dùng và lần thử dừng/chép đè bị approval review chặn. Bộ cũ đang chạy vẫn có giao tiếp USB hoạt động.

## Bản hỗ trợ Windows v2

Đã cập nhật bộ hỗ trợ cục bộ sau khi người dùng cho phép đóng/thay tiến trình cụ thể. Bản v2 dùng trang xác nhận quyền trên localhost thay hộp thoại Windows không xuất hiện; endpoint /approve yêu cầu origin localhost và nonce còn hiệu lực, chống iframe và cache. Kiểm tra native protocol: health 200, không token devices 403, origin không an toàn 403, approve từ trang bên ngoài 403. Dùng ThreadPool để socket chờ không chặn tất cả yêu cầu; kiểm tra health song song socket idle đạt.

Đã phát hành dpl_HCdwrfCHZuFu8qwUwTUEjnGXsEfW lên quanlihocau.com, tệp exe production trùng SHA256 bản build. 17 kiểm tra app đạt. Tab trình duyệt Codex chưa gửi được request đến helper; đang chờ người dùng kiểm tra Chrome/Edge trên PC. Chưa xác nhận connected/in thử từ phiên trình duyệt sau thay v2.
