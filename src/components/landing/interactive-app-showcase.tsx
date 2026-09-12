"use client";

import React, { useState } from "react";

type ShowcaseTab = "dang-cau" | "tao-ve" | "thanh-toan" | "doi-soat";

interface TabConfig {
    id: ShowcaseTab;
    label: string;
    badge: string;
    description: string;
    bullets: string[];
}

const TABS: TabConfig[] = [
    {
        id: "dang-cau",
        label: "1. Đang câu",
        badge: "Đếm ngược thời gian thực",
        description: "Mỗi chòi hoặc ô câu là một đồng hồ đếm ngược riêng biệt. Quá 1 phút là hệ thống tự động nhảy tiền phụ thu theo công thức của hồ, không cần nhân viên đứng canh hay bấm nhầm.",
        bullets: [
            "Đếm ngược trực tiếp từng giây cho từng ô/chòi",
            "Tự động tính tiền quá giờ minh bạch",
            "Thêm nước ngọt, mồi câu ngay khi khách đang ngồi câu",
        ],
    },
    {
        id: "tao-ve",
        label: "2. Tạo vé",
        badge: "Mở vé trong 3 giây",
        description: "Giao diện trực quan theo sơ đồ thực tế của hồ (Bờ ngang, Bờ dọc, Nhà bè). Chọn 1 hoặc nhiều ô cùng lúc, lưu lịch sử khách quen và gói câu nhanh chóng.",
        bullets: [
            "Sơ đồ ô trực quan biết ngay ô nào trống, ô nào có khách",
            "Mở 1 vé cho nhóm câu nhiều ô liền kề",
            "Tùy chọn thu tiền trước hoặc cho khách câu xong mới tính",
        ],
    },
    {
        id: "thanh-toan",
        label: "3. Thanh toán",
        badge: "Cấn trừ cá & In bill 58mm",
        description: "Gom tất cả tiền vé, tiền nước, tiền mồi vào 1 bill. Nếu khách câu được cá và hồ thu mua lại, hệ thống tự động cân cá và cấn trừ tiền ngay trong bill.",
        bullets: [
            "Tự động bù trừ tiền cá khách câu được vào hóa đơn",
            "Tách rõ tiền mặt, chuyển khoản, quét mã QR VietQR",
            "In bill nhiệt 58mm tức thì không cần kết nối rườm rà",
        ],
    },
    {
        id: "doi-soat",
        label: "4. Đối soát",
        badge: "Nhật ký nhân viên minh bạch",
        description: "Chủ hồ đi vắng vẫn biết từng giây ở hồ xảy ra chuyện gì. Bất kỳ thao tác mở vé, bán hàng, sửa đổi hay hủy giao dịch đều được ghi nhận đích danh người làm.",
        bullets: [
            "Ghi lại chi tiết ai tạo vé, ai thu tiền, lúc mấy giờ",
            "Chặn gian lận hủy vé hoặc bớt xén tiền hàng",
            "Báo cáo ca chốt tiền mặt và tiền tài khoản chuẩn xác",
        ],
    },
];

