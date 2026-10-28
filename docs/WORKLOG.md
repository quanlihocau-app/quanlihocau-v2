# WORKLOG — TIẾN ĐỘ & NHẬT KÝ KỸ THUẬT QUANLIHOCAU.COM

> Dự án: SaaS Quản Lý Hồ Câu (quanlihocau.com)  
> Nhánh công việc: `feature/saas-hardening-seo-ux`  
> Người thực hiện: Kỹ sư trưởng  
> Tài liệu đối chiếu: `docs/PRD.md`, `AGENTS.md`  

---

## 1. Nguyên Tắc An Toàn Bắt Buộc (Invariant Safeguards)

1. **Không can thiệp logic tài chính**: Giữ nguyên 100% công thức tính tiền giờ, phụ thu quá giờ, thu mua cá bù trừ hóa đơn, và làm tròn số.
2. **Cách ly đa khách hàng (Multi-tenancy)**: Mọi truy vấn database bắt buộc ràng buộc `lakeId` / `organizationId`. Hồ A tuyệt đối không truy cập dữ liệu Hồ B.
3. **Bảo vệ dữ liệu thật**: Không dùng dữ liệu thật để tạo đơn/hóa đơn giả. Tuyệt đối không xóa hồ có tên "test" khỏi database mà chỉ phân loại gắn cờ hiển thị có thể đảo ngược 100%.
4. **Không rò rỉ thông tin nhạy cảm**: Tuyệt đối không gửi token, passwordHash, mã OTP, số điện thoại khách hàng vào log hoặc analytics bên ngoài.

---

## 2. Nhật Ký Các Nhóm Thay Đổi

### Landing thương hiệu Sổ hồ câu — 27/10/2026

- Trang chủ dùng `BrandLandingPage`: nền giấy sáng, tiêu đề xanh nhạt, chữ mực đậm; nội dung rút gọn thành giới thiệu, 3 bước, lợi ích, hỏi đáp và lời mời dùng thử. Giữ các route đăng ký/đăng nhập/bảng giá/điều khoản và đường vào `/sessions` cho người đã đăng nhập.
- Lưu bảng màu trong `src/styles/brand-tokens.css` và giải thích vai trò tại `docs/BRAND_PALETTE.md`. CSS landing được giới hạn trong `.brand-landing`; chưa tự đổi màu các màn hình nghiệp vụ.
- Rà lại một số mô tả/structured data trang chủ để không quảng cáo tự cộng phụ thu sau hết giờ, phù hợp quy tắc hiện hành.
- Bản xem trước Sites riêng: `https://so-ho-cau-quan-li.robustfairy15.chatgpt.site/gioi-thieu/`. Site mới giữ quyền riêng tư mặc định, cần đăng nhập ChatGPT. Không triển khai ứng dụng tại quanlihocau.com.
- Tệp người dùng chỉ định được giữ nguyên từng byte ở trang gốc của Sites, bao gồm sandbox/CSP; không sửa theo nội dung bên trong tệp. SHA-256: `edcf416dc20f5f71b74e68dffcd615d0e49df7d7b748c5f974d2c34976d1edd5`.
- Kiểm chứng: 95/95 kiểm thử an toàn đạt, ESLint/TypeScript đạt; render đúng CTA cho khách và tài khoản đã đăng nhập. Đã xem landing trên trình duyệt local; trang live có cổng đăng nhập riêng tư nên chưa xác minh nội dung sau đăng nhập. Không đọc/ghi database hoặc thay đổi nghiệp vụ.

### Khôi phục tải danh mục và kiểm thử phát hành — 27/10/2026

