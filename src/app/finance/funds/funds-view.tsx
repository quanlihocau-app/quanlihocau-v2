"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FinanceNav } from "@/components/finance/finance-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

type Account = { id: string; name: string; accountType: "CASH" | "BANK" | "WALLET"; accountNumber?: string | null; bankName?: string | null; initialBalanceVnd: number; currentBalanceVnd: number; totalInVnd: number; totalOutVnd: number; isDefault?: boolean };
type Transfer = { id: string; code: string; amountVnd: number; feeAmountVnd: number; transferredAt: string; fromAccount: { name: string }; toAccount: { name: string }; note?: string | null };
type Reconciliation = { id: string; checkedAt: string; systemBalanceVnd: number; actualBalanceVnd: number; differenceVnd: number; checkedByName: string; account: { name: string }; reason?: string | null };
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const formatMoney = (v: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

export function FundsView({
    lakeId,
    lakeName,
}: {
    lakeId: string;
    lakeName: string;
}) {
    const queryClient = useQueryClient();

    // Modal tạo quỹ
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [name, setName] = useState("");
    const [accountType, setAccountType] = useState<"CASH" | "BANK" | "WALLET">("CASH");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [initialBalance, setInitialBalance] = useState("");
    const [isSubmittingAcc, setIsSubmittingAcc] = useState(false);

    // Modal Chuyển quỹ
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [fromAccId, setFromAccId] = useState("");
    const [toAccId, setToAccId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferNote, setTransferNote] = useState("");
    const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

    // Modal Kiểm kê & Đối soát
    const [isReconcileOpen, setIsReconcileOpen] = useState(false);
    const [reconcileAccId, setReconcileAccId] = useState("");
    const [actualCountedAmount, setActualCountedAmount] = useState("");
    const [reconcileReason, setReconcileReason] = useState("");
    const [isSubmittingReconcile, setIsSubmittingReconcile] = useState(false);

    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Load danh sách quỹ
    const { data: accountsData, isLoading: loadingAccounts } = useQuery({
        queryKey: ["finance-accounts", lakeId],
        queryFn: async () => {
            const res = await fetch(`/api/finance/accounts`);
            if (!res.ok) throw new Error("Không thể tải danh sách quỹ.");
            return res.json();
        },
    });

    // Load lịch sử chuyển quỹ
    const { data: transferData } = useQuery({
        queryKey: ["finance-transfers", lakeId],
        queryFn: async () => {
            const res = await fetch(`/api/finance/transfers`);
            return res.json();
        },
    });

    // Load lịch sử kiểm kê
    const { data: reconcileData } = useQuery({
        queryKey: ["finance-reconcile", lakeId],
        queryFn: async () => {
            const res = await fetch(`/api/finance/reconcile`);
            return res.json();
        },
    });

    const accounts: Account[] = accountsData?.accounts || [];
    const totalBalance = accountsData?.totalFundBalanceVnd || 0;
    const transfers: Transfer[] = transferData?.transfers || [];
    const reconciliations: Reconciliation[] = reconcileData?.records || [];

    // Tạo quỹ mới
    async function handleCreateAccount(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmittingAcc(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const initBal = parseInt(initialBalance.replace(/\D/g, ""), 10) || 0;
            const res = await fetch("/api/finance/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    accountType,
                    bankName: bankName.trim() || undefined,
                    accountNumber: accountNumber.trim() || undefined,
                    initialBalanceVnd: initBal,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Lỗi tạo quỹ.");

            setSuccessMsg("Đã tạo quỹ thành công.");
            setName("");
            setInitialBalance("");
            setBankName("");
            setAccountNumber("");
            await queryClient.invalidateQueries({ queryKey: ["finance-accounts", lakeId] });
            setTimeout(() => setIsCreateOpen(false), 800);
        } catch (err: unknown) {
            setErrorMsg(errorMessage(err, "Có lỗi xảy ra."));
        } finally {
            setIsSubmittingAcc(false);
        }
    }

    // Chuyển quỹ nội bộ
    async function handleTransfer(e: React.FormEvent) {
        e.preventDefault();
        const numAmount = parseInt(transferAmount.replace(/\D/g, ""), 10);
        if (!numAmount || numAmount <= 0) {
            setErrorMsg("Vui lòng nhập số tiền hợp lệ.");
            return;
        }
        if (fromAccId === toAccId) {
            setErrorMsg("Quỹ nguồn và quỹ đích không được trùng nhau.");
            return;
        }
        setIsSubmittingTransfer(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await fetch("/api/finance/transfers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromAccountId: fromAccId,
                    toAccountId: toAccId,
                    amountVnd: numAmount,
                    note: transferNote.trim() || undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Lỗi chuyển quỹ.");

            setSuccessMsg(json.message);
            setTransferAmount("");
            setTransferNote("");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["finance-accounts", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-transfers", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-overview", lakeId] }),
            ]);
            setTimeout(() => setIsTransferOpen(false), 800);
        } catch (err: unknown) {
            setErrorMsg(errorMessage(err, "Có lỗi xảy ra."));
        } finally {
            setIsSubmittingTransfer(false);
        }
    }

    // Kiểm kê đối soát quỹ
    async function handleReconcile(e: React.FormEvent) {
        e.preventDefault();
        const numAmount = parseInt(actualCountedAmount.replace(/\D/g, ""), 10);
        if (isNaN(numAmount) || !reconcileAccId) {
            setErrorMsg("Vui lòng nhập số tiền thực tế hợp lệ.");
            return;
        }
        setIsSubmittingReconcile(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await fetch("/api/finance/reconcile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: reconcileAccId,
                    actualBalanceVnd: numAmount,
                    reason: reconcileReason.trim() || undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Lỗi kiểm kê quỹ.");

            setSuccessMsg("Đã lưu kết quả kiểm kê đối soát quỹ.");
            setActualCountedAmount("");
            setReconcileReason("");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["finance-accounts", lakeId] }),
                queryClient.invalidateQueries({ queryKey: ["finance-reconcile", lakeId] }),
            ]);
            setTimeout(() => setIsReconcileOpen(false), 800);
        } catch (err: unknown) {
            setErrorMsg(errorMessage(err, "Có lỗi xảy ra."));
        } finally {
            setIsSubmittingReconcile(false);
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
                            Quản lý Sổ quỹ & Tài khoản tiền
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setErrorMsg("");
                                setSuccessMsg("");
                                setIsTransferOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-xs hover:bg-slate-50"
                        >
                            <span>⇄</span> Chuyển quỹ nội bộ
                        </button>
                        <button
                            onClick={() => {
                                setErrorMsg("");
                                setSuccessMsg("");
                                setIsReconcileOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-xs hover:bg-slate-50"
                        >
                            <span>⚖️</span> Kiểm kê đối soát
                        </button>
                        <button
                            onClick={() => {
                                setErrorMsg("");
                                setSuccessMsg("");
                                setIsCreateOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                            <span>＋</span> Thêm quỹ mới
                        </button>
                    </div>
                </div>
            </header>

            <FinanceNav />

            <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
                {/* Tổng số dư */}
                <div className="rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-md">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                        Tổng số dư khả dụng thực tế trên toàn hệ thống
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                        {formatMoney(totalBalance)}
                    </p>
                    <p className="mt-2 text-xs text-emerald-100">
                        Bao gồm tất cả các quỹ tiền mặt tại quầy, tài khoản ngân hàng và ví điện tử đang hoạt động.
                    </p>
                </div>

                {/* Danh sách thẻ Quỹ */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-slate-900">Danh sách các Quỹ & Tài khoản</h2>
                    {loadingAccounts ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-44 animate-pulse rounded-2xl bg-white border border-slate-200 p-5" />
                            ))}
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                            Chưa có tài khoản quỹ nào được tạo.
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {accounts.map((acc) => (
                                <div
                                    key={acc.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
                                                {acc.accountType === "BANK" ? "🏦" : acc.accountType === "WALLET" ? "📱" : "💵"}
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{acc.name}</h3>
                                                <p className="text-[11px] text-slate-400">
                                                    {acc.accountType === "BANK"
                                                        ? `${acc.bankName || "Ngân hàng"} • ${acc.accountNumber || "STK"}`
                                                        : "Quỹ tiền mặt quầy"}
                                                </p>
                                            </div>
                                        </div>
                                        {acc.isDefault && (
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                Mặc định
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Số dư đầu kỳ:</span>
                                            <span>{formatMoney(acc.initialBalanceVnd)}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600">
                                            <span>Tổng thu vào:</span>
                                            <span>+{formatMoney(acc.totalInVnd)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                            <span>Tổng chi ra:</span>
                                            <span>-{formatMoney(acc.totalOutVnd)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 text-sm">
                                            <span>Số dư hiện tại:</span>
                                            <span className="text-emerald-700 font-extrabold">
                                                {formatMoney(acc.currentBalanceVnd)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bảng Lịch sử chuyển quỹ & kiểm kê */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Chuyển quỹ gần đây */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Lịch sử chuyển quỹ nội bộ</h3>
                            <span className="text-xs text-slate-400">Gần nhất</span>
                        </div>
                        <div className="mt-3 divide-y divide-slate-100 text-xs">
                            {transfers.length === 0 ? (
                                <p className="py-6 text-center text-slate-400">Chưa phát sinh giao dịch chuyển quỹ.</p>
                            ) : (
                                transfers.slice(0, 5).map((t) => (
                                    <div key={t.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <span className="font-mono font-bold text-slate-800">{t.code}</span>
                                            <p className="text-slate-500">
                                                {t.fromAccount?.name} → {t.toAccount?.name}
                                            </p>
                                            {t.note && <p className="text-slate-400 text-[11px]">{t.note}</p>}
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-slate-900">{formatMoney(t.amountVnd)}</span>
                                            <p className="text-slate-400 text-[10px]">
                                                {new Date(t.transferredAt).toLocaleString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Kiểm kê & Đối soát gần đây */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Lịch sử kiểm kê đối soát</h3>
                            <span className="text-xs text-slate-400">Gần nhất</span>
                        </div>
                        <div className="mt-3 divide-y divide-slate-100 text-xs">
                            {reconciliations.length === 0 ? (
                                <p className="py-6 text-center text-slate-400">Chưa có bản ghi kiểm kê đối soát nào.</p>
                            ) : (
                                reconciliations.slice(0, 5).map((r) => (
                                    <div key={r.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <span className="font-bold text-slate-800">{r.account?.name}</span>
                                            <p className="text-slate-500">
                                                Sổ sách: {formatMoney(r.systemBalanceVnd)} | Thực tế:{" "}
                                                {formatMoney(r.actualBalanceVnd)}
                                            </p>
                                            {r.reason && <p className="text-slate-400 text-[11px]">{r.reason}</p>}
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`font-bold ${
                                                    r.differenceVnd === 0
                                                        ? "text-emerald-600"
                                                        : r.differenceVnd > 0
                                                        ? "text-blue-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                {r.differenceVnd === 0
                                                    ? "Khớp 0 đ"
                                                    : `${r.differenceVnd > 0 ? "Thừa" : "Thiếu"} ${formatMoney(
                                                          Math.abs(r.differenceVnd),
                                                      )}`}
                                            </span>
                                            <p className="text-slate-400 text-[10px]">
                                                {new Date(r.checkedAt).toLocaleDateString("vi-VN")}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Thêm quỹ mới */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-base text-slate-900">Thêm Quỹ / Tài Khoản Tiền Mới</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-slate-400">
                                ✕
                            </button>
                        </div>
                        {errorMsg && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                        {successMsg && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{successMsg}</p>}
                        <form onSubmit={handleCreateAccount} className="space-y-3 text-xs sm:text-sm">
                            <div>
                                <label className="font-semibold text-slate-700">Tên quỹ</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Két sắt quầy, Vietcombank chính..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Loại quỹ</label>
                                <select
                                    value={accountType}
                                    onChange={(e) => setAccountType(e.target.value as "CASH" | "BANK" | "WALLET")}
                                    className="w-full mt-1 border rounded-xl p-2"
                                >
                                    <option value="CASH">Quỹ tiền mặt</option>
                                    <option value="BANK">Tài khoản ngân hàng</option>
                                    <option value="WALLET">Ví điện tử (Momo/ZaloPay)</option>
                                </select>
                            </div>
                            {accountType === "BANK" && (
                                <>
                                    <div>
                                        <label className="font-semibold text-slate-700">Tên ngân hàng</label>
                                        <input
                                            type="text"
                                            placeholder="Vietcombank, MB Bank, Techcombank..."
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="w-full mt-1 border rounded-xl p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700">Số tài khoản</label>
                                        <input
                                            type="text"
                                            placeholder="Số tài khoản..."
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            className="w-full mt-1 border rounded-xl p-2"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="font-semibold text-slate-700">Số dư ban đầu (VNĐ)</label>
                                <input
                                    type="text"
                                    placeholder="0"
                                    value={initialBalance}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setInitialBalance(raw ? Number(raw).toLocaleString("vi-VN") : "");
                                    }}
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
                                    disabled={isSubmittingAcc}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                                >
                                    {isSubmittingAcc ? "Đang lưu..." : "Tạo quỹ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Chuyển quỹ nội bộ */}
            {isTransferOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-base text-slate-900">Chuyển Tiền Giữa Các Quỹ (Nội Bộ)</h3>
                            <button onClick={() => setIsTransferOpen(false)} className="text-slate-400">
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            * Giao dịch chuyển tiền nội bộ không được tính thành doanh thu hoặc chi phí.
                        </p>
                        {errorMsg && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                        {successMsg && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{successMsg}</p>}
                        <form onSubmit={handleTransfer} className="space-y-3 text-xs sm:text-sm">
                            <div>
                                <label className="font-semibold text-slate-700">Tài khoản nguồn (Rút ra)</label>
                                <select
                                    required
                                    value={fromAccId}
                                    onChange={(e) => setFromAccId(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                >
                                    <option value="">-- Chọn quỹ nguồn --</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} (Khả dụng: {formatMoney(a.currentBalanceVnd)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Tài khoản đích (Chuyển vào)</label>
                                <select
                                    required
                                    value={toAccId}
                                    onChange={(e) => setToAccId(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                >
                                    <option value="">-- Chọn quỹ đích --</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} (Khả dụng: {formatMoney(a.currentBalanceVnd)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Số tiền chuyển (VNĐ)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="0"
                                    value={transferAmount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setTransferAmount(raw ? Number(raw).toLocaleString("vi-VN") : "");
                                    }}
                                    className="w-full mt-1 border rounded-xl p-2 font-bold text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Ghi chú chuyển quỹ</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Nộp tiền mặt trong ngày vào Vietcombank..."
                                    value={transferNote}
                                    onChange={(e) => setTransferNote(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsTransferOpen(false)}
                                    className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingTransfer}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                                >
                                    {isSubmittingTransfer ? "Đang xử lý..." : "Xác nhận chuyển quỹ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Kiểm kê & Đối soát */}
            {isReconcileOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-base text-slate-900">Kiểm Kê & Đối Soát Quỹ</h3>
                            <button onClick={() => setIsReconcileOpen(false)} className="text-slate-400">
                                ✕
                            </button>
                        </div>
                        {errorMsg && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                        {successMsg && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{successMsg}</p>}
                        <form onSubmit={handleReconcile} className="space-y-3 text-xs sm:text-sm">
                            <div>
                                <label className="font-semibold text-slate-700">Quỹ cần kiểm kê</label>
                                <select
                                    required
                                    value={reconcileAccId}
                                    onChange={(e) => setReconcileAccId(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                >
                                    <option value="">-- Chọn quỹ kiểm kê --</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} (Sổ sách: {formatMoney(a.currentBalanceVnd)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Số tiền đếm thực tế (VNĐ)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="0"
                                    value={actualCountedAmount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setActualCountedAmount(raw ? Number(raw).toLocaleString("vi-VN") : "");
                                    }}
                                    className="w-full mt-1 border rounded-xl p-2 font-bold text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Lý do chênh lệch (nếu có)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Giải trình chênh lệch thừa/thiếu tiền..."
                                    value={reconcileReason}
                                    onChange={(e) => setReconcileReason(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsReconcileOpen(false)}
                                    className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReconcile}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                                >
                                    {isSubmittingReconcile ? "Đang lưu..." : "Lưu đối soát"}
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
