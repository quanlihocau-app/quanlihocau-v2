                                                                                      # Đánh giá SaaS — 04/11/2026

## Kết luận

Dự án đã được xây dựng theo mô hình SaaS chuyên ngành hồ câu, có bản build production thành công. Chưa đủ bằng chứng để kết luận sẵn sàng mở bán tự phục vụ trên diện rộng. Cần sửa các điểm dưới đây và kiểm chứng trên staging trước khi pilot trả phí.

Phạm vi: rà soát cấu trúc, schema, xác thực và tenant context, phân quyền, gói cước, đăng ký, đơn thuê bao, webhook, quota, CI và tài liệu vận hành; chạy kiểm tra local an toàn. Không phải chứng nhận bảo mật toàn bộ từng dòng mã, không kiểm tra trực tiếp production và không kết nối database thật.

## Kết quả kiểm tra thực hiện hôm nay

- `npm run build:isolated`: đạt, bao gồm TypeScript. Database và bí mật tích hợp được thay bằng cấu hình cô lập. Chưa chứng minh truy vấn thật chạy được. Build có log cảnh báo cookie không giải mã được khi prerender, không làm build thất bại; cần phân biệt với lỗi cookie thực tế trên trình duyệt.
- `npm run test:safety`: 102/102 đạt, 0 bỏ qua. Phần lớn là unit/mock và kiểm tra mã nguồn, không thay thế kiểm thử database/API thật.
- `npm run lint`: đạt với 0 lỗi, 27 cảnh báo (ảnh, font, any và effect).
- `npm run test:guest-navigation`: 138 kiểm tra GET đạt. Không kiểm tra đăng nhập hay ghi dữ liệu.
- Chưa chạy integration vì các suite có tạo/xóa fixture và cần môi trường database riêng được xác nhận.

## Các thành phần SaaS đã có

- Nhiều khách hàng: Organization, Lake, Membership; dữ liệu nghiệp vụ gắn lakeId. Tenant context lấy hồ và quyền từ phiên; có kiểm tra ID liên quan thuộc hồ trong tenant-scope.ts. Có nền tảng cách ly, chưa chứng minh mọi endpoint chống truy cập chéo bằng E2E.
- Tài khoản: đăng ký điện thoại/mật khẩu, Google OAuth trong mã nguồn, transaction onboarding và dữ liệu mẫu, quản lý nhân viên và phiên.
- Phân quyền: OWNER, MANAGER, STAFF, SUPER_ADMIN; trang quản trị tài khoản/hồ/đơn, hỗ trợ truy cập hồ.
- Thương mại: dùng thử 30 ngày, Bạc 129.000đ/30 ngày, Vàng 199.000đ/30 ngày; chu kỳ năm; đơn gia hạn và VietQR; webhook ngân hàng và xác nhận thủ công có audit.
- Vòng đời thuê bao: hạn dùng, ân hạn 3 ngày, khóa ghi sau ân hạn, đường gia hạn vẫn được phép, endpoint cron cập nhật trạng thái.
- Nghiệp vụ: phiên câu, gia hạn, hóa đơn, thanh toán/hoàn tiền, hàng hóa, thu mua cá, quỹ/công nợ, báo cáo, chốt ca và in.
- Có CI và migration được quản lý trong repo.

SaaS không bắt buộc phải tự động trừ tiền thẻ. Gia hạn bằng chuyển khoản vẫn là SaaS; vấn đề cần hoàn thiện ở đây là độ đúng và độ tin cậy khi vận hành.

## Các phát hiện cần xử lý

### 1. Cao — ràng buộc nhân sự mâu thuẫn với gói dịch vụ