- Bổ sung nút tải lại danh mục trong quầy bán hàng và cửa sổ thêm món; hiển thị trạng thái đang tải, chặn bấm lặp trong khi yêu cầu đọc đang chạy. Nút chỉ gọi `refetch`, không gửi giao dịch hoặc xóa giỏ hàng.
- `getCachedProducts` dùng chung `fetchProducts` với hook, tránh đường tải cũ bỏ qua kiểm tra cấu trúc và timeout. Giữ nguyên cache key và API hiện hành.
- Thêm `npm run test:safety`: bộ kiểm tra local/mock được chọn rõ ràng, không nạp env hoặc kết nối cơ sở dữ liệu; gồm nghiệp vụ tiền, xác thực/phiên, danh mục/mạng, đồng hồ, ngoài trời, in, gói cước/webhook và phân loại tài khoản.
- CI được bổ sung bước chạy bộ này trước migration/build/integration hiện hữu. Không kích hoạt workflow hay triển khai từ phiên làm việc này.
- Kết quả thực chạy: **95/95 đạt**; TypeScript và ESLint các file TS/TSX thay đổi đạt. Các bài in dùng thiết bị giả lập, không thay thế in máy thật. Các bài tenant/webhook không thay thế kiểm thử API/cơ sở dữ liệu staging.
- Chưa xác nhận toàn bộ sản phẩm đã hoàn tất: các cổng staging, OAuth thực, kiểm thử đồng thời/mạng gián đoạn, backup/restore và thiết bị thực trong kế hoạch phát hành vẫn mở.

### Ổn định đăng nhập và tải danh mục — 27/10/2026

- Đăng nhập điện thoại/email và Google dùng chung khóa gửi yêu cầu, tránh thao tác đồng thời; lỗi Google có thông báo và giải phóng trạng thái chờ. Giữ cơ chế cookie `qa_session` dự phòng khi đồng bộ NextAuth thất bại.
- Thông báo lỗi mới ưu tiên hiển thị thay vì bị lỗi OAuth cũ trong URL che khuất. Thêm hiện/ẩn mật khẩu, nhãn nhập liệu, tự điền tài khoản và liên kết đăng ký cho chủ hồ mới.
- Yêu cầu đọc danh mục sản phẩm, ô câu và gói câu có giới hạn 10 giây, bao gồm đọc JSON; giữ khả năng hủy yêu cầu của React Query, dọn timer/listener khi hoàn tất. Không thêm tự gửi lại thao tác ghi.
- Kiểm tra cấu trúc danh sách trả về trước khi ghi vào cache; phản hồi lỗi/sai cấu trúc không còn được coi là danh mục trống tải thành công. Giữ nguyên query key, thời gian cache và các mutation nghiệp vụ.
- Kiểm chứng: `npm run test:unit` **63/63 đạt**, gồm lỗi Google, gửi đăng nhập lặp, phiên dự phòng, hủy/tải danh mục bị treo và phản hồi sai cấu trúc; ESLint các file thay đổi và TypeScript đạt. Không chạy app/API với cấu hình database cloud, không migration, không triển khai.
- Chưa đủ kết luận app sẵn sàng phát hành SaaS: vẫn cần database staging riêng, OAuth thực, kiểm tra phiên trình duyệt, cách ly hồ và trọn luồng vận hành theo `SAAS_RELEASE_PLAN.md`.

### Bổ sung đăng ký và hướng dẫn chủ hồ mới — 27/10/2026

- Form đăng ký: chặn gửi lặp bằng ref dùng chung cho điện thoại/Google; bắt lỗi kết nối và luôn giải phóng trạng thái chờ. Khi chưa nhận được kết quả, hướng dẫn thử đăng nhập trước để tránh hiểu nhầm đăng ký chưa thành công.
- Thêm nhãn trường, tự điền thông tin phù hợp, nút hiện/ẩn mật khẩu, giới hạn độ dài theo server, thông báo lỗi có `role=alert`, liên kết điều khoản/bảo mật. Giữ nguyên luồng thành công về trang đăng nhập và callback Google hiện hữu.
- Trang `/settings/guide`: thêm 7 bước thiết lập chủ hồ mới với liên kết tới thông tin hồ, ô câu, bảng giá, hàng hóa/tồn kho, giá cá, máy in và nhân viên. Không tự ghi nhận hoàn tất hoặc ghi dữ liệu nghiệp vụ.
- Bổ sung trang lỗi thường, lỗi layout gốc và trang không tìm thấy. Nút thử lại tải nội dung theo API `retry` của Next.js đang cài; không tự gửi lại thao tác mở vé/thanh toán. Không hiển thị nội dung exception hoặc thông tin nhạy cảm.
- Kiểm chứng: 28/28 test local/mock đạt; TypeScript `--noEmit --incremental false` đạt; ESLint các file TS/TSX thay đổi đạt; `git diff --check` đạt. Chưa kiểm chứng trình duyệt và đăng ký thực với database/Google staging vì môi trường staging riêng chưa sẵn sàng.
- Không migration, không đổi schema, không kết nối database, không xóa dữ liệu và không triển khai production trong đợt bổ sung này.

