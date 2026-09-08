import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense } from "react";

import { PageProgressBar } from "@/components/ui/page-progress-bar";
import { Providers } from "./providers";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
    subsets: ["vietnamese", "latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-be-vietnam-pro",
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL("https://quanlihocau.com"),
    title: {
        default: "Quản Lí Hồ Câu | Phần mềm quản lý hồ câu",
        template: "%s | Quản Lí Hồ Câu",
    },
    description:
        "Phần mềm vận hành dành riêng cho hồ câu: quản lý phiên câu, ô câu, hóa đơn, kho, chi phí và báo cáo ca vào một luồng làm việc rõ ràng cho nhân viên tại quầy.",
    keywords: [
        "quản lý hồ câu",
        "phần mềm hồ câu",
        "quản lý hồ câu dịch vụ",
        "tính tiền hồ câu",
        "đồng hồ phiên câu",
        "báo cáo ca hồ câu",
    ],
    authors: [{ name: "Quản Lí Hồ Câu" }],
    creator: "Quản Lí Hồ Câu",
    publisher: "Quản Lí Hồ Câu",
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        type: "website",
        locale: "vi_VN",
        url: "https://quanlihocau.com",
        siteName: "Quản Lí Hồ Câu",
        title: "Quản Lí Hồ Câu | Phần mềm quản lý hồ câu",
        description:
            "Hồ câu vận hành gọn. Khách vui, chủ yên tâm. Gom phiên câu, ô câu, hóa đơn, kho, chi phí và chốt ca vào một luồng trực quan.",
    },
    twitter: {
        card: "summary_large_image",
        title: "Quản Lí Hồ Câu | Phần mềm quản lý hồ câu",
        description:
            "Phần mềm vận hành hồ câu: quản lý ô câu, phiên câu, hóa đơn và chốt ca nhanh chóng, chính xác.",
    },
    alternates: {
        canonical: "https://quanlihocau.com",
    },
};

export const viewport: Viewport = {
    themeColor: "#4F9D5A",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

const jsonLdSchema = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "SoftwareApplication",
            "@id": "https://quanlihocau.com/#software",
            "name": "Quản Lí Hồ Câu",
            "operatingSystem": "All",
            "applicationCategory": "BusinessApplication",
            "description": "Phần mềm quản lý hồ câu dịch vụ chuyên nghiệp: tính tiền phiên câu theo giờ, tự động tính phụ thu quá giờ, bán lẻ đồ câu, kiểm soát thất thoát và báo cáo doanh thu.",
            "url": "https://quanlihocau.com",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "VND",
                "availability": "https://schema.org/InStock",
            },
        },
        {
            "@type": "Organization",
            "@id": "https://quanlihocau.com/#organization",
            "name": "Quản Lí Hồ Câu",
            "url": "https://quanlihocau.com",
            "logo": "https://quanlihocau.com/favicon.ico",
        },
    ],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi" className={`h-full antialiased ${beVietnamPro.variable}`}>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
                />
            </head>
            <body className="min-h-full flex flex-col bg-[#061F13] text-[#17201A] selection:bg-[#E8F3E5] selection:text-[#246B38]">
                <Providers>
                    <Suspense fallback={null}>
                        <PageProgressBar />
                    </Suspense>
                    {children}
                </Providers>
            </body>
        </html>
    );
}

