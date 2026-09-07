"use client";

import { useEffect, useState, useCallback } from "react";

import { formatVnd } from "@/lib/reports/date-utils";
import { DrilldownItem } from "@/app/api/reports/drilldown/route";

interface DrilldownDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    metric: string;
    filterState: {
        preset: string;
        from?: string;
        to?: string;
        fromTime?: string;
        toTime?: string;
    };
}

export function DrilldownDrawer({
    isOpen,
    onClose,
    metric,
    filterState,
}: DrilldownDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{
        title: string;
        totalCount: number;
        items: DrilldownItem[];
        page: number;
        totalPages: number;
    } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchDrilldown = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                metric,
                preset: filterState.preset,
                page: String(page),
                limit: "30",
            });
            if (filterState.from) params.set("from", filterState.from);
            if (filterState.to) params.set("to", filterState.to);
            if (filterState.fromTime) params.set("fromTime", filterState.fromTime);
            if (filterState.toTime) params.set("toTime", filterState.toTime);

            const res = await fetch(`/api/reports/drilldown?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load drilldown data");
            const json = (await res.json()) as {
                title: string;
                totalCount: number;
                items: DrilldownItem[];
                page: number;
                totalPages: number;
            };
            setData(json);
            setCurrentPage(page);
        } catch (err) {
            console.error("Error loading drilldown:", err);
        } finally {
            setLoading(false);
        }
    }, [metric, filterState.preset, filterState.from, filterState.to, filterState.fromTime, filterState.toTime]);

    useEffect(() => {
        if (!isOpen || !metric) return;
        let isCancelled = false;

        const loadInitial = async () => {
            try {
                const params = new URLSearchParams({
                    metric,
                    preset: filterState.preset,
                    page: "1",
                    limit: "30",
                });
                if (filterState.from) params.set("from", filterState.from);
                if (filterState.to) params.set("to", filterState.to);
                if (filterState.fromTime) params.set("fromTime", filterState.fromTime);
                if (filterState.toTime) params.set("toTime", filterState.toTime);

                const res = await fetch(`/api/reports/drilldown?${params.toString()}`);
                if (!res.ok) throw new Error("Failed to load drilldown data");
                const json = (await res.json()) as {
                    title: string;
                    totalCount: number;
                    items: DrilldownItem[];
                    page: number;
                    totalPages: number;
                };
                if (!isCancelled) {
                    setData(json);
                    setCurrentPage(1);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error loading drilldown:", err);
                if (!isCancelled) setLoading(false);
            }
        };

        void loadInitial();

        return () => {
            isCancelled = true;
        };
    }, [isOpen, metric, filterState.preset, filterState.from, filterState.to, filterState.fromTime, filterState.toTime]);

    if (!isOpen) return null;

    const filteredItems = (data?.items || []).filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.code.toLowerCase().includes(q) ||
            item.customerName.toLowerCase().includes(q) ||
            item.content.toLowerCase().includes(q) ||
            item.paymentMethod.toLowerCase().includes(q)
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Content Drawer */}
            <div className="relative z-10 w-full max-w-2xl rounded-t-2xl bg-white p-4 shadow-2xl transition-transform animate-in slide-in-from-bottom duration-200 h-[85vh] flex flex-col">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">
                            {data?.title || "Chi tiết giao dịch"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Tổng số: <strong className="text-slate-800">{data?.totalCount ?? 0}</strong> giao dịch
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Search Bar */}
                <div className="my-2.5">
                    <input
                        type="text"
                        placeholder="Tìm theo mã, khách hàng, nội dung..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2" />
                            <span className="text-xs font-medium">Đang tải dữ liệu chi tiết...</span>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <svg className="h-10 w-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            <span className="text-xs font-medium">Không có bản ghi nào trong khoảng thời gian này</span>
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <div key={item.id} className="py-2.5 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-800 tracking-wide font-mono">
                                                #{item.code}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                • {item.dateTime}
                                            </span>
                                        </div>
                                        <div className="mt-0.5 font-semibold text-slate-700">
                                            {item.content}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                                            <span>Khách: <strong className="text-slate-700">{item.customerName}</strong></span>
                                            <span>PT: <span className="rounded bg-slate-100 px-1 py-0.5 text-slate-600 font-medium">{item.paymentMethod}</span></span>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-bold text-emerald-700">
                                            {formatVnd(item.amountVnd)}
                                        </div>
                                        <span className="inline-block mt-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Pagination */}
                {data && data.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
                        <button
                            type="button"
                            disabled={currentPage <= 1 || loading}
                            onClick={() => fetchDrilldown(currentPage - 1)}
                            className="min-h-12 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 disabled:opacity-40"
                        >
                            ← Trang trước
                        </button>
                        <span className="text-xs font-medium text-slate-500">
                            Trang {currentPage} / {data.totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={currentPage >= data.totalPages || loading}
                            onClick={() => fetchDrilldown(currentPage + 1)}
                            className="min-h-12 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 disabled:opacity-40"
                        >
                            Trang sau →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
