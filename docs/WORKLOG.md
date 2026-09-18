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

### Nhóm 5: Pháp Lý, Bảo Mật Dữ Liệu & Hướng Dẫn Thiết Bị Máy In (MỚI HOÀN THÀNH)
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

---

## 3. Báo Cáo Đo Lường & Kiểm Thử Mới Nhất

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **0 lỗi (Exit Code 0)** |
| **Turbopack Build** | `npm run build` | **65 routes Compiled successfully (Exit Code 0)** |
| **Unit Test Phân loại hồ** | `node --test tests/test-account-classification.test.mjs` | **2/2 PASS (100%)** |
| **Nghiệp vụ cốt lõi (POS & Billing)** | `node --test tests/session-flow.test.mjs ...` | **47/47 PASS (100%)** |
| **Truy vấn DB Waterfall** | `node tests/benchmark-sessions-queries.mjs` | **p50: 66.69ms (Nhanh hơn 67%)** |

---

## 4. Kế Hoạch Bước Kế Tiếp
- Rà soát các thông điệp cảnh báo nghiệp vụ và tối ưu UX quầy khi in bill POS nhiều liên.
- Giữ nguyên toàn bộ mã nguồn trên nhánh `feature/saas-hardening-seo-ux` để Ban Quản trị nghiệm thu trước khi merge.