export function InteractiveAppShowcase() {
    const [activeTab, setActiveTab] = useState<ShowcaseTab>("dang-cau");

    return (
        <section id="trinh-dien" className="scroll-mt-20 py-16 sm:py-24 bg-[#082417] text-white">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#246B38] bg-[#0E3621] px-3.5 py-1 text-xs font-semibold text-[#52D879]">
                        TRẢI NGHIỆM GIAO DIỆN THẬT
                    </span>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                        Xem ứng dụng hoạt động thực tế
                    </h2>
                    <p className="text-sm sm:text-base text-[#A3C7B0] leading-relaxed">
                        Bấm vào từng bước bên dưới để xem cách nhân viên và chủ hồ thao tác hàng ngày trên điện thoại.
                    </p>
                </div>

                {/* Tab Navigation Buttons */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-150 ${
                                    isActive
                                        ? "bg-[#4F9D5A] text-white shadow-lg shadow-[#4F9D5A]/30 scale-105"
                                        : "border border-[#1A452C] bg-[#0B2A1B] text-[#B0D5BE] hover:bg-[#123624] hover:text-white"
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Main Interactive Showcase Grid */}
                <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0C2D1F] border border-[#1C4D32] rounded-3xl p-5 sm:p-8 lg:p-10 shadow-2xl">
                    {/* Left Column: Explanatory Content */}
                    <div className="lg:col-span-6 space-y-5">
                        {TABS.map((tab) => {
                            if (tab.id !== activeTab) return null;
                            return (
                                <div key={tab.id} className="space-y-4 animate-fade-in">
                                    <span className="inline-block rounded-md bg-[#1F5434] border border-[#2D7349] px-2.5 py-1 text-[11px] font-bold text-[#52D879]">
                                        {tab.badge}
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-black text-white">
                                        {tab.label.replace(/^\d+\.\s*/, "")}
                                    </h3>
                                    <p className="text-sm sm:text-base text-[#B9DCB6] leading-relaxed">
                                        {tab.description}
                                    </p>
                                    <ul className="space-y-2.5 pt-2">
                                        {tab.bullets.map((bullet, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-white">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#246B38] text-[#52D879] text-xs font-bold">
                                                    ✓
                                                </span>
                                                <span>{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="pt-3 flex items-center gap-3">
                                        <a
                                            href="#lien-he"
                                            className="inline-flex items-center gap-2 rounded-xl bg-[#4F9D5A] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#3D8547] transition-all shadow-md"
                                        >
                                            Nhận tư vấn hồ của bạn →
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Column: Screen simulation inside a phone container */}
                    <div className="lg:col-span-6 flex justify-center">
                        <div className="w-full max-w-80 rounded-[38px] border-[5px] border-[#132A1F] bg-[#0A1A12] p-2.5 shadow-2xl">
                            {/* Speaker notch */}
                            <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-[#244233]" />

                            {/* Inner Screen based on activeTab */}
                            <div className="h-115 overflow-hidden rounded-[28px] bg-[#F7F9F5] text-[#17201A] font-sans flex flex-col border border-[#D5DDD6]">
                                {/* ── SCREEN 1: ĐANG CÂU ── */}
                                {activeTab === "dang-cau" && (
                                    <div className="flex-1 flex flex-col text-[11px] bg-[#0E271B] text-white">
                                        <div className="flex items-center justify-between p-3 bg-[#081B11] border-b border-[#183E28]">
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-sm text-white">Đang câu</span>
                                                <span className="rounded-full bg-[#18482C] px-1.5 py-0.5 text-[9px] font-bold text-[#4ADE80]">
                                                    2 Chòi VIP
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-[#7BAE8E]">Hồ Kim Thông</span>
                                        </div>

                                        <div className="flex-1 p-2.5 space-y-2.5 overflow-hidden">
                                            {/* Live Session Card 1 */}
                                            <div className="rounded-2xl border border-[#2D7349] bg-[#123624] p-3 space-y-2 shadow-md">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-black text-white">Chòi 08 • Bờ Râm</span>
                                                            <span className="rounded bg-[#205537] px-1 py-0.2 text-[8.5px] font-bold text-[#52D879]">
                                                                VIP
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] font-bold text-[#4ADE80] mt-0.5">Anh Thắng (Khách quen)</p>
                                                    </div>
                                                    <div className="rounded-xl border border-[#3E9B4F]/40 bg-[#091D13] px-2 py-1 text-right">
                                                        <div className="font-mono text-xs font-black text-[#52D879]">01:42:18</div>
                                                        <p className="text-[7.5px] uppercase font-bold text-[#7BAE8E]">Thời gian còn</p>
                                                    </div>
                                                </div>

                                                <div className="rounded-lg bg-[#0A2216] p-2 text-[9.5px] space-y-1 border border-[#19402B]">
                                                    <div className="flex justify-between text-[#BCE3CA]">
                                                        <span>Tiền vé 4h:</span>
                                                        <span className="font-bold text-white">200.000đ</span>
                                                    </div>
                                                    <div className="flex justify-between text-[#86AB94]">
                                                        <span>Dịch vụ gọi thêm:</span>
                                                        <span className="text-white">+2 Bò húc, 1 Gói cám</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-1 text-[8.5px] font-bold pt-1">
                                                    <span className="rounded-lg bg-[#19432B] py-1 text-center text-white">+ Thêm đồ</span>
                                                    <span className="rounded-lg bg-[#19432B] py-1 text-center text-white">Gia hạn</span>
                                                    <span className="rounded-lg bg-[#246B38] py-1 text-center text-[#52D879]">Thu cá</span>
                                                </div>
                                            </div>

                                            {/* Live Session Card 2 */}
                                            <div className="rounded-2xl border border-[#1A452C] bg-[#0E271B] p-2.5 opacity-80">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-white">Ô 15 • Ca sáng</p>
                                                        <p className="text-[10px] text-[#86AB94]">Khách lẻ</p>
                                                    </div>
                                                    <div className="font-mono text-[11px] font-bold text-[#FBBF24]">
                                                        +00:15:30 (Lố giờ)
                                                    </div>
                                                </div>
                                                <p className="mt-1 text-[9px] text-[#FBBF24] font-semibold">
                                                    Phụ thu tự động: +25.000đ
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── SCREEN 2: TẠO VÉ ── */}
                                {activeTab === "tao-ve" && (
                                    <div className="flex-1 flex flex-col text-[10px] bg-white p-2.5 space-y-2">
                                        <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2">
                                            <span className="text-xs font-black text-[#17201A]">Mở Vé Mới</span>
                                            <span className="rounded-md bg-[#E8F3E5] px-1.5 py-0.5 font-bold text-[#246B38]">
                                                3 Giây
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="font-bold text-[#246B38] text-[9px]">SƠ ĐỒ Ô CÂU (BỜ NGANG)</span>
                                            <div className="grid grid-cols-5 gap-1 text-center font-bold text-[9px]">
                                                <span className="rounded bg-[#246B38] text-white py-1.5 shadow-xs">01 ✓</span>
                                                <span className="rounded bg-[#246B38] text-white py-1.5 shadow-xs">02 ✓</span>
                                                <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] text-[#66716A] py-1.5">03</span>
                                                <span className="rounded bg-[#8B1E1E] text-white py-1.5">04 (Đầy)</span>
                                                <span className="rounded border border-[#D5DDD6] bg-[#F7F9F5] text-[#66716A] py-1.5">05</span>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-[#E3E8E3] bg-[#F7F9F5] p-2 space-y-1">
                                            <p className="font-bold text-[#17201A]">Đã chọn: Ô 01 + Ô 02 (Nhóm 2 cần)</p>
                                            <p className="text-[9px] text-[#66716A]">Gói: Ca 4 Tiếng (200.000đ/cần)</p>
                                        </div>

                                        <div className="rounded-xl border border-[#3E9B4F]/30 bg-[#E8F3E5] p-2 space-y-1">
                                            <div className="flex justify-between font-bold text-[#246B38]">
                                                <span>Tổng tiền vé tạm:</span>
                                                <span>400.000đ</span>
                                            </div>
                                            <div className="flex gap-1 text-[8.5px]">
                                                <span className="flex-1 rounded bg-[#246B38] text-white py-1 text-center font-bold">
                                                    Thu trước
                                                </span>
                                                <span className="flex-1 rounded border border-[#246B38] text-[#246B38] py-1 text-center font-bold">
                                                    Thu sau
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="w-full rounded-xl bg-[#246B38] py-2 text-center text-[10.5px] font-extrabold text-white shadow-md"
                                        >
                                            Xác nhận Mở Vé Ngay
                                        </button>
                                    </div>
                                )}

                                {/* ── SCREEN 3: THANH TOÁN ── */}
                                {activeTab === "thanh-toan" && (
                                    <div className="flex-1 flex flex-col text-[10px] bg-[#F7F9F5] p-2.5 space-y-2">
                                        <div className="rounded-xl bg-white border border-[#E3E8E3] p-2.5 space-y-1.5 shadow-xs">
                                            <div className="text-center border-b border-dashed border-[#CCD6CC] pb-1.5">
                                                <p className="font-black text-xs text-[#17201A]">HỒ CÂU KIM THÔNG</p>
                                                <p className="text-[8.5px] text-[#66716A]">Hóa đơn chốt ca #HD-8921</p>
                                            </div>

                                            <div className="space-y-1 text-[9px]">
                                                <div className="flex justify-between">
                                                    <span>Tiền ca (Ô 08 • 4h):</span>
                                                    <span className="font-bold">200.000đ</span>
                                                </div>
                                                <div className="flex justify-between text-[#8A938D]">
                                                    <span>+ 2 Lon Bò húc (15k):</span>
                                                    <span>30.000đ</span>
                                                </div>
                                                <div className="flex justify-between text-[#9A600B] font-bold">
                                                    <span>- Thu mua 3.2kg cá chim (60k):</span>
                                                    <span>-192.000đ</span>
                                                </div>
                                            </div>

                                            <div className="border-t border-[#E3E8E3] pt-1 flex justify-between items-center text-xs font-black text-[#246B38]">
                                                <span>KHÁCH CẦN TRẢ:</span>
                                                <span className="text-sm">38.000đ</span>
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white border border-[#E3E8E3] p-2 space-y-1">
                                            <p className="font-bold text-[9px] text-[#66716A]">PHƯƠNG THỨC THANH TOÁN</p>
                                            <div className="grid grid-cols-2 gap-1 font-bold text-[9px]">
                                                <span className="rounded-lg bg-[#E8F3E5] border border-[#3E9B4F] text-[#246B38] py-1.5 text-center">
                                                    💵 Tiền mặt
                                                </span>
                                                <span className="rounded-lg border border-[#E3E8E3] text-[#66716A] py-1.5 text-center">
                                                    📲 QR Chuyển khoản
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="w-full rounded-xl bg-[#246B38] py-2 text-center text-[10.5px] font-black text-white shadow-md flex items-center justify-center gap-1"
                                        >
                                            <span>🖨️</span>
                                            <span>Thanh Toán & In Bill 58mm</span>
                                        </button>
                                    </div>
                                )}

                                {/* ── SCREEN 4: ĐỐI SOÁT ── */}
                                {activeTab === "doi-soat" && (
                                    <div className="flex-1 flex flex-col text-[10px] bg-white p-2.5 space-y-2">
                                        <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-1.5">
                                            <div>
                                                <p className="font-black text-xs text-[#17201A]">Nhật Ký Hoạt Động</p>
                                                <p className="text-[8.5px] text-[#66716A]">Minh bạch từng thao tác</p>
                                            </div>
                                            <span className="rounded-full bg-[#EBF6ED] px-2 py-0.5 text-[8.5px] font-bold text-[#246B38]">
                                                Hôm nay
                                            </span>
                                        </div>

                                        <div className="flex-1 space-y-1.5 overflow-hidden">
                                            <div className="rounded-lg border border-[#E3E8E3] bg-[#F7F9F5] p-1.5 space-y-0.5">
                                                <div className="flex justify-between text-[8px] text-[#8A938D]">
                                                    <span>14:45 • NV Nam</span>
                                                    <span className="font-bold text-[#246B38]">Mở vé</span>
                                                </div>
                                                <p className="font-semibold text-[9px] text-[#17201A]">
                                                    Mở vé Chòi 08 cho Anh Thắng (Ca 4h)
                                                </p>
                                            </div>

                                            <div className="rounded-lg border border-[#E3E8E3] bg-[#F7F9F5] p-1.5 space-y-0.5">
                                                <div className="flex justify-between text-[8px] text-[#8A938D]">
                                                    <span>15:10 • NV Nam</span>
                                                    <span className="font-bold text-[#9A600B]">Bán hàng</span>
                                                </div>
                                                <p className="font-semibold text-[9px] text-[#17201A]">
                                                    Thêm 2 Bò húc vào Chòi 08 (+30.000đ)
                                                </p>
                                            </div>

                                            <div className="rounded-lg border border-[#E3E8E3] bg-[#F7F9F5] p-1.5 space-y-0.5">
                                                <div className="flex justify-between text-[8px] text-[#8A938D]">
                                                    <span>16:02 • NV Lan</span>
                                                    <span className="font-bold text-[#3E9B4F]">Thu tiền</span>
                                                </div>
                                                <p className="font-semibold text-[9px] text-[#17201A]">
                                                    Thu chuyển khoản QR 38.000đ (Đóng ca Chòi 08)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-[#E8F3E5] p-2 text-center text-[9.5px] font-bold text-[#246B38]">
                                            Chủ hồ xem báo cáo từ xa mọi lúc mọi nơi
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
