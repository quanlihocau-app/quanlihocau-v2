"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export interface DailyReportBreakdown {
    sessions: {
        total: number;
        completed: number;
        active: number;
        cancelled: number;
        packages: Array<{
            packageName: string;
            count: number;
            totalVnd: number;
        }>;
    };
    products: {
        totalQuantity: number;
        totalVnd: number;
        items: Array<{
            name: string;
            quantity: number;
            totalVnd: number;
        }>;
    };
    services: {
        extensionsCount: number;
        extensionsTotalVnd: number;
    };
    payments: {
        cashInVnd: number;
        cashOutVnd: number;
        transferInVnd: number;
        transferOutVnd: number;
        totalPaidInVnd: number;
        totalRefundVnd: number;
    };
    inventory: {
        inCount: number;
        outCount: number;
    };
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
    breakdown?: DailyReportBreakdown | null;
    shiftClose: ShiftCloseInfo | null;
    canCloseShift: boolean;
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

export function DailyReportView({
    shift,
    summary,
    breakdown,
    shiftClose,
    canCloseShift,
    lakeName,
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
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame">
                {/* ── App Header ─────────────────────────────────────────── */}
                <MobileAppHeader lakeName={lakeName} />

                <div className="p-4 space-y-4 pb-28">
                    {/* ── Page title + shift badge ───────────────────────────── */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            Báo cáo ngày
                        </h1>
                        {shift.isClosed ? (
                            <span className="rounded-full bg-[#E8F3ED] px-3 py-1 text-xs font-bold text-[#2D6A4F] border border-[#2D6A4F]/20">
                                Đã chốt ca
                            </span>
                        ) : (
                            <span className="rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-bold text-[#8A5B00] border border-[#DCD3C0]">
                                Đang mở ca
                            </span>
                        )}
                    </div>

                    {/* Success Notice */}
                    {successMessage && (
                        <InlineAlert type="success" message={successMessage} />
                    )}

                    {/* Net Profit Card */}
                    <div className="rounded-2xl bg-linear-to-br from-[#2D190F] to-[#170D09] p-4 text-[#F5F2EB] shadow-md border border-[#9E6B05]/30">
                        <p className="text-xs text-[#BDA989] font-medium">
                            Lợi nhuận thuần (Thực thu ròng)
                        </p>
                        <p className="mt-1 text-2xl font-extrabold font-mono text-[#F4DFB7] tabular-nums tracking-tight">
                            {formatVnd(summary.netProfitVnd)}
                        </p>
                    </div>

                    {/* Two Main Cards: Doanh thu & Chi phí */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Doanh thu Card */}
                        <div className="rounded-2xl border border-[#EAE4D7] bg-[#FFFDF9] p-3.5 shadow-xs">
                            <p className="text-xs font-semibold text-slate-500">
                                Tổng Doanh Thu
                            </p>
                            <p className="mt-1 text-lg font-bold font-mono text-[#2D6A4F] tabular-nums">
                                {formatVnd(summary.revenueVnd)}
                            </p>
                        </div>

                        {/* Chi phí Card */}
                        <div className="rounded-2xl border border-[#EAE4D7] bg-[#FFFDF9] p-3.5 shadow-xs">
                            <p className="text-xs font-semibold text-slate-500">
                                Tổng Chi Phí
                            </p>
                            <p className="mt-1 text-lg font-bold font-mono text-[#8B1E1E] tabular-nums">
                                {formatVnd(summary.expenseVnd)}
                            </p>
                        </div>
                    </div>

                    {/* Financial Breakdown List */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                            Chi tiết dòng tiền
                        </p>

                        {/* Tiền mặt */}
                        <div className="flex items-center justify-between rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-3 shadow-xs">
                            <span className="text-xs font-medium text-slate-700">
                                Tiền mặt
                            </span>
                            <span className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                                {formatVnd(summary.cashVnd)}
                            </span>
                        </div>

                        {/* Chuyển khoản */}
                        <div className="flex items-center justify-between rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-3 shadow-xs">
                            <span className="text-xs font-medium text-slate-700">
                                Chuyển khoản (Ngân hàng)
                            </span>
                            <span className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                                {formatVnd(summary.transferVnd)}
                            </span>
                        </div>

                        {/* Thu mua cá */}
                        <div className="flex items-center justify-between rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-3 shadow-xs">
                            <span className="text-xs font-medium text-slate-700">
                                Chi trả thu mua cá
                            </span>
                            <span className="text-xs font-bold font-mono text-[#8B1E1E] tabular-nums">
                                {summary.fishBuybackVnd > 0 ? `−${formatVnd(summary.fishBuybackVnd)}` : formatVnd(summary.fishBuybackVnd)}
                            </span>
                        </div>

                        {/* Chi khác */}
                        <div className="flex items-center justify-between rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-3 shadow-xs">
                            <span className="text-xs font-medium text-slate-700">
                                Chi phí vận hành khác
                            </span>
                            <span className="text-xs font-bold font-mono text-[#8B1E1E] tabular-nums">
                                {summary.otherExpenseVnd > 0 ? `−${formatVnd(summary.otherExpenseVnd)}` : formatVnd(summary.otherExpenseVnd)}
                            </span>
                        </div>
                    </div>

                    {/* Detailed Breakdown Sections if available */}
                    {breakdown && (
                        <div className="space-y-4">
                            {/* 1. Vé câu & Doanh thu theo gói */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Vé câu & Gói dịch vụ
                                    </p>
                                    <span className="text-xs font-semibold text-slate-700">
                                        Tổng: {breakdown.sessions.total} vé ({breakdown.sessions.completed} xong, {breakdown.sessions.active} đang câu{breakdown.sessions.cancelled > 0 ? `, ${breakdown.sessions.cancelled} hủy` : ""})
                                    </span>
                                </div>
                                <div className="rounded-xl border border-[#EAE4D7] bg-white divide-y divide-[#EAE4D7] shadow-xs">
                                    {breakdown.sessions.packages.length > 0 ? (
                                        breakdown.sessions.packages.map((pkg) => (
                                            <div key={pkg.packageName} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                                <div>
                                                    <span className="font-semibold text-slate-800">{pkg.packageName}</span>
                                                    <span className="ml-2 text-slate-500">({pkg.count} vé)</span>
                                                </div>
                                                <span className="font-bold font-mono text-slate-900 tabular-nums">
                                                    {formatVnd(pkg.totalVnd)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-center text-xs text-slate-400">
                                            Chưa có vé câu nào trong ca này
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Sản phẩm & Gia hạn */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Hàng hóa & Gia hạn
                                    </p>
                                    <span className="text-xs font-semibold text-slate-700">
                                        {formatVnd(breakdown.products.totalVnd + breakdown.services.extensionsTotalVnd)}
                                    </span>
                                </div>
                                <div className="rounded-xl border border-[#EAE4D7] bg-white divide-y divide-[#EAE4D7] shadow-xs">
                                    {breakdown.services.extensionsCount > 0 && (
                                        <div className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-amber-50/50">
                                            <div>
                                                <span className="font-semibold text-amber-900">Gia hạn thêm giờ</span>
                                                <span className="ml-2 text-amber-700">({breakdown.services.extensionsCount} lần)</span>
                                            </div>
                                            <span className="font-bold font-mono text-amber-900 tabular-nums">
                                                {formatVnd(breakdown.services.extensionsTotalVnd)}
                                            </span>
                                        </div>
                                    )}
                                    {breakdown.products.items.length > 0 ? (
                                        breakdown.products.items.map((prod) => (
                                            <div key={prod.name} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                                <div>
                                                    <span className="font-semibold text-slate-800">{prod.name}</span>
                                                    <span className="ml-2 text-slate-500">(SL: {prod.quantity})</span>
                                                </div>
                                                <span className="font-bold font-mono text-slate-900 tabular-nums">
                                                    {formatVnd(prod.totalVnd)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        breakdown.services.extensionsCount === 0 && (
                                            <div className="p-3 text-center text-xs text-slate-400">
                                                Chưa có bán hàng kèm trong ca này
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* 3. Xuất nhập kho trong ca */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                                    Biến động kho hàng
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-[#EAE4D7] bg-white p-3 shadow-xs">
                                        <span className="text-xs font-medium text-slate-500">Đã nhập kho</span>
                                        <p className="mt-0.5 text-sm font-bold font-mono text-emerald-700 tabular-nums">
                                            +{breakdown.inventory.inCount} đơn vị
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-[#EAE4D7] bg-white p-3 shadow-xs">
                                        <span className="text-xs font-medium text-slate-500">Đã xuất bán</span>
                                        <p className="mt-0.5 text-sm font-bold font-mono text-slate-800 tabular-nums">
                                            -{breakdown.inventory.outCount} đơn vị
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shift Closed Details (if already closed) */}
                    {shift.isClosed && shiftClose && (
                        <Card className="border-[#2D6A4F]/30 bg-[#E8F3ED]/70 p-4 space-y-1.5 text-xs text-[#2D6A4F]">
                            <div className="flex items-center justify-between font-bold">
                                <span>Thời gian chốt ca:</span>
                                <span className="tabular-nums font-mono">{formatDateTime(shiftClose.closedAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Người thực hiện:</span>
                                <span className="font-semibold text-slate-900">
                                    {shiftClose.closedBy || "Quản trị viên"}
                                </span>
                            </div>
                            {shiftClose.note && (
                                <div className="pt-1 text-xs text-slate-600 border-t border-[#2D6A4F]/20 mt-1">
                                    Ghi chú: {shiftClose.note}
                                </div>
                            )}
                        </Card>
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
                                    className="mobile-pos-btn mobile-pos-btn-primary w-full text-sm font-bold shadow-md cursor-pointer"
                                >
                                    Xem và chốt ca
                                </button>
                            ) : (
                                <div className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-3 text-center text-xs text-slate-500">
                                    Chỉ Chủ hồ hoặc Quản lý mới có quyền chốt ca.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Shift Close Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                        <div className="w-full max-w-sm rounded-2xl bg-[#F5F2EB] border border-[#EAE4D7] shadow-2xl overflow-hidden flex flex-col space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAE2CE] text-[#8A5B00]">
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
                                    <h3 className="text-base font-bold text-slate-900">
                                        Xác nhận chốt ca
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
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
                            <div className="rounded-xl border border-[#EAE4D7] bg-white p-3.5 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Doanh thu:</span>
                                    <span className="font-bold font-mono text-[#2D6A4F] tabular-nums">
                                        {formatVnd(summary.revenueVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Chi phí:</span>
                                    <span className="font-bold font-mono text-[#8B1E1E] tabular-nums">
                                        {formatVnd(summary.expenseVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-[#F0ECE1] pt-1.5 font-bold text-slate-900">
                                    <span>Thực thu ròng:</span>
                                    <span className="text-[#8A5B00] font-bold font-mono tabular-nums">
                                        {formatVnd(summary.netProfitVnd)}
                                    </span>
                                </div>
                            </div>

                            {/* Note Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">
                                    Ghi chú (tùy chọn):
                                </label>
                                <textarea
                                    rows={2}
                                    maxLength={500}
                                    placeholder="Nhập ghi chú chốt ca nếu có..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full rounded-xl border border-[#EAE4D7] bg-white p-2.5 text-xs text-slate-900 focus:border-[#8A5B00] focus:ring-1 focus:ring-[#8A5B00] focus:outline-none"
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
                                    className="flex-2"
                                >
                                    Xác nhận chốt ca
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <MobileBottomNav />
            </div>
        </div>
    );
}
