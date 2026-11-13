import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { TRIAL_DAYS } from "@/lib/vietqr";

function CheckIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    );
}

export const metadata: Metadata = {
    title: "Bảng Giá Minh Bạch — Quản Lý Hồ Câu | Dùng Thử 30 Ngày 0đ",
    description:
        "Chi phí chỉ từ 4.300đ/ngày — chưa bằng một chai nước suối. Miễn phí trọn vẹn 30 ngày đầu tiên, không cần thẻ ngân hàng, khởi tạo sẵn hồ mẫu trong 10 giây.",
    alternates: {
        canonical: "/bang-gia",
    },
};

const PLANS = [
    {
        code: "TRIAL",
        badge: "Khuyên dùng để bắt đầu",
        name: `Dùng Thử ${TRIAL_DAYS} Ngày`,
        priceMonthly: "0đ",
        priceSub: `Trọn vẹn ${TRIAL_DAYS} ngày đầu tiên · Không cần thẻ ngân hàng`,
        dailyNote: "Tự động tạo sẵn 6 ô số mẫu & bảng giá để bấm thử ngay",
        description:
            "Trải nghiệm đầy đủ quy trình mở vé, đếm giờ, gọi nước, cân cá cấn trừ và chốt ca thực tế tại hồ trước khi quyết định.",
        ctaLabel: `Mở hồ dùng thử ${TRIAL_DAYS} ngày`,
        ctaHref: "/register",
        featured: false,
        features: [
            "Đầy đủ tính năng Mở vé, Đếm ngược & Cảnh báo hết giờ",
            "Thêm nước ngọt, mồi câu, dịch vụ & Cân cá thu mua cấn trừ",
            "Tạo mã VietQR tự động theo đúng số tiền từng vé",
            "Tối đa 15 ô số câu · Phù hợp kiểm thử thực tế",
            "Báo cáo doanh thu ca trực (Tiền mặt vs Chuyển khoản)",
            "Hỗ trợ in hóa đơn nhiệt khổ 58mm / 80mm",
        ],
    },
    {
        code: "SILVER",
        badge: "Phổ biến nhất cho hồ 10–20 ô số",
        name: "Gói Bạc (Tiêu Chuẩn)",
        priceMonthly: "129.000đ",
        pricePeriod: "/ tháng",
        priceYearly: "Gói năm: 1.290.000đ/năm (Tiết kiệm 2 tháng — tặng 60 ngày)",
        dailyNote: "Chỉ 4.300đ / ngày — bằng 1/3 lon nước ngọt tại hồ",
        description:
            "Giải pháp chuẩn mực cho các hồ câu giải trí, hồ câu đài, hồ tôm quy mô vừa muốn chấm dứt thất thoát tiền lẻ mỗi ca.",
        ctaLabel: "Dùng thử ngay · Nâng cấp sau",
        ctaHref: "/register?plan=silver",
        featured: true,
        features: [
            "Quản lý tối đa 20 ô số câu hoạt động cùng lúc",
            "Tối đa 3 tài khoản (1 Chủ hồ + 2 Nhân viên thu ngân)",
            "Quản lý tồn kho nước ngọt, mồi câu, bia, thuốc lá",
            "Sổ thu chi vận hành (Nhập cá bồi, tiền điện, lương)",
            "Nhật ký kiểm toán (Audit Log) lưu 30 ngày gần nhất",
            "Sao lưu dữ liệu tự động hàng ngày trên Cloud PostgreSQL",
        ],
    },
    {
        code: "GOLD",
        badge: "Dành cho hồ dịch vụ lớn & chuỗi hồ",
        name: "Gói Vàng (Không Giới Hạn)",
        priceMonthly: "199.000đ",
        pricePeriod: "/ tháng",
        priceYearly: "Gói năm: 1.990.000đ/năm (Tiết kiệm 2 tháng — tặng 60 ngày)",
        dailyNote: "Chỉ 6.600đ / ngày — kiểm soát toàn diện từ xa 24/7",
        description:
            "Không giới hạn số lượng ô số và nhân viên. Đầy đủ phân tích lợi nhuận chuyên sâu và lưu trữ lịch sử kiểm toán trọn đời.",
        ctaLabel: "Bắt đầu với 30 ngày miễn phí",
        ctaHref: "/register?plan=gold",
        featured: false,
        features: [
            "Không giới hạn số lượng ô số câu và khu vực hồ",
            "Không giới hạn tài khoản Quản lý & Nhân viên ca trực",
            "Báo cáo phân tích lợi nhuận ròng, khung giờ vàng & khách VIP",
            "Quản lý công nợ khách quen và lịch sử trả nợ chi tiết",
            "Nhật ký chống gian lận (Audit Log) lưu trữ vĩnh viễn",
            "Ưu tiên hỗ trợ kỹ thuật 1-1 qua Zalo & cài đặt máy in từ xa",
        ],
    },
];