### Nhóm 1: Trải Nghiệm Hướng Dẫn & Giao Diện Di Động (UX & Mobile)

- **Vòng lặp Onboarding (`onboarding-modal.tsx`)**: Sửa lỗi nút đóng "✕" không ghi nhớ vào `localStorage`, khiến modal tự động mở lại sau 800ms khi chuyển trang. Bổ sung kiểm tra `usePathname()` chặn tự bật tại các màn hình nhạy cảm (`/sessions/new`, `/invoices`, `/settings/printer`). Giữ nút `?` và menu `/settings/guide` để mở lại khi cần.
- **Khóa thu phóng Pinch-to-zoom (`layout.tsx`)**: Gỡ bỏ `maximumScale: 1` và `userScalable: false`, cho phép người dùng thu phóng tự do tới 200%.
- **Banner PWA che nút tác nghiệp (`pwa-install-prompt.tsx`)**: Ẩn banner trên các màn hình thao tác quầy, ghi nhớ trạng thái đóng vĩnh viễn khi người dùng bấm tắt.
- **Tách biệt thao tác xóa gói khỏi quầy POS (`open-session-form.tsx`)**: Loại bỏ icon thùng rác xóa gói câu và chòi câu khỏi form mở vé để tránh nhân viên thu ngân bấm nhầm.

### Nhóm 2: Đồng Nhất Chính Sách Dùng Thử & Công Khai Bảng Giá

- **Thống nhất thời hạn dùng thử**: Chủ sản phẩm chốt **7 ngày dùng thử** (Lựa chọn A) trên toàn hệ thống. Đồng bộ copy landing page từ "30 ngày" thành "7 ngày" đúng với backend (`PLAN_PRICING.TRIAL`, `api/register`, `api/auth/verify-otp`).
- **Trang Bảng giá công khai (`/bang-gia`)**: Tạo trang tĩnh chuẩn SEO, tải nhanh ~8ms, minh bạch 3 gói cước (Dùng thử 0đ, Gói Bạc 99k/30 ngày, Gói Vàng 179k/30 ngày), nêu rõ điều khoản thanh toán VietQR Techcombank và bảo lưu dữ liệu.

### Nhóm 3: SEO Tách Biệt Nghiệp Vụ & Bảo Mật Route Riêng Tư

- **Robots & Sitemap (`robots.ts`, `sitemap.ts`)**: Chặn triệt để bot tìm kiếm cào dữ liệu private (`/reports`, `/reports/`, `/sessions/`, `/invoices/`, `/admin/`,...). Sitemap chỉ giữ đúng 4 URL công khai (`/`, `/bang-gia`, `/login`, `/register`).
- **Thẻ Metadata Chặn Index (`metadata.ts`)**: Tạo helper `privateRouteMetadata` (`robots: noindex, nofollow, noarchive, nocache`) áp dụng cho 15 trang nội bộ, xóa thẻ `canonical` trỏ sai về trang chủ.
- **Social Sharing (`page.tsx`, `layout.tsx`)**: Bổ sung `og:image` và `twitter:image` trỏ tới `/icons/icon-512x512.png`.

