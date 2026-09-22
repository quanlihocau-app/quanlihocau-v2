"use client";

import React, { useState } from "react";
import Link from "next/link";

type PreviewScreen = "onboarding" | "new-session" | "sessions-list" | "design-system";
type DeviceResolution = "standard-430" | "wide-500" | "phablet-560" | "fluid";

export default function PreviewPage() {
    const [activeScreen, setActiveScreen] = useState<PreviewScreen>("onboarding");
    const [deviceRes, setDeviceRes] = useState<DeviceResolution>("wide-500");

    // Modal state for Screen 1 (Dành cho thành viên mới)
    const [lakeName, setLakeName] = useState("Kim Thông");
    const [lakeAddress, setLakeAddress] = useState("đức trọng lâm đồng");
    const [lakePhone, setLakePhone] = useState("0817654652");
    const [onboardingSaved, setOnboardingSaved] = useState(false);

    // Modal state for Screen 2 (Mở lượt câu mới)
    const [searchCustomer, setSearchCustomer] = useState("anh a");
    const [newCustomerName, setNewCustomerName] = useState("anh a");
    const [newCustomerPhone, setNewCustomerPhone] = useState("0845612335");
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState("5h");
    const [selectedSpot, setSelectedSpot] = useState("A01");
    const [sessionCreated, setSessionCreated] = useState(false);

    // Dynamic width class based on chosen resolution
    const getContainerWidth = () => {
        switch (deviceRes) {
            case "standard-430":
                return "max-w-[430px]";
            case "wide-500":
                return "max-w-[500px]";
            case "phablet-560":
                return "max-w-[560px]";
            case "fluid":
                return "max-w-5xl";
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-serif antialiased selection:bg-emerald-500 selection:text-white">
            {/* Top Toolbar / Control Bar */}
            <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#16a34a] text-white font-bold shadow-md shadow-emerald-700/40">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-white tracking-wide uppercase">
                                BẢN XEM TRƯỚC GIAO DIỆN (ĐỘ PHÂN GIẢI CAO &amp; MÀN HÌNH RỘNG)
                            </h1>
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                HD Mobile View
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Không tràn màn hình • Màn rộng sắc nét • Giữ nguyên font chữ &amp; cỡ chữ
                        </p>
                    </div>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
                    <button
                        type="button"
                        onClick={() => setActiveScreen("onboarding")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeScreen === "onboarding"
                                ? "bg-[#16a34a] text-white shadow-sm"
                                : "text-slate-300 hover:text-white"
                        }`}
                    >
                        1. Popup Thành viên mới (Ảnh 1)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveScreen("new-session")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeScreen === "new-session"
                                ? "bg-[#16a34a] text-white shadow-sm"
                                : "text-slate-300 hover:text-white"
                        }`}
                    >
                        2. Mở lượt câu mới (Ảnh 2)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveScreen("sessions-list")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeScreen === "sessions-list"
                                ? "bg-[#16a34a] text-white shadow-sm"
                                : "text-slate-300 hover:text-white"
                        }`}
                    >
                        3. Danh sách ca câu
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveScreen("design-system")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeScreen === "design-system"
                                ? "bg-[#16a34a] text-white shadow-sm"
                                : "text-slate-300 hover:text-white"
                        }`}
                    >
                        4. Bộ UI Design Kit
                    </button>
                </div>

                {/* Resolution & Screen Width Selector */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 px-2">Độ rộng:</span>
                    <button
                        type="button"
                        onClick={() => setDeviceRes("standard-430")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            deviceRes === "standard-430"
                                ? "bg-slate-700 text-emerald-400 border border-emerald-500/40"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        430px
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeviceRes("wide-500")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            deviceRes === "wide-500"
                                ? "bg-slate-700 text-emerald-400 border border-emerald-500/40"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        500px (Rộng nét)
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeviceRes("phablet-560")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            deviceRes === "phablet-560"
                                ? "bg-slate-700 text-emerald-400 border border-emerald-500/40"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        560px (Phablet)
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeviceRes("fluid")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            deviceRes === "fluid"
                                ? "bg-slate-700 text-emerald-400 border border-emerald-500/40"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        Toàn màn hình
                    </button>
                    <Link
                        href="/sessions"
                        className="ml-2 px-3 py-1 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                    >
                        App thật ➔
                    </Link>
                </div>
            </header>

            {/* Main Stage */}
            <main className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-x-hidden overflow-y-auto">
                <div
                    className={`w-full ${getContainerWidth()} transition-all duration-300 min-h-[800px] h-[88vh] rounded-[44px] border-[10px] border-slate-800 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.7)] flex flex-col relative bg-slate-50 ring-1 ring-white/15 overflow-hidden box-border`}
                >
                    {/* Phone Notch/Island */}
                    {deviceRes !== "fluid" && (
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-800 rounded-full z-50 pointer-events-none shadow-sm" />
                    )}

                    {/* App Content Canvas (Zero Horizontal Overflow Guaranteed) */}
                    <div className="flex-1 w-full flex flex-col overflow-y-auto overflow-x-hidden relative bg-[#F8FAFC]">
                        {/* SCREEN 1: DÀNH CHO THÀNH VIÊN MỚI (EXACT REPRODUCTION OF IMAGE 1 - HIGH RES & EXPANSIVE) */}
                        {activeScreen === "onboarding" && (
                            <div className="min-h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/50 relative overflow-x-hidden box-border">
                                {/* Error Toast (Simulating Screenshot 1 Error message with crisp rendering) */}
                                <div className="w-full max-w-md mb-3.5 box-border">
                                    <div className="bg-white rounded-2xl p-3.5 shadow-md border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
                                        <div className="h-5 w-5 rounded-full border border-slate-400 flex items-center justify-center text-slate-500 shrink-0 font-bold">
                                            ✕
                                        </div>
                                        <p className="leading-snug text-[11px] text-slate-600">
                                            Invalid `prisma.user.update()` invocation: An operation failed because it depends on one or more records that were required but not found. No record was found for an update.
                                        </p>
                                    </div>
                                </div>

                                {/* Main Card: DÀNH CHO THÀNH VIÊN MỚI (Wider & Sharper) */}
                                <div className="w-full max-w-md bg-white rounded-[30px] shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-slate-100 p-6 sm:p-8 relative overflow-hidden box-border">
                                    {/* Top Right Decorative Wave Aura */}
                                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-100/60 rounded-full blur-2xl pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-[70px] pointer-events-none -z-0" />

                                    {/* Header Icon + Title */}
                                    <div className="relative z-10 flex items-center gap-3.5 mb-5">
                                        <div className="h-13 w-13 rounded-[20px] bg-[#16a34a] flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
                                            {/* Water waves icon like screenshot */}
                                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0M3.75 13.5c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0M3.75 18c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-base sm:text-lg font-bold text-[#16a34a] uppercase tracking-wide">
                                                DÀNH CHO THÀNH VIÊN MỚI
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Alert Callout Box */}
                                    <div className="relative z-10 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 flex items-start gap-3 mb-5">
                                        <div className="h-5 w-5 rounded-full border-2 border-[#16a34a] flex items-center justify-center text-[#16a34a] shrink-0 text-xs font-bold mt-0.5">
                                            i
                                        </div>
                                        <p className="text-[11px] sm:text-xs font-bold text-[#16a34a] uppercase leading-relaxed">
                                            VUI LÒNG ĐIỀN THÔNG TIN BÊN DƯỚI ĐỂ KHỞI TẠO CẤU HÌNH HÓA ĐƠN VÀ HỒ CÂU CỦA BẠN. BƯỚC NÀY CHỈ CẦN LÀM DUY NHẤT MỘT LẦN.
                                        </p>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="relative z-10 space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[#1e293b] uppercase tracking-wide mb-1.5">
                                                TÊN HỒ CÂU
                                            </label>
                                            <input
                                                type="text"
                                                value={lakeName}
                                                onChange={(e) => setLakeName(e.target.value)}
                                                className="w-full h-12 px-4 rounded-[18px] bg-[#f8fafc] border border-[#cbd5e1] text-sm font-semibold text-[#0f172a] focus:outline-none focus:bg-white focus:border-2 focus:border-[#16a34a] transition-all shadow-2xs box-border"
                                                placeholder="Ví dụ: Kim Thông"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[#1e293b] uppercase tracking-wide mb-1.5">
                                                ĐỊA CHỈ HỒ CÂU
                                            </label>
                                            <input
                                                type="text"
                                                value={lakeAddress}
                                                onChange={(e) => setLakeAddress(e.target.value)}
                                                className="w-full h-12 px-4 rounded-[18px] bg-[#f8fafc] border border-[#cbd5e1] text-sm font-semibold text-[#0f172a] focus:outline-none focus:bg-white focus:border-2 focus:border-[#16a34a] transition-all shadow-2xs box-border"
                                                placeholder="Ví dụ: đức trọng lâm đồng"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[#1e293b] uppercase tracking-wide mb-1.5">
                                                SỐ ĐIỆN THOẠI LIÊN HỆ
                                            </label>
                                            <input
                                                type="tel"
                                                value={lakePhone}
                                                onChange={(e) => setLakePhone(e.target.value)}
                                                className="w-full h-12 px-4 rounded-[18px] bg-[#f8fafc] border-2 border-[#16a34a] text-sm font-semibold text-[#0f172a] focus:outline-none focus:bg-white transition-all shadow-2xs box-border"
                                                placeholder="0817654652"
                                            />
                                        </div>

                                        {/* Action CTA Button */}
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOnboardingSaved(true);
                                                    setTimeout(() => setOnboardingSaved(false), 2500);
                                                }}
                                                className="w-full h-12 sm:h-13 rounded-[20px] bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer box-border"
                                            >
                                                <span>►</span>
                                                <span>{onboardingSaved ? "ĐÃ LƯU THÀNH CÔNG!" : "LƯU & BẮT ĐẦU SỬ DỤNG"}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SCREEN 2: MỞ LƯỢT CÂU MỚI (EXACT REPRODUCTION OF IMAGE 2 - EXPANSIVE & ZERO OVERFLOW) */}
                        {activeScreen === "new-session" && (
                            <div className="min-h-full w-full flex flex-col justify-end bg-slate-900/30 backdrop-blur-2xs relative overflow-x-hidden box-border">
                                {/* Dimmed Background Lake Preview */}
                                <div className="absolute inset-0 p-4 opacity-30 pointer-events-none">
                                    <div className="h-12 bg-white rounded-2xl mb-3 shadow-sm" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-32 bg-white rounded-2xl shadow-sm" />
                                        <div className="h-32 bg-white rounded-2xl shadow-sm" />
                                        <div className="h-32 bg-white rounded-2xl shadow-sm" />
                                        <div className="h-32 bg-white rounded-2xl shadow-sm" />
                                    </div>
                                </div>

                                {/* Bottom Sheet Modal */}
                                <div className="w-full bg-white rounded-t-[34px] shadow-[0_-15px_45px_rgba(0,0,0,0.18)] flex flex-col max-h-[92dvh] relative z-20 overflow-hidden box-border">
                                    {/* Sheet Drag Indicator */}
                                    <div className="w-full pt-3 pb-1 flex justify-center shrink-0">
                                        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                                    </div>

                                    {/* Modal Header */}
                                    <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-[#0f172a] uppercase tracking-wide">
                                                MỞ LƯỢT CÂU MỚI
                                            </h2>
                                            <p className="text-xs font-bold text-[#16a34a] uppercase tracking-wider mt-0.5">
                                                QUẢN LÍ HỒ CÂU, DỄ GÌ ĐÂU !
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveScreen("sessions-list")}
                                            className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors cursor-pointer"
                                            aria-label="Đóng"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Sheet Scroll Body */}
                                    <div className="p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain flex-1 overflow-x-hidden box-border">
                                        {/* SECTION 1: TÌM KHÁCH HÀNG */}
                                        <div>
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="h-8 w-8 rounded-xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shrink-0">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wide">
                                                    TÌM KHÁCH HÀNG
                                                </h3>
                                            </div>

                                            {/* Search Input */}
                                            <div className="relative mb-3">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                                    </svg>
                                                </span>
                                                <input
                                                    type="text"
                                                    value={searchCustomer}
                                                    onChange={(e) => setSearchCustomer(e.target.value)}
                                                    placeholder="Tìm theo tên hoặc số điện thoại..."
                                                    className="w-full h-12 pl-10 pr-4 rounded-2xl bg-white border border-[#cbd5e1] text-sm font-semibold text-[#0f172a] focus:outline-none focus:border-2 focus:border-[#16a34a] box-border"
                                                />
                                            </div>

                                            {/* Box: TẠO KHÁCH HÀNG MỚI */}
                                            {isCreatingCustomer && (
                                                <div className="rounded-2xl border border-[#bbf7d0] bg-white p-4 shadow-2xs space-y-3 box-border">
                                                    <h4 className="text-[11px] font-bold text-[#16a34a] uppercase tracking-wide">
                                                        TẠO KHÁCH HÀNG MỚI
                                                    </h4>

                                                    <input
                                                        type="text"
                                                        value={newCustomerName}
                                                        onChange={(e) => setNewCustomerName(e.target.value)}
                                                        placeholder="Họ tên cần câu"
                                                        className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#cbd5e1] text-sm font-medium text-[#0f172a] focus:outline-none focus:border-2 focus:border-[#16a34a] box-border"
                                                    />

                                                    <input
                                                        type="tel"
                                                        value={newCustomerPhone}
                                                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                                                        placeholder="Số điện thoại"
                                                        className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#cbd5e1] text-sm font-medium text-[#0f172a] focus:outline-none focus:border-2 focus:border-[#16a34a] box-border"
                                                    />

                                                    {/* Sub-actions: HỦY vs TẠO NGAY */}
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsCreatingCustomer(false)}
                                                            className="flex-1 h-11 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] text-xs font-bold uppercase transition-colors cursor-pointer"
                                                        >
                                                            HỦY
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsCreatingCustomer(false);
                                                                setSearchCustomer(`${newCustomerName} (${newCustomerPhone})`);
                                                            }}
                                                            className="flex-1 h-11 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold uppercase flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                                                        >
                                                            <span>＋</span>
                                                            <span>TẠO NGAY</span>
                                                        </button>
                                                    </div>

                                                    <p className="text-[11px] italic text-slate-500 text-center pt-1">
                                                        Không tìm thấy khách hàng &quot;{searchCustomer}&quot;
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 2: CHỌN ĐIỂM CÂU & GÓI CÂU */}
                                        <div>
                                            <div className="flex items-center gap-2.5 mb-2.5">
                                                <div className="h-8 w-8 rounded-xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shrink-0">
                                                    <span className="text-sm">🎣</span>
                                                </div>
                                                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wide">
                                                    CHỌN VỊ TRÍ &amp; GÓI CÂU
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2.5 mb-3">
                                                {[
                                                    { id: "A01", label: "Chòi A01", status: "Trống" },
                                                    { id: "A02", label: "Chòi A02", status: "Trống" },
                                                    { id: "B01", label: "Bờ B01", status: "Trống" },
                                                ].map((spot) => (
                                                    <button
                                                        key={spot.id}
                                                        type="button"
                                                        onClick={() => setSelectedSpot(spot.id)}
                                                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                                                            selectedSpot === spot.id
                                                                ? "border-2 border-[#16a34a] bg-[#f0fdf4] shadow-xs"
                                                                : "border-slate-200 bg-white hover:border-slate-300"
                                                        }`}
                                                    >
                                                        <p className="text-xs font-bold text-[#0f172a]">{spot.label}</p>
                                                        <span className="text-[10px] text-[#16a34a] font-semibold">{spot.status}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                {[
                                                    { id: "5h", label: "Ca 5 Tiếng", price: "200.000đ" },
                                                    { id: "10h", label: "Ca 10 Tiếng", price: "350.000đ" },
                                                ].map((pkg) => (
                                                    <button
                                                        key={pkg.id}
                                                        type="button"
                                                        onClick={() => setSelectedPackage(pkg.id)}
                                                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                                            selectedPackage === pkg.id
                                                                ? "border-2 border-[#16a34a] bg-[#f0fdf4] shadow-xs"
                                                                : "border-slate-200 bg-white hover:border-slate-300"
                                                        }`}
                                                    >
                                                        <p className="text-xs font-bold text-[#0f172a]">{pkg.label}</p>
                                                        <p className="text-xs font-bold text-[#16a34a] mt-0.5">{pkg.price}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* SECTION 3: THÊM SẢN PHẨM / DỊCH VỤ */}
                                        <div>
                                            <div className="flex items-center gap-2.5 mb-2.5">
                                                <div className="h-8 w-8 rounded-xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shrink-0">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wide">
                                                    THÊM SẢN PHẨM / DỊCH VỤ
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                                {["Mồi cá rô", "Nước suối", "Cơm trưa", "Bia Tiger", "Đá lạnh"].map((item) => (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-[#16a34a] border border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                                                    >
                                                        + {item}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* STICKY BOTTOM ACTION BAR (EXACT AS IMAGE 2 - NO OVERFLOW) */}
                                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0 box-border">
                                        <button
                                            type="button"
                                            onClick={() => setActiveScreen("sessions-list")}
                                            className="h-12 px-6 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] text-xs font-bold uppercase transition-colors cursor-pointer"
                                        >
                                            HỦY BỎ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSessionCreated(true);
                                                setTimeout(() => {
                                                    setSessionCreated(false);
                                                    setActiveScreen("sessions-list");
                                                }, 1200);
                                            }}
                                            className="flex-1 h-12 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer box-border"
                                        >
                                            <span>►</span>
                                            <span>{sessionCreated ? "ĐANG TẠO VÉ CÂU..." : "BẮT ĐẦU PHIÊN"}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SCREEN 3: DANH SÁCH CA CÂU ĐANG HOẠT ĐỘNG (EXPANSIVE HIGH-RES GRID) */}
                        {activeScreen === "sessions-list" && (
                            <div className="min-h-full w-full flex flex-col bg-[#F8FAFC] overflow-x-hidden box-border">
                                {/* Mobile App Header */}
                                <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-[#dcfce7] text-[#16a34a] font-bold flex items-center justify-center text-sm shadow-2xs">
                                            KT
                                        </div>
                                        <div>
                                            <h2 className="text-sm sm:text-base font-bold text-[#0f172a] leading-tight">
                                                Hồ câu Kim Thông
                                            </h2>
                                            <p className="text-[11px] text-slate-500">11:20 • Đang câu 3 vé</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-[11px] font-bold text-[#16a34a]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                                            Online
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveScreen("new-session")}
                                            className="h-8.5 px-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                        >
                                            <span>＋</span>
                                            <span>Tạo vé</span>
                                        </button>
                                    </div>
                                </header>

                                {/* Content Cards */}
                                <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overflow-x-hidden box-border">
                                    {/* Quick Summary Pill Banner */}
                                    <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white p-4 sm:p-5 shadow-md shadow-emerald-600/20">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs opacity-90 font-medium">Doanh thu hôm nay</p>
                                                <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">3.820.000đ</p>
                                            </div>
                                            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-xl">12 lượt câu</span>
                                        </div>
                                    </div>

                                    {/* Active Fishing Spots */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                                ĐANG CÂU TẠI HỒ (3)
                                            </h3>
                                            <span className="text-xs text-[#16a34a] font-bold cursor-pointer">Lọc theo khu vực ▾</span>
                                        </div>

                                        {/* Spot Card 1 */}
                                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3 box-border">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="h-8 w-8 rounded-xl bg-[#dcfce7] text-[#16a34a] font-bold text-xs flex items-center justify-center">
                                                        A01
                                                    </span>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">Anh Nam (0982***112)</h4>
                                                        <p className="text-[11px] text-slate-500">Gói 5 giờ • Bắt đầu 08:30</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-[#16a34a] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full border border-[#bbf7d0]">
                                                    Còn 02:45:10
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                                                <span className="text-slate-600 font-medium">Đã gọi: 2 nước, 1 mồi</span>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer">
                                                        + Đồ dùng
                                                    </button>
                                                    <button type="button" className="px-3 py-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold cursor-pointer">
                                                        Thanh toán
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Spot Card 2 (Ending Soon) */}
                                        <div className="bg-white rounded-2xl p-4 border-2 border-amber-400/80 shadow-2xs space-y-3 box-border">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                                                        A02
                                                    </span>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">Chú Thành</h4>
                                                        <p className="text-[11px] text-slate-500">Gói 10 giờ • Sắp hết giờ</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                                    Còn 00:08:12
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                                                <span className="text-slate-600 font-medium">Tổng tiền: 620.000đ</span>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer">
                                                        Gia hạn ca
                                                    </button>
                                                    <button type="button" className="px-3 py-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold cursor-pointer">
                                                        Kết thúc
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Navigation Bar */}
                                <nav className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-2.5 flex items-center justify-around shadow-lg">
                                    {[
                                        { label: "Trang chủ", active: false, icon: "🏠" },
                                        { label: "Đang câu", active: true, icon: "⏱️" },
                                        { label: "Tạo vé", active: false, icon: "➕" },
                                        { label: "Báo cáo", active: false, icon: "📊" },
                                        { label: "Cài đặt", active: false, icon: "⚙️" },
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            type="button"
                                            className={`flex flex-col items-center gap-0.5 py-1 cursor-pointer ${
                                                item.active ? "text-[#16a34a] font-bold" : "text-slate-400"
                                            }`}
                                        >
                                            <span className="text-lg">{item.icon}</span>
                                            <span className="text-[11px] font-medium">{item.label}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        )}

                        {/* SCREEN 4: DESIGN SYSTEM SHOWCASE (BUTTONS, INPUTS, ALERTS, CARDS) */}
                        {activeScreen === "design-system" && (
                            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto overflow-x-hidden box-border">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                                        Bộ Thành Phần Giao Diện Độ Phân Giải Cao (HD Design System)
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Màu xanh lá tươi rực rỡ `#16A34A`, bo góc mềm mại 18px-28px, bảo toàn 100% font chữ và cỡ chữ, sắc nét trên mọi mật độ điểm ảnh.
                                    </p>
                                </div>

                                {/* Buttons Showcase */}
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3.5 box-border">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                        Nút bấm (Action Buttons)
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        <button type="button" className="h-12 px-5 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold uppercase shadow-md shadow-emerald-600/20 cursor-pointer">
                                            ► BẮT ĐẦU PHIÊN (Primary)
                                        </button>
                                        <button type="button" className="h-12 px-5 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold uppercase flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer">
                                            <span>＋</span>
                                            <span>TẠO NGAY</span>
                                        </button>
                                        <button type="button" className="h-12 px-5 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] text-xs font-bold uppercase cursor-pointer">
                                            HỦY BỎ (Secondary)
                                        </button>
                                        <button type="button" className="h-12 px-5 rounded-2xl border-2 border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4] text-xs font-bold uppercase cursor-pointer">
                                            XEM CHI TIẾT (Outline)
                                        </button>
                                    </div>
                                </div>

                                {/* Input Fields */}
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3.5 box-border">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                        Ô nhập liệu (Form Inputs)
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                                                TÊN HỒ CÂU (Mặc định)
                                            </label>
                                            <input
                                                type="text"
                                                readOnly
                                                value="Hồ Câu Kim Thông"
                                                className="w-full h-12 px-4 rounded-2xl bg-[#f8fafc] border border-slate-300 text-sm font-semibold text-slate-800 box-border"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                                                SỐ ĐIỆN THOẠI (Active focus viền xanh đôi)
                                            </label>
                                            <input
                                                type="text"
                                                readOnly
                                                value="0817654652"
                                                className="w-full h-12 px-4 rounded-2xl bg-white border-2 border-[#16a34a] text-sm font-semibold text-slate-900 box-border shadow-2xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Alert Callouts */}
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3.5 box-border">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                        Hộp thông báo (Info Callout Box)
                                    </h4>
                                    <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 flex items-start gap-3 box-border">
                                        <div className="h-5 w-5 rounded-full border-2 border-[#16a34a] flex items-center justify-center text-[#16a34a] shrink-0 text-xs font-bold mt-0.5">
                                            i
                                        </div>
                                        <p className="text-[11px] sm:text-xs font-bold text-[#16a34a] uppercase leading-relaxed">
                                            VUI LÒNG ĐIỀN THÔNG TIN BÊN DƯỚI ĐỂ KHỞI TẠO CẤU HÌNH HÓA ĐƠN VÀ HỒ CÂU CỦA BẠN. BƯỚC NÀY CHỈ CẦN LÀM DUY NHẤT MỘT LẦN.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
