# Kế hoạch hoàn thiện và đưa Quản Lý Hồ Câu ra bán

## Mục tiêu

Đưa sản phẩm hiện có tới một nhóm hồ câu trả phí sớm, giảm rủi ro sai lệch dữ liệu/tiền và không làm gián đoạn tài khoản, hồ, khách hàng, nhân viên hay lịch sử hiện hữu.

## Đợt 0 — Sửa các điểm chặn onboarding (đang thực hiện)

- [x] Đăng ký bằng số điện thoại không tự đánh dấu số là đã xác minh khi OTP chưa được xác nhận.
- [x] Khởi tạo dữ liệu mẫu của tài khoản Google mới trong cùng transaction tạo tài khoản/hồ; seed lỗi sẽ rollback thay vì để hồ mới trống.
- [x] Sửa test mở vé nhanh để kiểm tra kích thước touch target hiện tại, không phụ thuộc chuỗi class cũ.
- [x] Kiểm thử unit và luồng ngoài trời/mở vé nhanh.
- [ ] Chạy kiểm thử signup và luồng vận hành trên staging riêng.

**Tiêu chí hoàn tất:** signup mới bằng điện thoại và Google không tạo hồ thiếu dữ liệu; không có trạng thái số điện thoại “đã xác minh” giả; mẫu chỉ được tạo cho hồ mới và rollback cùng tài khoản nếu seed thất bại.

## Đợt 1 — Kiểm chứng trước khi thu tiền khách thật

Chỉ dùng staging với database riêng, tài khoản và dữ liệu tổng hợp.

- [ ] Kiểm thử đăng ký, đăng nhập bằng số điện thoại, Google OAuth, đăng nhập nhân viên và cấp quyền.
- [ ] Chạy trọn luồng: mở vé nhanh → thêm hàng → gia hạn → thu mua cá (nếu dùng) → kết thúc → thanh toán/hoàn tiền → in bill.
- [ ] Chạy chốt ca: tiền đầu ca, tiền mặt, chuyển khoản, chi phí, lệch quỹ, lý do lệch, ký nhận và in 58mm.
- [ ] Kiểm tra retry/double-click, hai nhân viên cùng thao tác, mất mạng, mạng hồi phục, máy in hết giấy và webhook chuyển khoản.
- [ ] Đối chiếu số liệu giữa hóa đơn, thanh toán, báo cáo ngày và ca; xác nhận tenant A không đọc/ghi được hồ tenant B.
- [ ] Xác nhận sao lưu và khôi phục database từ nhà cung cấp trước khi nhận dữ liệu khách thật.
- [ ] Đối chiếu trang giá website đang chạy với repo; hiện repo ghi dùng thử 30 ngày, Bạc 129.000đ/tháng, Vàng 199.000đ/tháng. Không đổi giá cho tới khi chủ sản phẩm xác nhận.

**Tiêu chí hoàn tất:** các luồng trên chạy qua trên staging; số tiền và trạng thái khớp; không có dữ liệu production dùng làm fixture; có bản sao lưu và quy trình khôi phục đã xác nhận.

## Đợt 2 — Pilot có hỗ trợ

- [ ] Mời 3–5 hồ câu dùng thật theo nhóm nhỏ; hỗ trợ cấu hình bảng giá, sơ đồ chòi, hàng hóa và máy in.
- [ ] Theo dõi: hoàn tất phiên đầu, tỷ lệ dùng lại trong tuần đầu, phiên/thu tiền bị lỗi, sai lệch chốt ca, yêu cầu hỗ trợ và tỷ lệ chuyển trả phí.
- [ ] Sửa lỗi ảnh hưởng mở vé, thu tiền, đối soát, in và onboarding trước các yêu cầu tính năng mới.
- [ ] Lấy phản hồi về giá/gói từ khách; giữ giá ổn định trong pilot để đo đúng nguyên nhân rời bỏ.

