# Hoàn thiện SaaS — 04/11/2026

> Cập nhật sau báo cáo: chủ dự án yêu cầu quay lại giao diện/nghiệp vụ sáng 03/11. Website đã được dựng lại từ bản lịch sử `bf589f1`; các sửa SaaS trong báo cáo này vẫn giữ ở local và **chưa phát hành production**. Phân quyền STAFF local cũng đã quay về bản lịch sử. Xem [biên bản khôi phục](APP_RESTORE_2026-11-03.md).

## Trạng thái bốn nhóm việc

1. **Đã sửa và kiểm chứng trên PostgreSQL riêng:** ràng buộc nhân sự; kích hoạt đơn thuê bao qua cùng transaction; khóa quota khi tạo đồng thời; chặn đổi mật khẩu tài khoản liên hồ.
2. **Đã dựng staging cục bộ và thử phục hồi, chưa thực hiện trên Neon:** PostgreSQL 16.14 riêng tại loopback 55433. Không dùng database cloud, không thay `.env`. Tạo database mới để thử nâng cấp và khôi phục; không xóa database hiện hữu.
3. **Đã chạy API/integration và đưa vào cấu hình CI:** đăng ký, rollback seed, nhân viên/thu hồi phiên, hai hồ cách ly, vòng đời thuê bao, thu tiền trước/sau, bán hàng, thu mua cá, thu chi, báo cáo/export và chốt ca. Hàng đợi in chỉ kiểm thử giả lập; Google chỉ có regression/mock, chưa OAuth staging thật.
4. **Đã kiểm tra mã/cấu hình local và chuẩn bị vận hành:** cron đã có lịch trong `vercel.json`, thêm readiness probe database có xác thực. Chưa xác nhận cấu hình triển khai Vercel, delivery ngân hàng, lịch sử cron, backup Neon, cảnh báo thực tế hay pilot 3–5 hồ. Không coi đây là phê duyệt mở bán rộng.

## Thay đổi chính

- Bỏ unique toàn bộ `(lakeId, role)`, thay bằng index chỉ giữ một OWNER đang hoạt động mỗi hồ. STAFF/MANAGER có thể lặp. Migration kiểm tra nhiều OWNER trước; nếu xung đột thì rollback mà không đổi/xóa bất kỳ dòng nào. Membership ngừng hoạt động vẫn được giữ.
- Webhook và duyệt tay gọi cùng dịch vụ kích hoạt, khóa Order rồi Lake rồi Organization; chỉ đổi PENDING → PAID một lần, tính hạn từ hồ vừa đọc dưới khóa và ghi audit trong cùng transaction. Hai đơn cùng hồ cộng nối tiếp, webhook/duyệt tay không cộng trùng. Không tự tạo mã giao dịch ngân hàng giả khi thiếu reference.
- Quota khóa Lake và đếm/tạo trong một transaction, áp dụng cho `/api/spots`, `/api/huts`, tạo nhanh chòi, `/api/members`, `/api/memberships`, và thêm thành viên từ quản trị. Không tự xóa nhân sự/chòi vượt hạn khi hạ gói.
- Chủ hồ không thể dùng API tạo nhân viên để đổi tên/mật khẩu/mở khóa user ngoài hồ. Tái kích hoạt chỉ cho user USER không bị khóa, có toàn bộ membership thuộc hồ hiện tại và không có vai trò OWNER; tăng sessionVersion để không phục hồi cookie cũ. Reset mật khẩu tài khoản dùng nhiều hồ bị từ chối.
- Xóa thành viên từ quản trị chuyển thành vô hiệu hóa mềm, giữ membership và thu hồi phiên.
- Bổ sung migration thiếu `ApprovalRequest`; bổ sung catalog trên database trắng bằng `ON CONFLICT DO NOTHING`, giữ cấu hình gói hiện hữu.
- Bổ sung `/api/health`, yêu cầu Bearer hoặc API key theo `CRON_SECRET`, kiểm tra `SELECT 1`; lỗi database trả 503 và không tiết lộ cấu hình.
- CI có schema diff, integration API thật, kiểm thử đồng thời và backup/restore. Chưa push hoặc quan sát CI từ xa; pipeline tương đương đã chạy local.
- Một assertion export cũ dùng nhãn CSV đã đổi; cập nhật theo nhãn hiện tại, giữ nguyên phép đối chiếu số tiền 1.600.000đ và không thay cách tính tiền.

