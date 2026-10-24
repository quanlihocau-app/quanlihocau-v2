"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModalPortal } from "@/components/ui/modal-portal";
import { usePrinter } from "@/lib/printing/use-printer";
import { PaymentReceiptData } from "@/lib/printing/types";
import { useNetworkStatus } from "@/lib/network/use-network-status";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
import { PondTransferQr } from "@/components/payments/pond-transfer-qr";

interface SettlementPreviewData {
    session: {
        id: string;
        status: string;
        customerName: string;
        customerPhone: string | null;
        packageName: string;
        packageDurationMinutes: number;
        huts: Array<{ id: string; name: string; areaName: string | null }>;
    };
    invoice: {
        id: string;
        status: string;
        lines: Array<{
            id: string;
            name: string;
            quantity: number;
            unitPrice: number;
            totalVnd: number;
            productId: string | null;
        }>;
        payments: Array<{
            id: string;
            amountVnd: number;
            direction: "IN" | "OUT";
            method: string;
            createdAt: string;
        }>;
    } | null;
    financials: {
        packageTotalVnd: number;
        itemsTotalVnd: number;
        extensionsTotalVnd: number;
        overtimeTotalVnd?: number;
        overtimeMinutes?: number;
        fishBuybackTotalVnd?: number;
        otherTotalVnd: number;
        grossChargeVnd: number;
        invoiceTotalVnd?: number;
        totalPaidVnd: number;
        totalDeductionsVnd?: number;
        netBalanceVnd?: number;
        netDueVnd: number;
        refundVnd: number;
        billVnd?: number;
        fishOffsetVnd?: number;
        cashReturnedVnd?: number;
        settlementSummary?: string;
    };
}

interface SettlementCheckoutModalProps {
    sessionId: string;
    isOpen: boolean;
    onClose: () => void;
    onCompleted?: (sessionId?: string) => void;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

export function SettlementCheckoutModal({
    sessionId,
    isOpen,
    onClose,
    onCompleted,
}: SettlementCheckoutModalProps) {
    const { printPaymentReceipt } = usePrinter();
    const { isOnline } = useNetworkStatus();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [preview, setPreview] = useState<SettlementPreviewData | null>(null);

    // Form inputs
    const [collectAmount, setCollectAmount] = useState<number | string>("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
    const [note, setNote] = useState("");

    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Print question modal state
    const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);
    const [wasPrinted, setWasPrinted] = useState(false);

    // Success & printing state
    const [completedReceipt, setCompletedReceipt] = useState<PaymentReceiptData | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Fast escape key & backdrop dismiss
    const { onBackdropClick } = useModalDismiss({
        isOpen,
        onClose: () => {
            if (isPrintConfirmOpen) {
                setIsPrintConfirmOpen(false);
            } else {
                onClose();
            }
        },
        disabled: isSubmitting,
    });

    // Fetch live figures on open
    useEffect(() => {
        if (!isOpen) return;

        let active = true;

        async function fetchPreview() {
            try {
                const res = await fetch(`/api/fishing-sessions/${sessionId}`);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    if (active) {
                        setLoadError(errData.error || "Không thể tải bảng quyết toán phiên câu.");
                        setLoading(false);
                    }
                    return;
                }

                const data: SettlementPreviewData = await res.json();
                if (active) {
                    setPreview(data);
                    // Default collect amount to netDue if positive
                    if (data.financials.netDueVnd > 0) {
                        setCollectAmount(data.financials.netDueVnd);
                    } else {
                        setCollectAmount(0);
                    }
                    setLoading(false);
                }
            } catch {
                if (active) {
                    setLoadError("Lỗi kết nối mạng khi tải dữ liệu quyết toán.");
                    setLoading(false);
                }
            }
        }

        fetchPreview();

        return () => {
            active = false;
        };
    }, [sessionId, isOpen]);

