"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { DateFilterState, DateRangePicker } from "@/components/reports/date-range-picker";
import { AdvancedFilterSheet, AdvancedFilterValues } from "@/components/reports/advanced-filter-sheet";
import { DrilldownDrawer } from "@/components/reports/drilldown-drawer";
import { AnalyticsChart } from "@/components/reports/analytics-chart";
import { CompareMode, DatePreset, DeltaComparison, formatVnd } from "@/lib/reports/date-utils";

interface ReportsViewProps {
    lakeName: string;
    lakeId: string;
    userEmail: string;
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

export function ReportsView({ lakeName }: ReportsViewProps) {
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

    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>({});
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    // Active drilldown metric
    const [drilldownMetric, setDrilldownMetric] = useState<string | null>(null);

    // Active reporting tab
    const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "operations" | "facilities" | "inventory" | "customers" | "system">("overview");

    // Analytics data state
    const [analyticsData, setAnalyticsData] = useState<AnalyticsDataResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 2. Fetch Analytics Data
    useEffect(() => {
        let isCancelled = false;

        const load = async () => {
            try {
                const params = new URLSearchParams({
                    preset: filterState.preset,
                    compare: filterState.compare,
                });
                if (filterState.from) params.set("from", filterState.from);
                if (filterState.to) params.set("to", filterState.to);
                if (filterState.fromTime) params.set("fromTime", filterState.fromTime);
                if (filterState.toTime) params.set("toTime", filterState.toTime);

                // Add advanced filters
                if (advancedFilters.areaId) params.set("areaId", advancedFilters.areaId);
                if (advancedFilters.hutId) params.set("hutId", advancedFilters.hutId);
                if (advancedFilters.employeeId) params.set("employeeId", advancedFilters.employeeId);
                if (advancedFilters.packageId) params.set("packageId", advancedFilters.packageId);
                if (advancedFilters.productId) params.set("productId", advancedFilters.productId);
                if (advancedFilters.paymentMethod) params.set("paymentMethod", advancedFilters.paymentMethod);
                if (advancedFilters.sessionStatus) params.set("sessionStatus", advancedFilters.sessionStatus);

                const res = await fetch(`/api/reports/analytics?${params.toString()}`);
                if (!res.ok) throw new Error("Không thể tải báo cáo từ máy chủ");
                const data = (await res.json()) as AnalyticsDataResponse;

                if (!isCancelled) {
                    setAnalyticsData(data);
                    setError(null);

                    // Sync with LocalStorage
                    if (typeof window !== "undefined") {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState));
                    }
                }
            } catch (err: unknown) {
                if (!isCancelled) {
                    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu báo cáo";
                    console.error(err);
                    setError(msg);
                }
            }
        };

        void load();

        return () => {
            isCancelled = true;
        };
    }, [filterState, advancedFilters]);

    // Handle export report
    const handleExport = (format: "csv" | "excel") => {
        const params = new URLSearchParams({
            format,
            preset: filterState.preset,
        });
        if (filterState.from) params.set("from", filterState.from);
        if (filterState.to) params.set("to", filterState.to);
        if (filterState.fromTime) params.set("fromTime", filterState.fromTime);
        if (filterState.toTime) params.set("toTime", filterState.toTime);

        window.open(`/api/reports/export?${params.toString()}`, "_blank");
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
        <div className="min-h-screen bg-[#F6F8F5] pb-24 text-slate-900">
            {/* App Header */}
            <MobileAppHeader lakeName={lakeName} roleBadge="Báo cáo" />

            {/* Page Title & Action Bar */}
            <div className="border-b border-[#E3E8E3] bg-white px-4 py-2.5">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            Trung tâm Báo cáo
                        </h1>
                        <p className="text-[11px] text-slate-500">
                            Thống kê doanh thu, vận hành & tài chính đa kỳ
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Advanced filter toggle button */}
                        <button
                            type="button"
                            onClick={() => setIsFilterSheetOpen(true)}
                            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
                            title="Bộ lọc nâng cao"
                        >
                            <svg className="h-4 w-4 text-slate-600 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                            </svg>
                            Bộ lọc
                        </button>

                        {/* Export / Print dropdown */}
                        <button
                            type="button"
                            onClick={() => handleExport("excel")}
                            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs"
                            title="Xuất Excel"
                        >
                            Xuất Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-xs print:hidden"
                            title="In hoặc lưu PDF"
                        >
                            🖨️ In
                        </button>
                    </div>
                </div>
            </div>

            {/* Sticky Time Filter Bar */}
            <DateRangePicker
                value={filterState}
                onChange={setFilterState}
                currentRangeLabel={analyticsData?.timeWindow?.label || "Đang tải khoảng thời gian..."}
            />

            {/* Quick Shift Report Nav Notice */}
            <div className="mx-auto max-w-5xl px-3 pt-2">
                <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-600 shadow-xs">
                    <span>Cần chốt doanh thu ca trực hiện tại?</span>
                    <button
                        type="button"
                        onClick={() => router.push("/reports/daily")}
                        className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                        Xem Báo cáo chốt ca →
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="mx-auto max-w-5xl px-3 pt-3 space-y-4">
                {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                        {error}
                    </div>
                )}

                {/* 1. EXECUTIVE KPI SUMMARY CARDS (Clickable for Drilldown) */}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {/* Total Revenue */}
                    <div
                        onClick={() => setDrilldownMetric("totalRevenue")}
                        className="cursor-pointer rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-500 to-emerald-700 p-3.5 text-white shadow-sm hover:shadow-md transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-medium text-emerald-100 uppercase tracking-wider">
                            <span>1. Doanh thu tổng</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-lg font-extrabold sm:text-xl">
                            {formatVnd(s?.totalRevenue ?? 0)}
                        </div>
                        {renderDelta(d?.totalRevenue)}
                    </div>

                    {/* Net Profit */}
                    <div
                        className="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-600 to-indigo-700 p-3.5 text-white shadow-sm"
                    >
                        <div className="flex items-center justify-between text-[11px] font-medium text-blue-100 uppercase tracking-wider">
                            <span>7. Lợi nhuận tạm tính</span>
                            <span>📊</span>
                        </div>
                        <div className="mt-1 text-lg font-extrabold sm:text-xl">
                            {formatVnd(s?.netProfit ?? 0)}
                        </div>
                        {renderDelta(d?.netProfit)}
                    </div>

                    {/* Ticket Revenue */}
                    <div
                        onClick={() => setDrilldownMetric("ticketRevenue")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>2. Doanh thu vé</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-slate-800 sm:text-lg">
                            {formatVnd(s?.ticketRevenue ?? 0)}
                        </div>
                        {renderDelta(d?.ticketRevenue)}
                    </div>

                    {/* Retail / Product Revenue */}
                    <div
                        onClick={() => setDrilldownMetric("productRevenue")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>3. Tiền sản phẩm</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-slate-800 sm:text-lg">
                            {formatVnd(s?.productRevenue ?? 0)}
                        </div>
                        {renderDelta(d?.productRevenue)}
                    </div>

                    {/* Overtime Revenue */}
                    <div
                        onClick={() => setDrilldownMetric("overtimeRevenue")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>4. Tiền thêm giờ</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-amber-700 sm:text-lg">
                            {formatVnd(s?.overtimeRevenue ?? 0)}
                        </div>
                        {renderDelta(d?.overtimeRevenue)}
                    </div>

                    {/* Fish Buyback */}
                    <div
                        onClick={() => setDrilldownMetric("totalFishBuyback")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>5. Tiền thu mua cá</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-slate-800 sm:text-lg">
                            {formatVnd(s?.totalFishBuyback ?? 0)}
                        </div>
                        {renderDelta(d?.totalFishBuyback)}
                    </div>

                    {/* Total Expenses */}
                    <div
                        onClick={() => setDrilldownMetric("totalExpense")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>6. Tổng phiếu chi</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-rose-700 sm:text-lg">
                            {formatVnd(s?.totalExpense ?? 0)}
                        </div>
                        {renderDelta(d?.totalExpense)}
                    </div>

                    {/* Receivable Debt */}
                    <div
                        onClick={() => setDrilldownMetric("totalReceivableDebt")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all active:scale-98"
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>8. Công nợ chưa thu</span>
                            <span>🔍</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-amber-600 sm:text-lg">
                            {formatVnd(s?.totalReceivableDebt ?? 0)}
                        </div>
                    </div>
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
                            className={`whitespace-nowrap min-h-12 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center ${
                                activeTab === "overview" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            📊 Tổng quan & Vận hành
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("revenue")}
                            className={`whitespace-nowrap min-h-12 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center ${
                                activeTab === "revenue" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            💰 Dòng tiền & Thanh toán
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("facilities")}
                            className={`whitespace-nowrap min-h-12 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center ${
                                activeTab === "facilities" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            🎣 Hồ, Khu vực & Ô câu
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("inventory")}
                            className={`whitespace-nowrap min-h-12 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center ${
                                activeTab === "inventory" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            📦 Kho & Bán chạy
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("customers")}
                            className={`whitespace-nowrap min-h-12 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center ${
                                activeTab === "customers" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            👥 Khách hàng & Nhân viên
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("system")}
                            className={`whitespace-nowrap min-h-12 rounded-xl px-3 text-xs font-semibold transition-all flex items-center justify-center ${
                                activeTab === "system" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            ⚙️ Hệ thống & Gói SaaS
                        </button>
                    </div>

                    {/* TAB CONTENT: Overview & Operations */}
                    {activeTab === "overview" && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                12-17. Chỉ số Phiên câu & Thời lượng
                            </h4>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <div
                                    onClick={() => setDrilldownMetric("sessions")}
                                    className="cursor-pointer rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                                >
                                    <span className="text-[11px] text-slate-500 block">12. Số vé đã tạo</span>
                                    <span className="text-base font-bold text-slate-800">{s?.totalSessions ?? 0}</span>
                                </div>
                                <div
                                    onClick={() => setDrilldownMetric("activeSessions")}
                                    className="cursor-pointer rounded-xl bg-emerald-50/60 p-3 hover:bg-emerald-100/60 transition-colors"
                                >
                                    <span className="text-[11px] text-emerald-800 block">13. Vé đang câu</span>
                                    <span className="text-base font-bold text-emerald-800">{s?.activeSessions ?? 0}</span>
                                </div>
                                <div
                                    onClick={() => setDrilldownMetric("completedSessions")}
                                    className="cursor-pointer rounded-xl bg-blue-50/60 p-3 hover:bg-blue-100/60 transition-colors"
                                >
                                    <span className="text-[11px] text-blue-800 block">14. Vé đã hoàn thành</span>
                                    <span className="text-base font-bold text-blue-800">{s?.completedSessions ?? 0}</span>
                                </div>
                                <div
                                    onClick={() => setDrilldownMetric("cancelledSessions")}
                                    className="cursor-pointer rounded-xl bg-rose-50/60 p-3 hover:bg-rose-100/60 transition-colors"
                                >
                                    <span className="text-[11px] text-rose-800 block">15. Vé đã hủy</span>
                                    <span className="text-base font-bold text-rose-800">{s?.cancelledSessions ?? 0}</span>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <span className="text-[11px] text-slate-500 block">16. Số giờ câu ghi nhận</span>
                                    <span className="text-base font-bold text-slate-800">{s?.totalFishingHours ?? 0} giờ</span>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <span className="text-[11px] text-slate-500 block">17. Số giờ phụ trội thêm</span>
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
                                    onClick={() => setDrilldownMetric("cash")}
                                    className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <span>9. Tiền mặt (CASH)</span>
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
                                    onClick={() => setDrilldownMetric("transfer")}
                                    className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <span>10. Chuyển khoản (BANK_TRANSFER)</span>
                                        <span>🔍</span>
                                    </div>
                                    <div className="mt-1 text-base font-bold text-blue-700">
                                        {formatVnd(s?.netTransfer ?? 0)}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        Vào: {formatVnd(s?.transferIn ?? 0)} • Ra: {formatVnd(s?.transferOut ?? 0)}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs font-semibold text-slate-700">
                                        11. Doanh thu dịch vụ & Khác
                                    </div>
                                    <div className="mt-1 text-base font-bold text-slate-800">
                                        {formatVnd(s?.otherRevenue ?? 0)}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs font-semibold text-slate-700">
                                        30. Hoàn tiền & Giảm trừ hóa đơn
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
                                18-20. Doanh thu theo Khu vực & Ô câu
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {/* By Area */}
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">19. Doanh thu theo Khu vực</h5>
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
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">20. Doanh thu theo Ô câu</h5>
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
                                21-23. Báo cáo Sản phẩm, Bán chạy & Tồn kho
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">23. Top Sản phẩm bán chạy</h5>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.topProducts || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có doanh số sản phẩm</span>
                                        ) : (
                                            analyticsData?.breakdown?.topProducts.map((p: TopProduct) => (
                                                <div key={p.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{p.name}</span>
                                                        <span className="text-[10px] text-slate-500 block">Đã bán: {p.quantity}</span>
                                                    </div>
                                                    <span className="font-bold text-emerald-700">{formatVnd(p.revenueVnd)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">22. Biến động Kho</h5>
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
                                24-25. Khách hàng thân thiết & Đội ngũ nhân viên
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">24. Top Khách hàng chi tiêu</h5>
                                    <div className="space-y-2">
                                        {(analyticsData?.breakdown?.topCustomers || []).length === 0 ? (
                                            <span className="text-xs text-slate-400">Chưa có dữ liệu khách hàng</span>
                                        ) : (
                                            analyticsData?.breakdown?.topCustomers.map((c: TopCustomer) => (
                                                <div key={c.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{c.name}</span>
                                                        <span className="text-[10px] text-slate-400 block">{c.phone || "Chưa có SĐT"} • {c.sessions} phiên</span>
                                                    </div>
                                                    <span className="font-bold text-emerald-700">{formatVnd(c.totalSpent)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-3">
                                    <h5 className="text-xs font-bold text-slate-700 mb-2">25. Danh sách Nhân viên</h5>
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
                    {activeTab === "system" && (
                        <div className="pt-3 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-500">
                                26-28. Nhật ký thao tác & Gói SaaS
                            </h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div
                                    onClick={() => setDrilldownMetric("auditEvents")}
                                    className="cursor-pointer rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 hover:bg-blue-100/60 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-blue-700 block">
                                            26. Nhật ký thao tác (Audit Logs)
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
                                    <span className="text-[11px] font-semibold text-emerald-800 block">27-28. Gói cước SaaS</span>
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
            </main>

            {/* Bottom Sheet for Advanced Filter */}
            <AdvancedFilterSheet
                isOpen={isFilterSheetOpen}
                onClose={() => setIsFilterSheetOpen(false)}
                filters={advancedFilters}
                options={analyticsData?.filterOptions || { areas: [], huts: [], packages: [], products: [], staff: [] }}
                onApply={(newFilters) => {
                    setAdvancedFilters(newFilters);
                }}
                onReset={() => setAdvancedFilters({})}
            />

            {/* Drilldown Drawer on KPI click */}
            {drilldownMetric && (
                <DrilldownDrawer
                    isOpen={Boolean(drilldownMetric)}
                    onClose={() => setDrilldownMetric(null)}
                    metric={drilldownMetric}
                    filterState={filterState}
                />
            )}

            {/* Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}