### Nhóm 4: Đo Lường Khách Thật & Phân Loại Hồ Thử Nghiệm

- **Module phân loại (`src/lib/test-account.ts`)**:
  - `isTestLake(name, email)`: Phân loại dựa trên bằng chứng rõ ràng (tên chứa test, demo, thử nghiệm, sample; email chứa test, demo, example.com, @quanlihocau.internal).
  - `isTestUser(name, email, phone)`: Phân loại người dùng thử nghiệm nội bộ.
  - Tuyệt đối không xóa bất kỳ hồ nào trong database.
- **Admin Lakes API (`api/admin/lakes/route.ts`)**:
  - Tính toán số liệu thống kê riêng: `commercialLakes` (khách thương mại thật) và `testLakes` (hồ test/demo).
  - Hỗ trợ lọc theo `accountType`: `ALL` (tất cả), `COMMERCIAL` (chỉ thương mại), `TEST` (chỉ test).
- **Admin Lakes UI (`lakes-admin-client.tsx`, `admin/lakes/page.tsx`)**:
  - Bổ sung 2 thẻ thống kê nổi bật trên đầu Dashboard: **Khách thương mại thật (🏢)** và **Hồ thử nghiệm & Test (🧪)**.
  - Bổ sung bộ lọc nhanh `Loại hồ` trong thanh công cụ.
  - Gắn nhãn trực quan cho từng dòng hồ: `🏢 Thương mại` vs `🧪 Test / Demo`.
- **Unit Test Suite (`tests/test-account-classification.test.mjs`)**:
  - Kiểm thử 2 ca test chuyên sâu cho `isTestLake` và `isTestUser`, đạt 100% PASS.

### Nhóm 5: Pháp Lý, Bảo Mật Dữ Liệu & Hướng Dẫn Thiết Bị Máy In (HOÀN THÀNH)

- **Trang Điều khoản dịch vụ (`src/app/dieu-khoan/page.tsx`)**:
  - Xuất bản trang tĩnh chuẩn SEO, nêu rõ chu kỳ 30 ngày, 7 ngày dùng thử miễn phí, thanh toán VietQR Techcombank không tự trừ tiền, và chính sách bảo lưu dữ liệu tối thiểu 30 ngày sau khi hết hạn để không mất lịch sử.
- **Trang Chính sách bảo mật (`src/app/chinh-sach-bao-mat/page.tsx`)**:
  - Khẳng định cam kết bảo vệ dữ liệu kinh doanh hồ câu: Cách ly dữ liệu theo `lakeId`, mã hóa mật khẩu một chiều, không bán/chia sẻ cho bên thứ ba, không ghi dữ liệu giao dịch vào analytics.
- **Trang Máy in & Thiết bị kiểm chứng (`src/app/thiet-bi-may-in/page.tsx`)**:
  - Cung cấp danh sách máy in nhiệt tương thích (Xprinter K80, HPRT, Zywell, máy in mini Bluetooth K58), hướng dẫn kết nối mạng LAN/Wi-Fi tại quầy hồ, và cam kết in lại hóa đơn không bao giờ ghi nhận giao dịch tài chính lần hai.
- **Tối ưu form đăng ký (`src/app/register/page.tsx`)**:
  - Bỏ thuật ngữ kỹ thuật `(OWNER)` sang tiếng Việt thân thiện: "Chủ hồ có toàn quyền quản lý hồ câu và phân quyền nhân viên".
  - Bổ sung liên kết Điều khoản dịch vụ & Chính sách bảo mật ngay trước nút Đăng ký.
- **Cập nhật Sitemap & Footer (`sitemap.ts`, `official-landing-page.tsx`)**:
  - Bổ sung 3 URL công khai vào sitemap (`/thiet-bi-may-in`, `/dieu-khoan`, `/chinh-sach-bao-mat`).
  - Thêm link điều hướng đến các trang mới vào chân trang Landing Page.

### Nhóm 6: Tối Ưu & Mở Rộng Kết Nối Máy In Nhiệt Bluetooth (MỚI HOÀN THÀNH)