    async function handlePrint(isReprint = false) {
        if (!completedReceipt) return;

        const receiptToPrint: PaymentReceiptData = {
            ...completedReceipt,
            isReprint,
        };

        setIsPrinting(true);
        try {
            const result = await printPaymentReceipt(receiptToPrint, {
                jobId: `checkout-reprint-${completedReceipt.invoiceId}-${Date.now()}`,
                manual: true,
            });
            if (!result.success) setSubmitError(result.error || "Không gửi được hóa đơn đến máy in.");
            else setWasPrinted(true);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Không gửi được hóa đơn đến máy in.");
        } finally {
            setIsPrinting(false);
        }
    }

    async function handleConfirmCheckout(shouldPrint: boolean) {
        if (!preview) return;

        setIsSubmitting(true);
        setSubmitError(null);
        setIsPrintConfirmOpen(false);

        const netDue = preview.financials.netDueVnd;
        const refundVnd = Math.round(preview.financials.refundVnd);

        const rawCollect =
            typeof collectAmount === "string" ? Number(collectAmount) : collectAmount;
        const numCollect = Math.round(rawCollect);

        const payload: {
            action: "COMPLETE";
            settlement?: {
                amountVnd?: number;
                paymentMethod?: "CASH" | "BANK_TRANSFER";
                refundVnd?: number;
                note?: string;
            };
        } = {
            action: "COMPLETE",
            settlement: {
                paymentMethod,
                note: note.trim() || undefined,
            },
        };

        if (netDue > 0 && numCollect > 0) {
            payload.settlement!.amountVnd = numCollect;
        } else if (refundVnd > 0) {
            payload.settlement!.refundVnd = refundVnd;
        }

        try {
            const res = await fetch(`/api/fishing-sessions/${sessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (!res.ok) {
                const rawError =
                    typeof result.error === "object" && result.error !== null
                        ? result.error.message
                        : result.error;
                const errorMsg = result.details
                    ? `${rawError || "Không thể hoàn tất quyết toán phiên."} (${result.details})`
                    : rawError || "Không thể hoàn tất quyết toán phiên.";
                setSubmitError(errorMsg);
                setIsSubmitting(false);
                return;
            }

            // If receiptData returned, handle printing choice
            if (result.receiptData) {
                setCompletedReceipt(result.receiptData);
                setWasPrinted(shouldPrint);

                if (shouldPrint) {
                    setIsPrinting(true);
                    try {
                        const printResult = await printPaymentReceipt(result.receiptData, {
                            jobId: `checkout-${sessionId}-${result.receiptData.invoiceId}`,
                            manual: false,
                        });
                        if (!printResult.success) {
                            setSubmitError(`Ca câu đã kết thúc thành công. ${printResult.error || "Chưa gửi được hóa đơn đến máy in."}`);
                        }
                    } catch (error) {
                        setSubmitError(`Ca câu đã kết thúc thành công. ${error instanceof Error ? error.message : "Chưa gửi được hóa đơn đến máy in."}`);
                    } finally {
                        setIsPrinting(false);
                    }
                }
            } else {
                if (onCompleted) onCompleted(sessionId);
                onClose();
            }
        } catch {
            setSubmitError("Lỗi kết nối mạng khi ghi nhận thanh toán quyết toán.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-150 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs modal-backdrop-animate font-serif"
                onClick={onBackdropClick}
                role="dialog"
                aria-modal="true"
            >
                <div
                    className="relative my-auto w-full max-w-lg max-h-[92dvh] overflow-hidden rounded-[28px] bg-white border border-slate-200 shadow-2xl flex flex-col modal-content-animate font-serif"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#E0E0E0] bg-[#FAFAF7] px-4 py-3 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
                                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0H3m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0H2.25m0 0a.75.75 0 0 0 .75.75h.75m10.5-12v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0h-.75m0 0a.75.75 0 0 0 .75.75h.75M6 10.5h12m-12 3h12" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#1A1A1A] font-serif">
                                    QUYẾT TOÁN &amp; KẾT THÚC PHIÊN
                                </h3>
                                {preview && (
                                    <p className="text-xs text-[#555555] font-serif">
                                        {preview.session.huts.map((h) => h.name).join(", ")} · {preview.session.customerName}
                                    </p>
                                )}
                            </div>
                        </div>
                        {!isSubmitting && !completedReceipt && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#EAEAE6] cursor-pointer"
                                aria-label="Đóng"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Content Body: Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-serif">
                        {/* SUCCESS STATE */}
                        {completedReceipt ? (
                            <div className="space-y-4 py-2 text-center font-serif">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAEFEA] text-[#2C4C3B] border-2 border-[#2C4C3B] text-2xl">
                                    ✓
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-[#1A1A1A] font-serif">
                                        Phiên câu đã kết thúc thành công!
                                    </h4>
                                    <p className="text-xs mt-1 font-semibold">
                                        {wasPrinted ? (
                                            <span className="text-[#2C4C3B]">🖨️ Đã gửi lệnh in hóa đơn thanh toán đến máy in.</span>
                                        ) : (
                                            <span className="text-slate-600">⚡ Không in hóa đơn (Đã lưu lịch sử quyết toán).</span>
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-[#CCCCCC] bg-[#FAFAF7] p-3.5 text-left text-xs space-y-1.5 font-serif shadow-xs">
                                    {completedReceipt.settlementSummary ? (
                                        <p className="text-sm font-bold leading-snug text-[#1A1A1A]">
                                            {completedReceipt.settlementSummary}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="flex justify-between font-normal text-[#555555]">
                                                <span>Tổng hóa đơn:</span>
                                                <span className="font-bold text-[#1A1A1A] font-serif">{formatVnd(completedReceipt.totalAmountVnd)}</span>
                                            </div>
                                            <div className="flex justify-between font-normal text-[#555555]">
                                                <span>Đã thanh toán:</span>
                                                <span className="font-bold text-[#2C4C3B] font-serif">{formatVnd(completedReceipt.paidAmountVnd)}</span>
                                            </div>
                                            {completedReceipt.refundAmountVnd && completedReceipt.refundAmountVnd > 0 ? (
                                                <div className="flex justify-between font-bold text-[#9E2A2B] border-t border-[#E0E0E0] pt-1.5">
                                                    <span>Đã hoàn khách:</span>
                                                    <span className="font-serif">{formatVnd(completedReceipt.refundAmountVnd)}</span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between font-bold text-[#1A1A1A] border-t border-[#E0E0E0] pt-1.5">
                                                    <span>Còn lại:</span>
                                                    <span className="font-serif">{formatVnd(completedReceipt.remainingVnd)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Action Buttons after complete */}
                                <div className="grid grid-cols-2 gap-2 pt-2 font-serif">
                                    <Button
                                        type="button"
                                        size="md"
                                        variant="outline"
                                        isLoading={isPrinting}
                                        onClick={() => handlePrint(true)}
                                        className="w-full text-xs font-semibold"
                                    >
                                        🖨️ {wasPrinted ? "In lại hóa đơn" : "In hóa đơn"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="md"
                                        variant="primary"
                                        onClick={() => {
                                            if (onCompleted) onCompleted(sessionId);
                                            onClose();
                                        }}
                                        className="w-full bg-[#2C4C3B] hover:bg-[#233D2F] text-white text-xs font-bold"
                                    >
                                        Hoàn tất &amp; Đóng
                                    </Button>
                                </div>
                            </div>
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-2 font-serif">
                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2C4C3B] border-t-transparent" />
                                <p className="text-xs font-semibold text-[#555555]">
                                    Đang tải số liệu quyết toán từ máy chủ…
                                </p>
                            </div>
                        ) : loadError ? (
                            <div className="space-y-3 py-4 font-serif">
                                <InlineAlert type="error" message={loadError} />
                                <Button size="sm" variant="outline" onClick={onClose} className="w-full">
                                    Đóng
                                </Button>
                            </div>
                        ) : preview ? (
                            <div className="space-y-3.5 font-serif">
                                {submitError && <InlineAlert type="error" message={submitError} />}

                                {/* Hướng dẫn trực quan tính tiền (Dễ hiểu cho học sinh lớp 5) */}
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-slate-700 font-serif">
                                    <p className="font-bold text-[#16A34A] mb-1">👉 3 bước chốt tiền siêu dễ:</p>
                                    <div className="space-y-0.5 text-[11px] text-slate-600">
                                        <p>• <strong>1. Xem số tiền:</strong> Nhìn ô to bên dưới để biết cần thu thêm hay thối lại tiền.</p>
                                        <p>• <strong>2. Nhận tiền:</strong> Chọn khách trả bằng 💵 Tiền mặt hay 🏦 Quét mã QR.</p>
                                        <p>• <strong>3. Chốt ca:</strong> Bấm nút <strong>&quot;Kết thúc phiên câu&quot;</strong> &rarr; Chọn in hóa đơn hoặc đóng ca.</p>
                                    </div>
                                </div>

                                {/* Financial breakdown summary */}
                                <div className="rounded-2xl border border-[#CCCCCC] bg-[#FAFAF7] p-3 text-xs space-y-1.5 font-serif shadow-xs">
                                    <div className="flex justify-between text-[#555555]">
                                        <span>Tiền gói ban đầu:</span>
                                        <span className="font-semibold text-[#1A1A1A] font-serif">{formatVnd(preview.financials.packageTotalVnd)}</span>
                                    </div>
                                    {preview.financials.extensionsTotalVnd > 0 && (
                                        <div className="flex justify-between text-[#555555]">
                                            <span>Gia hạn thêm:</span>
                                            <span className="font-semibold text-[#1A1A1A] font-serif">+{formatVnd(preview.financials.extensionsTotalVnd)}</span>
                                        </div>
                                    )}
                                    {preview.financials.itemsTotalVnd > 0 && (
                                        <div className="flex justify-between text-[#555555]">
                                            <span>Sản phẩm &amp; đồ uống:</span>
                                            <span className="font-semibold text-[#1A1A1A] font-serif">+{formatVnd(preview.financials.itemsTotalVnd)}</span>
                                        </div>
                                    )}
                                    {(preview.financials.overtimeTotalVnd ?? 0) > 0 && (
                                        <div className="flex justify-between text-[#9E2A2B] font-semibold">
                                            <span>Phí quá giờ ({preview.financials.overtimeMinutes}p):</span>
                                            <span className="font-serif">+{formatVnd(preview.financials.overtimeTotalVnd ?? 0)}</span>
                                        </div>
                                    )}
                                    {((preview.financials.fishOffsetVnd ?? preview.financials.fishBuybackTotalVnd) ?? 0) > 0 && (
                                        <div className="flex justify-between text-[#2C4C3B] font-semibold">
                                            <span>Cấn trừ cá:</span>
                                            <span className="font-serif">-{formatVnd(preview.financials.fishOffsetVnd ?? preview.financials.fishBuybackTotalVnd ?? 0)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-[#E0E0E0] pt-1.5 flex justify-between font-bold text-[#1A1A1A]">
                                        <span>Đã thu trước/cọc:</span>
                                        <span className="text-[#2C4C3B] font-serif">{formatVnd(preview.financials.totalPaidVnd)}</span>
                                    </div>
                                </div>

                                {/* Highlight Result box: Net Due / Refund / Balanced */}
                                {preview.financials.settlementSummary && (
                                    <div className="rounded-2xl border border-[#CCCCCC] bg-white p-3 text-left text-sm font-bold leading-snug text-[#1A1A1A] shadow-xs">
                                        {preview.financials.settlementSummary}
                                    </div>
                                )}
                                {(preview.financials.refundVnd > 0 || preview.financials.netDueVnd > 0 || !preview.financials.settlementSummary) && (
                                <div
                                    className={`rounded-2xl p-4 text-center border shadow-xs ${
                                        preview.financials.refundVnd > 0
                                            ? "border-[#E9B6B7] bg-[#FBEBEB] text-[#9E2A2B]"
                                            : preview.financials.netDueVnd > 0
                                            ? "border-[#B7EB8F] bg-[#F6FFED] text-[#2C4C3B]"
                                            : "border-[#CCCCCC] bg-[#FAFAF7] text-[#1A1A1A]"
                                    }`}
                                >
                                    <span className="text-[11px] font-bold uppercase tracking-wider block">
                                        {preview.financials.refundVnd > 0
                                            ? "Số tiền cần thối lại khách"
                                            : preview.financials.netDueVnd > 0
                                            ? "Số tiền cần thu thêm"
                                            : "Phiên câu đã thanh toán đủ"}
                                    </span>
                                    <span className="text-2xl font-extrabold tabular-nums font-serif block mt-0.5">
                                        {preview.financials.refundVnd > 0
                                            ? formatVnd(preview.financials.refundVnd)
                                            : preview.financials.netDueVnd > 0
                                            ? formatVnd(preview.financials.netDueVnd)
                                            : "0 đ"}
                                    </span>
                                </div>
                                )}

                                {/* Payment Method Selector if netDue > 0 */}
                                {preview.financials.netDueVnd > 0 && (
                                    <div className="space-y-2 rounded-2xl border border-[#CCCCCC] bg-[#FAFAF7] p-3 font-serif">
                                        <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                                            Hình thức thu tiền *
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("CASH")}
                                                className={`h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 font-serif cursor-pointer ${
                                                    paymentMethod === "CASH"
                                                        ? "border-[#1B3224] bg-[#2C4C3B] text-white shadow-xs"
                                                        : "border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#EAEAE6]"
                                                }`}
                                            >
                                                💵 Tiền mặt
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                                className={`h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 font-serif cursor-pointer ${
                                                    paymentMethod === "BANK_TRANSFER"
                                                        ? "border-[#1B3224] bg-[#2C4C3B] text-white shadow-xs"
                                                        : "border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#EAEAE6]"
                                                }`}
                                            >
                                                🏦 Chuyển khoản (QR)
                                            </button>
                                        </div>
                                        {paymentMethod === "BANK_TRANSFER" && preview.invoice && (
                                            <PondTransferQr
                                                amountVnd={preview.financials.netDueVnd}
                                                orderCode={preview.invoice.id.slice(0, 8)}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Refund Method Selector if refundVnd > 0 */}
                                {preview.financials.refundVnd > 0 && (
                                    <div className="space-y-2 rounded-2xl border border-[#CCCCCC] bg-[#FAFAF7] p-3 font-serif">
                                        <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                                            Hình thức hoàn tiền cho khách *
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("CASH")}
                                                className={`h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 font-serif cursor-pointer ${
                                                    paymentMethod === "CASH"
                                                        ? "border-[#1B3224] bg-[#2C4C3B] text-white shadow-xs"
                                                        : "border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#EAEAE6]"
                                                }`}
                                            >
                                                💵 Tiền mặt
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                                className={`h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 font-serif cursor-pointer ${
                                                    paymentMethod === "BANK_TRANSFER"
                                                        ? "border-[#1B3224] bg-[#2C4C3B] text-white shadow-xs"
                                                        : "border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#EAEAE6]"
                                                }`}
                                            >
                                                🏦 Chuyển khoản
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <Input
                                    label="Ghi chú quyết toán (Tùy chọn)"
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Ghi chú hóa đơn nếu có..."
                                />

                                {/* Offline Alert */}
                                {!isOnline && (
                                    <div className="rounded-xl border border-[#9E2A2B]/40 bg-[#FBEBEB] p-2.5 text-xs text-[#9E2A2B] flex items-start gap-2 font-serif">
                                        <span className="text-sm leading-none">⚠️</span>
                                        <div>
                                            <span className="font-bold">Đang mất mạng:</span> Không thể đóng phiên hoặc thu tiền khi offline để tránh sai lệch tài chính. Vui lòng kết nối mạng để hoàn tất.
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* STICKY FOOTER: ALWAYS VISIBLE */}
                    {!completedReceipt && preview && (
                        <div className="border-t border-[#E0E0E0] bg-white px-4 py-3 shrink-0 flex items-center gap-2.5 shadow-lg">
                            <Button
                                type="button"
                                size="md"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={onClose}
                                className="flex-1 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Quay lại
                            </Button>
                            <Button
                                type="button"
                                size="md"
                                variant="primary"
                                isLoading={isSubmitting}
                                loadingText="Đang đóng phiên…"
                                disabled={isSubmitting || !isOnline}
                                onClick={() => setIsPrintConfirmOpen(true)}
                                className={`flex-2 text-xs sm:text-sm font-bold text-white shadow-md ${
                                    preview.financials.refundVnd > 0
                                        ? "bg-[#9E2A2B] hover:bg-[#832324]"
                                        : "bg-[#2C4C3B] hover:bg-[#233D2F]"
                                }`}
                            >
                                {!isOnline
                                    ? "Mất mạng — Không thể đóng"
                                    : preview.financials.refundVnd > 0
                                    ? `Thối ${formatVnd(preview.financials.refundVnd)} · Kết thúc`
                                    : preview.financials.netDueVnd > 0
                                    ? `Thu ${formatVnd(preview.financials.netDueVnd)} · Kết thúc`
                                    : "Kết thúc ca & Đóng phiên"}
                            </Button>
                        </div>
                    )}

                    {/* DIALOG HỎI CÓ IN BILL HAY KHÔNG: CHUYÊN NGHIỆP & GỌN GÀNG */}
                    {isPrintConfirmOpen && preview && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs modal-backdrop-animate">
                            <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-5 shadow-2xl space-y-4 text-center modal-content-animate font-serif">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAEFEA] text-2xl text-[#2C4C3B]">
                                    🧾
                                </div>
                                <div>
                                    <h4 className="text-base font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                                        Xác nhận kết thúc phiên
                                    </h4>
                                    <p className="text-xs text-[#555555] mt-1 font-serif">
                                        Ô câu: <strong className="text-slate-800">{preview.session.huts.map((h) => h.name).join(", ")}</strong> · Khách: <strong className="text-slate-800">{preview.session.customerName}</strong>
                                    </p>
                                    <div className="mt-2 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#1A1A1A]">
                                        {preview.financials.refundVnd > 0 ? (
                                            <span className="text-[#9E2A2B]">Thối tiền: {formatVnd(preview.financials.refundVnd)}</span>
                                        ) : preview.financials.netDueVnd > 0 ? (
                                            <span className="text-[#2C4C3B]">Thu tiền: {formatVnd(preview.financials.netDueVnd)}</span>
                                        ) : (
                                            <span className="text-slate-700">Đã thanh toán đủ (0 đ)</span>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-[#E0E0E0] pt-2">
                                    <p className="text-xs font-bold text-[#1A1A1A]">
                                        Bạn có muốn in hóa đơn (bill) cho khách không?
                                    </p>
                                    <p className="text-[11px] text-[#666666] mt-0.5">
                                        Chọn &quot;Có in&quot; để xuất phiếu qua máy in, hoặc &quot;Không in&quot; để tiết kiệm giấy.
                                    </p>
                                </div>

                                <div className="space-y-2 pt-1 font-serif">
                                    <Button
                                        type="button"
                                        size="md"
                                        variant="primary"
                                        isLoading={isSubmitting}
                                        loadingText="Đang kết thúc & in bill…"
                                        onClick={() => handleConfirmCheckout(true)}
                                        className="w-full bg-[#2C4C3B] hover:bg-[#233D2F] text-white font-bold text-xs sm:text-sm py-2.5 shadow-md"
                                    >
                                        🖨️ Có, in hóa đơn (bill)
                                    </Button>

                                    <Button
                                        type="button"
                                        size="md"
                                        variant="outline"
                                        isLoading={isSubmitting}
                                        loadingText="Đang kết thúc…"
                                        onClick={() => handleConfirmCheckout(false)}
                                        className="w-full border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs sm:text-sm py-2.5"
                                    >
                                        ⚡ Không in, chỉ đóng phiên
                                    </Button>

                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setIsPrintConfirmOpen(false)}
                                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium hover:underline pt-1 cursor-pointer"
                                    >
                                        Quay lại kiểm tra
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
}
