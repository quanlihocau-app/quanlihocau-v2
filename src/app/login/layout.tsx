import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Đăng nhập quầy thu ngân",
    description:
        "Đăng nhập vào hệ thống Quản Lí Hồ Câu để quản lý phiên câu, chòi câu, hóa đơn bán lẻ và chốt ca tiền mặt nhanh chóng.",
    alternates: {
        canonical: "https://quanlihocau.com/login",
    },
    openGraph: {
        title: "Đăng nhập quầy thu ngân | Quản Lí Hồ Câu",
        description: "Truy cập quầy thu ngân và quản lý vận hành hồ câu dịch vụ.",
        url: "https://quanlihocau.com/login",
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
