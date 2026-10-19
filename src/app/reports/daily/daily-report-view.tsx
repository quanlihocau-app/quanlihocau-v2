"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DailyReportSummary {
    revenueVnd: number;
    expenseVnd: number;
    cashVnd: number;
    cashInVnd?: number;
    cashOutVnd?: number;
    transferVnd: number;
    transferInVnd?: number;
    transferOutVnd?: number;
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
    openingCashVnd?: number;
}

export interface ShiftCloseInfo {
    closedAt: string;
    closedBy: string | null;
    receivedBy?: string | null;
    note: string | null;
    actualCashVnd?: number | null;
    cashDifferenceVnd?: number;
    differenceReason?: string | null;
}

interface DailyReportViewProps {
    shift: ShiftInfo;
    summary: DailyReportSummary;
    breakdown?: DailyReportBreakdown | null;
    shiftClose: ShiftCloseInfo | null;
    canCloseShift: boolean;
    lakeName: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
    });
}

// ─────────────────────────────────────────────
// Print receipt component (58mm)
// ─────────────────────────────────────────────

interface PrintReceiptProps {
    lakeName: string;
    shift: ShiftInfo;
    summary: DailyReportSummary;
    breakdown?: DailyReportBreakdown | null;
    actualCashVnd?: number;
    expectedCashVnd: number;
    differenceVnd?: number;
    differenceReason?: string;
    closedBy?: string;
    receivedBy?: string;
    note?: string;
    closedAt?: string;
}

