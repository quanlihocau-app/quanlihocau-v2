# PRD & TECHNICAL SPECIFICATION — QUẢNLÝHỒCÂU V2

> Phiên bản: 2.3  
> Ngày cập nhật: 2026-09-05  
> Chủ sản phẩm: Trần Anh Huân  
> Hồ pilot: Hồ Câu Kim Thông  
> Trạng thái: Baseline hoàn thiện Vận hành, Gói cước SaaS, VietQR Techcombank & Xác thực SĐT OTP  
> Phạm vi ưu tiên: Tạo vé → Đang câu → Kết thúc → Thanh toán → SaaS Subscription → Auth OTP

## 0. Cách dùng tài liệu này trong dự án

- Đặt file tại `docs/PRD.md` trong repo `quanlihocau-v2`.
- Mọi issue, implementation plan, code review và kiểm thử phải đối chiếu tài liệu này.
- Khi code hiện tại mâu thuẫn với PRD, không tự suy đoán. Tạo ADR hoặc cập nhật PRD trước khi đổi hành vi nghiệp vụ.
- Không xem một chức năng là hoàn thành nếu chưa đạt Definition of Done và các acceptance test liên quan.
- Không hardcode bảng giá, email Super Admin, `lakeId`, thời gian ca hoặc quyền người dùng trong UI.

### 0.1 Thứ tự ưu tiên khi có mâu thuẫn

1. An toàn dữ liệu, cách ly tenant và không sai tiền.
2. Quy tắc nghiệp vụ đã chốt trong tài liệu này.
3. ADR đã được OWNER phê duyệt.
4. Trải nghiệm người dùng.
5. Cách triển khai kỹ thuật hiện tại.

### 0.2 Câu kiểm soát dự án

**Không sai tiền. Không mất dữ liệu. Không lẫn hồ. Không mở trùng ô. Không phát hành khi chưa có đường quay lui.**

---

## 1. Tổng quan sản phẩm

### 1.1 Mục tiêu

QuanLyHoCau V2 là web app/PWA mobile-first dành cho hồ câu giải trí, giúp:

- Nhân viên mới học thao tác cơ bản trong tối đa 10 phút.
- Mở một vé tiêu chuẩn trong tối đa 15 giây.
- Theo dõi chính xác ô câu, thời gian, hàng bán, cá thu mua, công nợ và thanh toán.
- Chống thao tác trùng, sai tiền, mất dữ liệu và truy cập chéo giữa các hồ.
- Vận hành thử tại Hồ Câu Kim Thông trước khi bán SaaS cho các hồ khác.

### 1.2 Vai trò

- `SUPER_ADMIN`: quản trị nền tảng SaaS; không mặc định được xem dữ liệu kinh doanh chi tiết của hồ nếu không có quy trình hỗ trợ được ghi log.
- `OWNER`: toàn quyền trong một hoặc nhiều hồ theo Membership.
- `CASHIER`: mở vé, thu tiền, thu mua cá, in bill, mở/chốt ca theo quyền.
- `STAFF`: mở và thao tác phiên câu, thêm dịch vụ; không tự sửa giá, hoàn tiền hoặc chốt ca.

Vai trò phải nằm ở `Membership`, không đặt một `role` và một `lakeId` duy nhất trực tiếp trên `User`.

### 1.3 Phạm vi MVP

MVP bắt buộc có:

- Đăng nhập Credentials, session bảo mật, tenant context và RBAC.
- Onboarding hồ đầu tiên.
- Khu vực/ô câu, gói câu, phụ thu, sản phẩm, loại cá thu mua.
- Tạo vé, đồng hồ, cảnh báo, gia hạn, bán hàng, thu mua cá.
- Hóa đơn, nhiều phương thức thanh toán, phiếu chi và báo cáo ngày.
- Audit log cho tiền, giá, hủy, điều chỉnh và quyền.
- Loading, empty, error, retry state rõ ràng.
- CI, backup/restore staging và kiểm thử chống thao tác trùng.

Chưa làm trong MVP:

- Google OAuth.
- Loyalty nâng cao, AI, đối soát ngân hàng tự động.
- Mở vé hoặc thanh toán hoàn chỉnh khi offline.
- Chuỗi nhiều chi nhánh phức tạp, kho cá nâng cao.
- Tự động sửa xung đột tài chính theo Last-Write-Wins.

---

## 2. Nguyên tắc nghiệp vụ không được phá vỡ

1. Mỗi ô chỉ có tối đa một phiên hoạt động tại cùng thời điểm.
2. Mỗi thao tác ghi quan trọng có `clientMutationId`/idempotency key.
3. Tiền lưu bằng số nguyên VNĐ (`BigInt`) hoặc `Decimal`; cấm `Float`.
4. Tổng tiền do server tính; client chỉ hiển thị dự kiến.
5. Giá, tên và thời lượng gói/sản phẩm được snapshot khi giao dịch.
6. Mọi thay đổi tài chính chạy trong database transaction.
7. Giao dịch tài chính không xóa cứng; sửa bằng void/reversal và audit log.
8. `lakeId` lấy từ session/tenant context, không tin `lakeId` từ client.
9. Mọi query nghiệp vụ bắt buộc lọc đúng `lakeId`; master data thêm `deletedAt: null`.
10. API lỗi phải dừng luồng; client không được dùng dữ liệu `undefined` từ response thất bại.
11. Không tạo phiên câu offline trong MVP.
12. In thất bại không được rollback một vé đã mở thành công; cho phép in lại.

---

## 3. Kiến trúc và tiêu chuẩn kỹ thuật

### 3.1 Stack

- Next.js App Router + TypeScript strict, khóa một major ổn định trong mỗi sprint.
- PostgreSQL managed là nguồn dữ liệu duy nhất.
- Prisma; migration phải review, chạy staging và có rollback.
- Auth.js/NextAuth Credentials trong MVP.
- TanStack Query cho server state; cache key luôn gồm `lakeId` khi phù hợp.
- Zustand chỉ giữ UI state tạm thời; không làm nguồn sự thật cho tiền.
- Tailwind CSS + component system riêng; mobile-first.
- Vercel: Preview → Staging → Production.
- Structured logs và Sentry; không log secret hoặc PII không cần thiết.

### 3.2 Chuỗi guard bắt buộc của route ghi

`requireAuth → requireTenant → requirePermission → requireSubscription → validateInput → service transaction`

### 3.3 Quy tắc response

Response thành công:

```json
{
  "ok": true,
  "data": {},
  "requestId": "uuid"
}
```

Response lỗi:

```json
{
  "ok": false,
  "error": {
    "code": "SPOT_OCCUPIED",
    "message": "Ô câu đã có khách đang câu.",
    "fieldErrors": null
  },
  "requestId": "uuid"
}
```

- Không trả raw `error.message`, stack trace hoặc chi tiết database cho client.
- Client luôn kiểm tra `response.ok` và cấu trúc payload trước khi đọc `data`.
- API thất bại phải kết thúc handler phía client; không được tiếp tục đọc `session.startTime` hoặc điều hướng như thành công.

---

## 4. Multi-tenant, quyền và thuê bao

### 4.1 Cách ly tenant

- `Organization/Lake`, `Membership`, mọi master data và giao dịch đều có `lakeId NOT NULL`, trừ bảng nền tảng toàn hệ thống.
- Dùng service/repository nhận `tenantContext`; không rải `lakeId` do client gửi vào Prisma query.
- Kiểm thử IDOR: user hồ A không được đọc hoặc sửa ID thuộc hồ B, kể cả biết UUID.

### 4.2 Quyền tối thiểu

| Hành động | STAFF | CASHIER | OWNER |
| --- | ---: | ---: | ---: |
| Xem ô và phiên đang câu | Có | Có | Có |
| Mở vé | Có | Có | Có |
| Thêm sản phẩm theo giá niêm yết | Có | Có | Có |
| Gia hạn theo biểu giá | Có | Có | Có |
| Thu tiền | Không | Có | Có |
| Sửa giá/giảm giá | Không | Theo quyền + PIN | Có + audit |
| Hủy vé/void/hoàn tiền | Không | Theo quyền + PIN | Có + audit |
| Chốt/mở lại ca | Không | Có / không mở lại | Có |
| Sửa cấu hình | Không | Không | Có |

### 4.3 Thuê bao & Mô hình Gói cước SaaS

Hệ thống cung cấp 3 hạng gói cước dịch vụ cho các hồ câu:

1. **Gói Dùng Thử (`TRIAL`)**:
   - Thời hạn: **30 ngày** kể từ ngày đăng ký tạo hồ mới.
   - Chi phí: **0 VNĐ**.
   - Quyền lợi: Mở đầy đủ toàn bộ tính năng (tương đương Gói Vàng), không giới hạn ô câu và nhân viên.
   - Tự động kích hoạt ngay khi chủ hồ đăng ký tài khoản mới thành công (`Lake.subscriptionStatus = TRIAL`, `Lake.subscriptionPlan = TRIAL`, `subscriptionExpiresAt = now + 30 days`, `Organization.validUntil = now + 30 days`).

