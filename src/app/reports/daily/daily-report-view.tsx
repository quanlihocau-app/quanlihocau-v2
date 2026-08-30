"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export interface DailyReportSummary {
    revenueVnd: number;
    expenseVnd: number;
    cashVnd: number;
    transferVnd: number;
    fishBuybackVnd: number;
    otherExpenseVnd: number;
    netProfitVnd: number;
}

export interface ShiftInfo {
    id: string;
    startTime: string;
    endTime: string | null;
    isClosed: boolean;
}

export interface ShiftCloseInfo {
    id: string;
    closedBy: string | null;
    closedAt: string;
    note: string | null;
}

interface DailyReportViewProps {
    shift: ShiftInfo;
    summary: DailyReportSummary;
    shiftClose: ShiftCloseInfo | null;
    canCloseShift: boolean;
    lakeName: string;
    organizationName: string;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return "—";
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

function formatDateHeader(dateStr: string): string {
    const d = new Date(dateStr);
    const dayNames = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
    ];
    const dayName = dayNames[d.getDay()];
    const dateFormatted = d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    });
    return `${dayName}, ${dateFormatted}`;
}

export function DailyReportView({
    shift,
    summary,
    shiftClose,
    canCloseShift,
    lakeName,
    organizationName,
}: DailyReportViewProps) {
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleConfirmClose() {
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        const idempotencyKey = crypto.randomUUID();

        try {
            const res = await fetch("/api/reports/daily/close", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                    note: note.trim() || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể chốt ca.");
                setIsSubmitting(false);
                return;
            }

            setSuccessMessage("Đã chốt ca thành công!");
            setIsSubmitting(false);

            setTimeout(() => {
                setIsModalOpen(false);
                router.refresh();
            }, 800);
        } catch {
            setError("Lỗi kết nối mạng khi chốt ca. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-md bg-[#F5F2EB] px-4 pb-24 pt-6">
            {/* Header info */}
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-slate-600">
                        {lakeName} • <span className="text-slate-400 font-normal">{organizationName}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                        {formatDateHeader(shift.startTime)}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#EAE2CE] px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-semibold text-[#8A5B00]">
                        Đang online
                    </span>
                </div>
            </div>

            {/* Title & Badge */}
            <div className="mb-5 flex items-center justify-between border-b border-[#EAE4D7] pb-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Báo cáo ngày
                </h1>
                {shift.isClosed ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        Đã chốt ca
                    </span>
                ) : (
                    <span className="rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-bold text-[#8A5B00]">
                        Chưa chốt ca
                    </span>
                )}
            </div>

            {/* Small Success Notice */}
            {successMessage && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 animate-in fade-in duration-150">
                    {successMessage}
                </div>
            )}

            {/* Two Main Cards: Doanh thu & Chi phí */}
            <div className="mb-3 grid grid-cols-2 gap-3">
                {/* Doanh thu Card */}
                <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Doanh thu
                    </p>
                    <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                        {formatVnd(summary.revenueVnd)}
                    </p>
                </div>

                {/* Chi phí Card */}
                <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Chi phí
                    </p>
                    <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                        {formatVnd(summary.expenseVnd)}
                    </p>
                </div>
            </div>

            {/* Financial Breakdown List */}
            <div className="mb-5 rounded-2xl border border-[#EAE4D7] bg-white shadow-sm divide-y divide-[#EAE4D7]">
                {/* Tiền mặt */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Tiền mặt
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                        {formatVnd(summary.cashVnd)}
                    </span>
                </div>

                {/* Chuyển khoản */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Chuyển khoản
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                        {formatVnd(summary.transferVnd)}
                    </span>
                </div>

                {/* Thu mua cá */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Thu mua cá
                    </span>
                    <span className="text-xs font-bold text-red-600">
                        {summary.fishBuybackVnd > 0 ? "-" : ""}
                        {formatVnd(summary.fishBuybackVnd)}
                    </span>
                </div>

                {/* Chi khác */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Chi khác
                    </span>
                    <span className="text-xs font-bold text-red-600">
                        {summary.otherExpenseVnd > 0 ? "-" : ""}
                        {formatVnd(summary.otherExpenseVnd)}
                    </span>
                </div>
            </div>

            {/* Shift Closed Details (if already closed) */}
            {shift.isClosed && shiftClose && (
                <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5 text-xs text-emerald-950">
                    <div className="flex items-center justify-between font-semibold">
                        <span>Thời gian chốt ca:</span>
                        <span>{formatDateTime(shiftClose.closedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-600">Người thực hiện:</span>
                        <span className="font-medium text-slate-900">
                            {shiftClose.closedBy || "Quản trị viên"}
                        </span>
                    </div>
                    {shiftClose.note && (
                        <div className="pt-1 text-[11px] text-slate-600 border-t border-emerald-200/60 mt-1">
                            Ghi chú: {shiftClose.note}
                        </div>
                    )}
                </div>
            )}

            {/* Main Action Button */}
            {!shift.isClosed && (
                <div>
                    {canCloseShift ? (
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setIsModalOpen(true);
                            }}
                            className="h-12 w-full rounded-xl bg-[#9E6B05] text-sm font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-98 flex items-center justify-center hover:bg-[#8A5B00]"
                        >
                            Xem và chốt ca
                        </button>
                    ) : (
                        <div className="rounded-xl border border-[#EAE4D7] bg-white p-3 text-center text-xs text-slate-500 font-medium">
                            Chỉ Chủ hồ hoặc Quản lý mới có quyền chốt ca.
                        </div>
                    )}
                </div>
            )}

            {/* Shift Close Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
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
                                    Xác nhận chốt ca
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

                        {/* Summary Snapshot */}
                        <div className="rounded-xl border border-[#EAE4D7] bg-[#F7F4EE] p-3 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Doanh thu:</span>
                                <span className="font-bold text-slate-900">
                                    {formatVnd(summary.revenueVnd)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Chi phí:</span>
                                <span className="font-bold text-slate-900">
                                    {formatVnd(summary.expenseVnd)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-[#EAE4D7] pt-1.5 font-bold text-slate-900">
                                <span>Thực thu ròng:</span>
                                <span className="text-[#9E6B05]">
                                    {formatVnd(summary.netProfitVnd)}
                                </span>
                            </div>
                        </div>

                        {/* Note Input */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">
                                Ghi chú (tùy chọn):
                            </label>
                            <textarea
                                rows={2}
                                maxLength={500}
                                placeholder="Nhập ghi chú chốt ca nếu có..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full rounded-xl border border-[#EAE4D7] p-2.5 text-xs text-slate-900 focus:border-[#9E6B05] focus:outline-none"
                            />
                        </div>

                        {/* Warning */}
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                            ⚠️ Số liệu tài chính sẽ được khóa vĩnh viễn sau khi
                            chốt ca.
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setIsModalOpen(false)}
                                className="h-11 flex-1 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-slate-700 shadow-sm transition-all duration-150 ease-out active:scale-95 disabled:opacity-60"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleConfirmClose}
                                className="h-11 flex-[2] rounded-xl bg-[#9E6B05] text-xs font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60"
                            >
                                {isSubmitting ? "Đang chốt ca…" : "Xác nhận chốt ca"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <MobileBottomNav />
        </main>
    );
}
