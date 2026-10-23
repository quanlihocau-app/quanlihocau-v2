/** Tour steps for the app onboarding tour.
 *  Each step maps to a section of the UI and shows a small popup.
 */

export interface TourStep {
  /** Unique step key */
  id: string;
  /** Section label shown in small caps above the title (e.g. "KHỞI ĐỘNG") */
  category: string;
  /** Bold headline */
  title: string;
  /** Body paragraph */
  body: string;
  /** Optional highlight callout (shown in a coloured box) */
  highlight?: string;
  /** Which role(s) see this step. undefined = all roles */
  roles?: Array<"OWNER" | "MANAGER" | "STAFF">;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    category: "CHÀO MỪNG",
    title: "Chào mừng đến với Quản Lí Hồ Câu",
    body: "Hướng dẫn nhanh này sẽ đưa bạn qua các tính năng chính của ứng dụng. Chỉ mất khoảng 2 phút.",
    highlight:
      "Bạn có thể bỏ qua hoặc xem lại hướng dẫn bất cứ lúc nào trong phần Cài đặt.",
  },
  {
    id: "sessions",
    category: "ĐANG CÂU",
    title: "Xem tất cả phiên câu đang mở",
    body: "Màn hình «Đang câu» hiển thị toàn bộ ô câu đang hoạt động, đồng hồ đếm ngược và trạng thái thanh toán. Chạm vào bất kỳ ô nào để xem chi tiết hoặc kết thúc phiên.",
    highlight:
      "Màu xanh = còn giờ · Màu vàng = sắp hết giờ · Màu đỏ = đã lố giờ, tính phụ thu.",
  },
  {
    id: "new-session",
    category: "TẠO VÉ",
    title: "Mở vé câu mới trong 3 giây",
    body: 'Bấm nút «+ Tạo vé mới» → chọn ô câu → chọn ca giá → bấm Mở vé. Hệ thống tự ghi giờ bắt đầu và tính phụ thu nếu khách lố giờ.',
    highlight:
      "Bạn có thể chọn nhiều ô cùng lúc nếu một nhóm khách thuê liền nhau.",
  },
  {
    id: "invoice",
    category: "HÓA ĐƠN",
    title: "Tính tiền và thu tiền",
    body: "Khi khách kết thúc, bấm «Kết thúc & Thu tiền» trên ô câu đó. Hệ thống tổng hợp tiền ca + hàng hóa + phụ thu, ghi nhận tiền mặt hoặc chuyển khoản.",
    highlight:
      'Bấm «In vé» để in hóa đơn 58 mm qua máy in Bluetooth hoặc Wi-Fi.',
  },
  {
    id: "products",
    category: "BÁN HÀNG",
    title: "Bán mồi, nước và đồ câu kèm phiên",
    body: "Trong màn hình chi tiết phiên câu, bấm «+ Thêm hàng» để thêm sản phẩm vào hóa đơn. Giá được cộng tự động vào tổng thanh toán.",
  },
  {
    id: "reports",
    category: "BÁO CÁO",
    title: "Theo dõi doanh thu và báo cáo ca",
    body: "Vào «Báo cáo» để xem doanh thu theo ngày, tuần, tháng. Chủ hồ theo dõi từ xa trên điện thoại mà không cần có mặt tại hồ.",
    highlight:
      "Mỗi lần chốt ca, hệ thống tổng hợp tiền mặt, chuyển khoản và công nợ tự động.",
    roles: ["OWNER", "MANAGER"],
  },
  {
    id: "settings",
    category: "CÀI ĐẶT",
    title: "Thiết lập hồ câu của bạn",
    body: "Vào «Cài đặt» để thêm ô câu, khu vực, ca giá, sản phẩm, nhân viên và cấu hình máy in. Chỉ cần thiết lập một lần, dùng mãi về sau.",
    highlight:
      'Bấm «Xem lại hướng dẫn» trong Cài đặt để mở lại tour này bất cứ lúc nào.',
    roles: ["OWNER", "MANAGER"],
  },
  {
    id: "done",
    category: "HOÀN TẤT",
    title: "Bạn đã sẵn sàng! 🎉",
    body: "Chúc bạn vận hành hồ câu thuận lợi. Nếu cần hỗ trợ, liên hệ hotline 0855 550 813 hoặc xem lại hướng dẫn trong Cài đặt.",
  },
];