2. **Gói Bạc (`SILVER`)**:
   - Chi phí: **99.000 VNĐ / tháng (30 ngày)**.
   - Giới hạn quy mô:
     - Tối đa **30 ô câu** (`maxSpots: 30`).
     - Tối đa **1 nhân viên** (`maxStaff: 1`).
   - Đầy đủ tính năng quản lý vé câu, bán lẻ, kho hàng, thu cá và báo cáo ca.

3. **Gói Vàng (`GOLD`)**:
   - Chi phí: **179.000 VNĐ / tháng (30 ngày)**.
   - Giới hạn quy mô: **Không giới hạn số lượng ô câu** (`maxSpots: null`), **Không giới hạn nhân viên & quản lý** (`maxStaff: null`).
   - Mở toàn bộ tính năng cao cấp và ưu tiên hỗ trợ 24/7.

- **Trạng thái thuê bao**:
  - `TRIAL`: Dùng thử trong hạn 30 ngày.
  - `ACTIVE`: Hoạt động bình thường sau khi thanh toán thành công.
  - `GRACE_PERIOD`: Hết hạn nhưng được ân hạn trong thời gian cấu hình, hiển thị banner cảnh báo.
  - `SUSPENDED`/`EXPIRED`: Hết hạn hoặc bị khóa; chặn các thao tác ghi dữ liệu từ phía backend (`SUBSCRIPTION_EXPIRED`).

#### 4.3.1 Tích hợp VietQR Techcombank Động
- **Thông tin tài khoản nhận thanh toán**:
  - Ngân hàng: **Techcombank** (Mã: `TCB`, BIN: `970407`).
  - Số tài khoản: **`8799999990`**.
  - Tên chủ tài khoản: **`TRAN ANH HUAN`**.
  - Hotline hỗ trợ: **`0855550813`**.
- **Quy trình sinh đơn & mã QR**:
  - Chủ hồ chọn gói (Silver 99k / Gold 179k) và bấm "Gia hạn / Đăng ký" tại trang Cài đặt.
  - Hệ thống tạo đơn hàng `SubscriptionOrder` ở trạng thái `PENDING` với mã đơn duy nhất `orderCode` định dạng `HC<6_suy_ngau_nhien>` (ví dụ `HC749102`).
  - Sinh mã VietQR động khóa cứng chính xác số tiền (99.000đ hoặc 179.000đ) và cú pháp nội dung chuyển khoản: `HOCAU <ORDER_CODE>`.
- **Yêu cầu bắt buộc trên Modal QR**:
  - **Hotline Cứu hộ**: Hiển thị nổi bật kèm liên kết gọi nhanh:
    `"Gặp sự cố chuyển khoản? Liên hệ ngay Hotline hỗ trợ trực tiếp: 0855550813"`.
  - **Ghi chú pháp lý minh bạch chi phí**: Đặt ở vị trí dễ nhìn ngay dưới mã QR:
    `"Mức phí trên là số tiền thực nhận của gói cước. Mọi khoản phí phát sinh từ ngân hàng hoặc cổng thanh toán (nếu có) do chủ hồ chịu trách nhiệm thanh toán."`.
  - Cơ chế tự động lắng nghe: Client tự động polling mỗi 3 giây qua `GET /api/subscription/orders/[orderId]`, ngay khi tiền về sẽ tự động chuyển sang màn hình thông báo kích hoạt thành công mà không cần người dùng thao tác thêm.

#### 4.3.2 Webhook Ngân Hàng & Core Transaction (`POST /api/webhooks/bank`)
- **Bảo mật**: Xác thực chữ ký hoặc API key qua header `Authorization: Bearer <BANK_WEBHOOK_SECRET>`, `x-api-key`, hoặc chữ ký HMAC `x-signature`.
- **Chống cộng dồn trùng lặp (Idempotency)**: Nếu đơn hàng đã có trạng thái `PAID`, hệ thống lập tức trả về HTTP 200 `{ idempotent: true }`, ngăn chặn triệt để rủi ro ngân hàng retry nhiều lần gây cộng dồn thời gian sai.
- **Prisma Transaction cốt lõi**:
  1. Đổi trạng thái `SubscriptionOrder` sang `PAID`, ghi nhận `paidAt`, `bankRef` và raw webhook payload.
  2. **Cộng dồn thời hạn sử dụng**:
     - Nếu hồ còn hạn (`subscriptionExpiresAt > now`): `newExpiresAt = subscriptionExpiresAt + 30 ngày`.
     - Nếu hồ đã hết hạn hoặc chưa có hạn: `newExpiresAt = now + 30 ngày`.
  3. Cập nhật `Organization.validUntil = newExpiresAt` và `subscriptionPlan`.
  4. Cập nhật `Lake.subscriptionExpiresAt = newExpiresAt`, `subscriptionStatus = ACTIVE` và `subscriptionPlan`.
  5. Ghi nhận `AuditEvent`: `entityType: "SUBSCRIPTION"`, `action: "PLAN_ACTIVATED"`, `createdBy: "WEBHOOK_BANK"`.

#### 4.3.3 Chặn giới hạn gói cước (Guard Enforcement)
- **Kiểm tra ô câu** (`assertSpotLimit` tại `POST /api/huts` và `POST /api/spots`):
  - Nếu hồ thuộc gói `SILVER` và số ô câu (`deletedAt: null`) >= 30, chặn với HTTP 403:
    *"Gói Bạc (SILVER) chỉ hỗ trợ tối đa 30 ô câu. Vui lòng nâng cấp lên Gói Vàng (GOLD) để tạo thêm ô câu không giới hạn."*
- **Kiểm tra nhân sự** (`assertStaffLimit` tại `POST /api/members` và `POST /api/memberships`):
  - Nếu hồ thuộc gói `SILVER` và số nhân viên/quản lý (`STAFF`/`MANAGER`) >= 1, chặn với HTTP 403:
    *"Gói Bạc (SILVER) chỉ hỗ trợ tối đa 1 nhân viên. Vui lòng nâng cấp lên Gói Vàng (GOLD) để thêm nhân sự không giới hạn."*
- Khi nâng cấp lên gói `GOLD`, gỡ bỏ toàn bộ giới hạn ngay lập tức.

### 4.4 Cấu trúc điều hướng và Trang Nhật ký

- **Thanh điều hướng chính (Mobile Bottom Navigation)**:
  `Đang câu (/sessions) | Tạo vé (/sessions/new) | Nhật ký (/activity) | Báo cáo (/reports/daily) | Cài đặt (/settings)`
  *(Tab "Bán hàng" cũ được thay thế bằng tab "Nhật ký". Nghiệp vụ bán lẻ được tích hợp trực tiếp thành một chế độ trong trang Tạo vé).*

- **Trang Nhật ký gồm 2 nhóm nghiệp vụ phân định rõ ràng**:
  1. **Lịch sử đơn hàng**:
     - Phân loại rõ: Vé câu (`FISHING`) và Đơn bán lẻ (`RETAIL`).
     - Hiển thị: Mã đơn / Mã vé, Khách hàng, Ô câu & Gói câu (nếu là vé câu), Danh sách sản phẩm, Tổng tiền, Đã thu, Còn nợ hoặc Hoàn lại, Phương thức thanh toán, Tên nhân viên, Trạng thái đơn.
     - Thao tác: Xem chi tiết đơn hàng, In lại vé / In lại bill.
  2. **Nhật ký hoạt động (Audit Logs)**:
     - Ghi nhận và hiển thị toàn diện các sự kiện vận hành: Tạo / Hủy vé, Gia hạn, Thêm / Hủy sản phẩm, Tạo sản phẩm mới, Nhập thêm hàng vào kho, Chỉnh giá niêm yết, Giảm giá / Phụ thu, Thu mua cá, Thu tiền / Hoàn tiền, Kết thúc phiên, In lại vé hoặc bill, Thao tác quản trị phân quyền.
     - Mỗi log phải có: `lakeId`, thời gian timestamp, người thực hiện (`actorId` / tên nhân viên), loại hành động (`action`), đối tượng liên quan (`entityType`/`entityId`), payload chi tiết trước/sau và lý do nếu có.
     - Bộ lọc nghiệp vụ: Lọc theo khoảng ngày, nhân viên, khách hàng, mã đơn/vé, loại hoạt động và trạng thái. Backend kiểm tra tenant guard và RBAC nghiêm ngặt.

### 4.5 Xác thực & Định danh Chủ hồ bằng Số điện thoại & OTP

Nhằm đơn giản hóa tối đa quy trình tiếp cận cho chủ hồ câu, hệ thống hỗ trợ đăng ký và đăng nhập nhanh bằng Số điện thoại di động Việt Nam kết hợp mã OTP 6 chữ số:

1. **Chuẩn hóa số điện thoại**:
   - Tất cả số điện thoại đầu vào được chuẩn hóa về định dạng E.164 (`+84xxxxxxxxx`) theo dải đầu số di động Việt Nam (03, 05, 07, 08, 09).
   - Ràng buộc `User.phone` là duy nhất (`@unique`) trong hệ thống.
   - Thêm cờ `User.phoneVerified (Boolean)` để xác định tài khoản đã được kích hoạt và xác thực số điện thoại chính chủ.