**Tiêu chí hoàn tất:** nhóm pilot có thể tự vận hành sau onboarding; không còn lỗi nghiêm trọng về tiền/dữ liệu; có khách xác nhận trả phí và có số liệu hỗ trợ để ước tính chi phí phục vụ mỗi hồ.

## Đợt 3 — Mở bán rộng và tăng trưởng

- [ ] Đồng bộ thông tin giá, thời gian dùng thử, quyền lợi và hướng dẫn trên website, app, metadata và tài liệu hỗ trợ.
- [ ] Chuẩn hóa onboarding tự phục vụ và kênh hỗ trợ Zalo; chưa bật tin tự động cho tới khi mẫu, quyền gửi, đồng ý nhận tin và lịch gửi được xác nhận.
- [ ] Chỉ đầu tư offline có hàng đợi ghi dữ liệu sau khi có thiết kế xử lý xung đột/idempotency và kiểm thử thực địa. Hiện app chặn ghi nghiệp vụ khi mất mạng.
- [ ] Tăng quảng bá khi tỷ lệ khách hoàn tất phiên đầu và chuyển trả phí của pilot đạt mức mục tiêu do chủ sản phẩm đặt ra.

## Quy tắc an toàn phát hành

- Không chạy build, migration, seed, integration test hoặc thao tác ghi trên production.
- Không xóa/ghi đè dữ liệu, tài khoản, cấu hình hay lịch sử hiện hữu.
- Mọi migration (nếu phát sinh) phải tương thích ngược, có kiểm tra nâng cấp và phương án khôi phục trước khi phát hành.
- Production chỉ được triển khai sau khi staging đạt tiêu chí và chủ dự án chủ động yêu cầu.

## Trạng thái kiểm chứng thực tế trong repo

**Cập nhật 27/10/2026:** `npm run test:safety` chạy **95/95 đạt** trên local, không nạp cấu hình database. Bộ này bao gồm unit nghiệp vụ, auth/session/network/catalog và kiểm thử in giả lập. Đã thêm vào CI trước các bước database/build hiện hữu; chưa kích hoạt CI từ phiên làm việc này. Kết quả không thay thế staging/OAuth/trình duyệt/thiết bị thật. Các số liệu theo suite bên dưới là mốc kiểm chứng trước đó.

- **Unit tests nghiệp vụ cốt lõi (`npm run test:unit`)**: **56/56 đạt** (1.16s). Gồm: bảo vệ URL redirect, Google OAuth sign-in/atomic sample lake seed, tamper session/token sign, fallback cookie & session revocation, stock aggregation tenant-scoped, offline network monitor, đăng ký SĐT chuẩn hóa + không tự verified, login nhân viên, phân quyền đa hồ/qa_session, gia hạn/kết thúc phiên quá giờ đóng băng bill, custom start-time/drift thời gian, 100x timer stress test, phiếu thu/chi, chốt ca, phân quyền tài chính, số dư quỹ.
- **Kiểm tra UI & vận hành ngoài trời (`tests/outdoor-and-quick-open.test.mjs`)**: **5/5 đạt** (85ms). Gồm: CSS ngoài trời tương phản cao, hook `useOutdoorMode`, nút lớn >= 56px cho tay ướt, luồng mở vé nhanh chống double-click (inFlightRef), nút toggle ngoài trời trên header mobile.
- **Kiểm tra máy in và phần cứng (`tests/printing-*.test.mjs`)**: **17/17 đạt** (814ms). Gồm: nạp ESC/POS 58mm compact, chống duplicate print job khi bấm lặp, hot-plug Windows USB & WebSerial, phân loại thiết bị, chống in vé dở dang khi đứt kết nối.
- **Kiểm tra an toàn gói cước & Webhook (`tests/billing-safety.test.mjs`)**: **6/6 đạt** (420ms). Gồm: thời gian ân hạn 3 ngày trước khi khóa gói (grace period), webhook đối soát constant-time secret & chặn thiếu tiền, bảng giá (Bạc 129k, Vàng 199k, 30 ngày thử), cách ly tenant ID giữa các hồ, phân quyền vai trò tài chính, migration an toàn cho print_job.
- **Kiểm tra nghiệp vụ thu mua cá (`tests/test-fish-buyback.mjs`)**: **1/1 suite (20/20 test cases) đạt** (79ms). Gồm: parse cân nặng dấu phẩy/chấm, chống số âm, đơn giá theo loại cá, thối tiền và định dạng dòng in âm trên hóa đơn.
- **Kiểm tra phân loại hồ/tài khoản test (`tests/test-account-classification.test.mjs`)**: **2/2 đạt** (149ms).
- **Prisma Schema (`npx prisma validate`)**: **Hợp lệ (schema is valid)**.
- **TypeScript Typecheck (`npx tsc --noEmit`)**: **0 lỗi (clean)**.
- **ESLint**: **0 lỗi** trên các tệp xác thực đã tinh chỉnh (`src/app/actions/auth.ts`, `src/lib/auth.ts`).
- **Integration tests & E2E**: Tạm dừng chưa chạy trên local do môi trường test runner yêu cầu server live cổng 3000 và kết nối database staging độc lập (`.env` hiện tại trỏ cơ sở dữ liệu cloud, tuân thủ nghiêm ngặt quy tắc AGENTS.md không chạy integration test/migration tránh tác động dữ liệu thực tế).