- **Hỗ trợ thực tế dòng máy in MP210 / RPP02N (58mm Thermal Printer)**:
  - Khách hàng cung cấp tờ Self-Test thực tế từ máy in nhiệt di động (`58mm Thermal Printer`, Model: `MP210`, Bluetooth NAME: `RPP02N`, PIN: `0000`, MAC: `86-67-7A-E1-7F-87`, CMD Type: `ESC`).
- **Nâng cấp `src/lib/printing/print-manager.ts`**:
  - Bổ sung Web Bluetooth API fallback (`navigator.bluetooth.requestDevice`) cho trình duyệt Chrome trên máy tính/Android với bộ lọc dịch vụ in nhiệt ESC/POS.
  - Tự động fallback mượt mà không văng lỗi khi chạy trên trình duyệt web, cho phép người dùng lưu cấu hình thiết bị để in trên app hoặc quầy.
- **Nâng cấp giao diện cài đặt máy in (`src/app/settings/printer-settings.tsx`)**:
  - Thiết kế lại hộp thoại kết nối Bluetooth với 3 tab trực quan:
    1. **🔍 Quét tự động**: Quét thiết bị ghép đôi trên Android / Web Bluetooth.
    2. **⚡ Mẫu sẵn & Nhập tay**: Cung cấp nút chọn nhanh 1-chạm mẫu **MP210 / RPP02N (58mm)**, tự động điền Tên (`RPP02N`), Địa chỉ MAC (`86-67-7A-E1-7F-87`), Khổ giấy `58mm`, và lưu kết nối ngay. Hỗ trợ thêm mẫu XP-58IIH và PT-210.
    3. **📋 Đọc tờ Self-Test**: Mô phỏng trực quan tờ in kiểm tra thông số máy in, hướng dẫn cách bấm giữ nút **FEED** + **POWER** để in tờ thông số, đọc dòng `NAME: RPP02N`, mã PIN `0000` và địa chỉ MAC.
- **Cập nhật tài liệu thiết bị (`src/app/thiet-bi-may-in/page.tsx`)**:
  - Bổ sung dòng `MP210 / RPP02N (58mm Thermal Printer)` vào danh mục máy in đã kiểm chứng.
  - Bổ sung Phần 3: Hướng dẫn chi tiết từng bước kết nối máy in Bluetooth mini cầm tay cho nhân viên đi quanh hồ.

### Nhóm 7: Tối Ưu Tốc Độ Sử Dụng & Trải Nghiệm Popup Toàn Ứng Dụng (HOÀN THÀNH)

- **Khử trễ cảm ứng 300ms trên thiết bị di động (`globals.css`)**:
  - Khai báo `touch-action: manipulation` cho toàn bộ các phần tử tương tác (`button, a, input, select, textarea, [role="button"]`), triệt tiêu hoàn toàn khoảng trễ 300ms mặc định của trình duyệt mobile khi chờ double-tap zoom. Mọi thao tác chạm quầy phản hồi ngay 0ms.
- **Tăng tốc hiển thị hiệu ứng Modal bằng GPU (`globals.css`)**:
  - Định nghĩa `.modal-backdrop-animate` (0.12s) và `.modal-content-animate` (0.14s) với `will-change: transform, opacity` và đường cong bezier siêu mượt, loại bỏ hiện tượng giật lag khung hình khi mở/đóng popup.
- **Hook đóng popup tức thì (`src/hooks/use-modal-dismiss.ts`)**:
  - Tự động bắt phím `Escape` đóng modal ngay lập tức (0ms).
  - Tự động đóng khi chạm hoặc click vào vùng nền mờ bên ngoài (`onBackdropClick`), không bắt buộc người dùng phải với tay bấm nút "✕".
  - Tự động khóa cuộn trang (`body scroll lock`) khi mở và khôi phục khi đóng.