2. **Cơ chế OTP (Bảng `OtpCode`)**:
   - Lưu trữ tạm thời: `phone (unique, indexed)`, `code` (6 số ngẫu nhiên), `expiresAt` (5 phút), `attempts` (số lần thử sai, tối đa 5 lần).
   - Mỗi số điện thoại chỉ tồn tại tối đa 1 bản ghi OTP hợp lệ tại một thời điểm (upsert ghi đè mã cũ khi yêu cầu gửi lại).

3. **Luồng API**:
   - `POST /api/auth/send-otp`:
     - Nhận số điện thoại, chuẩn hóa định dạng.
     - Rate-limiting chống spam: Tối đa 3 lần gửi / 5 phút cho mỗi số điện thoại.
     - Sinh mã 6 số ngẫu nhiên qua `crypto.randomInt`, lưu hạn 5 phút và gửi tin nhắn SMS OTP.
   - `POST /api/auth/verify-otp`:
     - Kiểm tra hạn dùng (5 phút) và giới hạn 5 lần nhập sai.
     - Nếu đúng: Xóa mã OTP đã dùng.
     - **Tài khoản đã có**: Cập nhật `phoneVerified = true`.
     - **Tài khoản mới**: Tự động kích hoạt luồng khởi tạo trọn gói trong 1 database transaction Serializable: Tạo `User` (phoneVerified: true), tạo `Organization` (kèm 30 ngày `TRIAL`), tạo `Lake` (kèm 30 ngày `TRIAL`), và gán quyền `Membership` với vai trò `OWNER`.

4. **Tích hợp NextAuth**:
   - Provider `phone-otp` hỗ trợ `signIn("phone-otp", { phone, code })` để cấp session JWT cookie đồng bộ và bảo mật, cho phép chủ hồ duy trì đăng nhập mà không cần mật khẩu.

5. **Trải nghiệm người dùng (Mobile-First UI)**:
   - Màn hình `/login`: Mặc định ưu tiên tab **Số điện thoại (OTP)** với bàn phím số tự động, tự động xác thực ngay khi nhập đủ 6 chữ số OTP, có đếm ngược 60s gửi lại mã và tùy chọn đổi số. Đồng thời giữ tab Email & Mật khẩu cho quản trị viên.
   - Trang `/settings`: Hiển thị rõ ràng số điện thoại đã xác minh của chủ hồ kèm huy hiệu `[✓ Đã xác thực SĐT]`.

---

## 5. Trạng thái chuẩn

### 5.1 Phiên câu

```text
OPEN → FISHING → CHECKOUT_PENDING → COMPLETED
  └──────────────→ CANCELLED
```

- `OPEN`: bản ghi vừa được tạo nhưng chưa xác nhận bắt đầu; nếu UI mở vé nguyên tử thì trạng thái có thể chuyển thẳng `FISHING` trong cùng transaction.
- `FISHING`: đang câu và giữ ô.
- `CHECKOUT_PENDING`: đang tất toán; vẫn giữ ô để ngăn người khác mở vé.
- `COMPLETED`: đã kết thúc hợp lệ; giải phóng ô.
- `CANCELLED`: hủy có lý do, người thực hiện và audit log.

Chỉ `OPEN`, `FISHING`, `CHECKOUT_PENDING` được tính là active.

### 5.2 Trạng thái thời gian — tính động

- `NORMAL`: còn nhiều hơn ngưỡng cảnh báo.
- `ENDING_SOON`: còn từ 0 đến ngưỡng cảnh báo.
- `OVERTIME`: `serverNow > endTime`.

Không ghi countdown mỗi giây vào database. Countdown được suy ra từ `serverNow`, `startTime`, `endTime`.

### 5.3 Hóa đơn

`DRAFT → UNPAID → PARTIAL → PAID`

- Có thể chuyển sang `VOID` theo quyền và audit.
- Hoàn tiền tạo reversal/refund record; không sửa/xóa payment cũ.
- Hóa đơn `PAID` không chỉnh trực tiếp.

### 5.4 Ca làm

`OPEN → CLOSING → CLOSED → REOPENED`

Reopen chỉ OWNER, cần lý do và audit log.

---

## 6. Cấu hình vận hành

OWNER cấu hình theo hồ:

- Khu vực và ô câu: mã ô, tên hiển thị, thứ tự, trạng thái `AVAILABLE/MAINTENANCE/DISABLED`.
- Gói câu: tên, thời lượng nguyên phút, giá VNĐ, hiệu lực, thứ tự hiển thị.
- Ngưỡng cảnh báo sắp hết giờ: mặc định 15 phút, có thể đổi.
- Grace time và cách tính quá giờ: cấu hình rõ; server snapshot quy tắc vào phiên.
- Phụ thu/gia hạn: theo block phút hoặc gói mở rộng; không hardcode trong UI.
- Sản phẩm và kho hàng:
  - SKU/mã sản phẩm do server tự sinh (`SP-0001`, `SP-0002`...) tuần tự theo từng hồ (`lakeId`), không nhận SKU thủ công từ client.
  - Khi tạo sản phẩm mới: Nhập "Số lượng nhập kho ban đầu" (số nguyên >= 0). Tạo sản phẩm và bản ghi tồn kho ban đầu trong cùng database transaction Serializable kèm `InventoryMovement` và `AuditEvent`.
  - Nhập thêm hàng: Hỗ trợ Idempotency-Key chống bấm trùng; lưu lịch sử, thời gian, người thực hiện, giá nhập tùy chọn, nhà cung cấp tùy chọn, ghi chú tùy chọn.
  - Không cho phép sửa trực tiếp số tồn kho mà không có lịch sử. Điều chỉnh sai sót phải dùng movement đảo (reversal), không xóa lịch sử kho.
  - Tồn kho: cấm dùng `Float`, dùng `Decimal` hoặc số nguyên; mặc định không cho bán âm (`allowNegativeInventory: false`).
- Loại cá thu mua: đơn giá/kg, ngưỡng cân nếu có, hiệu lực.
- Phương thức thanh toán: tiền mặt, chuyển khoản và phương thức được bật khác.
- Máy in: khổ 58/80mm, số bản, header/footer bill.

Thời gian và giá cũ không thay đổi khi OWNER sửa cấu hình sau này vì phiên/hóa đơn đã lưu snapshot.

---

## 7. Luồng Tạo vé mới — đặc tả bắt buộc

### 7.1 Mục tiêu UX

- Một màn hình, ưu tiên điện thoại.
- Thứ tự: Khách hàng → Ô câu → Gói câu → Thu trước/Thu sau → Sản phẩm đầu kỳ → Xác nhận.
- Nút chính cao tối thiểu 48px.
- Không mất dữ liệu form khi API lỗi.
- Chỉ điều hướng sang “Đang câu” sau khi server xác nhận thành công.

### 7.2 Bước 1 — Khách hàng

Có ba chế độ loại trừ nhau:

#### A. Khách lẻ

- Là mặc định.
- Không gọi `POST /api/customers`.
- Gửi `customerMode = GUEST`, `customerId = null`.
- Snapshot trên phiên: `customerName = "Khách lẻ"`, `customerPhone = null`.
- Không tạo bản ghi Customer rác.

#### B. Khách cũ

- Tìm theo tên hoặc số điện thoại; debounce khoảng 300ms, tối thiểu 2 ký tự.
- Kết quả luôn thuộc `lakeId` hiện tại và `deletedAt = null`.
- Nhân viên phải chọn một kết quả; không tự suy ra customer từ text.
- Sau khi chọn, hiển thị tên + 4 số cuối điện thoại để kiểm tra.

#### C. Khách mới

- Mở form/modal riêng.
- `fullName`: bắt buộc, trim, 2–100 ký tự.
- `phone`: tùy chọn theo chính sách hồ; nếu có thì chuẩn hóa số Việt Nam trước khi so trùng.
- Unique theo `(lakeId, normalizedPhone)` khi phone khác null; không unique toàn hệ thống.
- Nếu trùng, trả `CUSTOMER_PHONE_EXISTS` kèm ID khách cũ hợp lệ để UI mời chọn khách cũ.
- Không tạo Customer bằng một request rời rồi tiếp tục mở vé nếu hai thao tác không nằm trong cùng server transaction/orchestration.

### 7.3 Bước 2 — Chọn ô câu

- UI chỉ cho chọn ô `AVAILABLE` và không có active session.
- Ô `OCCUPIED`, `MAINTENANCE`, `DISABLED` phải vô hiệu hóa, có nhãn rõ.
- Màu không phải tín hiệu duy nhất; luôn có chữ/icon trạng thái.
- Khi chọn ô, UI lưu `spotId`, không dùng số thứ tự làm khóa.
- Trước commit, server kiểm tra lại trong transaction.
- Database phải có ràng buộc chống hai active session trên cùng `(lakeId, spotId)`; không chỉ kiểm tra bằng UI.