## Bằng chứng kiểm chứng

- Build cô lập thành công, bao gồm TypeScript.
- Safety: **102/102**, không bỏ qua.
- Integration thật: **33/33**, không bỏ qua; `scripts/check-staging.mjs` tự mở server test và dừng sau khi kiểm tra.
- Schema sau toàn bộ migration: `prisma migrate diff` trả **No difference detected**. Index OWNER có điều kiện còn được kiểm tra trực tiếp vì không được mô tả đầy đủ trong Prisma schema.
- Lint: 0 lỗi, 27 cảnh báo hiện hữu; `git diff --check` đạt.
- Thử nâng cấp từ toàn bộ migration cũ, có fixture tổ chức/hồ/user/membership/hóa đơn/thanh toán và gói có giá riêng: dữ liệu cũ nguyên vẹn; catalog không bị ghi đè. Chạy lại SQL mới không đổi dữ liệu.
- Thử hai OWNER đang hoạt động: ràng buộc từ chối; preflight migration gặp dữ liệu trùng cũng từ chối và giữ nguyên checksum mọi bảng.
- `pg_dump`/`pg_restore` sang database mới: số dòng và checksum toàn bộ nội dung của **39 bảng** khớp, gồm migration history. Đây là kiểm chứng local, không chứng minh retention/PITR hay quyền khôi phục Neon production.
- Bằng chứng có thể tạo lại: `.staging/recovery/result.json`. Dump, dữ liệu giả và cấu hình bí mật nằm trong `.staging/` được git ignore; không đưa vào artifact CI. CI chỉ upload JSON tổng kết không chứa bí mật.

## Cách chạy lại local

Yêu cầu PostgreSQL 16 hoặc mới hơn và Node theo project. Trên Windows mặc định tìm PostgreSQL tại `C:/Program Files/PostgreSQL/16/bin`; đặt `PG_BIN` nếu khác. Port 55433 phải dành riêng cho cluster này.

```powershell
npm run staging:local
node scripts/staging-command.mjs node_modules/prisma/build/index.js migrate deploy
node scripts/staging-command.mjs node_modules/prisma/build/index.js generate
npm run build:isolated
node scripts/staging-command.mjs scripts/check-staging.mjs
```

`staging-command` chỉ nhận cấu hình đã tạo trong `.staging/saas-20261104/env.json`, xác nhận localhost:55433 và đúng tên database trước khi chạy. `test-staging` và `check-staging` yêu cầu cờ cô lập và database local có tên được cho phép, không tự nạp `.env` cloud. Dữ liệu thử được giữ lại để xem, một số suite cũ chỉ dọn đúng fixture do suite đó tạo. Không dùng các runner này với dữ liệu thật.

## Neon và phát hành không mất dữ liệu

Đã xác nhận `.env` local dùng Neon `neondb`; `.env.test` trỏ local. Chưa truy cập Neon Console/API; chưa có Neon platform credential để tạo hoặc xác nhận branch. Không thay database đang chạy sang PostgreSQL cục bộ.

Trước khi áp dụng trên Neon:

1. Xác nhận project/branch production chính xác, tạo **branch staging riêng không chứa dữ liệu khách** hoặc database staging trống. Đặt secret qua kho bí mật, không gửi connection string trong chat hay commit vào repo. Nếu branch clone dữ liệu production thì không chạy các suite ghi fixture cho tới khi đã có phương án dữ liệu thử phù hợp.
2. Xác nhận role migration sở hữu bảng Membership/đủ quyền DDL. Migration cũ có ghi nhận vấn đề table owner; không suy ra quyền hiện tại từ comment đó.
3. Kiểm tra chỉ đọc số OWNER hoạt động trên từng hồ, constraint/index đang có và lịch sử migration. Với nhiều OWNER, dừng và trình chủ dự án phương án xử lý; không tự gộp, xóa hoặc hạ quyền.
4. Xác nhận snapshot/PITR và restore window của gói Neon thực tế; thử phục hồi sang branch mới, kiểm tra checksum, count và nghiệp vụ. Không ghi đè production để diễn tập.
5. Chạy migration/ứng dụng thử trên staging, kiểm tra index OWNER có điều kiện và các luồng dưới đây. Nếu Prisma phát hiện drift, xem diff và tạo migration bổ sung có kiểm chứng; không dùng reset hoặc db push để ép khớp production.
6. Chỉ đề nghị phát hành production sau khi có bằng chứng staging và chủ dự án yêu cầu. Bản sửa hiện chưa deploy.