## Checklist triển khai Pilot thực tế (3–5 hồ đầu tiên)

### Cập nhật kiểm chứng auth — 27/10/2026

- Đã rà soát diff đăng ký SĐT và transaction onboarding Google. Bổ sung regression cho seed lỗi phải thoát transaction callback và từ chối đăng nhập; tài khoản Google OWNER hiện hữu không seed lại, giữ trạng thái xác minh và session version.
- Chạy `node --test --test-timeout=15000 tests/app-regressions.test.mjs tests/stale-session.test.mjs tests/outdoor-and-quick-open.test.mjs`: **27/27 đạt**. Đây là kiểm tra mock/local, chưa chứng minh rollback PostgreSQL, OAuth thật hay cookie trình duyệt trước/sau thay đổi.
- TCP probe tới database test đã cấu hình tại `127.0.0.1:55432` trả `ECONNREFUSED`; không kết nối SQL. Không sử dụng database cloud trong `.env` hoặc listener khác chưa xác minh cách ly.
- **Blocker:** cần database staging độc lập đã sẵn schema và cấu hình Google OAuth staging được xác nhận. Chưa chạy signup/integration trên database, chưa đánh dấu hoàn tất staging, không deploy/migration/seed hay xóa dữ liệu.
- Quy trình kiểm tra tối thiểu và tiêu chí dữ liệu/cookie: [AUTH_STAGING_VERIFICATION.md](AUTH_STAGING_VERIFICATION.md). Giữ nguyên các checkbox staging chưa hoàn tất ở trên.

### 1. Chuẩn bị môi trường & An toàn dữ liệu
- [ ] Xác nhận database staging độc lập với Neon branch riêng để chạy smoke test & integration test.
- [ ] Xác nhận backup định kỳ tự động và test khôi phục snapshot database từ nhà cung cấp cloud.
- [ ] Kiểm tra biến môi trường production: `NEXTAUTH_SECRET`, `JWT_SECRET`, `BANK_WEBHOOK_SECRET`, `SPEEDSMS_ACCESS_TOKEN`. Không in ra log.

### 2. Thiết bị phần cứng & In ấn thực tế tại hồ
- [ ] Chuẩn bị máy in 58mm (Xprinter XP-58IIH / POS-58 / PT-210 Bluetooth).
- [ ] Kiểm tra kết nối USB (Chrome/Edge WebSerial) hoặc Bluetooth Android với khổ giấy K57/K58.
- [ ] In thử mẫu vé vào câu (startAt, plannedEndAt, tiền trả trước, nợ còn lại) và hóa đơn chốt phiên.

