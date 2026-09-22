"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";

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

    const { onBackdropClick } = useModalDismiss({
        isOpen: isModalOpen,
        onClose: () => {
            if (!isSubmitting) setIsModalOpen(false);
        },
        closeOnEscape: !isSubmitting,
    });
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
        <div className="mobile-pos-shell font-serif">
            <div className="mobile-pos-frame">
                {/* ── App Header ─────────────────────────────────────────── */}
                <MobileAppHeader lakeName={lakeName} />

                <div className="p-4 space-y-4 pb-28">
                    {/* ── Standardized Green Gradient Banner (Đồng bộ trang Đang câu) ── */}
                    <div className="w-full mb-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-[#F0FDF4] via-white to-[#F0FDF4] px-4 py-3.5 shadow-2xs font-serif">
                        <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-2">
                                <div className="h-4.5 w-1.5 rounded-full bg-[#16A34A] shrink-0" />
                                <div>
                                    <h1 className="text-xs sm:text-[13px] font-bold uppercase tracking-normal text-[#0F172A] font-serif leading-none whitespace-nowrap">
                                        BÁO CÁO SỔ CA NGÀY
                                    </h1>
                                    <p className="text-[10px] text-[#64748B] mt-1 font-mono">
                                        {formatDateTime(shift.startTime)} {shift.endTime ? `— ${formatDateTime(shift.endTime)}` : ""}
                                    </p>
                                </div>
                            </div>
                            {shift.isClosed ? (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 shadow-2xs font-serif shrink-0 whitespace-nowrap">
                                    ĐÃ CHỐT CA
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-bold text-[#16A34A] border border-[#BBF7D0] shadow-2xs font-serif shrink-0 whitespace-nowrap">
                                    ĐANG MỞ CA
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Success Notice */}
                    {successMessage && (
                        <InlineAlert type="success" message={successMessage} />
                    )}

                    {/* Net Profit Card - Classic Editorial Ledger Block */}
                    <div className="rounded-xs bg-[#2C4C3B] p-4 text-white border border-[#2C4C3B] space-y-1">
                        <p className="text-xs text-[#C8D6CF] font-bold uppercase tracking-wider">
                            Lợi nhuận thuần (Thực thu ròng)
                        </p>
                        <p className="text-3xl font-bold font-serif text-white tabular-nums tracking-tight">
                            {formatVnd(summary.netProfitVnd)}
                        </p>
                    </div>

                    {/* Two Main Cards: Doanh thu & Chi phí */}
                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Doanh thu Card */}
                        <div className="rounded-xs border border-[#CCCCCC] bg-white p-3">
                            <p className="text-xs font-bold text-[#555555] uppercase">
                                Tổng Doanh Thu
                            </p>
                            <p className="mt-1 text-base font-bold font-serif text-[#2C4C3B] tabular-nums">
                                {formatVnd(summary.revenueVnd)}
                            </p>
                        </div>

                        {/* Chi phí Card */}
                        <div className="rounded-xs border border-[#CCCCCC] bg-white p-3">
                            <p className="text-xs font-bold text-[#555555] uppercase">
                                Tổng Chi Phí
                            </p>
                            <p className="mt-1 text-base font-bold font-serif text-[#9E2A2B] tabular-nums">
                                {formatVnd(summary.expenseVnd)}
                            </p>
                        </div>
                    </div>

                    {/* Financial Breakdown Ledger Table */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B] px-0.5">
                            Chi tiết luồng tiền thu / chi
                        </p>

                        <div className="rounded-xs border border-[#CCCCCC] bg-white divide-y divide-[#E0E0E0]">
                            {/* Tiền mặt */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#FAFAF7] transition-colors">
                                <span className="font-medium text-[#1A1A1A]">
                                    Tiền mặt tại két
                                </span>
                                <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                    {formatVnd(summary.cashVnd)}
                                </span>
                            </div>

                            {/* Chuyển khoản */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#FAFAF7] transition-colors">
                                <span className="font-medium text-[#1A1A1A]">
                                    Chuyển khoản ngân hàng
                                </span>
                                <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                    {formatVnd(summary.transferVnd)}
                                </span>
                            </div>

                            {/* Thu mua cá */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#FAFAF7] transition-colors">
                                <span className="font-medium text-[#1A1A1A]">
                                    Chi trả thu mua cá
                                </span>
                                <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                    {summary.fishBuybackVnd > 0 ? `−${formatVnd(summary.fishBuybackVnd)}` : formatVnd(summary.fishBuybackVnd)}
                                </span>
                            </div>

                            {/* Chi khác */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#FAFAF7] transition-colors">
                                <span className="font-medium text-[#1A1A1A]">
                                    Chi phí vận hành khác
                                </span>
                                <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                    {summary.otherExpenseVnd > 0 ? `−${formatVnd(summary.otherExpenseVnd)}` : formatVnd(summary.otherExpenseVnd)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Breakdown Sections if available */}
                    {breakdown && (
                        <div className="space-y-3.5">
                            {/* 1. Vé câu & Doanh thu theo gói */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between px-0.5">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B]">
                                        Vé câu & Gói dịch vụ
                                    </p>
                                    <span className="text-xs text-[#555555]">
                                        Tổng: {breakdown.sessions.total} vé ({breakdown.sessions.completed} xong, {breakdown.sessions.active} đang câu{breakdown.sessions.cancelled > 0 ? `, ${breakdown.sessions.cancelled} hủy` : ""})
                                    </span>
                                </div>
                                <div className="rounded-xs border border-[#CCCCCC] bg-white divide-y divide-[#E0E0E0] overflow-hidden">
                                    {breakdown.sessions.packages.length > 0 ? (
                                        breakdown.sessions.packages.map((pkg) => (
                                            <div key={pkg.packageName} className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-[#FAFAF7] transition-colors">
                                                <div>
                                                    <span className="font-bold text-[#1A1A1A]">{pkg.packageName}</span>
                                                    <span className="ml-2 text-[#555555]">({pkg.count} vé)</span>
                                                </div>
                                                <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                                    {formatVnd(pkg.totalVnd)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3.5 text-center text-xs text-[#777777]">
                                            Chưa có vé câu nào trong ca này
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Sản phẩm & Gia hạn */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between px-0.5">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B]">
                                        Hàng hóa & Gia hạn
                                    </p>
                                    <span className="text-xs font-bold font-serif text-[#1A1A1A]">
                                        {formatVnd(breakdown.products.totalVnd + breakdown.services.extensionsTotalVnd)}
                                    </span>
                                </div>
                                <div className="rounded-xs border border-[#CCCCCC] bg-white divide-y divide-[#E0E0E0] overflow-hidden">
                                    {breakdown.services.extensionsCount > 0 && (
                                        <div className="flex items-center justify-between px-3.5 py-2 text-xs bg-[#FFFBE6]">
                                            <div>
                                                <span className="font-bold text-[#D48806]">Gia hạn thêm giờ</span>
                                                <span className="ml-2 text-[#D48806]/80">({breakdown.services.extensionsCount} lần)</span>
                                            </div>
                                            <span className="font-bold font-serif text-[#D48806] tabular-nums">
                                                {formatVnd(breakdown.services.extensionsTotalVnd)}
                                            </span>
                                        </div>
                                    )}
                                    {breakdown.products.items.length > 0 ? (
                                        breakdown.products.items.map((prod) => (
                                            <div key={prod.name} className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-[#FAFAF7] transition-colors">
                                                <div>
                                                    <span className="font-semibold text-[#1A1A1A]">{prod.name}</span>
                                                    <span className="ml-2 text-[#555555]">(SL: {prod.quantity})</span>
                                                </div>
                                                <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                                    {formatVnd(prod.totalVnd)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        breakdown.services.extensionsCount === 0 && (
                                            <div className="p-3.5 text-center text-xs text-[#777777]">
                                                Chưa có bán hàng kèm trong ca này
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* 3. Xuất nhập kho trong ca */}
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B] px-0.5">
                                    Biến động kho hàng
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xs border border-[#CCCCCC] bg-white p-3">
                                        <span className="text-xs font-medium text-[#555555]">Đã nhập kho</span>
                                        <p className="mt-0.5 text-sm font-bold font-serif text-[#2C4C3B] tabular-nums">
                                            +{breakdown.inventory.inCount} đơn vị
                                        </p>
                                    </div>
                                    <div className="rounded-xs border border-[#CCCCCC] bg-white p-3">
                                        <span className="text-xs font-medium text-[#555555]">Đã xuất bán</span>
                                        <p className="mt-0.5 text-sm font-bold font-serif text-[#1A1A1A] tabular-nums">
                                            -{breakdown.inventory.outCount} đơn vị
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shift Closed Details (if already closed) */}
                    {shift.isClosed && shiftClose && (
                        <div className="border border-[#CCCCCC] bg-[#FAFAF7] p-3 space-y-1 text-xs text-[#1A1A1A] rounded-xs">
                            <div className="flex items-center justify-between font-bold">
                                <span>Thời gian chốt ca:</span>
                                <span className="tabular-nums font-serif">{formatDateTime(shiftClose.closedAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#555555]">Người thực hiện:</span>
                                <span className="font-bold text-[#1A1A1A]">
                                    {shiftClose.closedBy || "Quản trị viên"}
                                </span>
                            </div>
                            {shiftClose.note && (
                                <div className="pt-1 text-xs text-[#555555] border-t border-[#E0E0E0] mt-1">
                                    Ghi chú: {shiftClose.note}
                                </div>
                            )}
                        </div>
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
                                    className="w-full text-sm font-bold cursor-pointer"
                                >
                                    Xem và chốt ca
                                </Button>
                            ) : (
                                <div className="rounded-xs border border-[#CCCCCC] bg-white px-3.5 py-2.5 text-center text-xs text-[#555555]">
                                    Chỉ Chủ hồ hoặc Quản lý mới có quyền chốt ca.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Shift Close Modal */}
                {isModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 modal-backdrop-animate font-serif"
                        onClick={onBackdropClick}
                    >
                        <div className="w-full max-w-sm rounded-xs bg-white border border-[#CCCCCC] overflow-hidden flex flex-col space-y-3 p-4 modal-content-animate font-serif">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
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
                                    <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">
                                        Xác nhận chốt ca
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-7 w-7 rounded-xs border border-[#CCCCCC] bg-[#F2F2F0] flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAEAE6] transition-colors cursor-pointer"
                                >
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
                            <div className="rounded-xs border border-[#CCCCCC] bg-[#FAFAF7] p-3 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-[#555555]">Doanh thu:</span>
                                    <span className="font-bold font-serif text-[#2C4C3B] tabular-nums">
                                        {formatVnd(summary.revenueVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#555555]">Chi phí:</span>
                                    <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                        {formatVnd(summary.expenseVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-[#CCCCCC] pt-1 font-bold text-[#1A1A1A]">
                                    <span>Thực thu ròng:</span>
                                    <span className="text-[#2C4C3B] font-bold font-serif tabular-nums">
                                        {formatVnd(summary.netProfitVnd)}
                                    </span>
                                </div>
                            </div>

                            {/* Note Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#1A1A1A]">
                                    Ghi chú (tùy chọn):
                                </label>
                                <textarea
                                    rows={2}
                                    maxLength={500}
                                    placeholder="Nhập ghi chú chốt ca nếu có..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full rounded-xs border border-[#CCCCCC] bg-white p-2.5 text-xs text-[#1A1A1A] focus:border-[#2C4C3B] focus:outline-none font-serif"
                                />
                            </div>

                            {/* Warning Alert */}
                            <InlineAlert
                                type="warning"
                                message="Số liệu tài chính sẽ được khóa sau khi chốt ca."
                            />

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-1">
                                <Button
                                    type="button"
                                    size="md"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    size="md"
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
