import type { Metadata, Viewport } from "next";
import { founder } from "@/lib/founder";
import { Suspense } from "react";

import { PageProgressBar } from "@/components/ui/page-progress-bar";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { Providers } from "./providers";
import { QuickActions } from "@/components/layout/quick-actions";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://quanlihocau.com"),
    title: {
        default: "Quản Lý Hồ Câu — Hồ đông vẫn nhàn, tiền hàng vẫn rõ",
        template: "%s | Quản Lý Hồ Câu",
    },
    description:
        "Phần mềm quản lý hồ câu & App cho chủ hồ câu trên điện thoại: quản lý nhân viên từ xa, vé câu, hàng hóa, thanh toán, báo cáo và hạn chế thất thoát. Tư vấn miễn phí: 0855 550 813.",
    keywords: [
        "phần mềm quản lý hồ câu",
        "app cho chủ hồ",
        "app quản lý hồ câu",
        "ứng dụng cho chủ hồ câu",
        "phần mềm hồ câu",
        "quản lý hồ câu dịch vụ",
        "tính tiền hồ câu",
        "phần mềm tính tiền hồ câu theo giờ",
        "quản lý hồ câu đài",
        "quản lý hồ câu lure",
        "quản lý hồ câu giải trí",
        "đồng hồ phiên câu",
        "app bấm giờ hồ câu",
        "cân cá thu mua cấn trừ hóa đơn",
        "in hóa đơn hồ câu 58mm",
        "chống thất thoát hồ câu",
        "quản lý nhân viên hồ câu từ xa",
        "báo cáo ca hồ câu",
        "POS hồ câu cá",
    ],
    authors: [{ name: "Huân Trần (Trần Anh Huân)", url: "https://quanlihocau.com/huan-tran" }],
    creator: "Huân Trần (Trần Anh Huân)",
    publisher: "Quản Lý Hồ Câu",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    verification: {
        google: "nnj6c3yCZTS9Iiue3oQdVPBaxiUXLNFA9o8nv-giD4s",
    },
    openGraph: {
        type: "website",
        locale: "vi_VN",
        url: "https://quanlihocau.com",
        siteName: "Quản Lý Hồ Câu",
        title: "Quản Lý Hồ Câu — Phần Mềm & App Cho Chủ Hồ Câu Trên Điện Thoại",
        description:
            "Phần mềm quản lý hồ câu chuyên nghiệp: tính tiền phiên câu theo giờ, tự động tính phụ thu lố giờ, bán mồi nước, thu mua cá, kiểm soát nhân viên và báo cáo doanh thu từ xa.",
        images: [
            {
                url: "https://quanlihocau.com/opengraph-image",
                width: 1200,
                height: 630,
                alt: "Quản Lý Hồ Câu - Phần mềm quản lý hồ câu chuyên nghiệp",
            },
            {
                url: "https://quanlihocau.com/icons/icon-512x512.png",
                width: 512,
                height: 512,
                alt: "Quản Lý Hồ Câu App Icon",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Quản Lý Hồ Câu — Phần Mềm & App Cho Chủ Hồ Câu Trên Điện Thoại",
        description:
            "Hồ câu vận hành gọn. Khách vui, chủ yên tâm. Quản lý phiên câu, ô câu, hóa đơn, kho, chi phí và chốt ca trên điện thoại.",
        images: ["https://quanlihocau.com/opengraph-image"],
    },
    alternates: {
        canonical: "https://quanlihocau.com",
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "QuanLiHoCau",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: [
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
            { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
            { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: dark)", color: "#FAFAF7" },
        { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    ],
    width: "device-width",
    initialScale: 1,
    userScalable: true,
    viewportFit: "cover",
};

const jsonLdSchema = {
    "@context": "https://schema.org",
    "@graph": [
        founder,
        {
            "@type": "SoftwareApplication",
            "@id": "https://quanlihocau.com/#software",
            "creator": { "@id": founder["@id"] },
            "name": "Quản Lý Hồ Câu",
            "alternateName": ["App Cho Chủ Hồ", "Ứng dụng Quản Lý Hồ Câu", "Phần mềm POS Hồ Câu"],
            "operatingSystem": "Web, iOS, Android, Windows, macOS",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Fishing Pond POS & Management System",
            "description": "Phần mềm quản lý hồ câu dịch vụ chuyên nghiệp và app cho chủ hồ: tính tiền phiên câu theo giờ, cảnh báo hết giờ, nhân viên quyết định gia hạn hoặc kết thúc, phụ thu chỉ khi xác nhận, bán lẻ đồ câu, kiểm soát thất thoát và báo cáo doanh thu.",
            "url": "https://quanlihocau.com",
            "installUrl": "https://quanlihocau.com/register",
            "screenshot": "https://quanlihocau.com/opengraph-image",
            "inLanguage": "vi-VN",
            "featureList": [
                "Đồng hồ đếm ngược phiên câu theo thời gian thực từng giây",
                "Tự động tính tiền phụ thu khi cần thủ câu lố thời gian quy định",
                "Sơ đồ bờ hồ trực quan, chạm mở vé nhanh trong 3 giây",
                "Bán mồi câu, đồ ăn, nước giải khát cộng dồn trực tiếp vào vé đang câu",
                "Cân cá thu mua và cấn trừ tiền tự động vào hóa đơn",
                "Theo dõi doanh thu thời gian thực và quản lý nhân viên từ xa trên điện thoại",
                "In vé tạm và hóa đơn thanh toán khổ 58mm qua máy in Bluetooth hoặc Wifi",
                "Nhật ký kiểm toán chống thất thoát tiền mặt, mọi thao tác hủy vé/sửa giá đều cần chủ hồ duyệt",
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
            "@type": "Organization",
            "@id": "https://quanlihocau.com/#organization",
            "founder": { "@id": founder["@id"] },
            "name": "Quản Lý Hồ Câu",
            "url": "https://quanlihocau.com",
            "logo": "https://quanlihocau.com/icons/icon-512x512.png",
            "telephone": "+84855550813",
            "knowsAbout": [
                "Phần mềm quản lý hồ câu dịch vụ",
                "Vận hành hồ câu đài và hồ câu lure",
                "Tính tiền giờ câu cá tự động",
                "Cân cá thu mua cấn trừ hóa đơn",
                "In hóa đơn nhiệt 58mm cho hồ câu",
                "Kiểm soát thất thoát doanh thu hồ câu",
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+84855550813",
                "contactType": "customer service",
                "areaServed": "VN",
                "availableLanguage": "Vietnamese",
            },
            "sameAs": [
                "https://www.facebook.com/koka.tran",
                "https://www.youtube.com/@hocaukimthong.lamdong/shorts",
                "https://www.tiktok.com/@hocaukimthong49"
            ],
        },
        {
            "@type": "WebSite",
            "@id": "https://quanlihocau.com/#website",
            "url": "https://quanlihocau.com",
            "name": "Quản Lý Hồ Câu",
            "description": "Phần mềm quản lý hồ câu & App cho chủ hồ câu trên điện thoại: Hồ đông vẫn nhàn, tiền hàng vẫn rõ.",
            "publisher": { "@id": "https://quanlihocau.com/#organization" },
            "inLanguage": "vi-VN",
        },
        {
            "@type": "BreadcrumbList",
            "@id": "https://quanlihocau.com/#breadcrumb",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Trang chủ Quản Lý Hồ Câu",
                    "item": "https://quanlihocau.com"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Trải Nghiệm Hồ Câu Mẫu (Demo)",
                    "item": "https://quanlihocau.com/demo"
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": "Bảng Giá Dịch Vụ",
                    "item": "https://quanlihocau.com/bang-gia"
                },
                {
                    "@type": "ListItem",
                    "position": 4,
                    "name": "Thiết Bị & Máy In 58mm",
                    "item": "https://quanlihocau.com/thiet-bi-may-in"
                },
                {
                    "@type": "ListItem",
                    "position": 5,
                    "name": "Nhà Sáng Lập Huân Trần",
                    "item": "https://quanlihocau.com/huan-tran"
                }
            ]
        },
        {
            "@type": "HowTo",
            "@id": "https://quanlihocau.com/#howto",
            "name": "Cách vận hành hồ câu dịch vụ không thất thoát chỉ với 1 chiếc điện thoại",
            "description": "Quy trình 3 bước chuẩn hóa vận hành hồ câu bằng phần mềm Quản Lý Hồ Câu (quanlihocau.com) giúp chủ hồ quản lý từ xa nhàn tênh.",
            "totalTime": "PT1M",
            "step": [
                {
                    "@type": "HowToStep",
                    "position": 1,
                    "name": "Chạm mở vé câu trong 3 giây",
                    "text": "Chọn ô số câu trống trên sơ đồ bờ hồ, chọn gói câu (ví dụ Ca 4 tiếng) và bấm mở vé. Đồng hồ đếm ngược bắt đầu chạy tự động theo thời gian thực.",
                    "url": "https://quanlihocau.com/demo"
                },
                {
                    "@type": "HowToStep",
                    "position": 2,
                    "name": "Ghi nước, mồi câu & cân cá thu mua tự động",
                    "text": "Khi khách gọi nước ngọt, mồi câu hoặc bán lại cá câu được, nhân viên bấm cộng món hoặc nhập số kg cá thu mua. Phần mềm tự động cộng dồn và cấn trừ tiền cá vào hóa đơn gốc.",
                    "url": "https://quanlihocau.com/demo"
                },
                {
                    "@type": "HowToStep",
                    "position": 3,
                    "name": "Cảnh báo hết giờ, in bill 58mm & chốt ca từ xa",
                    "text": "Khi hết giờ, ô câu đổi màu cảnh báo. Nhân viên bấm thanh toán tiền mặt hoặc QR chuyển khoản, in hóa đơn 58mm rõ ràng. Chủ hồ theo dõi toàn bộ doanh thu và nhật ký chống thất thoát từ xa trên điện thoại.",
                    "url": "https://quanlihocau.com/bang-gia"
                }
            ]
        },
        {
            "@type": "FAQPage",
            "@id": "https://quanlihocau.com/#faq",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Phần mềm quản lý hồ câu nào tốt nhất trên điện thoại?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Quản Lý Hồ Câu (quanlihocau.com) là phần mềm chuyên biệt số 1 tại Việt Nam chạy trên mọi điện thoại (PWA), được xây dựng bởi chính chủ hồ câu thực chiến. Phần mềm giúp đếm giờ phiên câu, cảnh báo hết giờ, bán mồi nước, cân cá thu mua cấn trừ tự động, in bill 58mm và chống thất thoát tiền mặt từ xa."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Chủ hồ câu làm thế nào để quản lý từ xa và chống nhân viên ỉm tiền?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Hệ thống Quản Lý Hồ Câu lưu lại mọi phiên câu và lịch sử hóa đơn theo thời gian thực. Nhân viên không thể tự ý xóa vé câu đã mở. Các thao tác nhạy cảm như sửa giá, lập phiếu chi, xuất kho hoặc hủy đơn đều yêu cầu ghi chú lý do và phải được Chủ hồ phê duyệt. Nhật ký kiểm toán (Audit Log) chỉ Chủ hồ mới có quyền xem."
                    }
                },
                {
                    "@type": "Question",
                    "name": "App quản lý hồ câu có cần cài đặt qua App Store hay CH Play không?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Không cần cài đặt phức tạp. Ứng dụng sử dụng công nghệ PWA hiện đại, chạy trực tiếp trên trình duyệt điện thoại iPhone, Android, máy tính bảng và máy tính. Chỉ cần mở quanlihocau.com là dùng ngay và có thể lưu biểu tượng ra màn hình chính như ứng dụng gốc."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Chi phí sử dụng phần mềm Quản Lý Hồ Câu là bao nhiêu?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Chủ hồ được dùng thử miễn phí trọn vẹn 30 ngày (0đ, không cần thẻ ngân hàng). Sau đó có Gói Bạc 129.000đ/tháng (chỉ 4.300đ/ngày, tối đa 30 ô câu, chủ hồ và 2 nhân viên) và Gói Vàng 199.000đ/tháng (không giới hạn ô câu và nhân sự). Đăng ký theo năm được tặng ngay 2 tháng."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Phần mềm tính tiền phụ thu quá giờ và cân cá thu mua như thế nào?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Khi cần thủ ngồi quá thời gian gói câu, đồng hồ tự động chuyển sang trạng thái cảnh báo lố giờ. Nhân viên có thể chọn gia hạn thêm tiếng hoặc kết thúc tính phụ thu theo đơn giá của hồ. Khi khách bán lại cá, chỉ cần nhập số kg và loại cá, phần mềm tự động nhân đơn giá và cấn trừ trực tiếp vào tổng tiền vé câu."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Mất mạng hoặc điện thoại tắt màn hình thì đồng hồ đếm giờ câu có bị lệch không?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Tuyệt đối không lệch. Thời gian bắt đầu và kết thúc phiên câu được đồng bộ với máy chủ đám mây. Dù điện thoại tắt màn hình, hết pin hay mất kết nối mạng tạm thời, đồng hồ phiên câu vẫn chính xác tuyệt đối đến từng giây khi mở lại."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Phần mềm hỗ trợ loại máy in hóa đơn nào cho hồ câu?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Phần mềm tương thích với hầu hết các dòng máy in nhiệt khổ giấy K57/58mm phổ biến (kết nối Bluetooth, USB hoặc Wi-Fi/LAN). Vé in ra gọn gàng, rõ nét gồm giờ vào, giờ ra, tiền vé, tiền nước mồi, tiền trừ cá thu mua và mã QR chuyển khoản ngân hàng của chủ hồ."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Làm sao để bấm thử phần mềm trước khi đăng ký tài khoản?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Chủ hồ có thể truy cập trực tiếp trang mô phỏng công khai tại https://quanlihocau.com/demo để bấm thử mở vé, xem đồng hồ đếm ngược, thêm nước mồi và thanh toán ngay trên trình duyệt mà không cần tạo tài khoản."
                    }
                }
            ]
        },
    ],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi" className="h-full antialiased font-serif">
            <head>
                <meta charSet="utf-8" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="QuanLiHoCau" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta
                    name="google-site-verification"
                    content="nnj6c3yCZTS9Iiue3oQdVPBaxiUXLNFA9o8nv-giD4s"
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema).replace(/</g, "\\u003c") }}
                />
            </head>
            <body className="min-h-full flex flex-col bg-[#FAFAF7] text-[#1A1A1A] selection:bg-[#EAEFEA] selection:text-[#2C4C3B]">
                <Providers>
                    <Suspense fallback={null}>
                        <PageProgressBar />
                    </Suspense>
                    {children}
                    <Suspense fallback={null}>
                        <QuickActions />
                    </Suspense>
                    <PwaInstallPrompt />
                </Providers>
            </body>
        </html>
    );
}

