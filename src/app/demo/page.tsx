import type { Metadata } from "next";
import PreviewPage from "@/app/preview/page";

export const metadata: Metadata = {
    title: "Trải Nghiệm Quầy Mẫu — Quản Lý Hồ Câu (Demo Không Cần Đăng Ký)",
    description:
        "Trải nghiệm giao diện quầy hồ câu mẫu trực tiếp trong trình duyệt: mở lượt câu, đếm giờ, thêm hàng, đối chiếu tiền không cần đăng nhập.",
};

export default function DemoPage() {
    return <PreviewPage />;
}

