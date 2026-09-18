import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Chính sách bảo mật dữ liệu | Quản Lí Hồ Câu",
    description: "Chính sách bảo mật thông tin và dữ liệu kinh doanh hồ câu tại quanlihocau.com. Cam kết cách ly dữ liệu từng hồ, mã hóa mật khẩu và không chia sẻ cho bên thứ ba.",
    alternates: {
        canonical: "https://quanlihocau.com/chinh-sach-bao-mat",
    },
    openGraph: {
        title: "Chính sách bảo mật dữ liệu — Quản Lí Hồ Câu",
        description: "Cam kết bảo vệ dữ liệu kinh doanh, vé câu và thông tin cá nhân của chủ hồ tại quanlihocau.com.",
        url: "https://quanlihocau.com/chinh-sach-bao-mat",
        siteName: "Quản Lí Hồ Câu",
        images: [
            {
                url: "/icons/icon-512x512.png",
                width: 512,
                height: 512,
                alt: "Chính sách bảo mật Quản Lí Hồ Câu",
            },
        ],
        locale: "vi_VN",
        type: "website",
    },
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#FBF9F5] text-[#27231F]">
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-[#D9D2C8] bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A5A20] text-white font-bold text-base shadow-sm">
                            🎣
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-wide text-[#102A43] uppercase">
                                QUẢN LÍ HỒ CÂU
                            </span>
                            <span className="text-[10px] font-semibold text-[#8A5A20]">
                                Chính sách bảo mật
                            </span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dieu-khoan"
                            className="text-xs font-semibold text-[#5A524A] hover:text-[#102A43] transition-colors"
                        >
                            Điều khoản
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-xl bg-[#8A5A20] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#724918] transition-colors"
                        >
                            Dùng thử 7 ngày
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                        <span>Bảo vệ quyền riêng tư hồ câu</span>
                    </div>
                    <h1 className="text-2xl font-black text-[#102A43] sm:text-3xl lg:text-4xl tracking-tight">
                        Chính Sách Bảo Mật Thông Tin & Dữ Liệu
                    </h1>
                    <p className="text-sm text-[#5A524A] leading-relaxed">
                        Tại <strong>quanlihocau.com</strong>, chúng tôi hiểu rằng số liệu doanh thu, vé câu, khách quen và lịch sử mua bán là tài sản kinh doanh cốt lõi của mỗi chủ hồ.
                        Chính sách này khẳng định cam kết cao nhất của chúng tôi trong việc bảo vệ dữ liệu của bạn.
                    </p>
                </div>

                <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#3B342C]">
                    {/* 1. Thu thập thông tin */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">1</span>
                            Thông Tin Chúng Tôi Thu Thập
                        </h2>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#5A524A]">
                            <li><strong>Thông tin tài khoản chủ hồ:</strong> Họ tên, số điện thoại di động, địa chỉ email, mật khẩu (đã mã hóa) và tên hồ câu. Dùng để đăng nhập và gửi mã OTP xác thực.</li>
                            <li><strong>Dữ liệu vận hành hồ:</strong> Danh mục gói câu, khu vực, ô/chòi, hàng hóa dịch vụ, bảng giá thu mua cá và các phiên câu thực tế.</li>
                            <li><strong>Thông tin thiết bị in ấn:</strong> Cấu hình địa chỉ IP máy in nhiệt LAN/Wi-Fi hoặc tên thiết bị Bluetooth được lưu trữ cục bộ trên trình duyệt để phục vụ việc in vé.</li>
                        </ul>
                    </section>

                    {/* 2. Cam kết bảo mật nhiều tầng */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">2</span>
                            Cam Kết Cô Lập Dữ Liệu & Bảo Mật Kỹ Thuật
                        </h2>
                        <div className="space-y-2 text-xs sm:text-sm text-[#5A524A]">
                            <p><strong>2.1 Cách ly đa khách hàng (Multi-tenant):</strong> Dữ liệu của từng hồ được bảo vệ chặt chẽ bởi mã định danh riêng biệt (`lakeId`). Tài khoản của một hồ tuyệt đối không thể đọc, sửa hoặc nhìn thấy dữ liệu của hồ khác trong mọi trường hợp.</p>
                            <p><strong>2.2 Mã hóa mật khẩu an toàn:</strong> Mật khẩu người dùng được băm một chiều bằng chuẩn mã hóa an toàn cao trước khi lưu vào cơ sở dữ liệu. Ngay cả quản trị viên hệ thống cũng không thể giải mã để xem mật khẩu gốc.</p>
                            <p><strong>2.3 Không ghi dữ liệu nhạy cảm vào nhật ký:</strong> Chúng tôi áp dụng quy tắc nghiêm ngặt: Tuyệt đối không ghi mật khẩu, mã OTP, số dư hay chi tiết giao dịch khách hàng vào log hệ thống hoặc các dịch vụ phân tích bên ngoài.</p>
                        </div>
                    </section>

                    {/* 3. Không chia sẻ cho bên thứ ba */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">3</span>
                            Không Mua Bán Hoặc Chia Sẻ Dữ Liệu
                        </h2>
                        <p className="text-xs sm:text-sm text-[#5A524A]">
                            Chúng tôi cam kết <strong>không bao giờ bán, cho thuê, thương mại hóa hoặc chia sẻ</strong> danh sách khách hàng, số điện thoại cần thủ hay số liệu doanh thu của hồ bạn cho bất kỳ đối tác thương mại, nhà quảng cáo hay bên thứ ba nào khác.
                        </p>
                    </section>

                    {/* 4. Quyền của chủ hồ đối với dữ liệu */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">4</span>
                            Quyền Của Chủ Hồ Đối Với Dữ Liệu Của Mình
                        </h2>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#5A524A]">
                            <li><strong>Quyền xuất dữ liệu:</strong> Chủ hồ có quyền trích xuất dữ liệu báo cáo doanh thu, lịch sử vé và công nợ bất cứ lúc nào ra định dạng Excel / PDF.</li>
                            <li><strong>Quyền sửa đổi & thu hồi:</strong> Chủ hồ có quyền chỉnh sửa thông tin hồ, thay đổi mật khẩu, hoặc thu hồi quyền truy cập của nhân viên bất cứ lúc nào.</li>
                            <li><strong>Quyền yêu cầu xóa tài khoản:</strong> Nếu bạn ngưng kinh doanh, bạn có quyền gửi yêu cầu xóa vĩnh viễn toàn bộ dữ liệu hồ câu khỏi hệ thống máy chủ.</li>
                        </ul>
                    </section>
                </div>

                {/* Footer Link */}
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#D9D2C8] pt-6 text-xs text-[#766F67]">
                    <div className="flex items-center gap-4">
                        <Link href="/dieu-khoan" className="font-semibold text-[#8A5A20] hover:underline">
                            Điều khoản dịch vụ
                        </Link>
                        <span>•</span>
                        <Link href="/bang-gia" className="font-semibold text-[#8A5A20] hover:underline">
                            Bảng giá dịch vụ
                        </Link>
                    </div>
                    <p>© 2026 quanlihocau.com. Bảo vệ dữ liệu người dùng.</p>
                </div>
            </main>
        </div>
    );
}
