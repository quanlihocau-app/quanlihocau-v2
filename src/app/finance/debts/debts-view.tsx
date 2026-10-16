"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { FinanceNav } from "@/components/finance/finance-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

type Debt = { id: string; code: string; type: "RECEIVABLE" | "PAYABLE"; title: string; totalAmountVnd: number; paidAmountVnd: number; remainingAmountVnd: number; dueDate: string | null; status: string; isOverdue?: boolean; computedStatus?: string; supplierName: string | null; customer?: { name: string } | null; payments?: unknown[]; _count?: { payments: number } };
type Account = { id: string; name: string; accountType: "CASH" | "BANK" | "WALLET" };
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const formatMoney = (v: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

export function DebtsView({
    lakeId,
    lakeName,
}: {
    lakeId: string;
    lakeName: string;
}) {
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") || "");
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [q, setQ] = useState("");

    // Modal tạo nợ mới
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formType, setFormType] = useState<"RECEIVABLE" | "PAYABLE">("RECEIVABLE");
    const [debtTitle, setDebtTitle] = useState("");
    const [debtAmount, setDebtAmount] = useState("");
    const [partnerName, setPartnerName] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [debtNote, setDebtNote] = useState("");
    const [isSubmittingDebt, setIsSubmittingDebt] = useState(false);

    // Modal Thanh toán nợ (Thu nợ hoặc Trả nợ)
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
    const [payAccountId, setPayAccountId] = useState("");
    const [payNote, setPayNote] = useState("");
    const [isSubmittingPay, setIsSubmittingPay] = useState(false);

    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Load danh sách nợ
    const queryUrl = `/api/finance/debts?${typeFilter ? `type=${typeFilter}` : ""}${
        overdueOnly ? `&overdueOnly=true` : ""
    }${q ? `&q=${encodeURIComponent(q)}` : ""}`;

    const { data, isLoading } = useQuery({
        queryKey: ["finance-debts", lakeId, queryUrl],
        queryFn: async () => {
            const res = await fetch(queryUrl, { cache: "no-store" });
            if (!res.ok) throw new Error("Không thể tải danh sách công nợ.");
            return res.json();
        },
        staleTime: 10000,
    });

    // Load danh sách quỹ
    const { data: accData } = useQuery({
        queryKey: ["finance-accounts", lakeId],
        queryFn: async () => {
            const res = await fetch(`/api/finance/accounts`);
            return res.json();
        },
    });

    const debts: Debt[] = data?.debts || [];
    const summary = data?.summary || { totalDebtVnd: 0, totalPaidVnd: 0, totalRemainingVnd: 0 };
    const accounts: Account[] = accData?.accounts || [];

    // Tạo khoản nợ mới
    async function handleCreateDebt(e: React.FormEvent) {
        e.preventDefault();
        const numAmount = parseInt(debtAmount.replace(/\D/g, ""), 10);
        if (!numAmount || numAmount <= 0) {
            setErrorMsg("Vui lòng nhập số tiền nợ hợp lệ.");
            return;
        }
        if (!debtTitle.trim() || !partnerName.trim()) {
            setErrorMsg("Vui lòng nhập nội dung nợ và tên đối tác.");
            return;
        }

        setIsSubmittingDebt(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const res = await fetch("/api/finance/debts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: formType,
                    title: debtTitle.trim(),
                    totalAmountVnd: numAmount,
                    supplierName: formType === "PAYABLE" ? partnerName.trim() : undefined,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    note: debtNote.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Lỗi tạo công nợ.");

            setSuccessMsg(json.message);
            setDebtTitle("");
            setDebtAmount("");
            setPartnerName("");
            setDueDate("");
            setDebtNote("");
            await queryClient.invalidateQueries({ queryKey: ["finance-debts", lakeId] });
            setTimeout(() => setIsCreateOpen(false), 800);
        } catch (err: unknown) {
            setErrorMsg(errorMessage(err, "Có lỗi xảy ra."));
        } finally {
            setIsSubmittingDebt(false);
        }
    }

    // Thanh toán khoản nợ
    async function handlePayDebt(e: React.FormEvent) {
        e.preventDefault();
        const numAmount = parseInt(payAmount.replace(/\D/g, ""), 10);
        if (!numAmount || numAmount <= 0) {
            setErrorMsg("Vui lòng nhập số tiền thanh toán hợp lệ.");
            return;
        }
        if (!selectedDebt) return;

        setIsSubmittingPay(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const res = await fetch(`/api/finance/debts/${selectedDebt.id}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amountVnd: numAmount,
                    paymentMethod: payMethod,
                    accountId: payAccountId || null,
                    note: payNote.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Lỗi thanh toán nợ.");

            setSuccessMsg(json.message);
            setPayAmount("");
            setPayNote("");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["finance-debts", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-transactions", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-accounts", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-overview", lakeId] }),
            ]);
            setTimeout(() => setSelectedDebt(null), 800);
        } catch (err: unknown) {
            setErrorMsg(errorMessage(err, "Có lỗi xảy ra."));
        } finally {
            setIsSubmittingPay(false);
        }
    }

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
                            Quản lý Sổ Công nợ Khách & NCC
                        </h1>
                    </div>

                    <button
                        onClick={() => {
                            setErrorMsg("");
                            setSuccessMsg("");
                            setIsCreateOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700"
                    >
                        <span>＋</span> Ghi nhận khoản nợ mới
                    </button>
                </div>
            </header>

            <FinanceNav />

            <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
                {/* 3 Thẻ thống kê công nợ */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <span className="text-xs font-bold uppercase text-slate-500">Tổng giá trị nợ ban đầu</span>
                        <p className="mt-1 text-xl font-extrabold text-slate-900">
                            {formatMoney(summary.totalDebtVnd)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <span className="text-xs font-bold uppercase text-emerald-800">Đã thanh toán / Thu hồi</span>
                        <p className="mt-1 text-xl font-extrabold text-emerald-900">
                            {formatMoney(summary.totalPaidVnd)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                        <span className="text-xs font-bold uppercase text-amber-800">Số tiền còn nợ lại</span>
                        <p className="mt-1 text-xl font-extrabold text-amber-950">
                            {formatMoney(summary.totalRemainingVnd)}
                        </p>
                    </div>
                </div>

                {/* Bộ lọc */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                            <button
                                onClick={() => {
                                    setTypeFilter("");
                                    setOverdueOnly(false);
                                }}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    typeFilter === "" && !overdueOnly
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Tất cả
                            </button>
                            <button
                                onClick={() => {
                                    setTypeFilter("RECEIVABLE");
                                    setOverdueOnly(false);
                                }}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    typeFilter === "RECEIVABLE" && !overdueOnly
                                        ? "bg-white text-emerald-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Phải thu (Khách nợ)
                            </button>
                            <button
                                onClick={() => {
                                    setTypeFilter("PAYABLE");
                                    setOverdueOnly(false);
                                }}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    typeFilter === "PAYABLE" && !overdueOnly
                                        ? "bg-white text-blue-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Phải trả (Hồ nợ NCC)
                            </button>
                            <button
                                onClick={() => setOverdueOnly(true)}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    overdueOnly
                                        ? "bg-white text-red-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                ⚠️ Nợ quá hạn
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="Tìm kiếm đối tác, mã nợ, nội dung..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
                        />
                    </div>
                </div>

                {/* Danh sách công nợ */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    {isLoading ? (
                        <div className="p-8 text-center text-sm text-slate-400">Đang tải danh sách công nợ...</div>
                    ) : debts.length === 0 ? (
                        <div className="p-12 text-center text-sm text-slate-400">
                            Không có khoản nợ nào theo điều kiện lọc.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Mã nợ</th>
                                        <th className="px-4 py-3">Phân loại</th>
                                        <th className="px-4 py-3">Đối tác</th>
                                        <th className="px-4 py-3">Nội dung</th>
                                        <th className="px-4 py-3 text-right">Tổng nợ</th>
                                        <th className="px-4 py-3 text-right">Còn nợ</th>
                                        <th className="px-4 py-3 text-center">Hạn thanh toán</th>
                                        <th className="px-4 py-3 text-center">Trạng thái</th>
                                        <th className="px-4 py-3 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {debts.map((d) => {
                                        const isReceivable = d.type === "RECEIVABLE";
                                        const isSettled = d.status === "SETTLED";
                                        const isOverdue = d.isOverdue;
                                        return (
                                            <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                                    {d.code}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                                            isReceivable
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-blue-50 text-blue-700"
                                                        }`}
                                                    >
                                                        {isReceivable ? "Phải thu" : "Phải trả"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-800">
                                                    {d.customer?.name || d.supplierName || "Đối tác"}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                                                    {d.title}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500">
                                                    {formatMoney(d.totalAmountVnd)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-extrabold text-amber-700">
                                                    {formatMoney(d.remainingAmountVnd)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {d.dueDate ? (
                                                        <span
                                                            className={`font-semibold ${
                                                                isOverdue ? "text-red-600 font-bold" : "text-slate-500"
                                                            }`}
                                                        >
                                                            {new Date(d.dueDate).toLocaleDateString("vi-VN")}
                                                            {isOverdue && " (Quá hạn)"}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Không có</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isSettled ? (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                            ĐÃ XONG
                                                        </span>
                                                    ) : isOverdue ? (
                                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                                                            QUÁ HẠN
                                                        </span>
                                                    ) : d.status === "PARTIAL" ? (
                                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                                            TRẢ MỘT PHẦN
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                            CHƯA TRẢ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {!isSettled ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedDebt(d);
                                                                setPayAmount(
                                                                    d.remainingAmountVnd.toLocaleString("vi-VN"),
                                                                );
                                                                setErrorMsg("");
                                                                setSuccessMsg("");
                                                            }}
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                                                        >
                                                            {isReceivable ? "Thu nợ" : "Trả nợ"}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Hoàn tất</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Ghi nợ mới */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-base text-slate-900">Ghi Nhận Khoản Công Nợ Mới</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-slate-400">
                                ✕
                            </button>
                        </div>
                        {errorMsg && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                        {successMsg && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{successMsg}</p>}
                        <form onSubmit={handleCreateDebt} className="space-y-3 text-xs sm:text-sm">
                            <div>
                                <label className="font-semibold text-slate-700">Loại công nợ</label>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value as "RECEIVABLE" | "PAYABLE")}
                                    className="w-full mt-1 border rounded-xl p-2"
                                >
                                    <option value="RECEIVABLE">Khách hàng nợ tiền (Phải thu)</option>
                                    <option value="PAYABLE">Hồ nợ tiền nhà cung cấp (Phải trả)</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">
                                    {formType === "RECEIVABLE" ? "Tên khách hàng nợ" : "Tên nhà cung cấp nợ"}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Anh Ba Cần Đước, Trại cá Bảy Núi..."
                                    value={partnerName}
                                    onChange={(e) => setPartnerName(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Số tiền nợ (VNĐ)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="0"
                                    value={debtAmount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setDebtAmount(raw ? Number(raw).toLocaleString("vi-VN") : "");
                                    }}
                                    className="w-full mt-1 border rounded-xl p-2 font-bold text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Nội dung nợ</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Tiền mua cá 500kg, Tiền thiếu ca câu..."
                                    value={debtTitle}
                                    onChange={(e) => setDebtTitle(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Hạn thanh toán (DueDate)</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingDebt}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                                >
                                    {isSubmittingDebt ? "Đang lưu..." : "Lưu khoản nợ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Thanh toán nợ (Thu nợ / Trả nợ) */}
            {selectedDebt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <span className="font-mono text-xs font-bold text-slate-400">
                                    {selectedDebt.code}
                                </span>
                                <h3 className="font-bold text-base text-slate-900">
                                    {selectedDebt.type === "RECEIVABLE" ? "Thu Hồi Nợ Khách Hàng" : "Thanh Toán Nợ Nhà Cung Cấp"}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedDebt(null)} className="text-slate-400">
                                ✕
                            </button>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                            <p>
                                <span className="text-slate-500">Đối tác:</span>{" "}
                                <span className="font-bold text-slate-900">
                                    {selectedDebt.customer?.name || selectedDebt.supplierName}
                                </span>
                            </p>
                            <p>
                                <span className="text-slate-500">Nội dung nợ:</span> {selectedDebt.title}
                            </p>
                            <p>
                                <span className="text-slate-500">Số nợ còn lại:</span>{" "}
                                <span className="font-bold text-amber-700">
                                    {formatMoney(selectedDebt.remainingAmountVnd)}
                                </span>
                            </p>
                        </div>

                        {errorMsg && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                        {successMsg && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{successMsg}</p>}

                        <form onSubmit={handlePayDebt} className="space-y-3 text-xs sm:text-sm">
                            <div>
                                <label className="font-semibold text-slate-700">
                                    Số tiền thanh toán lần này (VNĐ)
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="0"
                                    value={payAmount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setPayAmount(raw ? Number(raw).toLocaleString("vi-VN") : "");
                                    }}
                                    className="w-full mt-1 border rounded-xl p-2 font-bold text-slate-900 text-base"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-700">Phương thức</label>
                                    <select
                                        value={payMethod}
                                        onChange={(e) => setPayMethod(e.target.value as "CASH" | "BANK_TRANSFER")}
                                        className="w-full mt-1 border rounded-xl p-2"
                                    >
                                        <option value="CASH">Tiền mặt</option>
                                        <option value="BANK_TRANSFER">Chuyển khoản</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700">Quỹ nhận / xuất tiền</label>
                                    <select
                                        value={payAccountId}
                                        onChange={(e) => setPayAccountId(e.target.value)}
                                        className="w-full mt-1 border rounded-xl p-2"
                                    >
                                        <option value="">-- Mặc định --</option>
                                        {accounts.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Ghi chú thanh toán</label>
                                <input
                                    type="text"
                                    placeholder="Ghi chú đợt thanh toán..."
                                    value={payNote}
                                    onChange={(e) => setPayNote(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setSelectedDebt(null)}
                                    className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPay}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                                >
                                    {isSubmittingPay ? "Đang xử lý..." : "Xác nhận thanh toán"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <MobileBottomNav />
        </div>
    );
}
