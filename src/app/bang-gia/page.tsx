import type { Metadata } from "next";
import Link from "next/link";
import { BANK_CONFIG, PLAN_PRICING } from "@/lib/vietqr";

export const metadata: Metadata = {
    title: "Bảng Giá Thuê Bao Phần Mềm Quản Lý Hồ Câu — Minh Bạch, Không Ẩn Phí",
    description:
        "Bảng giá phần mềm quản lý hồ câu quanlihocau.com: Gói Bạc 99.000đ/30 ngày (tối đa 30 ô câu, 1 nhân viên), Gói Vàng 179.000đ/30 ngày (không giới hạn). Dùng thử miễn phí full tính năng.",
    keywords: [
        "bảng giá phần mềm hồ câu",
        "giá phần mềm quản lý hồ câu",
        "thuê bao phần mềm hồ câu",
        "chi phí quản lý hồ câu dịch vụ",
    ],
    alternates: {
        canonical: "https://quanlihocau.com/bang-gia",
    },
    openGraph: {
        title: "Bảng Giá Thuê Bao Phần Mềm Quản Lý Hồ Câu — Quản Lí Hồ Câu",
        description:
            "Chi phí chỉ từ 99.000đ/30 ngày. Đầy đủ tính năng mở vé, tính giờ tự động, bán lẻ quầy, thu mua cá và chốt ca đối soát.",
        url: "https://quanlihocau.com/bang-gia",
        type: "website",
        images: [
            {
                url: "https://quanlihocau.com/icons/icon-512x512.png",
                width: 512,
                height: 512,
                alt: "Bảng giá phần mềm quản lý hồ câu",
            },
        ],
    },
};

const pricingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Trang chủ",
                    "item": "https://quanlihocau.com",
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Bảng giá",
                    "item": "https://quanlihocau.com/bang-gia",
                },
            ],
        },
        {
            "@type": "Product",
            "name": "Phần mềm Quản Lí Hồ Câu",
            "description":
                "Phần mềm quản lý hồ câu dịch vụ toàn diện trên điện thoại và máy tính: mở vé, đếm giờ, phụ thu quá giờ, bán lẻ đồ câu, thu mua cá, quản lý kho và đối soát ca.",
            "brand": {
                "@type": "Brand",
                "name": "Quản Lí Hồ Câu",
            },
            "offers": [
                {
                    "@type": "Offer",
                    "name": "Gói Bạc (Silver)",
                    "price": String(PLAN_PRICING.SILVER.priceVnd),
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/bang-gia",
                    "description": "99.000đ / 30 ngày: tối đa 30 ô câu, 1 tài khoản nhân viên",
                },
                {
                    "@type": "Offer",
                    "name": "Gói Vàng (Gold)",
                    "price": String(PLAN_PRICING.GOLD.priceVnd),
                    "priceCurrency": "VND",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock",
                    "url": "https://quanlihocau.com/bang-gia",
                    "description": "179.000đ / 30 ngày: không giới hạn ô câu, không giới hạn nhân viên",
                },
            ],
        },
    ],
};

