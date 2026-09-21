import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OfficialLandingPage } from "@/components/landing/official-landing-page";

export const metadata: Metadata = {
    title: "Phần Mềm Quản Lý Hồ Câu — App Cho Chủ Hồ Trên Điện Thoại | Quản Lí Hồ Câu",
    description:
        "Phần mềm quản lý hồ câu & App cho chủ hồ câu trên điện thoại: đếm giờ phiên câu tự động, tính phụ thu lố giờ, quản lý nhân viên từ xa, bán mồi nước, thu mua cá, in bill 58mm và hạn chế thất thoát. Dùng thử miễn phí 7 ngày!",
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
    ],
    openGraph: {
        title: "Phần Mềm Quản Lý Hồ Câu — App Cho Chủ Hồ Trên Điện Thoại",
        description:
            "App cho chủ hồ quản lý vé câu, nhân viên từ xa, đếm giờ tự động, bán mồi nước và chống thất thoát ngay trên điện thoại. Dùng thử miễn phí 7 ngày.",
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
            "url": "https://quanlihocau.com",
            "name": "Quản Lý Hồ Câu",
            "alternateName": ["App Cho Chủ Hồ", "Quan Li Ho Cau POS"],
            "description": "Phần mềm quản lý hồ câu chuyên nghiệp và app cho chủ hồ câu trên điện thoại tại Việt Nam",
            "inLanguage": "vi",
        },
        {
            "@type": "SoftwareApplication",
            "@id": "https://quanlihocau.com/#software",
            "name": "Quản Lý Hồ Câu",
            "alternateName": "App Quản Lý Hồ Câu Cho Chủ Hồ",
            "operatingSystem": "iOS, Android, Windows, macOS, Web",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Fishing Pond POS & Management System",
            "description":
                "Phần mềm quản lý hồ câu dịch vụ toàn diện và app cho chủ hồ trên điện thoại: tính giờ phiên câu theo thời gian thực, tự động tính phụ thu lố giờ, bán mồi nước ăn uống, thu mua cá và kiểm soát ca làm việc từ xa.",
            "url": "https://quanlihocau.com",
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "98",
                "bestRating": "5",
                "worstRating": "1",
            },
            "featureList": [
                "Đồng hồ đếm ngược phiên câu theo thời gian thực từng giây",
                "Tự động tính tiền phụ thu khi cần thủ câu lố thời gian quy định",
                "Sơ đồ bờ hồ trực quan, chạm mở vé nhanh trong 3 giây",
                "Bán mồi câu, đồ ăn, nước giải khát cộng dồn trực tiếp vào vé đang câu",
                "Cân cá thu mua và cấn trừ tiền tự động vào hóa đơn",
                "Theo dõi doanh thu thời gian thực và quản lý nhân viên từ xa trên điện thoại",
                "In vé tạm và hóa đơn thanh toán khổ 58mm qua máy in Bluetooth hoặc Wifi",
                "Cơ chế lưu trữ offline giúp mở vé liên tục ngay cả khi sóng mạng yếu",
            ],
            "offers": [
                {
                    "@type": "Offer",
                    "name": "Dùng thử miễn phí 7 ngày",
                    "price": "0",
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/register",
                },
                {
                    "@type": "Offer",
                    "name": "Gói Bạc (Silver)",
                    "price": "99000",
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/bang-gia",
                    "description": "99.000đ / 30 ngày: tối đa 30 ô câu, 1 nhân viên",
                },
                {
                    "@type": "Offer",
                    "name": "Gói Vàng (Gold)",
                    "price": "179000",
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/bang-gia",
                    "description": "179.000đ / 30 ngày: không giới hạn ô câu, không giới hạn nhân viên",
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
                        "text": "Quản Lý Hồ Câu (quanlihocau.com) là phần mềm chuyên biệt hoạt động trên điện thoại và máy tính dành cho các hồ câu dịch vụ. Phần mềm gồm các tính năng cốt lõi: mở vé theo sơ đồ ô câu, đồng hồ đếm ngược phiên câu, tự tính phụ thu lố giờ, bán mồi nước cộng vào vé, cân cá thu mua cấn trừ bill, in bill 58mm và báo cáo doanh thu từ xa cho chủ hồ.",
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
                        "text": "Hệ thống có đồng hồ đếm ngược chính xác từng giây theo gói câu (ví dụ ca 3 tiếng, ca 4 tiếng). Khi hết giờ, ứng dụng tự phát cảnh báo và tự động tính tiền phụ thu theo số phút câu lố dựa trên cấu hình giá của hồ, giúp chủ hồ và nhân viên không phải tự nhẩm tính hay tranh cãi với khách.",
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
                        "text": "Không gián đoạn các thao tác thiết yếu. Ứng dụng có bộ nhớ tạm trên máy giúp mở vé và ghi nhận thông tin, sau đó tự đồng bộ khi có kết nối trở lại.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Chi phí sử dụng app cho chủ hồ là bao nhiêu và cách dùng thử?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Mọi chủ hồ đều được kích hoạt dùng thử miễn phí 7 ngày đầy đủ tính năng ngay khi đăng ký tại quanlihocau.com mà không cần thẻ ngân hàng. Sau dùng thử, chi phí thuê bao chỉ từ 99.000đ/tháng (Gói Bạc) hoặc 179.000đ/tháng (Gói Vàng không giới hạn). Hotline hỗ trợ: 0855 550 813.",
                    },
                },
            ],
        },
    ],
};

export default async function HomePage() {
    const session = await getServerSession(authOptions);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
            />
            <OfficialLandingPage isLoggedIn={Boolean(session?.user)} />
        </>
    );
}