### 7.4 Bước 3 — Chọn gói/ca câu

- Chỉ hiển thị package đang active của hồ hiện tại.
- UI gửi `packageId`, không gửi giá hoặc duration làm nguồn sự thật.
- Server snapshot: `packageName`, `durationMinutes`, `basePriceVnd`.
- `startTime` mặc định là thời điểm server commit mở vé thành công.
- `endTime = startTime + durationMinutes` do server tính.
- Lưu timestamp UTC; hiển thị theo timezone của hồ.
- Không dùng `durationHours Float`; dùng `durationMinutes Int`.
- Hiển thị giờ vào/ra đến phút; dữ liệu gốc vẫn giữ độ chính xác timestamp, không âm thầm làm tròn để tính tiền.
- Sửa giờ bắt đầu chỉ OWNER/CASHIER được cấp quyền, cần lý do và audit; server tính lại endTime theo quy tắc đã snapshot.

### 7.5 Bước 4 — Thu trước/Thu sau

- `PREPAID`: cho nhập một hoặc nhiều payment đầu kỳ, tổng không âm và không vượt quy tắc hồ.
- `POSTPAID`: có thể không thu tiền lúc mở vé.
- Payment có `method`, `amountVnd`, `reference`, `receivedAt`, `actorId`.
- Không dùng một chuỗi `paymentMethod` duy nhất trên Invoice vì thực tế có thể chia tiền mặt + chuyển khoản.
- Tổng đã thu bằng tổng Payment hợp lệ; không tin số client tự cộng.

### 7.6 Bước 5 — Sản phẩm đầu kỳ

- Cho thêm nước, mồi hoặc sản phẩm ngay khi mở vé.
- UI gửi `productId` + `quantity`; server lấy giá và snapshot tên/SKU/đơn giá.
- Số lượng là số dương, có giới hạn hợp lý.
- Nếu không đủ tồn và hồ không cho bán âm, trả `OUT_OF_STOCK`; không mở vé nửa chừng.
- Inventory ghi theo ledger `InventoryMovement`, không chỉ trừ một con số không có lịch sử.

### 7.7 Bước 6 — Xác nhận và submit

Điều kiện bật nút “Mở vé”:

- Đã chọn ô hợp lệ.
- Đã chọn gói hợp lệ.
- Khách cũ đã được chọn hoặc khách mới hợp lệ; khách lẻ không cần tên/SĐT.
- Payment và item hợp lệ.
- Thiết bị online.
- Thuê bao và quyền hợp lệ theo dữ liệu server gần nhất.

Khi bấm:

1. Tạo `clientMutationId` UUID một lần cho lần submit.
2. Chuyển UI `IDLE → SUBMITTING`.
3. Disable nút và toàn bộ điều khiển có thể làm thay đổi payload.
4. Gửi đúng một request.
5. Không tự retry request ghi không an toàn.
6. Nếu thành công, lưu response, invalidate danh sách ô/phiên, điều hướng đến phiên vừa tạo và cho phép in vé.
7. Nếu lỗi, trở về `ERROR`, giữ form, focus vùng lỗi và cho phép người dùng chủ động thử lại.

### 7.8 API mở vé nguyên tử

Endpoint chuẩn ưu tiên:

```http
POST /api/fishing-sessions
Idempotency-Key: <clientMutationId>
```

Không dùng `POST /api/fishing-sessions/{id}` để tạo mới nếu route có ID dành cho cập nhật.

Request tham chiếu:

```json
{
  "clientMutationId": "uuid",
  "spotId": "uuid",
  "packageId": "uuid",
  "customer": {
    "mode": "GUEST | EXISTING | NEW",
    "id": null,
    "fullName": null,
    "phone": null
  },
  "paymentMode": "PREPAID | POSTPAID",
  "payments": [
    { "method": "CASH", "amountVnd": 320000, "reference": null }
  ],
  "items": [
    { "productId": "uuid", "quantity": 1 }
  ]
}
```

Client không được gửi `lakeId`, `actorId`, giá, tổng tiền, `startTime`, `endTime` hoặc trạng thái cuối.

Server transaction phải thực hiện theo thứ tự:

1. Xác thực user, tenant, quyền, subscription.
2. Validate Zod và giới hạn payload.
3. Kiểm tra idempotency key.
4. Đọc/khóa ô, package, customer/product thuộc đúng tenant.
5. Kiểm tra active session của ô.
6. Tạo Customer nếu mode `NEW`.
7. Tạo FishingSession và snapshot gói/khách/thời gian.
8. Tạo Invoice `DRAFT/UNPAID`.
9. Tạo InvoiceItem và InventoryMovement nếu có.
10. Tạo Payment nếu có và tính trạng thái hóa đơn.
11. Tạo AuditLog.
12. Lưu kết quả idempotency và commit.

Nếu bất kỳ bước nào lỗi, toàn bộ transaction rollback. Không được để Customer, Session, Invoice hoặc tồn kho ở trạng thái dở dang.

Response tối thiểu:

```json
{
  "ok": true,
  "data": {
    "session": {
      "id": "uuid",
      "status": "FISHING",
      "startTime": "ISO-8601",
      "endTime": "ISO-8601"
    },
    "invoice": {
      "id": "uuid",
      "status": "UNPAID",
      "totalAmountVnd": 320000,
      "paidAmountVnd": 0,
      "balanceDueVnd": 320000
    },
    "serverNow": "ISO-8601"
  },
  "requestId": "uuid"
}
```

### 7.9 Idempotency

- Unique `(lakeId, clientMutationId, action)`.
- Gửi lại cùng key + cùng payload: trả lại kết quả lần đầu, không tạo thêm dữ liệu.
- Cùng key + payload khác: trả `409 IDEMPOTENCY_CONFLICT`.
- Lưu hash payload, resource ID, response tối thiểu và thời gian hết hạn phù hợp.
- Button lock là UX; idempotency + database constraint mới là bảo vệ thật.

### 7.10 Xử lý lỗi 400/409 và lỗi `startTime`

- `400 VALIDATION_ERROR`: đánh dấu đúng field, giữ form, không tạo dữ liệu.
- Với `GUEST`, tuyệt đối không gọi `/api/customers` bằng payload trống.
- `409 SPOT_OCCUPIED`: thông báo “Ô câu đã có khách đang câu”, bỏ chọn ô cũ và refresh danh sách ô.
- `409 CUSTOMER_PHONE_EXISTS`: gợi ý chọn khách đã có.
- `409 IDEMPOTENCY_CONFLICT`: dừng và ghi log requestId; không tự tạo key mới để che lỗi.
- Client chỉ đọc `data.session.startTime` sau khi kiểm tra `response.ok`, `payload.ok` và validate response schema.
- Không dùng optional chaining để che một response sai cấu trúc rồi coi thao tác là thành công.

### 7.11 Quy trình Modal Vé câu (Bill tạm tính) và In vé 58mm sau khi mở

- Sau khi bấm nút "Tạo vé và mở ô", database transaction commit thành công, hệ thống **không chuyển trang đột ngột** mà tự động mở **Modal Vé câu (Bill tạm tính)** ngay trên màn hình để nhân viên và khách hàng đối soát.
- Nội dung Vé câu (Bill tạm tính) hiển thị đầy đủ:
  1. Mã vé tự động (ví dụ: `#ABC12345`).
  2. Tên hồ câu và vị trí ô câu (kèm khu vực, ví dụ: Ô 01 - Khu Bờ A).
  3. Tên khách hàng (hoặc "Khách lẻ") kèm số điện thoại (nếu có).
  4. Gói câu và thời lượng ca (ví dụ: Ca câu 5 tiếng - 300 phút).
  5. Giờ vào (Giờ bắt đầu chính thức).
  6. Giờ ra (Giờ kết thúc dự kiến).
  7. Tên nhân viên tạo vé / thu ngân.
  8. Ghi chú vé câu (nếu nhân viên có nhập ghi chú khi tạo vé).
  9. Tạm tính tiền gói / Tiền cọc ban đầu.
- Quy tắc điều hướng và in vé:
  - **Nút "In vé câu & Sang Đang câu"**: Gửi lệnh in đến máy in nhiệt 58mm ESC/POS (hoặc in qua trình duyệt nếu chưa kết nối máy in), hiển thị thông báo thành công và chuyển sang tab Đang câu (`/sessions`).
  - **Nút "Không in, chuyển tiếp ➔"**: Nếu hồ không có nhu cầu in vé giấy, nhân viên bấm nút này để chuyển thẳng sang tab Đang câu (`/sessions`).
  - **Nút "In thêm 1 bản"**: Hỗ trợ in thêm 1 bản phụ cho khách giữ trước khi chuyển màn hình.
- Lỗi máy in không làm rollback phiên câu đã mở thành công; vé đã lưu an toàn trong hệ thống và có thể in lại bất kỳ lúc nào từ tab Nhật ký.

### 7.12 Bán lẻ trong trang Tạo vé (Retail POS)

