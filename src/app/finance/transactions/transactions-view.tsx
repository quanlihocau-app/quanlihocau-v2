"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { FinanceNav } from "@/components/finance/finance-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

type Category = { id: string; name: string; type: "IN" | "OUT"; color: string | null; icon: string | null };
type Account = { id: string; name: string; accountType: "CASH" | "BANK" | "WALLET" };
type Transaction = { id: string; code: string; type: "RECEIPT" | "EXPENSE"; amountVnd: number; paymentMethod: "CASH" | "BANK_TRANSFER"; transactionDate: string; description: string; payerOrReceiver: string | null; supplierName: string | null; note: string | null; status: string; cancelledReason?: string | null; category?: Category | null; account?: Account | null; customer?: { name: string; phoneNormalized: string | null } | null; createdBy?: { name: string | null } | null };
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const formatMoney = (v: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

const todayStr = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

export function TransactionsView({
    lakeId,
    lakeName,
}: {
    lakeId: string;
    lakeName: string;
}) {
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [typeFilter, setTypeFilter] = useState<string>(
        searchParams.get("action") === "expense" ? "EXPENSE" : searchParams.get("type") || "",
    );
    const [from, setFrom] = useState(todayStr());
    const [to, setTo] = useState(todayStr());
    const [q, setQ] = useState("");
    const [page] = useState(1);

    // Modal tạo phiếu
    const [isCreateOpen, setIsCreateOpen] = useState(Boolean(searchParams.get("action")));
    const [formType, setFormType] = useState<"RECEIPT" | "EXPENSE">(
        searchParams.get("action") === "expense" ? "EXPENSE" : "RECEIPT",
    );
    const [amountVnd, setAmountVnd] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
    const [categoryId, setCategoryId] = useState("");
    const [accountId, setAccountId] = useState("");
    const [payerOrReceiver, setPayerOrReceiver] = useState("");
    const [description, setDescription] = useState("");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const idempotencyKeyRef = useRef(crypto.randomUUID());

    // Modal chi tiết / Hủy
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);

    // Load danh sách giao dịch
    const queryUrl = `/api/finance/transactions?from=${from}&to=${to}&page=${page}${
        typeFilter ? `&type=${typeFilter}` : ""
    }${q ? `&q=${encodeURIComponent(q)}` : ""}`;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["finance-transactions", lakeId, queryUrl],
        queryFn: async () => {
            const res = await fetch(queryUrl, { cache: "no-store" });
            if (!res.ok) throw new Error("Không thể tải danh sách phiếu.");
            return res.json();
        },
        staleTime: 10000,
    });

    // Load danh mục và quỹ cho dropdown form
    const { data: catData } = useQuery({
        queryKey: ["finance-categories", lakeId],
        queryFn: async () => {
            const res = await fetch(`/api/finance/categories?activeOnly=true`);
            return res.json();
        },
    });

    const { data: accData } = useQuery({
        queryKey: ["finance-accounts", lakeId],
        queryFn: async () => {
            const res = await fetch(`/api/finance/accounts`);
            return res.json();
        },
    });

    const categories: Category[] = catData?.categories || [];
    const accounts: Account[] = accData?.accounts || [];

    const availableCategories = categories.filter((c) =>
        formType === "RECEIPT" ? c.type === "IN" : c.type === "OUT",
    );

    function openCreate(type: "RECEIPT" | "EXPENSE") {
        setFormType(type);
        setAmountVnd("");
        setDescription("");
        setPayerOrReceiver("");
        setNote("");
        setFormError("");
        setFormSuccess("");
        idempotencyKeyRef.current = crypto.randomUUID();
        setIsCreateOpen(true);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        const numAmount = parseInt(amountVnd.replace(/\D/g, ""), 10);
        if (!numAmount || numAmount <= 0) {
            setFormError("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
            return;
        }
        if (!description.trim()) {
            setFormError("Vui lòng nhập nội dung giao dịch.");
            return;
        }

        setIsSubmitting(true);
        setFormError("");
        setFormSuccess("");

        try {
            const res = await fetch("/api/finance/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKeyRef.current,
                },
                body: JSON.stringify({
                    type: formType,
                    amountVnd: numAmount,
                    paymentMethod,
                    categoryId: categoryId || null,
                    accountId: accountId || null,
                    payerOrReceiver: payerOrReceiver.trim() || null,
                    description: description.trim(),
                    note: note.trim() || null,
                    status: "APPROVED",
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || "Lỗi khi tạo phiếu.");
            }

            setFormSuccess(json.message);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["finance-transactions", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-overview", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-accounts", lakeId] }),
            ]);

            setTimeout(() => {
                setIsCreateOpen(false);
            }, 800);
        } catch (err: unknown) {
            setFormError(errorMessage(err, "Đã xảy ra lỗi."));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCancelTransaction(txId: string) {
        if (!cancelReason.trim()) {
            alert("Vui lòng nhập lý do hủy phiếu.");
            return;
        }
        setIsCancelling(true);
        try {
            const res = await fetch(`/api/finance/transactions/${txId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: cancelReason.trim() }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Không thể hủy phiếu.");

            alert("Đã hủy phiếu thành công. Số dư và báo cáo đã được đảo ngược an toàn.");
            setSelectedTx(null);
            setCancelReason("");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["finance-transactions", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-overview", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-accounts", lakeId] }),
            ]);
        } catch (err: unknown) {
            alert(errorMessage(err, "Lỗi khi hủy phiếu."));
        } finally {
            setIsCancelling(false);
        }
    }

    const transactions: Transaction[] = data?.transactions || [];
    const summary = data?.summary || { totalReceiptsVnd: 0, totalExpensesVnd: 0, netCashFlowVnd: 0 };

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
                            Quản lý Phiếu thu & Phiếu chi
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openCreate("RECEIPT")}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                            <span>＋</span> Lập phiếu thu
                        </button>
                        <button
                            onClick={() => openCreate("EXPENSE")}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-xs hover:bg-red-50"
                        >
                            <span>－</span> Lập phiếu chi
                        </button>
                    </div>
                </div>
            </header>

            <FinanceNav />

            <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
                {/* Thanh tóm tắt nhanh */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <span className="text-xs font-bold uppercase text-emerald-800">Tổng thu trong kỳ</span>
                        <p className="mt-1 text-xl font-extrabold text-emerald-900">
                            {formatMoney(summary.totalReceiptsVnd)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
                        <span className="text-xs font-bold uppercase text-red-800">Tổng chi trong kỳ</span>
                        <p className="mt-1 text-xl font-extrabold text-red-900">
                            {formatMoney(summary.totalExpensesVnd)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <span className="text-xs font-bold uppercase text-slate-600">Dòng tiền thuần</span>
                        <p
                            className={`mt-1 text-xl font-extrabold ${
                                summary.netCashFlowVnd >= 0 ? "text-emerald-700" : "text-red-700"
                            }`}
                        >
                            {formatMoney(summary.netCashFlowVnd)}
                        </p>
                    </div>
                </div>

                {/* Bộ lọc */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Tab phân loại */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                            <button
                                onClick={() => setTypeFilter("")}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    typeFilter === ""
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Tất cả phiếu
                            </button>
                            <button
                                onClick={() => setTypeFilter("RECEIPT")}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    typeFilter === "RECEIPT"
                                        ? "bg-white text-emerald-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Phiếu thu
                            </button>
                            <button
                                onClick={() => setTypeFilter("EXPENSE")}
                                className={`rounded-md px-3 py-1.5 transition-all ${
                                    typeFilter === "EXPENSE"
                                        ? "bg-white text-red-700 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Phiếu chi
                            </button>
                        </div>

                        {/* Xuất file */}
                        <a
                            href={`${queryUrl}&export=csv`}
                            download
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <span>📥</span> Xuất Excel / CSV
                        </a>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <input
                            type="text"
                            placeholder="Tìm kiếm mã phiếu, nội dung, đối tác..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
                        />
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Từ:</span>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Đến:</span>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-hidden"
                            />
                        </div>
                        <button
                            onClick={() => void refetch()}
                            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                        >
                            Lọc dữ liệu
                        </button>
                    </div>
                </div>

                {/* Danh sách phiếu */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    {isLoading ? (
                        <div className="p-8 text-center text-sm text-slate-400">Đang tải danh sách phiếu...</div>
                    ) : transactions.length === 0 ? (
                        <div className="p-12 text-center text-sm text-slate-400">
                            Không có phiếu giao dịch nào trong khoảng thời gian đã chọn.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Mã phiếu</th>
                                        <th className="px-4 py-3">Ngày giờ</th>
                                        <th className="px-4 py-3">Nội dung</th>
                                        <th className="px-4 py-3">Danh mục</th>
                                        <th className="px-4 py-3">Quỹ nhận/chi</th>
                                        <th className="px-4 py-3 text-right">Số tiền</th>
                                        <th className="px-4 py-3 text-center">Trạng thái</th>
                                        <th className="px-4 py-3 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map((tx) => {
                                        const isReceipt = tx.type === "RECEIPT";
                                        const isCancelled = tx.status === "CANCELLED";
                                        return (
                                            <tr
                                                key={tx.id}
                                                className={`hover:bg-slate-50/80 transition-colors ${
                                                    isCancelled ? "opacity-60 bg-slate-50/50" : ""
                                                }`}
                                            >
                                                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                                    {tx.code}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {new Date(tx.transactionDate).toLocaleString("vi-VN", {
                                                        timeZone: "Asia/Ho_Chi_Minh",
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">
                                                    <p>{tx.description}</p>
                                                    {tx.payerOrReceiver && (
                                                        <p className="text-[11px] text-slate-400">
                                                            Đối tác: {tx.payerOrReceiver}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                                                        style={{
                                                            backgroundColor: `${tx.category?.color || "#64748b"}15`,
                                                            color: tx.category?.color || "#64748b",
                                                        }}
                                                    >
                                                        {tx.category?.name || "Khác"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {tx.account?.name || (tx.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản")}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right font-bold ${
                                                        isReceipt ? "text-emerald-600" : "text-red-600"
                                                    }`}
                                                >
                                                    {isReceipt ? "+" : "-"}
                                                    {formatMoney(tx.amountVnd)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isCancelled ? (
                                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                            ĐÃ HỦY
                                                        </span>
                                                    ) : tx.status === "DRAFT" ? (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                            NHÁP
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                            HOÀN TẤT
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setSelectedTx(tx)}
                                                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Chi tiết
                                                    </button>
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

            {/* Modal Lập phiếu thu / chi */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">
                                {formType === "RECEIPT" ? "🟢 Lập Phiếu Thu Mới" : "🔴 Lập Phiếu Chi Mới"}
                            </h3>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {formError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-semibold">
                                {formError}
                            </div>
                        )}
                        {formSuccess && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-semibold">
                                {formSuccess}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-3 text-xs sm:text-sm">
                            <div>
                                <label className="block font-semibold text-slate-700">
                                    Số tiền (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: 500.000"
                                    value={amountVnd}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setAmountVnd(raw ? Number(raw).toLocaleString("vi-VN") : "");
                                    }}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700">Phương thức thanh toán</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "BANK_TRANSFER")}
                                        className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="CASH">Tiền mặt</option>
                                        <option value="BANK_TRANSFER">Chuyển khoản</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700">Quỹ nhận / chi tiền</label>
                                    <select
                                        value={accountId}
                                        onChange={(e) => setAccountId(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="">-- Mặc định --</option>
                                        {accounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">Danh mục khoản thu/chi</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {availableCategories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">
                                    {formType === "RECEIPT" ? "Người nộp tiền (Khách hàng)" : "Người nhận tiền (Nhà cung cấp)"}
                                </label>
                                <input
                                    type="text"
                                    placeholder="Tên khách hàng, đại lý, shipper..."
                                    value={payerOrReceiver}
                                    onChange={(e) => setPayerOrReceiver(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">
                                    Nội dung chi tiết <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Mua 10 bao thức ăn cho cá chép..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700">Ghi chú thêm</label>
                                <textarea
                                    rows={2}
                                    placeholder="Số hóa đơn đỏ, thông tin đối soát..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`rounded-xl px-5 py-2 font-bold text-white shadow-xs ${
                                        formType === "RECEIPT"
                                            ? "bg-emerald-600 hover:bg-emerald-700"
                                            : "bg-red-600 hover:bg-red-700"
                                    }`}
                                >
                                    {isSubmitting ? "Đang lưu..." : "Xác nhận tạo phiếu"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết & Hủy phiếu */}
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <span className="font-mono text-xs font-bold text-slate-400">
                                    MÃ PHIẾU: {selectedTx.code}
                                </span>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {selectedTx.type === "RECEIPT" ? "Phiếu Thu Tiền" : "Phiếu Chi Tiền"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="text-slate-400 hover:text-slate-600 text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                            <div className="py-2 flex justify-between">
                                <span className="text-slate-500">Số tiền:</span>
                                <span
                                    className={`font-bold text-base ${
                                        selectedTx.type === "RECEIPT" ? "text-emerald-600" : "text-red-600"
                                    }`}
                                >
                                    {formatMoney(selectedTx.amountVnd)}
                                </span>
                            </div>
                            <div className="py-2 flex justify-between">
                                <span className="text-slate-500">Nội dung:</span>
                                <span className="font-semibold text-slate-800 text-right">{selectedTx.description}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                                <span className="text-slate-500">Danh mục:</span>
                                <span>{selectedTx.category?.name || "Khác"}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                                <span className="text-slate-500">Quỹ thanh toán:</span>
                                <span>{selectedTx.account?.name || (selectedTx.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản")}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                                <span className="text-slate-500">Đối tác / Khách hàng:</span>
                                <span>{selectedTx.payerOrReceiver || "Không có"}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                                <span className="text-slate-500">Ngày giao dịch:</span>
                                <span>{new Date(selectedTx.transactionDate).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                                <span className="text-slate-500">Trạng thái:</span>
                                <span className="font-bold">{selectedTx.status}</span>
                            </div>
                            {selectedTx.cancelledReason && (
                                <div className="py-2 bg-red-50 p-2 rounded-lg text-red-700">
                                    <p className="font-bold">Lý do hủy:</p>
                                    <p>{selectedTx.cancelledReason}</p>
                                </div>
                            )}
                        </div>

                        {selectedTx.status !== "CANCELLED" && (
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                <p className="text-xs font-bold text-red-700">Quy trình Hủy phiếu & Hoàn trả dòng tiền:</p>
                                <input
                                    type="text"
                                    placeholder="Nhập lý do hủy phiếu (bắt buộc)..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="w-full rounded-xl border border-red-200 p-2 text-xs focus:border-red-500 focus:outline-hidden"
                                />
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        onClick={() => setSelectedTx(null)}
                                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        disabled={isCancelling}
                                        onClick={() => handleCancelTransaction(selectedTx.id)}
                                        className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                                    >
                                        {isCancelling ? "Đang hủy..." : "Xác nhận Hủy phiếu"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <MobileBottomNav />
        </div>
    );
}
