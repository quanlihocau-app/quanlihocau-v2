"use client";

import Link from "next/link";
import React, { useState } from "react";
import { DualPhoneHeroMockup } from "./dual-phone-hero-mockup";
import { InteractiveAppShowcase } from "./interactive-app-showcase";
import { MobileContactBar } from "./mobile-contact-bar";

interface OfficialLandingPageProps {
    isLoggedIn?: boolean;
}

export function OfficialLandingPage({ isLoggedIn = false }: OfficialLandingPageProps) {
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const toggleFaq = (idx: number) => {
        setOpenFaq(openFaq === idx ? null : idx);
    };

    return (
        <div className="min-h-screen bg-[#061F13] text-[#17201A] flex flex-col selection:bg-[#E8F3E5] selection:text-[#246B38] antialiased">
            {/* ── 1. HEADER (Thanh điều hướng) ─────────────────────────────────── */}
            <header className="sticky top-0 z-40 w-full border-b border-[#143B25] bg-[#061F13]/95 backdrop-blur-md text-white">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Logo & Brand */}
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 group focus:outline-none rounded-xl"
                        aria-label="Quản Lý Hồ Câu - Trang chủ"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#246B38] text-[#4ADE80] border border-[#2F7E47] shadow-xs group-hover:scale-105 transition-transform">
                            {/* Curved Fishing Hook Icon */}
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17 3v4a5 5 0 0 1-10 0v-1m0 0l-2 2m2-2l2 2m-2-1v5a7 7 0 0 0 14 0V9a2 2 0 0 0-2-2h-1"
                                />
                            </svg>
                        </div>
                        <span className="text-base sm:text-lg font-black tracking-tight text-white">
                            Quản Lý Hồ Câu
                        </span>
                    </Link>

                    {/* Navigation Menu Desktop */}
                    <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold text-[#A8C9B4]">
                        <a href="#noi-dau" className="hover:text-white transition-colors">
                            Lợi ích
                        </a>
                        <a href="#mo-hinh" className="hover:text-white transition-colors">
                            Mô hình
                        </a>
                        <a href="#tinh-nang" className="hover:text-white transition-colors">
                            Tính năng
                        </a>
                        <a href="#so-sanh" className="hover:text-white transition-colors">
                            So sánh
                        </a>
                        <a href="#quy-trinh" className="hover:text-white transition-colors">
                            Cách dùng
                        </a>
                        <a href="#hoi-dap" className="hover:text-white transition-colors">
                            Hỏi đáp
                        </a>
                    </nav>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 sm:gap-2.5">
                        {isLoggedIn ? (
                            <Link
                                href="/sessions"
                                className="inline-flex min-h-9.5 items-center justify-center gap-1.5 rounded-xl bg-[#4F9D5A] px-4 py-1.5 text-xs font-black text-white hover:bg-[#3D8547] shadow-sm transition-all"
                            >
                                <span>Vào ứng dụng</span>
                                <span>→</span>
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/bang-gia"
                                    className="hidden sm:inline-flex min-h-9.5 items-center justify-center rounded-xl px-2.5 text-xs font-bold text-[#D5E5D1] hover:text-white transition-all"
                                >
                                    Bảng giá
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex min-h-9.5 items-center justify-center rounded-xl border border-[#246B38] bg-[#0A2A1A] px-3 sm:px-3.5 text-xs font-bold text-[#D5E5D1] hover:text-white hover:bg-[#123E27] transition-all"
                                >
                                    Đăng nhập
                                </Link>
                                <Link
                                    href="/register"
                                    className="inline-flex min-h-9.5 items-center justify-center gap-1.5 rounded-xl bg-[#4F9D5A] px-3.5 sm:px-4 text-xs font-black text-white hover:bg-[#3D8547] transition-all shadow-md shadow-[#4F9D5A]/25"
                                >
                                    <span>Dùng miễn phí</span>
                                    <span className="hidden sm:inline">7 ngày</span>
                                    <span>→</span>
                                </Link>
                            </>
                        )}
                        <a
                            href="https://zalo.me/0855550813"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden lg:inline-flex min-h-9.5 items-center justify-center rounded-xl bg-[#133F25] border border-[#2F7E47] px-3 text-xs font-bold text-white hover:bg-[#1A5231] transition-all shadow-xs"
                            title="Tư vấn hotline/Zalo: 0855 550 813"
                        >
                            Tư vấn: 0855 550 813
                        </a>
                    </div>
                </div>
            </header>

            {/* ── 2. MAIN BODY ─────────────────────────────────────────────────── */}
            <main className="flex-1 pb-24 md:pb-0">
                {/* ── 3. HERO SECTION (Khớp mẫu đã duyệt) ────────────────────────── */}
                <section className="relative overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20 bg-linear-to-b from-[#061F13] via-[#092B1B] to-[#0D3823] text-white">
                    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
                            {/* Left Column: Authentic Hook & Punchy Copy */}
                            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                                {/* Small Badge */}
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#246B38] bg-[#0E3621] px-4 py-1.5 text-xs font-bold text-[#52D879] shadow-xs">
                                    <span className="flex h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
                                    <span>APP CHO CHỦ HỒ — PHIÊN BẢN V2 DỄ DÙNG, MƯỢT MÀ</span>
                                </div>

                                {/* Main Heading */}
                                <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl leading-[1.15] text-white">
                                    <span className="block text-xs sm:text-sm font-bold tracking-widest text-[#52D879] uppercase mb-2">
                                        PHẦN MỀM QUẢN LÝ HỒ CÂU CHUYÊN NGHIỆP
                                    </span>
                                    Hồ đông vẫn nhàn. <br />
                                    <span className="text-[#52D879]">Tiền hàng vẫn rõ.</span>
                                </h1>

                                {/* Description */}
                                <p className="text-sm sm:text-base text-[#C4D9CC] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                                    App cho chủ hồ câu quản lý vé câu, nhân viên, hàng hóa và doanh thu ngay trên điện thoại. Dù đang ở nhà hay đi xa, chủ hồ vẫn biết hôm nay hồ có bao nhiêu khách, bán gì và thu bao nhiêu tiền.
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
                                    <Link
                                        href={isLoggedIn ? "/sessions" : "/register"}
                                        className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#4F9D5A] px-7 py-3.5 text-sm sm:text-base font-black text-white hover:bg-[#3D8547] shadow-xl shadow-[#4F9D5A]/35 active:scale-95 transition-all text-center"
                                    >
                                        <span>{isLoggedIn ? "Vào ứng dụng ngay" : "Bắt đầu dùng thử miễn phí 7 ngày"}</span>
                                        <span>→</span>
                                    </Link>
                                    <Link
                                        href={isLoggedIn ? "/sessions" : "/login"}
                                        className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-[#246B38] bg-[#0A2A1A]/90 backdrop-blur-xs px-6 py-3.5 text-sm sm:text-base font-bold text-[#D5E5D1] hover:text-white hover:bg-[#123E27] transition-all text-center"
                                    >
                                        <span>{isLoggedIn ? "Quầy thu ngân" : "Đăng nhập tài khoản"}</span>
                                    </Link>
                                </div>

                                {/* Reassurance Tagline */}
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-xs text-[#52D879] font-semibold pt-0.5">
                                    <span>🎁 Miễn phí 7 ngày</span>
                                    <span>•</span>
                                    <span>⚡ Kích hoạt 30 giây</span>
                                    <span>•</span>
                                    <span>🛡️ Không cần thẻ ngân hàng</span>
                                </div>

                                {/* 3 Trust Checkmarks */}
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs sm:text-sm text-[#86AB94] pt-2 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span className="text-white">Dùng tốt trên điện thoại</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span className="text-white">Không cần giỏi công nghệ</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[#4ADE80] font-bold">✓</span>
                                        <span className="text-white">Hỗ trợ tận tình</span>
                                    </span>
                                </div>
                            </div>

                            {/* Right Column: Dual Phone Realistic Mockup */}
                            <div className="lg:col-span-6 flex justify-center">
                                <DualPhoneHeroMockup />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 4. PHẦN NỖI ĐAU CỦA CHỦ HỒ ─────────────────────────────────── */}
                <section id="noi-dau" className="scroll-mt-16 py-16 sm:py-24 bg-[#082417] text-white border-t border-[#123824]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-bold text-[#52D879]">
                                NỖI LO THỰC TẾ TẠI HỒ CÂU
                            </span>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
                                Không phải hồ vắng mới đáng lo. <br />
                                <span className="text-[#FBBF24]">Hồ đông mà không kiểm soát mới đáng lo.</span>
                            </h2>
                            <p className="text-sm sm:text-base text-[#A3C7B0]">
                                Rất nhiều chủ hồ doanh thu trên sổ rất cao nhưng cuối tháng kiểm lại tiền mặt thì hao hụt không rõ lý do.
                            </p>
                        </div>

                        {/* 4 Pain-Point Cards */}
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card 1: Quản lý từ xa */}
                            <div className="rounded-3xl border border-[#1E4D34] bg-[#0C2D1F] p-6 sm:p-8 space-y-4 shadow-lg hover:border-[#3E9B4F] transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19452C] text-[#52D879]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white">Quản lý từ xa</h3>
                                <p className="text-sm sm:text-base font-semibold text-[#FBBF24] italic">
                                    “Không có mặt ở hồ là không biết đang xảy ra chuyện gì.”
                                </p>
                                <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                    Chủ hồ chỉ cần mở điện thoại là xem được ngay ô nào đang câu, chòi nào còn trống, vé nào sắp hết giờ và nhân viên tại quầy vừa thực hiện thao tác gì.
                                </p>
                            </div>

                            {/* Card 2: Quản lý tiền */}
                            <div className="rounded-3xl border border-[#1E4D34] bg-[#0C2D1F] p-6 sm:p-8 space-y-4 shadow-lg hover:border-[#3E9B4F] transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19452C] text-[#52D879]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white">Quản lý tiền</h3>
                                <p className="text-sm sm:text-base font-semibold text-[#FBBF24] italic">
                                    “Tiền vé, tiền hàng và tiền thu cá dễ bị lẫn.”
                                </p>
                                <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                    Mỗi khoản thu chi đều được hệ thống tự động ghi nhận theo đúng phiên câu, rõ người thu, chính xác thời điểm và tách biệt tiền mặt với chuyển khoản.
                                </p>
                            </div>

                            {/* Card 3: Quản lý hàng hóa */}
                            <div className="rounded-3xl border border-[#1E4D34] bg-[#0C2D1F] p-6 sm:p-8 space-y-4 shadow-lg hover:border-[#3E9B4F] transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19452C] text-[#52D879]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white">Quản lý hàng hóa</h3>
                                <p className="text-sm sm:text-base font-semibold text-[#FBBF24] italic">
                                    “Bán nước, mồi, đồ ăn nhiều nhưng cuối ngày khó đối.”
                                </p>
                                <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                    Cho phép thêm hàng nhanh ngay trong vé đang câu, nhập kho đơn giản và kiểm soát số lượng bán ra từng chai nước, gói cám theo thời gian thực.
                                </p>
                            </div>

                            {/* Card 4: Quản lý nhân viên */}
                            <div className="rounded-3xl border border-[#1E4D34] bg-[#0C2D1F] p-6 sm:p-8 space-y-4 shadow-lg hover:border-[#3E9B4F] transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19452C] text-[#52D879]">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-white">Quản lý nhân viên</h3>
                                <p className="text-sm sm:text-base font-semibold text-[#FBBF24] italic">
                                    “Giao ca bằng miệng, sửa vé không có lý do.”
                                </p>
                                <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                    Nhật ký hệ thống minh bạch giúp chủ hồ biết chính xác nhân viên nào tạo vé, thu tiền, bán hàng, sửa đổi hoặc hủy giao dịch, triệt tiêu tranh cãi giao ca.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 4.5. PHẦN CÁC MÔ HÌNH HỒ CÂU THỰC TẾ (SEO SEMANTIC TARGETING) ─ */}
                <section id="mo-hinh" className="scroll-mt-16 py-16 sm:py-24 bg-[#061F13] text-white border-t border-[#123824]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-bold text-[#52D879]">
                                THIẾT KẾ CHO MỌI QUY MÔ HỒ
                            </span>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
                                Dù bạn vận hành mô hình hồ câu nào, <br />
                                <span className="text-[#52D879]">chúng tôi đều có luồng quản lý tối ưu.</span>
                            </h2>
                            <p className="text-sm sm:text-base text-[#A3C7B0]">
                                Không gò bó trong một khuôn mẫu. Phần mềm linh hoạt cấu hình theo đúng luật chơi và cách tính tiền của từng hồ.
                            </p>
                        </div>

                        {/* 4 Models Grid */}
                        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* Model 1: Hồ câu đài & câu đơn */}
                            <div className="rounded-3xl border border-[#1A452C] bg-[#0C2D1F] p-6 space-y-3 hover:border-[#4ADE80] transition-all flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16432A] text-2xl">
                                        🎣
                                    </div>
                                    <h3 className="text-lg font-black text-white">Hồ câu đài & câu đơn</h3>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                        Đặc thù tính theo ca 3h, 4h, 5h hoặc tính giờ lẻ. Phần mềm tự động đếm ngược từng giây, báo chuông hết giờ và tự nhảy tiền phụ thu khi cần thủ câu lố thời gian.
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-[#1A452C] text-[11px] font-bold text-[#52D879]">
                                    ✓ Đếm giờ • Phụ thu lố giờ tự động
                                </div>
                            </div>

                            {/* Model 2: Hồ câu lure & cá thịt */}
                            <div className="rounded-3xl border border-[#1A452C] bg-[#0C2D1F] p-6 space-y-3 hover:border-[#4ADE80] transition-all flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16432A] text-2xl">
                                        🐟
                                    </div>
                                    <h3 className="text-lg font-black text-white">Hồ câu lure & cá thịt</h3>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                        Quản lý vé câu buổi, câu ngày hoặc giải câu mini. Hỗ trợ tính năng thu mua lại cá (cá chẽm, cá lóc, cá tra...) với đơn giá theo kg, tự động cấn trừ thẳng vào hóa đơn.
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-[#1A452C] text-[11px] font-bold text-[#52D879]">
                                    ✓ Cân cá thu mua • Cấn trừ bill tức thì
                                </div>
                            </div>

                            {/* Model 3: Hồ câu giải trí & câu tôm */}
                            <div className="rounded-3xl border border-[#1A452C] bg-[#0C2D1F] p-6 space-y-3 hover:border-[#4ADE80] transition-all flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16432A] text-2xl">
                                        🦐
                                    </div>
                                    <h3 className="text-lg font-black text-white">Hồ câu giải trí & ẩm thực</h3>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                        Khách vừa câu vừa gọi món ăn, đồ uống, bia bọt, mồi câu. Nhân viên gọi thêm món ngay trên điện thoại vào số chòi/ô, chốt tổng bill khi khách ra về không lo sót món.
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-[#1A452C] text-[11px] font-bold text-[#52D879]">
                                    ✓ Bán mồi & bia nước • Chốt bàn/chòi
                                </div>
                            </div>

                            {/* Model 4: Hồ sinh thái nhiều khu */}
                            <div className="rounded-3xl border border-[#1A452C] bg-[#0C2D1F] p-6 space-y-3 hover:border-[#4ADE80] transition-all flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16432A] text-2xl">
                                        🏕️
                                    </div>
                                    <h3 className="text-lg font-black text-white">Hồ sinh thái quy mô lớn</h3>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                        Chia nhiều phân khu (Hồ A, Hồ B, Chòi VIP, Bờ câu giải trí). Phân quyền nhiều nhân viên trực quầy và bờ, chủ hồ ngồi một chỗ giám sát toàn bộ hoạt động theo thời gian thực.
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-[#1A452C] text-[11px] font-bold text-[#52D879]">
                                    ✓ Quản lý đa khu • Phân quyền nhân viên
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 5. PHẦN TÍNH NĂNG THỰC TẾ CỦA ỨNG DỤNG ─────────────────────── */}
                <section id="tinh-nang" className="scroll-mt-16 py-16 sm:py-24 bg-[#0A291A] text-white">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-bold text-[#52D879]">
                                ĐẦY ĐỦ VÀ THỰC TẾ
                            </span>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                                Một ứng dụng. Quản lý trọn hồ.
                            </h2>
                            <p className="text-sm sm:text-base text-[#A3C7B0]">
                                Mọi tính năng đều được xây dựng từ nhu cầu thực tế bên bờ hồ, không có tính năng thừa gây rối rắm.
                            </p>
                        </div>

                        {/* Grid of Real Features */}
                        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[
                                {
                                    title: "Quản lý nhân viên từ xa",
                                    desc: "Phân quyền chủ hồ, quản lý và thu ngân. Biết chính xác ai đang trực và thao tác gì.",
                                    icon: "👥",
                                },
                                {
                                    title: "Theo dõi doanh thu trên điện thoại",
                                    desc: "Doanh thu tiền vé, tiền dịch vụ nhảy số tức thì theo từng giao dịch hoàn tất.",
                                    icon: "📱",
                                },
                                {
                                    title: "Tạo vé nhanh & chọn nhiều ô câu",
                                    desc: "Mở vé trong 3 giây. Cho phép chọn cùng lúc nhiều ô bờ ngang, bờ dọc cho đoàn khách.",
                                    icon: "⚡",
                                },
                                {
                                    title: "Đồng hồ đếm ngược cho từng phiên",
                                    desc: "Đếm ngược chính xác từng giây. Tự động tính tiền phụ thu khi khách câu lố giờ.",
                                    icon: "⏱️",
                                },
                                {
                                    title: "Nhập hàng hóa đơn giản",
                                    desc: "Nhập nước giải khát, mồi câu, đồ ăn trong vài thao tác, quản lý tồn kho tức thời.",
                                    icon: "📦",
                                },
                                {
                                    title: "Bán nước, mồi & đồ ăn ngay trong vé",
                                    desc: "Khách gọi thêm món là bấm cộng vào vé đang câu, không sợ quên tính khi trả cần.",
                                    icon: "🥤",
                                },
                                {
                                    title: "Thu tiền trước hoặc thu tiền sau",
                                    desc: "Linh hoạt thu tiền vé ngay lúc vào cổng hoặc gom tất cả thanh toán một lần khi ra về.",
                                    icon: "💳",
                                },
                                {
                                    title: "Đa dạng phương thức thanh toán",
                                    desc: "Hỗ trợ tiền mặt, chuyển khoản quét mã VietQR tự động và thanh toán kết hợp.",
                                    icon: "📲",
                                },
                                {
                                    title: "In vé tạm và bill khổ 58mm",
                                    desc: "In bill nhiệt 58mm cầm tay nhỏ gọn, in vé đeo cho cần thủ và hóa đơn chi tiết.",
                                    icon: "🖨️",
                                },
                                {
                                    title: "Nhật ký hoạt động của nhân viên",
                                    desc: "Ghi nhận mọi thao tác: tạo vé, nhận tiền, sửa bill, hủy ca để đối soát khi chốt ca.",
                                    icon: "📋",
                                },
                                {
                                    title: "Báo cáo theo ngày, tháng và năm",
                                    desc: "Biểu đồ trực quan so sánh lượng khách, ngày đông khách nhất và mặt hàng bán chạy.",
                                    icon: "📊",
                                },
                                {
                                    title: "Hạn chế thất thoát tiền & hàng",
                                    desc: "Khóa chặt quy trình thu chi, triệt tiêu tình trạng nhân viên tự ý bớt tiền hoặc quên ghi.",
                                    icon: "🛡️",
                                },
                                {
                                    title: "Lưu tạm khi mạng chập chờn",
                                    desc: "Cơ chế lưu trữ offline giúp tiếp tục mở vé, ghi hàng thiết yếu ngay cả khi sóng yếu.",
                                    icon: "📶",
                                },
                            ].map((feat, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-2xl border border-[#1A452C] bg-[#0C2D1F] p-5 space-y-2.5 hover:border-[#3E9B4F] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18482C] text-lg">
                                            {feat.icon}
                                        </span>
                                        <h3 className="text-sm sm:text-base font-bold text-white">
                                            {feat.title}
                                        </h3>
                                    </div>
                                    <p className="text-xs sm:text-sm text-[#A8C9B4] leading-relaxed">
                                        {feat.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 6. QUY TRÌNH SỬ DỤNG 5 BƯỚC ─────────────────────────────────── */}
                <section id="quy-trinh" className="scroll-mt-16 py-16 sm:py-24 bg-[#082417] text-white border-t border-[#143B25]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-bold text-[#52D879]">
                                ĐƠN GIẢN — RÕ RÀNG
                            </span>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                                5 bước, từ khách vào đến lúc ra về.
                            </h2>
                            <p className="text-sm sm:text-base text-[#A3C7B0]">
                                Quy trình khép kín giúp bất kỳ nhân viên nào cũng thao tác thành thục sau 10 phút làm quen.
                            </p>
                        </div>

                        {/* 5 Steps Grid */}
                        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                {
                                    step: "01",
                                    title: "Tạo vé",
                                    desc: "Chọn khách quen hoặc khách lẻ, chạm chọn ô câu trên sơ đồ và chọn gói ca câu.",
                                },
                                {
                                    step: "02",
                                    title: "Thu tạm",
                                    desc: "Thu trước tiền vé hoặc bấm chọn 'Thu sau' để gom tính lúc trả chòi.",
                                },
                                {
                                    step: "03",
                                    title: "Bán thêm",
                                    desc: "Khách gọi thêm nước ngọt, bia, mồi câu hay đồ ăn thì bấm thêm trực tiếp vào vé.",
                                },
                                {
                                    step: "04",
                                    title: "Kết thúc",
                                    desc: "Tính tiền quá giờ tự động, cân cá mua lại để cấn trừ tiền ngay trên màn hình.",
                                },
                                {
                                    step: "05",
                                    title: "In bill",
                                    desc: "In hóa đơn 58mm cho khách, dữ liệu tự động lưu trọn vẹn vào Nhật ký và Báo cáo ca.",
                                },
                            ].map((item, idx) => (
                                <div
                                    key={idx}
                                    className="relative rounded-2xl border border-[#1C4D32] bg-[#0C2D1F] p-5 space-y-3 shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#246B38] text-xs font-black text-[#52D879]">
                                            {item.step}
                                        </span>
                                        <span className="text-[10px] font-bold text-[#66716A] uppercase tracking-wider">
                                            Bước {idx + 1}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-extrabold text-white">{item.title}</h3>
                                    <p className="text-xs text-[#B2D8BF] leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 7. PHẦN TRÌNH DIỄN ỨNG DỤNG TƯƠNG TÁC (4 TABS) ──────────────── */}
                <InteractiveAppShowcase />

                {/* ── 7.2. PHẦN BẢNG SO SÁNH CHUYÊN BIỆT (SEO COMPARISON TABLE) ──── */}
                <section id="so-sanh" className="scroll-mt-16 py-16 sm:py-24 bg-[#082417] text-white border-t border-[#143B25]">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-bold text-[#52D879]">
                                TẠI SAO CẦN PHẦN MỀM CHUYÊN BIỆT CHO HỒ CÂU?
                            </span>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                                So sánh với Sổ tay, Excel và Phần mềm bán hàng chung
                            </h2>
                            <p className="text-sm sm:text-base text-[#A3C7B0]">
                                Phần mềm bán hàng thông thường (KiotViet, Sapo) thiết kế cho tạp hóa hoặc quán ăn, hoàn toàn thiếu các nghiệp vụ sống còn của một hồ câu dịch vụ.
                            </p>
                        </div>

                        {/* Comparison Table */}
                        <div className="mt-12 overflow-x-auto rounded-3xl border border-[#1E4D34] bg-[#0C2D1F] shadow-2xl">
                            <table className="w-full text-left border-collapse min-w-160">
                                <thead>
                                    <tr className="border-b border-[#1A452C] bg-[#071F14]">
                                        <th className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-[#A8C9B4] uppercase tracking-wider w-[35%]">
                                            Nghiệp vụ hồ câu thực tế
                                        </th>
                                        <th className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-[#86AB94] text-center w-[20%]">
                                            Sổ tay / Excel
                                        </th>
                                        <th className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-[#86AB94] text-center w-[22%]">
                                            KiotViet / Sapo chung
                                        </th>
                                        <th className="p-4 sm:p-5 text-xs sm:text-sm font-black text-[#52D879] text-center w-[23%] bg-[#103E26]">
                                            ⭐ Quản Lý Hồ Câu
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#153D27] text-xs sm:text-sm">
                                    {[
                                        {
                                            criteria: "Đồng hồ đếm ngược phiên câu theo từng ô/chòi",
                                            manual: "❌ Dễ quên, khách cãi",
                                            pos: "❌ Không hỗ trợ",
                                            app: "✅ Chuẩn từng giây, chuông báo",
                                        },
                                        {
                                            criteria: "Tự động tính phụ thu khi câu quá giờ",
                                            manual: "❌ Phải tự nhẩm tính",
                                            pos: "❌ Phải sửa giá bằng tay",
                                            app: "✅ Tự động cộng chính xác theo phút",
                                        },
                                        {
                                            criteria: "Sơ đồ trực quan bờ hồ & trạng thái ô câu",
                                            manual: "❌ Không có",
                                            pos: "❌ Chỉ có sơ đồ bàn ăn",
                                            app: "✅ Sơ đồ trực quan chạm mở vé 3 giây",
                                        },
                                        {
                                            criteria: "Bán mồi nước, đồ ăn cộng dồn vào vé đang câu",
                                            manual: "❌ Hay ghi thiếu, sót món",
                                            pos: "⚠️ Thao tác rườm rà nhiều bước",
                                            app: "✅ Chạm cộng ngay vào vé chỉ 1 giây",
                                        },
                                        {
                                            criteria: "Cân mua lại cá & tự cấn trừ vào hóa đơn",
                                            manual: "❌ Tính nhẩm ngoài giấy",
                                            pos: "❌ Không có tính năng mua lại cá",
                                            app: "✅ Cân ký, chọn loại cá, cấn trừ tự động",
                                        },
                                        {
                                            criteria: "Chủ hồ theo dõi doanh thu từ xa trên điện thoại",
                                            manual: "❌ Phải chờ nhân viên gọi báo",
                                            pos: "⚠️ Giao diện máy tính rườm rà",
                                            app: "✅ Mở điện thoại thấy ngay từng giao dịch",
                                        },
                                        {
                                            criteria: "In bill nhiệt 58mm cầm tay qua Bluetooth/Wifi",
                                            manual: "❌ Viết tay mất thời gian",
                                            pos: "⚠️ Thường bắt buộc máy tính & máy in to",
                                            app: "✅ In tức thì từ điện thoại, máy in nhỏ gọn",
                                        },
                                        {
                                            criteria: "Độ dễ dùng cho nhân viên bờ hồ lớn tuổi",
                                            manual: "⚠️ Dễ nhầm lẫn số liệu",
                                            pos: "❌ Quá nhiều màn hình phức tạp",
                                            app: "✅ Nút bấm to, thuần Việt, 10 phút là thạo",
                                        },
                                    ].map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[#0E3524]/60 transition-colors">
                                            <td className="p-4 sm:p-5 font-medium text-white">
                                                {row.criteria}
                                            </td>
                                            <td className="p-4 sm:p-5 text-center text-[#9CA3AF]">
                                                {row.manual}
                                            </td>
                                            <td className="p-4 sm:p-5 text-center text-[#9CA3AF]">
                                                {row.pos}
                                            </td>
                                            <td className="p-4 sm:p-5 text-center font-bold text-[#52D879] bg-[#103E26]/40">
                                                {row.app}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ── 7.5. PHẦN CTA GIỮA TRANG (DÙNG THỬ MIỄN PHÍ) ───────────────── */}
                <section className="py-12 sm:py-16 bg-[#061F13] text-white border-t border-[#143B25]">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                        <div className="relative overflow-hidden rounded-3xl border-2 border-[#2F7E47] bg-linear-to-r from-[#0E3621] via-[#144A2D] to-[#0A2818] p-7 sm:p-12 shadow-2xl">
                            {/* Decorative background ambient glows */}
                            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#4ADE80]/15 blur-3xl" />
                            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#246B38]/30 blur-3xl" />

                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                <div className="lg:col-span-7 space-y-3.5 text-center lg:text-left">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/40 bg-[#0E3621] px-3.5 py-1 text-xs font-black text-[#52D879]">
                                        🎁 DÙNG THỬ TRỌN VẸN TÍNH NĂNG
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
                                        Sẵn sàng để hồ câu của bạn <br className="hidden sm:inline" />
                                        vận hành nhàn và rõ ràng hơn?
                                    </h2>
                                    <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                        Đăng ký ngay tài khoản Chủ hồ để trải nghiệm 7 ngày đầy đủ tính năng: tạo vé câu, sơ đồ chòi, đếm giờ tự động, bán hàng quầy và xem báo cáo doanh thu từ xa.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-1 text-xs text-[#A8C9B4]">
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-[#4ADE80] font-bold">✓</span>
                                            <span>Không cần cài đặt rườm rà</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-[#4ADE80] font-bold">✓</span>
                                            <span>Mở trên điện thoại là dùng</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-[#4ADE80] font-bold">✓</span>
                                            <span>Hỗ trợ vẽ sơ đồ hồ miễn phí</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 justify-center">
                                    <Link
                                        href={isLoggedIn ? "/sessions" : "/register"}
                                        className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#4F9D5A] px-7 py-3.5 text-sm sm:text-base font-black text-white hover:bg-[#3D8547] shadow-xl shadow-[#4F9D5A]/40 active:scale-95 transition-all text-center"
                                    >
                                        <span>{isLoggedIn ? "Vào ứng dụng ngay →" : "Đăng ký dùng miễn phí 7 ngày →"}</span>
                                    </Link>
                                    <Link
                                        href={isLoggedIn ? "/sessions" : "/login"}
                                        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#2F7E47] bg-[#071D12]/90 px-6 py-3 text-xs sm:text-sm font-bold text-[#D5E5D1] hover:text-white hover:bg-[#123E27] transition-all text-center"
                                    >
                                        <span>{isLoggedIn ? "Quầy thu ngân" : "Đã có tài khoản? Đăng nhập"}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 8. PHẦN TẠO NIỀM TIN ───────────────────────────────────────── */}
                <section className="py-16 sm:py-24 bg-linear-to-b from-[#082417] to-[#061F13] text-white border-t border-[#123824]">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
                        <div className="rounded-3xl border border-[#246B38]/60 bg-[#0C2E1F] p-8 sm:p-12 shadow-2xl space-y-6">
                            <span className="text-3xl sm:text-4xl text-[#4ADE80]">“</span>
                            <blockquote className="text-lg sm:text-2xl font-bold text-white leading-relaxed tracking-tight">
                                Không cần phần mềm có thật nhiều chức năng. <br className="hidden sm:inline" />
                                Cần phần mềm giúp nhân viên làm đúng và chủ hồ nhìn là hiểu.
                            </blockquote>
                            <div className="pt-2">
                                <p className="text-xs sm:text-sm font-extrabold text-[#52D879] tracking-wider uppercase">
                                    XUẤT PHÁT TỪ THỰC TẾ
                                </p>
                                <p className="text-xs sm:text-sm text-[#A8C9B4] mt-1 font-medium">
                                    Phát triển từ quy trình vận hành thực tế của Hồ Câu Kim Thông — Đức Trọng, Lâm Đồng.
                                </p>
                            </div>
                        </div>

                        {/* 4 Pillars */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                            <div className="rounded-2xl border border-[#1A452C] bg-[#0A2518] p-4 space-y-1">
                                <p className="text-xs font-black text-[#52D879]">TỐI ƯU MOBILE</p>
                                <p className="text-[11px] text-[#A8C9B4]">Chạy mượt cả giờ cao điểm đông khách</p>
                            </div>
                            <div className="rounded-2xl border border-[#1A452C] bg-[#0A2518] p-4 space-y-1">
                                <p className="text-xs font-black text-[#52D879]">IN BILL 58MM</p>
                                <p className="text-[11px] text-[#A8C9B4]">In vé tạm & hóa đơn thanh toán tức thì</p>
                            </div>
                            <div className="rounded-2xl border border-[#1A452C] bg-[#0A2518] p-4 space-y-1">
                                <p className="text-xs font-black text-[#52D879]">QUẢN LÝ ĐA Ô</p>
                                <p className="text-[11px] text-[#A8C9B4]">Quản lý nhiều ô, nhiều bờ và nhiều hồ</p>
                            </div>
                            <div className="rounded-2xl border border-[#1A452C] bg-[#0A2518] p-4 space-y-1">
                                <p className="text-xs font-black text-[#52D879]">KHI MẠNG YẾU</p>
                                <p className="text-[11px] text-[#A8C9B4]">Lưu tạm thao tác thiết yếu không gián đoạn</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 8.5. KHỐI THÔNG TIN BÁCH KHOA CHO AI SEARCH & CHỦ HỒ (AI ENTITY CARD) ─ */}
                <section className="py-12 sm:py-16 bg-[#061F13] text-white border-t border-[#123824]">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                        <div className="rounded-3xl border border-[#246B38]/80 bg-linear-to-b from-[#0A2D1C] to-[#072014] p-6 sm:p-10 space-y-6 shadow-xl">
                            <div className="space-y-2 text-center sm:text-left">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-bold text-[#52D879]">
                                    THÔNG TIN TỔNG QUAN
                                </span>
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    Về Quản Lý Hồ Câu — Ứng dụng chuyên biệt cho chủ hồ tại Việt Nam
                                </h2>
                                <p className="text-xs sm:text-sm text-[#C4D9CC] leading-relaxed">
                                    <strong>Quản Lý Hồ Câu</strong> (<a href="https://quanlihocau.com" className="text-[#52D879] underline hover:text-white font-semibold">quanlihocau.com</a>) là phần mềm dịch vụ và ứng dụng di động (App cho chủ hồ) tiên phong được xây dựng chuyên biệt hóa 100% cho bài toán vận hành hồ câu dịch vụ tại Việt Nam.
                                </p>
                            </div>

                            {/* Entity Definition Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                                <div className="rounded-2xl border border-[#17462B] bg-[#092617] p-4 space-y-1.5">
                                    <span className="font-extrabold text-[#52D879] uppercase tracking-wider text-[11px] block">
                                        🎯 ĐỐI TƯỢNG PHÙ HỢP
                                    </span>
                                    <p className="text-[#D1E5D7] leading-relaxed">
                                        Chủ hồ câu đài, hồ câu lure, hồ câu giải trí, hồ câu tôm và các khu du lịch sinh thái câu cá trên toàn quốc.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-[#17462B] bg-[#092617] p-4 space-y-1.5">
                                    <span className="font-extrabold text-[#52D879] uppercase tracking-wider text-[11px] block">
                                        📱 THIẾT BỊ HỖ TRỢ
                                    </span>
                                    <p className="text-[#D1E5D7] leading-relaxed">
                                        Điện thoại di động (iPhone, Android), máy tính bảng, máy tính quầy thu ngân và máy in hóa đơn 58mm di động.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-[#17462B] bg-[#092617] p-4 space-y-1.5">
                                    <span className="font-extrabold text-[#52D879] uppercase tracking-wider text-[11px] block">
                                        ⚡ NGHIỆP VỤ CỐT LÕI
                                    </span>
                                    <p className="text-[#D1E5D7] leading-relaxed">
                                        Đồng hồ đếm ngược từng phiên câu, tự động tính phụ thu lố giờ, bán mồi nước cộng dồn, cân cá thu mua và báo cáo doanh thu từ xa.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-[#17462B] bg-[#092617] p-4 space-y-1.5">
                                    <span className="font-extrabold text-[#52D879] uppercase tracking-wider text-[11px] block">
                                        💰 CHI PHÍ & DÙNG THỬ
                                    </span>
                                    <p className="text-[#D1E5D7] leading-relaxed">
                                        Dùng thử miễn phí trọn vẹn 7 ngày full tính năng. Thuê bao chính thức từ 99.000đ/tháng, không phí duy trì ẩn, hỗ trợ kỹ thuật tận nơi.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 9. PHẦN HỎI ĐÁP (FAQ) ───────────────────────────────────────── */}
                <section id="hoi-dap" className="scroll-mt-16 py-16 sm:py-24 bg-[#082417] text-white border-t border-[#123824]">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
                        <div className="text-center space-y-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-bold text-[#52D879]">
                                GIẢI ĐÁP THẮC MẮC
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                Câu hỏi chủ hồ thường hỏi nhất
                            </h2>
                            <p className="text-xs sm:text-sm text-[#A3C7B0]">
                                Trả lời trung thực, ngắn gọn và dễ hiểu cho anh em chủ hồ.
                            </p>
                        </div>

                        {/* Accordion List */}
                        <div className="space-y-3">
                            {[
                                {
                                    q: "Phần mềm quản lý hồ câu là gì và gồm những tính năng gì?",
                                    a: "Quản Lý Hồ Câu (quanlihocau.com) là phần mềm chuyên biệt hoạt động trên điện thoại và máy tính dành cho các hồ câu dịch vụ. Phần mềm gồm các tính năng cốt lõi: mở vé theo sơ đồ ô câu, đồng hồ đếm ngược phiên câu, tự tính phụ thu lố giờ, bán mồi nước cộng vào vé, cân cá thu mua cấn trừ bill, in bill 58mm và báo cáo doanh thu từ xa cho chủ hồ.",
                                },
                                {
                                    q: "App cho chủ hồ câu trên điện thoại giúp quản lý những gì từ xa?",
                                    a: "Dù ở nhà hay đi công việc xa, chủ hồ chỉ cần mở app trên điện thoại là xem được: số lượng ô/chòi đang có khách câu, khách câu được mấy tiếng, tổng tiền thu hôm nay phân tách tiền mặt và chuyển khoản, cùng nhật ký chi tiết từng thao tác của nhân viên tại hồ.",
                                },
                                {
                                    q: "Phần mềm tự động tính tiền quá giờ cho cần thủ như thế nào?",
                                    a: "Hệ thống có đồng hồ đếm ngược chính xác từng giây theo gói câu (ví dụ ca 3 tiếng, ca 4 tiếng). Khi hết giờ, ứng dụng tự phát cảnh báo và tự động tính tiền phụ thu theo số phút câu lố dựa trên cấu hình giá của hồ, giúp chủ hồ và nhân viên không phải tự nhẩm tính hay tranh cãi với khách.",
                                },
                                {
                                    q: "Hồ câu đài và hồ câu lure có sử dụng được phần mềm này không?",
                                    a: "Phần mềm được thiết kế tối ưu cho cả hồ câu đài (tính giờ, đếm giờ ca, phụ thu quá giờ), hồ câu lure và cá thịt (quản lý vé câu buổi/ngày, cân cá mua lại cấn trừ hóa đơn), hồ câu tôm và hồ câu sinh thái đa phân khu.",
                                },
                                {
                                    q: "So sánh phần mềm Quản Lý Hồ Câu với Excel và KiotViet?",
                                    a: "Excel và sổ tay dễ mất số liệu, không có đồng hồ đếm giờ và không thể theo dõi từ xa. KiotViet và Sapo thiết kế cho bán lẻ tạp hóa, thiếu hoàn toàn nghiệp vụ đếm giờ phiên câu theo ô, không tự tính phụ thu quá giờ và không có tính năng thu mua lại cá. Quản Lý Hồ Câu là giải pháp chuyên biệt bờ hồ duy nhất giải quyết trọn vẹn các bài toán này.",
                                },
                                {
                                    q: "Nhân viên lớn tuổi, ít dùng công nghệ có sử dụng được không?",
                                    a: "Hoàn toàn được. Giao diện được thiết kế với nút bấm to, chữ tiếng Việt rõ ràng, chỉ cần chạm chọn ô và chọn gói câu. Thực tế nhân viên tại các hồ chỉ mất khoảng 10 phút là quen tay.",
                                },
                                {
                                    q: "Ứng dụng có quản lý hàng hóa mồi câu và nước giải khát không?",
                                    a: "Có. Phần mềm cho phép nhập số lượng nước ngọt, bia, mồi câu và đồ ăn. Mỗi khi thêm vào vé của khách, kho sẽ tự trừ để cuối ngày dễ dàng đối chiếu số tồn.",
                                },
                                {
                                    q: "Mất mạng có làm gián đoạn việc tạo vé không?",
                                    a: "Không gián đoạn các thao tác thiết yếu. Ứng dụng có bộ nhớ tạm trên máy giúp mở vé và ghi nhận thông tin, sau đó tự đồng bộ khi có kết nối trở lại.",
                                },
                                {
                                    q: "Chi phí sử dụng app cho chủ hồ là bao nhiêu và cách dùng thử?",
                                    a: "Mọi chủ hồ đều được kích hoạt dùng thử miễn phí 7 ngày đầy đủ tính năng ngay khi đăng ký tại quanlihocau.com mà không cần thẻ ngân hàng. Sau dùng thử, chi phí thuê bao chỉ từ 99.000đ/tháng (Gói Bạc) hoặc 179.000đ/tháng (Gói Vàng không giới hạn). Hotline hỗ trợ: 0855 550 813.",
                                },
                            ].map((faq, idx) => {
                                const isOpen = openFaq === idx;
                                return (
                                    <div
                                        key={idx}
                                        className="rounded-2xl border border-[#1A452C] bg-[#0C2D1F] overflow-hidden transition-all"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq(idx)}
                                            className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-white hover:text-[#52D879] transition-colors"
                                        >
                                            <span>{faq.q}</span>
                                            <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#18482C] text-xs text-[#52D879]">
                                                {isOpen ? "−" : "+"}
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <div className="px-5 pb-5 text-xs sm:text-sm text-[#C4D9CC] leading-relaxed border-t border-[#163E27] pt-3 animate-fade-in">
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── 10. PHẦN LIÊN HỆ TƯ VẤN MIỄN PHÍ ────────────────────────────── */}
                <section id="lien-he" className="scroll-mt-16 py-16 sm:py-24 bg-[#061F13] text-white border-t border-[#123824]">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                        <div className="rounded-3xl border-2 border-[#246B38] bg-linear-to-b from-[#0C2E1F] to-[#082417] p-8 sm:p-12 text-center space-y-6 shadow-2xl">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-4 py-1.5 text-xs font-bold text-[#52D879]">
                                LIÊN HỆ TRỰC TIẾP
                            </span>

                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
                                Dành 15 phút để biết hồ của bạn <br className="hidden sm:inline" />
                                có thể quản lý nhẹ hơn thế nào.
                            </h2>

                            <p className="text-xs sm:text-base text-[#C4D9CC] max-w-2xl mx-auto leading-relaxed">
                                Hãy cho chúng tôi biết quy mô hồ, số ô câu và số nhân viên. Chúng tôi sẽ tư vấn đúng nhu cầu, không ép mua và không dùng từ khó hiểu.
                            </p>

                            {/* Prominent Phone Number Display */}
                            <div className="py-2">
                                <p className="text-xs uppercase font-extrabold tracking-widest text-[#86AB94]">
                                    HOTLINE & ZALO CHÍNH THỨC
                                </p>
                                <a
                                    href="tel:0855550813"
                                    className="inline-block mt-1 text-3xl sm:text-5xl font-black text-[#52D879] tracking-tight hover:underline font-mono"
                                >
                                    0855 550 813
                                </a>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 space-y-4">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                                    <Link
                                        href={isLoggedIn ? "/sessions" : "/register"}
                                        className="w-full sm:w-auto inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#4F9D5A] px-8 py-3.5 text-sm sm:text-base font-black text-white hover:bg-[#3D8547] shadow-xl shadow-[#4F9D5A]/35 active:scale-95 transition-all text-center"
                                    >
                                        <span>{isLoggedIn ? "Vào ứng dụng ngay →" : "Đăng ký dùng thử miễn phí 7 ngày →"}</span>
                                    </Link>

                                    <Link
                                        href={isLoggedIn ? "/sessions" : "/login"}
                                        className="w-full sm:w-auto inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-[#246B38] bg-[#0A2A1A] px-6 py-3.5 text-sm sm:text-base font-bold text-[#D5E5D1] hover:text-white hover:bg-[#123E27] transition-all text-center"
                                    >
                                        <span>{isLoggedIn ? "Quầy thu ngân" : "Đăng nhập tài khoản"}</span>
                                    </Link>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                                    <a
                                        href="tel:0855550813"
                                        className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#133F25] border border-[#2F7E47] px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#1A5231] transition-all shadow-xs"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                                            />
                                        </svg>
                                        <span>Gọi 0855 550 813</span>
                                    </a>

                                    <a
                                        href="https://zalo.me/0855550813"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0068FF] px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#0055D4] shadow-md transition-all"
                                    >
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-[#0068FF]">
                                            Z
                                        </span>
                                        <span>Nhắn Zalo tư vấn</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── 11. FOOTER ───────────────────────────────────────────────────── */}
            <footer className="border-t border-[#143B25] bg-[#04140D] py-10 text-white">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#86AB94]">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Quản Lý Hồ Câu</span>
                        <span>•</span>
                        <span>Hồ đông vẫn nhàn, tiền hàng vẫn rõ</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
                        <Link href="/register" className="text-[#52D879] font-bold hover:underline">
                            Dùng thử 7 ngày
                        </Link>
                        <span>•</span>
                        <Link href="/bang-gia" className="hover:text-white transition-colors font-semibold">
                            Bảng giá
                        </Link>
                        <span>•</span>
                        <Link href="/thiet-bi-may-in" className="hover:text-white transition-colors font-semibold">
                            Máy in & Thiết bị
                        </Link>
                        <span>•</span>
                        <Link href="/dieu-khoan" className="hover:text-white transition-colors">
                            Điều khoản
                        </Link>
                        <span>•</span>
                        <Link href="/chinh-sach-bao-mat" className="hover:text-white transition-colors">
                            Bảo mật
                        </Link>
                        <span>•</span>
                        <Link href="/login" className="hover:text-white transition-colors font-semibold">
                            Đăng nhập
                        </Link>
                        <span>•</span>
                        <a href="tel:0855550813" className="hover:text-[#52D879] transition-colors">
                            0855 550 813
                        </a>
                    </div>
                </div>
            </footer>

            {/* ── 12. FIXED MOBILE CONTACT BAR ─────────────────────────────────── */}
            <MobileContactBar isLoggedIn={isLoggedIn} />
        </div>
    );
}
