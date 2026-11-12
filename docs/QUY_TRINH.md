# Quy trình làm việc — tự host VPS và nộp app iOS/Android

Viết trước khi sửa code, ngày 12/11/2026. Mọi bước bên dưới bám code đang có trong repo, không bám suy đoán trong kế hoạch nếu code khác kế hoạch.

## Nguyên tắc tự đặt ra và sẽ tuân theo

1. Không xóa, không ghi đè dữ liệu hồ, phiên câu, hóa đơn, thanh toán, cấu hình. Xóa tài khoản chỉ ẩn danh người dùng và thu hồi quyền đăng nhập. Sổ sách của hồ giữ nguyên.
2. Không deploy, không đổi DNS, không tạo tài khoản, không thanh toán, không commit secret. Repo đang public.
3. Giữ hành vi web hiện tại. Chỉ thêm đường chạy trên VPS và trong app native. Đăng nhập mật khẩu, OTP, Google giữ nguyên.
4. Cron hết hạn gói phải gọi đúng endpoint đang có, có khóa, chạy lại nhiều lần không đổi thêm bản ghi đã xử lý.
5. Mất mạng không được làm mất vé đang mở, và không được thu tiền hai lần. Lệnh nào server trả lỗi nghiệp vụ thì giữ lại cho người dùng xử lý, không tự xóa.
6. Trên iOS không hiện nút mua, gia hạn, nâng cấp gói phần mềm, không hiện giá gói và không dẫn tới trang thanh toán gói. Giá vé câu, gia hạn giờ câu của khách vẫn hiện, vì đó là dịch vụ của hồ chứ không phải mua phần mềm.
7. Nút hay chạm phải cao ít nhất 44px, chữ tiếng Việt ngắn, một việc chính một nút.
8. Không bịa kết quả chưa chạy. Build iOS không chạy được trên máy Linux này. Máy in BLE chưa cắm thử. Apple chưa duyệt app.
9. Mỗi bước chấm điểm sau khi kiểm tra đúng tiêu chí của bước đó. Dưới 9/10 thì sửa rồi chấm lại, rồi mới sang bước sau.
10. Migration chỉ thêm cột, không sửa dữ liệu cũ.

## Những chỗ kế hoạch đính kèm lệch code (đã kiểm)

- App dùng PostgreSQL + Prisma 7, không dùng MySQL. Đúng như phần đính chính trong kế hoạch.
- Cron Vercel là `0 17 * * *` (17:00 UTC = 00:00 giờ Việt Nam) gọi `GET /api/cron/subscriptions`. Endpoint đã chặn bằng `CRON_SECRET` (Bearer hoặc `x-api-key`) và `updateMany` có điều kiện trạng thái, nên chạy lại an toàn.
- `output: "standalone"` chưa có. Chưa có Dockerfile.
- `capacitor.config.json` rỗng. `capacitor.config.ts` có appId `com.quanlihocau.app` nhưng `webDir: "public"` và không có `server.url`, nên app native không mở website. `android/` chỉ có manifest và plugin in nhiệt, không phải project Gradle. Không có `ios/`.
- Plugin in nhiệt Android dùng Bluetooth Classic (SPP UUID `00001101-...`), USB và TCP. iOS không in được Bluetooth Classic nếu máy in không có chuẩn MFi. Phần iOS sẽ làm BLE + Wi-Fi và nói rõ giới hạn này trong app.
- `/api/me/account` chỉ có GET. Chưa có Sign in with Apple.
- Mở vé đã có `Idempotency-Key`. Đóng phiên (`PATCH /api/fishing-sessions/[id]`) chưa có khóa này. Hàng đợi offline chỉ gửi lại lệnh đã có khóa, và đóng phiên sẽ được gắn khóa trước khi xếp hàng.
- Trang chủ và hướng dẫn đang ghi "không lưu vé offline". Sẽ sửa câu đó cho khớp hành vi mới.
- `/api/health` bắt buộc `CRON_SECRET`. Docker và UptimeRobot cần một đường sống công khai không lộ thông tin cơ sở dữ liệu. Sẽ thêm `/api/health/live`. Đường `/api/health` cũ giữ nguyên.

## Bước 1 — Cron hết hạn gói chạy trên VPS

Việc: bỏ cron trong `vercel.json`. Thêm service lịch trong Docker, múi giờ `Asia/Ho_Chi_Minh`, lúc 00:00 gọi `POST /api/cron/subscriptions` với `Authorization: Bearer $CRON_SECRET`. Thiếu secret thì không gọi. Tách điều kiện cập nhật ra hàm thuần để test idempotent.

Tiêu chí đạt:

