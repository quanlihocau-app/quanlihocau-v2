"use client";

import React from "react";

export function DualPhoneHeroMockup() {
    return (
        <div className="relative mx-auto w-full max-w-135 select-none py-6 lg:py-0">
            {/* Ambient emerald backlight blur */}
            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-85 w-85 rounded-full bg-[#34A853]/25 blur-[90px] pointer-events-none"
                aria-hidden="true"
            />

            <div className="relative flex items-center justify-center min-h-115 sm:min-h-130">
                {/* ── LEFT PHONE: Màn hình "Tạo vé & Bán hàng" (Phía sau, lệch trái) ── */}
                <div
                    className="absolute left-0 sm:left-4 top-2 sm:top-4 w-62.5 sm:w-70 rounded-[38px] border-[5px] border-[#13281E] bg-[#0E1E16] p-2 shadow-2xl transition-transform duration-300 hover:scale-[1.02] z-10 hidden xs:block"
                    style={{ transform: "perspective(1000px) rotateY(4deg) rotateX(2deg)" }}
                >
                    {/* Speaker notch */}
                    <div className="mx-auto mb-1.5 h-1 w-12 rounded-full bg-[#274435]" />

                    {/* Phone Screen: POS Mở vé */}
                    <div className="h-107.5 sm:h-120 overflow-hidden rounded-[30px] bg-[#F7F9F5] text-[#17201A] font-sans flex flex-col text-[10px] leading-tight border border-[#Dce3DA]">
                        {/* Header Hồ câu */}
                        <div className="bg-[#123624] text-white p-2.5 flex items-center justify-between border-b border-[#1E4D34]">
                            <div className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#246B38] text-[9px] font-extrabold text-white">
                                    HO
                                </span>
                                <div>
                                    <p className="font-bold text-[10.5px] leading-none text-white">Hồ câu Kim Thông</p>
                                    <p className="text-[8px] text-[#86AB94] mt-0.5">Thứ Sáu, 11/09/2026</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1 rounded-full bg-[#1F4E34] px-1.5 py-0.5 text-[8px] text-[#52D879] font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                                Online
                            </span>
                        </div>

                        {/* Mode tabs */}
                        <div className="bg-white p-2 border-b border-[#E3E8E3] space-y-1.5">
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-[11px] text-[#17201A]">Tạo vé & Bán hàng</p>
                                <span className="rounded bg-[#E8F3E5] px-1.5 py-0.5 text-[8px] font-bold text-[#246B38]">
                                    POS V2
                                </span>
                            </div>
                            <div className="flex rounded-lg bg-[#F0F4EF] p-0.5 text-[9px] font-semibold text-[#66716A]">
                                <span className="flex-1 rounded-md bg-white py-1 text-center font-bold text-[#246B38] shadow-xs">
                                    Tạo vé câu
                                </span>
                                <span className="flex-1 py-1 text-center text-[#66716A]">
                                    Bán lẻ hàng hóa
                                </span>
                            </div>
                        </div>

                        {/* Content form */}
                        <div className="flex-1 overflow-hidden p-2 space-y-2 bg-[#F7F9F5]">
                            {/* Step 1: Khách hàng */}
                            <div className="rounded-xl border border-[#E3E8E3] bg-white p-2 shadow-xs space-y-1">
                                <div className="flex items-center justify-between text-[9px]">
                                    <span className="font-bold text-[#246B38] uppercase tracking-wider">1. Khách hàng</span>
                                    <span className="rounded bg-[#E8F3E5] px-1.5 py-0.2 font-bold text-[#246B38]">Khách lẻ</span>
                                </div>
                                <div className="rounded-md border border-[#E3E8E3] bg-[#F7F9F5] px-2 py-1 text-[8.5px] text-[#8A938D]">
                                    Tìm theo tên hoặc số điện thoại...
                                </div>
                            </div>

                            {/* Step 2: Chọn ô câu */}
                            <div className="rounded-xl border border-[#E3E8E3] bg-white p-2 shadow-xs space-y-1.5">
                                <div className="flex items-center justify-between text-[9px]">
                                    <span className="font-bold text-[#246B38] uppercase tracking-wider">2. Chọn ô câu *</span>
                                    <span className="text-[8px] text-[#4F9D5A] font-medium">Còn 32 ô trống</span>
                                </div>

                                <p className="text-[8px] font-bold text-[#66716A] uppercase tracking-wider">Bờ ngang</p>
                                <div className="grid grid-cols-6 gap-1 text-center font-bold text-[8px]">
                                    <span className="rounded bg-[#246B38] py-1 text-white shadow-xs">01</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">02</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">03</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">04</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">06</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">07</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">08</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">09</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">11</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">15</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">16</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">17</span>
                                </div>

                                <p className="text-[8px] font-bold text-[#66716A] uppercase tracking-wider pt-0.5">Bờ dọc trước nhà</p>
                                <div className="grid grid-cols-6 gap-1 text-center font-bold text-[8px]">
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">01</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">02</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">03</span>
                                    <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] py-1 text-[#4F5952]">20</span>
                                </div>
                            </div>

                            {/* Step 3: Gói câu */}
                            <div className="rounded-xl border border-[#E3E8E3] bg-white p-2 shadow-xs">
                                <span className="font-bold text-[#246B38] text-[9px] uppercase tracking-wider">3. Gói câu / Ca câu *</span>
                                <div className="mt-1 flex items-center justify-between rounded-lg bg-[#E8F3E5] px-2 py-1 text-[8.5px] font-bold text-[#246B38]">
                                    <span>Ca 4 Tiếng (200.000đ)</span>
                                    <span>+ Chọn</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT PHONE: Màn hình "Đang câu" (Nổi phía trước, bên phải) ── */}
                <div
                    className="relative right-0 sm:-right-6 w-67.5 sm:w-76.25 rounded-[42px] border-[6px] border-[#0A1A12] bg-[#0A1A12] p-2.5 shadow-2xl z-20 transition-transform duration-300 hover:scale-[1.02]"
                >
                    {/* Speaker notch */}
                    <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-[#1E3328]" />

                    {/* Phone Screen: Live POS Sessions */}
                    <div className="h-115 sm:h-127.5 overflow-hidden rounded-4xl bg-[#0C2417] text-white font-sans flex flex-col text-[11px] leading-tight border border-[#1B422D]">
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#163825] bg-[#081B11]">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-white tracking-tight">Đang câu</span>
                                <span className="rounded-full bg-[#1A4B2F] px-2 py-0.5 text-[9px] font-bold text-[#4ADE80]">
                                    Trực tiếp
                                </span>
                            </div>
                            <span className="text-[10px] text-[#86AB94] font-medium">2 vé • 3 ô</span>
                        </div>

                        {/* Scrollable session list */}
                        <div className="flex-1 overflow-hidden p-2.5 space-y-2 bg-[#0A1F14]">
                            {/* Card 1: Ô 16 + 28 - Anh Long */}
                            <div className="rounded-2xl border-2 border-[#34A853]/60 bg-[#122E1F] p-2.5 space-y-2 shadow-md">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-extrabold text-white text-[12px]">16 • 28</span>
                                            <span className="text-[9px] text-[#9ACFB0]">Bờ trước • 10 giờ</span>
                                        </div>
                                        <p className="text-[11px] font-bold text-[#4ADE80] mt-0.5">Anh Long</p>
                                    </div>
                                    <div className="rounded-xl bg-[#091D13] border border-[#235738] px-2 py-1 text-right">
                                        <div className="font-mono text-xs font-black text-[#52D879] tracking-wider">
                                            09:59:42
                                        </div>
                                        <p className="text-[7.5px] uppercase font-bold text-[#73A685]">Đếm ngược</p>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-[#0E2519] p-2 text-[9px] space-y-0.5 border border-[#1A3F2A]">
                                    <div className="flex justify-between text-[#B2D8BF]">
                                        <span>Tổng chi phí:</span>
                                        <span className="font-bold text-white">+2.650.000đ</span>
                                    </div>
                                    <div className="flex justify-between text-[#86AB94]">
                                        <span>Đã thu trước:</span>
                                        <span className="text-[#FBBF24] font-semibold">-1.250.000đ</span>
                                    </div>
                                    <div className="flex justify-between text-[#86AB94]">
                                        <span>Dịch vụ kèm:</span>
                                        <span className="text-white">+1 Nón, 4 Nước ngọt</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="w-full rounded-xl bg-[#246B38] py-1.5 text-center text-[10px] font-extrabold text-white shadow-xs hover:bg-[#2C8044] transition-colors"
                                >
                                    Kết thúc & In bill
                                </button>
                            </div>

                            {/* Card 2: Ô 02 - Anh An */}
                            <div className="rounded-2xl border border-[#1F482F] bg-[#0E2419] p-2.5 space-y-1.5 opacity-90">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-white text-[11px]">02</span>
                                            <span className="text-[9px] text-[#86AB94]">Bờ trước • 5 giờ</span>
                                        </div>
                                        <p className="text-[10px] font-semibold text-[#86AB94] mt-0.5">Anh An</p>
                                    </div>
                                    <div className="rounded-lg bg-[#081810] px-1.5 py-0.5 text-right font-mono text-[10px] font-bold text-[#4ADE80]">
                                        04:59:00
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="w-full rounded-lg bg-[#183E28] py-1 text-center text-[9px] font-bold text-[#86AB94]"
                                >
                                    Kết thúc & In bill
                                </button>
                            </div>
                        </div>

                        {/* Bottom Action Sheet for Active Session */}
                        <div className="border-t border-[#1C462C] bg-[#081D12] p-2 space-y-1.5">
                            <p className="text-[8.5px] font-bold uppercase tracking-wider text-[#6DA882] text-center">
                                Đang chọn: 16 • 28 — Anh Long
                            </p>
                            <div className="grid grid-cols-3 gap-1 text-[8.5px] font-bold">
                                <span className="rounded-lg bg-[#143B24] border border-[#235738] py-1 text-center text-white">
                                    + Thêm hàng
                                </span>
                                <span className="rounded-lg bg-[#143B24] border border-[#235738] py-1 text-center text-white">
                                    Gia hạn
                                </span>
                                <span className="rounded-lg bg-[#143B24] border border-[#235738] py-1 text-center text-[#4ADE80]">
                                    Thu cá
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[8.5px] font-bold">
                                <span className="rounded-lg bg-[#246B38] py-1 text-center text-white shadow-xs">
                                    Đóng phiên & In bill
                                </span>
                                <span className="rounded-lg border border-[#2A5C3D] py-1 text-center text-[#B2D8BF]">
                                    In lại vé
                                </span>
                            </div>
                        </div>

                        {/* Bottom Navigation */}
                        <div className="flex items-center justify-around border-t border-[#163825] bg-[#06180E] py-1.5 text-[7.5px] text-[#6DA882]">
                            <span className="flex flex-col items-center">
                                <span>🏠</span>
                                <span>Trang chủ</span>
                            </span>
                            <span className="flex flex-col items-center text-[#4ADE80] font-bold">
                                <span>⏱️</span>
                                <span>Đang câu</span>
                            </span>
                            <span className="flex flex-col items-center">
                                <span>➕</span>
                                <span>Tạo vé</span>
                            </span>
                            <span className="flex flex-col items-center">
                                <span>📊</span>
                                <span>Báo cáo</span>
                            </span>
                            <span className="flex flex-col items-center">
                                <span>⚙️</span>
                                <span>Cài đặt</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── FLOATING BADGE 1 (Góc trên bên phải): Đang hoạt động 2 vé • 3 ô ── */}
                <div className="absolute -top-3 right-0 sm:-right-4 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 shadow-xl backdrop-blur-md z-30 animate-bounce-subtle">
                    <p className="text-[10px] font-semibold text-[#66716A]">Đang hoạt động</p>
                    <p className="text-[13px] font-black text-[#17201A] tracking-tight">2 vé • 3 ô</p>
                </div>

                {/* ── FLOATING BADGE 2 (Góc dưới bên trái): Theo dõi từ xa / Rõ từng khoản thu ── */}
                <div className="absolute -bottom-2 left-2 sm:left-2 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 shadow-xl backdrop-blur-md z-30">
                    <p className="text-[10px] font-semibold text-[#66716A]">Theo dõi từ xa</p>
                    <p className="text-[13px] font-black text-[#246B38] tracking-tight">Rõ từng khoản thu</p>
                </div>
            </div>
        </div>
    );
}
