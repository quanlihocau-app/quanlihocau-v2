import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense } from "react";

import { PageProgressBar } from "@/components/ui/page-progress-bar";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
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
        default: "Quản Lý Hồ Câu — Hồ đông vẫn nhàn, tiền hàng vẫn rõ",
        template: "%s | Quản Lý Hồ Câu",
    },
    description:
        "Phần mềm quản lý hồ câu trên điện thoại: quản lý nhân viên từ xa, vé câu, hàng hóa, thanh toán, báo cáo và hạn chế thất thoát. Tư vấn miễn phí: 0855 550 813.",
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
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Hồ Câu POS",
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
        { media: "(prefers-color-scheme: dark)", color: "#082618" },
        { media: "(prefers-color-scheme: light)", color: "#082618" },
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
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
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Hồ Câu POS" />
                <meta name="mobile-web-app-capable" content="yes" />
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
                    <PwaInstallPrompt />
                </Providers>
            </body>
        </html>
    );
}

