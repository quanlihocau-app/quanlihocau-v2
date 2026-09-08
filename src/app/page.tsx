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
            "Phần mềm quản lý hồ câu chuyên biệt: mở vé 3 giây, tự động đếm ngược nhảy tiền quá giờ, bán nước mồi câu, cân cá bù trừ và chốt ca tiền mặt minh bạch trên điện thoại.",
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
        <div className="min-h-screen bg-[#F0F4EF] text-[#17201A] flex flex-col selection:bg-[#E8F3E5] selection:text-[#246B38] antialiased">
            {/* JSON-LD for Search Engines */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* ── HEADER (Tone App Sang Trọng) ─────────────────────────────────── */}
            <header className="sticky top-0 z-50 w-full border-b border-[#164329] bg-[#061F13] text-white shadow-sm">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 group focus:outline-none rounded-xl p-1"
                        aria-label="Quản Lí Hồ Câu - Trang chủ"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#246B38] text-[#4ADE80] border border-[#2F7E47] shadow-xs">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[12px] font-extrabold tracking-wider uppercase text-white">
                                QUẢN LÍ
                            </span>
                            <span className="text-[11px] font-extrabold tracking-widest uppercase text-[#4ADE80]">
                                HỒ CÂU
                            </span>
                        </div>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#A8C9B4]">
                        <a href="#tinh-that-thoat" className="hover:text-white transition-colors">
                            Tính tiền thất thoát
                        </a>
                        <a href="#chuyen-bo-ho" className="hover:text-white transition-colors">
                            Chuyện bờ hồ
                        </a>
                        <a href="#quy-trinh" className="hover:text-white transition-colors">
                            Cách dùng 3 bước
                        </a>
                        <a href="#so-sanh" className="hover:text-white transition-colors">
                            So sánh sổ tay
                        </a>
                        <a href="#danh-gia" className="hover:text-white transition-colors">
                            Chủ hồ nói gì
                        </a>
                        <a href="#hoi-dap" className="hover:text-white transition-colors">
                            Hỏi đáp
                        </a>
                    </nav>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/login"
                            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#246B38] bg-[#0A2A1A] px-3.5 text-xs font-semibold text-white hover:bg-[#123E27] transition-all"
                        >
                            Đăng nhập
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#4F9D5A] px-4 text-xs font-bold text-white hover:bg-[#3D8547] transition-all shadow-xs"
                        >
                            Dùng thử miễn phí
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
            <main className="flex-1">
                {/* ── HERO SECTION: CUỐN & CHẠM ĐÚNG NỖI ĐAU CỦA DÂN HỒ CÂU ──────── */}
                <section className="relative overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20 bg-linear-to-b from-[#061F13] via-[#092B1B] to-[#0D3823] text-white">
                    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
                            {/* Left Column: Authentic Hook & Punchy Copy */}
                            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-semibold text-[#52D879]">
                                    <span className="flex h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
                                    <span>Thiết kế dành riêng cho anh em chủ hồ câu</span>
                                </div>

                                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[44px] leading-tight text-white">
                                    Khách câu lố giờ: <br />
                                    <span className="text-[#FBBF24]">Nhắc thì ngại cãi nhau,</span> <br />
                                    <span className="text-white">không nhắc thì </span>
                                    <span className="text-[#F87171] underline decoration-[#EF4444]/60 decoration-2">lỗ tiền túi?</span>
                                </h1>

                                <p className="text-sm sm:text-base text-[#C4D9CC] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                                    Bỏ sổ tay đi anh em. Cầm điện thoại mở vé <strong className="text-white">đúng 3 giây</strong>. Đồng hồ tự đếm ngược từng phút — <strong className="text-[#4ADE80]">lố phút nào tự nhảy tiền phút đó</strong>. Thêm lon bò húc, gói cám hay cân cá trừ tiền, tất cả gom gọn vào 1 bill in cái &quot;xoẹt&quot; tận chòi câu. Chủ ở nhà tiền vẫn về tài khoản đều đều.
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                                    <Link
                                        href="/register"
                                        className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4F9D5A] px-7 py-3 text-sm font-bold text-white hover:bg-[#3D8547] shadow-lg shadow-[#4F9D5A]/25 active:scale-95 transition-all"
                                    >
                                        <span>Dùng thử 7 ngày miễn phí</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                        </svg>
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#246B38] bg-[#0A2A1A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#123E27] transition-all"
                                    >
                                        Vào quầy thu ngân
                                    </Link>
                                </div>

                                <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-[#86AB94] pt-1 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[#4ADE80]">✓</span> Đăng ký 30 giây bằng SĐT
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[#4ADE80]">✓</span> Không cần thẻ ngân hàng
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[#4ADE80]">✓</span> Zalo hỗ trợ cài đặt tận tình
                                    </span>
                                </div>

                                {/* 3 Hard Lake Numbers */}
                                <div className="pt-5 border-t border-[#18462B] grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                                    <div>
                                        <p className="text-xl sm:text-2xl font-extrabold text-[#4ADE80] tabular-nums">3 giây</p>
                                        <p className="text-xs text-[#9EC4AD] mt-0.5">Mở chòi bấm giờ</p>
                                    </div>
                                    <div>
                                        <p className="text-xl sm:text-2xl font-extrabold text-[#FBBF24] tabular-nums">Tự động</p>
                                        <p className="text-xs text-[#9EC4AD] mt-0.5">Cộng tiền lố từng phút</p>
                                    </div>
                                    <div>
                                        <p className="text-xl sm:text-2xl font-extrabold text-[#4ADE80] tabular-nums">100%</p>
                                        <p className="text-xs text-[#9EC4AD] mt-0.5">Khóa sổ chống gian lận</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: In-App Clean Smartphone Mockup */}
                            <div className="lg:col-span-5 flex justify-center">
                                <InteractivePhonePreview />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── BẢNG TÍNH TIỀN RƠI RỤNG (LOSS CALCULATOR) ──────────────────── */}
                <div id="tinh-that-thoat">
                    <LakeLossCalculator />
                </div>

                {/* ── CHUYỆN BỜ HỒ: 4 TÌNH HUỐNG THỰC TẾ ANH EM CHỦ HỒ GẶP HOÀI ───── */}
                <section id="chuyen-bo-ho" className="py-16 sm:py-20 bg-[#F0F4EF] border-b border-[#E3E8E3]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="text-center max-w-2xl mx-auto space-y-2.5">
                            <span className="inline-block rounded-full bg-[#E8F3E5] px-3.5 py-1 text-xs font-bold text-[#246B38] uppercase tracking-wider border border-[#D5E5D1]">
                                Chuyện bờ hồ hàng ngày
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17201A]">
                                Những cảnh anh em làm hồ câu gặp hoài
                            </h2>
                            <p className="text-sm text-[#66716A]">
                                Không cần nói văn vẻ, đây là thực tế xảy ra mỗi ngày ở các hồ câu:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Card 1 */}
                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3.5 shadow-xs hover:border-[#4F9D5A] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF5E7] text-[#9A600B] text-lg font-bold">
                                        ⏱️
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#17201A]">
                                            Khách quen bảo: &quot;Cho anh xin 15 phút gỡ con cá&quot;
                                        </h3>
                                        <p className="text-xs text-[#9A600B] font-semibold">Lát sau nhìn lại thành 1 tiếng rưỡi!</p>
                                    </div>
                                </div>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Lúc tính tiền khách bảo: &quot;Ủa anh mới câu thêm có chút mà tính chi em&quot;. Khách quen thì ngại cãi nhau mất mối, mà bỏ qua thì một ngày 5-10 cần là hồ mất đứt nửa triệu tiền giờ câu.
                                </p>
                                <div className="rounded-2xl bg-[#E8F3E5] p-3 border border-[#D5E5D1] text-xs font-medium text-[#246B38] space-y-0.5">
                                    <span className="font-bold">👉 Trên app:</span> Đồng hồ đếm lùi từng giây trước mặt khách. Hết giờ máy tự động cộng phụ thu theo đơn giá phút. Khách tự nhìn điện thoại vui vẻ thanh toán, không ai nói được câu nào!
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3.5 shadow-xs hover:border-[#4F9D5A] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF5E7] text-[#9A600B] text-lg font-bold">
                                        🥤
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#17201A]">
                                            Khách gọi 2 lon bò húc, 1 gói cám...
                                        </h3>
                                        <p className="text-xs text-[#9A600B] font-semibold">Nhân viên vớt cá xong quên béng không ghi sổ!</p>
                                    </div>
                                </div>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Lúc cao điểm cá đớp mồi giật cần, mang nước ngọt ra chòi xong không kịp ghi vào sổ tay. Đến chiều khách trả tiền chỉ tính tiền giờ câu, lon nước gói mồi hồ ôm lỗ tiền vốn.
                                </p>
                                <div className="rounded-2xl bg-[#E8F3E5] p-3 border border-[#D5E5D1] text-xs font-medium text-[#246B38] space-y-0.5">
                                    <span className="font-bold">👉 Trên app:</span> Cầm điện thoại chạm 1 cái là lon nước gán thẳng vào chòi đó. Lúc khách về bấm tính tiền, máy tự gom tất cả vào 1 bill không sót một ngàn.
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3.5 shadow-xs hover:border-[#4F9D5A] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF5E7] text-[#9A600B] text-lg font-bold">
                                        🐟
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#17201A]">
                                            Cân cá tính nhẩm trên giấy vừa lâu vừa dễ cãi
                                        </h3>
                                        <p className="text-xs text-[#9A600B] font-semibold">Khách đứng chờ sốt ruột, tính sai lại mất uy tín</p>
                                    </div>
                                </div>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Cần thủ câu được 3.2kg cá, muốn bán lại cho hồ trừ vào tiền giờ. Lấy giấy bút cộng trừ nhẩm tiền mồi, tiền nước, tiền giờ trừ tiền cá... vừa rối vừa dễ nhầm lẫn.
                                </p>
                                <div className="rounded-2xl bg-[#E8F3E5] p-3 border border-[#D5E5D1] text-xs font-medium text-[#246B38] space-y-0.5">
                                    <span className="font-bold">👉 Trên app:</span> Nhập số ký cá, máy tự nhân đơn giá và trừ trực tiếp vào hóa đơn. In bill giấy ra rõ ràng từng dòng, khách nhìn là ưng cái bụng ngay.
                                </div>
                            </div>

                            {/* Card 4 */}
                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3.5 shadow-xs hover:border-[#4F9D5A] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF5E7] text-[#9A600B] text-lg font-bold">
                                        📱
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#17201A]">
                                            Chủ đi vắng, cuối ngày kiểm quỹ thiếu tiền
                                        </h3>
                                        <p className="text-xs text-[#9A600B] font-semibold">Nhân viên bảo: &quot;Khách nợ/em không nhớ rõ ai trả&quot;</p>
                                    </div>
                                </div>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Giao cho người làm trông hồ thì lo bị biển thủ tiền mặt hoặc ghi khống chi phí. Cuối ngày bàn giao ca cãi nhau đau đầu vì số tiền trong hộc không khớp sổ.
                                </p>
                                <div className="rounded-2xl bg-[#E8F3E5] p-3 border border-[#D5E5D1] text-xs font-medium text-[#246B38] space-y-0.5">
                                    <span className="font-bold">👉 Trên app:</span> Tách bạch tiền mặt và VietQR. Nút Chốt ca khóa sổ không ai sửa xóa được. Chủ ở nhà mở điện thoại lên là thấy từng đồng thu về trong ca.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── BẢNG SO SÁNH: SỔ TAY vs MÁY POS CỒNG KỀNH vs QUẢN LÍ HỒ CÂU ─── */}
                <section id="so-sanh" className="py-16 sm:py-20 bg-white border-b border-[#E3E8E3]">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
                        <div className="text-center max-w-xl mx-auto space-y-2">
                            <span className="inline-block rounded-full bg-[#E8F3E5] px-3.5 py-1 text-xs font-bold text-[#246B38] uppercase tracking-wider border border-[#D5E5D1]">
                                So sánh thực tế
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17201A]">
                                Tại sao không nên dùng sổ tay hay máy tính bàn nữa?
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Option 1: Sổ tay */}
                            <div className="rounded-3xl border border-[#F0D5D5] bg-[#FDF8F8] p-6 space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[#C53030]">Ghi chép sổ tay</span>
                                    <span className="text-[10px] font-bold text-[#C53030] bg-[#FED7D7] px-2 py-0.5 rounded-full">
                                        Lạc hậu
                                    </span>
                                </div>
                                <ul className="space-y-2.5 text-xs text-[#742A2A]">
                                    <li className="flex items-start gap-2">
                                        <span>❌</span>
                                        <span>Mưa gió ướt nhẹp rách giấy, mất sạch số liệu</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>❌</span>
                                        <span>Khách câu lố giờ toàn phải bỏ qua vì ngại cãi</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>❌</span>
                                        <span>Bán nước ngọt mồi câu hay quên ghi sổ</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>❌</span>
                                        <span>Chủ đi vắng không biết ở hồ có bao nhiêu cần câu</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Option 2: Máy tính bàn POS cồng kềnh */}
                            <div className="rounded-3xl border border-[#FDE3BE] bg-[#FFFDF9] p-6 space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[#9A600B]">Máy tính để bàn POS</span>
                                    <span className="text-[10px] font-bold text-[#9A600B] bg-[#FEF5E7] px-2 py-0.5 rounded-full">
                                        Cồng kềnh
                                    </span>
                                </div>
                                <ul className="space-y-2.5 text-xs text-[#744210]">
                                    <li className="flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>Tốn 10 - 15 triệu sắm máy bàn và phần mềm cũ</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>Bờ hồ ẩm ướt hơi nước rất nhanh chập hỏng máy</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>Bắt buộc phải ngồi ở quầy, không mang ra chòi được</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>Giao diện phức tạp, người lớn tuổi nhìn hoa cả mắt</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Option 3: Quản Lí Hồ Câu */}
                            <div className="rounded-3xl border-2 border-[#4F9D5A] bg-[#F7FBF7] p-6 space-y-3.5 shadow-sm relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#4F9D5A] px-3.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-2xs">
                                    Tối ưu cho hồ câu
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-base font-extrabold text-[#246B38]">Quản Lí Hồ Câu</span>
                                    <span className="text-[10px] font-bold text-[#246B38] bg-[#E8F3E5] px-2 py-0.5 rounded-full">
                                        Gọn nhẹ
                                    </span>
                                </div>
                                <ul className="space-y-2.5 text-xs text-[#22543D]">
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#38A169] font-bold">✓</span>
                                        <span><strong className="text-[#17201A]">Dùng ngay trên điện thoại</strong> đang có sẵn (iPhone/Android)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#38A169] font-bold">✓</span>
                                        <span><strong className="text-[#17201A]">Tự nhảy tiền lố giờ</strong> từng phút, khách tự giác trả đủ</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#38A169] font-bold">✓</span>
                                        <span><strong className="text-[#17201A]">In bill nhiệt mini đeo thắt lưng</strong> trao tận tay tại chòi</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#38A169] font-bold">✓</span>
                                        <span><strong className="text-[#17201A]">Chủ ngồi quán cà phê</strong> xem doanh thu nổ tài khoản 24/7</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#38A169] font-bold">✓</span>
                                        <span><strong className="text-[#17201A]">Dùng thử miễn phí 7 ngày</strong> — Không mất đồng nào!</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── QUY TRÌNH 3 BƯỚC ĐƠN GIẢN: NHÂN VIÊN MỚI BIẾT DÙNG TRONG 5 PHÚT ── */}
                <section id="quy-trinh" className="py-16 sm:py-20 bg-[#F0F4EF] border-b border-[#E3E8E3]">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="text-center max-w-xl mx-auto space-y-2">
                            <span className="inline-block rounded-full bg-[#E8F3E5] px-3.5 py-1 text-xs font-bold text-[#246B38] uppercase tracking-wider border border-[#D5E5D1]">
                                Cực kỳ dễ dùng
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17201A]">
                                Nhân viên mới làm quen đúng 5 phút
                            </h2>
                            <p className="text-sm text-[#66716A]">
                                Thiết kế nút to đùng, chữ lớn rõ ràng, chỉ cần 3 bước chạm ngón tay:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3 shadow-xs">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F3E5] text-[#246B38] font-mono text-base font-bold">
                                    1
                                </div>
                                <h3 className="text-base font-bold text-[#17201A]">
                                    Khách đến bờ hồ
                                </h3>
                                <p className="text-xs text-[#66716A] leading-relaxed">
                                    Chọn chòi/ô câu, chọn gói 3h hay 5h, bấm nút <strong>Mở vé</strong> (3 giây xong). Đồng hồ tự chạy đếm lùi, có thể in vé đưa khách giữ làm tin.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3 shadow-xs">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F3E5] text-[#246B38] font-mono text-base font-bold">
                                    2
                                </div>
                                <h3 className="text-base font-bold text-[#17201A]">
                                    Trong lúc khách câu
                                </h3>
                                <p className="text-xs text-[#66716A] leading-relaxed">
                                    Khách gọi thêm lon bò húc, gói cám hay thuê thêm cần, nhân viên bấm 1 chạm thêm vào chòi đó. Máy tự cộng dồn vào hóa đơn thanh toán.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3 shadow-xs">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F3E5] text-[#246B38] font-mono text-base font-bold">
                                    3
                                </div>
                                <h3 className="text-base font-bold text-[#17201A]">
                                    Khách ra về tính tiền
                                </h3>
                                <p className="text-xs text-[#66716A] leading-relaxed">
                                    Nhập số kg cá câu được (nếu hồ có thu cá), máy tự cấn trừ vào tiền giờ. Bấm nút <strong>In bill</strong> cầm tay cái xoẹt, nhận tiền mặt hoặc quét VietQR!
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── CẨM NANG 11 BƯỚC VẬN HÀNH (CHI TIẾT NGHIỆP VỤ) ─────────────── */}
                <section className="py-14 sm:py-16 bg-white border-b border-[#E3E8E3]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                            <span className="inline-block rounded-full bg-[#E8F3E5] px-3 py-0.5 text-xs font-bold text-[#246B38] uppercase">
                                Tài liệu quầy
                            </span>
                            <h2 className="text-2xl font-bold text-[#17201A]">
                                11 bước vận hành hồ câu chuẩn chỉ
                            </h2>
                            <p className="text-xs text-[#66716A]">
                                In ra dán ở quầy cho nhân viên mới xem là yên tâm không sai sót:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ONBOARDING_STEPS.map((step) => (
                                <div
                                    key={step.id}
                                    className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-4 space-y-2 hover:border-[#4F9D5A] transition-all shadow-2xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4F9D5A] text-xs font-bold text-white font-mono">
                                            {step.id}
                                        </span>
                                        <span className="rounded bg-[#E8F3E5] px-1.5 py-0.5 text-[10px] font-bold text-[#246B38]">
                                            {step.badge}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold text-[#17201A]">
                                        {step.title}
                                    </h3>

                                    <p className="text-xs text-[#66716A] leading-relaxed">
                                        {step.summary}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CHỦ HỒ CHIA SẺ THỰC TẾ ───────────────────────────────────────── */}
                <section id="danh-gia" className="py-16 sm:py-20 bg-[#F0F4EF] border-b border-[#E3E8E3]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                            <span className="inline-block rounded-full bg-[#E8F3E5] px-3.5 py-1 text-xs font-bold text-[#246B38] uppercase tracking-wider border border-[#D5E5D1]">
                                Đánh giá thực tế
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17201A]">
                                Anh em chủ hồ nói gì?
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3 shadow-xs">
                                <div className="flex text-[#FBBF24]">★★★★★</div>
                                <p className="text-xs sm:text-sm text-[#17201A] italic leading-relaxed">
                                    &quot;Hồ tui cuối tuần 40-50 cần, trước đây khách câu lố 30-45 phút là bình thường, nhắc thì ngại cãi mất khách. Giờ trên app tự nhảy giờ nhảy tiền, khách tự nhìn đồng hồ trả tiền không ai cằn nhằn câu nào. Tháng rồi thu thêm hơn chục triệu tiền giờ câu.&quot;
                                </p>
                                <div className="border-t border-[#F0F4EF] pt-3">
                                    <p className="text-sm font-bold text-[#17201A]">Anh Bảy</p>
                                    <p className="text-xs text-[#66716A]">Hồ Câu Sông Sài Gòn • Q.12, TP.HCM</p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3 shadow-xs">
                                <div className="flex text-[#FBBF24]">★★★★★</div>
                                <p className="text-xs sm:text-sm text-[#17201A] italic leading-relaxed">
                                    &quot;Bà xã tui ở quầy lớn tuổi hổng rành vi tính, mà app này bấm mở vé với thêm chai nước ngọt nhanh như bấm máy tính cầm tay. Tui mua thêm cái máy in Shopee có mấy trăm ngàn đeo hông đi vòng hồ in bill khách khen xịn xò quá trời!&quot;
                                </p>
                                <div className="border-t border-[#F0F4EF] pt-3">
                                    <p className="text-sm font-bold text-[#17201A]">Anh Hùng</p>
                                    <p className="text-xs text-[#66716A]">Hồ Câu Dịch Vụ Đồng Quê • Bến Lức, Long An</p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-[#E3E8E3] bg-white p-6 space-y-3 shadow-xs">
                                <div className="flex text-[#FBBF24]">★★★★★</div>
                                <p className="text-xs sm:text-sm text-[#17201A] italic leading-relaxed">
                                    &quot;Tôi bận việc cơ quan, giao hồ cho đứa cháu quản lý. Cứ mở điện thoại lên là biết hồ đang có bao nhiêu cần câu, hôm nay thu bao nhiêu tiền mặt, ai chuyển khoản. Nút khóa ca chốt sổ chống sửa số liệu cực kỳ yên tâm.&quot;
                                </p>
                                <div className="border-t border-[#F0F4EF] pt-3">
                                    <p className="text-sm font-bold text-[#17201A]">Anh Tuấn</p>
                                    <p className="text-xs text-[#66716A]">Hồ Câu Sinh Thái Ba Bể • Đông Anh, Hà Nội</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── HỎI ĐÁP NGẮN GỌN (FAQ) ────────────────────────────────────────── */}
                <section id="hoi-dap" className="py-16 sm:py-20 bg-white border-b border-[#E3E8E3]">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
                        <div className="text-center space-y-2">
                            <span className="inline-block rounded-full bg-[#E8F3E5] px-3.5 py-1 text-xs font-bold text-[#246B38] uppercase tracking-wider border border-[#D5E5D1]">
                                Thắc mắc thường gặp
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17201A]">
                                Câu hỏi thật từ các chủ hồ
                            </h2>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-5 space-y-1.5">
                                <h3 className="text-sm sm:text-base font-bold text-[#17201A]">
                                    ❓ Tôi lớn tuổi, mắt kém, không rành công nghệ có tự dùng được không?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Dạ hoàn toàn được ạ! App được làm với chữ to đùng, nút bấm lớn như máy tính bỏ túi. Bạn chỉ cần chạm ngón tay chọn ô rồi bấm <strong>Tạo vé</strong> là xong, không có bước nào rắc rối cả.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-5 space-y-1.5">
                                <h3 className="text-sm sm:text-base font-bold text-[#17201A]">
                                    ❓ Hồ rộng ngoài trời sóng 3G/4G yếu thì có dùng được không?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Dạ mượt mà ạ! App được tối ưu siêu nhẹ (chỉ tốn vài kilobyte cho 1 vé), sóng 1 vạch mạng yếu vẫn mở vé và đếm giờ bình thường.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-5 space-y-1.5">
                                <h3 className="text-sm sm:text-base font-bold text-[#17201A]">
                                    ❓ Máy in nhiệt mini tôi mua trên Shopee/Lazada có kết nối in được không?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Dạ in tốt toàn bộ máy in Bluetooth mini 58mm và 80mm phổ biến trên mạng ạ. Bạn chỉ cần bật Bluetooth điện thoại lên là bấm nút in hóa đơn sắc nét ngay tận chòi.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-5 space-y-1.5">
                                <h3 className="text-sm sm:text-base font-bold text-[#17201A]">
                                    ❓ Sau 7 ngày dùng thử thì tính tiền thế nào?
                                </h3>
                                <p className="text-xs sm:text-sm text-[#66716A] leading-relaxed">
                                    Dạ bạn được dùng thử <strong>7 ngày miễn phí 100%</strong>, không cần nhập thẻ ngân hàng. Sau 7 ngày nếu thấy hồ bớt thất thoát và quản lý sướng hơn, chi phí chỉ từ 99k/tháng (bằng 2 lon bò húc). Đội ngũ có Zalo hướng dẫn cài đặt bảng giá riêng cho hồ bạn 24/7.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── CALL TO ACTION CUỐI TRANG: MỜI DÙNG THỬ 7 NGÀY ──────────────── */}
                <section className="py-16 sm:py-20 bg-linear-to-b from-[#061F13] to-[#0A2E1C] text-white text-center">
                    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-5">
                        <span className="inline-block rounded-full bg-[#4F9D5A] px-3.5 py-1 text-xs font-bold text-white uppercase tracking-wider">
                            Không mất đồng nào • Dùng thử 7 ngày
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            Bắt đầu giữ lại tiền giờ câu ngay từ hôm nay
                        </h2>
                        <p className="text-xs sm:text-sm text-[#C4D9CC] max-w-xl mx-auto leading-relaxed font-normal">
                            Không còn cảnh khách câu lố giờ kèo nhèo. Không lo nhân viên quên ghi sổ đồ uống. Bấm đăng ký 30 giây để biến điện thoại của bạn thành máy POS chuyên nghiệp!
                        </p>
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4F9D5A] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#3D8547] shadow-xl shadow-[#4F9D5A]/25 active:scale-95 transition-all"
                            >
                                <span>Tạo hồ câu &amp; Dùng thử ngay</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                            <Link
                                href="/login"
                                className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#246B38] bg-[#0A2A1A] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#123E27] transition-all"
                            >
                                Đăng nhập quầy thu ngân
                            </Link>
                        </div>
                        <p className="text-xs text-[#86AB94] pt-1">
                            Đăng ký chỉ mất 30 giây bằng số điện thoại • Hỗ trợ Zalo riêng 24/7
                        </p>
                    </div>
                </section>
            </main>

            {/* ── FOOTER (ĐỒNG BỘ TONE APP) ─────────────────────────────────────── */}
            <footer className="border-t border-[#164329] bg-[#04160D] py-8 text-xs text-[#86AB94]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#246B38] text-[#4ADE80] font-bold text-xs">
                                🐟
                            </div>
                            <span className="font-bold text-white text-sm">Quản Lí Hồ Câu</span>
                            <span>—</span>
                            <span className="text-[#A8C9B4]">Phần mềm quản lý hồ câu bỏ túi cho chủ hồ Việt Nam</span>
                        </div>
                        <div className="flex items-center gap-5">
                            <Link href="/login" className="hover:text-white transition-colors">
                                Đăng nhập
                            </Link>
                            <Link href="/register" className="hover:text-white transition-colors">
                                Dùng thử
                            </Link>
                            <a href="https://quanlihocau.com" className="text-[#4ADE80] font-semibold hover:underline">
                                quanlihocau.com
                            </a>
                        </div>
                    </div>

                    <div className="border-t border-[#123620] pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#5A7E6C]">
                        <p>© {new Date().getFullYear()} Quản Lí Hồ Câu. Tối ưu cho mọi dòng điện thoại iPhone &amp; Android.</p>
                        <p>Xây dựng từ thực tế các hồ câu dịch vụ Việt Nam 🇻🇳</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