### 3. Nghiệp vụ vận hành tại hồ (Onsite Onboarding)
- [ ] Hỗ trợ chủ hồ tạo tài khoản (Google OAuth hoặc SĐT/mật khẩu; SMS OTP hiện đang tắt), kiểm tra khởi tạo dữ liệu mẫu thành công.
- [ ] Cấu hình danh mục thực tế:
  - Bảng giá ca câu: 3h, 4h, 5h, câu đêm, giá phụ thu quá giờ/phút.
  - Sơ đồ chòi/ô câu thực tế của hồ.
  - Danh mục hàng hóa (nước giải khát, mồi câu, mượn cần, phao).
  - Bảng giá thu mua cá (đơn giá/kg theo từng loại cá).
- [ ] Cấp tài khoản nhân viên (STAFF) và kiểm tra phân quyền: nhân viên không thấy báo cáo doanh thu tổng, không sửa giá.
- [ ] Hướng dẫn 3 thao tác cốt lõi: Mở vé nhanh (chống bấm lặp) -> Thêm đồ uống -> Chốt phiên thanh toán & thấu trừ cá.
- [ ] Hướng dẫn chốt ca cuối ngày: bàn giao quỹ, giải trình lệch tiền mặt/chuyển khoản VietQR.

### 4. Tiêu chí nghiệm thu & Chuyển đổi trả phí
- [ ] Tỷ lệ mở vé và chốt phiên không lỗi >= 98%.
- [ ] Chênh lệch quỹ ca bằng 0 hoặc có lý do giải trình hợp lệ.
- [ ] Đạt tối thiểu 3/5 hồ chuyển khoản gia hạn gói Bạc (129.000đ/tháng) hoặc gói Vàng (199.000đ/tháng) sau thời gian trải nghiệm.

## Kiểm tra tiếp theo — 25/10/2026

- [x] Rà soát tĩnh các Route Handler API: không tìm thấy route nghiệp vụ nào thiếu dấu hiệu xác thực tenant hoặc quyền; đây chưa thay thế kiểm thử truy cập chéo tenant end-to-end.
- [x] Xác nhận đăng ký SĐT đi tới trang đăng nhập, đăng nhập chấp nhận SĐT/mật khẩu; các endpoint SMS OTP trả HTTP 410 và trang xác minh cũ chuyển về phiên làm việc. Không bật lại SMS vì cần xác nhận cấu hình nhà cung cấp và kiểm thử staging.
- [x] ESLint toàn repo (`npm run lint`): đạt.
- [x] Dependency audit đầy đủ (`npm audit --audit-level=moderate`): 0 lỗ hổng.
- [x] Bộ kiểm tra mở rộng chạy được các bài audit-log, billing/webhook và một số luồng trước khi gặp `tests/comprehensive-reporting.test.mjs` yêu cầu API live tại `localhost:3000` và database riêng; database cấu hình test local tại `127.0.0.1:55432` không lắng nghe. Đã dừng suite; không coi các bài test báo lỗi/chờ API là đã đạt.
- [ ] Chạy các suite API/integration trên staging database đã xác minh, bao gồm đối chiếu cách ly tenant và báo cáo.
- [ ] Kiểm tra cấu hình môi trường production, backup/restore và in thực tế trên thiết bị tại hồ.

**Đánh giá phát hành hiện tại:** đủ cơ sở để tiếp tục chuẩn bị một pilot có hỗ trợ sau khi có staging riêng; chưa đủ bằng chứng để triển khai production hoặc mở bán tự phục vụ. Build/unit/lint/audit đạt không thay thế integration, khôi phục backup và kiểm thử tại hồ.


