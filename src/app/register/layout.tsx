import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Đăng ký mở hồ câu mới - Dùng thử miễn phí",
    description:
        "Tạo hồ câu mới chỉ trong 30 giây. Trải nghiệm giải pháp quản lý hồ câu hiện đại: tạo vé 1 chạm, chống thất thoát giờ câu, kiểm soát doanh thu minh bạch.",
    alternates: {
        canonical: "https://quanlihocau.com/register",
    },
    openGraph: {
        title: "Đăng ký mở hồ câu mới - Dùng thử miễn phí | Quản Lí Hồ Câu",
        description: "Bắt đầu quản lý hồ câu chuyên nghiệp, miễn phí tạo tài khoản và hồ câu ban đầu.",
        url: "https://quanlihocau.com/register",
    },
};

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
