import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ONBOARDING_STEPS } from "@/lib/guides/onboarding-data";

export default async function HomePage() {
    const session = await getServerSession(authOptions);

    if (session?.user) {
        redirect("/sessions");
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Quản Lí Hồ Câu",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Android",
        "url": "https://quanlihocau.com",
        "description":
            "Phần mềm vận hành dành riêng cho hồ câu dịch vụ: quản lý phiên câu, ô câu, hóa đơn, kho hàng, chi phí và báo cáo ca rõ ràng cho nhân viên tại quầy.",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "VND",
        },
        "inLanguage": "vi",
        "author": {
            "@type": "Organization",
            "name": "Quản Lí Hồ Câu",
            "url": "https://quanlihocau.com",
        },
    };

    return (
        <div className="min-h-screen bg-[#F4F2EE] text-[#27231F] flex flex-col selection:bg-[#EFE4CF] selection:text-[#8A5A20]">
            {/* JSON-LD for Search Engines */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-[#D9D2C8] bg-white">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#8A5A20] rounded-lg p-1"
                        aria-label="Quản Lí Hồ Câu - Trang chủ"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A5A20] text-white">
                            <svg
                                className="h-5 w-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[13px] font-bold tracking-wider text-[#27231F] uppercase">
                                QUẢN LÍ
                            </span>
                            <span className="text-[11px] font-bold tracking-widest text-[#8A5A20] uppercase">
                                HỒ CÂU
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <Link
                            href="/login"
                            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white px-4 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none transition-colors active:scale-95"
                        >
                            Đăng nhập
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#8A5A20] px-4 sm:px-5 text-xs font-semibold text-white hover:bg-[#704716] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none transition-colors active:scale-95"
                        >
                            Dùng thử miễn phí
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pb-28">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
                            {/* Left Column: Hero Copy */}
                            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#2D6A4F]/30 bg-[#E8F3ED] px-3.5 py-1.5 text-xs font-semibold text-[#2D6A4F]">
                                    <span className="flex h-2 w-2 rounded-full bg-[#2D6A4F]" />
                                    <span>Phần mềm vận hành dành riêng cho hồ câu</span>
                                </div>

                                <h1 className="text-3xl font-bold tracking-tight text-[#27231F] sm:text-5xl lg:text-5xl leading-[1.15]">
                                    Hồ câu vận hành gọn. <br />
                                    <span className="text-[#8A5A20]">Khách vui, chủ yên tâm.</span>
                                </h1>

                                <p className="text-base text-[#766F67] sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Không còn ghi chép sổ tay thất lạc hay tính nhầm giờ câu.
                                    Quản lý trực tiếp phiên câu, đồng hồ đếm lùi, bán thêm đồ dùng,
                                    thu mua cá, kiểm soát chi phí và chốt ca tiền mặt minh bạch.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                                    <Link
                                        href="/register"
                                        className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-[#8A5A20] px-7 py-3 text-sm font-semibold text-white hover:bg-[#704716] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none transition-colors active:scale-95"
                                    >
                                        Bắt đầu sử dụng ngay
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white px-7 py-3 text-sm font-semibold text-[#27231F] hover:bg-[#F4F2EE] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none transition-colors active:scale-95"
                                    >
                                        Vào quầy thu ngân
                                    </Link>
                                </div>

                                {/* Trust Metrics */}
                                <div className="pt-6 border-t border-[#D9D2C8] grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                                    <div>
                                        <p className="text-2xl font-bold text-[#8A5A20] tabular-nums">10 giây</p>
                                        <p className="text-xs text-[#766F67] mt-0.5">Tạo vé mở ca mới</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[#8A5A20] tabular-nums">100%</p>
                                        <p className="text-xs text-[#766F67] mt-0.5">Minh bạch tiền ca</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[#8A5A20] tabular-nums">0 đ</p>
                                        <p className="text-xs text-[#766F67] mt-0.5">Thất thoát giờ câu</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: 2D Interactive Mockup */}
                            <div className="lg:col-span-5 flex justify-center">
                                <div className="w-full max-w-85 rounded-3xl border border-[#D9D2C8] bg-white p-3.5 space-y-3">
                                    {/* Mockup Status Bar */}
                                    <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-[#766F67]">
                                        <span>Hồ Câu Xanh • Ca sáng</span>
                                        <span className="flex items-center gap-1 text-[#2D6A4F]">
                                            <span className="h-2 w-2 rounded-full bg-[#2D6A4F]" />
                                            Đang hoạt động
                                        </span>
                                    </div>

                                    {/* Mockup Active Session Card 1 */}
                                    <div className="rounded-2xl border border-[#D9D2C8] bg-white p-3.5 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-base font-bold text-[#27231F]">
                                                    Chòi VIP 01
                                                </span>
                                                <p className="text-[11px] text-[#766F67]">
                                                    Gói 4 tiếng · <span className="text-[#8A5A20] font-semibold">200.000đ</span>
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-[#2D6A4F]/30 bg-[#E8F3ED] px-2 py-1 text-right">
                                                <div className="text-xs font-bold text-[#2D6A4F] tabular-nums">
                                                    02:45:10
                                                </div>
                                                <p className="text-[9px] uppercase tracking-wider text-[#2D6A4F] font-semibold">
                                                    Thời gian còn
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-[#D9D2C8] pt-2 text-[11px]">
                                            <span className="font-semibold text-[#27231F]">Anh Tuấn (0912***)</span>
                                            <span className="rounded bg-[#EFE4CF] text-[#8A5A20] px-1.5 py-0.5 text-[10px] font-semibold">
                                                +2 Nước ngọt
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mockup Active Session Card 2 (Ending Soon Warning) */}
                                    <div className="rounded-2xl border border-[#9A4C16]/30 bg-white p-3.5 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-base font-bold text-[#27231F]">
                                                    Chòi A04
                                                </span>
                                                <p className="text-[11px] text-[#766F67]">
                                                    Gói 3 tiếng · <span className="text-[#8A5A20] font-semibold">150.000đ</span>
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-[#9A4C16]/30 bg-[#F8ECE2] px-2 py-1 text-right">
                                                <div className="text-xs font-bold text-[#9A4C16] tabular-nums">
                                                    00:08:42
                                                </div>
                                                <p className="text-[9px] uppercase tracking-wider text-[#9A4C16] font-semibold">
                                                    Sắp hết giờ
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                                            <div className="rounded-lg border border-[#D9D2C8] bg-[#F4F2EE] py-1 text-center text-[10px] font-semibold text-[#27231F]">
                                                Gia hạn +1h
                                            </div>
                                            <div className="rounded-lg bg-[#8A5A20] py-1 text-center text-[10px] font-semibold text-white">
                                                Tính tiền &amp; In vé
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mockup Quick Revenue Card */}
                                    <div className="rounded-2xl border border-[#D9D2C8] bg-[#F4F2EE] p-3 flex items-center justify-between text-xs">
                                        <div>
                                            <span className="text-[#766F67]">Doanh thu tạm tính ca:</span>
                                            <p className="font-bold text-[#8A5A20] text-sm tabular-nums">1.450.000đ</p>
                                        </div>
                                        <span className="rounded-lg bg-white border border-[#D9D2C8] px-2.5 py-1 text-[11px] font-semibold text-[#27231F]">
                                            Chốt ca →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4 Pain Points Solved Section */}
                <section className="border-t border-[#D9D2C8] bg-white py-16 sm:py-20">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-2xl mx-auto space-y-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8A5A20]">
                                Giải quyết khó khăn thực tế
                            </h2>
                            <p className="text-2xl font-bold tracking-tight text-[#27231F] sm:text-3xl">
                                4 vấn đề đau đầu nhất của chủ hồ câu
                            </p>
                            <p className="text-xs text-[#766F67]">
                                Được thiết kế dựa trên quy trình thực tế tại các hồ câu dịch vụ.
                            </p>
                        </div>

                        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Pain Point 1 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-[#F4F2EE] p-5 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAECEC] text-[#8B1E1E]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[#27231F]">
                                    Khách câu quá giờ không hay biết
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Đồng hồ đếm lùi tự động đổi màu cảnh báo cam và đỏ khi sắp hết giờ. Nhân viên nhắc khách hoặc gia hạn chỉ bằng 1 chạm.
                                </p>
                            </div>

                            {/* Pain Point 2 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-[#F4F2EE] p-5 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAECEC] text-[#8B1E1E]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[#27231F]">
                                    Ghi chép sổ sách lẫn lộn, quên cộng tiền
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Bán mồi câu, nước ngọt, thuê cần được cộng dồn trực tiếp vào hóa đơn của từng chòi. Không bao giờ bỏ sót món tiền nào.
                                </p>
                            </div>

                            {/* Pain Point 3 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-[#F4F2EE] p-5 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAECEC] text-[#8B1E1E]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[#27231F]">
                                    Thu mua cá tính tay sai lệch, khó bù trừ
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Cân cá tính theo đơn giá kg được khấu trừ thẳng vào hóa đơn câu hoặc thanh toán riêng rõ ràng, không lo nhầm lẫn.
                                </p>
                            </div>

                            {/* Pain Point 4 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-[#F4F2EE] p-5 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAECEC] text-[#8B1E1E]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[#27231F]">
                                    Lệch quỹ cuối ngày khi giao ca
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Tách bạch tiền mặt, chuyển khoản và chi phí mua ngoài. Nút chốt ca khóa số liệu minh bạch, chủ hồ kiểm tra từ xa.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6 Real Features Grid Section */}
                <section className="py-16 sm:py-20">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-2xl mx-auto space-y-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8A5A20]">
                                Tính năng nghiệp vụ thực tế
                            </h2>
                            <p className="text-2xl font-bold tracking-tight text-[#27231F] sm:text-3xl">
                                Đầy đủ công cụ vận hành hồ câu từ A - Z
                            </p>
                            <p className="text-xs text-[#766F67]">
                                Mọi chức năng đều bám sát thực tế thao tác tại quầy và hồ câu.
                            </p>
                        </div>

                        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {/* Feature 1 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-6 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFE4CF] text-[#8A5A20]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    Quản lý phiên câu &amp; Đồng hồ
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Đếm ngược thời gian thực, cảnh báo quá giờ, hỗ trợ ghép nhiều chòi/ô câu vào một phiên duy nhất.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-6 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3ED] text-[#2D6A4F]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    Bán hàng &amp; Kiểm soát kho
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Bán mồi câu, nước giải khát, thuê đồ. Hỗ trợ cảnh báo xuất âm kho khi chưa kịp nhập liệu tồn đầu ngày.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-6 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8ECE2] text-[#9A4C16]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    Thu mua cá chuẩn xác
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Nhập trọng lượng cá câu được, hệ thống tự nhân đơn giá kg và bù trừ công nợ ngay tại hóa đơn thanh toán.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-6 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFE4CF] text-[#8A5A20]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.25-.37-2.53-.37-3.829 0-2.062.33-4.048.94-5.91a2.25 2.25 0 0 1 2.15-1.59h5.12a2.25 2.25 0 0 1 2.15 1.59c.61 1.862.94 3.848.94 5.91 0 1.3-.13 2.58-.37 3.829m-10.61 0a2.25 2.25 0 0 0-2.15 1.59A18.784 18.784 0 0 0 2.25 19.5h19.5c-.376-1.54-.93-2.99-1.63-4.329a2.25 2.25 0 0 0-2.15-1.59m-13.24 0h13.24" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    Ghi nhận chi phí phát sinh
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Ghi nhận tiền mua cá giống, tiền đá lạnh, tiền điện nước hoặc chi phí sửa chữa lặt vặt trực tiếp trong ca.
                                </p>
                            </div>

                            {/* Feature 5 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-6 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3ED] text-[#2D6A4F]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    Báo cáo ngày &amp; Chốt ca
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Đối chiếu doanh thu thực thu ròng, tách tiền mặt và chuyển khoản. Khóa ca minh bạch khi bàn giao giữa các ca trực.
                                </p>
                            </div>

                            {/* Feature 6 */}
                            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-6 space-y-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFE4CF] text-[#8A5A20]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    In nhiệt thật trên Android
                                </h3>
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Tích hợp máy in bỏ túi 58mm/80mm qua Bluetooth, USB-OTG hoặc Wi-Fi. In vé mở ca và biên lai thu tiền tức thì.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Public Onboarding Guide Section (No login required) */}
                <section id="huong-dan" className="border-t border-[#D9D2C8] bg-[#FDF9F0] py-14 sm:py-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
                        <div className="text-center space-y-3 max-w-2xl mx-auto">
                            <span className="inline-block rounded-full bg-[#EFE4CF] px-3 py-1 text-xs font-bold text-[#8A5A20] uppercase tracking-wider">
                                Cẩm nang 10 phút
                            </span>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-[#27231F]">
                                11 bước vận hành hồ câu chuẩn mực
                            </h2>
                            <p className="text-xs sm:text-sm text-[#766F67] leading-relaxed">
                                Hướng dẫn chi tiết, ngắn gọn, dễ hiểu. Nhân viên mới đọc là làm theo được ngay mà không lo thất thoát hay tính nhầm tiền.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ONBOARDING_STEPS.map((step) => (
                                <div
                                    key={step.id}
                                    className="rounded-2xl border border-[#D9D2C8] bg-white p-4 space-y-2.5 hover:border-[#8A5A20] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8A5A20] text-xs font-bold text-white font-mono">
                                                {step.id}
                                            </span>
                                            <span className="rounded bg-[#EFE4CF] px-1.5 py-0.2 text-[10px] font-bold text-[#8A5A20] uppercase">
                                                {step.badge}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-bold text-[#27231F]">
                                        {step.title}
                                    </h3>

                                    <p className="text-xs text-[#766F67] leading-relaxed">
                                        {step.summary}
                                    </p>

                                    <div className="rounded-xl bg-[#F8F6F0] p-2.5 text-[11px] text-[#27231F] space-y-1">
                                        <p className="font-semibold text-[#8A5A20]">Thao tác:</p>
                                        <p className="text-[#766F67] leading-relaxed">{step.instructions[0]}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Practical Operational Callout */}
                <section className="border-t border-[#D9D2C8] bg-[#27231F] text-white py-14 sm:py-16">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
                        <span className="inline-block rounded-full bg-[#8A5A20] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                            Thao tác trực tiếp tại quầy
                        </span>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-white">
                            Nhân viên mới làm quen chỉ mất 10 phút
                        </h2>
                        <p className="text-sm text-[#D9D2C8] max-w-xl mx-auto leading-relaxed">
                            Giao diện nút bấm to bản, thông tin rõ ràng và tối ưu hoàn toàn cho điện thoại di động.
                            Không cần cài đặt phức tạp, mở trình duyệt là sử dụng ngay.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/register"
                                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#8A5A20] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#704716] transition-colors"
                            >
                                Đăng ký tạo hồ câu ngay
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#D9D2C8] bg-white py-8 text-xs text-[#766F67]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[#27231F]">Quản Lí Hồ Câu</span>
                        <span>—</span>
                        <span>Phần mềm vận hành hồ câu dịch vụ</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="hover:text-[#27231F] transition-colors">
                            Đăng nhập
                        </Link>
                        <Link href="/register" className="hover:text-[#27231F] transition-colors">
                            Đăng ký
                        </Link>
                        <span>quanlihocau.com</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
