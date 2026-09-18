"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { sessionTicker } from "@/lib/ticker/session-ticker";
import { Card } from "@/components/ui/card";

export interface CheckInTimeState {
    /** ISO string to send to server if custom time is selected, or null for default auto */
    customStartAt: string | null;
    /** Date object of start time for UI */
    startDate: Date;
    /** Date object of planned end time for UI */
    plannedEndDate: Date;
    /** Whether user explicitly customized the check-in time */
    isCustom: boolean;
    /** Whether the selected time is valid (not in the future) */
    isValid: boolean;
    /** Whether the session has already exceeded the planned end time */
    isOvertime: boolean;
    /** Overtime duration in minutes (if isOvertime) */
    overtimeMinutes: number;
    /** Overtime estimated surcharge (VND) based on lake rate */
    estimatedOvertimeVnd: number;
    /** Human-readable error message if invalid */
    errorMessage: string | null;
}

interface CheckInTimeSectionProps {
    durationMinutes?: number;
    packageName?: string;
    overtimeHourlyVnd?: number;
    hutCount?: number;
    onStateChange?: (state: CheckInTimeState) => void;
}

// Formatters for Asia/Ho_Chi_Minh
const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
});

function getVietnamDateParts(date: Date) {
    // Return YYYY-MM-DD and HH:mm in Vietnam time
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) {
        map[p.type] = p.value;
    }
    return {
        dateStr: `${map.year}-${map.month}-${map.day}`,
        timeStr: `${map.hour}:${map.minute}`,
    };
}

function formatMinutesToVi(minutes: number): string {
    const totalMin = Math.max(0, Math.floor(minutes));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
}

function formatVnd(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + " đ";
}