const COMPARISON_ROWS = [
    {
        feature: "Số lượng ô số câu quản lý",
        trial: "Tối đa 15 ô",
        silver: "Tối đa 20 ô",
        gold: "Không giới hạn",
    },
    {
        feature: "Tài khoản phân quyền (Chủ hồ / Quản lý / Nhân viên)",
        trial: "2 tài khoản",
        silver: "3 tài khoản",
        gold: "Không giới hạn",
    },
    {
        feature: "Mở vé nhanh 1 chạm & Đồng hồ đếm ngược từng ô số",
        trial: "Có sẵn",
        silver: "Có sẵn",
        gold: "Có sẵn",
    },
    {
        feature: "Cân cá thu mua cấn trừ trực tiếp vào hóa đơn",
        trial: "Có sẵn",
        silver: "Có sẵn",
        gold: "Có sẵn",
    },
    {
        feature: "Thanh toán VietQR động & tách tiền mặt / chuyển khoản",
        trial: "Có sẵn",
        silver: "Có sẵn",
        gold: "Có sẵn",
    },
    {
        feature: "Chế độ Ngoài trời (Nền sáng chữ đen đậm dưới nắng)",
        trial: "Có sẵn",
        silver: "Có sẵn",
        gold: "Có sẵn",
    },
    {
        feature: "Quản lý tồn kho nước ngọt, mồi câu & Sổ thu chi",
        trial: "Đầy đủ",
        silver: "Đầy đủ",
        gold: "Đầy đủ + Báo cáo sâu",
    },
    {
        feature: "Nhật ký kiểm toán (Ai hủy vé, sửa tiền, lúc mấy giờ)",
        trial: "Trong thời gian thử",
        silver: "Lưu 30 ngày",
        gold: "Lưu trữ vĩnh viễn",
    },
];

const FAQS = [
    {
        q: "Đăng ký dùng thử 30 ngày có phải nạp tiền hay liên kết thẻ không?",
        a: `Hoàn toàn không. Khi bấm "Mở hồ dùng thử ${TRIAL_DAYS} ngày", bạn chỉ cần nhập số điện thoại (hoặc đăng nhập Google) là vào thẳng màn hình quản lý hồ ngay lập tức với 0đ chi phí.`,
    },
    {
        q: "Hết 30 ngày dùng thử mà tôi chưa kịp gia hạn thì dữ liệu có bị xóa không?",
        a: "Tuyệt đối không. Toàn bộ danh sách ô số, bảng giá, khách quen và lịch sử hóa đơn của hồ vẫn được bảo toàn nguyên vẹn. Bạn có thể kích hoạt Gói Bạc hoặc Gói Vàng bất cứ lúc nào để tiếp tục mở vé mới.",
    },
    {
        q: "Thanh toán gia hạn gói cước bằng cách nào?",
        a: "Ngay trong mục Cài đặt Gói cước của ứng dụng, hệ thống tạo sẵn mã VietQR chính xác theo gói bạn chọn. Ngay khi bạn quét mã chuyển khoản thành công, hệ thống tự động cộng thêm ngày sử dụng trong vòng vài giây mà không cần chờ duyệt thủ công.",
    },
    {
        q: "Tôi có thể đổi từ Gói Bạc lên Gói Vàng khi mở rộng thêm ô số câu không?",
        a: "Được ngay lập tức. Hệ thống cho phép nâng cấp bất kỳ lúc nào và tự động cộng dồn thời hạn sử dụng còn lại của bạn một cách minh bạch.",
    },
];