- Trang Tạo vé (`/sessions/new`) cung cấp 2 chế độ chuyển đổi trực quan: `[ Tạo vé câu | Bán lẻ ]`.
- Đặc tả luồng Bán lẻ:
  - Dành cho khách vãng lai mua đồ không mở ca câu.
  - Khách hàng là tùy chọn (mặc định Khách lẻ).
  - Tuyệt đối không tạo `FishingSession`, không chiếm giữ ô (`Hut`), không chọn gói câu, không chạy đồng hồ.
  - Tự động sinh mã đơn bán lẻ.
  - Tạo `Invoice` (với `fishingSessionId = null`), `InvoiceLine` snapshot tên/giá/số lượng, `Payment` ghi nhận tiền thu, `InventoryMovement` xuất kho, và `AuditEvent` trong cùng một database transaction Serializable.
  - Kiểm tra tồn kho trước khi xuất: nếu không đủ tồn và hồ không cho phép bán âm, trả lỗi chuẩn `OUT_OF_STOCK` và rollback toàn bộ.
  - Hỗ trợ phương thức thanh toán Tiền mặt hoặc Chuyển khoản.
  - In bill 58mm sau commit và hỗ trợ in lại.
  - Giao dịch xuất hiện trong tab Nhật ký và Báo cáo ca.
  - Tách biệt tuyệt đối 2 invariant:
    1. Thêm hàng vào Invoice của phiên câu đang chạy (`fishingSessionId != null`).
    2. Bán lẻ bằng Invoice độc lập (`fishingSessionId = null`). Không bao giờ trộn lẫn 2 luồng này.

---

## 8. Trang Đang câu

### 8.1 Đồng hồ

- Client tính `remainingMs = endTime - correctedNow`.
- `correctedNow` hiệu chỉnh từ `serverNow` trong response; đồng bộ lại khi focus, reconnect và định kỳ.
- Không ghi database mỗi giây.
- Còn dưới ngưỡng: đổi trạng thái rõ ràng và rung/âm thanh nếu người dùng đã cho phép.
- Âm thanh chỉ phát sau tương tác người dùng, có tùy chọn tắt và chống phát lặp liên tục.

### 8.2 Thêm sản phẩm

- Có idempotency key riêng cho mỗi lần thêm.
- Server snapshot giá và ghi InvoiceItem + InventoryMovement trong transaction.
- Sau lỗi mạng không được tự cho rằng đã thất bại; tra cứu mutation trước khi người dùng thử lại.

### 8.3 Gia hạn

- Gia hạn là event append-only, không sửa mơ hồ duration cũ.
- Lưu số phút thêm, đơn giá/tổng tiền snapshot, actor và thời điểm.
- Server tính `newEndTime` từ endTime hiện tại hoặc quy tắc hồ.
- Nếu hai máy gia hạn cùng lúc, dùng optimistic concurrency/version; một request nhận `409 VERSION_CONFLICT` và phải refresh.

### 8.4 Chuyển ô

- Chỉ cho chuyển sang ô trống.
- Khóa/kiểm tra cả ô cũ và ô mới trong transaction.
- Ghi lịch sử chuyển ô; không xóa dấu vết ô ban đầu.

---

### 8.5 Thu mua cá trực tiếp tại ô đang câu

- Thu mua cá từ cần thủ được liên kết trực tiếp vào phiên câu (`sessionId`) và hóa đơn của phiên (`invoiceId`).
- Khi nhân viên cân cá, hệ thống tạo bản ghi `FishPurchase` đồng thời chèn trực tiếp 1 dòng `InvoiceLine` giảm trừ vào hóa đơn với thành tiền âm (`totalVnd = -totalVnd`).
- Việc giảm trừ trực tiếp trên hóa đơn đảm bảo toàn bộ bảng kê dịch vụ và cấn trừ tiền cá được minh bạch trên cùng một chứng từ thanh toán.

### 8.6 Trực quan hóa trạng thái quyết toán tức thời trên thẻ ô câu

- Mỗi thẻ ô câu trên màn hình Đang câu (`/sessions`) tự động tính toán số dư quyết toán theo thời gian thực:

  ```text
  Tổng chi phí = Tiền gói câu + Tiền sản phẩm/dịch vụ + Tiền gia hạn/phụ thu
  Tổng giảm trừ = Tiền tạm tính (cọc đã thu trước) + Tiền cá thu mua lại
  Số dư ròng (Net Balance) = Tổng chi phí - Tổng giảm trừ
  ```

- Quy tắc hiển thị nhãn tài chính trên thẻ ô câu:

  1. **Số dư âm (Net Balance < 0)**: Hồ phải thối lại tiền cho khách do tiền bán cá vượt quá chi phí câu và dịch vụ. Hiển thị nhãn màu đỏ cảnh báo: `Thối lại khách: -X đ` (với $X = |\text{Net Balance}|$).
  2. **Số dư dương (Net Balance > 0)**: Khách còn nợ tiền giờ hoặc tiền nước/mồi. Hiển thị nhãn màu hổ phách: `Cần thu thêm: +X đ`.
  3. **Số dư bằng 0 (Net Balance = 0)**: Đã thanh toán đầy đủ cân bằng.

- Modal chi tiết ô câu (`SessionDetailsModal`) thể hiện rõ ràng toàn bộ các biến số của công thức này, kèm danh sách chi tiết các loại cá đã thu mua và nút thao tác nhanh.

### 8.7 Luồng Thanh toán và In bill trực tiếp tại Ô đang câu

- Toàn bộ quy trình kết thúc ca câu, quyết toán tiền và in bill được thực hiện **trực tiếp tại thẻ ô câu** trên màn hình `/sessions`:
  - Nhân viên bấm nút "Kết thúc / Thanh toán" trên thẻ ô câu $\rightarrow$ Mở màn hình Quyết toán (Settlement Checkout Modal).
  - Modal hiển thị bảng kê 2 phần minh bạch (Các khoản phí phát sinh vs Các khoản đã thanh toán/giảm trừ).
  - Hệ thống tự động xác định trạng thái thu thêm hay thối lại tiền.
  - Khi nhân viên bấm xác nhận:
    1. Ghi nhận giao dịch thanh toán trong database transaction.
    2. Đóng phiên câu (`status: "COMPLETED"`).
    3. Giải phóng ô câu (`Hut.currentSessionId = null`).
    4. Tự động kích hoạt in hóa đơn nhiệt 58mm ESC/POS ngay tại chỗ.

- **Quy chuẩn tab Nhật ký (`/invoices/history`)**:
  - Tab Nhật ký thuần túy là màn hình **lưu trữ lịch sử giao dịch** (Audit Trail & History Archive).
  - Nhiệm vụ chính: Tra cứu hóa đơn theo ngày, lọc theo trạng thái/phương thức thanh toán, xem lại chi tiết bảng kê, và **In lại hóa đơn** (`[BẢN IN LẠI]`).
  - Tuyệt đối không đặt quy trình kết thúc ca câu hoặc quyết toán tại tab Nhật ký. Mọi thao tác kết thúc phiên phải hoàn tất ngay tại ô đang câu.

---

## 9. Kết thúc phiên và checkout

### 9.1 Bắt đầu checkout và Bill quyết toán

- Khi nhân viên bấm "Kết thúc", hệ thống **không đóng phiên ngay**.
- Mở màn hình **Bill quyết toán (Settlement Bill Modal)** ngay tại ô đang câu để nhân viên và khách đối soát:
  - Bảng kê 2 nhóm rõ ràng:
    1. **Chi phí dịch vụ**: Gói câu snapshot + Các đợt gia hạn + Sản phẩm/dịch vụ mua thêm + Phụ thu.
    2. **Đã thanh toán & Giảm trừ**: Tiền tạm tính (tiền cọc đã thu lúc mở vé) + Tiền thu mua cá từ cần thủ.
  - Toàn bộ con số được tính lại từ database server, tuyệt đối không tin tổng tiền từ client.
  - Ô vẫn bị giữ trong suốt thời gian hiển thị quyết toán để tránh người khác mở đè.

### 9.2 Thu mua cá và cấn trừ hóa đơn

- Mỗi dòng cân cá lưu snapshot loại cá, số lượng kg (Decimal), đơn giá VNĐ/kg và thành tiền.
- Khi liên kết với phiên câu, tiền thu cá được ghi nhận vào `InvoiceLine` giảm trừ của hóa đơn phiên.
- Tổng tiền thu mua cá được cộng dồn vào khoản giảm trừ khi quyết toán ca câu.

### 9.3 Công thức Quyết toán chuẩn

```text
Tổng chi phí = Tiền gói + Gia hạn + Sản phẩm/dịch vụ
Tổng giảm trừ = Tiền tạm tính đã nộp + Tiền cá hồ thu lại
Kết quả = Tổng chi phí - Tổng giảm trừ
```

- **Nếu Kết quả Âm ($-$)**: Hồ thối lại tiền cho khách:
  - `refundVnd = abs(Kết quả)`.
  - Giao dịch hoàn trả được ghi nhận là `Payment` xuất chi (`direction: "OUT"`), hóa đơn chuyển trạng thái `PAID`.
  - Nút bấm trên UI thích ứng: `[ Thối tiền ...đ & In bill ]` với tông màu đỏ nổi bật.
  - Trên hóa đơn in 58mm thể hiện rõ dòng: `HOÀN TRẢ KHÁCH: ...đ`.