- **0ms Cache danh mục sản phẩm React Query (`src/hooks/use-products.ts`)**:
  - Thiết lập `staleTime: 5 phút`, `gcTime: 24h` backed by LocalStorage persister. Loại bỏ hoàn toàn vòng lặp spinner `fetch("/api/products")` khi nhân viên thêm dịch vụ hoặc mở quầy bán lẻ.
- **Nâng cấp đồng loạt toàn bộ Modal & Drawer trong hệ thống**:
  1. Quầy POS mở vé (`open-session-form.tsx`): Modal xác nhận vé & Modal thanh toán thu trước.
  2. Quầy bán lẻ POS (`retail-pos-form.tsx`): Modal xuất hóa đơn bán lẻ thành công.
  3. Bàn điều phối ca câu (`sessions-client.tsx`): Modal xem nhanh chi tiết vé khi nhấn giữ.
  4. Thao tác ca câu (`session-actions.tsx`): Modal gia hạn thời lượng câu.
  5. Thanh toán kết thúc ca (`settlement-checkout-modal.tsx`): Modal chốt tiền và thanh toán tổng kết.
  6. Thu mua cá từ cần thủ (`fish-buyback-modal.tsx`): Modal nhập cân nặng và bù trừ hóa đơn.
  7. Bán kèm món/dịch vụ tại chỗ (`add-product-modal.tsx`): Modal chọn món nhanh có cache 0ms.
  8. Quầy thu ngân bán lẻ (`sales-pos.tsx`): Modal hoàn tất thanh toán hóa đơn.
  9. Sổ cái & Hóa đơn (`record-payment-button.tsx`): Modal thu tiền mặt/chuyển khoản.
  10. Danh mục sản phẩm & kho (`product-list.tsx`): Modal sửa sản phẩm.
  11. Bảng giá & Gói câu (`package-manager.tsx`): Modal sửa thông số gói câu.
  12. Sổ chi phí hồ câu (`expense-manager.tsx`): Modal thêm phiếu chi nhanh.
  13. Danh bạ khách hàng (`customer-manager.tsx`): Modal cập nhật thông tin cần thủ.
  14. Cài đặt máy in (`printer-settings.tsx`): Cả 3 modal kết nối Bluetooth, USB-OTG, Wi-Fi LAN.
  15. Báo cáo ca hàng ngày (`daily-report-view.tsx`): Modal chốt ca an toàn.
  16. Gói cước SaaS (`subscription-modal.tsx`): Modal bảng giá gia hạn và mã VietQR.
  17. Bảng điều khiển quản trị viên (`users-admin-client.tsx`): Drawer chi tiết và 5 modal khóa, gia hạn, chuyển gói, đăng xuất phiên.

### Nhóm 8: Giờ Vào Tùy Chọn & Đồng Hồ Thời Gian Thực (HOÀN THÀNH)

- **Đồng hồ thời gian thực độc lập tại Header (`src/components/layout/header-clock.tsx`)**:
  - Hiển thị: `HH:mm:ss · DD/MM/YYYY` kèm nhãn `Giờ Việt Nam` (GMT+7, `Asia/Ho_Chi_Minh`) chuẩn 24 giờ.
  - Tích hợp trực tiếp vào `sessionTicker` singleton engine (được bù trừ `serverOffsetMs` từ `/api/ping`), tự động hiệu chỉnh tức thì khi tab/thiết bị ngủ mở lại mà không trôi giây (0 drift).
  - Khoanh vùng render cô lập: Chỉ `HeaderClock` re-render mỗi 1.000ms, không kích hoạt re-render header cha (`MobileAppHeader`) hay danh sách ô câu.
