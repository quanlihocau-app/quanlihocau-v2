"use client";

import { useState } from "react";

export function InteractivePhonePreview() {
    // State for interactive simulation
    const [extraDrinks, setExtraDrinks] = useState(2);
    const [extraHours, setExtraHours] = useState(0);
    const [fishWeight, setFishWeight] = useState(0);
    const [isPrinted, setIsPrinted] = useState(false);

    const basePackagePrice = 200000; // 4 tiếng
    const drinkPrice = 15000;
    const hourPrice = 50000;
    const fishPricePerKg = 60000;

    const totalBill =
        basePackagePrice +
        extraDrinks * drinkPrice +
        extraHours * hourPrice -
        fishWeight * fishPricePerKg;

    const handlePrint = () => {
        setIsPrinted(true);
        setTimeout(() => setIsPrinted(false), 3500);
    };

    return (
        <div className="relative mx-auto w-full max-w-90 select-none">
            {/* Ambient drop shadow */}
            <div className="absolute -inset-2 rounded-[44px] bg-[#246B38]/20 blur-xl transition-all" />

            {/* Phone Outer Shell */}
            <div className="relative rounded-[40px] border-4 border-[#17201A] bg-[#0E1A13] p-2.5 shadow-2xl">
                {/* Speaker Notch */}
                <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-[#2B3830]" />

                {/* Inner Screen Area - Styled EXACTLY like the in-app Mobile POS */}
                <div className="space-y-2.5 rounded-[28px] bg-[#F0F4EF] p-3 text-[#17201A] font-sans overflow-hidden">
                    {/* App Header Inside Phone */}
                    <div className="flex items-center justify-between rounded-xl bg-[#061F13] px-3 py-2 text-white shadow-xs">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#246B38] text-[10px] font-bold text-white">
                                H
                            </div>
                            <div className="leading-tight">
                                <p className="text-[11px] font-bold">Hồ Câu Đồng Quê</p>
                                <p className="text-[9px] text-[#86AB94] flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                                    Đang mở ca trực
                                </p>
                            </div>
                        </div>
                        <span className="rounded-full bg-[#18462C] px-2 py-0.5 text-[9px] font-bold text-[#4ADE80]">
                            CHỦ HỒ
                        </span>
                    </div>

                    {/* Active Session Card 1 */}
                    <div className="rounded-2xl border border-[#E3E8E3] bg-white p-3 space-y-2 shadow-xs">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-[#17201A]">Chòi VIP 01</span>
                                    <span className="rounded-md bg-[#E8F3E5] px-1.5 py-0.2 text-[9px] font-bold text-[#246B38]">
                                        Đang câu
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#66716A] mt-0.5">
                                    Gói 4h • <span className="font-bold text-[#246B38]">200.000đ</span>
                                    {extraHours > 0 && (
                                        <span className="text-[#9A600B] font-bold"> (+{extraHours}h)</span>
                                    )}
                                </p>
                            </div>
                            <div className="rounded-xl border border-[#3E9B4F]/30 bg-[#EBF6ED] px-2 py-1 text-right">
                                <div className="font-mono text-xs font-bold text-[#246B38] tabular-nums">
                                    02:45:10
                                </div>
                                <p className="text-[8px] uppercase tracking-wider text-[#246B38] font-bold">
                                    Còn lại
                                </p>
                            </div>
                        </div>

                        {/* Customer & Extras */}
                        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[#F0F4EF] pt-2 text-[11px]">
                            <span className="font-medium text-[#17201A]">Anh Hùng (0908***)</span>
                            <div className="flex items-center gap-1">
                                {extraDrinks > 0 && (
                                    <span className="rounded bg-[#E8F3E5] px-1.5 py-0.5 text-[10px] font-bold text-[#246B38]">
                                        +{extraDrinks} Lon nước
                                    </span>
                                )}
                                {fishWeight > 0 && (
                                    <span className="rounded bg-[#FEF5E7] px-1.5 py-0.5 text-[10px] font-bold text-[#9A600B]">
                                        -{fishWeight}kg cá
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Interactive Action Controls - Tap on real lake actions */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-[10px] font-bold text-[#66716A] uppercase tracking-wider">
                                Bấm thử thao tác tại chòi:
                            </span>
                            <span className="text-[9px] font-bold text-[#246B38]">1 chạm</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setExtraDrinks((prev) => (prev < 6 ? prev + 1 : 0))}
                                className="flex flex-col items-center justify-center rounded-xl border border-[#E3E8E3] bg-white py-1.5 px-1 text-center shadow-2xs hover:border-[#4F9D5A] active:scale-95 transition-all cursor-pointer"
                                title="Bấm để thử thêm lon nước vào bill"
                            >
                                <span className="text-[13px]">🥤</span>
                                <span className="text-[10px] font-bold text-[#17201A] mt-0.5">
                                    +Nước ({extraDrinks})
                                </span>
                                <span className="text-[9px] text-[#66716A]">+15k</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setExtraHours((prev) => (prev < 3 ? prev + 1 : 0))}
                                className="flex flex-col items-center justify-center rounded-xl border border-[#E3E8E3] bg-white py-1.5 px-1 text-center shadow-2xs hover:border-[#4F9D5A] active:scale-95 transition-all cursor-pointer"
                                title="Bấm để thử gia hạn giờ câu"
                            >
                                <span className="text-[13px]">⏱️</span>
                                <span className="text-[10px] font-bold text-[#17201A] mt-0.5">
                                    +1 Tiếng ({extraHours}h)
                                </span>
                                <span className="text-[9px] text-[#66716A]">+50k</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFishWeight((prev) => (prev < 4 ? prev + 1 : 0))}
                                className="flex flex-col items-center justify-center rounded-xl border border-[#E3E8E3] bg-white py-1.5 px-1 text-center shadow-2xs hover:border-[#4F9D5A] active:scale-95 transition-all cursor-pointer"
                                title="Bấm để thử cân cá trừ tiền"
                            >
                                <span className="text-[13px]">🐟</span>
                                <span className="text-[10px] font-bold text-[#17201A] mt-0.5">
                                    Cân cá ({fishWeight}kg)
                                </span>
                                <span className="text-[9px] text-[#9A600B]">-60k/kg</span>
                            </button>
                        </div>
                    </div>

                    {/* Warning Card: Ending Soon Session */}
                    <div className="rounded-xl border border-[#D99A32]/40 bg-[#FEF5E7] p-2 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#9A600B]">Ô 08 Cầu Sắt</span>
                            <span className="rounded bg-white/80 border border-[#D99A32]/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#9A600B]">
                                00:04:12 (Sắp hết giờ)
                            </span>
                        </div>
                        <p className="text-[9px] text-[#7A4B05] leading-tight">
                            ⚡ Hết giờ máy tự động tính thêm phụ thu theo phút. Khách tự nhìn đồng hồ trả tiền, không lo đôi co.
                        </p>
                    </div>

                    {/* Live Bill Total & Print Trigger */}
                    <div className="rounded-2xl border border-[#E3E8E3] bg-white p-2.5 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#66716A]">Tổng bill Chòi VIP 01:</span>
                            <span className="font-mono text-sm font-extrabold text-[#246B38] tabular-nums">
                                {totalBill.toLocaleString("vi-VN")}đ
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#4F9D5A] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#3D8547] active:scale-95 transition-all cursor-pointer"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.25-.37-2.53-.37-3.829 0-2.062.33-4.048.94-5.91a2.25 2.25 0 0 1 2.15-1.59h5.12a2.25 2.25 0 0 1 2.15 1.59c.61 1.862.94 3.848.94 5.91 0 1.3-.13 2.58-.37 3.829m-10.61 0a2.25 2.25 0 0 0-2.15 1.59A18.784 18.784 0 0 0 2.25 19.5h19.5c-.376-1.54-.93-2.99-1.63-4.329a2.25 2.25 0 0 0-2.15-1.59m-13.24 0h13.24" />
                            </svg>
                            <span>{isPrinted ? "Đang in qua máy in Bluetooth..." : "In bill tính tiền tại chòi"}</span>
                        </button>
                    </div>

                    {/* Simulated Receipt Slide Out */}
                    {isPrinted && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl bg-white border border-[#E3E8E3] p-2 text-center text-[#17201A] shadow-md">
                            <p className="font-mono text-[10px] font-bold">HỒ CÂU ĐỒNG QUÊ</p>
                            <p className="font-mono text-[9px] text-[#66716A]">HĐ: VIP01 • 14:32</p>
                            <div className="my-1 border-b border-dashed border-gray-300" />
                            <p className="font-mono text-[11px] font-bold text-[#246B38]">
                                THÀNH TIỀN: {totalBill.toLocaleString("vi-VN")}đ
                            </p>
                            <p className="font-mono text-[8px] text-[#66716A] mt-0.5">In máy in mini 58mm cầm tay ngay tại bờ hồ</p>
                        </div>
                    )}
                </div>

                {/* Home Indicator */}
                <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-[#2B3830]" />
            </div>
        </div>
    );
}