- **Nếu Kết quả Dương ($+$)**: Khách thanh toán thêm:
  - `netDueVnd = Kết quả`.
  - Nhân viên chọn phương thức thanh toán (Tiền mặt / Chuyển khoản ngân hàng).
  - Ghi nhận `Payment` thu vào (`direction: "IN"`), hóa đơn chuyển trạng thái `PAID`.
  - Nút bấm trên UI thích ứng: `[ Thu tiền ...đ & In bill ]`.
- **Nếu Kết quả Bằng 0 ($0$)**: Hóa đơn đã thanh toán đủ:
  - Không cần thu thêm tiền, hóa đơn chuyển trạng thái `PAID`.
  - Nút bấm trên UI thích ứng: `[ Hoàn tất & In bill ]`.

### 9.4 Hoàn tất phiên và In bill

Trong cùng một database transaction Serializable:

1. Validate trạng thái phiên (`status === "FISHING"`) và kiểm tra version concurrency.
2. Kiểm tra Invoice liên kết: nếu thiếu, kích hoạt cơ chế tự sửa an toàn từ snapshot dữ liệu gốc; tuyệt đối không tạo Invoice thứ hai.
3. Cập nhật `Invoice.totalAmountVnd` chuẩn xác và ghi nhận Payment thu thêm (hoặc Payout/Refund thối lại).
4. Cập nhật trạng thái Invoice sang `PAID`.
5. Chuyển trạng thái phiên sang `COMPLETED` (chỉ chuyển sau khi dữ liệu tài chính ghi thành công).
6. Giải phóng ô câu (`Hut.currentSessionId = null`).
7. Ghi nhận `AuditEvent` chi tiết và liên kết ca làm việc (Shift).

Sau khi transaction commit thành công:

- Kích hoạt in bill thanh toán 58mm ESC/POS ngay tại chỗ.
- Hỗ trợ nút "In lại bill": in lại không tạo thêm giao dịch tài chính, không cộng trùng doanh thu, có nhãn `[BẢN IN LẠI]`.
- Tiền tạm thu ban đầu được ghi nhận là `Payment`, không phải doanh thu bổ sung tách rời; báo cáo ca không được tính trùng hai lần.

### 9.5 Hủy/void/hoàn tiền

- Tuyệt đối không xóa cứng Session/Invoice/Payment/InventoryMovement.
- Bắt buộc đúng quyền (OWNER/CASHIER), có lý do rõ ràng và ghi `AuditEvent`.
- Dùng giao dịch đảo (reversal) để hoàn tiền hoặc hủy giao dịch.
- Nếu đã đóng ca, điều chỉnh vào ca hiện tại và tham chiếu giao dịch gốc; không sửa báo cáo lịch sử âm thầm.

---

## 10. Offline và đồng bộ

### 10.1 MVP

- Cache dữ liệu đọc cần thiết để xem khi mất mạng.
- Có thể lưu **bản nháp form** tạo vé cục bộ, nhưng chưa được coi là phiên đã mở và không giữ ô.
- Khi offline, nút “Mở vé” bị chặn với thông báo rõ; khi online lại phải refresh ô/package/thuê bao rồi người dùng xác nhận submit.
- Không queue tự động tạo phiên, checkout, payment, payout, void hoặc đổi ô trong MVP.

### 10.2 Giai đoạn sau

- Mỗi queued mutation có UUID, dependency, retry count, trạng thái và dữ liệu mã hóa phù hợp.
- Server vẫn áp dụng idempotency, tenant guard, version và constraint.
- Không dùng Last-Write-Wins cho trạng thái ô, phiên, hóa đơn, thanh toán, tồn kho hoặc thu mua cá.
- Xung đột tài chính/chiếm ô phải đưa về `CONFLICT` để con người xử lý.
- Last-Write-Wins chỉ có thể dùng cho dữ liệu ít rủi ro như preference hiển thị sau khi có ADR.

---

## 11. Mô hình dữ liệu lõi

### 11.1 Bảng chính

- `User`
- `Organization`/`Lake`
- `Membership(userId, lakeId, role)`
- `Area`
- `FishingSpot`
- `FishingPackage`
- `Customer`
- `FishingSession`
- `SessionExtension`
- `Invoice`
- `InvoiceItem`
- `Payment`
- `Refund/Reversal`
- `FishPurchase`
- `CustomerPayout`
- `Product`
- `InventoryMovement`
- `WorkShift`
- `Expense`
- `AuditLog`
- `IdempotencyRecord`

### 11.2 Trường bắt buộc của FishingSession

- `id`, `lakeId`, `spotId`, `customerId?`
- Snapshot: `customerName`, `customerPhone?`, `packageName`, `durationMinutes`, `basePriceVnd`
- `status`, `startTime`, `endTime`, `version`
- Snapshot quy tắc overtime/cảnh báo cần thiết.
- `createdBy`, `createdAt`, `updatedAt`, `cancelledAt?`, `cancelReason?`

### 11.3 Ràng buộc

- Index `(lakeId, status)`, `(lakeId, createdAt)`, `(lakeId, spotId)`.
- Unique phone khách theo hồ khi phone khác null.
- Unique invoice theo session nếu nghiệp vụ một hóa đơn/phiên.
- Unique idempotency record.
- Database-level protection cho một active session/spot; Prisma schema không biểu đạt đủ thì dùng SQL migration có review.
- Master data dùng soft delete; sổ cái tài chính dùng trạng thái/reversal, không soft delete như cách che mất giao dịch.

---

## 12. Danh mục mã lỗi

| HTTP | Code | Thông báo UI/Ứng xử |
| ---: | --- | --- |
| 400 | `VALIDATION_ERROR` | Dữ liệu chưa hợp lệ; đánh dấu field |
| 401 | `AUTH_REQUIRED` | Phiên đăng nhập hết hạn; đăng nhập lại |
| 403 | `PERMISSION_DENIED` | Không có quyền; liên hệ chủ hồ |
| 403 | `SUBSCRIPTION_EXPIRED` | Chuyển read-only/gia hạn |
| 404 | `RESOURCE_NOT_FOUND` | Dữ liệu không tồn tại hoặc không thuộc hồ |
| 409 | `SPOT_OCCUPIED` | Refresh ô, bỏ chọn ô xung đột |
| 409 | `CUSTOMER_PHONE_EXISTS` | Gợi ý chọn khách cũ |
| 409 | `VERSION_CONFLICT` | Refresh dữ liệu trước khi thao tác lại |
| 409 | `IDEMPOTENCY_CONFLICT` | Dừng, log requestId, không đổi key để retry |
| 409 | `OUT_OF_STOCK` | Báo sản phẩm và tồn hiện tại |
| 422 | `INVALID_STATE_TRANSITION` | Không cho chuyển trạng thái sai |
| 429 | `RATE_LIMITED` | Chờ rồi thử lại theo hướng dẫn |
| 500 | `INTERNAL_ERROR` | Thông báo chung + requestId; không lộ DB error |

---

## 13. Logging, audit và quan sát

Mỗi request ghi log có cấu trúc:

- `requestId`, `clientMutationId`
- `actorId`, `lakeId`
- action, resource type/id
- result, error code, duration
- app version/deployment

Không log mật khẩu, token, connection string, toàn bộ số điện thoại hoặc payload nhạy cảm.

Audit log bắt buộc cho:

- Mở/hủy/kết thúc/gia hạn/chuyển ô.
- Sửa giờ, giá, giảm giá.
- Payment, refund, payout, void/reversal.
- Mở/chốt/mở lại ca.
- Thay quyền, cấu hình và thuê bao.

### 13.1 Đặc tả Báo cáo ca chi tiết

Báo cáo ca phải tổng hợp từ dữ liệu giao dịch đã commit và hiển thị đầy đủ các chỉ số:

1. **Vé câu**: Tổng số lượng vé đã mở, phân bổ theo trạng thái (hoàn thành, đang chạy, hủy).
2. **Doanh thu theo gói câu**: Tách riêng gói 5 giờ, gói 10 giờ và các gói giờ lẻ/khác.
3. **Sản phẩm & Dịch vụ**: Số lượng và doanh thu từng mặt hàng bán kèm phiên câu.
4. **Đơn bán lẻ**: Số lượng đơn và tổng doanh số bán lẻ độc lập.
5. **Các khoản điều chỉnh**: Doanh thu gia hạn, phụ thu quá giờ, tổng tiền giảm giá.
6. **Thu mua cá**: Khối lượng cá thu mua (kg) và tổng tiền chi thu mua cá.
7. **Dòng tiền thanh toán**:
   - Tiền tạm thu (cọc lúc mở vé).
   - Tiền thu thêm tại thời điểm quyết toán.
   - Tiền hoàn trả lại cho khách (nếu có).
   - Phân rã theo phương thức: Tiền mặt vs Chuyển khoản ngân hàng.
