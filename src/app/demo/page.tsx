import type { Metadata } from "next";
import PreviewPage from "@/app/preview/page";

export const metadata: Metadata = {
    title: "Trải Nghiệm Hồ Câu Mẫu (Demo 0đ) — Bấm Giờ, Cân Cá & In Bill",
    description:
        "Bấm thử ngay phần mềm Quản Lý Hồ Câu trực tiếp trên trình duyệt không cần đăng nhập: mở vé câu trong 3 giây, đồng hồ đếm ngược, cảnh báo lố giờ, gọi mồi nước, cân cá thu mua cấn trừ tiền tự động.",
    keywords: [
        "dùng thử phần mềm quản lý hồ câu",
        "demo app hồ câu",
        "trải nghiệm phần mềm tính tiền hồ câu",
        "mô phỏng quầy POS hồ câu",
        "bấm giờ hồ câu trực tuyến",
    ],
    alternates: {
        canonical: "/demo",
    },
    openGraph: {
        title: "Trải Nghiệm Quầy Hồ Câu Mẫu Trực Tiếp — Không Cần Tạo Tài Khoản",
        description:
            "Chạm thử mở vé, xem đồng hồ đếm ngược, gọi nước mồi, cân cá thu mua và chốt ca ngay trên màn hình điện thoại.",
        url: "https://quanlihocau.com/demo",
        type: "website",
    },
};

export default function DemoPage() {
    return <PreviewPage />;
}

