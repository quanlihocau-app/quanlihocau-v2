# Khôi phục giao diện và nghiệp vụ sáng 03/11/2026

## Đồng bộ Git và phát hành chính thức

Ngày 04/11 đã push commit `140399e3044b73b9b0fed45b707eae8b88e636cd` lên `origin/main`. Git tree của toàn bộ `src/` khớp chính xác mốc `bf589f1`. Bản phát hành tự động `dpl_4jBtXtzmFTL5S55VGHtZ3ALgUgqD` đã READY và được gắn với `quanlihocau.com`, `www.quanlihocau.com`; metadata production xác nhận đúng commit mới. GitHub CI run `41801701715` hoàn tất SUCCESS. Kiểm tra public: `/`, `/login`, `/api/ping` trả 200; `/sessions` chuyển về đăng nhập khi chưa có phiên. Các sửa SaaS chưa phát hành vẫn giữ tại workspace gốc, không có trong commit này.

Yêu cầu được chủ dự án xác nhận ngày 04/11/2026: quay lại cả giao diện và nghiệp vụ của sáng 03/11, vì nhân viên không dùng được bản mới.

## Mốc xác định

- Commit: `bf589f1526a761bc202053c382354435cf530690`, ngày 02/11 lúc 20:52:47 giờ Việt Nam.
- Không có commit sáng 03/11; commit tiếp theo lúc 13:27 ngày 03/11. Đây là mốc mã nguồn gần nhất trước buổi sáng yêu cầu.
- Vercel có bản production tương ứng tạo lúc 20:53:05 ngày 02/11, ID `dpl_5GuQ45gqPnU8AMyZBNSLbF7WieQL`, trạng thái READY.
- Bản production trước thao tác: `dpl_7cxiK4RQ69q2cYWeKEri6UMLoZ5d`.

## Mã nguồn local

- Lưu bản sao trước khi sửa tại `.staging/rollback-before-nov03-restore/`, gồm patch toàn bộ thay đổi chưa commit, file UI/nghiệp vụ và các file mới. Không xóa hoặc reset cứng working tree.
- Khôi phục header, layout, CSS, màn hình phiên câu/mở vé, danh sách thu mua cá và nhãn dữ liệu mẫu về mốc đã chọn.
- Khôi phục ma trận phân quyền và các kiểm tra quyền API về mốc đã chọn; bỏ thay đổi mở toàn quyền STAFF/MANAGER ngày 04/11.
- Giữ bản sửa an toàn nhân sự/thuê bao/quota, migration mới và CI ở local. Các phần này **không được đưa lên production** trong lần dựng lại bản lịch sử.
- Landing marketing/video vẫn giữ ở local; bản phát hành lịch sử trên Vercel dùng trọn mã nguồn lịch sử, bao gồm landing lịch sử.
- Kiểm chứng local sau khôi phục: build/TypeScript đạt; safety 102/102; integration 33/33, không bỏ qua. Diễn tập phục hồi local 39 bảng tiếp tục khớp checksum.

## Thao tác Vercel

Vercel rollback trực tiếp về bản này trả HTTP 402 với thông báo giới hạn gói chỉ cho quay lại bản production liền trước. Không nâng cấp gói hoặc thay đổi thanh toán.

Thay vào đó, đã yêu cầu Vercel dựng lại deployment lịch sử bằng chức năng redeploy production:

- Nguồn: `dpl_5GuQ45gqPnU8AMyZBNSLbF7WieQL`.
- Deployment mới: `https://quanlihocau-v2-m9em-mzx5jmdmm-huan-tran-v2.vercel.app`.
- Deployment mới `dpl_59shEHaDeEnKpP6JyCTZmYD3imiY` đã READY. API project xác nhận production trỏ tới SHA `bf589f1526a761bc202053c382354435cf530690` và các domain `quanlihocau.com`, `www.quanlihocau.com` cùng alias Vercel đã gắn vào deployment này.
- Lint local sau khôi phục: 0 lỗi, 28 cảnh báo. Chưa đăng nhập bằng tài khoản khách trên production; cần nhân viên kiểm tra lại thao tác thực tế.

Build lịch sử chỉ chạy `prisma generate && next build`; không có migration/seed. Không thay `.env`, không chạy SQL hoặc phục hồi lùi database Neon, không thay khóa phiên/cookie. Các giao dịch phát sinh sau sáng 03/11 được giữ trong database hiện có.