8. **Nhân sự & Vị trí**: Báo cáo theo nhân viên tạo vé/thu ngân, theo khu vực và ô câu.
9. **Sổ kho**: Tổng số lượng nhập kho, xuất bán, và tồn kho cuối ca.

- *Nguyên tắc dữ liệu*: Toàn bộ tên sản phẩm, SKU, tên gói, đơn giá phải lấy từ snapshot tại thời điểm giao dịch; thay đổi cấu hình sau này không làm sai lệch báo cáo quá khứ.

### 13.2 Hướng dẫn sử dụng & Onboarding

- **Mục tiêu UX**: Văn phong ngắn gọn, trong sáng, học sinh lớp 5 đọc hiểu và làm theo được ngay; nhân viên mới thành thạo thao tác cơ bản trong tối đa 10 phút.
- **Điểm truy cập**:
  1. Landing page (`/`): Cẩm nang hướng dẫn public, không cần đăng nhập, không để lộ dữ liệu thật hoặc chức năng quản trị nhạy cảm.
  2. Tự động bật Modal Onboarding khi người dùng đăng nhập lần đầu tiên.
  3. Nút `?` Hướng dẫn luôn hiển thị cố định, dễ bấm trên thanh Header mobile.
  4. Menu Cài đặt → Hướng dẫn sử dụng (`/settings/guide`).
- **Nội dung 11 bước chuẩn hóa**:
  1. Đăng nhập và chọn hồ câu.
  2. Cài đặt hồ, ô câu và biểu giá gói câu.
  3. Tạo sản phẩm mới và nhập kho ban đầu.
  4. Tạo vé câu, thu tiền tạm và in vé 58mm.
  5. Theo dõi phiên câu và đồng hồ cảnh báo.
  6. Thêm nước/mồi, gia hạn giờ câu và thu mua cá.
  7. Kết thúc phiên, kiểm tra bill quyết toán và in bill.
  8. Bán lẻ hàng hóa cho khách vãng lai.
  9. Xem Nhật ký đơn hàng, tra cứu hoạt động và chốt ca.
  10. Cài đặt và kết nối máy in hóa đơn (Bluetooth/USB/WiFi).
  11. Xử lý các tình huống lỗi thường gặp.
- **Yêu cầu kỹ thuật**:
  - Mỗi bước chỉ giải thích một việc duy nhất, có hình minh họa, có nút Quay lại / Tiếp tục / Bỏ qua / Xem lại sau.
  - Lưu tiến độ đã đọc theo `userId` trên trình duyệt (`localStorage`).
  - Phân loại nội dung theo quyền (STAFF chỉ thấy luồng bán hàng; OWNER thấy cấu hình, kho và chốt ca).
  - Đóng hướng dẫn không làm mất dữ liệu form đang nhập dở.

### 13.3 Tiêu chuẩn Giao diện Mobile chuyên nghiệp (Mobile UX Guidelines)

- **Ngôn ngữ nhận diện QuanLiHoCau**:
  - Tông màu: Nâu gỗ đậm (`#27231F`, `#3D2E1E`), Vàng đồng/Ánh kim (`#C89B3C`, `#E3B76E`, `#8A5A20`), Kem/Nền giấy ấm (`#F4F2EE`, `#EFE4CF`).
  - Thiết kế sang trọng, tương phản cao, dễ nhìn rõ ngoài trời nắng gắt.
  - Thẻ nội dung (Card) tách lớp rõ ràng khỏi nền; nút chính nổi bật bằng viền và bóng đổ nhẹ.
  - Không lạm dụng gradient màu mè, emoji, card lồng card hoặc hiệu ứng 3D giả lập.
  - Mỗi màn hình chỉ có duy nhất một hành động chính (Primary CTA) nổi bật.
  - Bộ icon SVG đồng nhất một phong cách.
- **Tiêu chuẩn công thái học Mobile**:
  - Hỗ trợ màn hình từ 320px trở lên; tuyệt đối không có thanh cuộn ngang (horizontal scroll).
  - Vùng chạm (Touch target) nút bấm và điều khiển tối thiểu **48px**.
  - Cỡ chữ nội dung tối thiểu **16px** (chống tự zoom trên iOS Safari).
  - Tương thích an toàn Safe-area (`env(safe-area-inset-bottom)`) cho iPhone tai thỏ và Android cử chỉ.
  - Bàn phím ảo mở lên không được che lấp ô nhập liệu và nút xác nhận form.
  - Bottom Navigation có khoảng đệm đáy (padding >= 80px) để không che nội dung cuối trang.
  - Form tự động cuộn (auto-scroll) tới trường có lỗi khi submit thất bại.
  - Nút bấm đang gửi (submitting) phải bị vô hiệu hóa kèm spinner để chống bấm đúp (double-submit).
  - Đầy đủ 6 trạng thái UI: Loading, Empty, Success, Error, Offline và Permission Denied.

---

## 14. Acceptance tests bắt buộc

### 14.1 Tạo vé — happy path

- [ ] Khách lẻ + ô trống + gói hợp lệ + thu sau → một Session và một Invoice.
- [ ] Khách cũ được tìm/chọn đúng trong hồ hiện tại.
- [ ] Khách mới hợp lệ được tạo cùng transaction với vé.
- [ ] Thu trước tiền mặt thành công và số dư đúng.
- [ ] Thu trước tiền mặt + chuyển khoản thành công và tổng Payment đúng.
- [ ] Thêm sản phẩm đầu kỳ cập nhật hóa đơn và ledger kho đúng.
- [ ] Response luôn có `session.startTime`, `endTime`, invoice totals và `serverNow`.

### 14.2 Validation và lỗi

- [ ] Khách lẻ không phát sinh `POST /api/customers`.
- [ ] Khách mới thiếu tên → 400, không có Customer/Session/Invoice dở dang.
- [ ] Số điện thoại trùng trong cùng hồ → 409 và gợi ý khách cũ.
- [ ] Package/spot/customer của hồ khác → 404/403, không lộ dữ liệu.
- [ ] API 400/409 → client không đọc `undefined.startTime`.
- [ ] Lỗi giữ nguyên form và hiển thị requestId khi cần hỗ trợ.

### 14.3 Concurrency và idempotency

- [ ] Bấm Mở vé hai lần → chỉ một phiên.
- [ ] Gửi lại cùng idempotency key/payload → trả cùng kết quả.
- [ ] Cùng key/payload khác → 409.
- [ ] Hai máy mở cùng ô → một thành công, một `SPOT_OCCUPIED`; database chỉ có một active session.
- [ ] Không thể mở ô đang `CHECKOUT_PENDING`.
- [ ] Hai máy gia hạn cùng lúc → version conflict được xử lý rõ.

### 14.4 Transaction và phục hồi

- [ ] Customer tạo thành công nhưng Session lỗi → Customer không bị commit nếu nằm trong command mở vé.
- [ ] Session tạo nhưng Invoice lỗi → toàn bộ rollback.
- [ ] Inventory lỗi → không mở vé nửa chừng.
- [ ] Payment lỗi → không đánh dấu vé/hóa đơn thành công sai.
- [ ] Mất response sau commit → tra idempotency và trả lại kết quả, không tạo bản thứ hai.
- [ ] In lỗi sau commit → vé vẫn tồn tại và in lại được.

### 14.5 Thời gian

- [ ] 5 giờ tương ứng đúng 300 phút; 10 giờ tương ứng đúng 600 phút nếu cấu hình như vậy.
- [ ] Countdown không drift đáng kể sau sleep/focus/reconnect.
- [ ] Cảnh báo sắp hết giờ chỉ phát theo cấu hình, không lặp gây khó chịu.
- [ ] Overtime tính theo server và quy tắc snapshot.
- [ ] Sửa giờ cần đúng quyền, lý do và audit.

### 14.6 Checkout và tiền

- [ ] Thêm hàng/gia hạn/cá thu mua tính đúng bằng integer VNĐ/Decimal.
- [ ] Thanh toán một phần tiền mặt, phần còn lại chuyển khoản.
- [ ] Tiền thu cá lớn hơn hóa đơn tạo payout/công nợ đúng, không số âm mơ hồ.
- [ ] Invoice `PAID` không sửa trực tiếp.
- [ ] Void/refund tạo reversal và audit.
- [ ] Báo cáo ngày đối chiếu đúng với Payment, Payout, Expense và Shift.

### 14.7 Tenant, quyền và thuê bao

- [ ] User hồ A không truy cập được session/invoice hồ B bằng ID.
- [ ] STAFF không thu tiền, sửa giá, void hoặc xem báo cáo OWNER.
- [ ] Thuê bao hết hạn vẫn xem lịch sử nhưng mọi write API bị chặn.
- [ ] Client sửa `lakeId`, price, total hoặc startTime trong request không có tác dụng.

---

## 15. Phân loại lỗi và điều kiện phát hành