- `vercel.json` không còn mục `crons`.
- Script từ chối chạy khi thiếu `CRON_SECRET` hoặc `APP_BASE_URL`.
- Lịch là 00:00 giờ Việt Nam, không phải 17:00 UTC trên máy đã đặt `TZ`.
- Test chứng minh hồ TRIAL/ACTIVE quá hạn vào GRACE, quá ân hạn vào SUSPENDED, và lần chạy sau không chọn lại hồ đã chuyển.

Cách kiểm: `node --test tests/self-host-cron.test.mjs` và đọc file script, compose.

## Bước 2 — Đóng gói server, backup, quy trình deploy tay

Việc: `output: "standalone"`, Dockerfile nhiều tầng, user không phải root, có `sharp`. Compose: Caddy (HTTPS `quanlihocau.com` và `www`), app, Postgres không mở cổng ra ngoài, service migrate, service lịch (cron gói + `pg_dump`). Backup lên đích S3 (R2) theo biến môi trường, không ghi secret. Workflow GitHub chỉ `workflow_dispatch`, có rollback theo tag. Tài liệu chuyển Neon và cắt DNS. `.env.selfhost.example` chỉ là mẫu.

Tiêu chí đạt:

- `npm run build` ra `.next/standalone/server.js`.
- Dockerfile không chạy bằng root ở tầng cuối.
- Postgres trong compose không có `ports`.
- Workflow deploy không có `push` hay `pull_request`.
- Script backup dừng nếu thiếu bucket hoặc khóa, tên file theo ngày nên chạy lại trong ngày thì ghi đè cùng một bản.
- Tài liệu nói rõ chỉ đổi A `@` và `www`, giữ MX, SPF, DMARC, CNAME mail.

Cách kiểm: build Next, `node --test tests/self-host-packaging.test.mjs`. Máy này không có Docker daemon, nên không chạy được container thật. Ghi rõ điểm này, không chấm như thể đã chạy container.

## Bước 3 — Project Capacitor và CI ký app

Việc: xóa `capacitor.config.json` rỗng. App id `com.quanlihocau.app`, tên hiển thị `Quản Lý Hồ Câu`, `server.url` là `https://quanlihocau.com`. Sinh `android/` và `ios/`, giữ plugin in nhiệt. Icon và splash từ icon 512 đang có. Hai workflow thủ công: AAB ký trên Ubuntu, IPA ký trên `macos-latest`. Không commit keystore, p12, profile.

Tiêu chí đạt:

- Có `android/app/build.gradle` (hoặc `.kts`) và `ios/App/App.xcodeproj`.
- Plugin in nhiệt Android còn trong project và được đăng ký.
- Workflow mobile chỉ `workflow_dispatch`.
- File workflow không chứa nội dung secret, chỉ tên secret.
- Có tài liệu liệt kê secret chủ hồ phải tự thêm.

Cách kiểm: đọc cây file sau `cap add`, test file workflow. Không có máy Mac và không có Android SDK trên máy này, nên không tạo được AAB/IPA tại đây. Ghi rõ.

## Bước 4 — In nhiệt, báo hết giờ, quét vé, hàng đợi offline

Việc:

- Android giữ Bluetooth Classic / USB / Wi-Fi.
- iOS: plugin BLE ghi ESC/POS vào characteristic ghi được, cộng kết nối TCP cổng 9100. Màn hình cài đặt nói rõ iPhone không in máy Bluetooth Classic.
- Thông báo local trước giờ kết thúc phiên, theo số phút chuông đang có. Hẹn trên máy nên vẫn kêu khi mất mạng sau khi đã hẹn.
- Quét QR vé bằng camera. Vé in thêm mã `QLHC:<id phiên>`.
- Hàng đợi local cho mở vé và đóng phiên. Có mạng thì gửi đúng thứ tự, cùng idempotency key. Lỗi mạng hoặc 5xx thì giữ lại. Lỗi 4xx thì đánh dấu xung đột, không tự xóa, không tự thu lại. Thu tiền bán lẻ và phiếu chi không đưa vào hàng đợi.

Tiêu chí đạt:

- Test hàng đợi: mất mạng thì xếp hàng; cùng ô đang chờ thì không xếp vé thứ hai; 409 thành xung đột và còn trong danh sách; 200 thì xóa khỏi hàng chờ; đóng phiên không có khóa thì bị từ chối xếp hàng.
- Vé in có chuỗi QR `QLHC:`.
- Có mã iOS BLE và câu cảnh báo Classic trong UI.
- Có lớp hẹn thông báo, không gọi native khi không phải app.

Cách kiểm: `node --test tests/offline-queue-and-native.test.mjs` và test in vé hiện có. Chưa cắm máy in, chưa chạy simulator iOS. Ghi rõ.

## Bước 5 — Xóa tài khoản và Sign in with Apple

