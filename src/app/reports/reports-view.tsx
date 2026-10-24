"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { DateFilterState, DateRangePicker } from "@/components/reports/date-range-picker";
import { AdvancedFilterSheet, AdvancedFilterValues } from "@/components/reports/advanced-filter-sheet";
import { DrilldownDrawer } from "@/components/reports/drilldown-drawer";
import { AnalyticsChart } from "@/components/reports/analytics-chart";
import { Role } from "@/generated/prisma/enums";
import { CompareMode, DatePreset, DeltaComparison, formatVnd, formatVnDateInput, formatVnTimeInput, getDateRangeForPreset } from "@/lib/reports/date-utils";

interface ReportsViewProps {
    lakeName: string;
    lakeId: string;
    userEmail: string;
    userRole?: Role | null;
}

interface AreaStat {
    id: string;
    name: string;
    sessionCount: number;
    revenueVnd: number;
}

interface HutStat {
    id: string;
    name: string;
    areaName: string;
    sessionCount: number;
    revenueVnd: number;
}

interface TopProduct {
    id: string;
    name: string;
    quantity: number;
    revenueVnd: number;
}

interface TopCustomer {
    id: string;
    name: string;
    phone: string | null;
    sessions: number;
    totalSpent: number;
}

interface TopFish {
    name: string;
    weight: number;
    revenue: number;
}

interface Top5Customer {
    id: string;
    name: string;
    phone: string | null;
    sessions: number;
    totalSpent: number;
}

interface Top5HoursCustomer {
    id: string;
    name: string;
    phone: string | null;
    totalMinutes: number;
    totalHours: number;
}

interface Top5AbsentCustomer {
    id: string;
    name: string;
    phone: string | null;
    lastVisit: string;
    daysSince: number;
}

interface Top5BiggestFish {
    name: string;
    weight: number;
    revenue: number;
    date: string;
}

interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface AnalyticsDataResponse {
    lake: {
        id: string;
        name: string;
        plan: string;
        status: string;
        expiresAt: string | null;
    };
    timeWindow: {
        preset: string;
        from: string;
        to: string;
        label: string;
        fromDisplay: string;
        toDisplay: string;
        grouping: string;
    };
    comparativeWindow: {
        mode: string;
        from: string;
        to: string;
        label: string;
        fromDisplay: string;
        toDisplay: string;
    } | null;
    summary: {
        totalRevenue: number;
        ticketRevenue: number;
        productRevenue: number;
        overtimeRevenue: number;
        totalFishBuyback: number;
        totalExpense: number;
        netProfit: number;
        totalReceivableDebt: number;
        cashIn: number;
        cashOut: number;
        netCash: number;
        transferIn: number;
        transferOut: number;
        netTransfer: number;
        otherRevenue: number;
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        cancelledSessions: number;
        totalFishingHours: number;
        totalOvertimeHours: number;
        averageTicketValue: number;
        refundAmount: number;
        refundCount: number;
        // fish & customer KPIs
        totalFishCount: number;
        totalFishWeight: number;
        topFish: TopFish[];
        totalCustomers: number;
    };
    deltas: Record<string, DeltaComparison> | null;
    chartSeries: Array<{
        key: string;
        label: string;
        revenue: number;
        expense: number;
        profit: number;
        sessions: number;
        overtimeVnd: number;
    }>;
    breakdown: {
        areas: AreaStat[];
        huts: HutStat[];
        topProducts: TopProduct[];
        inventoryMovementsCount: number;
        topCustomers: TopCustomer[];
        staff: StaffMember[];
        auditEventsCount: number;
        otp: {
            totalSent: number;
            totalSuccess: number;
            totalVerified: number;
            totalCostVnd: number;
        };
        saasOrders: Array<{
            id: string;
            orderCode: string;
            planName: string;
            amountVnd: number;
            status: string;
            createdAt: string;
        }>;
        // fish breakdown
        totalFishCount: number;
        totalFishWeight: number;
        topFish: TopFish[];
        top5BiggestFish: Top5BiggestFish[];
        top5MostSpent: Top5Customer[];
        top5MostHours: Top5HoursCustomer[];
        top5LongestAbsent: Top5AbsentCustomer[];
    };
    filterOptions: {
        areas: Array<{ id: string; name: string }>;
        huts: Array<{ id: string; name: string; areaName: string }>;
        packages: Array<{ id: string; name: string }>;
        products: Array<{ id: string; name: string }>;
        staff: Array<{ id: string; name: string }>;
    };
}

const STORAGE_KEY = "qlhc_report_filter_v2";