- `P0`: sai tiền, mất dữ liệu, lộ tenant, tạo trùng giao dịch hoặc không rollback được.
- `P1`: không hoàn tất được luồng chính, crash UI, không mở/kết thúc vé.
- `P2`: khó dùng, thao tác chậm, thông báo chưa rõ.
- `P3`: thẩm mỹ, cảnh báo lint không ảnh hưởng chức năng.

Điều kiện cutover:

- P0 = 0 và P1 = 0.
- Chạy song song 7–14 ngày tại Hồ Câu Kim Thông.
- Đối soát mỗi ngày: số vé, tiền mặt, chuyển khoản, hàng bán, cá thu mua, payout, phiếu chi.
- Backup và restore thử thành công trên staging.
- Có rollback domain và giữ V1 độc lập đến khi V2 ổn định.

---

## 16. Definition of Done

Một chức năng chỉ Done khi:

- Có acceptance criteria tiếng Việt.
- UI chạy tốt trên iPhone, Android và desktop mục tiêu.
- Backend kiểm tra auth, tenant, permission, subscription và input.
- Có database transaction/idempotency/concurrency guard khi cần.
- Có happy path, validation, error, quyền và duplicate tests.
- Có loading, empty, error và retry state.
- Có audit log nếu liên quan tiền, trạng thái, giá, hủy hoặc quyền.
- Không log secret/PII không cần thiết.
- `lint`, `typecheck`, unit/integration/E2E và build đều pass.
- Đã kiểm tra staging bằng dữ liệu gần thực tế.
- PRD/ADR/runbook được cập nhật.

---

## 17. ADR bắt buộc

- `ADR-001`: PostgreSQL + Prisma là nguồn dữ liệu duy nhất.
- `ADR-002`: Auth.js Credentials là hệ xác thực MVP; OAuth để sau.
- `ADR-003`: Tiền dùng integer VNĐ/Decimal, không Float.
- `ADR-004`: Multi-tenant cưỡng chế ở server/repository/query.
- `ADR-005`: Payment/audit append-only; sửa bằng reversal.
- `ADR-006`: Offline MVP chỉ cache đọc và draft; không mở vé/checkout offline.
- `ADR-007`: V1/V2 tách project; cutover sau pilot và có rollback.
- `ADR-008`: Mobile-first; không sao chép nhận diện sản phẩm khác.
- `ADR-009`: Mở vé là command nguyên tử và idempotent.
- `ADR-010`: Không dùng Last-Write-Wins cho dữ liệu vận hành/tài chính.

---

## 18. Tiến độ Thực hiện & Báo cáo Hiện trạng Kế hoạch (Cập nhật 05/09/2026)

Hệ thống đã hoàn thành 100% các cột mốc nền tảng và tính năng cốt lõi theo kế hoạch:

### 18.1 Danh sách Hạng mục Đã Hoàn Thành (Done)

- [x] **1. Nền móng Nghiệp vụ Vận hành & Mở vé (`sessions`)**:
  - Luồng Mở vé nguyên tử (Atomic transaction), khách lẻ không tạo Customer dư thừa.
  - Chống mở trùng ô (Concurrency Lock + 409 `SPOT_OCCUPIED`).
  - Đồng hồ tính giờ phía server, phụ thu và gia hạn tự động tính toán.
  - Quyết toán (Checkout Settlement), hóa đơn snapshot và giải phóng ô câu khi `COMPLETED`.

- [x] **2. Quản lý Kho, Sản phẩm & Thu mua cá**:
  - Mã SKU tự động sinh tuần tự theo hồ (`SP-0001`, `SP-0002`...).
  - Nhập hàng ban đầu và nhập thêm hàng có Idempotency-Key chống bấm trùng.
  - Quản lý bán lẻ (Retail POS) độc lập và bán hàng kèm phiên câu.
  - Thu mua cá tính trực tiếp vào hóa đơn phiên câu và phiếu chi.

- [x] **3. Báo cáo & Nhật ký hoạt động (Audit Logs)**:
  - Báo cáo doanh thu ca, tiền mặt, chuyển khoản, tiền thu mua cá, chi phí khác.
  - Bảng AuditEvent ghi nhận toàn bộ thao tác tài chính, quyền hạn, cấu hình và giao dịch.
  - Trang Nhật ký (`/activity`) phân tách Lịch sử đơn hàng và Nhật ký kiểm toán.

- [x] **4. Phân quyền Super Admin & Hỗ trợ kỹ thuật (Impersonate Mode)**:
  - Super Admin có trang quản trị danh sách hồ, lọc trạng thái thuê bao, gia hạn thủ công.
  - Chế độ Impersonate hỗ trợ kỹ thuật an toàn, có banner cảnh báo nổi bật và ghi audit log.

- [x] **5. Hệ thống Gói cước SaaS (3 Gói cước)**:
  - **TRIAL**: Dùng thử 30 ngày full tính năng (tương đương Gói Vàng), tự kích hoạt khi tạo hồ.
  - **SILVER**: 99.000đ/tháng, tối đa 30 ô câu (`maxSpots: 30`), tối đa 1 nhân viên (`maxStaff: 1`).
  - **GOLD**: 179.000đ/tháng, không giới hạn ô câu, không giới hạn nhân viên, đầy đủ tính năng.

- [x] **6. Tích hợp VietQR Techcombank Động**:
  - Số tài khoản nhận: **`8799999990`** — Chủ tài khoản: **`TRAN ANH HUAN`** — Ngân hàng: **`Techcombank`**.
  - Sinh mã QR động khóa cứng số tiền (99k/179k) và cú pháp `HOCAU <ORDER_CODE>`.
  - Hiển thị nổi bật Hotline Cứu hộ: **`0855550813`**.
  - Hiển thị dòng ghi chú pháp lý minh bạch chi phí ngay dưới mã QR:
    *"Mức phí trên là số tiền thực nhận của gói cước. Mọi khoản phí phát sinh từ ngân hàng hoặc cổng thanh toán (nếu có) do chủ hồ chịu trách nhiệm thanh toán."*
  - Cơ chế tự động lắng nghe thanh toán (Polling 3s) và hiển thị chúc mừng.

- [x] **7. Webhook Ngân Hàng & Core Transaction (`POST /api/webhooks/bank`)**:
  - Xác thực bảo mật, cơ chế Idempotency chống cộng trùng thời gian lặp lại.
  - Prisma Transaction cộng dồn 30 ngày vào `Organization.validUntil` & `Lake.subscriptionExpiresAt`, cập nhật trạng thái `ACTIVE`, ghi `AuditEvent`.

- [x] **8. Chốt chặn giới hạn gói cước (Guard Enforcement)**:
  - Chặn tạo ô câu thứ 31 trên gói Bạc tại `/api/huts` và `/api/spots` (HTTP 403).
  - Chặn tạo nhân sự thứ 2 trên gói Bạc tại `/api/members` và `/api/memberships` (HTTP 403).
  - Nâng cấp lên gói Vàng mở khóa không giới hạn ngay lập tức.

- [x] **9. Đăng ký & Xác thực Chủ hồ bằng Số điện thoại & OTP**:
  - Chuẩn hóa số điện thoại di động Việt Nam E.164 (`+84xxxxxxxxx`).
  - Lưu mã OTP 6 số (5 phút, tối đa 5 lần thử sai) trong bảng `OtpCode`.
  - API `send-otp` (có rate-limit chống spam) và `verify-otp`.
  - Tự động đăng ký chủ hồ mới kèm hồ câu và gói TRIAL 30 ngày khi xác thực SĐT mới.
  - Tích hợp NextAuth provider `phone-otp` cấp session JWT cookie bảo mật.
  - Màn hình `/login` mobile-first hỗ trợ nhập SĐT, nhận OTP và tự động vào Dashboard.
  - Trang `/settings` hiển thị SĐT chủ hồ với huy hiệu `[✓ Đã xác thực SĐT]`.

### 18.2 Tình trạng Kiểm thử Tự động (Automated Test Suite)
- Tổng số bài test tự động: **36/36 tests passed (100%)**.
- Độ trễ chạy test: **~10 giây**.
- TypeScript strict typecheck: **0 errors**.

---

## 19. Quy trình làm/cập nhật hằng ngày

1. Chọn một vertical slice nhỏ và tiêu chí nghiệm thu.
2. Tạo issue → branch → code → test → pull request.
3. CI pass mới tạo Preview.
4. Kiểm thử Preview và staging bằng tài khoản STAFF/CASHIER/OWNER.
5. Chỉ merge khi không còn P0/P1 và PRD/ADR đồng bộ.
6. Không nâng major dependency giữa sprint nếu không có ADR và rollback.

---

## 20. Kết luận

QuanLyHoCau V2 ưu tiên độ tin cậy hơn số lượng tính năng. Luồng mở vé là nền móng: một request nguyên tử, server làm nguồn sự thật, khách lẻ không tạo customer, database chống trùng ô, client dừng đúng khi API lỗi và mọi thao tác ghi có idempotency. Khi nền móng này qua đủ kiểm thử, các module Đang câu, checkout, báo cáo và SaaS mới có thể phát triển mà không lặp lại lỗi cũ.