`prisma/schema.prisma:226` khai báo `@@unique([lakeId, role])`. Nó giới hạn mỗi hồ tối đa một STAFF và một MANAGER, không chỉ giới hạn OWNER như chú thích. Gói Vàng lại công bố không giới hạn nhân sự trong `src/lib/vietqr.ts`. Migration mới nhất còn ghi chỉ dẫn tạo unique index này bằng tay. Nếu database áp dụng ràng buộc, thêm STAFF thứ hai sẽ bị chặn; nếu chưa áp dụng, schema và database có khả năng lệch nhau. Chưa xác nhận trạng thái index trên database đang chạy. Cần thiết kế lại ràng buộc chủ hồ, migration không mất dữ liệu và kiểm tra thêm nhiều nhân viên cùng vai trò.

### 2. Cao — webhook gia hạn chưa đồng bộ mức bảo vệ với xác nhận thủ công

`src/app/api/webhooks/bank/route.ts` đọc đơn, bỏ qua khi PAID, rồi update theo id; không khóa hàng đơn/hồ và không chuyển trạng thái có điều kiện PENDING. Luồng thủ công trong `src/lib/services/manual-subscription-confirm.service.ts` đã có FOR UPDATE và updateMany theo trạng thái. Suy luận từ mã: webhook đồng thời với webhook/duyệt tay có thể tạo audit trùng hoặc ghi đè hạn; hai đơn khác nhau cùng hồ có thể làm mất một lần cộng thời hạn. Trạng thái khác PAID cũng không bị từ chối rõ ràng. Cần thống nhất dịch vụ kích hoạt và kiểm thử đồng thời trên PostgreSQL; đây chưa phải lỗi đã tái hiện bằng database trong phiên này.

### 3. Vừa — giới hạn gói có thể bị vượt khi tạo đồng thời

`src/lib/subscription-guard.ts` đếm nhân sự/chòi trước khi route tạo bản ghi, không có khóa chung với thao tác tạo. Hai yêu cầu có thể cùng thấy còn một chỗ rồi cùng tạo. Cần kiểm tra quota nguyên tử cho cả đường tạo chòi và nhân viên.

### 4. Cao về phát hành — CI chưa chạy kiểm thử tích hợp nghiệp vụ

`.github/workflows/ci.yml` dựng PostgreSQL, migrate, chạy safety/lint/typecheck/build và guest navigation nhưng không chạy `test:integration` hay các suite API thuê bao/đối soát. CI xanh hiện tại không chứng minh dòng tiền, phân quyền chéo hồ, đăng ký thật hoặc nâng cấp database đúng. Chưa kiểm tra trạng thái CI từ xa.

### 5. Chưa kiểm chứng — vận hành và phục hồi

`docs/SAAS_RELEASE_PLAN.md` và `docs/AUTH_STAGING_VERIFICATION.md` vẫn để các tiêu chí staging, OAuth thật, cách ly tenant, backup/restore và máy in thật chưa hoàn tất. Không thể kết luận hạ tầng không có backup hay giám sát chỉ từ repo; cần bằng chứng từ môi trường triển khai. `/api/ping` chỉ trả thời gian, không kiểm tra sức khỏe database. Có endpoint cron nhưng chưa xác nhận lịch gọi thực tế, cấu hình webhook hay cảnh báo lỗi production.

## Thứ tự hoàn thiện đề xuất

1. Sửa ràng buộc nhân sự và thống nhất kích hoạt thuê bao có khóa/điều kiện; bổ sung kiểm thử đồng thời cho quota.
2. Chuẩn bị database staging riêng; xác nhận schema/migration không mất dữ liệu và kiểm thử khôi phục.
3. Chạy đăng ký/Google/nhân viên, hai hồ cách ly, vòng đời thuê bao và trọn luồng tiền/in; đưa integration phù hợp vào CI.
4. Xác nhận cấu hình webhook, lịch cron, giám sát, backup; thử nghiệm có hỗ trợ với 3–5 hồ rồi quyết định mở bán rộng.

Không thay đổi mã nghiệp vụ, schema, tài khoản, dữ liệu hay triển khai production trong lần rà soát này.
