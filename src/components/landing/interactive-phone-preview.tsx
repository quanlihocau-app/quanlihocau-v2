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
        setTimeout(() => setIsPrinted(false), 3000);
    };

    return (
        <div className="relative mx-auto w-full max-w-90 select-none">
            {/* Ambient Glow behind phone */}
            <div className="absolute -inset-1.5 rounded-[42px] bg-linear-to-tr from-[#246B38] to-[#4ADE80]/30 opacity-60 blur-xl transition-all duration-500" />

            {/* Phone Outer Shell */}
            <div className="relative rounded-[38px] border-4 border-[#1E482D] bg-[#061F13] p-3 shadow-2xl shadow-black/80">
                {/* Speaker Notch */}
                <div className="mx-auto mb-2.5 h-1.5 w-16 rounded-full bg-[#1E482D]" />

                {/* Status Bar */}
                <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-semibold text-[#86A893]">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
                        Hồ Đồng Quê • Ca sáng
                    </span>
                    <span className="font-mono text-[10px] text-[#A8C9B4]">14:32</span>
                </div>

                {/* Inner Screen Area */}
                <div className="space-y-3 rounded-2xl bg-[#082618] p-3 border border-[#164329]">
                    {/* Active Session Card 1 */}
                    <div className="rounded-xl border border-[#205235] bg-[#0C3220] p-3 space-y-2 shadow-inner">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white">Chòi VIP 01</span>
                                    <span className="rounded bg-[#1A5432] px-1.5 py-0.5 text-[9px] font-semibold text-[#68E396]">
                                        Đang câu
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#93B5A0] mt-0.5">
                                    Gói 4h • <span className="text-white font-semibold">200.000đ</span>
                                    {extraHours > 0 && (
                                        <span className="text-[#FBBF24] font-semibold"> (+{extraHours}h)</span>
                                    )}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-xs font-bold text-[#4ADE80] tabular-nums">
                                    02:45:10
                                </div>
                                <p className="text-[9px] uppercase tracking-wider text-[#739E82] font-semibold">
                                    Còn lại
                                </p>
                            </div>
                        </div>

                        {/* Customer & Extras */}
                        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[#19452C] pt-2 text-[11px]">
                            <span className="font-medium text-[#C5DDD0]">Anh Tuấn (0912***)</span>
                            <div className="flex items-center gap-1">
                                {extraDrinks > 0 && (
                                    <span className="rounded bg-[#18462C] px-1.5 py-0.5 text-[10px] font-bold text-[#4ADE80]">
                                        +{extraDrinks} Nước
                                    </span>
                                )}
                                {fishWeight > 0 && (
                                    <span className="rounded bg-[#3B2514] px-1.5 py-0.5 text-[10px] font-bold text-[#F59E0B]">
                                        -{fishWeight}kg cá
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Interactive Action Controls - Clickable by Lake Owner */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#7DA38C]">
                                Thử bấm thao tác thực tế:
                            </span>
                            <span className="text-[9px] text-[#4ADE80] font-semibold">Chạm để thử</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setExtraDrinks((prev) => (prev < 6 ? prev + 1 : 0))}
                                className="flex flex-col items-center justify-center rounded-lg border border-[#235838] bg-[#0E3622] py-2 px-1 text-center transition-all active:scale-95 hover:bg-[#15462D] cursor-pointer"
                                title="Bấm để thử thêm lon nước vào bill"
                            >
                                <span className="text-[14px]">🥤</span>
                                <span className="text-[10px] font-bold text-white mt-0.5">
                                    +Nước ({extraDrinks})
                                </span>
                                <span className="text-[9px] text-[#86AB94]">+15k</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setExtraHours((prev) => (prev < 3 ? prev + 1 : 0))}
                                className="flex flex-col items-center justify-center rounded-lg border border-[#235838] bg-[#0E3622] py-2 px-1 text-center transition-all active:scale-95 hover:bg-[#15462D] cursor-pointer"
                                title="Bấm để thử gia hạn giờ câu"
                            >
                                <span className="text-[14px]">⏱️</span>
                                <span className="text-[10px] font-bold text-white mt-0.5">
                                    +1 Tiếng ({extraHours}h)
                                </span>
                                <span className="text-[9px] text-[#86AB94]">+50k</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFishWeight((prev) => (prev < 4 ? prev + 1 : 0))}
                                className="flex flex-col items-center justify-center rounded-lg border border-[#235838] bg-[#0E3622] py-2 px-1 text-center transition-all active:scale-95 hover:bg-[#15462D] cursor-pointer"
                                title="Bấm để thử cân cá trừ tiền"
                            >
                                <span className="text-[14px]">🐟</span>
                                <span className="text-[10px] font-bold text-white mt-0.5">
                                    Cân cá ({fishWeight}kg)
                                </span>
                                <span className="text-[9px] text-[#F59E0B]">-60k/kg</span>
                            </button>
                        </div>
                    </div>

                    {/* Warning Card: Ending Soon Session */}
                    <div className="rounded-xl border border-[#D97706]/40 bg-[#291A0A] p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#FDE68A]">Ô 08 Cầu Sắt</span>
                            <span className="rounded bg-[#B45309]/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#FBBF24]">
                                00:04:12 (Sắp hết)
                            </span>
                        </div>
                        <p className="text-[10px] text-[#D4A373]">
                            ⚠️ Hết giờ máy sẽ tự động tính thêm phụ thu theo phút. Không sợ cãi nhau.
                        </p>
                    </div>

                    {/* Live Bill Total & Print Trigger */}
                    <div className="rounded-xl border border-[#246B38] bg-[#0E3B24] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#9DC4AC]">Tổng tiền bill Chòi VIP 01:</span>
                            <span className="font-mono text-base font-extrabold text-[#4ADE80] tabular-nums">
                                {totalBill.toLocaleString("vi-VN")}đ
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#22C55E] py-2.5 text-xs font-bold text-[#061F13] shadow-md hover:bg-[#4ADE80] active:scale-95 transition-all cursor-pointer"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.25-.37-2.53-.37-3.829 0-2.062.33-4.048.94-5.91a2.25 2.25 0 0 1 2.15-1.59h5.12a2.25 2.25 0 0 1 2.15 1.59c.61 1.862.94 3.848.94 5.91 0 1.3-.13 2.58-.37 3.829m-10.61 0a2.25 2.25 0 0 0-2.15 1.59A18.784 18.784 0 0 0 2.25 19.5h19.5c-.376-1.54-.93-2.99-1.63-4.329a2.25 2.25 0 0 0-2.15-1.59m-13.24 0h13.24" />
                            </svg>
                            <span>{isPrinted ? "Đang in bill nhiệt qua Bluetooth..." : "Thử in bill thanh toán"}</span>
                        </button>
                    </div>

                    {/* Simulated Receipt Slide Out */}
                    {isPrinted && (
                        <div className="animate-in fade-in slide-in-from-top-3 duration-300 rounded-lg bg-white p-2 text-center text-[#17201A] shadow-lg">
                            <p className="font-mono text-[10px] font-bold">HỒ CÂU ĐỒNG QUÊ</p>
                            <p className="font-mono text-[9px] text-[#66716A]">HĐ: VIP01 • 14:32</p>
                            <div className="my-1 border-b border-dashed border-gray-400" />
                            <p className="font-mono text-[11px] font-bold text-[#15803D]">
                                THÀNH TIỀN: {totalBill.toLocaleString("vi-VN")}đ
                            </p>
                            <p className="font-mono text-[8px] text-gray-500 mt-0.5">In Bluetooth 58mm tức thì tại chòi</p>
                        </div>
                    )}
                </div>

                {/* Home Indicator */}
                <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-[#1E482D]" />
            </div>
        </div>
    );
}