Việc: nút xóa trong màn tài khoản, gõ đúng `XOA TAI KHOAN`, nếu có mật khẩu thì phải nhập đúng. Server khóa user, tăng `sessionVersion`, xóa mật khẩu, số điện thoại, đổi email và tên thành dạng đã xóa, gỡ membership. Không xóa hồ, vé, hóa đơn. Thêm cột `appleSub` (nullable, unique). NextAuth thêm Apple khi có đủ biến môi trường. App iOS có plugin Sign in with Apple, gửi identity token lên provider `apple-native`. Server kiểm chữ ký bằng khóa công khai của Apple.

Tiêu chí đạt:

- Hàm ẩn danh không nhận hồ sơ thiếu câu xác nhận, không nhận sai mật khẩu.
- Email sau khi xóa không còn email cũ, điện thoại thành null, tài khoản bị khóa.
- Test kiểm tra điều kiện token Apple (iss, aud, exp) bằng khóa giả, không gọi mạng Apple.
- Nút Apple có trên trang đăng nhập khi provider bật hoặc khi đang ở app iOS.

Cách kiểm: `node --test tests/account-and-apple.test.mjs`. Không có tài khoản Apple Developer nên không đăng nhập Apple thật.

## Bước 6 — Ẩn mua gói trên iOS

Việc: nhận diện iOS bằng `Capacitor.getPlatform() === "ios"` và chuỗi user agent `QuanLiHoCauNative/ios` do app native gắn. Script trong `<head>` đặt `data-native-platform` trước khi vẽ để nút không nháy. CSS ẩn `.saas-purchase`. Bọc nút gia hạn, modal giá, link bảng giá phần mềm. Không bọc nút gia hạn giờ câu.

Tiêu chí đạt:

- Hàm thuần trả về false chỉ khi platform ios hoặc user agent chứa token.
- Android native và trình duyệt vẫn hiện nút.
- Các nút gia hạn gói phần mềm có class `saas-purchase`. Nút "Gia hạn" trên vé câu không có class đó.

Cách kiểm: `node --test tests/ios-commerce.test.mjs` và rà nguồn các nút gói.

## Bước 7 — Rà secret trong git, rồi build, lint, typecheck

Việc: quét lịch sử git tìm khóa tư, URL có mật khẩu, chuỗi `AKIA`, private key. Không viết lại lịch sử. Chạy lint, typecheck, build, test liên quan. Ghi điểm từng bước vào cuối file này kèm bằng chứng.

Tiêu chí đạt:

- `npm run lint`, `tsc --noEmit`, `npm run build` pass.
- Test mới pass.
- Báo cáo secret nói đúng những gì tìm thấy, kể cả không tìm thấy.

## Chấm điểm

### Bước 1 — 9/10

Đạt. `node --test tests/self-host-cron.test.mjs`: 5/5 pass. `vercel.json` không còn `crons`. Script thiếu `CRON_SECRET` thoát 1, thiếu `APP_BASE_URL` thoát 1, URL chết thì thử 3 lần rồi thoát 1, không in secret. Route dùng `GRACE_FROM_STATUSES`, `SUSPEND_FROM_STATUSES` và `subscriptionExpiryWindows` — cùng hàm mà test dùng để chứng minh chạy lại không chọn hồ đã chuyển.

Trừ 1 điểm: chưa chạy container với `TZ=Asia/Ho_Chi_Minh` vì máy này không có Docker. Lịch `0 0 * * *` cộng `CRON_TZ` mới là văn bản, chưa quan sát đồng hồ thật. Container nằm ở bước 2.

### Bước 2 — 9/10, chấm lại sau khi biết máy iNET

Máy đích là VPS iNET tại Hà Nội: Ubuntu 24.04.1, 2 vCPU, khoảng 3,8 GB RAM, 60 GB, SSH cổng 24700. Agent OneDash được giữ nguyên. Gói vận hành nằm trong `deploy/`. Compose không publish Postgres, không có khối `build`, bốn service `restart: always`, hạn mức nhớ 640/896/96/256 MB. `harden.sh` nhận cổng SSH, mặc định 24700, mở cổng đó trước khi `ufw enable`. Workflow deploy chỉ `workflow_dispatch` và SSH mặc định cổng 24700.

`npm run build` lần trước đã ra `.next/standalone/server.js` có `sharp`. Chưa build lại sau khi thêm header cache vì header nằm ở Caddy, không ở app.

Trừ 1 điểm: máy làm việc không có Docker, chưa có IP iNET, nên chưa chạy harden, chưa xin chứng chỉ, chưa dump Neon thật.

## Việc chủ hồ phải tự làm (không làm trong PR này)

Ghi ở báo cáo cuối, không thực hiện: thuê VPS, DNS, R2, Apple Developer, Google Play, tạo secret GitHub, chứng chỉ ký, tài khoản demo cho reviewer.