export const CheckInTimeSection = memo(function CheckInTimeSection({
    durationMinutes = 0,
    packageName,
    overtimeHourlyVnd = 0,
    hutCount = 1,
    onStateChange,
}: CheckInTimeSectionProps) {
    const [nowMs, setNowMs] = useState<number>(() => sessionTicker.getNowMs());
    const [isCustom, setIsCustom] = useState<boolean>(false);

    // Initial default values in Vietnam timezone
    const initialParts = useMemo(() => getVietnamDateParts(new Date(sessionTicker.getNowMs())), []);
    const [inputTime, setInputTime] = useState<string>(initialParts.timeStr);
    const [inputDate, setInputDate] = useState<string>(initialParts.dateStr);

    // Subscribe to centralized sessionTicker (runs 1s interval without re-rendering the whole page)
    useEffect(() => {
        const updateTick = () => {
            setNowMs(sessionTicker.getNowMs());
        };
        return sessionTicker.subscribe(updateTick);
    }, []);

    // Action: Set to Current Server Time
    const handleSetCurrentTime = useCallback(() => {
        const currentServerDate = new Date(sessionTicker.getNowMs());
        const parts = getVietnamDateParts(currentServerDate);
        setInputTime(parts.timeStr);
        setInputDate(parts.dateStr);
        // Do not auto-revert to automatic: clicking "Lấy giờ hiện tại" sets the custom inputs to now
    }, []);

    // Action: Reset to Automatic Mode
    const handleResetToAuto = useCallback(() => {
        setIsCustom(false);
        const parts = getVietnamDateParts(new Date(sessionTicker.getNowMs()));
        setInputTime(parts.timeStr);
        setInputDate(parts.dateStr);
    }, []);

    // Handler when user edits time or date
    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputTime(e.target.value);
        setIsCustom(true);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputDate(e.target.value);
        setIsCustom(true);
    };

    // Calculate effective timestamps & validation
    const computed = useMemo(() => {
        const currentServerNow = new Date(nowMs);
        let startTimestamp: number;
        let isValid = true;
        let errorMessage: string | null = null;
        let customStartAtIso: string | null = null;

        if (isCustom) {
            // Parse local input as Asia/Ho_Chi_Minh (+07:00)
            const [hours, minutes] = inputTime.split(":").map(Number);
            if (isNaN(hours) || isNaN(minutes) || !inputDate) {
                isValid = false;
                errorMessage = "Vui lòng nhập đầy đủ giờ và ngày vào.";
                startTimestamp = nowMs;
            } else {
                // Construct ISO with +07:00 offset
                const isoString = `${inputDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+07:00`;
                const parsedDate = new Date(isoString);
                if (isNaN(parsedDate.getTime())) {
                    isValid = false;
                    errorMessage = "Định dạng giờ hoặc ngày vào không hợp lệ.";
                    startTimestamp = nowMs;
                } else {
                    startTimestamp = parsedDate.getTime();
                    // Tolerance: 60s for slight clock skew
                    if (startTimestamp > nowMs + 60_000) {
                        isValid = false;
                        errorMessage = "Giờ vào không được nằm trong tương lai. Vui lòng kiểm tra lại giờ hoặc ngày vào.";
                    } else {
                        customStartAtIso = parsedDate.toISOString();
                    }
                }
            }
        } else {
            // Default auto: start is dynamic server now
            startTimestamp = nowMs;
            customStartAtIso = null;
        }

        const startDate = new Date(startTimestamp);
        const durationMs = durationMinutes * 60_000;
        const plannedEndMs = startTimestamp + durationMs;
        const plannedEndDate = new Date(plannedEndMs);

        // Elapsed time: currentNow - start
        const elapsedMs = Math.max(0, nowMs - startTimestamp);
        const elapsedMinutes = Math.floor(elapsedMs / 60_000);

        // Remaining time: plannedEnd - currentNow
        const remainingMs = plannedEndMs - nowMs;
        const isOvertime = remainingMs < 0;
        const overtimeMinutes = isOvertime ? Math.floor(-remainingMs / 60_000) : 0;
        const effectiveHutCount = Math.max(1, hutCount);
        const estimatedOvertimeVnd =
            isOvertime && overtimeHourlyVnd > 0
                ? Math.round((overtimeMinutes / 60) * overtimeHourlyVnd * effectiveHutCount)
                : 0;

        return {
            customStartAt: customStartAtIso,
            startDate,
            plannedEndDate,
            isCustom,
            isValid,
            isOvertime,
            overtimeMinutes,
            estimatedOvertimeVnd,
            errorMessage,
            elapsedMinutes,
            remainingMs,
        };
    }, [isCustom, inputTime, inputDate, nowMs, durationMinutes, overtimeHourlyVnd, hutCount]);

    // Notify parent on computed changes
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                customStartAt: computed.customStartAt,
                startDate: computed.startDate,
                plannedEndDate: computed.plannedEndDate,
                isCustom: computed.isCustom,
                isValid: computed.isValid,
                isOvertime: computed.isOvertime,
                overtimeMinutes: computed.overtimeMinutes,
                estimatedOvertimeVnd: computed.estimatedOvertimeVnd,
                errorMessage: computed.errorMessage,
            });
        }
    }, [computed, onStateChange]);

    const formattedStartTime = timeFormatter.format(computed.startDate);
    const formattedStartDate = dateFormatter.format(computed.startDate);
    const formattedEndTime = timeFormatter.format(computed.plannedEndDate);
    const formattedEndDate = dateFormatter.format(computed.plannedEndDate);

    const isDifferentDay = formattedStartDate !== formattedEndDate;

    return (
        <Card className="space-y-4 bg-white border-[#E3E8E3] rounded-2xl shadow-xs p-4">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F0F4EE] pb-3">
                <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#17201A] flex items-center gap-1.5">
                        <span>⏱️</span>
                        <span>4. Giờ vào & Thời gian câu</span>
                    </label>
                    <p className="text-[11px] text-[#66716A] mt-0.5">
                        {isCustom
                            ? "Đang chọn giờ khách đã vào câu trước đó."
                            : "Mặc định: Giờ vào sẽ được tự động chốt ngay khi bấm tạo vé thành công."}
                    </p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    {isCustom ? (
                        <button
                            type="button"
                            onClick={handleResetToAuto}
                            className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-3 py-1 text-[11px] font-bold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#E5E7EB] transition-colors cursor-pointer"
                        >
                            <span>↺</span>
                            <span>Chốt lúc tạo vé</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsCustom(true)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#E8F3E5] px-3 py-1 text-[11px] font-bold text-[#246B38] border border-[#D5E5D1] hover:bg-[#DCEDD7] transition-colors cursor-pointer"
                        >
                            <span>✏️</span>
                            <span>Khách vào trước đó</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Inputs: Giờ vào [HH:mm] [Ngày vào] [⚡ Lấy giờ hiện tại] */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#17201A]">
                        Giờ vào thực tế:
                    </span>
                    {isCustom && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            Tùy chỉnh
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Time Input */}
                    <div className="sm:col-span-4">
                        <label className="block text-[10px] font-semibold uppercase text-[#66716A] mb-1">
                            Giờ:Phút (24h)
                        </label>
                        <input
                            type="time"
                            value={inputTime}
                            onChange={handleTimeChange}
                            aria-label="Giờ vào câu"
                            className="w-full rounded-xl border border-[#E3E8E3] bg-white px-3 py-2 text-sm font-mono font-bold text-[#17201A] focus:border-[#4F9D5A] focus:ring-1 focus:ring-[#4F9D5A] focus:outline-none"
                        />
                    </div>

                    {/* Date Input */}
                    <div className="sm:col-span-5">
                        <label className="block text-[10px] font-semibold uppercase text-[#66716A] mb-1">
                            Ngày vào
                        </label>
                        <input
                            type="date"
                            value={inputDate}
                            onChange={handleDateChange}
                            aria-label="Ngày vào câu"
                            className="w-full rounded-xl border border-[#E3E8E3] bg-white px-3 py-2 text-sm font-mono font-bold text-[#17201A] focus:border-[#4F9D5A] focus:ring-1 focus:ring-[#4F9D5A] focus:outline-none"
                        />
                    </div>

                    {/* Quick Now Button */}
                    <div className="sm:col-span-3 flex items-end">
                        <button
                            type="button"
                            onClick={handleSetCurrentTime}
                            className="w-full h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D5E5D1] bg-[#E8F3E5] px-2 text-xs font-bold text-[#246B38] hover:bg-[#DDF0D8] transition-colors cursor-pointer"
                        >
                            <span>⚡</span>
                            <span>Lấy giờ hiện tại</span>
                        </button>
                    </div>
                </div>

                {/* Validation Error Message */}
                {!computed.isValid && computed.errorMessage && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                        <span className="text-rose-600 font-bold shrink-0">⚠️</span>
                        <span>{computed.errorMessage}</span>
                    </div>
                )}
            </div>

            {/* LIVE PREVIEW BOX (Khi đã chọn gói câu) */}
            {durationMinutes > 0 ? (
                <div className="rounded-2xl border border-[#D5E5D1] bg-[#F7F9F5] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B38] flex items-center gap-1">
                            <span>🔍</span>
                            <span>Xem trước thời gian ca</span>
                        </span>
                        {packageName && (
                            <span className="text-xs font-bold text-[#17201A]">
                                {packageName} ({formatMinutesToVi(durationMinutes)})
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        {/* 1. Giờ vào */}
                        <div className="rounded-xl bg-white p-2 border border-[#E3E8E3]">
                            <span className="text-[10px] uppercase font-semibold text-[#66716A] block">
                                Giờ vào
                            </span>
                            <span className="font-mono font-bold text-[#17201A] text-sm block">
                                {formattedStartTime}
                            </span>
                            <span className="text-[10px] text-[#66716A] block">
                                {formattedStartDate}
                            </span>
                        </div>

                        {/* 2. Giờ ra dự kiến */}
                        <div className="rounded-xl bg-white p-2 border border-[#E3E8E3]">
                            <span className="text-[10px] uppercase font-semibold text-[#66716A] block">
                                Giờ ra dự kiến
                            </span>
                            <span className="font-mono font-bold text-[#246B38] text-sm block">
                                {formattedEndTime}
                            </span>
                            <span className={`text-[10px] font-semibold block ${isDifferentDay ? "text-amber-700" : "text-[#66716A]"}`}>
                                {formattedEndDate} {isDifferentDay && "· Hôm sau"}
                            </span>
                        </div>

                        {/* 3. Đã câu */}
                        <div className="rounded-xl bg-white p-2 border border-[#E3E8E3]">
                            <span className="text-[10px] uppercase font-semibold text-[#66716A] block">
                                Đã câu
                            </span>
                            <span className="font-mono font-bold text-[#17201A] text-sm block">
                                {formatMinutesToVi(computed.elapsedMinutes)}
                            </span>
                            <span className="text-[10px] text-[#66716A] block">
                                Tính đến hiện tại
                            </span>
                        </div>

                        {/* 4. Còn lại / Quá giờ */}
                        <div
                            className={`rounded-xl p-2 border ${
                                computed.isOvertime
                                    ? "bg-rose-50 border-rose-200 text-rose-800"
                                    : "bg-white border-[#E3E8E3] text-[#17201A]"
                            }`}
                        >
                            <span className="text-[10px] uppercase font-semibold block">
                                {computed.isOvertime ? "Quá giờ" : "Còn lại"}
                            </span>
                            <span className={`font-mono font-bold text-sm block ${computed.isOvertime ? "text-rose-600" : "text-emerald-700"}`}>
                                {computed.isOvertime
                                    ? `+${formatMinutesToVi(computed.overtimeMinutes)}`
                                    : formatMinutesToVi(computed.remainingMs / 60_000)}
                            </span>
                            <span className="text-[10px] block opacity-80">
                                {computed.isOvertime ? "Vượt khung giờ" : "Thời gian còn lại"}
                            </span>
                        </div>
                    </div>

                    {/* OVERTIME WARNING BANNER */}
                    {computed.isOvertime && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1 animate-in fade-in duration-150">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800">
                                <span>⚠️</span>
                                <span>Cảnh báo: Giờ ra dự kiến đã trôi qua ({formatMinutesToVi(computed.overtimeMinutes)})</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-amber-900">
                                Vé câu này sẽ được ghi nhận ở trạng thái <strong>ĐÃ QUÁ GIỜ</strong> ngay sau khi tạo. Hệ thống sẽ tự động tính phụ thu quá giờ theo bảng giá hồ:
                                {overtimeHourlyVnd > 0 && (
                                    <span className="ml-1 font-bold text-amber-950">
                                        {formatVnd(overtimeHourlyVnd)}/h (ước tính phụ thu hiện tại: {formatVnd(computed.estimatedOvertimeVnd)})
                                    </span>
                                )}
                                .
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-[#CCD5CA] p-3 text-center text-xs text-[#66716A] bg-[#FAFCF9]">
                    👉 Vui lòng chọn gói câu ở mục 3 để xem trước giờ ra, thời gian đã câu và còn lại.
                </div>
            )}
        </Card>
    );
});