export default function BangGiaPage() {
    return (
        <div className="min-h-screen bg-[#F8FAF8] text-[#111827] antialiased">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
                <div className="mx-auto flex min-h-19 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="flex items-center gap-3 text-left">
                        <Image
                            src="/brand/logo.svg"
                            alt="Logo Quản Lý Hồ Câu"
                            width={42}
                            height={42}
                            className="h-10 w-10 rounded-lg"
                        />
                        <div>
                            <span className="block text-base font-extrabold tracking-tight text-[#1B3B2B]">
                                Quản Lý Hồ Câu
                            </span>
                            <span className="block text-xs text-[#64748B]">Bảng giá niêm yết minh bạch</span>
                        </div>
                    </Link>

                    <nav className="flex items-center gap-3 sm:gap-6">
                        <Link
                            href="/"
                            className="hidden text-sm font-semibold text-[#475569] hover:text-[#1B3B2B] sm:inline-block"
                        >
                            Trang giới thiệu
                        </Link>
                        <Link
                            href="/preview"
                            className="hidden text-sm font-semibold text-[#475569] hover:text-[#1B3B2B] md:inline-block"
                        >
                            Xem quầy mẫu
                        </Link>
                        <Link
                            href="/login"
                            className="rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 text-sm font-bold text-[#1B3B2B] hover:bg-[#E8F0EC]"
                        >
                            Đăng nhập
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3B2B] px-4 py-2 text-sm font-bold text-white hover:bg-[#2C5E43]"
                        >
                            Dùng thử 0đ <ArrowRightIcon />
                        </Link>
                    </nav>
                </div>
            </header>

            <main>
                {/* Hero Header */}
                <section className="border-b border-[#E2E8F0] bg-white py-14 sm:py-20">
                    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#CFE0D6] bg-[#E8F0EC] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#1B3B2B]">
                            <span className="h-2 w-2 rounded-full bg-[#1B3B2B]" />
                            Chi phí chỉ từ 4.300đ / ngày · Không phí ẩn
                        </div>
                        <h1
                            className="text-3xl font-bold tracking-tight text-[#111827] sm:text-5xl"
                            style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                        >
                            Chặn đứng thất thoát tiền triệu mỗi tháng
                            <span className="block text-[#1B3B2B]">với chi phí chưa bằng một chai nước suối.</span>
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#475569] sm:text-lg">
                            Chỉ cần phần mềm giúp bạn không quên ghi <strong>2 lon bò húc</strong> hoặc{" "}
                            <strong>15 phút gia hạn giờ câu</strong> trong cả tháng là bạn đã thu hồi đủ chi phí sử dụng.
                            Bắt đầu ngay hôm nay với <strong>{TRIAL_DAYS} ngày miễn phí hoàn toàn</strong>.
                        </p>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16" aria-label="Các gói dịch vụ">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
                        {PLANS.map((plan) => (
                            <article
                                key={plan.code}
                                className={`flex flex-col justify-between rounded-xl border p-6 sm:p-8 ${
                                    plan.featured
                                        ? "border-2 border-[#1B3B2B] bg-white shadow-[0_12px_32px_-8px_rgba(27,59,43,0.16)]"
                                        : "border-[#E2E8F0] bg-white shadow-sm"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                                                plan.featured
                                                    ? "bg-[#1B3B2B] text-white"
                                                    : "bg-[#E8F0EC] text-[#1B3B2B]"
                                            }`}
                                        >
                                            {plan.badge}
                                        </span>
                                    </div>

                                    <h2
                                        className="mt-4 text-2xl font-bold text-[#111827]"
                                        style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                                    >
                                        {plan.name}
                                    </h2>

                                    <div className="mt-4 flex items-baseline gap-1.5">
                                        <span className="text-4xl font-extrabold tracking-tight text-[#1B3B2B] tabular-nums">
                                            {plan.priceMonthly}
                                        </span>
                                        {plan.pricePeriod && (
                                            <span className="text-sm font-semibold text-[#64748B]">
                                                {plan.pricePeriod}
                                            </span>
                                        )}
                                    </div>

                                    {plan.priceYearly ? (
                                        <p className="mt-1.5 text-xs font-bold text-[#15803D] tabular-nums">
                                            {plan.priceYearly}
                                        </p>
                                    ) : (
                                        <p className="mt-1.5 text-xs font-semibold text-[#64748B]">{plan.priceSub}</p>
                                    )}

                                    <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAF8] px-3 py-2 text-xs font-semibold text-[#334155] tabular-nums">
                                        {plan.dailyNote}
                                    </div>

                                    <p className="mt-4 text-sm leading-relaxed text-[#475569]">{plan.description}</p>

                                    <hr className="my-6 border-[#E2E8F0]" />

                                    <ul className="space-y-3 text-sm text-[#1E293B]">
                                        {plan.features.map((feat) => (
                                            <li key={feat} className="flex items-start gap-2.5">
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0EC] text-[#1B3B2B]">
                                                    <CheckIcon />
                                                </span>
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-8 pt-2">
                                    <Link
                                        href={plan.ctaHref}
                                        className={`flex min-h-13 w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition ${
                                            plan.featured
                                                ? "bg-[#1B3B2B] text-white hover:bg-[#2C5E43]"
                                                : "border border-[#1B3B2B] bg-[#E8F0EC] text-[#1B3B2B] hover:bg-[#1B3B2B] hover:text-white"
                                        }`}
                                    >
                                        <span>{plan.ctaLabel}</span>
                                        <ArrowRightIcon />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* Infrastructure & Partner Assurance Bar */}
                    <div className="mt-12 grid grid-cols-1 gap-4 rounded-xl border border-[#E2E8F0] bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0EC] text-xs font-extrabold text-[#1B3B2B]">
                                QR
                            </div>
                            <div>
                                <strong className="block text-sm font-bold text-[#111827]">
                                    Kích hoạt tự động VietQR
                                </strong>
                                <span className="mt-0.5 block text-xs text-[#64748B]">
                                    Quét mã Napas 247, hệ thống tự động gia hạn gói trong 5 giây.
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0EC] text-xs font-extrabold text-[#1B3B2B]">
                                58mm
                            </div>
                            <div>
                                <strong className="block text-sm font-bold text-[#111827]">
                                    Hỗ trợ máy in ESC/POS 58mm
                                </strong>
                                <span className="mt-0.5 block text-xs text-[#64748B]">
                                    Dùng tốt trên điện thoại sẵn có hoặc nối máy in nhiệt WiFi/USB.
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0EC] text-xs font-extrabold text-[#1B3B2B]">
                                TLS
                            </div>
                            <div>
                                <strong className="block text-sm font-bold text-[#111827]">
                                    An toàn dữ liệu tuyệt đối
                                </strong>
                                <span className="mt-0.5 block text-xs text-[#64748B]">
                                    Sao lưu Cloud hàng ngày, đổi điện thoại mới đăng nhập là có đủ sổ.
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0EC] text-xs font-extrabold text-[#1B3B2B]">
                                24/7
                            </div>
                            <div>
                                <strong className="block text-sm font-bold text-[#111827]">
                                    Không hợp đồng ràng buộc
                                </strong>
                                <span className="mt-0.5 block text-xs text-[#64748B]">
                                    Dùng theo tháng hoặc theo năm tùy ý, hỗ trợ kỹ thuật trực tiếp.
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Detailed Feature Comparison Table */}
                <section className="border-t border-[#E2E8F0] bg-white py-14 sm:py-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="max-w-2xl">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-[#1B3B2B]">
                                SO SÁNH CHI TIẾT QUYỀN LỢI
                            </span>
                            <h2
                                className="mt-2 text-2xl font-bold text-[#111827] sm:text-3xl"
                                style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                            >
                                Chọn gói phù hợp với số lượng ô số tại hồ của bạn
                            </h2>
                        </div>

                        <div className="mt-8 overflow-x-auto rounded-xl border border-[#E2E8F0]">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAF8]">
                                        <th className="px-4 py-4 font-bold text-[#334155] sm:px-6">Hạng mục nghiệp vụ</th>
                                        <th className="px-4 py-4 font-bold text-[#334155] sm:px-6">
                                            Dùng Thử (0đ / {TRIAL_DAYS} ngày)
                                        </th>
                                        <th className="bg-[#E8F0EC]/60 px-4 py-4 font-bold text-[#1B3B2B] sm:px-6">
                                            Gói Bạc (129.000đ/tháng)
                                        </th>
                                        <th className="px-4 py-4 font-bold text-[#334155] sm:px-6">
                                            Gói Vàng (199.000đ/tháng)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                    {COMPARISON_ROWS.map((row) => (
                                        <tr key={row.feature} className="hover:bg-[#F8FAF8]">
                                            <td className="px-4 py-3.5 font-semibold text-[#111827] sm:px-6">
                                                {row.feature}
                                            </td>
                                            <td className="px-4 py-3.5 text-[#475569] tabular-nums sm:px-6">
                                                {row.trial}
                                            </td>
                                            <td className="bg-[#E8F0EC]/30 px-4 py-3.5 font-bold text-[#1B3B2B] tabular-nums sm:px-6">
                                                {row.silver}
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-[#111827] tabular-nums sm:px-6">
                                                {row.gold}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="border-t border-[#E2E8F0] bg-[#F8FAF8] py-14 sm:py-16">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#1B3B2B]">
                            <span>CÂU HỎI THƯỜNG GẶP VỀ GÓI CƯỚC</span>
                        </div>
                        <h2
                            className="mt-2 text-2xl font-bold text-[#111827] sm:text-3xl"
                            style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                        >
                            Minh bạch từ ngày dùng thử đầu tiên
                        </h2>

                        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {FAQS.map((item) => (
                                <div
                                    key={item.q}
                                    className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs"
                                >
                                    <h3 className="text-base font-bold text-[#111827]">{item.q}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#475569]">{item.a}</p>
                                </div>
                            ))}
                        </div>

                        {/* Final CTA Box */}
                        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-xl bg-[#1B3B2B] p-6 text-white sm:flex-row sm:items-center sm:p-8">
                            <div>
                                <h3
                                    className="text-2xl font-bold text-white"
                                    style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                                >
                                    Tạo hồ câu của bạn và bấm thử vé đầu tiên ngay bây giờ
                                </h3>
                                <p className="mt-1.5 text-sm text-[#D1E2D8]">
                                    Miễn phí {TRIAL_DAYS} ngày · Đã tạo sẵn 6 ô số mẫu &amp; gói câu · Hỗ trợ trực tiếp qua
                                    Zalo: 0855 550 813
                                </p>
                            </div>
                            <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto">
                                <Link
                                    href="/register"
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-extrabold text-[#1B3B2B] hover:bg-[#E8F0EC]"
                                >
                                    <span>Mở hồ dùng thử {TRIAL_DAYS} ngày</span>
                                    <ArrowRightIcon />
                                </Link>
                                <a
                                    href="tel:0855550813"
                                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#E8F0EC] hover:underline"
                                >
                                    Gọi tư vấn trực tiếp: 0855 550 813
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#E2E8F0] bg-white py-8 text-xs text-[#64748B]">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
                    <div>
                        <strong className="font-bold text-[#1B3B2B]">Quản Lý Hồ Câu (quanlihocau.com)</strong> — Phần
                        mềm quản lý vé câu &amp; đối soát doanh thu chuyên biệt.
                    </div>
                    <div className="flex flex-wrap gap-5 font-semibold">
                        <Link href="/" className="hover:text-[#1B3B2B]">
                            Trang chủ
                        </Link>
                        <Link href="/preview" className="hover:text-[#1B3B2B]">
                            Quầy mẫu
                        </Link>
                        <Link href="/thiet-bi-may-in" className="hover:text-[#1B3B2B]">
                            Máy in 58mm
                        </Link>
                        <Link href="/dieu-khoan" className="hover:text-[#1B3B2B]">
                            Điều khoản
                        </Link>
                        <Link href="/chinh-sach-bao-mat" className="hover:text-[#1B3B2B]">
                            Bảo mật
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
