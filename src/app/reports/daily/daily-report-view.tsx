"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";

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
    closedAt: string;
    closedBy: string | null;
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
        <main className="mx-auto min-h-screen max-w-md bg-[#F8F6F0] px-4 pb-24 pt-6">
            {/* Header info */}
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-700">
                        {lakeName} • <span className="text-slate-500 font-normal">{organizationName}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                        {formatDateHeader(shift.startTime)}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488] animate-pulse" />
                    <span className="text-[11px] font-bold text-[#0F766E]">
                        Đang online
                    </span>
                </div>
            </div>

            {/* Title & Badge */}
            <div className="mb-5 flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#102A43]">
                    Báo cáo ngày
                </h1>
                {shift.isClosed ? (
                    <Badge variant="success">Đã chốt ca</Badge>
                ) : (
                    <Badge variant="warning">Chưa chốt ca</Badge>
                )}
            </div>

            {/* Small Success Notice */}
            {successMessage && (
                <div className="mb-4">
                    <InlineAlert type="success" message={successMessage} />
                </div>
            )}

            {/* Two Main Cards: Doanh thu & Chi phí */}
            <div className="mb-3 grid grid-cols-2 gap-3">
                {/* Doanh thu Card */}
                <Card className="border-teal-200 bg-teal-50/40 p-4">
                    <p className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                        Doanh thu
                    </p>
                    <p className="mt-1 text-xl font-black tracking-tight text-teal-950 tabular-nums">
                        {formatVnd(summary.revenueVnd)}
                    </p>
                </Card>

                {/* Chi phí Card */}
                <Card className="border-red-200 bg-red-50/40 p-4">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider">
                        Chi phí
                    </p>
                    <p className="mt-1 text-xl font-black tracking-tight text-red-950 tabular-nums">
                        {formatVnd(summary.expenseVnd)}
                    </p>
                </Card>
            </div>

            {/* Financial Breakdown List */}
            <Card className="mb-5 p-0 divide-y divide-[#E2DDD2] overflow-hidden">
                {/* Tiền mặt */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Tiền mặt
                    </span>
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatVnd(summary.cashVnd)}
                    </span>
                </div>

                {/* Chuyển khoản */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Chuyển khoản
                    </span>
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatVnd(summary.transferVnd)}
                    </span>
                </div>

                {/* Thu mua cá */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Thu mua cá
                    </span>
                    <span className="text-xs font-bold text-red-600 tabular-nums">
                        {summary.fishBuybackVnd > 0 ? "-" : ""}
                        {formatVnd(summary.fishBuybackVnd)}
                    </span>
                </div>

                {/* Chi khác */}
                <div className="flex items-center justify-between p-3.5">
                    <span className="text-xs font-semibold text-slate-700">
                        Chi khác
                    </span>
                    <span className="text-xs font-bold text-red-600 tabular-nums">
                        {summary.otherExpenseVnd > 0 ? "-" : ""}
                        {formatVnd(summary.otherExpenseVnd)}
                    </span>
                </div>
            </Card>

            {/* Shift Closed Details (if already closed) */}
            {shift.isClosed && shiftClose && (
                <Card className="mb-5 border-teal-200 bg-teal-50/50 p-4 space-y-1.5 text-xs text-teal-950">
                    <div className="flex items-center justify-between font-bold">
                        <span>Thời gian chốt ca:</span>
                        <span className="tabular-nums">{formatDateTime(shiftClose.closedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Người thực hiện:</span>
                        <span className="font-bold text-slate-900">
                            {shiftClose.closedBy || "Quản trị viên"}
                        </span>
                    </div>
                    {shiftClose.note && (
                        <div className="pt-1 text-[11px] text-slate-600 border-t border-teal-200/60 mt-1">
                            Ghi chú: {shiftClose.note}
                        </div>
                    )}
                </Card>
            )}

            {/* Main Action Button */}
            {!shift.isClosed && (
                <div>
                    {canCloseShift ? (
                        <Button
                            type="button"
                            size="lg"
                            variant="primary"
                            onClick={() => {
                                setError(null);
                                setIsModalOpen(true);
                            }}
                            className="w-full h-12 text-sm shadow-md"
                        >
                            Xem và chốt ca
                        </Button>
                    ) : (
                        <Card className="text-center p-3 text-xs text-slate-500 font-medium">
                            Chỉ Chủ hồ hoặc Quản lý mới có quyền chốt ca.
                        </Card>
                    )}
                </div>
            )}

            {/* Shift Close Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#102A43]/10 text-[#102A43]">
                                    <svg
                                        className="h-4 w-4"
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
                                <h3 className="text-base font-bold text-[#102A43]">
                                    Xác nhận chốt ca
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-[#F8F6F0]"
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
                            <InlineAlert type="error" message={error} />
                        )}

                        {/* Summary Snapshot */}
                        <div className="rounded-xl border border-[#E2DDD2] bg-[#F8F6F0] p-3.5 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-600 font-medium">Doanh thu:</span>
                                <span className="font-bold text-teal-800 tabular-nums">
                                    {formatVnd(summary.revenueVnd)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 font-medium">Chi phí:</span>
                                <span className="font-bold text-red-700 tabular-nums">
                                    {formatVnd(summary.expenseVnd)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-[#E2DDD2] pt-1.5 font-bold text-slate-900">
                                <span>Thực thu ròng:</span>
                                <span className="text-[#102A43] font-extrabold tabular-nums">
                                    {formatVnd(summary.netProfitVnd)}
                                </span>
                            </div>
                        </div>

                        {/* Note Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Ghi chú (tùy chọn):
                            </label>
                            <textarea
                                rows={2}
                                maxLength={500}
                                placeholder="Nhập ghi chú chốt ca nếu có..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full rounded-xl border border-[#E2DDD2] p-2.5 text-xs text-slate-900 focus:border-[#102A43] focus:ring-2 focus:ring-[#102A43] focus:outline-none"
                            />
                        </div>

                        {/* Warning Alert */}
                        <InlineAlert
                            type="warning"
                            message="Số liệu tài chính sẽ được khóa vĩnh viễn sau khi chốt ca."
                        />

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
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
                                type="button"
                                size="lg"
                                variant="primary"
                                isLoading={isSubmitting}
                                loadingText="Đang chốt ca…"
                                onClick={handleConfirmClose}
                                className="flex-[2]"
                            >
                                Xác nhận chốt ca
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <MobileBottomNav />
        </main>
    );
}
