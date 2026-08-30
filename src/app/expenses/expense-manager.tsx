"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ExpenseItem {
    id: string;
    description: string;
    amountVnd: number;
    createdAt: string;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface ExpenseManagerProps {
    initialExpenses: ExpenseItem[];
    initialPagination: PaginationInfo;
    canCreateExpense: boolean;
    lakeName: string;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    });
}

const CATEGORIES = [
    "Vật tư & Thiết bị",
    "Tiền điện / Nước",
    "Thực phẩm & Đồ uống",
    "Bảo trì & Sửa chữa",
    "Lương & Thưởng",
    "Chi phí khác",
];

export function ExpenseManager({
    initialExpenses,
    initialPagination,
    canCreateExpense,
    lakeName,
}: ExpenseManagerProps) {
    const router = useRouter();

    const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
    const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
    const [isLoadingPage, setIsLoadingPage] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
    const [amountStr, setAmountStr] = useState("");
    const [description, setDescription] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const numericAmount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;

    async function fetchPage(pageNumber: number) {
        setIsLoadingPage(true);
        try {
            const res = await fetch(`/api/expenses?page=${pageNumber}&limit=${pagination.limit}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data.expenses);
                setPagination(data.pagination);
            }
        } finally {
            setIsLoadingPage(false);
        }
    }

    function openAddModal() {
        setError(null);
        setSuccessMessage(null);
        setAmountStr("");
        setDescription("");
        setSelectedCategory(CATEGORIES[0]);
        setPaymentMethod("CASH");
        setIsModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (numericAmount <= 0) {
            setError("Vui lòng nhập số tiền chi phí hợp lệ lớn hơn 0.");
            return;
        }

        if (!description.trim()) {
            setError("Vui lòng nhập nội dung hoặc lý do chi phí.");
            return;
        }

        setIsSubmitting(true);
        const idempotencyKey = crypto.randomUUID();

        try {
            const res = await fetch("/api/expenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                    amountVnd: numericAmount,
                    description: description.trim(),
                    category: selectedCategory,
                    paymentMethod,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể tạo chi phí.");
                setIsSubmitting(false);
                return;
            }

            setSuccessMessage("Đã ghi nhận chi phí thành công!");
            setIsSubmitting(false);

            // Refresh list
            fetchPage(1);
            router.refresh();

            setTimeout(() => {
                setIsModalOpen(false);
            }, 600);
        } catch {
            setError("Lỗi kết nối mạng khi tạo chi phí. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-md bg-[#F5F2EB] px-4 pb-24 pt-6">
            {/* Header info */}
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-slate-600">
                        {lakeName}
                    </p>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        Chi phí khác
                    </h1>
                </div>

                {canCreateExpense && (
                    <button
                        type="button"
                        onClick={openAddModal}
                        className="h-10 rounded-xl bg-[#9E6B05] px-3.5 text-xs font-bold text-white shadow-sm transition-transform duration-150 ease-out active:scale-95 flex items-center gap-1.5 hover:bg-[#8A5B00]"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                        <span>Thêm chi phí</span>
                    </button>
                )}
            </div>

            {/* Small Success Notice */}
            {successMessage && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 animate-in fade-in duration-150">
                    {successMessage}
                </div>
            )}

            {/* Expenses List */}
            <div className="space-y-2.5 mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                    <span>Danh sách chi gần đây</span>
                    <span>Tổng: {pagination.total} khoản chi</span>
                </div>

                {expenses.length === 0 ? (
                    <div className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center text-xs text-slate-400">
                        Chưa có khoản chi phí nào được ghi nhận.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {expenses.map((expense) => (
                            <div
                                key={expense.id}
                                className="rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm flex items-center justify-between gap-3"
                            >
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-900 line-clamp-2">
                                        {expense.description}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {formatDateTime(expense.createdAt)}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-red-600">
                                        -{formatVnd(expense.amountVnd)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 text-xs">
                        <button
                            type="button"
                            disabled={pagination.page <= 1 || isLoadingPage}
                            onClick={() => fetchPage(pagination.page - 1)}
                            className="h-9 px-3 rounded-lg border border-[#EAE4D7] bg-white font-semibold text-slate-700 disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            Trang trước
                        </button>
                        <span className="text-slate-500 font-medium">
                            Trang {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={
                                pagination.page >= pagination.totalPages ||
                                isLoadingPage
                            }
                            onClick={() => fetchPage(pagination.page + 1)}
                            className="h-9 px-3 rounded-lg border border-[#EAE4D7] bg-white font-semibold text-slate-700 disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            Trang sau
                        </button>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAE2CE]">
                                    <svg
                                        className="h-4 w-4 text-[#9E6B05]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Thêm chi phí
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-[#F7F4EE]"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Error notice */}
                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Category Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">
                                    Hạng mục chi:
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {CATEGORIES.map((cat) => {
                                        const isSelected = selectedCategory === cat;
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                                    isSelected
                                                        ? "bg-[#9E6B05] text-white shadow-sm"
                                                        : "bg-[#F7F4EE] text-slate-700 border border-[#EAE4D7] hover:border-[#9E6B05]"
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">
                                    Phương thức chi:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("CASH")}
                                        className={`h-9 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                            paymentMethod === "CASH"
                                                ? "border-[#9E6B05] bg-[#F7F4EE] text-[#9E6B05] ring-1 ring-[#9E6B05]"
                                                : "border-[#EAE4D7] bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        <span>Tiền mặt</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                        className={`h-9 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                            paymentMethod === "BANK_TRANSFER"
                                                ? "border-[#9E6B05] bg-[#F7F4EE] text-[#9E6B05] ring-1 ring-[#9E6B05]"
                                                : "border-[#EAE4D7] bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        <span>Chuyển khoản</span>
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Số tiền (VNĐ): <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    required
                                    placeholder="Ví dụ: 150000"
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-[#EAE4D7] px-3 text-sm font-bold text-slate-900 focus:border-[#9E6B05] focus:outline-none"
                                />
                                {numericAmount > 0 && (
                                    <p className="text-right text-xs font-bold text-[#9E6B05]">
                                        {formatVnd(numericAmount)}
                                    </p>
                                )}
                            </div>

                            {/* Description Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Nội dung chi tiết: <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    required
                                    maxLength={200}
                                    placeholder="Ghi rõ lý do chi tiền..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-xl border border-[#EAE4D7] p-2.5 text-xs text-slate-900 focus:border-[#9E6B05] focus:outline-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-11 flex-1 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-slate-700 shadow-sm transition-all duration-150 ease-out active:scale-95 disabled:opacity-60"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || numericAmount <= 0}
                                    className="h-11 flex-[2] rounded-xl bg-[#9E6B05] text-xs font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60"
                                >
                                    {isSubmitting ? "Đang lưu…" : "Xác nhận thêm"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
