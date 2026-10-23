"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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

const daysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
};

export function OverviewView({
    lakeId,
    lakeName,
}: {
    lakeId: string;
    lakeName: string;
}) {
    const [preset, setPreset] = useState<"today" | "7days" | "30days" | "month">("today");
    const [from, setFrom] = useState(todayStr());
    const [to, setTo] = useState(todayStr());

    function handlePresetChange(val: "today" | "7days" | "30days" | "month") {
        setPreset(val);
        const t = todayStr();
        if (val === "today") {
            setFrom(t);
            setTo(t);
        } else if (val === "7days") {
            setFrom(daysAgoStr(6));
            setTo(t);
        } else if (val === "30days") {
            setFrom(daysAgoStr(29));
            setTo(t);
        } else if (val === "month") {
            const firstDay = `${t.slice(0, 7)}-01`;
            setFrom(firstDay);
            setTo(t);
        }
    }

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["finance-overview", lakeId, from, to],
        queryFn: async () => {
            const res = await fetch(`/api/finance/overview?from=${from}&to=${to}`, {
                cache: "no-store",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Không thể tải dữ liệu.");
            }
            return res.json();
        },
        staleTime: 30000,
    });

    const kpis = data?.kpis;

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
                            Tổng quan tài chính & Sổ quỹ
                        </h1>
                    </div>

                    {/* Bộ lọc thời gian */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                            <button
                                onClick={() => handlePresetChange("today")}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    preset === "today"
                                        ? "bg-white text-emerald-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Hôm nay
                            </button>
                            <button
                                onClick={() => handlePresetChange("7days")}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    preset === "7days"
                                        ? "bg-white text-emerald-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                7 ngày
                            </button>
                            <button
                                onClick={() => handlePresetChange("30days")}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    preset === "30days"
                                        ? "bg-white text-emerald-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                30 ngày
                            </button>
                            <button
                                onClick={() => handlePresetChange("month")}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    preset === "month"
                                        ? "bg-white text-emerald-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Tháng này
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Menu tab tài chính */}
            <FinanceNav />

            {/* Nội dung chính */}
            <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
                {/* Thanh tác vụ nhanh */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-linear-to-r from-emerald-50 to-teal-50 p-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                            ⚡
                        </span>
                        <div>
                            <p className="text-sm font-bold text-emerald-950">Thao tác tài chính nhanh</p>
                            <p className="text-xs text-emerald-700">Tạo phiếu thu chi, ghi nợ hoặc chuyển tiền tức thì</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/finance/transactions?action=receipt"
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700"
                        >
                            <span>＋</span> Phiếu thu
                        </Link>
                        <Link
                            href="/finance/transactions?action=expense"
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-700 shadow-xs transition-all hover:bg-red-50"
                        >
                            <span>－</span> Phiếu chi
                        </Link>
                        <Link
                            href="/finance/funds"
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50"
                        >
                            <span>⇄</span> Chuyển quỹ
                        </Link>
                        <Link
                            href="/finance/debts"
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50"
                        >
                            <span>📝</span> Ghi nợ
                        </Link>
                    </div>
                </div>

                {isLoading && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4" />
                        ))}
                    </div>
                )}

                {isError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
                        <p className="font-semibold">Đã xảy ra lỗi khi tải số liệu.</p>
                        <button
                            onClick={() => void refetch()}
                            className="mt-2 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {kpis && (
                    <>
                        {/* 1. Nhóm KPI hàng đầu */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Doanh thu */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Tổng doanh thu</span>
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-sm">
                                        🏷️
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline justify-between">
                                    <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                                        {formatMoney(kpis.totalRevenue.valueVnd)}
                                    </span>
                                    <span
                                        className={`inline-flex items-center text-xs font-bold ${
                                            kpis.totalRevenue.growthPct >= 0
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {kpis.totalRevenue.growthPct >= 0 ? "↑" : "↓"}{" "}
                                        {Math.abs(kpis.totalRevenue.growthPct)}%
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 line-clamp-1" title={kpis.totalRevenue.tooltip}>
                                    {kpis.totalRevenue.tooltip}
                                </p>
                            </div>

                            {/* Chi phí */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Tổng chi phí</span>
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 text-sm">
                                        💸
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline justify-between">
                                    <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                                        {formatMoney(kpis.totalExpenses.valueVnd)}
                                    </span>
                                    <span
                                        className={`inline-flex items-center text-xs font-bold ${
                                            kpis.totalExpenses.growthPct <= 0
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {kpis.totalExpenses.growthPct >= 0 ? "↑" : "↓"}{" "}
                                        {Math.abs(kpis.totalExpenses.growthPct)}%
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 line-clamp-1" title={kpis.totalExpenses.tooltip}>
                                    {kpis.totalExpenses.tooltip}
                                </p>
                            </div>

                            {/* Doanh thu trừ chi và thu cá */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Doanh thu trừ chi và thu cá</span>
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-sm">
                                        📈
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline justify-between">
                                    <span
                                        className={`text-2xl font-extrabold tracking-tight ${
                                            kpis.estimatedProfit.valueVnd >= 0
                                                ? "text-emerald-700"
                                                : "text-red-700"
                                        }`}
                                    >
                                        {formatMoney(kpis.estimatedProfit.valueVnd)}
                                    </span>
                                    <span
                                        className={`inline-flex items-center text-xs font-bold ${
                                            kpis.estimatedProfit.growthPct >= 0
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {kpis.estimatedProfit.growthPct >= 0 ? "↑" : "↓"}{" "}
                                        {Math.abs(kpis.estimatedProfit.growthPct)}%
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 line-clamp-1" title={kpis.estimatedProfit.tooltip}>
                                    {kpis.estimatedProfit.tooltip}
                                </p>
                            </div>
                        </div>

                        {/* 2. Nhóm Dòng tiền & Sổ quỹ */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <span className="text-xs font-semibold text-slate-500">Tiền thực thu</span>
                                <p className="mt-1 text-xl font-bold text-slate-900">
                                    {formatMoney(kpis.totalReceipts.valueVnd)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Vào quỹ & ngân hàng</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <span className="text-xs font-semibold text-slate-500">Tiền thực chi</span>
                                <p className="mt-1 text-xl font-bold text-slate-900">
                                    {formatMoney(kpis.totalActualExpenses.valueVnd)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Đã xuất khỏi quỹ</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <span className="text-xs font-semibold text-slate-500">Dòng tiền thuần (Net)</span>
                                <p
                                    className={`mt-1 text-xl font-bold ${
                                        kpis.netCashFlow.valueVnd >= 0 ? "text-emerald-700" : "text-red-700"
                                    }`}
                                >
                                    {formatMoney(kpis.netCashFlow.valueVnd)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Thực thu trừ thực chi</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-emerald-50/50 p-4">
                                <span className="text-xs font-semibold text-emerald-800">Số dư tất cả các quỹ</span>
                                <p className="mt-1 text-xl font-bold text-emerald-900">
                                    {formatMoney(kpis.totalFundBalance.valueVnd)}
                                </p>
                                <p className="mt-1 text-xs text-emerald-700">Khả dụng hiện tại</p>
                            </div>
                        </div>

                        {/* 3. Công nợ khách hàng vs Nhà cung cấp */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                                <div>
                                    <span className="text-xs font-semibold text-amber-800">Công nợ phải thu (Khách nợ)</span>
                                    <p className="mt-1 text-xl font-extrabold text-amber-950">
                                        {formatMoney(kpis.receivableDebt.valueVnd)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-amber-700">Cần theo dõi và thu hồi</p>
                                </div>
                                <Link
                                    href="/finance/debts?type=RECEIVABLE"
                                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-100"
                                >
                                    Xem chi tiết →
                                </Link>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                                <div>
                                    <span className="text-xs font-semibold text-blue-800">Công nợ phải trả (Nợ nhà cung cấp)</span>
                                    <p className="mt-1 text-xl font-extrabold text-blue-950">
                                        {formatMoney(kpis.payableDebt.valueVnd)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-blue-700">Tiền cá, mồi, thức ăn chưa trả</p>
                                </div>
                                <Link
                                    href="/finance/debts?type=PAYABLE"
                                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-blue-800 shadow-xs hover:bg-blue-100"
                                >
                                    Xem chi tiết →
                                </Link>
                            </div>
                        </div>

                        {/* 4. Sổ quỹ & Cơ cấu chi tiêu */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Danh sách các tài khoản quỹ */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-900">Chi tiết số dư theo quỹ</h3>
                                    <Link href="/finance/funds" className="text-xs font-semibold text-emerald-600 hover:underline">
                                        Quản lý quỹ →
                                    </Link>
                                </div>
                                <div className="mt-4 divide-y divide-slate-100">
                                    {data?.accounts?.map((acc: { id: string; name: string; accountType: string; balanceVnd: number }) => (
                                        <div key={acc.id} className="flex items-center justify-between py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg">
                                                    {acc.accountType === "BANK" ? "🏦" : acc.accountType === "WALLET" ? "📱" : "💵"}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{acc.name}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {acc.accountType === "BANK" ? "Tài khoản ngân hàng" : "Quỹ tiền mặt"}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-slate-900">
                                                {formatMoney(acc.balanceVnd)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top danh mục chi phí */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-900">Cơ cấu danh mục chi tiêu</h3>
                                    <Link href="/finance/categories" className="text-xs font-semibold text-emerald-600 hover:underline">
                                        Xem danh mục →
                                    </Link>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {data?.topExpenseCategories?.length === 0 ? (
                                        <p className="py-6 text-center text-xs text-slate-400">Chưa có chi phí trong kỳ này.</p>
                                    ) : (
                                        data?.topExpenseCategories?.slice(0, 6).map((cat: { categoryId: string | null; name: string; color: string; totalVnd: number }, idx: number) => {
                                            const totalExp = kpis.totalExpenses.valueVnd || 1;
                                            const pct = Math.round((cat.totalVnd / totalExp) * 100);
                                            return (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex justify-between text-xs font-semibold">
                                                        <span className="text-slate-700">{cat.name}</span>
                                                        <span className="text-slate-900">
                                                            {formatMoney(cat.totalVnd)} ({pct}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${Math.min(100, Math.max(2, pct))}%`,
                                                                backgroundColor: cat.color || "#ef4444",
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <MobileBottomNav />
        </div>
    );
}
