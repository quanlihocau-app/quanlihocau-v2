"use client";

import { useState } from "react";

import {
    CompareMode,
    DatePreset,
    formatVnDateInput,
    getVnParts,
} from "@/lib/reports/date-utils";

export interface DateFilterState {
    preset: DatePreset;
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    fromTime?: string; // HH:mm
    toTime?: string;   // HH:mm
    compare: CompareMode;
    compareFrom?: string;
    compareTo?: string;
}

interface DateRangePickerProps {
    value: DateFilterState;
    onChange: (next: DateFilterState) => void;
    currentRangeLabel: string;
}

const PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
    { value: "today", label: "Hôm nay" },
    { value: "yesterday", label: "Hôm qua" },
    { value: "last7days", label: "7 ngày qua" },
    { value: "last30days", label: "30 ngày qua" },
    { value: "thisWeek", label: "Tuần này" },
    { value: "lastWeek", label: "Tuần trước" },
    { value: "thisMonth", label: "Tháng này" },
    { value: "lastMonth", label: "Tháng trước" },
    { value: "thisQuarter", label: "Quý này" },
    { value: "lastQuarter", label: "Quý trước" },
    { value: "thisYear", label: "Năm nay" },
    { value: "lastYear", label: "Năm trước" },
    { value: "allTime", label: "Tất cả thời gian" },
    { value: "custom", label: "Tùy chỉnh khoảng ngày" },
];

const COMPARE_OPTIONS: Array<{ value: CompareMode; label: string }> = [
    { value: "none", label: "Không so sánh" },
    { value: "previousPeriod", label: "Kỳ trước" },
    { value: "samePeriodLastMonth", label: "Cùng kỳ tháng trước" },
    { value: "samePeriodLastQuarter", label: "Cùng kỳ quý trước" },
    { value: "samePeriodLastYear", label: "Cùng kỳ năm trước" },
];

export function DateRangePicker({
    value,
    onChange,
    currentRangeLabel,
}: DateRangePickerProps) {
    const isCustomOpen = value.preset === "custom";
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(getVnParts(new Date()).month);
    const [selectedYear, setSelectedYear] = useState(getVnParts(new Date()).year);

    // Available years: from 2023 to currentYear + 1
    const currentYear = getVnParts(new Date()).year;
    const availableYears = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

    const handlePresetChange = (p: DatePreset) => {
        if (p === "custom") {
            const todayStr = formatVnDateInput(new Date());
            onChange({
                ...value,
                preset: "custom",
                from: value.from || todayStr,
                to: value.to || todayStr,
                fromTime: value.fromTime || "00:00",
                toTime: value.toTime || "23:59",
            });
        } else {
            onChange({
                ...value,
                preset: p,
            });
        }
    };

    const handleResetToday = () => {
        onChange({
            preset: "today",
            compare: "none",
        });
        setIsMonthPickerOpen(false);
    };

    const handleApplyMonthYear = () => {
        const lastDay = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
        const mm = String(selectedMonth).padStart(2, "0");
        const fromStr = `${selectedYear}-${mm}-01`;
        const toStr = `${selectedYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

        onChange({
            ...value,
            preset: "custom",
            from: fromStr,
            to: toStr,
            fromTime: "00:00",
            toTime: "23:59",
        });
        setIsMonthPickerOpen(false);
    };

    return (
        <div className="sticky top-0 z-30 border-b border-[#E3E8E3] bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-md">
            {/* Top row: Label & quick actions */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-800 tracking-tight sm:text-sm">
                        {currentRangeLabel}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Month/Year selector toggle */}
                    <button
                        type="button"
                        onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                        className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                        title="Chọn nhanh Tháng & Năm"
                    >
                        <svg className="mr-1 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        Tháng/Năm
                    </button>

                    {/* Reset to Today button */}
                    <button
                        type="button"
                        onClick={handleResetToday}
                        className="inline-flex min-h-12 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all"
                    >
                        Về Hôm nay
                    </button>
                </div>
            </div>

            {/* Middle row: Preset scrollable list and compare mode dropdown */}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* Horizontal scrollable preset pills */}
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
                    {PRESET_OPTIONS.map((opt) => {
                        const active = value.preset === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handlePresetChange(opt.value)}
                                className={`whitespace-nowrap min-h-12 rounded-xl px-3 text-xs font-medium transition-all select-none active:scale-95 flex items-center justify-center ${
                                    active
                                        ? "bg-emerald-700 text-white shadow-sm font-semibold"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {/* Compare Mode Selector */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <span className="text-[11px] font-medium text-slate-500">So sánh:</span>
                    <select
                        aria-label="Tùy chọn so sánh thời gian"
                        value={value.compare}
                        onChange={(e) => onChange({ ...value, compare: e.target.value as CompareMode })}
                        className="min-h-12 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-xs focus:border-emerald-500 focus:outline-none"
                    >
                        {COMPARE_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Popup/Collapse: Quick Month & Year selector */}
            {isMonthPickerOpen && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-md animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800">Chọn nhanh Tháng & Năm</span>
                        <button
                            type="button"
                            onClick={() => setIsMonthPickerOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Tháng</label>
                            <select
                                aria-label="Chọn tháng"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="mt-1 w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>
                                        Tháng {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Năm</label>
                            <select
                                aria-label="Chọn năm"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="mt-1 w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800"
                            >
                                {availableYears.map((y) => (
                                    <option key={y} value={y}>
                                        Năm {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsMonthPickerOpen(false)}
                            className="min-h-12 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyMonthYear}
                            className="min-h-12 px-4 rounded-lg bg-emerald-700 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800"
                        >
                            Áp dụng
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Date & Time Picker inputs */}
            {isCustomOpen && (
                <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 shadow-xs">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {/* Từ ngày - giờ */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-emerald-900">Từ ngày & giờ:</span>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    aria-label="Từ ngày"
                                    value={value.from || formatVnDateInput(new Date())}
                                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                                    className="min-h-12 flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <input
                                    type="time"
                                    aria-label="Giờ bắt đầu"
                                    value={value.fromTime || "00:00"}
                                    onChange={(e) => onChange({ ...value, fromTime: e.target.value })}
                                    className="min-h-12 w-24 rounded-lg border border-emerald-200 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Đến ngày - giờ */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-emerald-900">Đến ngày & giờ:</span>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    aria-label="Đến ngày"
                                    value={value.to || formatVnDateInput(new Date())}
                                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                                    className="min-h-12 flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <input
                                    type="time"
                                    aria-label="Giờ kết thúc"
                                    value={value.toTime || "23:59"}
                                    onChange={(e) => onChange({ ...value, toTime: e.target.value })}
                                    className="min-h-12 w-24 rounded-lg border border-emerald-200 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