function PrintReceipt({
    lakeName,
    shift,
    summary,
    breakdown,
    actualCashVnd,
    expectedCashVnd,
    differenceVnd,
    differenceReason,
    closedBy,
    receivedBy,
    note,
    closedAt,
}: PrintReceiptProps) {
    return (
        <div className="print-only" style={{ fontFamily: "monospace", fontSize: "11px", width: "58mm", padding: "4px" }}>
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
                <div style={{ fontWeight: "bold", fontSize: "13px" }}>{lakeName}</div>
                <div style={{ fontWeight: "bold" }}>BIÊN BẢN BÀN GIAO CA</div>
                <div>Ngày: {closedAt ? formatTime(closedAt) : formatTime(shift.startTime)}</div>
            </div>

            {/* Shift info */}
            <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
                <div>Bắt đầu ca: {formatTime(shift.startTime)}</div>
                {shift.endTime && <div>Kết thúc ca: {formatTime(shift.endTime)}</div>}
                {closedBy && <div>Nhân viên bàn giao: {closedBy}</div>}
                {receivedBy && <div>Nhân viên nhận ca: {receivedBy}</div>}
            </div>

            {/* Cash reconciliation */}
            <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "2px" }}>ĐỐI SOÁT TIỀN MẶT</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tiền đầu ca:</span>
                    <span>{formatVnd(shift.openingCashVnd ?? 0)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Thu tiền mặt:</span>
                    <span>+{formatVnd(summary.cashInVnd ?? summary.cashVnd)}</span>
                </div>
                {(summary.cashOutVnd ?? 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Chi tiền mặt:</span>
                        <span>-{formatVnd(summary.cashOutVnd ?? 0)}</span>
                    </div>
                )}
                {summary.fishBuybackVnd > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Thu mua cá:</span>
                        <span>-{formatVnd(summary.fishBuybackVnd)}</span>
                    </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #000", marginTop: "2px", paddingTop: "2px" }}>
                    <span>Dự kiến bàn giao:</span>
                    <span>{formatVnd(expectedCashVnd)}</span>
                </div>
                {actualCashVnd !== undefined && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                        <span>Thực tế đếm:</span>
                        <span>{formatVnd(actualCashVnd)}</span>
                    </div>
                )}
                {differenceVnd !== undefined && differenceVnd !== 0 && (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                            <span>Chênh lệch:</span>
                            <span style={{ color: differenceVnd < 0 ? "#c00" : "#060" }}>
                                {differenceVnd > 0 ? "+" : ""}{formatVnd(differenceVnd)}
                            </span>
                        </div>
                        {differenceReason && (
                            <div style={{ marginTop: "2px" }}>
                                <span>Lý do: </span><span>{differenceReason}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Chuyển khoản */}
            <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "2px" }}>CHUYỂN KHOẢN</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>CK thu trong ca:</span>
                    <span>{formatVnd(summary.transferInVnd ?? summary.transferVnd)}</span>
                </div>
            </div>

            {/* Revenue summary */}
            <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "2px" }}>TỔNG KẾT CA</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Số vé:</span>
                    <span>{breakdown?.sessions.total ?? 0} vé ({breakdown?.sessions.completed ?? 0} xong)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Doanh thu:</span>
                    <span>{formatVnd(summary.revenueVnd)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Chi phí:</span>
                    <span>{formatVnd(summary.expenseVnd)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>Lợi nhuận:</span>
                    <span>{formatVnd(summary.netProfitVnd)}</span>
                </div>
            </div>

            {/* Note */}
            {note && (
                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
                    <div style={{ fontWeight: "bold" }}>Ghi chú:</div>
                    <div>{note}</div>
                </div>
            )}

            {/* Signatures */}
            <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ textAlign: "center", width: "45%" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "20px" }}>Bàn giao</div>
                        <div>{closedBy || "___________"}</div>
                        <div style={{ borderTop: "1px solid #000", marginTop: "2px", paddingTop: "2px", fontSize: "10px" }}>Ký tên</div>
                    </div>
                    <div style={{ textAlign: "center", width: "45%" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "20px" }}>Nhận bàn giao</div>
                        <div>{receivedBy || "___________"}</div>
                        <div style={{ borderTop: "1px solid #000", marginTop: "2px", paddingTop: "2px", fontSize: "10px" }}>Ký tên</div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "6px", fontSize: "10px" }}>
                In lúc: {new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function DailyReportView({
    shift,
    summary,
    breakdown,
    shiftClose,
    canCloseShift,
    lakeName,
}: DailyReportViewProps) {
    const router = useRouter();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [note, setNote] = useState("");
    const [receivedBy, setReceivedBy] = useState("");
    const [actualCashInput, setActualCashInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);

    const { onBackdropClick } = useModalDismiss({
        isOpen: isModalOpen,
        onClose: () => {
            if (!isSubmitting) setIsModalOpen(false);
        },
        closeOnEscape: !isSubmitting,
    });

    // ── Derived values ──────────────────────────────────────
    const openingCash = shift.openingCashVnd ?? 0;
    const cashIn = summary.cashInVnd ?? summary.cashVnd;
    const cashOut = summary.cashOutVnd ?? 0;
    const transferIn = summary.transferInVnd ?? summary.transferVnd;
    // Expected cash at handover = opening + cash collected - cash spent - fish buyback paid in cash
    const expectedCashVnd = openingCash + cashIn - cashOut - summary.fishBuybackVnd;

    const actualCashParsed =
        actualCashInput.trim() !== ""
            ? parseInt(actualCashInput.replace(/[^0-9]/g, ""), 10)
            : undefined;
    const differenceVnd =
        actualCashParsed !== undefined ? actualCashParsed - expectedCashVnd : undefined;
    const hasDifference = differenceVnd !== undefined && differenceVnd !== 0;
    const [differenceReason, setDifferenceReason] = useState("");

    // ── Submit ─────────────────────────────────────────────
    async function handleConfirmClose() {
        if (hasDifference && !differenceReason.trim()) {
            setError("Tiền mặt thực tế chênh lệch. Vui lòng nhập lý do chênh lệch.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        // Generate idempotency key only once per open dialog session
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }

        try {
            const res = await fetch("/api/reports/daily/close", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKeyRef.current,
                },
                body: JSON.stringify({
                    note: note.trim() || undefined,
                    actualCashVnd: actualCashParsed,
                    differenceReason: differenceReason.trim() || undefined,
                    receivedBy: receivedBy.trim() || undefined,
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

    function openModal() {
        setError(null);
        setSuccessMessage(null);
        idempotencyKeyRef.current = null; // reset so new key is generated for this attempt
        setIsModalOpen(true);
    }

    // ── Closed state: shiftClose values ───────────────────
    const closedExpectedCash =
        shiftClose && shift.isClosed
            ? (shiftClose.actualCashVnd !== undefined && shiftClose.actualCashVnd !== null
                  ? shiftClose.actualCashVnd - (shiftClose.cashDifferenceVnd ?? 0)
                  : expectedCashVnd)
            : expectedCashVnd;

    // ─────────────────────────────────────────────────────
    return (
        <div className="mobile-pos-shell font-serif">
            <div className="mobile-pos-frame">
                {/* ── App Header ── */}
                <MobileAppHeader lakeName={lakeName} />

                <main className="flex-1 overflow-y-auto p-4 space-y-4 has-bottom-nav">

                    {/* ── Banner ─────────────────────────────────────── */}
                    <div className="w-full mb-4 rounded-2xl border border-emerald-200/90 bg-linear-to-r from-[#F0FDF4] via-white to-[#F0FDF4] px-4 py-3.5 shadow-2xs font-serif">
                        <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-2">
                                <div className="h-4.5 w-1.5 rounded-full bg-[#16A34A] shrink-0" />
                                <div>
                                    <h1 className="text-xs sm:text-[13px] font-bold uppercase tracking-normal text-[#0F172A] font-serif leading-none whitespace-nowrap">
                                        Sổ Ca &amp; Đối Soát Tiền Mặt
                                    </h1>
                                    <p className="text-[10px] text-[#64748B] mt-1 font-mono">
                                        {formatDateTime(shift.startTime)}{shift.endTime ? ` — ${formatDateTime(shift.endTime)}` : ""}
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

                    {successMessage && <InlineAlert type="success" message={successMessage} />}

                    {/* ── Net Profit Hero ─────────────────────────────── */}
                    <div className="rounded-xs bg-[#2C4C3B] p-4 text-white border border-[#2C4C3B] space-y-1">
                        <p className="text-xs text-[#C8D6CF] font-bold uppercase tracking-wider">
                            Lợi nhuận thuần (Thực thu ròng)
                        </p>
                        <p className="text-3xl font-bold font-serif text-white tabular-nums tracking-tight">
                            {formatVnd(summary.netProfitVnd)}
                        </p>
                        <div className="flex gap-4 pt-1">
                            <span className="text-[11px] text-[#C8D6CF]">
                                Doanh thu: <span className="text-white font-bold">{formatVnd(summary.revenueVnd)}</span>
                            </span>
                            <span className="text-[11px] text-[#C8D6CF]">
                                Chi phí: <span className="text-[#FCA5A5] font-bold">{formatVnd(summary.expenseVnd)}</span>
                            </span>
                        </div>
                    </div>

                    {/* ── Đối soát tiền mặt ──────────────────────────── */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B] px-0.5">
                            Đối soát tiền mặt ca này
                        </p>
                        <div className="rounded-xs border border-[#CCCCCC] bg-white divide-y divide-[#E0E0E0]">
                            {/* Đầu ca */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                <span className="text-[#555555]">Tiền mặt đầu ca (nhận bàn giao)</span>
                                <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                    {formatVnd(openingCash)}
                                </span>
                            </div>
                            {/* Thu tiền mặt */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-[#F0FDF4]">
                                <span className="text-[#1A6B35]">↑ Thu tiền mặt trong ca</span>
                                <span className="font-bold font-serif text-[#1A6B35] tabular-nums">
                                    +{formatVnd(cashIn)}
                                </span>
                            </div>
                            {/* Chi tiền mặt */}
                            {cashOut > 0 && (
                                <div className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-[#FFF7F7]">
                                    <span className="text-[#9E2A2B]">↓ Chi tiền mặt trong ca</span>
                                    <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                        −{formatVnd(cashOut)}
                                    </span>
                                </div>
                            )}
                            {/* Thu mua cá */}
                            {summary.fishBuybackVnd > 0 && (
                                <div className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-[#FFF7F7]">
                                    <span className="text-[#9E2A2B]">↓ Chi trả thu mua cá</span>
                                    <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                        −{formatVnd(summary.fishBuybackVnd)}
                                    </span>
                                </div>
                            )}
                            {/* Dự kiến bàn giao */}
                            <div className="flex items-center justify-between px-3.5 py-3 text-xs bg-[#F5F5F0] border-t-2 border-[#2C4C3B]">
                                <span className="font-bold text-[#1A1A1A]">= Dự kiến bàn giao ca sau</span>
                                <span className="text-base font-bold font-serif text-[#2C4C3B] tabular-nums">
                                    {formatVnd(
                                        shift.isClosed && shiftClose?.actualCashVnd !== undefined && shiftClose.actualCashVnd !== null
                                            ? closedExpectedCash
                                            : expectedCashVnd
                                    )}
                                </span>
                            </div>
                            {/* Actual cash (if closed) */}
                            {shift.isClosed && shiftClose?.actualCashVnd !== undefined && shiftClose.actualCashVnd !== null && (
                                <>
                                    <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                        <span className="text-[#555555]">Tiền thực tế đếm được</span>
                                        <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                            {formatVnd(shiftClose.actualCashVnd)}
                                        </span>
                                    </div>
                                    {(shiftClose.cashDifferenceVnd ?? 0) !== 0 && (
                                        <div className={`flex items-center justify-between px-3.5 py-2.5 text-xs ${(shiftClose.cashDifferenceVnd ?? 0) < 0 ? "bg-[#FFF0F0]" : "bg-[#F0FDF4]"}`}>
                                            <span className={`font-bold ${(shiftClose.cashDifferenceVnd ?? 0) < 0 ? "text-[#9E2A2B]" : "text-[#1A6B35]"}`}>
                                                Chênh lệch
                                            </span>
                                            <span className={`font-bold font-serif tabular-nums ${(shiftClose.cashDifferenceVnd ?? 0) < 0 ? "text-[#9E2A2B]" : "text-[#1A6B35]"}`}>
                                                {(shiftClose.cashDifferenceVnd ?? 0) > 0 ? "+" : ""}{formatVnd(shiftClose.cashDifferenceVnd ?? 0)}
                                            </span>
                                        </div>
                                    )}
                                    {shiftClose.differenceReason && (
                                        <div className="px-3.5 py-2.5 text-xs text-[#555555] bg-[#FFFBE6]">
                                            <span className="font-bold text-[#D48806]">Lý do chênh lệch: </span>
                                            {shiftClose.differenceReason}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Chuyển khoản ───────────────────────────────── */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B] px-0.5">
                            Chuyển khoản
                        </p>
                        <div className="rounded-xs border border-[#CCCCCC] bg-white divide-y divide-[#E0E0E0]">
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-[#F0FDF4]">
                                <span className="text-[#1A6B35]">↑ Thu chuyển khoản trong ca</span>
                                <span className="font-bold font-serif text-[#1A6B35] tabular-nums">
                                    +{formatVnd(transferIn)}
                                </span>
                            </div>
                            {(summary.transferOutVnd ?? 0) > 0 && (
                                <div className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-[#FFF7F7]">
                                    <span className="text-[#9E2A2B]">↓ Chi chuyển khoản</span>
                                    <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                        −{formatVnd(summary.transferOutVnd ?? 0)}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                <span className="font-bold text-[#1A1A1A]">Ròng chuyển khoản</span>
                                <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                    {formatVnd(summary.transferVnd)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Chi phí vận hành ───────────────────────────── */}
                    {(summary.fishBuybackVnd > 0 || summary.otherExpenseVnd > 0) && (
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E2A2B] px-0.5">
                                Chi phí vận hành
                            </p>
                            <div className="rounded-xs border border-[#CCCCCC] bg-white divide-y divide-[#E0E0E0]">
                                {summary.fishBuybackVnd > 0 && (
                                    <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                        <span className="text-[#1A1A1A]">Chi trả thu mua cá</span>
                                        <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                            −{formatVnd(summary.fishBuybackVnd)}
                                        </span>
                                    </div>
                                )}
                                {summary.otherExpenseVnd > 0 && (
                                    <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                        <span className="text-[#1A1A1A]">Chi phí khác</span>
                                        <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">
                                            −{formatVnd(summary.otherExpenseVnd)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Breakdown: Vé câu ──────────────────────────── */}
                    {breakdown && (
                        <div className="space-y-3.5">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between px-0.5">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B]">
                                        Vé câu &amp; Gói dịch vụ
                                    </p>
                                    <span className="text-xs text-[#555555]">
                                        {breakdown.sessions.total} vé ({breakdown.sessions.completed} xong, {breakdown.sessions.active} đang câu{breakdown.sessions.cancelled > 0 ? `, ${breakdown.sessions.cancelled} hủy` : ""})
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

                            {/* Hàng hóa & Gia hạn */}
                            {(breakdown.products.items.length > 0 || breakdown.services.extensionsCount > 0) && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-0.5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B]">
                                            Hàng hóa &amp; Gia hạn
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
                                        {breakdown.products.items.map((prod) => (
                                            <div key={prod.name} className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-[#FAFAF7] transition-colors">
                                                <div>
                                                    <span className="font-semibold text-[#1A1A1A]">{prod.name}</span>
                                                    <span className="ml-2 text-[#555555]">(SL: {prod.quantity})</span>
                                                </div>
                                                <span className="font-bold font-serif text-[#1A1A1A] tabular-nums">
                                                    {formatVnd(prod.totalVnd)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Kho hàng */}
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

                    {/* ── Thông tin chốt ca (if closed) ──────────────── */}
                    {shift.isClosed && shiftClose && (
                        <div className="border border-[#CCCCCC] bg-[#FAFAF7] p-3 space-y-2 text-xs text-[#1A1A1A] rounded-xs">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C4C3B] mb-2">
                                Thông tin chốt ca
                            </p>
                            <div className="flex items-center justify-between font-bold">
                                <span>Thời gian chốt ca:</span>
                                <span className="tabular-nums font-serif">{formatDateTime(shiftClose.closedAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#555555]">Người bàn giao:</span>
                                <span className="font-bold text-[#1A1A1A]">
                                    {shiftClose.closedBy || "Quản trị viên"}
                                </span>
                            </div>
                            {shiftClose.receivedBy && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[#555555]">Người nhận bàn giao:</span>
                                    <span className="font-bold text-[#1A1A1A]">{shiftClose.receivedBy}</span>
                                </div>
                            )}
                            {shiftClose.note && (
                                <div className="pt-1 text-xs text-[#555555] border-t border-[#E0E0E0] mt-1">
                                    Ghi chú: {shiftClose.note}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xs bg-[#2C4C3B] hover:bg-[#233D2F] py-2 px-3 text-xs font-bold text-white transition-colors cursor-pointer active:scale-[0.99]"
                            >
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                </svg>
                                <span>In biên bản bàn giao ca</span>
                            </button>
                        </div>
                    )}

                    {/* ── Action Buttons ──────────────────────────────── */}
                    <div className="space-y-2">
                        {!shift.isClosed && (
                            <div>
                                {canCloseShift ? (
                                    <Button
                                        type="button"
                                        size="lg"
                                        variant="primary"
                                        onClick={openModal}
                                        className="w-full text-sm font-bold cursor-pointer"
                                    >
                                        Xem và chốt ca bàn giao
                                    </Button>
                                ) : (
                                    <div className="rounded-xs border border-[#CCCCCC] bg-white px-3.5 py-2.5 text-center text-xs text-[#555555]">
                                        Chỉ Chủ hồ hoặc Quản lý mới có quyền chốt ca.
                                    </div>
                                )}
                            </div>
                        )}

                        {!shift.isClosed && (
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xs border border-slate-300 bg-white hover:bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                            >
                                <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                </svg>
                                <span>In phiếu đối soát tạm tính</span>
                            </button>
                        )}
                    </div>
                </main>

                {/* ── Print area (hidden on screen) ──────────────── */}
                <PrintReceipt
                    lakeName={lakeName}
                    shift={shift}
                    summary={summary}
                    breakdown={breakdown}
                    actualCashVnd={shift.isClosed ? (shiftClose?.actualCashVnd ?? undefined) : actualCashParsed}
                    expectedCashVnd={shift.isClosed ? closedExpectedCash : expectedCashVnd}
                    differenceVnd={shift.isClosed ? (shiftClose?.cashDifferenceVnd ?? undefined) : differenceVnd}
                    differenceReason={shift.isClosed ? (shiftClose?.differenceReason ?? undefined) : differenceReason}
                    closedBy={shift.isClosed ? (shiftClose?.closedBy ?? undefined) : undefined}
                    receivedBy={shift.isClosed ? (shiftClose?.receivedBy ?? undefined) : undefined}
                    note={shift.isClosed ? (shiftClose?.note ?? undefined) : undefined}
                    closedAt={shift.isClosed ? (shiftClose?.closedAt ?? undefined) : undefined}
                />

                {/* ── Chốt ca Modal ───────────────────────────────── */}
                {isModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 modal-backdrop-animate font-serif"
                        onClick={onBackdropClick}
                    >
                        <div className="w-full max-w-sm sm:rounded-xs rounded-t-2xl bg-white border border-[#CCCCCC] overflow-hidden flex flex-col modal-content-animate font-serif max-h-[90dvh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[#E0E0E0] p-4 sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">
                                        Chốt Ca &amp; Bàn Giao
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-7 w-7 rounded-xs border border-[#CCCCCC] bg-[#F2F2F0] flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAEAE6] transition-colors cursor-pointer"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {error && <InlineAlert type="error" message={error} />}

                                {/* Bảng đối soát trong modal */}
                                <div className="rounded-xs border border-[#CCCCCC] bg-[#FAFAF7] divide-y divide-[#E0E0E0] text-xs overflow-hidden">
                                    <div className="px-3 py-1.5 bg-[#2C4C3B]">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-white">Đối soát tiền mặt</span>
                                    </div>
                                    <div className="flex justify-between px-3 py-2">
                                        <span className="text-[#555555]">Đầu ca</span>
                                        <span className="font-bold font-serif tabular-nums">{formatVnd(openingCash)}</span>
                                    </div>
                                    <div className="flex justify-between px-3 py-2 bg-[#F0FDF4]">
                                        <span className="text-[#1A6B35]">+ Thu tiền mặt</span>
                                        <span className="font-bold font-serif text-[#1A6B35] tabular-nums">+{formatVnd(cashIn)}</span>
                                    </div>
                                    {cashOut > 0 && (
                                        <div className="flex justify-between px-3 py-2 bg-[#FFF7F7]">
                                            <span className="text-[#9E2A2B]">− Chi tiền mặt</span>
                                            <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">−{formatVnd(cashOut)}</span>
                                        </div>
                                    )}
                                    {summary.fishBuybackVnd > 0 && (
                                        <div className="flex justify-between px-3 py-2 bg-[#FFF7F7]">
                                            <span className="text-[#9E2A2B]">− Chi mua cá</span>
                                            <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">−{formatVnd(summary.fishBuybackVnd)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between px-3 py-2.5 bg-[#F0EFE6] font-bold border-t-2 border-[#2C4C3B]">
                                        <span className="text-[#1A1A1A]">Dự kiến bàn giao</span>
                                        <span className="font-serif tabular-nums text-[#2C4C3B]">{formatVnd(expectedCashVnd)}</span>
                                    </div>
                                    {/* Revenue */}
                                    <div className="px-3 py-1.5 bg-[#2C4C3B] mt-0">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-white">Doanh thu ca</span>
                                    </div>
                                    <div className="flex justify-between px-3 py-2">
                                        <span className="text-[#555555]">Doanh thu</span>
                                        <span className="font-bold font-serif text-[#2C4C3B] tabular-nums">{formatVnd(summary.revenueVnd)}</span>
                                    </div>
                                    <div className="flex justify-between px-3 py-2">
                                        <span className="text-[#555555]">Chi phí</span>
                                        <span className="font-bold font-serif text-[#9E2A2B] tabular-nums">−{formatVnd(summary.expenseVnd)}</span>
                                    </div>
                                    <div className="flex justify-between px-3 py-2.5 font-bold">
                                        <span>Lợi nhuận ròng</span>
                                        <span className="font-serif tabular-nums text-[#2C4C3B]">{formatVnd(summary.netProfitVnd)}</span>
                                    </div>
                                </div>

                                {/* Nhập tiền thực tế */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#1A1A1A]">
                                        Tiền mặt thực tế đếm được
                                        <span className="ml-1 text-[#777] font-normal">(để trống nếu không kiểm tiền)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={0}
                                            step={1000}
                                            placeholder={`Dự kiến: ${expectedCashVnd.toLocaleString("vi-VN")}đ`}
                                            value={actualCashInput}
                                            onChange={(e) => {
                                                setActualCashInput(e.target.value);
                                                setError(null);
                                            }}
                                            className="w-full rounded-xs border border-[#CCCCCC] bg-white p-2.5 pr-8 text-xs text-[#1A1A1A] focus:border-[#2C4C3B] focus:outline-none font-serif tabular-nums"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#777]">đ</span>
                                    </div>
                                    {/* Real-time difference display */}
                                    {differenceVnd !== undefined && (
                                        <div className={`rounded-xs px-2.5 py-1.5 text-xs font-bold flex items-center justify-between ${differenceVnd === 0 ? "bg-[#DCFCE7] text-[#1A6B35]" : differenceVnd < 0 ? "bg-[#FEE2E2] text-[#9E2A2B]" : "bg-[#FEF9C3] text-[#854D0E]"}`}>
                                            <span>
                                                {differenceVnd === 0 ? "✓ Khớp tiền mặt" : differenceVnd < 0 ? "⚠ Thiếu" : "⚠ Thừa"}
                                            </span>
                                            <span className="font-serif tabular-nums">
                                                {differenceVnd !== 0 ? `${differenceVnd > 0 ? "+" : ""}${formatVnd(differenceVnd)}` : "Không chênh lệch"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Lý do chênh lệch (bắt buộc khi lệch) */}
                                {hasDifference && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#9E2A2B]">
                                            Lý do chênh lệch <span className="text-red-600">*</span>
                                        </label>
                                        <textarea
                                            rows={2}
                                            maxLength={500}
                                            placeholder="Bắt buộc nhập lý do khi có chênh lệch tiền mặt..."
                                            value={differenceReason}
                                            onChange={(e) => {
                                                setDifferenceReason(e.target.value);
                                                setError(null);
                                            }}
                                            className="w-full rounded-xs border border-[#F87171] bg-white p-2.5 text-xs text-[#1A1A1A] focus:border-[#9E2A2B] focus:outline-none font-serif"
                                        />
                                    </div>
                                )}

                                {/* Nhân viên nhận bàn giao */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#1A1A1A]">
                                        Nhân viên nhận bàn giao ca sau
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        placeholder="Tên nhân viên nhận ca..."
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className="w-full rounded-xs border border-[#CCCCCC] bg-white p-2.5 text-xs text-[#1A1A1A] focus:border-[#2C4C3B] focus:outline-none font-serif"
                                    />
                                </div>

                                {/* Ghi chú */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#1A1A1A]">
                                        Ghi chú bàn giao
                                        <span className="ml-1 text-[#777] font-normal">(tùy chọn)</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        maxLength={500}
                                        placeholder="Tình trạng hồ, sự cố đặc biệt, dặn dò ca sau..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full rounded-xs border border-[#CCCCCC] bg-white p-2.5 text-xs text-[#1A1A1A] focus:border-[#2C4C3B] focus:outline-none font-serif"
                                    />
                                </div>

                                <InlineAlert
                                    type="warning"
                                    message="Số liệu tài chính sẽ được khóa sau khi chốt ca. Hệ thống sẽ tự động mở ca mới."
                                />

                                {/* Buttons */}
                                <div className="flex items-center gap-2 pb-2">
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
                    </div>
                )}

                <MobileBottomNav />
            </div>
        </div>
    );
}
