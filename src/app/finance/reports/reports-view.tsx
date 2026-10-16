"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FinanceNav } from "@/components/finance/finance-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

const formatMoney = (v: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

const todayStr = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

export function FinancialReportsView({
    lakeId,
    lakeName,
}: {
    lakeId: string;
    lakeName: string;
}) {
    const [reportType, setReportType] = useState<"pnl" | "cashflow" | "debt">("pnl");
    const [from, setFrom] = useState(() => `${todayStr().slice(0, 7)}-01`);
    const [to, setTo] = useState(todayStr());

    const queryUrl = `/api/finance/reports?type=${reportType}&from=${from}&to=${to}`;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["financial-report", lakeId, reportType, from, to],
        queryFn: async () => {
            const res = await fetch(queryUrl, { cache: "no-store" });
            if (!res.ok) throw new Error("Không thể tải báo cáo.");
            return res.json();
        },
        staleTime: 10000,
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                            <span>SaaS Tài chính</span>
                            <span>•</span>
                            <span>{lakeName}</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Báo cáo Tài chính & Dòng tiền
                        </h1>
                    </div>

                    <a
                        href={`${queryUrl}&export=csv`}
                        download
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-slate-800"
                    >
                        <span>📥</span> Xuất Excel / CSV
                    </a>
                </div>
            </header>

            <FinanceNav />

            <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
                {/* Chọn loại báo cáo & Khoảng ngày */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                        <button
                            onClick={() => setReportType("pnl")}
                            className={`rounded-md px-3 py-1.5 transition-all ${
                                reportType === "pnl"
                                    ? "bg-white text-emerald-700 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            📊 Kết quả kinh doanh (P&L)
                        </button>
                        <button
                            onClick={() => setReportType("cashflow")}
                            className={`rounded-md px-3 py-1.5 transition-all ${
                                reportType === "cashflow"
                                    ? "bg-white text-emerald-700 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            💵 Dòng tiền lưu chuyển
                        </button>
                        <button
                            onClick={() => setReportType("debt")}
                            className={`rounded-md px-3 py-1.5 transition-all ${
                                reportType === "debt"
                                    ? "bg-white text-emerald-700 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            📑 Phân tích tuổi nợ
                        </button>
                    </div>

                    {reportType !== "debt" && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-semibold">Kỳ báo cáo:</span>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                            />
                            <span className="text-slate-400">đến</span>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                            />
                            <button
                                onClick={() => void refetch()}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                                Xem
                            </button>
                        </div>
                    )}
                </div>

                {/* Nội dung báo cáo */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    {isLoading ? (
                        <p className="py-12 text-center text-sm text-slate-400">Đang tổng hợp số liệu báo cáo...</p>
                    ) : reportType === "pnl" ? (
                        /* BÁO CÁO KẾT QUẢ KINH DOANH */
                        <div className="space-y-6">
                            <div className="border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-bold text-slate-900">
                                    Báo cáo Kết quả Kinh doanh Ước tính
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Khoảng thời gian: Từ {from} đến {to}
                                </p>
                            </div>

                            {/* 1. Doanh thu */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                                    <span className="text-emerald-700 font-extrabold uppercase">1. DOANH THU THUẦN</span>
                                    <span className="text-emerald-700 font-extrabold">
                                        {formatMoney(data?.revenue?.totalRevenue || 0)}
                                    </span>
                                </div>
                                <div className="pl-4 space-y-1 text-xs text-slate-600">
                                    <div className="flex justify-between">
                                        <span>• Doanh thu vé câu</span>
                                        <span>{formatMoney(data?.revenue?.ticketRevenue || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>• Doanh thu bán hàng (mồi, phụ kiện, f&b)</span>
                                        <span>{formatMoney(data?.revenue?.productRevenue || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>• Doanh thu dịch vụ & thu khác</span>
                                        <span>{formatMoney(data?.revenue?.otherRevenue || 0)}</span>
                                    </div>
                                    {(data?.revenue?.discounts || 0) > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>• Các khoản giảm trừ (giảm giá, hoàn tiền)</span>
                                            <span>-{formatMoney(data?.revenue?.discounts)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Chi phí */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                                    <span className="text-red-700 font-extrabold uppercase">2. CHI PHÍ HOẠT ĐỘNG</span>
                                    <span className="text-red-700 font-extrabold">
                                        {formatMoney(data?.expenses?.totalExpense || 0)}
                                    </span>
                                </div>
                                <div className="pl-4 space-y-1 text-xs text-slate-600">
                                    {data?.expenses?.breakdown?.map((item: { name: string; amountVnd: number; ratioPct: number }, idx: number) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>• {item.name}</span>
                                            <span>
                                                {formatMoney(item.amountVnd)} ({item.ratioPct}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Lợi nhuận ước tính */}
                            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-base font-extrabold text-slate-900">
                                            3. LỢI NHUẬN ƯỚC TÍNH (1 - 2)
                                        </span>
                                        <p className="text-xs text-slate-500">
                                            * Số liệu phản ánh chênh lệch doanh thu và chi phí thực tế.
                                        </p>
                                    </div>
                                    <span
                                        className={`text-2xl font-black ${
                                            (data?.estimatedProfit || 0) >= 0 ? "text-emerald-700" : "text-red-700"
                                        }`}
                                    >
                                        {formatMoney(data?.estimatedProfit || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : reportType === "cashflow" ? (
                        /* BÁO CÁO DÒNG TIỀN */
                        <div className="space-y-6">
                            <div className="border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-bold text-slate-900">
                                    Báo cáo Lưu chuyển Tiền tệ (Dòng tiền)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Khoảng thời gian: Từ {from} đến {to}
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100 text-sm">
                                <div className="py-3 flex justify-between font-semibold">
                                    <span>1. Số dư tiền đầu kỳ</span>
                                    <span className="font-bold text-slate-900">
                                        {formatMoney(data?.beginningBalance || 0)}
                                    </span>
                                </div>
                                <div className="py-3 flex justify-between text-emerald-700 font-semibold">
                                    <span>2. Tổng tiền thực thu trong kỳ (+)</span>
                                    <span className="font-bold">+{formatMoney(data?.totalCashIn || 0)}</span>
                                </div>
                                <div className="py-3 flex justify-between text-red-700 font-semibold">
                                    <span>3. Tổng tiền thực chi trong kỳ (-)</span>
                                    <span className="font-bold">-{formatMoney(data?.totalCashOut || 0)}</span>
                                </div>
                                <div className="py-3 flex justify-between font-extrabold text-slate-800 bg-slate-50/70 px-2 rounded-lg">
                                    <span>4. Dòng tiền ròng trong kỳ (2 - 3)</span>
                                    <span
                                        className={
                                            (data?.netCashFlow || 0) >= 0 ? "text-emerald-700" : "text-red-700"
                                        }
                                    >
                                        {formatMoney(data?.netCashFlow || 0)}
                                    </span>
                                </div>
                                <div className="py-4 flex justify-between font-black text-slate-900 text-base">
                                    <span>5. SỐ DƯ TIỀN CUỐI KỲ (1 + 4)</span>
                                    <span className="text-emerald-700 font-extrabold">
                                        {formatMoney(data?.endingBalance || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* BÁO CÁO CÔNG NỢ & TUỔI NỢ */
                        <div className="space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-bold text-slate-900">
                                    Báo cáo Chi tiết & Phân tích Tuổi nợ
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Phân loại theo thời gian đến hạn thanh toán
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2.5">Mã nợ</th>
                                            <th className="px-3 py-2.5">Phân loại</th>
                                            <th className="px-3 py-2.5">Đối tác</th>
                                            <th className="px-3 py-2.5">Nội dung</th>
                                            <th className="px-3 py-2.5 text-right">Tổng nợ</th>
                                            <th className="px-3 py-2.5 text-right">Còn nợ</th>
                                            <th className="px-3 py-2.5 text-center">Hạn trả</th>
                                            <th className="px-3 py-2.5 text-center">Nhóm tuổi nợ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data?.debts?.map((d: { id: string; code: string; type: string; debtor: string; title: string; totalAmountVnd: number; paidAmountVnd: number; remainingAmountVnd: number; dueDate: string | null; ageCategory: string }) => (
                                            <tr key={d.id} className="hover:bg-slate-50/80">
                                                <td className="px-3 py-2.5 font-mono font-bold">{d.code}</td>
                                                <td className="px-3 py-2.5">
                                                    {d.type === "RECEIVABLE" ? (
                                                        <span className="text-emerald-700 font-bold">Phải thu</span>
                                                    ) : (
                                                        <span className="text-blue-700 font-bold">Phải trả</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 font-bold">{d.debtor}</td>
                                                <td className="px-3 py-2.5 text-slate-600">{d.title}</td>
                                                <td className="px-3 py-2.5 text-right">{formatMoney(d.totalAmountVnd)}</td>
                                                <td className="px-3 py-2.5 text-right font-extrabold text-amber-700">
                                                    {formatMoney(d.remainingAmountVnd)}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">{d.dueDate || "---"}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            d.ageCategory.includes("> 30")
                                                                ? "bg-red-100 text-red-800"
                                                                : d.ageCategory.includes("≤ 30")
                                                                ? "bg-amber-100 text-amber-800"
                                                                : "bg-emerald-100 text-emerald-800"
                                                        }`}
                                                    >
                                                        {d.ageCategory}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <MobileBottomNav />
        </div>
    );
}
