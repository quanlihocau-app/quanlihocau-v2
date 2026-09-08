"use client";

import { useState } from "react";
import Link from "next/link";

export function LakeLossCalculator() {
    const [dailyRods, setDailyRods] = useState(30);
    const [overtimeMinutes, setOvertimeMinutes] = useState(20);
    const [hourlyRate, setHourlyRate] = useState(50000);
    const [missedItems, setMissedItems] = useState(3);

    // Calculations
    // Overtime loss per rod = (overtimeMinutes / 60) * hourlyRate
    // Average 30% of rods go overtime if using paper logbook
    const rodsOvertimeCount = dailyRods * 0.4;
    const dailyOvertimeLoss = rodsOvertimeCount * (overtimeMinutes / 60) * hourlyRate;
    const monthlyOvertimeLoss = Math.round(dailyOvertimeLoss * 30);

    const missedItemPrice = 15000; // 15.000đ per item (drink/bait)
    const monthlyMissedItemLoss = missedItems * missedItemPrice * 30;

    const totalMonthlyLoss = monthlyOvertimeLoss + monthlyMissedItemLoss;

    return (
        <section className="relative overflow-hidden py-16 sm:py-20 bg-linear-to-b from-[#061F13] to-[#0A2E1C] border-y border-[#164329]">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-87.5 bg-[#246B38]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D97706]/40 bg-[#2E1D0A] px-3.5 py-1 text-xs font-bold text-[#FBBF24] tracking-wide uppercase">
                        <span className="h-2 w-2 rounded-full bg-[#F59E0B] animate-ping" />
                        Bảng tính dành riêng cho chủ hồ câu
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                        Hồ của bạn đang thất thoát bao nhiêu tiền <br />
                        <span className="text-[#FBBF24]">nếu vẫn ghi chép sổ tay hoặc nhớ miệng?</span>
                    </h2>
                    <p className="text-sm sm:text-base text-[#9EC4AD] max-w-2xl mx-auto">
                        Khách câu lố 15-20 phút ngại tính thêm, nước ngọt đem ra quên ghi sổ...
                        Kéo thanh trượt bên dưới để thấy số tiền thực tế đang trôi đi mỗi tháng:
                    </p>
                </div>

                {/* Calculator Grid */}
                <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Controls Column */}
                    <div className="lg:col-span-7 space-y-5 rounded-3xl border border-[#1E4D30] bg-[#09291A]/90 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
                        {/* Slider 1: Daily Rods */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-white">
                                    Số lượt cần câu / khách mỗi ngày:
                                </span>
                                <span className="font-mono text-base font-bold text-[#4ADE80] bg-[#0E3B23] px-3 py-0.5 rounded-lg border border-[#246B38]">
                                    {dailyRods} cần/ngày
                                </span>
                            </div>
                            <input
                                type="range"
                                min={5}
                                max={120}
                                step={5}
                                value={dailyRods}
                                onChange={(e) => setDailyRods(Number(e.target.value))}
                                className="w-full accent-[#22C55E] h-2 bg-[#123E27] rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-[#6E957D]">
                                <span>5 cần (Hồ nhỏ)</span>
                                <span>60 cần (Hồ vừa)</span>
                                <span>120 cần (Hồ lớn)</span>
                            </div>
                        </div>

                        {/* Slider 2: Average Overtime Minutes */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-white">
                                    Thời gian khách câu lố trung bình (ngại tính tiền):
                                </span>
                                <span className="font-mono text-base font-bold text-[#FBBF24] bg-[#3B250D] px-3 py-0.5 rounded-lg border border-[#B45309]">
                                    {overtimeMinutes} phút/cần
                                </span>
                            </div>
                            <input
                                type="range"
                                min={5}
                                max={60}
                                step={5}
                                value={overtimeMinutes}
                                onChange={(e) => setOvertimeMinutes(Number(e.target.value))}
                                className="w-full accent-[#F59E0B] h-2 bg-[#123E27] rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-[#6E957D]">
                                <span>5 phút (Lố ít)</span>
                                <span>20 phút (Bình thường)</span>
                                <span>60 phút (Lố cả tiếng)</span>
                            </div>
                        </div>

                        {/* Slider 3: Hourly Rate */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-white">
                                    Giá giờ câu trung bình của hồ:
                                </span>
                                <span className="font-mono text-base font-bold text-white bg-[#0E3B23] px-3 py-0.5 rounded-lg border border-[#246B38]">
                                    {hourlyRate.toLocaleString("vi-VN")}đ/giờ
                                </span>
                            </div>
                            <input
                                type="range"
                                min={25000}
                                max={100000}
                                step={5000}
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(Number(e.target.value))}
                                className="w-full accent-[#22C55E] h-2 bg-[#123E27] rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Slider 4: Missed items */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-white">
                                    Nước, bia, mồi câu bị quên ghi sổ mỗi ngày:
                                </span>
                                <span className="font-mono text-base font-bold text-[#F87171] bg-[#3B1212] px-3 py-0.5 rounded-lg border border-[#991B1B]">
                                    {missedItems} món/ngày
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={15}
                                step={1}
                                value={missedItems}
                                onChange={(e) => setMissedItems(Number(e.target.value))}
                                className="w-full accent-[#EF4444] h-2 bg-[#123E27] rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Result Output Card */}
                    <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border-2 border-[#D97706]/50 bg-linear-to-br from-[#1C1308] via-[#2A1B0A] to-[#140E06] p-6 sm:p-8 text-center shadow-2xl relative">
                        <div className="space-y-4">
                            <span className="inline-block rounded-full bg-[#B45309]/30 px-3 py-1 text-xs font-bold text-[#FBBF24] uppercase tracking-wider border border-[#F59E0B]/30">
                                Ước tính thất thoát mỗi tháng
                            </span>

                            <div>
                                <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F59E0B] tabular-nums tracking-tight">
                                    {totalMonthlyLoss.toLocaleString("vi-VN")}đ
                                </div>
                                <p className="text-xs text-[#FDE68A] mt-1 font-medium">
                                    (Khoảng {(totalMonthlyLoss / 1000000).toFixed(1)} triệu đồng / tháng)
                                </p>
                            </div>

                            <div className="border-t border-[#B45309]/30 pt-4 space-y-2 text-xs text-left">
                                <div className="flex justify-between text-[#E0B885]">
                                    <span>Tiền giờ câu lố bị bỏ qua:</span>
                                    <span className="font-mono font-bold text-white">
                                        ~{monthlyOvertimeLoss.toLocaleString("vi-VN")}đ
                                    </span>
                                </div>
                                <div className="flex justify-between text-[#E0B885]">
                                    <span>Nước uống, mồi câu quên tính:</span>
                                    <span className="font-mono font-bold text-white">
                                        ~{monthlyMissedItemLoss.toLocaleString("vi-VN")}đ
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-[#09291A] p-3.5 border border-[#1E4D30] text-left text-xs space-y-1.5">
                                <p className="font-bold text-[#4ADE80] flex items-center gap-1.5">
                                    <span>🛡️</span> Giữ lại 100% số tiền này ngay hôm nay:
                                </p>
                                <p className="text-[#A8C9B4] text-[11px] leading-relaxed">
                                    App tự đếm ngược và tự nhảy phụ thu quá giờ. Khách nhìn đồng hồ trên màn hình điện thoại tự động đồng ý trả tiền, không còn cảnh đôi co mất lòng.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] px-6 py-3.5 text-sm font-bold text-[#061F13] shadow-lg shadow-[#22C55E]/20 hover:bg-[#4ADE80] active:scale-95 transition-all cursor-pointer"
                            >
                                <span>Dùng thử 7 ngày để thu hồi tiền ngay</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                            <p className="text-[11px] text-[#A8C9B4] mt-2">
                                Miễn phí 100% • Không cần thẻ tín dụng • Tạo hồ xong trong 30 giây
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
