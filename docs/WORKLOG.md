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

---

## 4. Kế Hoạch Bước Kế Tiếp

- Triển khai bản cập nhật mới nhất (Nhóm 9) lên production Vercel.
- Hợp nhất nhánh `feature/saas-hardening-seo-ux` vào nhánh chính `main`.
- Theo dõi thực tế vận hành tại quầy trên domain production [quanlihocau.com](https://quanlihocau.com).

