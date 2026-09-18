import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Điều khoản dịch vụ | Quản Lí Hồ Câu",
    description: "Điều khoản sử dụng dịch vụ phần mềm quản lý hồ câu quanlihocau.com. Minh bạch chu kỳ thuê bao, thanh toán VietQR và quyền lợi bảo vệ dữ liệu hồ câu.",
    alternates: {
        canonical: "https://quanlihocau.com/dieu-khoan",
    },
    openGraph: {
        title: "Điều khoản dịch vụ — Quản Lí Hồ Câu",
        description: "Quy định sử dụng dịch vụ phần mềm quản lý hồ câu quanlihocau.com.",
        url: "https://quanlihocau.com/dieu-khoan",
        siteName: "Quản Lí Hồ Câu",
        images: [
            {
                url: "/icons/icon-512x512.png",
                width: 512,
                height: 512,
                alt: "Điều khoản dịch vụ Quản Lí Hồ Câu",
            },
        ],
        locale: "vi_VN",
        type: "website",
    },
};

export default function TermsOfServicePage() {
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
                                Điều khoản dịch vụ
                            </span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/bang-gia"
                            className="text-xs font-semibold text-[#5A524A] hover:text-[#102A43] transition-colors"
                        >
                            Bảng giá
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

            {/* Content Container */}
            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#8A5A20]/30 bg-[#F8EFE1] px-3 py-1 text-xs font-bold text-[#8A5A20]">
                        <span>Cập nhật ngày 18/09/2026</span>
                    </div>
                    <h1 className="text-2xl font-black text-[#102A43] sm:text-3xl lg:text-4xl tracking-tight">
                        Điều Khoản Sử Dụng Dịch Vụ
                    </h1>
                    <p className="text-sm text-[#5A524A] leading-relaxed">
                        Chào mừng bạn đến với <strong>quanlihocau.com</strong>, nền tảng phần mềm quản lý vận hành hồ câu dịch vụ chuyên nghiệp tại Việt Nam.
                        Bằng việc đăng ký tài khoản hoặc sử dụng dịch vụ của chúng tôi, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản dưới đây.
                    </p>
                </div>

                <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#3B342C]">
                    {/* Mục 1 */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">1</span>
                            Định Nghĩa & Phạm Vi Dịch Vụ
                        </h2>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#5A524A]">
                            <li><strong>Phần mềm quanlihocau.com:</strong> Giải pháp web-app/PWA quản lý vé câu, theo dõi đồng hồ giờ, tính phụ thu quá giờ, bán hàng hóa/dịch vụ, thu mua cá và chốt ca thu ngân.</li>
                            <li><strong>Chủ hồ (Owner):</strong> Người đăng ký tài khoản đại diện cho hồ câu, có toàn quyền quản lý dữ liệu, cài đặt gói cước và phân quyền nhân viên.</li>
                            <li><strong>Nhân viên (Staff / Cashier):</strong> Tài khoản do Chủ hồ tạo và cấp quyền để thao tác mở vé, bán hàng, in bill tại quầy.</li>
                        </ul>
                    </section>

                    {/* Mục 2 */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">2</span>
                            Chính Sách Dùng Thử & Thuê Bao
                        </h2>
                        <div className="space-y-2 text-xs sm:text-sm text-[#5A524A]">
                            <p><strong>2.1 Dùng thử miễn phí 7 ngày:</strong> Mọi hồ câu mới đăng ký đều được kích hoạt ngay 7 ngày trải nghiệm trọn vẹn toàn bộ tính năng cao cấp của hệ thống mà không cần cung cấp thẻ tín dụng hay chuyển khoản trước.</p>
                            <p><strong>2.2 Chu kỳ thuê bao:</strong> Dịch vụ được cung cấp theo chu kỳ 30 ngày (Gói Bạc 99.000đ/30 ngày và Gói Vàng 179.000đ/30 ngày). Thời hạn bắt đầu tính từ ngày thanh toán hoặc cộng nối tiếp nếu hồ đang còn hạn sử dụng.</p>
                            <p><strong>2.3 Thanh toán chủ động qua VietQR:</strong> Toàn bộ giao dịch gia hạn thực hiện bằng quét mã VietQR ngân hàng Techcombank. Hệ thống <strong>tuyệt đối không tự động trừ tiền</strong> từ tài khoản ngân hàng của bạn khi hết chu kỳ.</p>
                        </div>
                    </section>

                    {/* Mục 3 */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">3</span>
                            Chính Sách Bảo Lưu Dữ Liệu Khi Hết Hạn
                        </h2>
                        <div className="space-y-2 text-xs sm:text-sm text-[#5A524A]">
                            <p><strong>3.1 Không mất dữ liệu phiên đang chạy:</strong> Khi gói cước hết hạn, các phiên câu đang câu dở vẫn được bảo đảm để nhân viên hoàn tất tính tiền cho cần thủ mà không bị ngắt quãng.</p>
                            <p><strong>3.2 Thời gian bảo lưu 30 ngày:</strong> Khi hết hạn thuê bao, hệ thống lưu giữ toàn bộ dữ liệu lịch sử vé, báo cáo doanh thu, danh mục hàng hóa và cấu hình hồ trong ít nhất 30 ngày. Chủ hồ có thể gia hạn bất kỳ lúc nào để tiếp tục sử dụng mà không lo mất lịch sử kinh doanh.</p>
                            <p><strong>3.3 Quyền sở hữu dữ liệu:</strong> Toàn bộ thông tin khách hàng, vé câu, hóa đơn và cấu hình hồ thuộc quyền sở hữu riêng của Chủ hồ. Chúng tôi cam kết không chia sẻ dữ liệu kinh doanh của bạn cho bất kỳ bên thứ ba nào.</p>
                        </div>
                    </section>

                    {/* Mục 4 */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">4</span>
                            Trách Nhiệm Của Người Sử Dụng
                        </h2>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#5A524A]">
                            <li>Khai báo thông tin chính xác (Tên hồ, họ tên, số điện thoại, email) để nhận mã xác thực OTP và hỗ trợ tài khoản.</li>
                            <li>Tự chịu trách nhiệm bảo mật mật khẩu và quyền truy cập của nhân viên thu ngân tại quầy.</li>
                            <li>Không sử dụng phần mềm vào mục đích vi phạm pháp luật, gian lận thương mại hoặc xâm phạm dữ liệu hồ khác.</li>
                        </ul>
                    </section>

                    {/* Mục 5 */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">5</span>
                            Hỗ Trợ Kỹ Thuật & Giải Quyết Khiếu Nại
                        </h2>
                        <p className="text-xs sm:text-sm text-[#5A524A]">
                            Đội ngũ kỹ thuật hỗ trợ trực tuyến qua hotline/Zalo chính thức. Mọi yêu cầu hỗ trợ về in bill, cấu hình thiết bị, kiểm tra đối soát giao dịch thuê bao đều được xử lý trong giờ hành chính từ 08:00 đến 21:00 hàng ngày (kể cả Thứ Bảy và Chủ Nhật).
                        </p>
                    </section>
                </div>

                {/* Footer Link */}
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#D9D2C8] pt-6 text-xs text-[#766F67]">
                    <div className="flex items-center gap-4">
                        <Link href="/chinh-sach-bao-mat" className="font-semibold text-[#8A5A20] hover:underline">
                            Chính sách bảo mật dữ liệu
                        </Link>
                        <span>•</span>
                        <Link href="/bang-gia" className="font-semibold text-[#8A5A20] hover:underline">
                            Bảng giá dịch vụ
                        </Link>
                    </div>
                    <p>© 2026 quanlihocau.com. Bảo lưu mọi quyền.</p>
                </div>
            </main>
        </div>
    );
}
