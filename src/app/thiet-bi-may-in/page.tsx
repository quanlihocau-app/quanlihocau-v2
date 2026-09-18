import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Máy in & Thiết bị đã kiểm chứng | Quản Lí Hồ Câu",
    description: "Danh sách máy in nhiệt K80/K58, cổng kết nối LAN/Wi-Fi/Bluetooth và hướng dẫn kết nối in bill tại quầy hồ câu dịch vụ quanlihocau.com.",
    alternates: {
        canonical: "https://quanlihocau.com/thiet-bi-may-in",
    },
    openGraph: {
        title: "Máy in & Thiết bị đã kiểm chứng — Quản Lí Hồ Câu",
        description: "Tương thích máy in bill K80, K58 qua LAN, Wi-Fi và Bluetooth trên Android, iOS và Máy tính cho hồ câu.",
        url: "https://quanlihocau.com/thiet-bi-may-in",
        siteName: "Quản Lí Hồ Câu",
        images: [
            {
                url: "/icons/icon-512x512.png",
                width: 512,
                height: 512,
                alt: "Thiết bị máy in kiểm chứng Quản Lí Hồ Câu",
            },
        ],
        locale: "vi_VN",
        type: "website",
    },
};

export default function PrinterDevicesPage() {
    return (
        <div className="min-h-screen bg-[#FBF9F5] text-[#27231F]">
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-[#D9D2C8] bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A5A20] text-white font-bold text-base shadow-sm">
                            🖨️
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-wide text-[#102A43] uppercase">
                                QUẢN LÍ HỒ CÂU
                            </span>
                            <span className="text-[10px] font-semibold text-[#8A5A20]">
                                Thiết bị in ấn & Phần cứng
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

            {/* Main Content */}
            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#8A5A20]/30 bg-[#F8EFE1] px-3 py-1 text-xs font-bold text-[#8A5A20]">
                        <span>Tương thích phần cứng quầy thu ngân</span>
                    </div>
                    <h1 className="text-2xl font-black text-[#102A43] sm:text-3xl lg:text-4xl tracking-tight">
                        Máy In & Thiết Bị Đã Kiểm Chứng
                    </h1>
                    <p className="text-sm text-[#5A524A] leading-relaxed">
                        Phần mềm <strong>quanlihocau.com</strong> được thiết kế để hoạt động mượt mà với hầu hết các dòng máy in nhiệt thông dụng tại Việt Nam,
                        hỗ trợ cả điện thoại di động (Android, iPhone), máy tính bảng và máy tính để bàn mà không bắt buộc phải mua thiết bị độc quyền đắt tiền.
                    </p>
                </div>

                <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#3B342C]">
                    {/* Bảng tương thích máy in */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-4">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">1</span>
                            Các Dòng Máy In Nhiệt Đã Kiểm Chứng Thực Tế
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border border-[#D9D2C8] rounded-xl overflow-hidden">
                                <thead className="bg-[#F4F2EE] text-[#5A524A] uppercase font-bold text-[11px]">
                                    <tr>
                                        <th className="p-3 border-b border-[#D9D2C8]">Dòng máy in</th>
                                        <th className="p-3 border-b border-[#D9D2C8]">Khổ giấy</th>
                                        <th className="p-3 border-b border-[#D9D2C8]">Cổng kết nối</th>
                                        <th className="p-3 border-b border-[#D9D2C8]">Khuyên dùng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D9D2C8]">
                                    <tr className="hover:bg-[#FDF9F0]/60">
                                        <td className="p-3 font-bold text-[#102A43]">Xprinter XP-Q80I / XP-C300H</td>
                                        <td className="p-3">K80 (80mm)</td>
                                        <td className="p-3">LAN / Wi-Fi / USB</td>
                                        <td className="p-3 text-emerald-700 font-bold">Rất khuyên dùng (Quầy thu ngân)</td>
                                    </tr>
                                    <tr className="hover:bg-[#FDF9F0]/60">
                                        <td className="p-3 font-bold text-[#102A43]">Xprinter XP-N160II / XP-Q200</td>
                                        <td className="p-3">K80 (80mm)</td>
                                        <td className="p-3">LAN / USB</td>
                                        <td className="p-3 text-emerald-700 font-bold">Khuyên dùng (Giá rẻ, bền)</td>
                                    </tr>
                                    <tr className="hover:bg-[#FDF9F0]/60">
                                        <td className="p-3 font-bold text-[#102A43]">HPRT TP808 / TP809</td>
                                        <td className="p-3">K80 (80mm)</td>
                                        <td className="p-3">LAN / Wi-Fi / Bluetooth</td>
                                        <td className="p-3 text-emerald-700 font-bold">In siêu tốc, cắt giấy tự động</td>
                                    </tr>
                                    <tr className="hover:bg-[#FDF9F0]/60">
                                        <td className="p-3 font-bold text-[#102A43]">Zywell ZY-306 / ZY-908</td>
                                        <td className="p-3">K80 (80mm)</td>
                                        <td className="p-3">LAN / Wi-Fi</td>
                                        <td className="p-3 text-blue-700 font-bold">Tương thích tốt</td>
                                    </tr>
                                    <tr className="hover:bg-[#FDF9F0]/60">
                                        <td className="p-3 font-bold text-[#102A43]">Máy in mini Bluetooth K58 (XP-58IIH)</td>
                                        <td className="p-3">K58 (58mm)</td>
                                        <td className="p-3">Bluetooth / USB</td>
                                        <td className="p-3 text-amber-700 font-bold">Phù hợp hồ nhỏ / nhân viên đi quanh hồ</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Hướng dẫn kết nối 3 bước */}
                    <section className="rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xs space-y-4">
                        <h2 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECE4] text-xs font-bold text-[#8A5A20]">2</span>
                            Quy Trình Kết Nối Máy In Mạng LAN / Wi-Fi Tại Hồ
                        </h2>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                            <div className="rounded-xl border border-[#D9D2C8] bg-[#FBF9F5] p-4 space-y-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A5A20] text-white font-bold text-xs">
                                    B1
                                </span>
                                <h3 className="font-bold text-[#102A43]">Cắm dây mạng LAN</h3>
                                <p className="text-[#5A524A]">
                                    Cắm dây mạng từ máy in vào modem Wi-Fi chung mà điện thoại của bạn đang bắt sóng.
                                </p>
                            </div>
                            <div className="rounded-xl border border-[#D9D2C8] bg-[#FBF9F5] p-4 space-y-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A5A20] text-white font-bold text-xs">
                                    B2
                                </span>
                                <h3 className="font-bold text-[#102A43]">Xem địa chỉ IP máy in</h3>
                                <p className="text-[#5A524A]">
                                    Tắt máy in, giữ nút FEED và bật nguồn lại để máy tự in ra phiếu hiển thị IP (VD: 192.168.1.200).
                                </p>
                            </div>
                            <div className="rounded-xl border border-[#D9D2C8] bg-[#FBF9F5] p-4 space-y-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A5A20] text-white font-bold text-xs">
                                    B3
                                </span>
                                <h3 className="font-bold text-[#102A43]">Nhập IP vào phần mềm</h3>
                                <p className="text-[#5A524A]">
                                    Vào <strong>Cài đặt -&gt; Máy in</strong>, điền địa chỉ IP và bấm <strong>In thử phiếu kiểm tra</strong>.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Các cam kết an toàn khi in */}
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-xs space-y-3">
                        <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                            <span>🛡️</span>
                            Cam Kết An Toàn Nghiệp Vụ Khi In Hóa Đơn
                        </h2>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-emerald-900">
                            <li><strong>In lại hóa đơn không tạo giao dịch mới:</strong> Khi máy in hết giấy hoặc kẹt giấy cần in lại bill, hệ thống đảm bảo <strong>tuyệt đối không phát sinh giao dịch tài chính hoặc thanh toán lần hai</strong>.</li>
                            <li><strong>In mã VietQR động trực tiếp:</strong> Hóa đơn có thể in kèm mã VietQR Techcombank chứa chính xác số tiền cần thanh toán để khách quét bằng app ngân hàng trong 3 giây.</li>
                            <li><strong>Tiếng Việt có dấu chuẩn:</strong> Phần mềm tối ưu bộ mã byte ESC/POS chuẩn, in rõ ràng tiếng Việt không bị lỗi font hay vỡ khung bảng biểu.</li>
                        </ul>
                    </section>
                </div>

                {/* Footer Link */}
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#D9D2C8] pt-6 text-xs text-[#766F67]">
                    <div className="flex items-center gap-4">
                        <Link href="/bang-gia" className="font-semibold text-[#8A5A20] hover:underline">
                            Bảng giá dịch vụ
                        </Link>
                        <span>•</span>
                        <Link href="/dieu-khoan" className="font-semibold text-[#8A5A20] hover:underline">
                            Điều khoản dịch vụ
                        </Link>
                    </div>
                    <p>© 2026 quanlihocau.com. Hỗ trợ thiết bị máy in quầy.</p>
                </div>
            </main>
        </div>
    );
}
