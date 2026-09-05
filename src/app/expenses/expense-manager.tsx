"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";

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

            setSuccessMessage("Đã tạo chi phí thành công!");
            setIsSubmitting(false);

            setTimeout(() => {
                setIsModalOpen(false);
                router.refresh();
                fetchPage(1);
            }, 800);
        } catch {
            setError("Lỗi kết nối mạng khi tạo chi phí.");
            setIsSubmitting(false);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-4xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6">
            {/* Header */}
            <PageHeader
                title="Quản lý chi phí khác"
                subtitle={`Hồ: ${lakeName}`}
                backHref="/settings"
                backLabel="Quay lại Cài đặt"
                action={
                    canCreateExpense ? (
                        <Button
                            type="button"
                            size="lg"
                            variant="primary"
                            onClick={openAddModal}
                            icon={
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            }
                        >
                            Thêm chi phí
                        </Button>
                    ) : undefined
                }
            />

            {/* Success message */}
            {successMessage && (
                <div className="mb-4">
                    <InlineAlert type="success" message={successMessage} />
                </div>
            )}

            {/* Expenses Content */}
            <div className="space-y-4">
                {expenses.length === 0 ? (
                    <Card className="p-8 text-center text-xs text-slate-500 font-medium">
                        Chưa có khoản chi phí nào được ghi nhận.
                    </Card>
                ) : (
                    <>
                        {/* Mobile View: Cards */}
                        <div className="grid grid-cols-1 gap-2.5 md:hidden">
                            {expenses.map((item) => (
                                <Card key={item.id} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-bold text-slate-900 leading-snug">
                                            {item.description}
                                        </p>
                                        <span className="text-sm font-extrabold text-red-600 tabular-nums shrink-0">
                                            -{formatVnd(item.amountVnd)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-[#E2DDD2] pt-2">
                                        <span>{formatDateTime(item.createdAt)}</span>
                                        <span className="font-mono text-[10px]">#{item.id.slice(0, 8)}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden overflow-hidden rounded-2xl border border-[#E2DDD2] bg-white shadow-2xs md:block">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3.5">Mã</th>
                                        <th className="px-4 py-3.5">Nội dung chi</th>
                                        <th className="px-4 py-3.5 text-right">Số tiền</th>
                                        <th className="px-4 py-3.5">Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2DDD2]">
                                    {expenses.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                                            <td className="px-4 py-3.5 font-mono text-slate-400">
                                                #{item.id.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-slate-900">
                                                {item.description}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-extrabold text-red-600 tabular-nums text-sm">
                                                -{formatVnd(item.amountVnd)}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-medium">
                                                {formatDateTime(item.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pagination.page <= 1 || isLoadingPage}
                            onClick={() => fetchPage(pagination.page - 1)}
                        >
                            Trang trước
                        </Button>
                        <span className="text-xs font-bold text-slate-600">
                            Trang {pagination.page} / {pagination.totalPages}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pagination.page >= pagination.totalPages || isLoadingPage}
                            onClick={() => fetchPage(pagination.page + 1)}
                        >
                            Trang sau
                        </Button>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#102A43]/10 text-[#102A43]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#102A43]">
                                    Thêm chi phí khác
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-[#F8F6F0]"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Error notice */}
                        {error && (
                            <InlineAlert type="error" message={error} />
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Category Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                                    isSelected
                                                        ? "bg-[#102A43] text-white shadow-2xs"
                                                        : "bg-[#F8F6F0] text-slate-700 border border-[#E2DDD2] hover:border-[#102A43]"
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
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Phương thức chi:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("CASH")}
                                        className={`h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            paymentMethod === "CASH"
                                                ? "border-[#102A43] bg-[#102A43] text-white shadow-2xs"
                                                : "border-[#E2DDD2] bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        <span>💵 Tiền mặt</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                        className={`h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            paymentMethod === "BANK_TRANSFER"
                                                ? "border-[#102A43] bg-[#102A43] text-white shadow-2xs"
                                                : "border-[#E2DDD2] bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        <span>🏦 Chuyển khoản</span>
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <Input
                                label="Số tiền (VNĐ) *"
                                type="number"
                                min={1}
                                step={1}
                                required
                                placeholder="Ví dụ: 150000"
                                value={amountStr}
                                onChange={(e) => setAmountStr(e.target.value)}
                                helperText={numericAmount > 0 ? `Định dạng: ${formatVnd(numericAmount)}` : undefined}
                            />

                            {/* Description Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Nội dung chi tiết *
                                </label>
                                <textarea
                                    rows={2}
                                    required
                                    maxLength={200}
                                    placeholder="Ghi rõ lý do chi tiền..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-xl border border-[#E2DDD2] p-2.5 text-xs text-slate-900 focus:border-[#102A43] focus:ring-2 focus:ring-[#102A43] focus:outline-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    variant="primary"
                                    isLoading={isSubmitting}
                                    loadingText="Đang lưu…"
                                    disabled={numericAmount <= 0}
                                    className="flex-2"
                                >
                                    Xác nhận thêm
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
