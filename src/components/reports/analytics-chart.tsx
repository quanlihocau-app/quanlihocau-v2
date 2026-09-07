"use client";

import { useState } from "react";

import { formatVnd } from "@/lib/reports/date-utils";

export interface ChartDataPoint {
    key: string;
    label: string;
    revenue: number;
    expense: number;
    profit: number;
    sessions: number;
    overtimeVnd: number;
}

interface AnalyticsChartProps {
    data: ChartDataPoint[];
    groupingLabel?: string;
}

type ActiveMetric = "all" | "revenue" | "expense" | "profit" | "sessions" | "overtime";

export function AnalyticsChart({ data }: AnalyticsChartProps) {
    const [activeMetric, setActiveMetric] = useState<ActiveMetric>("all");
    const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

    if (!data || data.length === 0) {
        return (
            <div className="flex h-44 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-400">
                Chưa có dữ liệu biểu đồ trong khoảng thời gian này
            </div>
        );
    }

    // Determine max value for Y axis
    const maxVal = Math.max(
        1,
        ...data.map((d) => {
            if (activeMetric === "revenue") return d.revenue;
            if (activeMetric === "expense") return d.expense;
            if (activeMetric === "profit") return Math.max(0, d.profit);
            if (activeMetric === "sessions") return d.sessions;
            if (activeMetric === "overtime") return d.overtimeVnd;
            return Math.max(d.revenue, d.expense, d.profit);
        })
    );

    const svgHeight = 160;
    const paddingBottom = 24;
    const chartHeight = svgHeight - paddingBottom;
    const barGroupWidth = 100 / data.length;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            {/* Chart Title & Metric Selector Pills */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
                <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Biểu đồ phân tích xu hướng
                    </h3>
                    <p className="text-[11px] text-slate-500">
                        Chạm vào cột để xem chi tiết mốc thời gian
                    </p>
                </div>

                {/* Metric filter buttons */}
                <div className="no-scrollbar flex items-center gap-1 overflow-x-auto py-0.5">
                    <button
                        type="button"
                        onClick={() => setActiveMetric("all")}
                        className={`min-h-12 rounded-lg px-2.5 text-[11px] font-semibold transition-all flex items-center justify-center ${
                            activeMetric === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        Tất cả
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMetric("revenue")}
                        className={`min-h-12 rounded-lg px-2.5 text-[11px] font-semibold transition-all flex items-center justify-center ${
                            activeMetric === "revenue" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                    >
                        Doanh thu
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMetric("expense")}
                        className={`min-h-12 rounded-lg px-2.5 text-[11px] font-semibold transition-all flex items-center justify-center ${
                            activeMetric === "expense" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                        }`}
                    >
                        Chi phí
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMetric("profit")}
                        className={`min-h-12 rounded-lg px-2.5 text-[11px] font-semibold transition-all flex items-center justify-center ${
                            activeMetric === "profit" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                        }`}
                    >
                        Lợi nhuận
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMetric("sessions")}
                        className={`min-h-12 rounded-lg px-2.5 text-[11px] font-semibold transition-all flex items-center justify-center ${
                            activeMetric === "sessions" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-800 hover:bg-purple-100"
                        }`}
                    >
                        Số vé
                    </button>
                </div>
            </div>

            {/* Hovered / Tapped Tooltip Display */}
            <div className="min-h-8 my-1 flex items-center justify-between px-1 text-xs">
                {hoveredPoint ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-full text-[11px]">
                        <span className="font-bold text-slate-800">[{hoveredPoint.label}]</span>
                        <span className="text-emerald-700 font-semibold">Thu: {formatVnd(hoveredPoint.revenue)}</span>
                        <span className="text-rose-700 font-semibold">Chi: {formatVnd(hoveredPoint.expense)}</span>
                        <span className="text-blue-700 font-semibold">Lãi: {formatVnd(hoveredPoint.profit)}</span>
                        <span className="text-purple-700 font-semibold">Vé: {hoveredPoint.sessions}</span>
                        {hoveredPoint.overtimeVnd > 0 && (
                            <span className="text-amber-700 font-semibold">Thêm giờ: {formatVnd(hoveredPoint.overtimeVnd)}</span>
                        )}
                    </div>
                ) : (
                    <span className="text-[11px] text-slate-400 italic">
                        Di chuột hoặc chạm vào thanh để xem số liệu điểm đó
                    </span>
                )}
            </div>

            {/* SVG Visual Chart */}
            <div className="relative mt-2 w-full">
                <svg
                    viewBox={`0 0 100 ${svgHeight}`}
                    className="w-full h-44 overflow-visible"
                    preserveAspectRatio="none"
                >
                    {/* Grid lines */}
                    <line x1="0" y1="0" x2="100" y2="0" stroke="#f1f5f9" strokeWidth="0.5" />
                    <line x1="0" y1={chartHeight * 0.5} x2="100" y2={chartHeight * 0.5} stroke="#f1f5f9" strokeWidth="0.5" />
                    <line x1="0" y1={chartHeight} x2="100" y2={chartHeight} stroke="#cbd5e1" strokeWidth="0.75" />

                    {/* Bars for each data point */}
                    {data.map((d, index) => {
                        const x = index * barGroupWidth;
                        const w = Math.max(1, barGroupWidth * 0.7);

                        // Calculate bar heights
                        const revH = (d.revenue / maxVal) * chartHeight;
                        const expH = (d.expense / maxVal) * chartHeight;
                        const profH = (Math.max(0, d.profit) / maxVal) * chartHeight;
                        const sessH = (d.sessions / maxVal) * chartHeight;

                        return (
                            <g
                                key={d.key}
                                onMouseEnter={() => setHoveredPoint(d)}
                                onClick={() => setHoveredPoint(d)}
                                className="cursor-pointer group"
                            >
                                {/* Invisible overlay for easier touch hit */}
                                <rect
                                    x={x}
                                    y="0"
                                    width={barGroupWidth}
                                    height={svgHeight}
                                    fill="transparent"
                                />

                                {activeMetric === "all" ? (
                                    <>
                                        {/* Revenue bar (Green) */}
                                        <rect
                                            x={x + 0.2}
                                            y={chartHeight - revH}
                                            width={w * 0.5}
                                            height={Math.max(1, revH)}
                                            fill="#10b981"
                                            rx="0.5"
                                            className="group-hover:opacity-80 transition-opacity"
                                        />
                                        {/* Expense bar (Red) */}
                                        <rect
                                            x={x + w * 0.5 + 0.3}
                                            y={chartHeight - expH}
                                            width={w * 0.45}
                                            height={Math.max(1, expH)}
                                            fill="#f43f5e"
                                            rx="0.5"
                                            className="group-hover:opacity-80 transition-opacity"
                                        />
                                    </>
                                ) : activeMetric === "revenue" ? (
                                    <rect
                                        x={x + 0.5}
                                        y={chartHeight - revH}
                                        width={w}
                                        height={Math.max(1, revH)}
                                        fill="#10b981"
                                        rx="0.5"
                                    />
                                ) : activeMetric === "expense" ? (
                                    <rect
                                        x={x + 0.5}
                                        y={chartHeight - expH}
                                        width={w}
                                        height={Math.max(1, expH)}
                                        fill="#f43f5e"
                                        rx="0.5"
                                    />
                                ) : activeMetric === "profit" ? (
                                    <rect
                                        x={x + 0.5}
                                        y={chartHeight - profH}
                                        width={w}
                                        height={Math.max(1, profH)}
                                        fill="#3b82f6"
                                        rx="0.5"
                                    />
                                ) : (
                                    <rect
                                        x={x + 0.5}
                                        y={chartHeight - sessH}
                                        width={w}
                                        height={Math.max(1, sessH)}
                                        fill="#8b5cf6"
                                        rx="0.5"
                                    />
                                )}

                                {/* X-axis labels (render every Nth point to avoid overlap on mobile) */}
                                {(data.length <= 12 || index % Math.ceil(data.length / 8) === 0) && (
                                    <text
                                        x={x + barGroupWidth / 2}
                                        y={svgHeight - 6}
                                        fontSize="3"
                                        fill="#64748b"
                                        textAnchor="middle"
                                        className="select-none font-sans font-medium"
                                    >
                                        {d.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                    <span>Doanh thu</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                    <span>Chi phí</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" />
                    <span>Lợi nhuận</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-purple-500" />
                    <span>Số vé</span>
                </div>
            </div>
        </div>
    );
}