### Phương án quay lui

- Ưu tiên rollback phiên bản ứng dụng trong khi giữ schema mở rộng. Không tự dựng lại unique `(lakeId, role)` vì sau nâng cấp có thể đã có nhiều STAFF/MANAGER hợp lệ.
- Các migration không xóa bảng/cột hoặc dòng nghiệp vụ. Tạo `ApprovalRequest` và catalog thiếu là bổ sung; không gỡ bảng để rollback.
- Nếu cần phục hồi dữ liệu, phục hồi snapshot sang branch/database mới và đối chiếu trước; không ghi đè branch cũ khi chưa có chỉ định cụ thể. Giữ nguyên branch cũ để điều tra/đối soát.
- Không thay secret phiên/cookie trong thay đổi này; tài khoản và phiên hiện hữu được giữ. Chỉ nhân sự bị vô hiệu hóa/reset/tái kích hoạt mới bị thu hồi phiên như nghiệp vụ yêu cầu.

## Webhook, cron, giám sát và backup cần xác nhận trên triển khai

- Local có thông tin Google và secret phiên; `BANK_WEBHOOK_SECRET`/`CRON_SECRET` chưa có giá trị hợp lệ trong các file local đã đọc. Đây **không phải** bằng chứng production thiếu các secret đó.
- Webhook cần secret thật trong môi trường staging, đúng URL `/api/webhooks/bank`, đúng định dạng/header từ nhà cung cấp. Thử signed/unsigned/thiếu tiền/retry/cùng lúc trên staging; kiểm tra order, hạn và audit. Không dùng giao dịch khách để diễn tập.
- `vercel.json` khai báo `0 17 * * *`: 17:00 UTC, tức 00:00 giờ Việt Nam ngày kế tiếp. Xác nhận deployment/plan có cron được kích hoạt, `CRON_SECRET` đúng và execution log có 200. Chưa gọi cron production vì endpoint này ghi trạng thái thuê bao.
- Monitor `/api/health` kèm secret qua header; không đưa secret vào URL/log. Cấu hình timeout lớn hơn timeout kết nối database 10 giây và cảnh báo khi 503/timeout liên tiếp. `/api/ping` chỉ xác nhận app trả lời, không thay readiness database. Tạo thử tình huống lỗi trên staging để xác nhận thông báo tới người trực.
- Xác nhận người chịu trách nhiệm backup, retention, quyền restore, thời gian phục hồi mục tiêu và mất dữ liệu tối đa chấp nhận được. Cần nhật ký diễn tập Neon thực tế; local dump/restore không thay cho bước này.

## Pilot có hỗ trợ — chưa thực hiện

Chỉ bắt đầu khi staging Neon/Google/ngân hàng đạt và chủ dự án chọn 3–5 hồ. Chưa liên hệ khách hay gửi thông báo bên ngoài.

- Chọn một hồ nhỏ, một hồ có nhiều nhân viên, một hồ dùng thu trước và một hồ dùng máy in thực tế nếu có.
- Mỗi hồ: chủ sở hữu xác nhận tài khoản; cấu hình bảng giá, ngân hàng nhận tiền của hồ và nhân sự; hướng dẫn mở vé → thêm hàng → gia hạn → thu mua cá → kết thúc → thanh toán/in → chốt ca.
- Thử máy in hết giấy/mất kết nối và mạng chập chờn trên dữ liệu thử; kiểm tra không thu/in trùng. Google phải thử trình duyệt/điện thoại thật với redirect URI staging và tài khoản được phép.
- Ghi ngày bắt đầu, người hỗ trợ, thiết bị, số phiên và lỗi, lệch quỹ có giải trình, thời gian xử lý hỗ trợ và ý kiến trả phí. Không công bố số liệu hoặc xác nhận đạt khi chưa có hồ tham gia thật.
- Dừng mở rộng nếu có lỗi cách ly tenant, mất dữ liệu, thanh toán trùng hoặc chốt ca không giải trình được. Cân nhắc mở rộng sau khi nhóm pilot vận hành ổn định và chủ dự án duyệt kết quả.

Không thay đổi chính sách STAFF đang có toàn quyền tài chính trong đợt này; việc thu hẹp quyền cần quyết định nghiệp vụ riêng.
