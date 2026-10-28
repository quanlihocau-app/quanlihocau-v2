import type { Metadata } from "next";
import { getPageSession } from "@/lib/server-session";
import { BrandLandingPage as OfficialLandingPage } from "@/components/landing/brand-landing-page";

export const metadata: Metadata = {
    title: "Phần Mềm Quản Lý Hồ Câu — App Cho Chủ Hồ Trên Điện Thoại | Quản Lý Hồ Câu",
    description:
        "Quản Lý Hồ Câu do Huân Trần (Trần Anh Huân) sáng lập: ghi vé, theo dõi giờ câu, thêm hàng, thu mua cá và đối chiếu tiền ca trên điện thoại. Dùng thử 30 ngày.",
    keywords: [
        "phần mềm quản lý hồ câu",
        "app cho chủ hồ",
        "app quản lý hồ câu",
        "ứng dụng cho chủ hồ câu",
        "phần mềm tính tiền hồ câu",
        "quản lý hồ câu dịch vụ",
        "quản lý hồ câu đài",
        "quản lý hồ câu lure",
        "phần mềm quản lý hồ câu trên điện thoại",
        "app tính tiền hồ câu",
        "quản lý hồ câu tránh thất thoát",
        "tính giờ phiên câu",
        "máy in bill hồ câu",
        "quanlihocau",
        "Huân Trần",
        "Trần Anh Huân",
    ],
    openGraph: {
        title: "Phần Mềm Quản Lý Hồ Câu — App Cho Chủ Hồ Trên Điện Thoại",
        description:
            "App cho chủ hồ quản lý vé câu, nhân viên từ xa, đếm giờ tự động, bán mồi nước và chống thất thoát ngay trên điện thoại. Tài khoản mới dùng thử miễn phí 30 ngày.",
        url: "https://quanlihocau.com",
        siteName: "Quản Lý Hồ Câu",
        locale: "vi_VN",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Phần Mềm Quản Lý Hồ Câu — App Cho Chủ Hồ Trên Điện Thoại",
        description:
            "Phần mềm quản lý hồ câu & App cho chủ hồ câu: đếm giờ tự động, quản lý kho mồi nước, in bill 58mm.",
    },
    alternates: {
        canonical: "https://quanlihocau.com",
    },
};

