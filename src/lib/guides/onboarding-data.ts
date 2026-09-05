export interface GuideStep {
    id: number;
    title: string;
    badge: string;
    roles: Array<"OWNER" | "MANAGER" | "STAFF">;
    summary: string;
    instructions: string[];
    tips: string;
    icon: string;
}

export const ONBOARDING_STEPS: GuideStep[] = [
    {
        id: 1,
        title: "Đăng nhập và chọn hồ câu",
        badge: "Khởi động",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Truy cập hệ thống bằng số điện thoại hoặc email đã được cấp quyền.",
        instructions: [
            "Mở ứng dụng hoặc trang web QuanLiHoCau.",
            "Nhập email/SĐT và mật khẩu của bạn rồi bấm Đăng nhập.",
            "Nếu bạn quản lý nhiều hồ, chọn đúng hồ bạn đang làm việc hôm nay.",
        ],
        tips: "Nhớ lưu mật khẩu trên điện thoại để lần sau vào nhanh chỉ bằng một chạm.",
        icon: "login",
    },
    {
        id: 2,
        title: "Cài đặt hồ, ô câu và biểu giá",
        badge: "Thiết lập",
        roles: ["OWNER", "MANAGER"],
        summary: "Khai báo danh sách các ô/chòi câu và bảng giá ca câu của hồ.",
        instructions: [
            "Vào mục Cài đặt -> Hồ và ô câu để tạo các khu vực và số ô câu (ví dụ: Ô 01, Chòi VIP).",
            "Vào mục Biểu giá và gói câu để nhập tên gói (Ca 3 giờ, Ca 5 giờ) và giá tiền VNĐ.",
            "Có thể bật giá phụ thu quá giờ nếu khách câu vượt thời gian.",
        ],
        tips: "Đặt tên ô ngắn gọn (như Ô 1, Ô 2) để nhân viên nhìn nhanh không bị nhầm.",
        icon: "settings",
    },
    {
        id: 3,
        title: "Tạo sản phẩm và nhập kho",
        badge: "Kho hàng",
        roles: ["OWNER", "MANAGER"],
        summary: "Quản lý nước uống, mồi câu và các mặt hàng bán kèm.",
        instructions: [
            "Vào mục Sản phẩm và kho -> Bấm Thêm sản phẩm mới.",
            "Nhập tên hàng (ví dụ: Nước suối, Mồi cá chép) và giá bán lẻ.",
            "Nhập số lượng tồn kho ban đầu. Hệ thống sẽ tự cấp mã SKU chuẩn tuần tự (SP-0001, SP-0002).",
            "Bấm Lưu sản phẩm để tự động cộng kho vào sổ cái.",
        ],
        tips: "Khi hàng về thêm, bấm nút Nhập kho trên từng món để bổ sung số lượng tức thì.",
        icon: "box",
    },
    {
        id: 4,
        title: "Tạo vé câu & thu tiền tạm",
        badge: "Vận hành",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Quy trình mở phiên câu cho khách đến hồ nhanh chóng dưới 30 giây.",
        instructions: [
            "Bấm vào tab Tạo vé ở thanh menu dưới cùng.",
            "Chọn khách hàng (có thể tìm theo tên/SĐT hoặc bấm Thêm khách nhanh).",
            "Chọn ô/chòi khách ngồi và chọn Gói câu.",
            "Chọn hình thức: Thu trước (khách trả tiền ngay) hoặc Thu sau (khách thanh toán khi về).",
            "Bấm Mở vé & Bắt đầu câu. Máy in sẽ tự động in vé câu 58mm đưa cho khách.",
        ],
        tips: "Nếu khách đông, chỉ cần chọn ô và gói câu rồi bấm Mở vé ngay, không bắt buộc nhập tên khách.",
        icon: "ticket",
    },
    {
        id: 5,
        title: "Theo dõi phiên câu & đồng hồ",
        badge: "Vận hành",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Giám sát thời gian câu của tất cả các ô theo thời gian thực.",
        instructions: [
            "Vào tab Đang câu để xem danh sách toàn bộ các ô đang có khách.",
            "Mỗi ô có đồng hồ đếm ngược thời gian còn lại trực quan.",
            "Ô sắp hết giờ (còn dưới 15 phút) sẽ chuyển màu vàng cảnh báo.",
            "Ô đã quá giờ sẽ chuyển sang màu đỏ để nhân viên kịp thời nhắc khách.",
        ],
        tips: "Có thể lọc nhanh theo ô sắp hết giờ hoặc ô quá giờ ở thanh công cụ đầu trang.",
        icon: "clock",
    },
    {
        id: 6,
        title: "Thêm món, gia hạn & thu cá",
        badge: "Trong ca",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Ghi nhận đồ uống, gia hạn thêm giờ hoặc mua lại cá của khách trong phiên.",
        instructions: [
            "Tại thẻ phiên câu của khách, bấm nút Thêm hàng để chọn nước uống/mồi câu đưa ra ô.",
            "Bấm nút Gia hạn nếu khách muốn câu thêm giờ (chọn thêm 1 giờ, 2 giờ).",
            "Bấm Thu cá nếu hồ có chính sách mua lại cá khách câu được (nhập loại cá và số kg).",
            "Tất cả chi phí và tiền cá trừ lại đều được tự động cập nhật vào hóa đơn nháp của phiên.",
        ],
        tips: "Mọi lần thêm món hay gia hạn đều được ghi nhận ngay lập tức, không bao giờ lo sót tiền khi khách về.",
        icon: "plus",
    },
    {
        id: 7,
        title: "Kết thúc phiên & in bill quyết toán",
        badge: "Thanh toán",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Quyết toán tiền chính xác từng đồng và giải phóng ô câu đón khách mới.",
        instructions: [
            "Khi khách chuẩn bị về, bấm nút Kết thúc trên thẻ phiên câu.",
            "Bảng quyết toán hiển thị đầy đủ: tiền giờ câu, tiền nước/mồi, tiền cá trừ lại, tiền đã cọc và số tiền cần thu thêm.",
            "Chọn Tiền mặt hoặc Chuyển khoản rồi bấm Hoàn tất & Đóng ca.",
            "Hệ thống tự động in hóa đơn thanh toán 58mm và mở lại ô câu về trạng thái Trống.",
        ],
        tips: "Nếu máy in kẹt giấy, bạn luôn có thể bấm nút In lại hóa đơn ngay trên màn hình hoàn tất.",
        icon: "receipt",
    },
    {
        id: 8,
        title: "Bán lẻ hàng hóa cho khách vãng lai",
        badge: "Bán lẻ",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Bán nước ngọt, thuốc lá, mồi câu cho khách ghé mua mà không cần mở vé câu.",
        instructions: [
            "Vào tab Tạo vé -> Chọn tab chuyển đổi Bán lẻ hàng hóa ở trên cùng.",
            "Chọn các món khách mua ở cột bên trái (có hiển thị số lượng tồn kho còn lại).",
            "Điều chỉnh số lượng trong giỏ hàng bằng nút cộng (+) hoặc trừ (-).",
            "Chọn Tiền mặt hoặc Chuyển khoản rồi bấm Thanh toán & Xuất bill.",
            "Kho hàng sẽ tự động trừ ngay và in bill thanh toán bán lẻ.",
        ],
        tips: "Đơn bán lẻ độc lập hoàn toàn với các ô câu, không làm xáo trộn số liệu phiên câu.",
        icon: "cart",
    },
    {
        id: 9,
        title: "Xem Nhật ký & Báo cáo doanh thu ca",
        badge: "Báo cáo",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Đối soát tiền mặt, tiền chuyển khoản và lịch sử thao tác của nhân viên.",
        instructions: [
            "Vào tab Nhật ký để xem lại toàn bộ các đơn vé câu và đơn bán lẻ đã xuất.",
            "Tab Nhật ký hoạt động giúp tra cứu ai đã mở vé, ai đã thu tiền, ai đã sửa kho.",
            "Vào tab Báo cáo để xem doanh thu tổng trong ngày: bao nhiêu tiền mặt trong két, bao nhiêu chuyển khoản.",
            "Cuối ngày bấm Chốt ca để kiểm kê két tiền và lưu biên bản ca làm việc.",
        ],
        tips: "Chốt ca mỗi ngày giúp chủ hồ và nhân viên bàn giao tiền minh bạch, không sợ thất thoát.",
        icon: "chart",
    },
    {
        id: 10,
        title: "Cài đặt & kết nối máy in 58mm",
        badge: "Thiết bị",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Kết nối máy in nhiệt cầm tay Bluetooth, USB hoặc WiFi không dây.",
        instructions: [
            "Bật nguồn máy in nhiệt 58mm và bật Bluetooth trên điện thoại.",
            "Vào mục Cài đặt -> kéo xuống phần Máy in.",
            "Bấm Quét thiết bị Bluetooth -> chọn tên máy in của bạn (ví dụ: PT-210, MPT-II).",
            "Bấm In thử nghiệm để kiểm tra máy in hoạt động chuẩn xác.",
        ],
        tips: "Khi đã kết nối 1 lần, máy in sẽ tự động nhận diện cho các lần mở vé và tính tiền tiếp theo.",
        icon: "printer",
    },
    {
        id: 11,
        title: "Xử lý các tình huống lỗi thường gặp",
        badge: "Khắc phục",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Cách xử lý nhanh khi mất mạng, máy in không in hoặc khách chuyển khoản chậm.",
        instructions: [
            "Mất kết nối mạng tạm thời: Kiểm tra WiFi/4G; hệ thống có cơ chế bảo vệ giao dịch chống trừ tiền 2 lần.",
            "Máy in không ra giấy: Kiểm tra cuộn giấy nhiệt còn không, tắt mở lại nguồn máy in và bấm Thử lại.",
            "Khách chuyển khoản chưa nổi tiền: Kiểm tra mã chuẩn QR hoặc chụp lại màn hình giao dịch của khách để đối chiếu trong Nhật ký.",
            "Bấm nhầm nút: Liên hệ quản lý hoặc chủ hồ để xem lịch sử trong Nhật ký hoạt động.",
        ],
        tips: "Bất cứ lúc nào cần xem lại hướng dẫn, chỉ cần bấm vào biểu tượng dấu hỏi (?) trên đầu màn hình.",
        icon: "help",
    },
];