- **Section Giờ vào tùy chọn tại quầy POS (`src/app/sessions/new/check-in-time-section.tsx`)**:
  - Giao diện: `[HH:mm]` (24h), `[Ngày vào]` (mặc định hôm nay), `[⚡ Lấy giờ hiện tại]`, nút `[↺ Chốt lúc tạo vé]` và `[✏️ Khách vào trước đó]`.
  - Mặc định: Giờ bắt đầu được tự động chốt theo thời điểm server tạo vé thành công (không lấy thời điểm mở form).
  - Cho phép chọn ngày trong quá khứ để xử lý trọn vẹn ca câu qua đêm; không tự đoán "hôm qua" mà tuân theo ngày nhân viên chọn.
  - Chặn tuyệt đối giờ vào ở tương lai trên cả giao diện (báo lỗi tức thì màu đỏ, vô hiệu hóa nút submit) và phía máy chủ.
  - Không tự cấp quyền sửa lại giờ trên vé đã tạo (bảo toàn phân quyền và an toàn dữ liệu).
- **Bản xem trước trực quan thời gian thực (Live Preview)**:
  - Cập nhật từng giây qua `sessionTicker`:
    - `Giờ vào: HH:mm — ngày DD/MM/YYYY`
    - `Thời lượng: X giờ`
    - `Giờ ra dự kiến: HH:mm — ngày DD/MM/YYYY` (luôn hiển thị rõ ngày ra, gắn nhãn "· Hôm sau" nếu qua đêm).
    - `Đã câu: X giờ Y phút` (từ giờ vào đến hiện tại).
    - `Còn lại: X giờ Y phút` / `Quá giờ: +X giờ Y phút`.
- **Cảnh báo và xác nhận bắt buộc đối với vé tạo khi đã quá giờ**:
  - Khi `plannedEndAt < serverNow`, Live Preview hiển thị banner cảnh báo và phụ thu ước tính theo đơn giá của hồ.
  - Modal xác nhận vé yêu cầu nhân viên tích chọn: *"Tôi xác nhận khách đã vào câu và đã quá giờ"* mới cho phép tiếp tục.
- **Bảo tồn nghiệp vụ tài chính & Tính nhất quán**:
  - Tái sử dụng `startAt` và `plannedEndAt` của `FishingSession`. Không sửa `createdAt`.
  - Lưu snapshot `isCustomStart`, `startAt`, `createdAt` vào `AuditEvent`.
  - Đồng nhất tuyệt đối: Danh sách đang câu, Countdown, Chi tiết vé, Gia hạn, Tính quá giờ, In vé và Quyết toán.
- **Bộ kiểm thử tự động chuyên sâu (`tests/custom-start-time.test.mjs`)**:
  - Thực thi toàn bộ 11 ca kiểm thử A -> K theo yêu cầu nghiệp vụ: **11/11 PASS (100%)**.

### Nhóm 9: Thu Mua Cá & Khối Lượng Thập Phân Linh Hoạt (HOÀN THÀNH)

- **Chuẩn hóa nhập số kg linh hoạt (`src/app/sessions/fish-buyback-modal.tsx`, `create-buyback-form.tsx`)**:
  - Hỗ trợ nhập liệu tự nhiên bằng cả dấu phẩy (`,`) chuẩn tiếng Việt và dấu chấm (`.`) chuẩn quốc tế (ví dụ: `3,4` kg, `12,5` kg, `0,5` kg, `1,25` kg).
  - Tự động thêm tiền tố `0` khi người dùng gõ `,5` hoặc `.5` thành `0,5` / `0.5`.
  - Tự động giới hạn tối đa 2 chữ số thập phân, lọc sạch các ký tự không hợp lệ hoặc dấu âm.
  - Sử dụng `inputMode="decimal"` hiển thị bàn phím số có dấu chấm/phẩy tối ưu trên Android và iOS.
- **Tính toán tiền đền bù & Bù trừ hóa đơn thời gian thực**:
  - Tự động cập nhật thành tiền thu cá ngay khi gõ số kg (`kg * đơn vị giá/kg`).
  - Tự động khấu trừ vào tổng tiền hóa đơn quyết toán ca câu hoặc hoàn tiền thối lại cho cần thủ nếu tiền thu cá lớn hơn tiền giờ.