export function ReportsView({ lakeName, lakeId, userRole: initialUserRole }: ReportsViewProps) {
  // Load tenant role to control access to audit logs
  const [userRole] = useState<Role | null>(initialUserRole ?? null);

    const router = useRouter();
    const searchParams = useSearchParams();

    // 1. Initialize filter state from URL or LocalStorage
    const [filterState, setFilterState] = useState<DateFilterState>(() => {
        const urlPreset = searchParams.get("preset");
        if (urlPreset) {
            return {
                preset: urlPreset as DatePreset,
                from: searchParams.get("from") || undefined,
                to: searchParams.get("to") || undefined,
                fromTime: searchParams.get("fromTime") || "00:00",
                toTime: searchParams.get("toTime") || "23:59",
                compare: (searchParams.get("compare") as CompareMode) || "none",
            };
        }
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return {
            preset: "today",
            compare: "none",
        };
    });

    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>(() => Object.fromEntries(["areaId", "hutId", "customerId", "employeeId", "packageId", "productId", "paymentMethod", "sessionStatus"].flatMap(k => searchParams.get(k) ? [[k, searchParams.get(k)!]] : [])));
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [isOptimistic, setIsOptimistic] = useState(false);

    // Cập nhật state bộ lọc ngay trước khi fetch (Optimistic UI)
    const handleFilterStateChange = (nextFilter: DateFilterState) => {
        setIsOptimistic(true);
        setFilterState(nextFilter);
    };

    const handleAdvancedFilterApply = (newFilters: AdvancedFilterValues) => {
        setIsOptimistic(true);
        setAdvancedFilters(newFilters);
    };

    const handleAdvancedFilterReset = () => {
        setIsOptimistic(true);
        setAdvancedFilters({});
    };

    // Active drilldown metric
    const canExportReport = userRole === Role.OWNER || userRole === Role.MANAGER;
    const [drilldownMetric, setDrilldownMetric] = useState<string | null>(() =>
        (initialUserRole === Role.OWNER || initialUserRole === Role.MANAGER) ? searchParams.get("metric") : null,
    );
    const openDrilldown = (metric: string) => {
        if (!canExportReport) return;
        setDrilldownMetric(metric);
    };

    // Active reporting tab
    const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "operations" | "facilities" | "inventory" | "customers" | "system">(() => { const tab = searchParams.get("tab"); return ["overview", "revenue", "operations", "facilities", "inventory", "customers", "system"].includes(tab || "") ? tab as "overview" : "overview"; });

    const [exportError, setExportError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const reportParams = new URLSearchParams({ preset: filterState.preset, compare: filterState.compare });
    for (const key of ["from", "to", "fromTime", "toTime", "compareFrom", "compareTo"] as const) {
        const value = filterState[key]; if (value) reportParams.set(key, value);
    }
    for (const [key, value] of Object.entries(advancedFilters)) if (value) reportParams.set(key, String(value));
    const paramsString = reportParams.toString();
    const navigationParams = new URLSearchParams(reportParams); navigationParams.set("tab", activeTab);
    const reportNavigation = `/reports?${navigationParams}`;
    const { data: analyticsData, error: reportError, isFetching, isPending, isPlaceholderData, refetch } = useQuery<AnalyticsDataResponse>({
        queryKey: ["reports", lakeId, paramsString],
        queryFn: async ({ signal }) => {
            const r = await fetch(`/api/reports/analytics?${paramsString}`, { signal, cache: "no-store" });
            if (!r.ok) throw new Error("Không thể tải báo cáo. Vui lòng thử lại.");
            return r.json();
        },
        placeholderData: keepPreviousData,
        staleTime: 10000, 
        refetchOnWindowFocus: true,
    });

    // isOptimisticActive: true chỉ khi đang fetch VÀ có optimistic/placeholder.
    // Không cần reset isOptimistic riêng — && isFetching đã tắt trạng thái khi fetch xong.
    const isOptimisticActive = (isOptimistic || isPlaceholderData) && isFetching;

    const error = exportError || reportError?.message;
    useEffect(() => {
        window.history.replaceState(null, "", reportNavigation);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState)); } catch { /* Storage can be disabled. */ }
    }, [reportNavigation, filterState]);
    function cashbookHref(method?: string, direction?: string, scope = "all") {
        const range = analyticsData?.timeWindow || getDateRangeForPreset(filterState.preset, new Date(), filterState.from, filterState.to, filterState.fromTime, filterState.toTime);
        const from = new Date(range.from), to = new Date(range.to);
        const params = new URLSearchParams({ scope, from: formatVnDateInput(from), to: formatVnDateInput(to),
            fromTime: formatVnTimeInput(from), toTime: formatVnTimeInput(to), returnTo: reportNavigation });
        if (method || advancedFilters.paymentMethod) params.set("method", method || advancedFilters.paymentMethod!);
        if (direction) params.set("direction", direction);
        for (const [key, value] of Object.entries(advancedFilters)) if (value && key !== "paymentMethod") params.set(key, value);
        return `/cashbook?${params}`;
    }
    const handleExport = async () => {
        setExporting(true); setExportError(null);
        try {
            const params = new URLSearchParams(reportParams); params.set("format", "csv");
            const r = await fetch(`/api/reports/export?${params}`);
            if (!r.ok) throw new Error("Không thể xuất báo cáo. Vui lòng thử lại.");
            const blobUrl = URL.createObjectURL(await r.blob());
            const a = document.createElement("a"); a.href = blobUrl; a.download = "Bao-cao.csv"; a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (e) { setExportError(e instanceof Error ? e.message : "Không thể xuất báo cáo."); }
        finally { setExporting(false); }
    };

    const s = analyticsData?.summary;
    const d = analyticsData?.deltas;

    const renderDelta = (deltaItem?: DeltaComparison) => {
        if (!deltaItem || filterState.compare === "none") return null;
        if (deltaItem.displayText === "Chưa có dữ liệu để so sánh") {
            return (
                <span className="text-[10px] text-slate-400 italic block mt-0.5">
                    {deltaItem.displayText}
                </span>
            );
        }
        return (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] font-semibold">
                {deltaItem.isPositive ? (
                    <span className="text-emerald-700 flex items-center">
                        ▲ {deltaItem.displayText} ({formatVnd(deltaItem.diff)})
                    </span>
                ) : deltaItem.isZero ? (
                    <span className="text-slate-500">━ 0%</span>
                ) : (
                    <span className="text-rose-700 flex items-center">
                        ▼ {deltaItem.displayText} ({formatVnd(deltaItem.diff)})
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="finance-ui mobile-pos-shell font-sans">
            <div className="mobile-pos-frame has-bottom-nav">
                {/* App Header */}
                <MobileAppHeader lakeName={lakeName} roleBadge="Báo cáo" />

                {/* Standardized Green Gradient Banner (Đồng bộ trang Đang câu) */}
                <div className="px-3 pt-3 pb-1 font-sans w-full">
                    <div className="w-full rounded-2xl border border-emerald-200/90 bg-linear-to-r from-[#F0FDF4] via-white to-[#F0FDF4] px-4 py-3 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
                            <div className="flex items-center gap-2">
                                <div className="h-4.5 w-1.5 rounded-full bg-[#16A34A] shrink-0" />
                                <div>
                                    <h1 className="text-xs sm:text-[13px] font-bold uppercase tracking-normal text-[#0F172A] font-serif leading-none whitespace-nowrap">
                                        BÁO CÁO &amp; ĐỐI SOÁT
                                    </h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* Advanced filter toggle button */}
                                <button
                                    type="button"
                                    onClick={() => setIsFilterSheetOpen(true)}
                                    className="inline-flex h-7 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-[#1E293B] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                    title="Bộ lọc nâng cao"
                                >
                                    <svg className="h-3.5 w-3.5 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                                    </svg>
                                    Bộ lọc
                                </button>

                                {canExportReport && (
                                <button
                                    type="button"
                                    disabled={exporting} onClick={() => void handleExport()}
                                    className="inline-flex h-7 items-center justify-center rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] px-2.5 text-xs font-bold text-[#16A34A] hover:bg-[#BBF7D0] transition-colors shadow-2xs cursor-pointer"
                                    title="Xuất CSV"
                                >
                                    {exporting ? "Đang xuất…" : "Xuất CSV"}
                                </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex h-7 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-[#1E293B] hover:bg-slate-50 transition-colors print:hidden shadow-2xs cursor-pointer"
                                    title="In hoặc lưu PDF"
                                >
                                    🖨️ In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Time Filter Bar */}
                <DateRangePicker
                    value={filterState}
                    onChange={handleFilterStateChange}
                    currentRangeLabel={analyticsData?.timeWindow?.label || "Đang tải khoảng thời gian..."}
                />

                {/* Quick Shift Report Nav Notice */}
                <div className="w-full px-3 pt-2">
                    <div className="flex items-center justify-between rounded-2xl bg-linear-to-r from-[#F0FDF4] via-white to-[#F0FDF4] border border-emerald-200/90 px-3.5 py-2.5 text-xs text-slate-700 shadow-2xs font-serif">
                        <span>Cần xem hoặc chốt sổ ca trực hiện tại?</span>
                        <button
                            type="button"
                            onClick={() => router.push("/reports/daily")}
                            className="font-bold text-[#16A34A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                            Sổ ca trực ngày →
                        </button>
                    </div>
                </div>

                <div className="px-3 pt-2"><button type="button" onClick={() => router.push(cashbookHref())} className="w-full rounded-xl border bg-white p-3 text-sm font-bold text-[#102A43]">Sổ thu chi · Tiền mặt và chuyển khoản →</button></div>
                {/* Main Content Area */}
                <main className="w-full px-3 pt-3 space-y-4 font-serif">
                    <div role="status" className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            {isOptimisticActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 font-medium font-sans animate-pulse">
                                    <svg className="animate-spin h-3 w-3 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang cập nhật số liệu mới (hiển thị tạm số liệu cũ)...
                                </span>
                            ) : isPending ? (
                                <span>Đang tải báo cáo…</span>
                            ) : isFetching ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium font-sans">
                                    <svg className="animate-spin h-3 w-3 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang cập nhật số liệu…
                                </span>
                            ) : (
                                <span>Doanh thu theo hóa đơn · Dòng tiền theo giao dịch thanh toán</span>
                            )}
                        </div>
                        {isOptimisticActive && (
                            <span className="text-[11px] text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md font-sans">
                                Optimistic UI
                            </span>
                        )}
                    </div>
                    {reportError && <button type="button" onClick={() => void refetch()} className="rounded-xl border bg-white px-3 py-2 text-sm">Thử tải lại</button>}
                    {error && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 shadow-2xs">
                            {error}
                        </div>
                    )}

                    {/* Optimistic UI Wrapper: Dữ liệu cũ được giữ hiển thị và làm mờ nhẹ trong lúc tải */}
                    <div className={`space-y-4 transition-opacity duration-200 ${isOptimisticActive ? "opacity-60" : "opacity-100"}`}>
                        {/* 1. EXECUTIVE KPI SUMMARY CARDS (Clickable for Drilldown) */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {/* Total Revenue */}
                        <div
                            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("totalRevenue"); } }} onClick={() => openDrilldown("totalRevenue")}
                            title={`Doanh thu tổng: ${formatVnd(s?.totalRevenue ?? 0)}`} className="cursor-pointer rounded-2xl border border-emerald-700 bg-linear-to-br from-[#1B3224] to-[#244632] p-3 text-white shadow-2xs transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                                <span>
                                    Doanh thu tổng</span>
                                <span>🔍</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif sm:text-lg tabular-nums">
                                {formatVnd(s?.totalRevenue ?? 0)}
                            </div>
                            {renderDelta(d?.totalRevenue)}
                        </div>

                        {/* Net Profit */}
                        <div
                            role="button" tabIndex={0}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("revenue"); } }}
                            onClick={() => setActiveTab("revenue")}
                            title="Doanh thu trừ chi và thu cá. Không phải tiền trong két. Bấm để xem chi tiết dòng tiền."
                            className="cursor-pointer rounded-2xl border border-slate-800 bg-[#0F172A] p-3 text-white shadow-2xs hover:border-slate-600 transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                <span>Doanh thu trừ chi và thu cá</span>
                                <span>📊</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif sm:text-lg tabular-nums">
                                {formatVnd(s?.netProfit ?? 0)}
                            </div>
                            {renderDelta(d?.netProfit)}
                        </div>

                        {/* Ticket Revenue */}
                        <div
                            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("ticketRevenue"); } }} onClick={() => openDrilldown("ticketRevenue")}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-400 shadow-2xs transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>
                                    Doanh thu vé</span>
                                <span>🔍</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif text-[#0F172A] tabular-nums">
                                {formatVnd(s?.ticketRevenue ?? 0)}
                            </div>
                            {renderDelta(d?.ticketRevenue)}
                        </div>

                        {/* Retail / Product Revenue */}
                        <div
                            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("productRevenue"); } }} onClick={() => openDrilldown("productRevenue")}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-400 shadow-2xs transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>
                                    Tiền sản phẩm (RBM)</span>
                                <span>🔍</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif text-[#0F172A] tabular-nums">
                                {formatVnd(s?.productRevenue ?? 0)}
                            </div>
                            {renderDelta(d?.productRevenue)}
                        </div>
                        {/* Product Report Card */}
                        <div
                            role="button" tabIndex={0}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("productReport"); } }}
                            onClick={() => openDrilldown("productReport")}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-400 shadow-2xs transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>Báo cáo sản phẩm</span>
                                <span>🔍</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif text-[#0F172A] tabular-nums">
                                {formatVnd(s?.productRevenue ?? 0)}
                            </div>
                            {renderDelta(d?.productRevenue)}
                        </div>

                        {/* Overtime Revenue */}
                        <div
                            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("overtimeRevenue"); } }} onClick={() => openDrilldown("overtimeRevenue")}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-400 shadow-2xs transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>
                                    Doanh thu thêm giờ</span>
                                <span>🔍</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif text-[#D48806] tabular-nums">
                                {formatVnd(s?.overtimeRevenue ?? 0)}
                            </div>
                            {renderDelta(d?.overtimeRevenue)}
                        </div>

                        {/* Fish Buyback */}
                        <div
                            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("totalFishBuyback"); } }} onClick={() => openDrilldown("totalFishBuyback")}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-400 shadow-2xs transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>
                                    Tiền thu mua cá</span>
                                <span>🔍</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif text-[#0F172A] tabular-nums">
                                {formatVnd(s?.totalFishBuyback ?? 0)}
                            </div>
                            {renderDelta(d?.totalFishBuyback)}
                        </div>

                        {/* Total Expenses */}
                        <div
                            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("totalExpense"); } }} onClick={() => openDrilldown("totalExpense")}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-400 shadow-2xs transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>
                                    Tổng phiếu chi</span>
                                <span>🔍</span>
                            </div>
                            <div className="mt-1 text-base font-bold font-serif text-[#9E2A2B] tabular-nums">
                                {formatVnd(s?.totalExpense ?? 0)}
                            </div>
                            {renderDelta(d?.totalExpense)}
                        </div>

                    {/* Receivable Debt */}
                    <div
                        role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("totalReceivableDebt"); } }} onClick={() => openDrilldown("totalReceivableDebt")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>
                                    Công nợ chưa thu</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-amber-600 sm:text-lg">
                            {formatVnd(s?.totalReceivableDebt ?? 0)}
                        </div>
                    </div>
                
                        {/* KPI: Số khách hàng */}
                        <div
                            role="button" tabIndex={0}
                            onClick={() => router.push("/customers")}
                            title="Bấm để mở danh sách khách hàng"
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-emerald-300 transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>👥 Số khách hàng</span>
                                <span className="text-emerald-600 font-normal">Xem →</span>
                            </div>
                            <div className="mt-1 text-base font-bold text-slate-800 tabular-nums">{s?.totalCustomers ?? 0} khách</div>
                        </div>

                        {/* KPI: Tổng số lần mua cá */}
                        <div
                            role="button" tabIndex={0}
                            onClick={() => router.push("/fish-buybacks")}
                            title="Bấm để mở sổ thu mua cá"
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-emerald-300 transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>🐟 Số lượt mua cá</span>
                                <span className="text-emerald-600 font-normal">Xem →</span>
                            </div>
                            <div className="mt-1 text-base font-bold text-slate-800 tabular-nums">{s?.totalFishCount ?? 0} lượt</div>
                        </div>

                        {/* KPI: Tổng kg cá */}
                        <div
                            role="button" tabIndex={0}
                            onClick={() => router.push("/fish-buybacks")}
                            title="Bấm để mở sổ thu mua cá"
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-emerald-300 transition-all active:scale-98"
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>⚖️ Tổng cân nặng cá</span>
                                <span className="text-emerald-600 font-normal">Xem →</span>
                            </div>
                            <div className="mt-1 text-base font-bold text-slate-800 tabular-nums">
                                {((s?.totalFishWeight ?? 0)).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kg
                            </div>
                        </div>

                        {/* KPI: Top cá theo cân nặng */}
                        {s?.topFish && s.topFish.length > 0 && (
                            <div
                                role="button" tabIndex={0}
                                onClick={() => router.push("/fish-buybacks")}
                                title="Bấm để xem lịch sử thu mua cá"
                                className="col-span-2 cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-emerald-300 transition-all active:scale-98"
                            >
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    <span>🏆 Top cá theo cân nặng</span>
                                    <span className="text-emerald-600 font-normal">Sổ mua cá →</span>
                                </div>
                                <div className="space-y-1">
                                    {s.topFish.map((f, i) => (
                                        <div key={f.name} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">{i + 1}. {f.name}</span>
                                            <span className="font-bold text-slate-800">{f.weight.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kg</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        </div>

                {/* 2. DYNAMIC TREND CHART */}
                <AnalyticsChart
                    data={analyticsData?.chartSeries || []}
                    groupingLabel={analyticsData?.timeWindow?.grouping}
                />

                {/* 3. REPORTING CATEGORY NAVIGATION TABS (The 30 Indicators) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                    {/* Tab Buttons */}
                    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 pb-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("overview")}
                            className={`whitespace-nowrap h-8.5 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                activeTab === "overview" ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            📊 Tổng quan & Vận hành
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("revenue")}
                            className={`whitespace-nowrap h-8.5 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                activeTab === "revenue" ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            💰 Dòng tiền & Thanh toán
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("facilities")}
                            className={`whitespace-nowrap h-8.5 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                activeTab === "facilities" ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            🎣 Hồ, Khu vực & Ô câu
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("inventory")}
                            className={`whitespace-nowrap h-8.5 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                activeTab === "inventory" ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            📦 Kho & Bán chạy
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("customers")}
                            className={`whitespace-nowrap h-8.5 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                activeTab === "customers" ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            👥 Khách hàng & Nhân viên
                        </button>
{userRole && userRole !== Role.STAFF && (
                        <button
                            type="button"
                            onClick={() => setActiveTab("system")}
                            className={`whitespace-nowrap h-8.5 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                activeTab === "system" ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            ⚙️ Hệ thống & Gói SaaS
                        </button>
)}
                    </div>

                    {/* TAB CONTENT: Overview & Operations */}
                    {activeTab === "overview" && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                    Chỉ số Phiên câu & Thời lượng
                            </h4>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <div
                                    role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("sessions"); } }} onClick={() => openDrilldown("sessions")}
                                    className="cursor-pointer rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                                >
                                    <span className="text-[11px] text-slate-500 block">
                                    Số vé đã tạo</span>
                                    <span className="text-base font-bold text-slate-800">{s?.totalSessions ?? 0}</span>
                                </div>
                                <div
                                    role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("activeSessions"); } }} onClick={() => openDrilldown("activeSessions")}
                                    className="cursor-pointer rounded-xl bg-emerald-50/60 p-3 hover:bg-emerald-100/60 transition-colors"
                                >
                                    <span className="text-[11px] text-emerald-800 block">
                                    Vé đang câu</span>
                                    <span className="text-base font-bold text-emerald-800">{s?.activeSessions ?? 0}</span>
                                </div>
                                <div
                                    role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("completedSessions"); } }} onClick={() => openDrilldown("completedSessions")}
                                    className="cursor-pointer rounded-xl bg-blue-50/60 p-3 hover:bg-blue-100/60 transition-colors"
                                >
                                    <span className="text-[11px] text-blue-800 block">
                                    Vé đã hoàn thành</span>
                                    <span className="text-base font-bold text-blue-800">{s?.completedSessions ?? 0}</span>
                                </div>
                                <div
                                    role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("cancelledSessions"); } }} onClick={() => openDrilldown("cancelledSessions")}
                                    className="cursor-pointer rounded-xl bg-rose-50/60 p-3 hover:bg-rose-100/60 transition-colors"
                                >
                                    <span className="text-[11px] text-rose-800 block">
                                    Vé đã hủy</span>
                                    <span className="text-base font-bold text-rose-800">{s?.cancelledSessions ?? 0}</span>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <span className="text-[11px] text-slate-500 block">
                                    Số giờ câu ghi nhận</span>
                                    <span className="text-base font-bold text-slate-800">{s?.totalFishingHours ?? 0} giờ</span>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <span className="text-[11px] text-slate-500 block">
                                    Số giờ phụ trội thêm</span>
                                    <span className="text-base font-bold text-amber-700">{s?.totalOvertimeHours ?? 0} giờ</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: Revenue & Payments */}
                    {activeTab === "revenue" && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                9-11 & 30. Phân loại Dòng tiền & Hoàn tiền
                            </h4>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <div
                                    onClick={() => router.push(cashbookHref("CASH"))}
                                    className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <span>
                                    Tiền mặt</span>
                                        <span>🔍</span>
                                    </div>
                                    <div className="mt-1 text-base font-bold text-emerald-700">
                                        {formatVnd(s?.netCash ?? 0)}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        Vào: {formatVnd(s?.cashIn ?? 0)} • Ra: {formatVnd(s?.cashOut ?? 0)}
                                    </div>
                                </div>

                                <div
                                    onClick={() => router.push(cashbookHref("BANK_TRANSFER"))}
                                    className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <span>
                                    Chuyển khoản</span>
                                        <span>🔍</span>
                                    </div>
                                    <div className="mt-1 text-base font-bold text-blue-700">
                                        {formatVnd(s?.netTransfer ?? 0)}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        Vào: {formatVnd(s?.transferIn ?? 0)} • Ra: {formatVnd(s?.transferOut ?? 0)}
                                    </div>
                                </div>

                                <div role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") router.push(cashbookHref(undefined, "IN", "manual")); }} onClick={() => router.push(cashbookHref(undefined, "IN", "manual"))} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs font-semibold text-slate-700">
                                        Thu bán ngoài & dịch vụ
                                    </div>
                                    <div className="mt-1 text-base font-bold text-slate-800">
                                        {formatVnd(s?.otherRevenue ?? 0)}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs font-semibold text-slate-700">
                                    Hoàn tiền & Giảm trừ hóa đơn
                                    </div>
                                    <div className="mt-1 text-base font-bold text-rose-700">
                                        {formatVnd(s?.refundAmount ?? 0)} ({s?.refundCount ?? 0} lần)
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: Facilities (Areas & Huts) */}
                    {activeTab === "facilities" && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                    Doanh thu theo Khu vực & Ô câu
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {/* By Area */}
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">
                                    Doanh thu theo Khu vực</h5>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.areas || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                                        ) : (
                                            analyticsData?.breakdown?.areas.map((a: AreaStat) => (
                                                <div key={a.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <span className="font-semibold text-slate-700">{a.name}</span>
                                                    <div className="text-right">
                                                        <span className="font-bold text-emerald-700">{formatVnd(a.revenueVnd)}</span>
                                                        <span className="text-[10px] text-slate-400 block">({a.sessionCount} vé)</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* By Hut */}
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">
                                    Doanh thu theo Ô câu</h5>
                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {(analyticsData?.breakdown?.huts || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                                        ) : (
                                            analyticsData?.breakdown?.huts.map((h: HutStat) => (
                                                <div key={h.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <div>
                                                        <span className="font-semibold text-slate-700">{h.name}</span>
                                                        <span className="text-[10px] text-slate-400 block">{h.areaName}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-emerald-700">{formatVnd(h.revenueVnd)}</span>
                                                        <span className="text-[10px] text-slate-400 block">({h.sessionCount} vé)</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: Inventory & Best Sellers */}
                    {activeTab === "inventory" && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                    Báo cáo Sản phẩm, Bán chạy & Tồn kho
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">
                                    Top Sản phẩm bán chạy</h5>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.topProducts || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có doanh số sản phẩm</span>
                                        ) : (
                                            analyticsData?.breakdown?.topProducts.map((p: TopProduct) => (
                                                <div
                                                    key={p.id}
                                                    role="button" tabIndex={0}
                                                    onClick={() => router.push("/products")}
                                                    title="Bấm để xem quản lý mặt hàng"
                                                    className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 cursor-pointer hover:bg-slate-50 rounded px-1 transition-colors"
                                                >
                                                    <div>
                                                        <span className="font-semibold text-slate-800 hover:text-emerald-700">{p.name}</span>
                                                        <span className="text-[10px] text-slate-500 block">Đã bán: {p.quantity}</span>
                                                    </div>
                                                    <span className="font-bold text-emerald-700">{formatVnd(p.revenueVnd)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">
                                    Biến động Kho</h5>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                                            <span className="text-slate-600">Số lượt nhập / xuất kho:</span>
                                            <span className="font-bold text-slate-800">{analyticsData?.breakdown?.inventoryMovementsCount ?? 0} giao dịch</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: Customers & Staff */}
                    {activeTab === "customers" && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                    Khách hàng thân thiết & Đội ngũ nhân viên
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {/* Top 5 chi tiêu nhiều nhất */}
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-slate-700">💸 Top 5 Chi tiêu nhiều nhất</h5>
                                        <button type="button" onClick={() => router.push("/customers")} className="text-[11px] text-emerald-700 font-semibold hover:underline">Xem tất cả →</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.top5MostSpent || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có dữ liệu khách hàng</span>
                                        ) : (
                                            (analyticsData?.breakdown?.top5MostSpent || []).map((c, i) => (
                                                <div
                                                    key={c.id}
                                                    role="button" tabIndex={0}
                                                    onClick={() => router.push(`/customers?search=${encodeURIComponent(c.phone || c.name)}`)}
                                                    title="Bấm để xem chi tiết khách hàng"
                                                    className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 cursor-pointer hover:bg-slate-50 rounded px-1 transition-colors"
                                                >
                                                    <div>
                                                        <span className="font-semibold text-slate-800 hover:text-emerald-700">{i + 1}. {c.name}</span>
                                                        <span className="text-[10px] text-slate-400 block">{c.phone || 'Chưa có SĐT'} • {c.sessions} phiên</span>
                                                    </div>
                                                    <span className="font-bold text-emerald-700">{formatVnd(c.totalSpent)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Top 5 câu nhiều giờ nhất */}
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-slate-700">⏱️ Top 5 Câu nhiều giờ nhất</h5>
                                        <button type="button" onClick={() => router.push("/customers")} className="text-[11px] text-emerald-700 font-semibold hover:underline">Xem tất cả →</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.top5MostHours || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                                        ) : (
                                            (analyticsData?.breakdown?.top5MostHours || []).map((c, i) => (
                                                <div
                                                    key={c.id}
                                                    role="button" tabIndex={0}
                                                    onClick={() => router.push(`/customers?search=${encodeURIComponent(c.phone || c.name)}`)}
                                                    title="Bấm để xem chi tiết khách hàng"
                                                    className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 cursor-pointer hover:bg-slate-50 rounded px-1 transition-colors"
                                                >
                                                    <div>
                                                        <span className="font-semibold text-slate-800 hover:text-emerald-700">{i + 1}. {c.name}</span>
                                                        <span className="text-[10px] text-slate-400 block">{c.phone || 'Chưa có SĐT'}</span>
                                                    </div>
                                                    <span className="font-bold text-blue-700">{c.totalHours} giờ</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Top 5 lâu chưa quay lại */}
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-slate-700">🔔 Top 5 Lâu chưa quay lại</h5>
                                        <button type="button" onClick={() => router.push("/customers")} className="text-[11px] text-emerald-700 font-semibold hover:underline">Xem tất cả →</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.top5LongestAbsent || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                                        ) : (
                                            (analyticsData?.breakdown?.top5LongestAbsent || []).map((c, i) => (
                                                <div
                                                    key={c.id}
                                                    role="button" tabIndex={0}
                                                    onClick={() => router.push(`/customers?search=${encodeURIComponent(c.phone || c.name)}`)}
                                                    title="Bấm để liên hệ chăm sóc khách hàng"
                                                    className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 cursor-pointer hover:bg-slate-50 rounded px-1 transition-colors"
                                                >
                                                    <div>
                                                        <span className="font-semibold text-slate-800 hover:text-emerald-700">{i + 1}. {c.name}</span>
                                                        <span className="text-[10px] text-slate-400 block">{c.phone || 'Chưa có SĐT'}</span>
                                                    </div>
                                                    <span className="font-bold text-amber-600">{c.daysSince} ngày</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Top 5 cá lớn nhất */}
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">🐟 Top 5 Cá lớn nhất</h5>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.top5BiggestFish || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có dữ liệu thu mua cá</span>
                                        ) : (
                                            (analyticsData?.breakdown?.top5BiggestFish || []).map((f, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{i + 1}. {f.name}</span>
                                                        <span className="text-[10px] text-slate-400 block">{formatVnd(f.revenue)}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-800">{f.weight.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Danh sách nhân viên */}
                                <div className="col-span-1 sm:col-span-2 rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">👤 Danh sách Nhân viên</h5>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.staff || []).map((st: StaffMember) => (
                                            <div key={st.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                                                <div>
                                                    <span className="font-semibold text-slate-800">{st.name}</span>
                                                    <span className="text-[10px] text-slate-400 block">{st.email}</span>
                                                </div>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                                    {st.role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: System & SaaS */}
                    {activeTab === "system" && userRole && userRole !== Role.STAFF && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                    Nhật ký thao tác & Gói SaaS
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div
                                    role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown("auditEvents"); } }} onClick={() => openDrilldown("auditEvents")}
                                    className="cursor-pointer rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 hover:bg-blue-100/60 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-blue-700 block">
                                    Nhật ký thao tác (Audit Logs)
                                        </span>
                                        <span className="text-[10px] font-medium text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-full group-hover:bg-blue-200 transition-colors">
                                            Bấm xem chi tiết ↗
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-baseline justify-between">
                                        <span className="text-xl font-bold text-slate-900">
                                            {analyticsData?.breakdown?.auditEventsCount ?? 0} sự kiện
                                        </span>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push("/invoices/history?tab=audit");
                                            }}
                                            className="text-[11px] text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium"
                                        >
                                            Xem toàn bộ nhật ký
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 block mt-1">
                                        Ghi vết hành động của nhân viên & giao dịch trong kỳ lọc
                                    </span>
                                </div>

                                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5">
                                    <span className="text-[11px] font-semibold text-emerald-800 block">
                                    Gói cước SaaS</span>
                                    <span className="text-xl font-bold text-emerald-800 mt-1 block">
                                        {analyticsData?.lake?.plan || "TRIAL"}
                                    </span>
                                    <span className="text-[11px] text-slate-500 block mt-1">
                                        Hạn dùng: <strong className="text-slate-700">{analyticsData?.lake?.expiresAt ? new Date(analyticsData.lake.expiresAt).toLocaleDateString("vi-VN") : "Vô thời hạn"}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </main>

            {/* Bottom Sheet for Advanced Filter */}
            <AdvancedFilterSheet
                isOpen={isFilterSheetOpen}
                onClose={() => setIsFilterSheetOpen(false)}
                filters={advancedFilters}
                options={analyticsData?.filterOptions || { areas: [], huts: [], packages: [], products: [], staff: [] }}
                onApply={handleAdvancedFilterApply}
                onReset={handleAdvancedFilterReset}
            />

            {/* Drilldown Drawer on KPI click */}
            {drilldownMetric && (
                <DrilldownDrawer
                    key={`${drilldownMetric}-${paramsString}`}
                    isOpen={Boolean(drilldownMetric)}
                    onClose={() => setDrilldownMetric(null)}
                    metric={drilldownMetric}
                    filterState={filterState}
                    lakeId={lakeId}
                    advancedFilters={advancedFilters}
                    returnTo={`${reportNavigation}&metric=${drilldownMetric}`}
                />
            )}

            {/* Bottom Navigation */}
            <MobileBottomNav />
            </div>
        </div>
    );
}