const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebSite",
            "@id": "https://quanlihocau.com/#website",
            "publisher": { "@id": "https://quanlihocau.com/#organization" },
            "url": "https://quanlihocau.com",
            "name": "Quản Lý Hồ Câu",
            "alternateName": ["App Cho Chủ Hồ", "QuanLiHoCau"],
            "description": "Phần mềm quản lý hồ câu chuyên nghiệp và app cho chủ hồ câu trên điện thoại tại Việt Nam",
            "inLanguage": "vi",
        },
        {
            "@type": "SoftwareApplication",
            "@id": "https://quanlihocau.com/#software",
            "creator": { "@id": "https://quanlihocau.com/huan-tran#person" },
            "name": "Quản Lý Hồ Câu",
            "alternateName": "App Quản Lý Hồ Câu Cho Chủ Hồ",
            "operatingSystem": "iOS, Android, Windows, macOS, Web",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Fishing Pond POS & Management System",
            "description":
                "Sổ hồ câu trên điện thoại: ghi vé, theo dõi thời gian, gia hạn theo xác nhận, thêm hàng, thu mua cá và đối chiếu tiền cuối ca.",
            "url": "https://quanlihocau.com",
            "featureList": [
                "Đồng hồ đếm ngược phiên câu theo thời gian thực từng giây",
                "Cảnh báo thời gian để chủ hồ chọn gia hạn hoặc kết thúc",
                "Chọn ô số và gói câu trên sơ đồ hồ",
                "Bán mồi câu, đồ ăn, nước giải khát cộng dồn trực tiếp vào vé đang câu",
                "Cân cá thu mua và cấn trừ tiền tự động vào hóa đơn",
                "Theo dõi doanh thu thời gian thực và quản lý nhân viên từ xa trên điện thoại",
                "In vé tạm và hóa đơn thanh toán khổ 58mm qua máy in Bluetooth hoặc Wifi",
                "Phát hiện mất mạng và chặn mở vé, thu tiền để tránh ghi sai số liệu",
            ],
            "offers": [
                {
                    "@type": "Offer",
                    "name": "Dùng thử miễn phí 30 ngày",
                    "price": "0",
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/register",
                },
                {
                    "@type": "Offer",
                    "name": "Gói Bạc (Silver)",
                    "price": "129000",
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/bang-gia",
                    "description": "129.000đ/tháng hoặc 1.290.000đ/năm: tối đa 30 ô câu, chủ hồ và 2 nhân sự",
                },
                {
                    "@type": "Offer",
                    "name": "Gói Vàng (Gold)",
                    "price": "199000",
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/bang-gia",
                    "description": "199.000đ/tháng hoặc 1.990.000đ/năm: không giới hạn ô câu và nhân sự",
                },
            ],
        },
        {
            "@type": "FAQPage",
            "@id": "https://quanlihocau.com/#faq",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Phần mềm quản lý hồ câu là gì và gồm những tính năng gì?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Quản Lí Hồ Câu là sổ hồ câu trên điện thoại: ghi vé theo ô số, theo dõi giờ, thêm hàng, thu mua cá và đối chiếu thu chi cuối ca.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "App cho chủ hồ câu trên điện thoại giúp quản lý những gì từ xa?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Dù ở nhà hay đi công việc xa, chủ hồ chỉ cần mở app trên điện thoại là xem được: số lượng ô/chòi đang có khách câu, khách câu được mấy tiếng, tổng tiền thu hôm nay phân tách tiền mặt và chuyển khoản, cùng nhật ký chi tiết từng thao tác của nhân viên tại hồ.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Phần mềm tự động tính tiền quá giờ cho cần thủ như thế nào?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "App hiển thị giờ vào, giờ ra dự kiến và đồng hồ theo gói câu. Khi hết giờ, nhân viên chọn gia hạn hoặc kết thúc; số tiền thay đổi theo thao tác xác nhận và bảng giá hiện hành của hồ.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Hồ câu đài và hồ câu lure có sử dụng được phần mềm này không?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Phần mềm được thiết kế tối ưu cho cả hồ câu đài (tính giờ, đếm giờ ca, phụ thu quá giờ), hồ câu lure và cá thịt (quản lý vé câu buổi/ngày, cân cá mua lại cấn trừ hóa đơn), hồ câu tôm và hồ câu sinh thái đa phân khu.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "So sánh phần mềm Quản Lý Hồ Câu với Excel và KiotViet?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Excel và sổ tay dễ mất số liệu, không có đồng hồ đếm giờ và không thể theo dõi từ xa. KiotViet và Sapo thiết kế cho bán lẻ tạp hóa, thiếu hoàn toàn nghiệp vụ đếm giờ phiên câu theo ô, không tự tính phụ thu quá giờ và không có tính năng thu mua lại cá. Quản Lý Hồ Câu là giải pháp chuyên biệt bờ hồ duy nhất giải quyết trọn vẹn các bài toán này.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Nhân viên lớn tuổi, ít dùng công nghệ có sử dụng được không?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Hoàn toàn được. Giao diện được thiết kế với nút bấm to, chữ tiếng Việt rõ ràng, chỉ cần chạm chọn ô và chọn gói câu. Thực tế nhân viên tại các hồ chỉ mất khoảng 10 phút là quen tay.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Ứng dụng có quản lý hàng hóa không?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Có. Phần mềm cho phép nhập số lượng nước ngọt, bia, mồi câu và đồ ăn. Mỗi khi thêm vào vé của khách, kho sẽ tự trừ để cuối ngày dễ dàng đối chiếu số tồn.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Mất mạng có làm gián đoạn việc tạo vé không?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Khi mất mạng, ứng dụng báo offline và chặn mở vé, đóng phiên, thu tiền để tránh ghi sai. Có mạng trở lại thì thao tác bình thường. Ứng dụng không lưu vé offline để đồng bộ sau.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Chi phí sử dụng app cho chủ hồ là bao nhiêu và cách dùng thử?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Tài khoản mới được dùng thử 30 ngày. Gói Bạc 129.000đ/tháng (tối đa 30 ô, chủ hồ và 2 nhân sự), Gói Vàng 199.000đ/tháng. Đóng năm bằng giá 10 tháng: 1.290.000đ và 1.990.000đ. Hỗ trợ qua Zalo/hotline 0855 550 813. Cài đặt tận nơi chỉ dành cho Gói sáng lập.",
                    },
                },
            ],
        },
    ],
};

export default async function HomePage() {
    const session = await getPageSession();

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c") }}
            />
            <OfficialLandingPage isLoggedIn={Boolean(session?.user)} />
        </>
    );
}
