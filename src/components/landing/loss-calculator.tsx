"use client";

import { useState } from "react";
import Link from "next/link";

export function LakeLossCalculator() {
    const [dailyRods, setDailyRods] = useState(30);
    const [overtimeMinutes, setOvertimeMinutes] = useState(20);
    const [hourlyRate, setHourlyRate] = useState(50000);
    const [missedItems, setMissedItems] = useState(3);

    // Calculations
    const rodsOvertimeCount = dailyRods * 0.4;
    const dailyOvertimeLoss = rodsOvertimeCount * (overtimeMinutes / 60) * hourlyRate;
    const monthlyOvertimeLoss = Math.round(dailyOvertimeLoss * 30);

    const missedItemPrice = 15000; // 15.000đ per item (drink/bait)
    const monthlyMissedItemLoss = missedItems * missedItemPrice * 30;

    const totalMonthlyLoss = monthlyOvertimeLoss + monthlyMissedItemLoss;

    return (
        <section className="py-16 sm:py-20 bg-white border-y border-[#E3E8E3]">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF5E7] px-3 py-1 text-xs font-bold text-[#9A600B] border border-[#FDE3BE]">
                        <span className="h-2 w-2 rounded-full bg-[#D97706] animate-ping" />
                        Bảng tính thất thoát thực tế
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#17201A] leading-tight">
                        Hồ của bạn đang &quot;rơi rụng&quot; bao nhiêu tiền mỗi tháng?
                    </h2>
                    <p className="text-sm sm:text-base text-[#66716A] leading-relaxed">
                        Khách câu lố 15 - 20 phút ngại tính thêm, lon nước đem ra chòi nhân viên quên ghi sổ...
                        Tưởng ít nhưng cộng dồn cả tháng là cả một gia tài:
                    </p>
                </div>

                {/* Calculator Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Controls Column */}
                    <div className="lg:col-span-7 space-y-5 rounded-3xl border border-[#E3E8E3] bg-[#F7F9F5] p-6 sm:p-7 shadow-xs">
                        {/* Slider 1: Daily Rods */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="font-bold text-[#17201A]">
                                    Số cần câu / lượt khách mỗi ngày:
                                </span>
                                <span className="font-mono text-sm font-bold text-[#246B38] bg-[#E8F3E5] px-2.5 py-0.5 rounded-lg border border-[#D5E5D1]">
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
                                className="w-full accent-[#4F9D5A] h-2 bg-[#E3E8E3] rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-[#8A938D]">
                                <span>5 cần (Hồ nhỏ)</span>
                                <span>60 cần (Hồ vừa)</span>
                                <span>120 cần (Hồ lớn)</span>
                            </div>
                        </div>

                        {/* Slider 2: Average Overtime Minutes */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="font-bold text-[#17201A]">
                                    Thời gian khách câu lố trung bình (ngại tính tiền):
                                </span>
                                <span className="font-mono text-sm font-bold text-[#9A600B] bg-[#FEF5E7] px-2.5 py-0.5 rounded-lg border border-[#FDE3BE]">
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
                                className="w-full accent-[#D97706] h-2 bg-[#E3E8E3] rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-[#8A938D]">
                                <span>5 phút (Lố ít)</span>
                                <span>20 phút (Bình thường)</span>
                                <span>60 phút (Lố cả tiếng)</span>
                            </div>
                        </div>

                        {/* Slider 3: Hourly Rate */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="font-bold text-[#17201A]">
                                    Giá giờ câu trung bình của hồ:
                                </span>
                                <span className="font-mono text-sm font-bold text-[#17201A] bg-white px-2.5 py-0.5 rounded-lg border border-[#E3E8E3]">
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
                                className="w-full accent-[#4F9D5A] h-2 bg-[#E3E8E3] rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Slider 4: Missed items */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="font-bold text-[#17201A]">
                                    Lon nước, mồi câu bị quên ghi sổ mỗi ngày:
                                </span>
                                <span className="font-mono text-sm font-bold text-[#C53030] bg-[#FFF5F5] px-2.5 py-0.5 rounded-lg border border-[#FED7D7]">
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
                                className="w-full accent-[#E53E3E] h-2 bg-[#E3E8E3] rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Result Output Card */}
                    <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-[#D97706]/40 bg-[#FFFDF9] p-6 sm:p-7 shadow-md relative">
                        <div className="space-y-4">
                            <span className="inline-block rounded-full bg-[#FEF5E7] px-3 py-1 text-xs font-bold text-[#9A600B] uppercase tracking-wider border border-[#FDE3BE]">
                                Ước tính tiền thất thoát mỗi tháng
                            </span>

                            <div>
                                <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#D97706] tabular-nums tracking-tight">
                                    {totalMonthlyLoss.toLocaleString("vi-VN")}đ
                                </div>
                                <p className="text-xs text-[#8A5A20] mt-1 font-semibold">
                                    (Khoảng {(totalMonthlyLoss / 1000000).toFixed(1)} triệu đồng / tháng)
                                </p>
                            </div>

                            <div className="border-t border-[#E3E8E3] pt-3 space-y-2 text-xs text-left">
                                <div className="flex justify-between text-[#66716A]">
                                    <span>Tiền khách câu lố giờ bị bỏ qua:</span>
                                    <span className="font-mono font-bold text-[#17201A]">
                                        ~{monthlyOvertimeLoss.toLocaleString("vi-VN")}đ
                                    </span>
                                </div>
                                <div className="flex justify-between text-[#66716A]">
                                    <span>Nước uống, mồi câu quên tính:</span>
                                    <span className="font-mono font-bold text-[#17201A]">
                                        ~{monthlyMissedItemLoss.toLocaleString("vi-VN")}đ
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-[#E8F3E5] p-3 border border-[#D5E5D1] text-left text-xs space-y-1">
                                <p className="font-bold text-[#246B38] flex items-center gap-1.5">
                                    <span>🛡️</span> Giữ lại 100% số tiền này ngay ngày đầu tiên:
                                </p>
                                <p className="text-[#3A5C43] text-[11px] leading-relaxed">
                                    Đồng hồ tự đếm ngược và tự nhảy tiền phụ thu theo phút. Khách tự nhìn điện thoại vui vẻ thanh toán, không còn ai cãi cọ xin bớt giờ!
                                </p>
                            </div>
                        </div>

                        <div className="pt-5">
                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4F9D5A] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#3D8547] active:scale-95 transition-all cursor-pointer"
                            >
                                <span>Dùng thử 7 ngày miễn phí để thu hồi tiền</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                            <p className="text-[11px] text-[#66716A] text-center mt-2">
                                Không mất phí • Không cần thẻ ngân hàng • Đăng ký 30 giây
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
