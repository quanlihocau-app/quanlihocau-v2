"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
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
        activeList?: Array<{
            id: string;
            customerName: string;
            hutName: string;
            startTime: string;
            pendingAmountVnd: number;
            packageName: string;
        }>;
        totalActivePendingVnd?: number;
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
    expectedCashVnd?: number;
}

export interface ShiftCloseInfo {
    id?: string;
    closedAt: string;
    closedBy: string | null;
    receivedBy?: string | null;
    note: string | null;
    actualCashVnd?: number | null;
    cashDifferenceVnd?: number;
    differenceReason?: string | null;
}

export interface RecentShiftItem {
    id: string;
    startTime: string;
    endTime: string | null;
    isClosed: boolean;
    revenueVnd: number;
    cashVnd: number;
    closedBy?: string | null;
}

interface DailyReportViewProps {
    shift: ShiftInfo;
    summary: DailyReportSummary;
    breakdown?: DailyReportBreakdown | null;
    shiftClose: ShiftCloseInfo | null;
    canCloseShift: boolean;
    lakeName: string;
    recentShifts?: RecentShiftItem[];
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
                <div style={{ fontWeight: "bold", marginBottom: "2px" }}>ĐỐI SOÁT TIỀN MẶT KÉT</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #000", marginTop: "2px", paddingTop: "2px" }}>
                    <span>Dự kiến trong két:</span>
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
                <div style={{ fontWeight: "bold", marginBottom: "2px" }}>CHUYỂN KHOẢN (NGÂN HÀNG)</div>
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
                    <span>Lợi nhuận ròng:</span>
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

// Báo cáo đầy đủ tốn khoảng 15 query mỗi lần. Poll 5 giây (và cả 60 giây) với
// nhiều máy mở cả ngày vượt 200.000 operation/tháng của Prisma Postgres Free.
// Tab hiện và còn phiên đang câu: 15 phút. Tab hiện nhưng không ai câu: 30 phút.
// Tab ẩn hoặc ca đã đóng: không gọi.
const ACTIVE_POLL_MS = 15 * 60 * 1000;
const IDLE_POLL_MS = 30 * 60 * 1000;

export function DailyReportView({
    shift: initialShift,
    summary: initialSummary,
    breakdown: initialBreakdown,
    shiftClose: initialShiftClose,
    canCloseShift,
    lakeName,
    recentShifts = [],
}: DailyReportViewProps) {
    const router = useRouter();

    // Live state
    const [shift, setShift] = useState<ShiftInfo>(initialShift);
    const [summary, setSummary] = useState<DailyReportSummary>(initialSummary);
    const [breakdown, setBreakdown] = useState<DailyReportBreakdown | null | undefined>(initialBreakdown);
    const [shiftClose, setShiftClose] = useState<ShiftCloseInfo | null>(initialShiftClose);
    const [shiftsHistory, setShiftsHistory] = useState<RecentShiftItem[]>(recentShifts);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [selectedShiftId, setSelectedShiftId] = useState<string>(initialShift.id);

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

    // ── Fetch Live Data Function ──────────────────────────────
    const fetchLiveData = useCallback(async (targetShiftId?: string, isManual = false) => {
        if (isManual) setIsRefreshing(true);
        try {
            const shiftParam = targetShiftId ? `?shiftId=${targetShiftId}` : "";
            const res = await fetch(`/api/reports/daily${shiftParam}`, { credentials: "same-origin" });
            if (res.ok) {
                const data = await res.json();
                if (data.shift) setShift(data.shift);
                if (data.summary) setSummary(data.summary);
                if (data.breakdown) setBreakdown(data.breakdown);
                setShiftClose(data.shiftClose || null);
                if (data.recentShifts) setShiftsHistory(data.recentShifts);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Lỗi cập nhật số ca realtime:", err);
        } finally {
            if (isManual) setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (shift.isClosed) return;

        let intervalId: number | undefined;
        const activeCount = breakdown?.sessions.active ?? 0;
        const delay = activeCount > 0 ? ACTIVE_POLL_MS : IDLE_POLL_MS;
        const doFetch = () => {
            fetchLiveData(selectedShiftId === shift.id && !shift.isClosed ? undefined : selectedShiftId);
        };
        const stop = () => {
            if (intervalId !== undefined) {
                window.clearInterval(intervalId);
                intervalId = undefined;
            }
        };
        const start = () => {
            if (intervalId !== undefined || document.visibilityState !== "visible") return;
            intervalId = window.setInterval(doFetch, delay);
        };
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                doFetch();
                start();
            } else {
                stop();
            }
        };

        start();
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            stop();
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [shift.isClosed, shift.id, selectedShiftId, fetchLiveData, breakdown?.sessions.active]);

    // ── Xử lý chuyển đổi ca lịch sử ──────────────────────────
    function handleSelectShift(shiftId: string) {
        setSelectedShiftId(shiftId);
        fetchLiveData(shiftId, true);
    }

    // ── Derived values ──────────────────────────────────────
    const openingCash = shift.openingCashVnd ?? 0;
    const cashIn = summary.cashInVnd ?? summary.cashVnd;
    const cashOut = summary.cashOutVnd ?? 0;
    const transferIn = summary.transferInVnd ?? summary.transferVnd;

    // Accurate expected cash in drawer = opening + cash collected - cash refunded/spent
    const expectedCashVnd = shift.expectedCashVnd !== undefined
        ? shift.expectedCashVnd
        : openingCash + cashIn - cashOut;

    const actualCashParsed =
        actualCashInput.trim() !== ""
            ? parseInt(actualCashInput.replace(/[^0-9]/g, ""), 10)
            : undefined;
    const differenceVnd =
        actualCashParsed !== undefined ? actualCashParsed - expectedCashVnd : undefined;
    const hasDifference = differenceVnd !== undefined && differenceVnd !== 0;
    const [differenceReason, setDifferenceReason] = useState("");

    // Quick cash helper buttons
    function setQuickCash(amount: number) {
        setActualCashInput(amount.toString());
        setError(null);
    }

    // ── Submit Chốt ca ──────────────────────────────────────
    async function handleConfirmClose() {
        if (hasDifference && !differenceReason.trim()) {
            setError("Tiền mặt thực tế đếm được có chênh lệch. Bắt buộc phải nhập lý do giải trình.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

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

            setSuccessMessage("Đã chốt ca và bàn giao thành công! Hệ thống đã tạo ca mới.");
            setIsSubmitting(false);

            setTimeout(() => {
                setIsModalOpen(false);
                fetchLiveData(undefined, true);
                router.refresh();
            }, 1000);
        } catch {
            setError("Lỗi kết nối mạng khi chốt ca. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    function openModal() {
        setError(null);
        setSuccessMessage(null);
        idempotencyKeyRef.current = null;
        setActualCashInput(expectedCashVnd > 0 ? expectedCashVnd.toString() : "");
        setDifferenceReason("");
        setIsModalOpen(true);
    }

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

                    {/* ── Realtime Status Bar & Controls ──────────────── */}
                    <div className="w-full rounded-2xl border border-emerald-200 bg-linear-to-r from-[#F0FDF4] via-white to-[#F0FDF4] px-4 py-3 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {!shift.isClosed ? (
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                                    </span>
                                ) : (
                                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                                )}
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h1 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-800 font-serif">
                                            Sổ Ca &amp; Đối Soát Tiền Mặt
                                        </h1>
                                        {!shift.isClosed && (
                                            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800 tracking-wider">
                                                REALTIME
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        Cập nhật: {lastUpdated.toLocaleTimeString("vi-VN")}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => fetchLiveData(selectedShiftId, true)}
                                    disabled={isRefreshing}
                                    title="Làm mới tức thời"
                                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                                >
                                    <svg
                                        className={`h-3.5 w-3.5 text-emerald-700 ${isRefreshing ? "animate-spin" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    <span>Làm mới</span>
                                </button>
                            </div>
                        </div>

                        {/* Shift Selector Pill Tabs */}
                        {shiftsHistory.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Chọn ca:</span>
                                {shiftsHistory.map((s, idx) => {
                                    const isCurrent = s.id === shift.id;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => handleSelectShift(s.id)}
                                            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                                isCurrent
                                                    ? "bg-[#2C4C3B] text-white shadow-xs"
                                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            {!s.isClosed ? "🟢 Ca hiện tại" : `Ca ${formatTime(s.startTime)}`}
                                            {idx === 0 && !s.isClosed ? "" : ` (${formatDateTime(s.startTime).split(" ")[1]})`}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {successMessage && <InlineAlert type="success" message={successMessage} />}

                    {/* ── Hero: Lợi Nhuận Ròng Thuần Ca Này ───────────── */}
                    <div className="rounded-2xl bg-linear-to-br from-[#1E3A2B] to-[#2C4C3B] p-4 text-white shadow-lg space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                                Lợi nhuận ròng của ca
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${shift.isClosed ? "bg-slate-200/20 text-slate-200" : "bg-emerald-400/20 text-emerald-300"}`}>
                                {shift.isClosed ? "CA ĐÃ ĐÓNG" : "CA ĐANG MỞ"}
                            </span>
                        </div>
                        <p className="text-3xl font-black font-serif text-white tabular-nums tracking-tight">
                            {formatVnd(summary.netProfitVnd)}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-700/60 text-xs">
                            <div>
                                <span className="text-[11px] text-emerald-200">Tổng doanh thu:</span>
                                <p className="font-bold text-white text-sm">{formatVnd(summary.revenueVnd)}</p>
                            </div>
                            <div>
                                <span className="text-[11px] text-emerald-200">Tổng chi phí:</span>
                                <p className="font-bold text-red-300 text-sm">{formatVnd(summary.expenseVnd)}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── KHỐI 1: ĐỐI SOÁT TIỀN MẶT TRONG KÉT (Cash in Drawer) ── */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">💼</span>
                                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Đối Soát Tiền Mặt Trong Két
                                </h2>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                Chuẩn POS
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 text-xs font-serif">
                            {/* Tiền đầu ca */}
                            <div className="flex items-center justify-between py-2 text-slate-600">
                                <span className="flex items-center gap-1.5">
                                    <span className="text-slate-400">1.</span>
                                    <span>Tiền mặt đầu ca (Bàn giao ca trước):</span>
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums text-sm">
                                    {formatVnd(openingCash)}
                                </span>
                            </div>

                            {/* Thu tiền mặt */}
                            <div className="flex items-center justify-between py-2 bg-emerald-50/60 px-2 rounded-lg text-emerald-800">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <span className="text-emerald-500">2.</span>
                                    <span>(+) Tổng thu tiền mặt trong ca:</span>
                                </span>
                                <span className="font-extrabold text-emerald-700 tabular-nums text-sm">
                                    +{formatVnd(cashIn)}
                                </span>
                            </div>

                            {/* Chi tiền mặt */}
                            <div className="flex items-center justify-between py-2 bg-red-50/60 px-2 rounded-lg text-red-800 mt-1">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <span className="text-red-400">3.</span>
                                    <span>(−) Tổng chi tiền mặt trong ca:</span>
                                </span>
                                <span className="font-extrabold text-red-600 tabular-nums text-sm">
                                    −{formatVnd(cashOut)}
                                </span>
                            </div>
                            {cashOut > 0 && (
                                <p className="text-[10px] text-slate-500 italic pl-5 py-1">
                                    (Bao gồm chi mua lại cá trả tiền mặt, thối tiền thừa và chi phí khác)
                                </p>
                            )}

                            {/* DỰ KIẾN TIỀN MẶT TRONG KÉT */}
                            <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-linear-to-r from-emerald-100/70 via-emerald-50 to-emerald-100/70 border border-emerald-300 mt-2">
                                <div>
                                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                                        = TIỀN MẶT DỰ KIẾN TRONG KÉT
                                    </span>
                                    <p className="text-[10px] text-emerald-800 font-sans mt-0.5">
                                        (Đầu ca + Thu tiền mặt − Chi tiền mặt)
                                    </p>
                                </div>
                                <span className="text-lg sm:text-xl font-black text-[#1E3A2B] tabular-nums">
                                    {formatVnd(shift.isClosed && shiftClose?.actualCashVnd != null ? closedExpectedCash : expectedCashVnd)}
                                </span>
                            </div>

                            {/* THỰC TẾ ĐẾM ĐƯỢC (Nếu đã chốt) */}
                            {shift.isClosed && shiftClose?.actualCashVnd != null && (
                                <div className="mt-2 pt-2 space-y-1.5">
                                    <div className="flex items-center justify-between py-1 text-slate-800">
                                        <span className="font-bold">Tiền thực tế kiểm đếm lúc chốt:</span>
                                        <span className="text-base font-black text-slate-900 tabular-nums">
                                            {formatVnd(shiftClose.actualCashVnd)}
                                        </span>
                                    </div>

                                    {(shiftClose.cashDifferenceVnd ?? 0) === 0 ? (
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg font-bold border border-emerald-200">
                                            <span>✓</span>
                                            <span>Khớp 100% tiền mặt (Không lệch)</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs bg-red-50 p-2 rounded-lg font-bold text-red-700 border border-red-200">
                                                <span>Chênh lệch két tiền:</span>
                                                <span className="text-sm font-black tabular-nums">
                                                    {(shiftClose.cashDifferenceVnd ?? 0) > 0 ? "+" : ""}
                                                    {formatVnd(shiftClose.cashDifferenceVnd ?? 0)}
                                                </span>
                                            </div>
                                            {shiftClose.differenceReason && (
                                                <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                                    <strong>Lý do giải trình:</strong> {shiftClose.differenceReason}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── KHỐI 2: DÒNG TIỀN CHUYỂN KHOẢN (NGÂN HÀNG) ──────── */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">🏦</span>
                                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Tài Khoản Ngân Hàng (Chuyển Khoản)
                                </h2>
                            </div>
                            <span className="text-[10px] text-slate-500 italic">
                                Chạy thẳng vào TK chủ hồ
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 text-xs font-serif">
                            <div className="flex items-center justify-between py-2 text-slate-700">
                                <span>↑ Thu chuyển khoản (VietQR / App):</span>
                                <span className="font-bold text-emerald-700 tabular-nums">
                                    +{formatVnd(transferIn)}
                                </span>
                            </div>
                            {(summary.transferOutVnd ?? 0) > 0 && (
                                <div className="flex items-center justify-between py-2 text-slate-700">
                                    <span>↓ Chi chuyển khoản:</span>
                                    <span className="font-bold text-red-600 tabular-nums">
                                        −{formatVnd(summary.transferOutVnd ?? 0)}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between py-2.5 font-bold text-slate-900 bg-slate-50 px-2 rounded-lg mt-1">
                                <span>Tổng ròng chuyển khoản:</span>
                                <span className="font-black tabular-nums text-sm">
                                    {formatVnd(summary.transferVnd)}
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                            * Lưu ý: Tiền chuyển khoản nằm trong tài khoản ngân hàng của hồ, không nằm trong két tiền mặt của nhân viên.
                        </p>
                    </div>

                    {/* ── KHỐI 3: PHIÊN CÂU ĐANG DIỄN RA (realtime) ─────────────── */}
                    {!shift.isClosed && breakdown && (breakdown.sessions.active > 0) && (
                        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                    </span>
                                    <h2 className="text-xs font-black uppercase tracking-wider text-amber-900">
                                        Phiên câu đang diễn ra
                                    </h2>
                                </div>
                                <span className="rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5">
                                    {breakdown.sessions.active} đang câu
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {breakdown.sessions.activeList && breakdown.sessions.activeList.length > 0 ? (
                                    breakdown.sessions.activeList.map((sess) => (
                                        <div key={sess.id} className="flex items-center justify-between rounded-xl bg-white border border-amber-200 px-3 py-2 text-xs">
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-900 truncate">{sess.customerName}</p>
                                                <p className="text-slate-500 text-[10px] mt-0.5">
                                                    🎣 {sess.hutName} · {sess.packageName}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                {sess.pendingAmountVnd > 0 ? (
                                                    <span className="font-black text-amber-700 tabular-nums">
                                                        Còn {formatVnd(sess.pendingAmountVnd)}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-600 font-bold">Đã thanh toán</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-xs text-amber-700 py-2">
                                        {breakdown.sessions.active} phiên đang mở
                                    </div>
                                )}
                            </div>
                            {(breakdown.sessions.totalActivePendingVnd ?? 0) > 0 && (
                                <div className="flex items-center justify-between rounded-xl bg-amber-100 border border-amber-300 px-3 py-2 text-xs">
                                    <span className="font-bold text-amber-900">⚠ Tổng tiền chưa thu của ca:</span>
                                    <span className="font-black text-amber-900 tabular-nums text-sm">
                                        {formatVnd(breakdown.sessions.totalActivePendingVnd ?? 0)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── KHỐI 4: CHI TIẾT VÉ CÂU & HÀNG HÓA ───────────────── */}
                    {breakdown && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base">🎣</span>
                                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                        Hoạt Động Vé Câu &amp; Dịch Vụ
                                    </h2>
                                </div>
                                <span className="text-xs font-bold text-slate-600">
                                    {breakdown.sessions.total} vé ({breakdown.sessions.completed} xong, {breakdown.sessions.active} đang câu)
                                </span>
                            </div>

                            <div className="space-y-2 text-xs">
                                {breakdown.sessions.packages.map((pkg) => (
                                    <div key={pkg.packageName} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50">
                                        <div>
                                            <span className="font-bold text-slate-800">{pkg.packageName}</span>
                                            <span className="text-slate-500 ml-1.5">({pkg.count} vé)</span>
                                        </div>
                                        <span className="font-bold tabular-nums text-slate-900">
                                            {formatVnd(pkg.totalVnd)}
                                        </span>
                                    </div>
                                ))}

                                {breakdown.services.extensionsCount > 0 && (
                                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-amber-50 text-amber-900">
                                        <div>
                                            <span className="font-bold">Gia hạn thêm giờ câu</span>
                                            <span className="text-amber-700 ml-1.5">({breakdown.services.extensionsCount} lần)</span>
                                        </div>
                                        <span className="font-bold tabular-nums">
                                            {formatVnd(breakdown.services.extensionsTotalVnd)}
                                        </span>
                                    </div>
                                )}

                                {breakdown.products.items.map((prod) => (
                                    <div key={prod.name} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-slate-100">
                                        <div>
                                            <span className="font-medium text-slate-800">{prod.name}</span>
                                            <span className="text-slate-400 ml-1.5">(SL: {prod.quantity})</span>
                                        </div>
                                        <span className="font-bold tabular-nums text-slate-900">
                                            {formatVnd(prod.totalVnd)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── THÔNG TIN BÀN GIAO CA (Nếu đã chốt) ──────────────── */}
                    {shift.isClosed && shiftClose && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Biên Bản Bàn Giao Ca
                            </h3>
                            <div className="divide-y divide-slate-200">
                                <div className="flex justify-between py-1.5">
                                    <span className="text-slate-500">Thời gian chốt:</span>
                                    <span className="font-bold text-slate-900">{formatDateTime(shiftClose.closedAt)}</span>
                                </div>
                                <div className="flex justify-between py-1.5">
                                    <span className="text-slate-500">Nhân viên bàn giao:</span>
                                    <span className="font-bold text-slate-900">{shiftClose.closedBy || "Quản trị viên"}</span>
                                </div>
                                {shiftClose.receivedBy && (
                                    <div className="flex justify-between py-1.5">
                                        <span className="text-slate-500">Nhân viên nhận ca:</span>
                                        <span className="font-bold text-slate-900">{shiftClose.receivedBy}</span>
                                    </div>
                                )}
                                {shiftClose.note && (
                                    <div className="py-2 text-slate-600">
                                        <p className="font-bold text-slate-700">Ghi chú bàn giao:</p>
                                        <p className="mt-0.5 whitespace-pre-wrap">{shiftClose.note}</p>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full mt-2 rounded-xl bg-[#2C4C3B] hover:bg-[#233D2F] py-2.5 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                            >
                                🖨️ In biên bản bàn giao ca
                            </button>
                        </div>
                    )}

                    {/* ── HÀNH ĐỘNG: CHỐT CA HÀNG NGÀY ────────────────────── */}
                    <div className="pt-2 space-y-2">
                        {!shift.isClosed ? (
                            canCloseShift ? (
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="primary"
                                    onClick={openModal}
                                    className="w-full text-sm font-black py-3.5 shadow-lg bg-[#2C4C3B] hover:bg-[#213B2E] text-white rounded-xl cursor-pointer active:scale-98"
                                >
                                    🔒 ĐỐI SOÁT &amp; CHỐT CA BÀN GIAO
                                </Button>
                            ) : (
                                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs text-slate-500">
                                    Chỉ Chủ hồ hoặc Quản lý ca mới có quyền chốt ca.
                                </div>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-3 text-xs font-bold text-slate-700 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                🖨️ In lại phiếu ca này
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

                {/* ── CHỐT CA MODAL CHUYÊN NGHIỆP ─────────────────────── */}
                {isModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-2xs modal-backdrop-animate font-serif"
                        onClick={onBackdropClick}
                    >
                        <div className="w-full max-w-md sm:rounded-2xl rounded-t-3xl bg-white border border-slate-200 overflow-hidden flex flex-col modal-content-animate font-serif max-h-[92dvh] overflow-y-auto shadow-2xl">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-4 sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAEFEA] text-[#2C4C3B]">
                                        💰
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                            Chốt Ca &amp; Bàn Giao Két
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-sans">
                                            Đối soát tiền mặt thực tế và bàn giao ca sau
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {error && <InlineAlert type="error" message={error} />}

                                {/* Bảng tóm tắt đối soát */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Tiền mặt đầu ca:</span>
                                        <span className="font-bold text-slate-900 tabular-nums">{formatVnd(openingCash)}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-700">
                                        <span>(+) Thu tiền mặt trong ca:</span>
                                        <span className="font-bold tabular-nums">+{formatVnd(cashIn)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>(−) Chi tiền mặt trong ca:</span>
                                        <span className="font-bold tabular-nums">−{formatVnd(cashOut)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-slate-900">
                                        <span className="text-xs uppercase">Dự kiến trong két:</span>
                                        <span className="text-base text-emerald-800 tabular-nums">{formatVnd(expectedCashVnd)}</span>
                                    </div>
                                </div>

                                {/* Cảnh báo phiên câu chưa thanh toán */}
                                {breakdown && (breakdown.sessions.totalActivePendingVnd ?? 0) > 0 && (
                                    <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs">
                                        <div className="flex items-center gap-1.5 font-black text-amber-900 mb-1">
                                            <span>⚠</span>
                                            <span>Cảnh báo: Còn phiên câu chưa thanh toán!</span>
                                        </div>
                                        <p className="text-amber-800">
                                            Có <strong>{breakdown.sessions.active} phiên</strong> đang câu chưa kết thúc với tổng tiền chưa thu là{" "}
                                            <strong>{formatVnd(breakdown.sessions.totalActivePendingVnd ?? 0)}</strong>.
                                            Hãy chốt các phiên này trước hoặc ghi chú rõ trong phần bàn giao.
                                        </p>
                                    </div>
                                )}

                                {/* Nhập tiền thực tế đếm được */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                                        Tiền mặt thực tế đếm trong két: <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={actualCashInput ? Number(actualCashInput).toLocaleString("vi-VN") : ""}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/[^0-9]/g, "");
                                                setActualCashInput(raw);
                                                setError(null);
                                            }}
                                            className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-8 text-base font-black text-slate-900 focus:border-[#2C4C3B] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-serif tabular-nums shadow-2xs"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span>
                                    </div>

                                    {/* Nút bấm nhanh */}
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setQuickCash(expectedCashVnd)}
                                            className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                                        >
                                            = Khớp dự kiến ({formatVnd(expectedCashVnd)})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickCash(0)}
                                            className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                        >
                                            0 đ
                                        </button>
                                    </div>

                                    {/* Real-time Status Card */}
                                    {actualCashParsed !== undefined && (
                                        <div className={`rounded-xl p-3 text-xs font-bold flex items-center justify-between border ${
                                            differenceVnd === 0
                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                : differenceVnd! < 0
                                                ? "bg-red-50 text-red-800 border-red-200"
                                                : "bg-amber-50 text-amber-800 border-amber-200"
                                        }`}>
                                            <div className="flex items-center gap-1.5">
                                                <span>{differenceVnd === 0 ? "✓" : "⚠"}</span>
                                                <span>
                                                    {differenceVnd === 0
                                                        ? "Khớp 100% tiền mặt"
                                                        : differenceVnd! < 0
                                                        ? "Két thiếu tiền"
                                                        : "Két thừa tiền"}
                                                </span>
                                            </div>
                                            <span className="text-sm font-black tabular-nums">
                                                {differenceVnd !== 0 ? `${differenceVnd! > 0 ? "+" : ""}${formatVnd(differenceVnd!)}` : "0 đ chênh lệch"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Lý do chênh lệch (Bắt buộc nếu lệch) */}
                                {hasDifference && (
                                    <div className="space-y-1.5 rounded-xl bg-red-50/50 p-3 border border-red-200">
                                        <label className="text-xs font-black text-red-700 block">
                                            Lý do chênh lệch tiền mặt <span className="text-red-600">*</span>
                                        </label>
                                        <textarea
                                            rows={2}
                                            maxLength={500}
                                            placeholder="Bắt buộc giải trình lý do thừa/thiếu tiền két..."
                                            value={differenceReason}
                                            onChange={(e) => {
                                                setDifferenceReason(e.target.value);
                                                setError(null);
                                            }}
                                            className="w-full rounded-xl border border-red-300 bg-white p-2.5 text-xs text-slate-900 focus:border-red-500 focus:outline-none font-serif"
                                        />
                                    </div>
                                )}

                                {/* Nhân viên nhận bàn giao ca */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-800">
                                        Nhân viên nhận bàn giao ca sau:
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        placeholder="Tên nhân viên nhận ca..."
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-[#2C4C3B] focus:outline-none font-serif"
                                    />
                                </div>

                                {/* Ghi chú bàn giao */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-800">
                                        Ghi chú dặn dò ca sau (Tùy chọn):
                                    </label>
                                    <textarea
                                        rows={2}
                                        maxLength={500}
                                        placeholder="Cá tồn, dặn dò đồ câu, dặn dò khách..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-[#2C4C3B] focus:outline-none font-serif"
                                    />
                                </div>

                                <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-800">
                                    ℹ️ <strong>Lưu ý:</strong> Sau khi chốt ca, toàn bộ số liệu của ca này sẽ được khóa. Hệ thống sẽ <strong>tự động mở ca mới</strong> và mang số tiền thực tế vừa bàn giao làm <strong>tiền đầu ca mới</strong>.
                                </div>

                                {/* Modal Actions */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        type="button"
                                        size="md"
                                        variant="outline"
                                        disabled={isSubmitting}
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 rounded-xl"
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
                                        className="flex-2 rounded-xl bg-[#2C4C3B] hover:bg-[#20372A] font-bold text-white shadow-md"
                                    >
                                        Xác nhận chốt &amp; Bàn giao
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
