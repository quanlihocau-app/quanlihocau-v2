<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Bảo toàn dữ liệu và vận hành

- Tuyệt đối không xóa dữ liệu, tài khoản, hồ câu, phiên câu, hóa đơn, thanh toán, cấu hình hoặc lịch sử hiện hữu trong quá trình phát triển, sửa lỗi, nâng cấp hay triển khai.
- Không dùng lệnh/script/migration có thể xóa hoặc ghi đè dữ liệu production. Chỉ thực hiện thao tác xóa dữ liệu khi chủ dự án yêu cầu rõ ràng cho đúng dữ liệu và môi trường đó.
- Mọi thay đổi phải giữ các luồng nghiệp vụ và quy tắc hiện hành; chỉ bổ sung hoặc chỉnh đúng phần được yêu cầu. Với thay đổi xác thực, giữ tương thích tài khoản và cookie phiên đang hoạt động nếu có thể; không buộc người dùng đang làm việc đăng xuất.
- Trước migration hoặc thay đổi có thể ảnh hưởng dữ liệu/phiên, kiểm tra đường nâng cấp không mất dữ liệu, tính tương thích ngược và kế hoạch khôi phục. Không tự triển khai production khi chưa kiểm tra đầy đủ.
