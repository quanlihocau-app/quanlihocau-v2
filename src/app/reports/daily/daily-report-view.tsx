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
                        <h1 className="text-[22px] font-bold tracking-tight text-[#17201A]">
                            Báo cáo ngày
                        </h1>
                        {shift.isClosed ? (
                            <span className="rounded-full bg-[#EBF6ED] px-3 py-1 text-xs font-bold text-[#3E9B4F] border border-[#3E9B4F]/20">
                                Đã chốt ca
                            </span>
                        ) : (
                            <span className="rounded-full bg-[#E8F3E5] px-3 py-1 text-xs font-bold text-[#246B38] border border-[#4F9D5A]/30">
                                Đang mở ca
                            </span>
                        )}
                    </div>

                    {/* Success Notice */}
                    {successMessage && (
                        <InlineAlert type="success" message={successMessage} />
                    )}

                    {/* Net Profit Card - Premium M3 Forest Gradient */}
                    <div className="rounded-3xl bg-linear-to-br from-[#1B4D28] via-[#246B38] to-[#153B1E] p-5 text-white shadow-md border border-[#4F9D5A]/30 space-y-1">
                        <p className="text-xs text-[#A8E2B5] font-semibold tracking-wide">
                            Lợi nhuận thuần (Thực thu ròng)
                        </p>
                        <p className="text-3xl font-black font-mono text-white tabular-nums tracking-tight">
                            {formatVnd(summary.netProfitVnd)}
                        </p>
                    </div>

                    {/* Two Main Cards: Doanh thu & Chi phí */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Doanh thu Card */}
                        <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4 shadow-xs">
                            <p className="text-xs font-semibold text-[#66716A]">
                                Tổng Doanh Thu
                            </p>
                            <p className="mt-1 text-lg font-bold font-mono text-[#246B38] tabular-nums">
                                {formatVnd(summary.revenueVnd)}
                            </p>
                        </div>

                        {/* Chi phí Card */}
                        <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4 shadow-xs">
                            <p className="text-xs font-semibold text-[#66716A]">
                                Tổng Chi Phí
                            </p>
                            <p className="mt-1 text-lg font-bold font-mono text-[#D9534F] tabular-nums">
                                {formatVnd(summary.expenseVnd)}
                            </p>
                        </div>
                    </div>

                    {/* Financial Breakdown List */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#246B38] px-1">
                            Chi tiết dòng tiền
                        </p>

                        {/* Tiền mặt */}
                        <div className="flex items-center justify-between rounded-2xl border border-[#E3E8E3] bg-white px-4 py-3 shadow-xs">
                            <span className="text-xs font-medium text-[#17201A]">
                                Tiền mặt
                            </span>
                            <span className="text-xs font-bold font-mono text-[#17201A] tabular-nums">
                                {formatVnd(summary.cashVnd)}
                            </span>
                        </div>

                        {/* Chuyển khoản */}
                        <div className="flex items-center justify-between rounded-2xl border border-[#E3E8E3] bg-white px-4 py-3 shadow-xs">
                            <span className="text-xs font-medium text-[#17201A]">
                                Chuyển khoản (Ngân hàng)
                            </span>
                            <span className="text-xs font-bold font-mono text-[#17201A] tabular-nums">
                                {formatVnd(summary.transferVnd)}
                            </span>
                        </div>

                        {/* Thu mua cá */}
                        <div className="flex items-center justify-between rounded-2xl border border-[#E3E8E3] bg-white px-4 py-3 shadow-xs">
                            <span className="text-xs font-medium text-[#17201A]">
                                Chi trả thu mua cá
                            </span>
                            <span className="text-xs font-bold font-mono text-[#D9534F] tabular-nums">
                                {summary.fishBuybackVnd > 0 ? `−${formatVnd(summary.fishBuybackVnd)}` : formatVnd(summary.fishBuybackVnd)}
                            </span>
                        </div>

                        {/* Chi khác */}
                        <div className="flex items-center justify-between rounded-2xl border border-[#E3E8E3] bg-white px-4 py-3 shadow-xs">
                            <span className="text-xs font-medium text-[#17201A]">
                                Chi phí vận hành khác
                            </span>
                            <span className="text-xs font-bold font-mono text-[#D9534F] tabular-nums">
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
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#246B38]">
                                        Vé câu & Gói dịch vụ
                                    </p>
                                    <span className="text-xs font-semibold text-[#66716A]">
                                        Tổng: {breakdown.sessions.total} vé ({breakdown.sessions.completed} xong, {breakdown.sessions.active} đang câu{breakdown.sessions.cancelled > 0 ? `, ${breakdown.sessions.cancelled} hủy` : ""})
                                    </span>
                                </div>
                                <div className="rounded-2xl border border-[#E3E8E3] bg-white divide-y divide-[#E3E8E3] shadow-xs overflow-hidden">
                                    {breakdown.sessions.packages.length > 0 ? (
                                        breakdown.sessions.packages.map((pkg) => (
                                            <div key={pkg.packageName} className="flex items-center justify-between px-4 py-3 text-xs">
                                                <div>
                                                    <span className="font-semibold text-[#17201A]">{pkg.packageName}</span>
                                                    <span className="ml-2 text-[#66716A]">({pkg.count} vé)</span>
                                                </div>
                                                <span className="font-bold font-mono text-[#17201A] tabular-nums">
                                                    {formatVnd(pkg.totalVnd)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-[#8A938D]">
                                            Chưa có vé câu nào trong ca này
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Sản phẩm & Gia hạn */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#246B38]">
                                        Hàng hóa & Gia hạn
                                    </p>
                                    <span className="text-xs font-semibold text-[#66716A]">
                                        {formatVnd(breakdown.products.totalVnd + breakdown.services.extensionsTotalVnd)}
                                    </span>
                                </div>
                                <div className="rounded-2xl border border-[#E3E8E3] bg-white divide-y divide-[#E3E8E3] shadow-xs overflow-hidden">
                                    {breakdown.services.extensionsCount > 0 && (
                                        <div className="flex items-center justify-between px-4 py-3 text-xs bg-[#FDF6E9]">
                                            <div>
                                                <span className="font-semibold text-[#D99A32]">Gia hạn thêm giờ</span>
                                                <span className="ml-2 text-[#D99A32]/80">({breakdown.services.extensionsCount} lần)</span>
                                            </div>
                                            <span className="font-bold font-mono text-[#D99A32] tabular-nums">
                                                {formatVnd(breakdown.services.extensionsTotalVnd)}
                                            </span>
                                        </div>
                                    )}
                                    {breakdown.products.items.length > 0 ? (
                                        breakdown.products.items.map((prod) => (
                                            <div key={prod.name} className="flex items-center justify-between px-4 py-3 text-xs">
                                                <div>
                                                    <span className="font-semibold text-[#17201A]">{prod.name}</span>
                                                    <span className="ml-2 text-[#66716A]">(SL: {prod.quantity})</span>
                                                </div>
                                                <span className="font-bold font-mono text-[#17201A] tabular-nums">
                                                    {formatVnd(prod.totalVnd)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        breakdown.services.extensionsCount === 0 && (
                                            <div className="p-4 text-center text-xs text-[#8A938D]">
                                                Chưa có bán hàng kèm trong ca này
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* 3. Xuất nhập kho trong ca */}
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#246B38] px-1">
                                    Biến động kho hàng
                                </p>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="rounded-2xl border border-[#E3E8E3] bg-white p-3.5 shadow-xs">
                                        <span className="text-xs font-medium text-[#66716A]">Đã nhập kho</span>
                                        <p className="mt-0.5 text-sm font-bold font-mono text-[#3E9B4F] tabular-nums">
                                            +{breakdown.inventory.inCount} đơn vị
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-[#E3E8E3] bg-white p-3.5 shadow-xs">
                                        <span className="text-xs font-medium text-[#66716A]">Đã xuất bán</span>
                                        <p className="mt-0.5 text-sm font-bold font-mono text-[#17201A] tabular-nums">
                                            -{breakdown.inventory.outCount} đơn vị
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shift Closed Details (if already closed) */}
                    {shift.isClosed && shiftClose && (
                        <Card className="border-[#4F9D5A]/30 bg-[#E8F3E5] p-4 space-y-1.5 text-xs text-[#246B38] rounded-2xl">
                            <div className="flex items-center justify-between font-bold">
                                <span>Thời gian chốt ca:</span>
                                <span className="tabular-nums font-mono">{formatDateTime(shiftClose.closedAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#66716A]">Người thực hiện:</span>
                                <span className="font-semibold text-[#17201A]">
                                    {shiftClose.closedBy || "Quản trị viên"}
                                </span>
                            </div>
                            {shiftClose.note && (
                                <div className="pt-1 text-xs text-[#66716A] border-t border-[#4F9D5A]/20 mt-1">
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
                                    className="w-full text-sm font-bold shadow-xs min-h-12 rounded-full cursor-pointer"
                                >
                                    Xem và chốt ca
                                </Button>
                            ) : (
                                <div className="rounded-2xl border border-[#E3E8E3] bg-white px-4 py-3 text-center text-xs text-[#66716A]">
                                    Chỉ Chủ hồ hoặc Quản lý mới có quyền chốt ca.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Shift Close Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                        <div className="w-full max-w-sm rounded-3xl bg-white border border-[#E3E8E3] shadow-2xl overflow-hidden flex flex-col space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F3E5] text-[#246B38]">
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
                                    <h3 className="text-base font-bold text-[#17201A]">
                                        Xác nhận chốt ca
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-full p-1.5 text-[#66716A] hover:text-[#17201A] hover:bg-[#F7F9F5] cursor-pointer"
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
                            <div className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-3.5 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-[#66716A]">Doanh thu:</span>
                                    <span className="font-bold font-mono text-[#246B38] tabular-nums">
                                        {formatVnd(summary.revenueVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#66716A]">Chi phí:</span>
                                    <span className="font-bold font-mono text-[#D9534F] tabular-nums">
                                        {formatVnd(summary.expenseVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-[#E3E8E3] pt-1.5 font-bold text-[#17201A]">
                                    <span>Thực thu ròng:</span>
                                    <span className="text-[#246B38] font-bold font-mono tabular-nums">
                                        {formatVnd(summary.netProfitVnd)}
                                    </span>
                                </div>
                            </div>

                            {/* Note Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#17201A]">
                                    Ghi chú (tùy chọn):
                                </label>
                                <textarea
                                    rows={2}
                                    maxLength={500}
                                    placeholder="Nhập ghi chú chốt ca nếu có..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full rounded-2xl border border-[#E3E8E3] bg-white p-3 text-xs text-[#17201A] focus:border-[#4F9D5A] focus:ring-1 focus:ring-[#4F9D5A] focus:outline-none"
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
                                    className="flex-1 rounded-full"
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
                                    className="flex-2 rounded-full"
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
