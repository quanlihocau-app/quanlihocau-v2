import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, SessionStatus } from "@/generated/prisma/client";
import { ONBOARDING_STEPS } from "@/lib/guides/onboarding-data";
import { HomeMobileView } from "./home-mobile-view";
import { InteractivePhonePreview } from "@/components/landing/interactive-phone-preview";
import { LakeLossCalculator } from "@/components/landing/loss-calculator";

export default async function HomePage() {
    const session = await getServerSession(authOptions);

    if (session?.user) {
        const tenantContext = await getTenantContext();
        if (tenantContext) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const [activeSessionsCount, totalHutsCount, todayInvoices, recentSessions] = await Promise.all([
                prisma.fishingSession.count({
                    where: {
                        lakeId: tenantContext.lakeId,
                        status: SessionStatus.ACTIVE,
                    },
                }),
                prisma.hut.count({
                    where: {
                        lakeId: tenantContext.lakeId,
                        deletedAt: null,
                    },
                }),
                prisma.invoice.findMany({
                    where: {
                        lakeId: tenantContext.lakeId,
                        createdAt: { gte: todayStart },
                        status: InvoiceStatus.PAID,
                    },
                    select: {
                        id: true,
                        totalAmountVnd: true,
                        createdAt: true,
                        customer: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                }),
                prisma.fishingSession.findMany({
                    where: {
                        lakeId: tenantContext.lakeId,
                        status: SessionStatus.ACTIVE,
                    },
                    include: {
                        customer: { select: { name: true } },
                        package: { select: { name: true } },
                        hutLinks: { include: { hut: { select: { name: true } } } },
                    },
                    orderBy: { startAt: "desc" },
                    take: 3,
                }),
            ]);

            const todayRevenue = todayInvoices.reduce(
                (sum, inv) => sum + Number(inv.totalAmountVnd || 0),
                0,
            );

            return (
                <HomeMobileView
                    lakeName={tenantContext.lakeName}
                    roleBadge={tenantContext.role}
                    isSupportMode={tenantContext.isSupportMode}
                    activeSessionsCount={activeSessionsCount}
                    totalHutsCount={totalHutsCount}
                    todayRevenue={todayRevenue}
                    recentSessions={recentSessions.map((s) => ({
                        id: s.id,
                        customerName: s.customer?.name || "Khách lẻ",
                        packageName: s.package.name,
                        huts: s.hutLinks.map((hl) => hl.hut.name),
                        startAt: s.startAt.toISOString(),
                        status: s.status,
                    }))}
                    recentInvoices={todayInvoices.map((inv) => ({
                        id: inv.id,
                        invoiceNumber: `HD-${inv.id.slice(0, 6).toUpperCase()}`,
                        customerName: inv.customer?.name || "Khách lẻ",
                        totalAmountVnd: Number(inv.totalAmountVnd || 0),
                        createdAt: inv.createdAt.toISOString(),
                    }))}
                />
            );
        }
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Quản Lí Hồ Câu",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Android, iOS",
        "url": "https://quanlihocau.com",
        "description":
            "Phần mềm quản lý hồ câu chuyên biệt: tính tiền phiên câu theo giờ, tự động đếm lùi nhảy phụ thu quá giờ, bán mồi câu nước giải khát, cân cá bù trừ và chốt ca tiền mặt minh bạch trên điện thoại.",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "VND",
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "128",
        },
        "inLanguage": "vi",
        "author": {
            "@type": "Organization",
            "name": "Quản Lí Hồ Câu",
            "url": "https://quanlihocau.com",
        },
    };

    return (
        <div className="min-h-screen bg-[#061F13] text-white flex flex-col selection:bg-[#246B38] selection:text-white antialiased">
            {/* JSON-LD for Search Engines */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* ── HEADER ─────────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 w-full border-b border-[#164329] bg-[#061F13]/90 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#4ADE80] rounded-xl p-1"
                        aria-label="Quản Lí Hồ Câu - Trang chủ"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-[#246B38] to-[#123E27] text-[#4ADE80] border border-[#2F7E47] shadow-sm group-hover:scale-105 transition-transform">
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.4}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[13px] font-extrabold tracking-wider text-white uppercase">
                                QUẢN LÍ
                            </span>
                            <span className="text-[11px] font-extrabold tracking-widest text-[#4ADE80] uppercase">
                                HỒ CÂU
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#A8C9B4]">
                        <a href="#tinh-that-thoat" className="hover:text-white transition-colors">
                            Tính thất thoát
                        </a>
                        <a href="#noi-dau" className="hover:text-white transition-colors">
                            4 Vấn đề thực tế
                        </a>
                        <a href="#tinh-nang" className="hover:text-white transition-colors">
                            Tính năng
                        </a>
                        <a href="#huong-dan" className="hover:text-white transition-colors">
                            11 Bước vận hành
                        </a>
                        <a href="#danh-gia" className="hover:text-white transition-colors">
                            Chủ hồ đánh giá
                        </a>
                        <a href="#hoi-dap" className="hover:text-white transition-colors">
                            Hỏi đáp
                        </a>
                    </nav>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <Link
                            href="/login"
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#246B38] bg-[#0A2A1A] px-4 text-xs font-semibold text-white hover:bg-[#123E27] focus:ring-2 focus:ring-[#4ADE80] focus:outline-none transition-all active:scale-95"
                        >
                            Đăng nhập
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#22C55E] px-4 sm:px-5 text-xs font-bold text-[#061F13] hover:bg-[#4ADE80] focus:ring-2 focus:ring-[#22C55E] focus:outline-none transition-all active:scale-95 shadow-md shadow-[#22C55E]/20"
                        >
                            Dùng thử 7 ngày
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
            <main className="flex-1">
                {/* ── HERO SECTION ───────────────────────────────────────────────── */}
                <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pb-28 bg-linear-to-b from-[#061F13] via-[#092B1B] to-[#061F13]">
                    {/* Glowing radial background accents */}
                    <div className="absolute top-10 left-1/4 -translate-x-1/2 w-125 h-125 bg-[#246B38]/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-100 h-100 bg-[#123E27]/30 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
                            {/* Left Column: Lake Owner Value Proposition */}
                            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#246B38] bg-[#0E3621] px-4 py-1.5 text-xs font-semibold text-[#52D879] shadow-inner">
                                    <span className="flex h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                                    <span>Phần mềm thiết kế riêng cho chủ hồ câu dịch vụ &amp; giải trí</span>
                                </div>

                                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-5xl leading-[1.15]">
                                    Chấm dứt ghi chép sổ tay &amp; cãi nhau tiền giờ câu. <br />
                                    <span className="text-[#4ADE80] underline decoration-[#246B38]/60 decoration-wavy decoration-2">
                                        Quản lý 1 chạm trên điện thoại.
                                    </span>
                                </h1>

                                <p className="text-sm sm:text-base text-[#C4D9CC] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Đồng hồ tự đếm lùi từng phút, <strong className="text-white font-semibold">tự động nhảy tiền quá giờ</strong>. Gom bia, nước ngọt, mồi câu và cân cá trừ thẳng vào 1 bill duy nhất. Nhân viên bấm mở vé trong 5 giây, chủ hồ ngồi nhà xem báo cáo doanh thu nổ tài khoản từng phút.
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                                    <Link
                                        href="/register"
                                        className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#22C55E] px-8 py-3.5 text-sm font-bold text-[#061F13] hover:bg-[#4ADE80] focus:ring-2 focus:ring-[#22C55E] focus:outline-none transition-all active:scale-95 shadow-xl shadow-[#22C55E]/25"
                                    >
                                        <span>Bắt đầu dùng thử miễn phí 7 ngày</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                        </svg>
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#246B38] bg-[#0A2A1A] px-7 py-3 text-sm font-semibold text-white hover:bg-[#123E27] focus:ring-2 focus:ring-[#4ADE80] focus:outline-none transition-all active:scale-95"
                                    >
                                        Vào quầy thu ngân
                                    </Link>
                                </div>

                                <div className="flex items-center justify-center lg:justify-start gap-3 text-xs text-[#86AB94] pt-1">
                                    <span className="flex items-center gap-1">
                                        <svg className="h-4 w-4 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        Đăng ký trong 30 giây
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <svg className="h-4 w-4 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        Không cần thẻ tín dụng
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <svg className="h-4 w-4 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        Hỗ trợ Zalo 24/7
                                    </span>
                                </div>

                                {/* Trust Metrics directly hitting Lake Owner's wallet */}
                                <div className="pt-6 border-t border-[#18462B] grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                                    <div>
                                        <p className="text-2xl sm:text-3xl font-extrabold text-[#4ADE80] tabular-nums">0 đ</p>
                                        <p className="text-xs text-[#9EC4AD] mt-0.5">Thất thoát tiền giờ &amp; đồ uống</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl sm:text-3xl font-extrabold text-[#4ADE80] tabular-nums">5 giây</p>
                                        <p className="text-xs text-[#9EC4AD] mt-0.5">Tạo vé mở chòi mới</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl sm:text-3xl font-extrabold text-[#4ADE80] tabular-nums">100%</p>
                                        <p className="text-xs text-[#9EC4AD] mt-0.5">Minh bạch tiền ca chống gian lận</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Live Interactive Smartphone Mockup */}
                            <div className="lg:col-span-5 flex justify-center">
                                <InteractivePhonePreview />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── INTERACTIVE LOSS CALCULATOR ─────────────────────────────────── */}
                <div id="tinh-that-thoat">
                    <LakeLossCalculator />
                </div>

                {/* ── 4 LAKE OWNER NIGHTMARES & REAL SOLUTIONS ────────────────────── */}
                <section id="noi-dau" className="py-16 sm:py-24 bg-[#082618] border-b border-[#164329]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="inline-block rounded-full bg-[#164329] px-3.5 py-1 text-xs font-bold text-[#4ADE80] uppercase tracking-wider border border-[#246B38]">
                                Thực tế tại các hồ câu
                            </span>
                            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                                4 nỗi đau đầu nhất của chủ hồ câu <br />
                                <span className="text-[#4ADE80]">đã được giải quyết triệt để</span>
                            </h2>
                            <p className="text-sm text-[#A8C9B4] leading-relaxed">
                                Chúng tôi khảo sát hàng trăm chủ hồ từ Bắc chí Nam để xây dựng quy trình giải quyết tận gốc từng rắc rối:
                            </p>
                        </div>

                        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Card 1 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-4 hover:border-[#4ADE80]/50 transition-all shadow-lg flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B1212] text-[#F87171] border border-[#991B1B]/40">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-bold text-white leading-snug">
                                        Khách câu lố giờ rồi &quot;kèo nhèo&quot; tính tiền
                                    </h3>
                                    <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                        Sổ tay lem nhem, khách bảo &quot;mới ngồi tí mà em&quot;. Khách quen khó xử, chủ đành bấm bụng bỏ qua 30 - 45 phút, cả tháng mất cả chục triệu.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-[#082315] p-3 border border-[#1B4B2E] text-[11px] text-[#4ADE80] font-semibold">
                                    ✅ Lời giải: Đồng hồ tự đếm từng giây, tự nhảy tiền phụ thu trên màn hình. Khách nhìn là tự giác thanh toán!
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-4 hover:border-[#4ADE80]/50 transition-all shadow-lg flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B1212] text-[#F87171] border border-[#991B1B]/40">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-bold text-white leading-snug">
                                        Bán bia, nước, mồi câu bị quên ghi sổ
                                    </h3>
                                    <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                        Khách gọi 2 lon bò húc, 1 gói cám... Nhân viên đang giật cá quên béng không ghi vào sổ. Lúc tính tiền chỉ thu tiền vé, hồ ôm lỗ tiền hàng.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-[#082315] p-3 border border-[#1B4B2E] text-[11px] text-[#4ADE80] font-semibold">
                                    ✅ Lời giải: 1 chạm thêm lon nước vào chòi câu ngay trên điện thoại. Gom tất cả vào 1 bill thanh toán lúc về.
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-4 hover:border-[#4ADE80]/50 transition-all shadow-lg flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B1212] text-[#F87171] border border-[#991B1B]/40">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97ZM5.25 4.97c-1.01.143-2.01.317-3 .52m3-.52L2.63 15.696c-.122.499.106 1.028.589 1.202a5.989 5.989 0 0 0 2.031.352 5.989 5.989 0 0 0 2.031-.352c.483-.174.711-.703.59-1.202L5.25 4.97Z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-bold text-white leading-snug">
                                        Cân cá &amp; Thu mua cá tính nhẩm sai lệch
                                    </h3>
                                    <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                        Cần thủ câu được cá muốn bán lại cho hồ. Cân ký, trừ tiền giờ, tính tiền mồi... cộng trừ nhẩm trên giấy rất dễ tính sai và mất lòng khách.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-[#082315] p-3 border border-[#1B4B2E] text-[11px] text-[#4ADE80] font-semibold">
                                    ✅ Lời giải: Nhập số kg cá, hệ thống tự nhân đơn giá và trừ trực tiếp vào hóa đơn. Rõ ràng từng con số.
                                </div>
                            </div>

                            {/* Card 4 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-4 hover:border-[#4ADE80]/50 transition-all shadow-lg flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B1212] text-[#F87171] border border-[#991B1B]/40">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-bold text-white leading-snug">
                                        Chủ đi vắng, nhân viên lệch tiền ca
                                    </h3>
                                    <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                        Không biết nhân viên thu bao nhiêu tiền mặt, bao nhiêu chuyển khoản, có lấy tiền túi riêng hay không. Bàn giao ca trực cãi vã đau đầu.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-[#082315] p-3 border border-[#1B4B2E] text-[11px] text-[#4ADE80] font-semibold">
                                    ✅ Lời giải: Tách bạch tiền mặt &amp; VietQR. Nút Chốt ca khóa sổ chống sửa xóa, chủ xem báo cáo tức thì trên điện thoại.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── COMPARISON TABLE: SO SANH SO TAY VS POS CONG KENH VS QUAN LI HO CAU ── */}
                <section className="py-16 sm:py-24 bg-[#061F13] border-b border-[#164329]">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="text-center space-y-3">
                            <span className="inline-block rounded-full bg-[#164329] px-3.5 py-1 text-xs font-bold text-[#4ADE80] uppercase tracking-wider border border-[#246B38]">
                                Bảng so sánh thực tế
                            </span>
                            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                                Tại sao chủ hồ câu chọn Quản Lí Hồ Câu?
                            </h2>
                            <p className="text-sm text-[#A8C9B4]">
                                So sánh giữa 3 cách vận hành hồ câu phổ biến nhất hiện nay:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Option 1: Sổ tay */}
                            <div className="rounded-3xl border border-[#2D1B1B] bg-[#140D0D] p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[#F87171]">Ghi chép sổ tay</span>
                                    <span className="text-xs text-[#991B1B] bg-[#3B1212] px-2 py-0.5 rounded font-bold">Lỗi thời</span>
                                </div>
                                <ul className="space-y-3 text-xs text-[#BFA8A8]">
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#F87171]">❌</span>
                                        <span>Trời mưa gió ướt lem sổ, rách giấy mất số liệu</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#F87171]">❌</span>
                                        <span>Thường xuyên quên tính tiền lố giờ của khách quen</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#F87171]">❌</span>
                                        <span>Bán lon bia, gói mồi hay quên cộng vào bill</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#F87171]">❌</span>
                                        <span>Chủ đi vắng mù tịt không biết ca trực thu được bao nhiêu</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Option 2: Máy tính bàn POS cồng kềnh */}
                            <div className="rounded-3xl border border-[#2D2A1B] bg-[#14130D] p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[#FBBF24]">Máy tính bàn POS</span>
                                    <span className="text-xs text-[#B45309] bg-[#3B250D] px-2 py-0.5 rounded font-bold">Cồng kềnh</span>
                                </div>
                                <ul className="space-y-3 text-xs text-[#BFB8A8]">
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#FBBF24]">⚠️</span>
                                        <span>Đắt tiền (10 - 15 triệu đồng sắm máy tính và phần mềm cũ)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#FBBF24]">⚠️</span>
                                        <span>Chỉ để ở quầy, không thể vác ra bờ hồ rộng hàng trăm mét</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#FBBF24]">⚠️</span>
                                        <span>Gặp ẩm ướt hơi nước bờ hồ rất nhanh hỏng linh kiện</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#FBBF24]">⚠️</span>
                                        <span>Giao diện rắc rối, nhân viên mới học cả tuần không xong</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Option 3: Quản Lí Hồ Câu */}
                            <div className="rounded-3xl border-2 border-[#22C55E] bg-linear-to-b from-[#0C3520] to-[#082618] p-6 space-y-4 shadow-2xl relative">
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#22C55E] px-4 py-0.5 text-[11px] font-extrabold text-[#061F13] uppercase tracking-wider shadow-md">
                                    Khuyên dùng cho chủ hồ
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-base font-extrabold text-white">Quản Lí Hồ Câu</span>
                                    <span className="text-xs text-[#061F13] bg-[#4ADE80] px-2.5 py-0.5 rounded-full font-bold">
                                        Đẳng cấp
                                    </span>
                                </div>
                                <ul className="space-y-3 text-xs text-[#C4E1D0]">
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span><strong className="text-white">Dùng ngay trên điện thoại</strong> đang có sẵn (iPhone/Android)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span><strong className="text-white">Đồng hồ đếm lùi tự động</strong>, tự nhảy tiền quá giờ từng phút</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span><strong className="text-white">In bill bỏ túi Bluetooth</strong> ngay tại chòi câu cho khách</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span><strong className="text-white">Chủ ở xa xem doanh thu</strong> nổ tài khoản trực tiếp 24/7</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span><strong className="text-white">Dùng thử miễn phí 7 ngày</strong> — 0đ chi phí đầu tư ban đầu!</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 6 CORE APP FEATURES ─────────────────────────────────────────── */}
                <section id="tinh-nang" className="py-16 sm:py-24 bg-[#082618] border-b border-[#164329]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="inline-block rounded-full bg-[#164329] px-3.5 py-1 text-xs font-bold text-[#4ADE80] uppercase tracking-wider border border-[#246B38]">
                                Nghiệp vụ bờ hồ thực tế
                            </span>
                            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                                Đầy đủ công cụ quản lý từ A - Z
                            </h2>
                            <p className="text-sm text-[#A8C9B4]">
                                Không thừa một nút, không thiếu một tính năng. Mọi chi tiết đều tối ưu cho ngón tay chạm nhanh trên điện thoại:
                            </p>
                        </div>

                        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {/* Feature 1 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-3 hover:border-[#4ADE80]/40 transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E3B23] text-[#4ADE80] border border-[#246B38]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white">
                                    Phiên câu &amp; Đồng hồ đếm lùi
                                </h3>
                                <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                    Mở vé trong 5 giây. Đồng hồ nhảy từng giây, đổi màu cam/đỏ khi sắp hết giờ. Hỗ trợ ghép nhiều chòi/ô câu vào một phiên duy nhất.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-3 hover:border-[#4ADE80]/40 transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E3B23] text-[#4ADE80] border border-[#246B38]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white">
                                    Bán nước, mồi câu &amp; Thuê đồ
                                </h3>
                                <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                    Bán mồi, lon bò húc, thuê cần câu. Thao tác 1 chạm cộng thẳng vào bill chòi câu. Cảnh báo xuất âm kho thông minh nếu chưa kịp nhập đầu ngày.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-3 hover:border-[#4ADE80]/40 transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E3B23] text-[#4ADE80] border border-[#246B38]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97ZM5.25 4.97c-1.01.143-2.01.317-3 .52m3-.52L2.63 15.696c-.122.499.106 1.028.589 1.202a5.989 5.989 0 0 0 2.031.352 5.989 5.989 0 0 0 2.031-.352c.483-.174.711-.703.59-1.202L5.25 4.97Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white">
                                    Cân cá &amp; Thu mua cá chuẩn xác
                                </h3>
                                <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                    Nhập trọng lượng cá cần thủ câu được, hệ thống tự động nhân đơn giá kg và bù trừ trực tiếp vào hóa đơn thanh toán mà không cần nhẩm tay.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-3 hover:border-[#4ADE80]/40 transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E3B23] text-[#4ADE80] border border-[#246B38]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white">
                                    In bill nhiệt bỏ túi Bluetooth / Wifi
                                </h3>
                                <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                    Tương thích toàn bộ máy in nhiệt mini bỏ túi 58mm/80mm phổ biến trên Shopee. In vé check-in và hóa đơn tính tiền ngay tại bờ hồ.
                                </p>
                            </div>

                            {/* Feature 5 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-3 hover:border-[#4ADE80]/40 transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E3B23] text-[#4ADE80] border border-[#246B38]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white">
                                    Ghi nhận chi phí phát sinh trong ca
                                </h3>
                                <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                    Ghi tiền mua đá lạnh, tiền cá giống, tiền điện nước hoặc sửa chữa lặt vặt. Hệ thống tự trừ vào doanh thu ròng để tính tiền nộp cuối ca.
                                </p>
                            </div>

                            {/* Feature 6 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-3 hover:border-[#4ADE80]/40 transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E3B23] text-[#4ADE80] border border-[#246B38]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white">
                                    Chốt ca chống gian lận &amp; Báo cáo từ xa
                                </h3>
                                <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                    Tách bạch tiền mặt và VietQR. Nút chốt ca khóa dữ liệu bàn giao, nhân viên không thể sửa số liệu. Chủ hồ theo dõi trực tiếp từ xa trên điện thoại.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 11 STEPS ONBOARDING GUIDE SECTION ──────────────────────────── */}
                <section id="huong-dan" className="py-16 sm:py-24 bg-[#061F13] border-b border-[#164329]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="text-center space-y-3 max-w-3xl mx-auto">
                            <span className="inline-block rounded-full bg-[#164329] px-3.5 py-1 text-xs font-bold text-[#4ADE80] uppercase tracking-wider border border-[#246B38]">
                                Quy trình chuẩn mực
                            </span>
                            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                                11 bước vận hành hồ câu chuẩn mực
                            </h2>
                            <p className="text-sm text-[#A8C9B4] leading-relaxed">
                                Được đúc kết từ thực tế các hồ câu dịch vụ đông khách nhất. Nhân viên mới chỉ cần đọc lướt 5 phút là làm theo răm rắp, không lo thất thoát hay tính nhầm tiền:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {ONBOARDING_STEPS.map((step) => (
                                <div
                                    key={step.id}
                                    className="rounded-3xl border border-[#1E4D30] bg-[#0A2E1C] p-5 space-y-3 hover:border-[#4ADE80]/40 transition-all shadow-md flex flex-col justify-between"
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#22C55E] text-xs font-extrabold text-[#061F13] font-mono shadow-sm">
                                                    {step.id}
                                                </span>
                                                <span className="rounded-lg bg-[#144229] px-2 py-0.5 text-[10px] font-bold text-[#52D879] uppercase border border-[#246B38]">
                                                    {step.badge}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-bold text-white">
                                            {step.title}
                                        </h3>

                                        <p className="text-xs text-[#9EC4AD] leading-relaxed">
                                            {step.summary}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-[#082315] p-3 text-[11px] text-white space-y-1 border border-[#164329]">
                                        <p className="font-semibold text-[#4ADE80]">Thao tác:</p>
                                        <p className="text-[#A8C9B4] leading-relaxed">{step.instructions[0]}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── REAL TESTIMONIALS / STORIES FROM LAKE OWNERS ───────────────── */}
                <section id="danh-gia" className="py-16 sm:py-24 bg-[#082618] border-b border-[#164329]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="text-center space-y-3 max-w-3xl mx-auto">
                            <span className="inline-block rounded-full bg-[#164329] px-3.5 py-1 text-xs font-bold text-[#4ADE80] uppercase tracking-wider border border-[#246B38]">
                                Chia sẻ từ chủ hồ câu
                            </span>
                            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                                Chủ hồ nói gì về Quản Lí Hồ Câu?
                            </h2>
                            <p className="text-sm text-[#A8C9B4]">
                                Những câu chuyện người thật việc thật từ các hồ câu dịch vụ đang vận hành mỗi ngày:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Testimonial 1 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-4 shadow-lg flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex text-[#FBBF24]">★★★★★</div>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] italic leading-relaxed">
                                        &quot;Trước đây cuối tuần đông khách toàn bị khách câu lố 30-45 phút mà mình ngại cãi với khách quen nên không dám tính thêm. Từ ngày mở app đếm giờ, máy tự nhảy phụ thu, khách tự nhìn đồng hồ trên bill trả tiền răm rắp. Mỗi tháng hồ thu thêm được cả chục triệu tiền giờ.&quot;
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 border-t border-[#18462B] pt-4">
                                    <div className="h-10 w-10 rounded-full bg-[#18462B] flex items-center justify-center font-bold text-[#4ADE80]">
                                        A7
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Anh Bảy</p>
                                        <p className="text-[11px] text-[#7BA58E]">Chủ Hồ Câu Sông Sài Gòn • Q.12, TP.HCM</p>
                                    </div>
                                </div>
                            </div>

                            {/* Testimonial 2 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-4 shadow-lg flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex text-[#FBBF24]">★★★★★</div>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] italic leading-relaxed">
                                        &quot;Nhân viên nhà tôi lớn tuổi không rành vi tính, mà hướng dẫn dùng app này 5 phút là biết bấm mở chòi với thêm lon nước ngọt. Cầm cái máy in nhiệt nhỏ xíu đeo hông đi vòng hồ in bill khách khen chuyên nghiệp quá trời!&quot;
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 border-t border-[#18462B] pt-4">
                                    <div className="h-10 w-10 rounded-full bg-[#18462B] flex items-center justify-center font-bold text-[#4ADE80]">
                                        CM
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Chị Mai</p>
                                        <p className="text-[11px] text-[#7BA58E]">Hồ Câu Dịch Vụ Đồng Quê • Bến Lức, Long An</p>
                                    </div>
                                </div>
                            </div>

                            {/* Testimonial 3 */}
                            <div className="rounded-3xl border border-[#1E4D30] bg-[#0A2F1C] p-6 space-y-4 shadow-lg flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex text-[#FBBF24]">★★★★★</div>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] italic leading-relaxed">
                                        &quot;Tôi đi làm văn phòng ở phố, giao hồ cho người làm quản lý. Mở điện thoại lên là thấy hồ đang có bao nhiêu cần câu, hôm nay thu bao nhiêu tiền mặt, ai chuyển khoản. Nút khóa ca chống sửa số liệu cực kỳ yên tâm.&quot;
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 border-t border-[#18462B] pt-4">
                                    <div className="h-10 w-10 rounded-full bg-[#18462B] flex items-center justify-center font-bold text-[#4ADE80]">
                                        AT
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Anh Tuấn</p>
                                        <p className="text-[11px] text-[#7BA58E]">Hồ Câu Sinh Thái Ba Bể • Đông Anh, Hà Nội</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── FAQ SECTION ─────────────────────────────────────────────────── */}
                <section id="hoi-dap" className="py-16 sm:py-24 bg-[#061F13] border-b border-[#164329]">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="text-center space-y-3">
                            <span className="inline-block rounded-full bg-[#164329] px-3.5 py-1 text-xs font-bold text-[#4ADE80] uppercase tracking-wider border border-[#246B38]">
                                Giải đáp thắc mắc
                            </span>
                            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                                Câu hỏi thường gặp của chủ hồ câu
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-[#1E4D30] bg-[#0A2E1C] p-5 space-y-2">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-[#4ADE80]">❓</span>
                                    Tôi lớn tuổi, không rành công nghệ điện thoại có tự dùng được không?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#A8C9B4] leading-relaxed pl-6">
                                    Dạ hoàn toàn được ạ! Phần mềm được thiết kế với tiêu chí nút bấm to bản, chữ lớn rõ ràng và phông chữ tiếng Việt chuẩn. Bạn chỉ cần chạm ngón tay vào ô &quot;Tạo vé mới&quot; là xong, không có thao tác phức tạp nào.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#1E4D30] bg-[#0A2E1C] p-5 space-y-2">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-[#4ADE80]">❓</span>
                                    Hồ câu của tôi ở bờ sông sóng wifi yếu thì có sử dụng được không?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#A8C9B4] leading-relaxed pl-6">
                                    Phần mềm được tối ưu tải dữ liệu siêu nhẹ (chỉ tốn vài KB cho mỗi vé), chạy mượt trên mạng 3G/4G chập chờn nhất. Bạn có thể mang điện thoại đi dạo quanh bờ hồ phục vụ khách mà không sợ bị đơ lag.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#1E4D30] bg-[#0A2E1C] p-5 space-y-2">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-[#4ADE80]">❓</span>
                                    Có in được máy in nhiệt mini cầm tay tôi mua trên Shopee/Lazada không?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#A8C9B4] leading-relaxed pl-6">
                                    Dạ có! Hệ thống tích hợp sẵn chuẩn in nhiệt phổ thông 58mm và 80mm qua Bluetooth, USB-OTG và Wifi. Bạn chỉ cần kết nối Bluetooth điện thoại với máy in là bấm in ra hóa đơn sắc nét ngay lập tức.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#1E4D30] bg-[#0A2E1C] p-5 space-y-2">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-[#4ADE80]">❓</span>
                                    Sau 7 ngày dùng thử thì chi phí như thế nào?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#A8C9B4] leading-relaxed pl-6">
                                    Trong 7 ngày dùng thử, bạn được mở toàn bộ tính năng mà không tốn một đồng nào, không cần nhập thẻ ngân hàng. Sau đó nếu thấy ưng ý, chi phí duy trì chỉ bằng vài lon nước ngọt mỗi tháng! Đội ngũ luôn hỗ trợ cài đặt bảng giá riêng cho hồ bạn.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── BIG FINAL CALL TO ACTION ─────────────────────────────────────── */}
                <section className="relative overflow-hidden py-16 sm:py-24 bg-linear-to-b from-[#082618] to-[#04160D]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-75 bg-[#22C55E]/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
                        <span className="inline-block rounded-full bg-[#22C55E] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#061F13] shadow-md">
                            Dùng thử miễn phí 7 ngày ngay hôm nay
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                            Bắt đầu vận hành hồ câu chuyên nghiệp <br />
                            <span className="text-[#4ADE80]">chỉ với một chiếc điện thoại</span>
                        </h2>
                        <p className="text-sm sm:text-base text-[#C4D9CC] max-w-2xl mx-auto leading-relaxed">
                            Chấm dứt ghi chép sổ tay thất lạc. Chấm dứt đôi co tiền giờ với khách. Bảo vệ doanh thu của bạn ngay từ phiên câu tiếp theo.
                        </p>
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#22C55E] px-9 py-4 text-base font-extrabold text-[#061F13] hover:bg-[#4ADE80] shadow-2xl shadow-[#22C55E]/30 transition-all active:scale-95 cursor-pointer"
                            >
                                <span>Tạo hồ câu &amp; Dùng thử ngay</span>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                            <Link
                                href="/login"
                                className="w-full sm:w-auto inline-flex min-h-13 items-center justify-center rounded-2xl border border-[#246B38] bg-[#0A2A1A] px-8 py-4 text-base font-semibold text-white hover:bg-[#123E27] transition-all active:scale-95"
                            >
                                Đăng nhập tài khoản
                            </Link>
                        </div>
                        <p className="text-xs text-[#7BA58E]">
                            Đăng ký chỉ mất 30 giây • Không cần thẻ tín dụng • Hỗ trợ Zalo hướng dẫn 24/7
                        </p>
                    </div>
                </section>
            </main>

            {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
            <footer className="border-t border-[#164329] bg-[#04160D] py-10 text-xs text-[#7BA58E]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E3621] text-[#4ADE80] border border-[#246B38]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="font-bold text-white text-sm">Quản Lí Hồ Câu</span>
                            <span>—</span>
                            <span className="text-[#A8C9B4]">Phần mềm vận hành chuyên biệt cho hồ câu dịch vụ &amp; giải trí</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link href="/login" className="hover:text-white transition-colors">
                                Đăng nhập
                            </Link>
                            <Link href="/register" className="hover:text-white transition-colors">
                                Đăng ký dùng thử
                            </Link>
                            <a href="https://quanlihocau.com" className="text-[#4ADE80] font-semibold hover:underline">
                                quanlihocau.com
                            </a>
                        </div>
                    </div>

                    <div className="border-t border-[#123620] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#5A7E6C]">
                        <p>© {new Date().getFullYear()} Quản Lí Hồ Câu. Tối ưu cho mọi điện thoại di động &amp; máy in nhiệt cầm tay.</p>
                        <p className="flex items-center gap-1">
                            <span>Thiết kế riêng cho các cần thủ &amp; chủ hồ Việt Nam 🇻🇳</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