function formatVnd(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

export default function PublicPricingPage() {
    return (
        <div className="min-h-screen bg-[#061F13] text-[#E8F3E5]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
            />

            {/* Header Navigation */}
            <header className="sticky top-0 z-30 border-b border-[#246B38]/30 bg-[#061F13]/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg hover:opacity-90 transition-opacity">
                        <img
                            src="/icons/icon-192x192.png"
                            alt="Logo Quản Lí Hồ Câu"
                            className="h-8 w-8 rounded-lg border border-emerald-500/40"
                        />
                        <span>Quản Lí Hồ Câu</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-xs font-semibold text-emerald-300 hover:text-white transition-colors px-3 py-1.5"
                        >
                            Đăng nhập
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:from-emerald-400 hover:to-emerald-500 transition-all"
                        >
                            Dùng thử miễn phí
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Bảng Giá Thuê Bao 2026
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                        Bảng Giá Phần Mềm Quản Lý Hồ Câu
                    </h1>
                    <p className="text-sm sm:text-base text-emerald-200/80 leading-relaxed">
                        Đầu tư nhỏ, yên tâm vận hành trọn vẹn hồ câu. Chi phí cố định theo chu kỳ 30 ngày,
                        không tự động trừ tiền trong tài khoản, kích hoạt minh bạch bằng chuyển khoản VietQR.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Trial Card */}
                    <div className="rounded-2xl border border-emerald-800/40 bg-[#0B2E1D]/60 p-6 flex flex-col justify-between backdrop-blur-xs">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">Dùng Thử</h2>
                                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                                    Miễn Phí
                                </span>
                            </div>
                            <p className="text-xs text-emerald-200/70">
                                Dành cho chủ hồ mới muốn làm quen và chạy thử thực tế ca câu tại quầy.
                            </p>
                            <div className="pt-2">
                                <span className="text-3xl font-extrabold text-white">0 đ</span>
                                <span className="text-xs text-emerald-300/70 ml-1.5">/ dùng thử</span>
                            </div>

                            <ul className="space-y-2.5 pt-4 border-t border-emerald-800/40 text-xs text-emerald-100">
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Đầy đủ tính năng cao cấp (tương đương Gói Vàng)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Tạo sơ đồ chòi / ô câu không giới hạn</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Không yêu cầu thẻ tín dụng</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Dữ liệu hồ được bảo toàn khi hết hạn thử</span>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-8">
                            <Link
                                href="/register"
                                className="block w-full text-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all"
                            >
                                Đăng ký dùng thử ngay
                            </Link>
                        </div>
                    </div>

                    {/* Silver Card */}
                    <div className="rounded-2xl border border-emerald-500/40 bg-[#0B2E1D] p-6 flex flex-col justify-between shadow-lg shadow-emerald-950/50">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">{PLAN_PRICING.SILVER.name}</h2>
                                <span className="rounded-full bg-slate-200/20 px-2.5 py-0.5 text-xs font-semibold text-slate-200 border border-slate-300/30">
                                    Tiết Kiệm
                                </span>
                            </div>
                            <p className="text-xs text-emerald-200/70">
                                Phù hợp cho hồ câu mini, hồ đơn, hoặc hồ gia đình tự quản lý dưới 30 ô câu.
                            </p>
                            <div className="pt-2">
                                <span className="text-3xl font-extrabold text-white">
                                    {formatVnd(PLAN_PRICING.SILVER.priceVnd)}
                                </span>
                                <span className="text-xs text-emerald-300/70 ml-1.5">/ {PLAN_PRICING.SILVER.durationDays} ngày</span>
                            </div>

                            <ul className="space-y-2.5 pt-4 border-t border-emerald-800/40 text-xs text-emerald-100">
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span><strong>Tối đa 30 ô câu</strong> hoạt động đồng thời</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span><strong>1 tài khoản nhân viên</strong> (ngoài tài khoản Chủ hồ)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Mở vé câu, đồng hồ đếm giờ tự động</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Tự động tính phụ thu quá giờ theo ca</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Bán lẻ nước ngọt, đồ câu, mồi câu tại quầy</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Thu mua cá bù trừ trực tiếp vào hóa đơn</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Báo cáo doanh thu và đối soát chốt ca theo ngày</span>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-8">
                            <Link
                                href="/register"
                                className="block w-full text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
                            >
                                Chọn Gói Bạc
                            </Link>
                        </div>
                    </div>

                    {/* Gold Card */}
                    <div className="relative rounded-2xl border-2 border-amber-400/60 bg-linear-to-b from-[#143D27] to-[#0B2E1D] p-6 flex flex-col justify-between shadow-xl shadow-amber-950/20">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-amber-400 to-amber-500 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-950 shadow-xs">
                            Phổ Biến Nhất
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">{PLAN_PRICING.GOLD.name}</h2>
                                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                                    Toàn Diện
                                </span>
                            </div>
                            <p className="text-xs text-emerald-200/70">
                                Dành cho hồ câu chuyên nghiệp, hồ lớn nhiều khu vực, cần nhiều nhân viên trực quầy.
                            </p>
                            <div className="pt-2">
                                <span className="text-3xl font-extrabold text-white">
                                    {formatVnd(PLAN_PRICING.GOLD.priceVnd)}
                                </span>
                                <span className="text-xs text-emerald-300/70 ml-1.5">/ {PLAN_PRICING.GOLD.durationDays} ngày</span>
                            </div>

                            <ul className="space-y-2.5 pt-4 border-t border-emerald-800/40 text-xs text-emerald-100">
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold">✓</span>
                                    <span><strong>Không giới hạn số lượng ô câu / chòi</strong></span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold">✓</span>
                                    <span><strong>Không giới hạn nhân viên thu ngân</strong></span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold">✓</span>
                                    <span>Toàn bộ tính năng nghiệp vụ POS và Bán lẻ</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold">✓</span>
                                    <span>Hỗ trợ in vé, in hóa đơn qua máy in nhiệt Bluetooth / LAN</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold">✓</span>
                                    <span>Kiểm soát tồn kho sản phẩm, cảnh báo kho âm</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold">✓</span>
                                    <span>Báo cáo doanh thu đa kỳ, biểu đồ giờ cao điểm</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold">✓</span>
                                    <span>Ưu tiên hỗ trợ kỹ thuật trong giờ vận hành</span>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-8">
                            <Link
                                href="/register"
                                className="block w-full text-center rounded-xl bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-4 py-2.5 text-xs font-bold text-emerald-950 transition-all shadow-md"
                            >
                                Chọn Gói Vàng
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Transparency & Policy Section */}
                <div className="mt-16 rounded-2xl border border-emerald-800/40 bg-[#0B2E1D]/40 p-6 sm:p-8 space-y-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🛡️</span>
                        <span>Cam Kết Vận Hành & Minh Bạch Chi Phí</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div className="rounded-xl border border-emerald-800/30 bg-[#061F13]/50 p-4 space-y-2">
                            <p className="font-bold text-white">Không Tự Động Trừ Tiền</p>
                            <p className="text-emerald-200/70 leading-relaxed">
                                Chúng tôi không liên kết trừ tiền thẻ tự động. Khi gần hết hạn chu kỳ,
                                hệ thống hiển thị thông báo để chủ hồ tự quyết định gia hạn.
                            </p>
                        </div>

                        <div className="rounded-xl border border-emerald-800/30 bg-[#061F13]/50 p-4 space-y-2">
                            <p className="font-bold text-white">Bảo Toàn Dữ Liệu Hồ</p>
                            <p className="text-emerald-200/70 leading-relaxed">
                                Khi gói thuê bao hết hạn, dữ liệu lịch sử vé câu, khách hàng và báo cáo
                                vẫn được lưu trữ an toàn, không bị xóa. Bạn có thể gia hạn bất kỳ lúc nào để tiếp tục.
                            </p>
                        </div>

                        <div className="rounded-xl border border-emerald-800/30 bg-[#061F13]/50 p-4 space-y-2">
                            <p className="font-bold text-white">Thanh Toán VietQR Ngân Hàng</p>
                            <p className="text-emerald-200/70 leading-relaxed">
                                Gia hạn bằng cách mở ứng dụng ngân hàng bất kỳ và quét mã VietQR.
                                Hệ thống đối soát tự động và kích hoạt gói ngay sau khi nhận tiền.
                            </p>
                        </div>

                        <div className="rounded-xl border border-emerald-800/30 bg-[#061F13]/50 p-4 space-y-2">
                            <p className="font-bold text-white">Phí Chuyển Khoản</p>
                            <p className="text-emerald-200/70 leading-relaxed">
                                Giá niêm yết là số tiền thực nhận của gói dịch vụ. Các khoản phí phát sinh
                                từ ngân hàng của người gửi (nếu có) do bên gửi chi trả.
                            </p>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-16 max-w-3xl mx-auto space-y-6">
                    <h2 className="text-xl font-bold text-white text-center">
                        Câu Hỏi Thường Gặp Về Thuê Bao
                    </h2>

                    <div className="space-y-4">
                        <div className="rounded-xl border border-emerald-800/30 bg-[#0B2E1D]/50 p-4 space-y-2">
                            <h3 className="text-sm font-bold text-white">
                                1. Ai được tính là nhân viên trong Gói Bạc?
                            </h3>
                            <p className="text-xs text-emerald-200/80 leading-relaxed">
                                Mỗi hồ luôn có 1 tài khoản Chủ hồ (OWNER) có toàn quyền quản trị. Với Gói Bạc,
                                bạn có thể tạo thêm tối đa 1 tài khoản Nhân viên (STAFF) để cùng trực quầy thu ngân.
                                Nếu hồ có từ 2 nhân viên trở lên làm việc khác ca, bạn cần nâng cấp lên Gói Vàng.
                            </p>
                        </div>

                        <div className="rounded-xl border border-emerald-800/30 bg-[#0B2E1D]/50 p-4 space-y-2">
                            <h3 className="text-sm font-bold text-white">
                                2. Nếu hồ của tôi có hơn 30 ô câu thì sao?
                            </h3>
                            <p className="text-xs text-emerald-200/80 leading-relaxed">
                                Gói Bạc giới hạn tối đa 30 ô câu được kích hoạt trong hồ. Nếu hồ của bạn có quy mô
                                từ 31 ô trở lên (hoặc nhiều hồ con trong cùng một cơ sở), vui lòng chọn Gói Vàng để
                                không bị giới hạn số ô.
                            </p>
                        </div>

                        <div className="rounded-xl border border-emerald-800/30 bg-[#0B2E1D]/50 p-4 space-y-2">
                            <h3 className="text-sm font-bold text-white">
                                3. Tôi có thể gia hạn sớm trước khi hết hạn không?
                            </h3>
                            <p className="text-xs text-emerald-200/80 leading-relaxed">
                                Hoàn toàn được. Khi bạn quét mã thanh toán gia hạn, hệ thống sẽ tự động cộng dồn
                                thêm 30 ngày nối tiếp vào ngày hết hạn hiện tại của bạn, không bị mất bất kỳ ngày nào.
                            </p>
                        </div>

                        <div className="rounded-xl border border-emerald-800/30 bg-[#0B2E1D]/50 p-4 space-y-2">
                            <h3 className="text-sm font-bold text-white">
                                4. Hỗ trợ kỹ thuật được thực hiện như thế nào?
                            </h3>
                            <p className="text-xs text-emerald-200/80 leading-relaxed">
                                Đội ngũ kỹ thuật hỗ trợ trực tiếp qua Zalo và hotline ({BANK_CONFIG.hotline})
                                trong giờ hoạt động thực tế của hồ. Chúng tôi cung cấp tài liệu hướng dẫn từng bước
                                kèm sơ đồ trực quan ngay trong ứng dụng tại mục Cài đặt -&gt; Hướng dẫn sử dụng.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-16 text-center rounded-2xl bg-linear-to-r from-emerald-800/40 via-emerald-700/30 to-emerald-800/40 border border-emerald-600/40 p-8 space-y-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                        Sẵn Sàng Tối Ưu Doanh Thu Hồ Câu Của Bạn?
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl mx-auto">
                        Đăng ký tài khoản trong 1 phút, không cần cài đặt phần mềm phức tạp,
                        dùng trực tiếp ngay trên điện thoại hoặc máy tính bảng.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/register"
                            className="rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-lg hover:from-emerald-400 hover:to-emerald-500 transition-all"
                        >
                            🚀 Bắt Đầu Dùng Thử Miễn Phí
                        </Link>
                        <a
                            href={`https://zalo.me/${BANK_CONFIG.hotline}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-3 text-xs font-bold text-white transition-all"
                        >
                            💬 Tư vấn qua Zalo: {BANK_CONFIG.hotline}
                        </a>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t border-emerald-900/60 bg-[#04160D] py-8 text-center text-xs text-emerald-300/60 space-y-2">
                <p>© 2026 Quản Lí Hồ Câu — Giải pháp vận hành thông minh cho các hồ câu tại Việt Nam.</p>
                <div className="flex items-center justify-center gap-4 text-[11px]">
                    <Link href="/" className="hover:text-emerald-200">Trang chủ</Link>
                    <span>•</span>
                    <Link href="/bang-gia" className="hover:text-emerald-200 font-semibold text-emerald-300">Bảng giá</Link>
                    <span>•</span>
                    <Link href="/login" className="hover:text-emerald-200">Đăng nhập</Link>
                    <span>•</span>
                    <Link href="/register" className="hover:text-emerald-200">Đăng ký</Link>
                </div>
            </footer>
        </div>
    );
}