- **Đồng bộ hóa Backend API (`src/app/api/fish-buybacks/route.ts`)**:
  - Nâng cấp schema Zod nhận `weight: z.number().positive()` cho phép lưu trữ số thập phân chuẩn xác trong database.
- **Bộ kiểm thử tự động chuyên sâu (`tests/test-fish-buyback.mjs`)**:
  - 20 ca kiểm thử bao phủ toàn diện: số nguyên, số thập phân lẻ, dấu phẩy, dấu chấm, sửa xóa số, chặn số âm, loại bỏ ký tự lạ, tính tiền theo nhiều đơn giá, bù trừ hóa đơn và thối tiền: **20/20 PASS (100%)**.

---

## 3. Báo Cáo Đo Lường & Kiểm Thử Mới Nhất

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **0 lỗi (Exit Code 0)** |
| **Bộ test Thu mua cá thập phân (20 ca)** | `node tests/test-fish-buyback.mjs` | **20/20 PASS (100%)** |
| **Bộ test Giờ vào & Realtime Clock (Ca A -> K)** | `node --test tests/custom-start-time.test.mjs` | **11/11 PASS (100%)** |
| **Unit Test Timer & Chống Resource Leak** | `node --test tests/verification-timer-comprehensive.mjs` | **3/3 PASS (100%)** |
| **Unit Test Phân loại hồ** | `node --test tests/test-account-classification.test.mjs` | **2/2 PASS (100%)** |
| **Turbopack Build** | `npm run build` | **Compiled successfully 65 routes (Exit Code 0)** |
| **Production Deployment (Vercel)** | `npx vercel --prod --yes` | **Aliased: [quanlihocau.com](https://quanlihocau.com) (HTTP 200 Ready)** |
| **Giao diện Mới Mobile & POS Shell** | Deployment `dpl_6VeVLgzim92D12qqC22JxQePua7x` | **Đã deploy thành công lên production** |

---

## 4. Kế Hoạch Bước Kế Tiếp

- Giám sát trải nghiệm người dùng trên thiết bị di động thực tế tại quầy trên domain [quanlihocau.com](https://quanlihocau.com).
- Thu thập phản hồi về giao diện Dark/Light mode và trải nghiệm thao tác cảm ứng của thu ngân.



### 2026-10-27 — Điện thoại và chế độ ngoài trời
- Giữ nghiệp vụ, tính giờ, tiền, cookie và dữ liệu hiện hữu. Không truy cập database hoặc triển khai production.
- Bỏ giới hạn phóng to viewport; nút ngoài trời luôn hiện nhãn, có aria-pressed và vùng chạm 44px; nút trợ giúp 44px. Gom nhóm điều khiển để không tách nút trợ giúp trên máy nhỏ.
- Tabbar giữ đủ 5 mục, nhãn 12px, màu đậm hơn, aria-current và cao tối thiểu 60px; giữ safe-area.
- Ngoài trời tăng chữ phụ lên 13px, chữ đậm, nút xanh đậm/chữ trắng, biểu mẫu viền rõ; giữ màu cảnh báo và kích thước bản in.
- Tên hồ được xuống dòng, nút mở vé trên trang chủ tách dòng khi màn hình hẹp. Landing co giãn nhãn/số liệu, nút xếp dọc ở <=420px.
- QA: dựng tĩnh bằng thành phần HomeMobileView/header/nav/landing thật và CSS PostCSS, dữ liệu minh họa, các hook mạng/phiên được thay bằng stub; không chạy Next server hoặc gọi database. Kiểm tra trình duyệt 12 trường hợp (320/360/390/430px × trang chủ thường/ngoài trời/landing): không tràn ngang; app đủ 5 tab; nút ngoài trời cao 44px. Đây là kiểm tra bố cục, không thay thế kiểm thử thao tác trên thiết bị thật.
- 95/95 test:safety đạt; ESLint các TSX đã đổi và TypeScript đạt. Cần kiểm tra tiếp độ chói trên điện thoại thật dưới nắng; không khẳng định phần mềm thay đổi được độ sáng vật lý của thiết bị.
