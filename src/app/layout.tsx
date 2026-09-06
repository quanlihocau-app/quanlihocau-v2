import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense } from "react";

import { PageProgressBar } from "@/components/ui/page-progress-bar";
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
    themeColor: "#8A5A20",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi" className={`h-full antialiased ${beVietnamPro.variable}`}>
            <body className="min-h-full flex flex-col bg-[#F4F2EE] text-[#27231F] selection:bg-[#EFE4CF] selection:text-[#27231F]">
                <Suspense fallback={null}>
                    <PageProgressBar />
                </Suspense>
                {children}
            </body>
        </html>
    );
}

