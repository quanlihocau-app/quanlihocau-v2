import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OfficialLandingPage } from "@/components/landing/official-landing-page";

export const metadata = {
    title: "Quản Lý Hồ Câu — Hồ đông vẫn nhàn, tiền hàng vẫn rõ",
    description:
        "Phần mềm quản lý hồ câu trên điện thoại: quản lý nhân viên từ xa, vé câu, hàng hóa, thanh toán, báo cáo và hạn chế thất thoát. Tư vấn miễn phí: 0855 550 813.",
    openGraph: {
        title: "Quản Lý Hồ Câu — Hồ đông vẫn nhàn, tiền hàng vẫn rõ",
        description:
            "Phần mềm quản lý hồ câu trên điện thoại: quản lý nhân viên từ xa, vé câu, hàng hóa, thanh toán, báo cáo và hạn chế thất thoát. Tư vấn miễn phí: 0855 550 813.",
        url: "https://quanlihocau.com",
        siteName: "Quản Lý Hồ Câu",
        locale: "vi_VN",
        type: "website",
    },
    alternates: {
        canonical: "https://quanlihocau.com",
    },
};

export default async function HomePage() {
    const session = await getServerSession(authOptions);

    return <OfficialLandingPage isLoggedIn={Boolean(session?.user)} />;
}
