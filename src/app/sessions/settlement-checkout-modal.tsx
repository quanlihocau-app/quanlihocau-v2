"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePrinter } from "@/lib/printing/use-printer";
import { PaymentReceiptData } from "@/lib/printing/types";
import { useNetworkStatus } from "@/lib/network/use-network-status";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";

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
    const router = useRouter();
    const { config: printerConfig, templateConfig, printPaymentReceipt } = usePrinter();
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

    // Success & printing state
    const [completedReceipt, setCompletedReceipt] = useState<PaymentReceiptData | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Fast escape key & backdrop dismiss
    const { onBackdropClick } = useModalDismiss({
        isOpen,
        onClose,
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
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Không gửi được hóa đơn đến máy in.");
        } finally { setIsPrinting(false); }
    }

    async function handleConfirmCheckout() {
        if (!preview) return;

        setIsSubmitting(true);
        setSubmitError(null);

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

            // If receiptData returned, save for printing
            if (result.receiptData) {
                setCompletedReceipt(result.receiptData);
                // Attempt auto-print if printer is connected
                if (printerConfig && templateConfig.autoPrintPayment) {
                    setIsPrinting(true);
                    try {
                        const printResult = await printPaymentReceipt(result.receiptData, {
                            jobId: `auto-checkout-${sessionId}-${result.receiptData.invoiceId}`,
                            manual: false,
                        });
                        if (!printResult.success) setSubmitError(`Ca câu đã kết thúc. ${printResult.error || "Chưa in được hóa đơn."}`);
                    } catch (error) {
                        setSubmitError(`Ca câu đã kết thúc. ${error instanceof Error ? error.message : "Chưa in được hóa đơn."}`);
                    } finally { setIsPrinting(false); }
                }
            } else {
                // Fallback close if no receiptData
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
        <div
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/50 backdrop-blur-2xs modal-backdrop-animate font-serif"
            onClick={onBackdropClick}
        >
            <div className="relative my-auto w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-[28px] bg-[#FFFFFF] border border-slate-100 shadow-2xl modal-content-animate font-serif">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E0E0E0] bg-white px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0H3m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0H2.25m0 0a.75.75 0 0 0 .75.75h.75m10.5-12v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0h-.75m0 0a.75.75 0 0 0 .75.75h.75M6 10.5h12m-12 3h12" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A] font-serif">
                                QUYẾT TOÁN &amp; ĐÓNG PHIÊN
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
                            className="flex h-6 w-6 items-center justify-center rounded-xs border border-[#CCCCCC] bg-[#F2F2F0] text-[#1A1A1A] hover:bg-[#EAEAE6] cursor-pointer"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Content Body */}
                <div className="p-4 space-y-3 font-serif">
                    {/* SUCCESS STATE */}
                    {completedReceipt ? (
                        <div className="space-y-3 py-2 text-center font-serif">
                            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xs bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-[#1A1A1A] font-serif">
                                    Phiên câu đã kết thúc thành công!
                                </h4>
                                <p className="text-xs text-[#555555] font-serif mt-0.5">
                                    Hóa đơn đã được quyết toán và chòi câu đã được giải phóng.
                                </p>
                            </div>

                            <div className="rounded-xs border border-[#CCCCCC] bg-[#FAFAF7] p-3 text-left text-xs space-y-1 font-serif">
                                <div className="flex justify-between font-normal text-[#555555]">
                                    <span>Tổng thanh toán:</span>
                                    <span className="font-bold text-[#1A1A1A] font-serif">{formatVnd(completedReceipt.totalAmountVnd)}</span>
                                </div>
                                <div className="flex justify-between font-normal text-[#555555]">
                                    <span>Đã thanh toán:</span>
                                    <span className="font-bold text-[#2C4C3B] font-serif">{formatVnd(completedReceipt.paidAmountVnd)}</span>
                                </div>
                                {completedReceipt.refundAmountVnd && completedReceipt.refundAmountVnd > 0 ? (
                                    <div className="flex justify-between font-bold text-[#9E2A2B] border-t border-[#E0E0E0] pt-1">
                                        <span>Đã hoàn khách:</span>
                                        <span className="font-serif">{formatVnd(completedReceipt.refundAmountVnd)}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between font-bold text-[#1A1A1A] border-t border-[#E0E0E0] pt-1">
                                        <span>Còn lại:</span>
                                        <span className="font-serif">{formatVnd(completedReceipt.remainingVnd)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons after complete */}
                            <div className="grid grid-cols-2 gap-2 pt-1 font-serif">
                                <Button
                                    type="button"
                                    size="md"
                                    variant="outline"
                                    isLoading={isPrinting}
                                    onClick={() => handlePrint(true)}
                                    className="w-full"
                                >
                                    In lại hóa đơn
                                </Button>
                                <Button
                                    type="button"
                                    size="md"
                                    variant="primary"
                                    onClick={() => {
                                        if (onCompleted) onCompleted(sessionId);
                                        onClose();
                                    }}
                                    className="w-full"
                                >
                                    Hoàn tất &amp; Đóng
                                </Button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-2 font-serif">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2C4C3B] border-t-transparent" />
                            <p className="text-xs font-semibold text-[#555555]">
                                Đang tải số liệu quyết toán từ máy chủ…
                            </p>
                        </div>
                    ) : loadError ? (
                        <div className="space-y-3 py-4 font-serif">
                            <InlineAlert type="error" message={loadError} />
                            <Button
                                type="button"
                                variant="outline"
                                size="md"
                                onClick={() => router.refresh()}
                                className="w-full"
                            >
                                Thử tải lại
                            </Button>
                        </div>
                    ) : preview ? (
                        <div className="space-y-3 font-serif">
                            {submitError && (
                                <InlineAlert type="error" message={submitError} />
                            )}

                            {/* Bill cuoi - Bang quyet toan */}
                            <div className="rounded-xs border border-[#CCCCCC] bg-[#FAFAF7] p-3 space-y-1.5 text-xs font-serif">
                                <div className="border-b border-[#E0E0E0] pb-1.5 mb-1">
                                    <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px]">
                                        BẢNG QUYẾT TOÁN PHIÊN CÂU
                                    </span>
                                </div>

                                {/* (+) Tien gio cau = goi + gia han + qua gio */}
                                <div className="flex justify-between text-[#1A1A1A]">
                                    <span className="text-[#555555]">
                                        🎣 Tiền giờ câu ({preview.session.packageName})
                                        {(preview.financials.overtimeMinutes ?? 0) > 0 && (
                                            <span className="ml-1 text-[#8C5C00] font-semibold">
                                                +{preview.financials.overtimeMinutes}p quá giờ
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-bold font-serif text-[#1A1A1A]">
                                        {formatVnd(
                                            preview.financials.packageTotalVnd +
                                            preview.financials.extensionsTotalVnd +
                                            (preview.financials.overtimeTotalVnd ?? 0)
                                        )}
                                    </span>
                                </div>

                                {/* (+) Tien san pham */}
                                {preview.financials.itemsTotalVnd > 0 && (
                                    <div className="flex justify-between text-[#1A1A1A]">
                                        <span className="text-[#555555]">🛒 Tiền sản phẩm / mồi câu</span>
                                        <span className="font-bold font-serif">+{formatVnd(preview.financials.itemsTotalVnd)}</span>
                                    </div>
                                )}

                                {/* (+) Phu thu khac */}
                                {preview.financials.otherTotalVnd > 0 && (
                                    <div className="flex justify-between text-[#1A1A1A]">
                                        <span className="text-[#555555]">📋 Phụ thu khác</span>
                                        <span className="font-bold font-serif">+{formatVnd(preview.financials.otherTotalVnd)}</span>
                                    </div>
                                )}

                                {/* Cash buyback is credited to the invoice; show it before the invoice total. */}
                                {(preview.financials.fishBuybackTotalVnd ?? 0) > 0 && (
                                    <div className="flex justify-between text-[#9E2A2B]">
                                        <span>🐟 Tiền cá thu lại từ khách</span>
                                        <span className="font-bold font-serif">− {formatVnd(preview.financials.fishBuybackTotalVnd!)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between border-t border-dashed border-[#CCCCCC] pt-1.5 text-[#1A1A1A] font-semibold">
                                    <span>Tổng hóa đơn sau cấn trừ</span>
                                    <span className="font-bold text-[#2C4C3B] font-serif">{formatVnd(preview.financials.invoiceTotalVnd ?? preview.financials.grossChargeVnd - (preview.financials.fishBuybackTotalVnd ?? 0))}</span>
                                </div>

                                {/* Paid amount is shown for clarity and deducted only once from the full invoice total. */}
                                {preview.financials.totalPaidVnd > 0 && (
                                    <div className="flex justify-between text-[#555555]">
                                        <span>💰 Đã thanh toán trước</span>
                                        <span className="font-bold text-[#2C4C3B] font-serif">{formatVnd(preview.financials.totalPaidVnd)}</span>
                                    </div>
                                )}

                                {/* = Ket qua cuoi */}
                                <div className="border-t-2 border-[#1A1A1A] pt-2 mt-1">
                                    {preview.financials.netDueVnd > 0 ? (
                                        <div className="rounded-xs bg-[#FDF7EB] border border-[#E8D1A3] p-2.5 text-[#8C5C00]">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs">= KHÁCH CẦN THANH TOÁN THÊM:</span>
                                                <span className="text-base font-bold text-[#8C5C00] font-serif tabular-nums">
                                                    +{formatVnd(preview.financials.netDueVnd)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : preview.financials.refundVnd > 0 ? (
                                        <div className="rounded-xs bg-[#FBEBEB] border border-[#E9B6B7] p-2.5 text-[#9E2A2B]">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs uppercase tracking-wide">= THỐI LẠI CHO KHÁCH:</span>
                                                <span className="text-base font-bold text-[#9E2A2B] font-serif tabular-nums">
                                                    −{formatVnd(preview.financials.refundVnd)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between rounded-xs bg-[#EAEFEA] border border-[#B8CEB8] p-2 text-[#2C4C3B]">
                                            <span className="font-bold text-xs">= THANH TOÁN ĐỦ</span>
                                            <span className="font-bold font-serif">0 đ ✓</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cashier inputs if payment needed */}
                            {preview.financials.netDueVnd > 0 && (
                                <div className="space-y-2.5 rounded-xs border border-[#CCCCCC] bg-white p-3 font-serif">
                                    <Input
                                        label="Số tiền thu nốt *"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={collectAmount}
                                        onChange={(e) => setCollectAmount(e.target.value)}
                                        placeholder="Nhập số tiền thu nốt"
                                    />

                                    <div>
                                        <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block mb-1">
                                            Phương thức thanh toán *
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("CASH")}
                                                className={`h-10 rounded-xs border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-serif ${
                                                    paymentMethod === "CASH"
                                                        ? "border-[#1B3224] bg-[#2C4C3B] text-white"
                                                        : "border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#FAFAF7]"
                                                }`}
                                            >
                                                💵 Tiền mặt
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                                className={`h-10 rounded-xs border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-serif ${
                                                    paymentMethod === "BANK_TRANSFER"
                                                        ? "border-[#1B3224] bg-[#2C4C3B] text-white"
                                                        : "border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#FAFAF7]"
                                                }`}
                                            >
                                                🏦 Chuyển khoản
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {preview.financials.refundVnd > 0 && (
                                <div className="space-y-2 rounded-xs border border-[#CCCCCC] bg-[#FAFAF7] p-3 font-serif">
                                    <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                                        Hình thức hoàn tiền cho khách *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod("CASH")}
                                            className={`h-10 rounded-xs border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 font-serif ${
                                                paymentMethod === "CASH"
                                                    ? "border-[#1B3224] bg-[#2C4C3B] text-white"
                                                    : "border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#EAEAE6]"
                                            }`}
                                        >
                                            💵 Tiền mặt
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                            className={`h-10 rounded-xs border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 font-serif ${
                                                paymentMethod === "BANK_TRANSFER"
                                                    ? "border-[#1B3224] bg-[#2C4C3B] text-white"
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
                                <div className="rounded-xs border border-[#9E2A2B]/40 bg-[#FBEBEB] p-2.5 text-xs text-[#9E2A2B] flex items-start gap-2 font-serif">
                                    <span className="text-sm leading-none">⚠️</span>
                                    <div>
                                        <span className="font-bold">Đang mất mạng:</span> Không thể đóng phiên hoặc thu tiền khi offline để tránh sai lệch tài chính. Vui lòng kết nối mạng để hoàn tất.
                                    </div>
                                </div>
                            )}

                            {/* Modal Action Buttons */}
                            <div className="flex gap-2 pt-1 font-serif">
                                <Button
                                    type="button"
                                    size="md"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    onClick={onClose}
                                    className="flex-1"
                                >
                                    Quay lại
                                </Button>
                                <Button
                                    type="button"
                                    size="md"
                                    variant="primary"
                                    isLoading={isSubmitting}
                                    loadingText="Đang xử lý & in bill…"
                                    disabled={isSubmitting || !isOnline}
                                    onClick={handleConfirmCheckout}
                                    className={`flex-2 font-bold ${
                                        preview.financials.refundVnd > 0
                                            ? "bg-[#9E2A2B] hover:bg-[#832324] text-white border border-[#681C1D]"
                                            : ""
                                    }`}
                                >
                                    {!isOnline
                                        ? "Mất mạng — Không thể đóng"
                                        : preview.financials.refundVnd > 0
                                        ? `Thối ${formatVnd(preview.financials.refundVnd)} & In`
                                        : preview.financials.netDueVnd > 0
                                        ? `Thu ${formatVnd(preview.financials.netDueVnd)} & In`
                                        : "Kết thúc & In bill"}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
