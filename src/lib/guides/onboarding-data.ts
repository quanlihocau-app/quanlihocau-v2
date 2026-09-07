export interface GuideFlowStep {
    stepNumber: number;
    title: string;
    actionDescription: string;
    screenLocation: string;
    mockupElement: {
        type: "button" | "chip" | "card" | "badge" | "input" | "toggle";
        label: string;
        subLabel?: string;
        colorClass?: string;
    };
    annotation: string;
}

export interface GuideStep {
    id: number;
    title: string;
    badge: string;
    roles: Array<"OWNER" | "MANAGER" | "STAFF">;
    summary: string;
    instructions: string[];
    tips: string;
    icon: string;
    practiceUrl: string;
    practiceActionLabel: string;
    realWorldExample: {
        scenario: string;
        expectedResult: string;
    };
    flowSteps: GuideFlowStep[];
}

export const ONBOARDING_STEPS: GuideStep[] = [
    {
        id: 1,
        title: "Đăng nhập và chọn hồ câu",
        badge: "Khởi động",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Truy cập hệ thống an toàn bằng tài khoản đã được cấp quyền của bạn.",
        instructions: [
            "Mở ứng dụng hoặc trang web QuanLiHoCau trên điện thoại.",
            "Nhập số điện thoại hoặc email cùng mật khẩu của bạn.",
            "Bấm Đăng nhập và xác nhận đúng tên hồ bạn đang làm việc.",
        ],
        tips: "Nhớ lưu mật khẩu trên trình duyệt điện thoại để mở ứng dụng vào ca làm việc chỉ với 1 chạm.",
        icon: "login",
        practiceUrl: "/settings",
        practiceActionLabel: "Xem thông tin hồ & Tài khoản",
        realWorldExample: {
            scenario: "Đầu ca làm việc, nhân viên mở điện thoại để đăng nhập vào ca trực hồ.",
            expectedResult: "Màn hình hiển thị đúng tên hồ câu của bạn và thanh trạng thái hiển thị Online màu xanh lá.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Nhập tài khoản",
                actionDescription: "Điền SĐT/Email và Mật khẩu được cấp",
                screenLocation: "Màn hình đăng nhập chính giữa",
                mockupElement: {
                    type: "input",
                    label: "0912 345 678",
                    subLabel: "Mật khẩu: ••••••••",
                },
                annotation: "Bấm vào ô số điện thoại, nhập số và mật khẩu rồi bấm nút màu xanh.",
            },
            {
                stepNumber: 2,
                title: "Bấm Đăng nhập",
                actionDescription: "Chạm nút Đăng nhập để vào hệ thống",
                screenLocation: "Nút chính màu xanh lá",
                mockupElement: {
                    type: "button",
                    label: "Đăng nhập vào ca",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Hệ thống tự động nhận diện hồ câu và vai trò (Chủ hồ, Quản lý, Nhân viên).",
            },
            {
                stepNumber: 3,
                title: "Kiểm tra tên hồ",
                actionDescription: "Nhìn góc trái trên cùng để kiểm tra đúng hồ",
                screenLocation: "Thanh tiêu đề (Header) trên cùng",
                mockupElement: {
                    type: "badge",
                    label: "Hồ Câu Thư Giãn (Khu A)",
                    colorClass: "bg-[#E8F3E5] text-[#246B38]",
                },
                annotation: "Đảm bảo đúng tên hồ để toàn bộ vé, tiền và hàng hóa ghi nhận đúng sổ sách.",
            },
        ],
    },
    {
        id: 2,
        title: "Cài đặt hồ, ô câu và biểu giá",
        badge: "Thiết lập",
        roles: ["OWNER", "MANAGER"],
        summary: "Khai báo danh sách các ô/chòi câu và bảng giá ca câu của hồ theo đơn vị phút chuẩn.",
        instructions: [
            "Vào mục Cài đặt -> Biểu giá & Gói câu để thêm các ca câu (Ca 2 tiếng, Ca 4 tiếng).",
            "Nhập Thời lượng (Phút) ví dụ 240 phút cho ca 4 tiếng và giá tiền VNĐ.",
            "Điền Phụ thu quá giờ (VNĐ/h) nếu khách câu vượt thời gian quy định.",
            "Vào mục Cơ sở vật chất để tạo danh sách ô câu (Ô 01, Ô VIP...).",
        ],
        tips: "Đặt tên ô ngắn gọn như Ô 1, Ô 2, Chòi VIP để màn hình hiển thị gọn gàng trên điện thoại.",
        icon: "settings",
        practiceUrl: "/pricing",
        practiceActionLabel: "Đến cài đặt Biểu giá & Gói câu",
        realWorldExample: {
            scenario: "Hồ khai trương mở thêm gói câu mới: 'Ca 4 tiếng' giá 200,000đ, quá giờ 50,000đ/h.",
            expectedResult: "Gói câu xuất hiện ngay trong menu tạo vé và sẵn sàng để bán cho khách hàng.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Mở menu Biểu giá",
                actionDescription: "Vào Cài đặt -> Bấm chọn Biểu giá & Gói câu",
                screenLocation: "Mục 2 trong trang Cài đặt",
                mockupElement: {
                    type: "card",
                    label: "Biểu giá & Gói câu",
                    subLabel: "Quản lý ca câu & giá vé",
                },
                annotation: "Nơi thiết lập bảng giá niêm yết của toàn bộ hồ câu.",
            },
            {
                stepNumber: 2,
                title: "Bấm Thêm gói câu",
                actionDescription: "Chạm nút [+ Thêm gói câu mới]",
                screenLocation: "Nút xanh trên đầu danh sách",
                mockupElement: {
                    type: "button",
                    label: "+ Thêm gói câu mới",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Mở form thiết lập gói câu với đầy đủ thời lượng và giá.",
            },
            {
                stepNumber: 3,
                title: "Chọn Phút & Giá vé",
                actionDescription: "Chọn nhanh chip 240p (4h) hoặc nhập số phút và đơn giá",
                screenLocation: "Dải chip chọn nhanh thời lượng",
                mockupElement: {
                    type: "chip",
                    label: "240p (4h) • 200,000đ",
                    subLabel: "Phụ thu: 50,000đ/h",
                    colorClass: "bg-[#E8F3E5] text-[#246B38] border-[#4F9D5A]",
                },
                annotation: "Đơn vị chuẩn phút (minutes) đồng bộ chính xác với đồng hồ đếm ngược.",
            },
            {
                stepNumber: 4,
                title: "Lưu hoàn tất",
                actionDescription: "Bấm [Lưu gói câu] để áp dụng ngay",
                screenLocation: "Nút dưới cùng của modal",
                mockupElement: {
                    type: "button",
                    label: "Lưu gói câu",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Gói câu mới lập tức khả dụng trên màn hình Tạo vé của toàn bộ nhân viên.",
            },
        ],
    },
    {
        id: 3,
        title: "Tạo sản phẩm và nhập kho",
        badge: "Kho hàng",
        roles: ["OWNER", "MANAGER"],
        summary: "Quản lý nước uống, mồi câu và các mặt hàng bán kèm có theo dõi tồn kho.",
        instructions: [
            "Vào mục Kho hàng -> Bấm [+ Thêm sản phẩm mới].",
            "Nhập tên sản phẩm (Nước suối, Mồi chép...) và đơn giá bán lẻ.",
            "Nhập số lượng tồn kho ban đầu, hệ thống tự cấp mã SKU chuẩn tuần tự.",
            "Bấm Lưu sản phẩm để tự động cộng kho vào sổ cái.",
        ],
        tips: "Khi hàng về thêm, chỉ cần bấm nút [Nhập kho] trên từng món để cộng dồn tồn kho nhanh.",
        icon: "box",
        practiceUrl: "/inventory",
        practiceActionLabel: "Đến trang Kho hàng & Sản phẩm",
        realWorldExample: {
            scenario: "Hồ vừa nhập về 2 thùng nước suối Aquafina (48 chai), giá bán 10,000đ/chai.",
            expectedResult: "Tồn kho Aquafina tăng lên 48, khi nhân viên bán kèm hoặc bán lẻ tồn kho sẽ tự động giảm trừ.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Vào mục Kho hàng",
                actionDescription: "Chạm vào biểu tượng Kho hàng trên menu hoặc Cài đặt",
                screenLocation: "Tab Quản lý kho",
                mockupElement: {
                    type: "card",
                    label: "Sản phẩm & Kho hàng",
                    subLabel: "Quản lý tồn kho nước, mồi",
                },
                annotation: "Hiển thị danh sách tất cả mặt hàng đang kinh doanh và số lượng còn lại.",
            },
            {
                stepNumber: 2,
                title: "Bấm Thêm sản phẩm",
                actionDescription: "Chạm nút [+ Thêm sản phẩm] góc trên",
                screenLocation: "Góc trên bên phải màn hình kho",
                mockupElement: {
                    type: "button",
                    label: "+ Thêm sản phẩm",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Mở bảng nhập liệu hàng hóa mới.",
            },
            {
                stepNumber: 3,
                title: "Nhập Tên, Giá & Tồn kho",
                actionDescription: "Điền tên món, giá bán lẻ và số lượng thùng/chai ban đầu",
                screenLocation: "Biểu mẫu nhập thông tin mặt hàng",
                mockupElement: {
                    type: "input",
                    label: "Nước suối Aquafina 500ml",
                    subLabel: "Giá: 10,000đ • Tồn kho: 48",
                },
                annotation: "Mã SKU chuẩn (SP-0001, SP-0002) sẽ được cấp tự động.",
            },
            {
                stepNumber: 4,
                title: "Lưu & Bán ngay",
                actionDescription: "Bấm [Lưu sản phẩm] để đưa vào menu POS",
                screenLocation: "Nút lưu dưới cùng",
                mockupElement: {
                    type: "button",
                    label: "Lưu sản phẩm",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Món hàng xuất hiện ngay ở mục Sản phẩm bán kèm và quầy Bán lẻ.",
            },
        ],
    },
    {
        id: 4,
        title: "Tạo vé câu & Bắt đầu câu (Quy trình chuẩn)",
        badge: "Vận hành",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Quy trình mở phiên câu cho khách đến hồ nhanh chóng dưới 15 giây với Dynamic Flow.",
        instructions: [
            "Bấm vào tab [Tạo vé] ở thanh điều hướng dưới đáy màn hình.",
            "Mục 1 (Khách hàng): Tìm theo tên/SĐT hoặc bỏ qua nếu khách vãng lai.",
            "Mục 2 (Chọn ô câu): Chạm vào ô trống khách ngồi (Ví dụ: Ô 01). Nếu hồ mới, bấm [+ Thêm ô câu] để tạo tại chỗ.",
            "Mục 3 (Gói câu): Chạm chọn gói câu khách muốn (Ví dụ: Ca 4 tiếng).",
            "Mục 4 & 5: Thêm đồ uống/mồi nếu khách lấy ngay.",
            "Bấm nút to màu xanh lá [Tạo vé và mở ô]. Máy in sẽ tự động in vé giao cho khách.",
        ],
        tips: "Nếu khách vào đông giờ cao điểm, chỉ cần chạm 1 ô câu + chạm 1 gói câu rồi bấm Tạo vé ngay, không bắt buộc nhập tên khách!",
        icon: "ticket",
        practiceUrl: "/sessions/new",
        practiceActionLabel: "🚀 Thực hành Mở vé ngay trên hồ thật",
        realWorldExample: {
            scenario: "Khách anh Hùng vào câu, chọn Ô số 3 và câu Ca 4 tiếng (200,000đ).",
            expectedResult: "Ô 3 chuyển từ màu trắng (trống) sang màu xanh lá (đang câu), đồng hồ đếm ngược 4:00:00 bắt đầu chạy và máy in nhả vé câu.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Bấm tab [Tạo vé]",
                actionDescription: "Chạm biểu tượng dấu cộng [+] ở thanh menu dưới cùng",
                screenLocation: "Thanh menu đáy (Bottom Nav)",
                mockupElement: {
                    type: "button",
                    label: "+ Tạo vé mới",
                    colorClass: "bg-[#246B38] text-white rounded-full",
                },
                annotation: "Mở ngay màn hình lập vé câu với tốc độ 0ms từ bộ nhớ đệm.",
            },
            {
                stepNumber: 2,
                title: "Chạm chọn Ô câu",
                actionDescription: "Ở Mục 2, chạm vào ô câu khách muốn ngồi (hoặc bấm + Thêm ô)",
                screenLocation: "Mục 2: Lưới danh sách ô câu",
                mockupElement: {
                    type: "chip",
                    label: "Ô 03 [Đang chọn]",
                    subLabel: "Khu chính • Đã chọn 1 ô",
                    colorClass: "bg-[#246B38] text-white border-[#246B38]",
                },
                annotation: "Ô được chọn sẽ sáng xanh lá đậm và hiện vào hàng chip đang chọn.",
            },
            {
                stepNumber: 3,
                title: "Chạm chọn Gói câu",
                actionDescription: "Ở Mục 3, chạm chọn gói câu khách đăng ký",
                screenLocation: "Mục 3: Danh sách các ca câu",
                mockupElement: {
                    type: "card",
                    label: "Ca 4 tiếng (240 phút)",
                    subLabel: "Giá vé: 200,000đ",
                    colorClass: "bg-[#E8F3E5] border-[#4F9D5A] text-[#17201A]",
                },
                annotation: "Chấm tròn màu xanh sẽ kích hoạt gói này cho phiên câu.",
            },
            {
                stepNumber: 4,
                title: "Bấm [Tạo vé và mở ô]",
                actionDescription: "Chạm nút to màu xanh ở đáy để xuất vé và mở đồng hồ",
                screenLocation: "Nút to cố định dưới cùng màn hình",
                mockupElement: {
                    type: "button",
                    label: "Tạo vé và mở ô ➔",
                    colorClass: "bg-[#246B38] text-white shadow-md",
                },
                annotation: "Vé được tạo tức thì, máy in nhiệt nhả vé và hệ thống chuyển sang Đang câu.",
            },
        ],
    },
    {
        id: 5,
        title: "Theo dõi phiên câu & Đồng hồ đếm ngược",
        badge: "Vận hành",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Giám sát thời gian câu của tất cả các cần thủ theo thời gian thực với mã màu cảnh báo.",
        instructions: [
            "Bấm vào tab [Đang câu] ở thanh menu đáy để xem tất cả các ô đang có khách.",
            "Mỗi ô có đồng hồ số đếm ngược thời gian còn lại trực quan.",
            "Màu Xanh lá: Phiên câu đang trong thời gian bình thường.",
            "Màu Vàng: Ô sắp hết giờ (còn dưới 15 phút) để nhân viên chuẩn bị nhắc khách.",
            "Màu Đỏ: Ô đã hết giờ hoặc đang câu quá giờ (sẽ tự động tính phụ thu).",
        ],
        tips: "Dùng các tab lọc [Tất cả], [Sắp hết giờ], [Quá giờ] ở đầu màn hình để xem nhanh các ô cần xử lý.",
        icon: "clock",
        practiceUrl: "/sessions",
        practiceActionLabel: "🚀 Xem màn hình Đang câu trên hồ thật",
        realWorldExample: {
            scenario: "Ô số 5 chỉ còn 10 phút là hết ca 4 tiếng.",
            expectedResult: "Thẻ ô số 5 chuyển sang màu vàng nhấp nháy cảnh báo, nhân viên tới hỏi khách muốn gia hạn hay chuẩn bị thu cần.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Vào tab [Đang câu]",
                actionDescription: "Chạm tab Đang câu ở thanh menu đáy",
                screenLocation: "Thanh điều hướng dưới cùng",
                mockupElement: {
                    type: "button",
                    label: "🎣 Đang câu (5 ô)",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Nơi hiển thị toàn cảnh mặt hồ và các cần thủ đang ngồi câu.",
            },
            {
                stepNumber: 2,
                title: "Xem đồng hồ đếm ngược",
                actionDescription: "Quan sát đồng hồ hiển thị trên từng thẻ ô câu",
                screenLocation: "Góc phải của từng thẻ ô câu",
                mockupElement: {
                    type: "badge",
                    label: "⏱ Còn 02:45:10",
                    subLabel: "Ô 03 • Anh Hùng",
                    colorClass: "bg-[#E8F3E5] text-[#246B38]",
                },
                annotation: "Đồng hồ chạy mượt từng giây theo thời gian thực mà không tốn pin.",
            },
            {
                stepNumber: 3,
                title: "Nhận biết cảnh báo màu",
                actionDescription: "Chú ý khi thẻ chuyển sang màu Vàng (<15p) hoặc Đỏ (quá giờ)",
                screenLocation: "Huy hiệu trạng thái trên thẻ ô",
                mockupElement: {
                    type: "badge",
                    label: "⚠️ Còn 00:08:30 (Sắp hết)",
                    colorClass: "bg-amber-100 text-amber-800 border-amber-300",
                },
                annotation: "Giúp nhân viên chủ động quản lý thời gian, tránh trường hợp khách câu lố giờ.",
            },
        ],
    },
    {
        id: 6,
        title: "Thêm món, gia hạn & thu cá trong ca",
        badge: "Trong ca",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Ghi nhận đồ uống, gia hạn thêm giờ hoặc mua lại cá của cần thủ ngay trong phiên.",
        instructions: [
            "Tại thẻ ô câu của khách, bạn sẽ thấy 3 nút chức năng nhanh.",
            "Bấm nút [+ Thêm món]: Chọn nước suối, thuốc lá hoặc mồi câu đưa ra ô cho khách.",
            "Bấm nút [Gia hạn]: Chọn thêm 1 giờ, 2 giờ hoặc nửa ca nếu khách muốn câu tiếp.",
            "Bấm nút [Thu cá]: Nhập loại cá và cân nặng (kg). Hệ thống tự nhân đơn giá thu mua.",
            "Tất cả chi phí phát sinh và tiền cá trừ lại được tự động ghi vào hóa đơn tạm tính của ô.",
        ],
        tips: "Mọi lần thêm món hay thu cá đều được lưu ngay lập tức, không bao giờ lo sót tiền khi khách ra về!",
        icon: "plus",
        practiceUrl: "/sessions",
        practiceActionLabel: "Đến danh sách ô để thực hành Thao tác",
        realWorldExample: {
            scenario: "Khách Ô 3 gọi thêm 2 lon bò húc (30,000đ) và câu được 3.5kg cá chép (hồ thu mua 35,000đ/kg = 122,500đ).",
            expectedResult: "Hóa đơn tự cộng 30,000đ tiền nước và tự trừ 122,500đ tiền cá, số tiền thanh toán cuối cùng được cập nhật tự động.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Tìm thẻ ô câu của khách",
                actionDescription: "Tìm ô câu tương ứng trên màn hình Đang câu",
                screenLocation: "Danh sách thẻ ô câu",
                mockupElement: {
                    type: "card",
                    label: "Ô 03 • Ca 4 tiếng",
                    subLabel: "Hàng nút chức năng nằm ngay bên dưới",
                },
                annotation: "Mỗi thẻ ô câu tích hợp sẵn các nút thao tác nghiệp vụ 1 chạm.",
            },
            {
                stepNumber: 2,
                title: "Bấm nút [+ Thêm món]",
                actionDescription: "Chạm nút [+ Thêm món] để chọn nước ngọt, mồi câu",
                screenLocation: "Nút đầu tiên trên thẻ ô",
                mockupElement: {
                    type: "button",
                    label: "+ Thêm món",
                    colorClass: "bg-white border-[#CCD5CA] text-[#17201A]",
                },
                annotation: "Chọn nhanh món từ kho hàng, tồn kho tự động trừ ngay.",
            },
            {
                stepNumber: 3,
                title: "Bấm nút [Gia hạn]",
                actionDescription: "Chạm nút [Gia hạn] khi khách muốn ngồi thêm",
                screenLocation: "Nút thứ hai trên thẻ ô",
                mockupElement: {
                    type: "button",
                    label: "⏱ Gia hạn ca",
                    colorClass: "bg-white border-[#CCD5CA] text-[#17201A]",
                },
                annotation: "Chọn số phút/tiếng muốn cộng thêm, đồng hồ đếm ngược tự lùi lại.",
            },
            {
                stepNumber: 4,
                title: "Bấm nút [Thu lại cá]",
                actionDescription: "Chạm nút [Thu cá] để ghi nhận số kg cá câu được",
                screenLocation: "Nút thứ ba trên thẻ ô",
                mockupElement: {
                    type: "button",
                    label: "🐟 Thu cá",
                    colorClass: "bg-[#E8F3E5] border-[#4F9D5A] text-[#246B38]",
                },
                annotation: "Tiền cá sẽ được tự động làm khoản giảm trừ trên hóa đơn thanh toán.",
            },
        ],
    },
    {
        id: 7,
        title: "Kết thúc phiên & In bill quyết toán",
        badge: "Thanh toán",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Quyết toán tiền minh bạch từng đồng và giải phóng ô câu đón lượt khách mới.",
        instructions: [
            "Khi khách chuẩn bị về, bấm nút màu đỏ cam [Kết thúc] trên thẻ ô câu.",
            "Bảng quyết toán hiển thị chi tiết: Tiền giờ câu + Tiền đồ uống/mồi - Tiền trừ cá - Tiền đã cọc.",
            "Chọn phương thức thanh toán: Tiền mặt hoặc Quét mã QR chuyển khoản.",
            "Bấm [Hoàn tất & Đóng ca]: Hệ thống tự động in hóa đơn 58mm và mở ô câu về trạng thái Trống.",
        ],
        tips: "Nếu máy in kẹt giấy, bạn luôn có thể bấm nút [In lại hóa đơn] ngay trên màn hình hoàn tất.",
        icon: "receipt",
        practiceUrl: "/sessions",
        practiceActionLabel: "Xem danh sách ô để thực hành Quyết toán",
        realWorldExample: {
            scenario: "Khách Ô 3 kết thúc ca: Tiền giờ 200k + Tiền nước 30k - Tiền cá 122.5k = Khách trả thêm 107,500đ.",
            expectedResult: "Hóa đơn in ra rõ ràng các mục, khách quét mã chuyển khoản 107,500đ và ô số 3 chuyển về màu trắng sẵn sàng đón khách mới.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Bấm nút [Kết thúc]",
                actionDescription: "Chạm nút Kết thúc màu đỏ cam trên thẻ ô",
                screenLocation: "Bên phải thẻ ô câu",
                mockupElement: {
                    type: "button",
                    label: "Kết thúc ca ➔",
                    colorClass: "bg-rose-600 text-white",
                },
                annotation: "Dừng đồng hồ đếm ngược và mở bảng tính toán chi tiết toàn phiên.",
            },
            {
                stepNumber: 2,
                title: "Kiểm tra bảng tính tiền",
                actionDescription: "Xem lại bảng chi tiết giờ câu, nước uống và giảm trừ cá",
                screenLocation: "Màn hình Modal Quyết toán",
                mockupElement: {
                    type: "card",
                    label: "Cần thu: 107,500đ",
                    subLabel: "Giờ: 200k • Nước: 30k • Cá: -122.5k",
                    colorClass: "bg-[#F7F9F5] border-[#D1E5CE]",
                },
                annotation: "Tự động tính toán chuẩn xác 100%, không cần cộng trừ thủ công bằng máy tính bấm tay.",
            },
            {
                stepNumber: 3,
                title: "Chọn phương thức trả",
                actionDescription: "Bấm chọn Tiền mặt hoặc Chuyển khoản VietQR",
                screenLocation: "Hai nút lựa chọn phương thức thanh toán",
                mockupElement: {
                    type: "chip",
                    label: "💳 Chuyển khoản QR",
                    subLabel: "Hiện mã QR VietQR tự động điền số tiền",
                    colorClass: "bg-[#E8F3E5] text-[#246B38] border-[#4F9D5A]",
                },
                annotation: "Mã QR động tự điền số tiền chính xác, khách quét là chuyển đúng số tiền.",
            },
            {
                stepNumber: 4,
                title: "Bấm [Hoàn tất & Đóng ca]",
                actionDescription: "Chạm nút hoàn tất để xuất hóa đơn và mở lại ô câu",
                screenLocation: "Nút xanh dưới cùng bảng quyết toán",
                mockupElement: {
                    type: "button",
                    label: "Hoàn tất & In Bill",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Máy in nhả bill nhiệt giao khách, ô câu giải phóng về trạng thái Trống.",
            },
        ],
    },
    {
        id: 8,
        title: "Bán lẻ hàng hóa cho khách vãng lai",
        badge: "Bán lẻ",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Bán nước ngọt, thuốc lá, mồi câu cho khách ghé mua mà không cần mở vé câu.",
        instructions: [
            "Vào tab [Tạo vé] -> Gạt nút chuyển sang tab [Bán lẻ hàng hóa] trên đầu trang.",
            "Chọn các món khách mua ở danh sách bên trái (hiển thị số lượng tồn kho còn lại).",
            "Điều chỉnh số lượng trong giỏ hàng bằng nút cộng (+) hoặc trừ (-).",
            "Chọn Tiền mặt hoặc Chuyển khoản rồi bấm [Thanh toán & Xuất bill].",
            "Kho hàng sẽ tự động giảm trừ ngay và in bill thanh toán bán lẻ.",
        ],
        tips: "Đơn bán lẻ độc lập hoàn toàn với các ô câu, không làm xáo trộn số liệu các cần thủ đang ngồi.",
        icon: "cart",
        practiceUrl: "/sessions/new",
        practiceActionLabel: "🚀 Mở quầy Bán lẻ nhanh thực hành",
        realWorldExample: {
            scenario: "Khách đi đường ghé mua 3 lon nước ngọt và 1 gói thuốc lá, trả tiền mặt.",
            expectedResult: "Xuất hóa đơn bán lẻ nhanh, kho trừ đúng 3 lon nước và 1 gói thuốc, tiền mặt ghi nhận vào két thu ngân.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Gạt sang [Bán lẻ]",
                actionDescription: "Tại trang Tạo vé, bấm vào tab 'Bán lẻ hàng hóa' ở trên cùng",
                screenLocation: "Thanh chuyển đổi Switcher trên đầu",
                mockupElement: {
                    type: "toggle",
                    label: "[Vé câu]  |  [Bán lẻ hàng hóa ●]",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Chuyển giao diện sang chế độ quầy thu ngân bán lẻ chuyên dụng.",
            },
            {
                stepNumber: 2,
                title: "Chạm chọn món hàng",
                actionDescription: "Chạm vào các món khách chọn để đưa vào giỏ hàng",
                screenLocation: "Lưới danh mục sản phẩm",
                mockupElement: {
                    type: "chip",
                    label: "Nước tăng lực Sting (x3)",
                    subLabel: "36,000đ • Còn 32 lon",
                    colorClass: "bg-[#E8F3E5] text-[#246B38]",
                },
                annotation: "Bấm nút (+) hoặc (-) để thay đổi số lượng món nhanh chóng.",
            },
            {
                stepNumber: 3,
                title: "Bấm [Thanh toán & Xuất bill]",
                actionDescription: "Chọn Tiền mặt / Chuyển khoản rồi bấm nút thanh toán",
                screenLocation: "Nút thanh toán dưới giỏ hàng",
                mockupElement: {
                    type: "button",
                    label: "Thanh toán 36,000đ ➔",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Hệ thống trừ kho ngay lập tức và tự động in hóa đơn bán lẻ 58mm.",
            },
        ],
    },
    {
        id: 9,
        title: "Xem Nhật ký & Báo cáo doanh thu ca",
        badge: "Báo cáo",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Đối soát tiền mặt, tiền chuyển khoản và lịch sử thao tác của nhân viên trong ngày.",
        instructions: [
            "Vào tab [Nhật ký] để xem lại toàn bộ các hóa đơn vé câu và đơn bán lẻ đã xuất.",
            "Kiểm tra ai đã mở vé, ai đã thu tiền, ai đã nhập kho trong ngày.",
            "Vào mục [Báo cáo] để xem tổng doanh thu: bao nhiêu tiền mặt trong két, bao nhiêu chuyển khoản.",
            "Cuối ngày bấm [Chốt ca] để kiểm kê két tiền và lưu biên bản bàn giao ca làm việc.",
        ],
        tips: "Chốt ca mỗi ngày giúp chủ hồ và nhân viên bàn giao tiền minh bạch, không sợ thất thoát.",
        icon: "chart",
        practiceUrl: "/invoices",
        practiceActionLabel: "Đến xem Nhật ký hóa đơn thực tế",
        realWorldExample: {
            scenario: "Cuối ngày lúc 22h, ca làm việc kết thúc cần kiểm tiền giao ca.",
            expectedResult: "Báo cáo hiển thị: Tiền mặt trong két: 1,450,000đ, Chuyển khoản: 2,300,000đ. Nhân viên đếm tiền và bấm Chốt ca thành công.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Vào tab [Nhật ký]",
                actionDescription: "Chạm biểu tượng Nhật ký ở thanh menu đáy",
                screenLocation: "Thanh điều hướng dưới cùng",
                mockupElement: {
                    type: "button",
                    label: "📋 Nhật ký hóa đơn",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Tra cứu lịch sử mọi giao dịch đã diễn ra trong hồ.",
            },
            {
                stepNumber: 2,
                title: "Đối soát Tiền mặt & CK",
                actionDescription: "Xem phân loại tiền mặt và chuyển khoản để đếm két",
                screenLocation: "Các thẻ tóm tắt doanh thu đầu trang",
                mockupElement: {
                    type: "card",
                    label: "Tiền mặt: 1,450,000đ",
                    subLabel: "Chuyển khoản: 2,300,000đ",
                    colorClass: "bg-[#E8F3E5] border-[#4F9D5A]",
                },
                annotation: "Đếm số tiền thực tế trong két đối chiếu với con số hiển thị.",
            },
            {
                stepNumber: 3,
                title: "Bấm nút [Chốt ca]",
                actionDescription: "Bấm Chốt ca để lưu lại biên bản kết ca làm việc",
                screenLocation: "Nút Chốt ca ở cuối màn hình",
                mockupElement: {
                    type: "button",
                    label: "Khóa sổ & Chốt ca",
                    colorClass: "bg-[#17201A] text-white",
                },
                annotation: "Biên bản chốt ca được lưu vĩnh viễn, gửi thông báo cho Chủ hồ.",
            },
        ],
    },
    {
        id: 10,
        title: "Cài đặt & kết nối máy in 58mm",
        badge: "Thiết bị",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Kết nối máy in nhiệt cầm tay Bluetooth, USB hoặc WiFi không dây siêu nhạy.",
        instructions: [
            "Bật nguồn máy in nhiệt 58mm (đèn xanh sáng) và bật Bluetooth trên điện thoại.",
            "Vào mục Cài đặt -> cuộn xuống phần [Cài đặt máy in].",
            "Bấm [Quét thiết bị Bluetooth] -> chạm chọn tên máy in của bạn (PT-210, MPT-II...).",
            "Bấm nút [In thử nghiệm 58mm] để kiểm tra máy in hoạt động chuẩn xác.",
        ],
        tips: "Chỉ cần kết nối 1 lần duy nhất, các lần tạo vé và tính tiền sau máy sẽ tự động in.",
        icon: "printer",
        practiceUrl: "/settings",
        practiceActionLabel: "Mở Cài đặt máy in trên hồ thật",
        realWorldExample: {
            scenario: "Hồ vừa trang bị máy in nhiệt Bluetooth cầm tay 58mm để in vé tại chòi cho khách.",
            expectedResult: "Máy in kết nối thành công, bấm In thử nghiệm máy in nhả ngay một hóa đơn mẫu sắc nét.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Bật Bluetooth & Máy in",
                actionDescription: "Bật máy in nhiệt 58mm và bật Bluetooth trên điện thoại",
                screenLocation: "Thiết bị cầm tay bên ngoài",
                mockupElement: {
                    type: "badge",
                    label: "Máy in 58mm: Đang chờ kết nối",
                    colorClass: "bg-blue-100 text-blue-800",
                },
                annotation: "Đảm bảo cuộn giấy in nhiệt đã được lắp đúng chiều chữ.",
            },
            {
                stepNumber: 2,
                title: "Bấm [Quét thiết bị]",
                actionDescription: "Vào Cài đặt -> Máy in -> Bấm nút quét Bluetooth",
                screenLocation: "Mục Cài đặt máy in",
                mockupElement: {
                    type: "button",
                    label: "🔍 Quét máy in Bluetooth",
                    colorClass: "bg-[#246B38] text-white",
                },
                annotation: "Hệ thống tự tìm các máy in nhiệt trong phạm vi 10 mét.",
            },
            {
                stepNumber: 3,
                title: "Bấm [In thử nghiệm]",
                actionDescription: "Chạm nút In thử nghiệm để test chất lượng in",
                screenLocation: "Nút In thử nghiệm màu xanh",
                mockupElement: {
                    type: "button",
                    label: "In thử nghiệm 58mm 🖨️",
                    colorClass: "bg-[#E8F3E5] text-[#246B38] border-[#4F9D5A]",
                },
                annotation: "Máy in nhả giấy kiểm tra kết nối, sẵn sàng in vé tự động.",
            },
        ],
    },
    {
        id: 11,
        title: "Xử lý các tình huống lỗi thường gặp & Chế độ Offline",
        badge: "Khắc phục",
        roles: ["OWNER", "MANAGER", "STAFF"],
        summary: "Cách xử lý mượt mà khi mất kết nối mạng, máy in hết giấy hoặc khách chuyển khoản chậm.",
        instructions: [
            "Mất mạng Internet: Ứng dụng tự kích hoạt chế độ Offline, bạn vẫn mở vé và xem đồng hồ bình thường. Khi có mạng trở lại dữ liệu tự đồng bộ ngầm.",
            "Máy in không in: Kiểm tra xem cuộn giấy nhiệt có bị ngược chiều không, tắt mở lại máy in rồi bấm [In lại].",
            "Khách chuyển khoản chưa nổi tiền: Kiểm tra mã chuẩn VietQR trên màn hình quyết toán hoặc chụp lại màn hình giao dịch của khách để đối chiếu.",
            "Bấm nhầm hủy vé: Kiểm tra lại lịch sử trong mục Nhật ký để đối soát chi tiết.",
        ],
        tips: "Bất cứ lúc nào cần hỗ trợ, chỉ cần bấm vào nút [?] trên góc phải màn hình để mở hướng dẫn nhanh.",
        icon: "help",
        practiceUrl: "/sessions",
        practiceActionLabel: "Trở lại màn hình Giám sát hồ",
        realWorldExample: {
            scenario: "Trời mưa to làm đứt cáp WiFi hồ, điện thoại mất kết nối mạng trong 15 phút.",
            expectedResult: "Thanh trạng thái hiện 'Offline' màu cam, nhân viên vẫn mở vé câu Ô 4 bình thường, 15 phút sau có mạng hệ thống tự đẩy dữ liệu lên máy chủ 100% nguyên vẹn.",
        },
        flowSteps: [
            {
                stepNumber: 1,
                title: "Nhận biết Chế độ Offline",
                actionDescription: "Khi mất mạng, nhãn màu cam Offline sẽ xuất hiện trên đầu",
                screenLocation: "Góc phải thanh Header trên cùng",
                mockupElement: {
                    type: "badge",
                    label: "● Offline (Tự lưu tạm)",
                    colorClass: "bg-amber-100 text-amber-800 border-amber-300",
                },
                annotation: "Đừng lo lắng! Tiếp tục thao tác mở vé và tính tiền bình thường.",
            },
            {
                stepNumber: 2,
                title: "Tiếp tục tạo vé & bán hàng",
                actionDescription: "Dữ liệu được bảo vệ an toàn trong bộ nhớ máy",
                screenLocation: "Màn hình Tạo vé",
                mockupElement: {
                    type: "card",
                    label: "Đang lưu tạm trên máy...",
                    subLabel: "Chống mất dữ liệu 100%",
                },
                annotation: "Không bị gián đoạn công việc bán vé của hồ.",
            },
            {
                stepNumber: 3,
                title: "Tự động đồng bộ khi có mạng",
                actionDescription: "Khi có WiFi/4G trở lại, hệ thống tự động đẩy dữ liệu lên",
                screenLocation: "Thanh thông báo trên cùng",
                mockupElement: {
                    type: "badge",
                    label: "● Online (Đã đồng bộ)",
                    colorClass: "bg-[#E8F3E5] text-[#246B38]",
                },
                annotation: "Dữ liệu đồng bộ hoàn toàn, không mất bất kỳ hóa đơn nào.",
            },
        ],
    },
];
