"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePrinter } from "@/lib/printing/use-printer";
import { PaymentReceiptData } from "@/lib/printing/types";
import { useNetworkStatus } from "@/lib/network/use-network-status";

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
        fishBuybackTotalVnd?: number;
        otherTotalVnd: number;
        grossChargeVnd: number;
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
    onCompleted?: () => void;
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
    const { isConnected, printPaymentReceipt } = usePrinter();
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

        if (isConnected) {
            setIsPrinting(true);
            try {
                const res = await printPaymentReceipt(receiptToPrint, {
                    jobId: `checkout-${completedReceipt.sessionId || sessionId}-${Date.now()}`,
                    manual: true,
                });
                if (!res.success) {
                    window.print();
                }
            } catch {
                window.print();
            } finally {
                setIsPrinting(false);
            }
        } else {
            window.print();
        }
    }

    async function handleConfirmCheckout() {
        if (!preview) return;

        setIsSubmitting(true);
        setSubmitError(null);

        const netDue = preview.financials.netDueVnd;
        const refundVnd = preview.financials.refundVnd;

        const numCollect =
            typeof collectAmount === "string" ? Number(collectAmount) : collectAmount;

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
                setSubmitError(result.error || "Không thể hoàn tất quyết toán phiên.");
                setIsSubmitting(false);
                return;
            }

            // If receiptData returned, save for printing
            if (result.receiptData) {
                setCompletedReceipt(result.receiptData);
                // Attempt auto-print if printer is connected
                if (isConnected) {
                    printPaymentReceipt(result.receiptData, {
                        jobId: `auto-checkout-${sessionId}-${Date.now()}`,
                        manual: false,
                    }).catch(() => {});
                }
            } else {
                // Fallback close if no receiptData
                router.refresh();
                if (onCompleted) onCompleted();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FFFFFF] border border-[#D9D2C8] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9D2C8] bg-[#F4F2EE] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A5A20]/15 text-[#8A5A20]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0H3m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0H2.25m0 0a.75.75 0 0 0 .75.75h.75m10.5-12v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0h-.75m0 0a.75.75 0 0 0 .75.75h.75M6 10.5h12m-12 3h12" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[#27231F]">
                                Thanh toán & Kết thúc phiên câu
                            </h3>
                            {preview && (
                                <p className="text-xs text-[#766F67]">
                                    {preview.session.huts.map((h) => h.name).join(", ")} · {preview.session.customerName}
                                </p>
                            )}
                        </div>
                    </div>
                    {!isSubmitting && !completedReceipt && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-[#766F67] hover:bg-[#EFE4CF] hover:text-[#27231F] transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Content Body */}
                <div className="p-5 space-y-4">
                    {/* SUCCESS STATE */}
                    {completedReceipt ? (
                        <div className="space-y-4 py-2 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-[#27231F]">
                                    Phiên câu đã kết thúc thành công!
                                </h4>
                                <p className="text-xs text-[#766F67] mt-1">
                                    Hóa đơn đã được quyết toán và chòi câu đã được giải phóng.
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] p-4 text-left text-xs space-y-1.5">
                                <div className="flex justify-between font-medium text-[#766F67]">
                                    <span>Tổng thanh toán:</span>
                                    <span className="font-bold text-[#27231F]">{formatVnd(completedReceipt.totalAmountVnd)}</span>
                                </div>
                                <div className="flex justify-between font-medium text-[#766F67]">
                                    <span>Đã thanh toán:</span>
                                    <span className="font-bold text-emerald-700">{formatVnd(completedReceipt.paidAmountVnd)}</span>
                                </div>
                                {completedReceipt.refundAmountVnd && completedReceipt.refundAmountVnd > 0 ? (
                                    <div className="flex justify-between font-bold text-amber-800 border-t border-[#D9D2C8] pt-1">
                                        <span>Đã hoàn khách:</span>
                                        <span>{formatVnd(completedReceipt.refundAmountVnd)}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between font-bold text-[#27231F] border-t border-[#D9D2C8] pt-1">
                                        <span>Còn lại:</span>
                                        <span>{formatVnd(completedReceipt.remainingVnd)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons after complete */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    isLoading={isPrinting}
                                    onClick={() => handlePrint(true)}
                                    className="w-full"
                                >
                                    In lại hóa đơn
                                </Button>
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="primary"
                                    onClick={() => {
                                        router.refresh();
                                        if (onCompleted) onCompleted();
                                        onClose();
                                    }}
                                    className="w-full"
                                >
                                    Hoàn tất & Đóng
                                </Button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#8A5A20] border-t-transparent" />
                            <p className="text-xs font-semibold text-[#766F67]">
                                Đang tải số liệu quyết toán từ máy chủ…
                            </p>
                        </div>
                    ) : loadError ? (
                        <div className="space-y-4 py-6">
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
                        <div className="space-y-4">
                            {submitError && (
                                <InlineAlert type="error" message={submitError} />
                            )}

                            {/* Authoritative Financial Breakdown Card */}
                            <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] p-4 space-y-2.5 text-xs">
                                <div className="border-b border-[#D9D2C8] pb-2">
                                    <span className="font-bold text-[#27231F] uppercase tracking-wider text-[11px]">
                                        Chi tiết các khoản phí
                                    </span>
                                </div>

                                <div className="flex justify-between text-[#27231F]">
                                    <span>Tiền gói ({preview.session.packageName}):</span>
                                    <span className="font-semibold">{formatVnd(preview.financials.packageTotalVnd)}</span>
                                </div>

                                {preview.financials.itemsTotalVnd > 0 && (
                                    <div className="flex justify-between text-[#27231F]">
                                        <span>Hàng hóa / Nước / Mồi câu:</span>
                                        <span className="font-semibold">{formatVnd(preview.financials.itemsTotalVnd)}</span>
                                    </div>
                                )}

                                {preview.financials.extensionsTotalVnd > 0 && (
                                    <div className="flex justify-between text-[#27231F]">
                                        <span>Phí gia hạn thêm giờ:</span>
                                        <span className="font-semibold">{formatVnd(preview.financials.extensionsTotalVnd)}</span>
                                    </div>
                                )}

                                {preview.financials.otherTotalVnd > 0 && (
                                    <div className="flex justify-between text-[#27231F]">
                                        <span>Phụ thu / Khoản khác:</span>
                                        <span className="font-semibold">{formatVnd(preview.financials.otherTotalVnd)}</span>
                                    </div>
                                )}

                                <div className="border-t border-[#D9D2C8] pt-2 flex justify-between font-bold text-xs text-[#27231F]">
                                    <span>Tổng tiền dịch vụ:</span>
                                    <span className="text-[#8A5A20] font-mono">{formatVnd(preview.financials.grossChargeVnd)}</span>
                                </div>

                                {/* Các khoản giảm trừ / Đã thu trước */}
                                <div className="border-t border-[#D9D2C8] pt-2 pb-1">
                                    <span className="font-bold text-[#27231F] uppercase tracking-wider text-[11px]">
                                        Các khoản cấn trừ &amp; Tạm tính
                                    </span>
                                </div>

                                {preview.financials.totalPaidVnd > 0 && (
                                    <div className="flex justify-between text-[#766F67]">
                                        <span>Đã thu trước (Tạm tính / Cọc):</span>
                                        <span className="font-bold text-emerald-700 font-mono">- {formatVnd(preview.financials.totalPaidVnd)}</span>
                                    </div>
                                )}

                                {(preview.financials.fishBuybackTotalVnd ?? 0) > 0 && (
                                    <div className="flex justify-between text-[#8B1E1E]">
                                        <span>Tiền cá thu lại từ khách:</span>
                                        <span className="font-bold text-[#8B1E1E] font-mono">- {formatVnd(preview.financials.fishBuybackTotalVnd!)}</span>
                                    </div>
                                )}

                                {/* Outstanding Balance Display */}
                                <div className="border-t border-dashed border-[#D9D2C8] pt-2.5">
                                    {preview.financials.netDueVnd > 0 ? (
                                        <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-amber-900 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs">CẦN THU THÊM CỦA KHÁCH:</span>
                                                <span className="text-base font-extrabold text-amber-950 font-mono tabular-nums">
                                                    +{formatVnd(preview.financials.netDueVnd)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-amber-800">
                                                Tổng tiền dịch vụ ({formatVnd(preview.financials.grossChargeVnd)}) lớn hơn tiền tạm tính &amp; thu cá ({formatVnd((preview.financials.totalPaidVnd || 0) + (preview.financials.fishBuybackTotalVnd || 0))})
                                            </p>
                                        </div>
                                    ) : preview.financials.refundVnd > 0 ? (
                                        <div className="rounded-xl bg-[#FAECEC] border-2 border-[#8B1E1E]/40 p-3 text-[#8B1E1E] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs uppercase tracking-wide">HỒ THỐI LẠI TIỀN CHO KHÁCH:</span>
                                                <span className="text-base font-extrabold text-[#8B1E1E] font-mono tabular-nums">
                                                    -{formatVnd(preview.financials.refundVnd)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-[#766F67]">
                                                Tiền cá thu lại &amp; tạm tính ({formatVnd((preview.financials.totalPaidVnd || 0) + (preview.financials.fishBuybackTotalVnd || 0))}) lớn hơn tiền dịch vụ ({formatVnd(preview.financials.grossChargeVnd)})
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-emerald-900">
                                            <span className="font-bold text-xs">Trạng thái số dư:</span>
                                            <span className="font-bold font-mono">Đã thanh toán đủ (0 đ)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cashier inputs if payment needed */}
                            {preview.financials.netDueVnd > 0 && (
                                <div className="space-y-3 rounded-xl border border-[#D9D2C8] bg-white p-4">
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
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                                            Phương thức thanh toán *
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("CASH")}
                                                className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                    paymentMethod === "CASH"
                                                        ? "border-[#8A5A20] bg-[#8A5A20] text-white shadow-2xs"
                                                        : "border-[#D9D2C8] bg-white text-[#27231F] hover:bg-[#F4F2EE]"
                                                }`}
                                            >
                                                💵 Tiền mặt
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                                className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                    paymentMethod === "BANK_TRANSFER"
                                                        ? "border-[#8A5A20] bg-[#8A5A20] text-white shadow-2xs"
                                                        : "border-[#D9D2C8] bg-white text-[#27231F] hover:bg-[#F4F2EE]"
                                                }`}
                                            >
                                                🏦 Chuyển khoản
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {preview.financials.refundVnd > 0 && (
                                <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                                    <label className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                                        Hình thức hoàn tiền cho khách *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod("CASH")}
                                            className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                paymentMethod === "CASH"
                                                    ? "border-blue-700 bg-blue-700 text-white shadow-2xs"
                                                    : "border-blue-200 bg-white text-blue-900 hover:bg-blue-50"
                                            }`}
                                        >
                                            💵 Tiền mặt
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                            className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                paymentMethod === "BANK_TRANSFER"
                                                    ? "border-blue-700 bg-blue-700 text-white shadow-2xs"
                                                    : "border-blue-200 bg-white text-blue-900 hover:bg-blue-50"
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
                                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2 shadow-2xs">
                                    <span className="text-base leading-none">⚠️</span>
                                    <div>
                                        <span className="font-bold">Đang mất mạng:</span> Không thể đóng phiên hoặc thu tiền khi offline để tránh sai lệch tài chính. Vui lòng kết nối mạng để hoàn tất.
                                    </div>
                                </div>
                            )}

                            {/* Modal Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    onClick={onClose}
                                    className="flex-1"
                                >
                                    Quay lại
                                </Button>
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="primary"
                                    isLoading={isSubmitting}
                                    loadingText="Đang xử lý & in bill…"
                                    disabled={isSubmitting || !isOnline}
                                    onClick={handleConfirmCheckout}
                                    className={`flex-2 font-bold ${
                                        preview.financials.refundVnd > 0
                                            ? "bg-[#C84B31] hover:bg-[#A33820] text-white border-none shadow-sm"
                                            : preview.financials.netDueVnd === 0
                                            ? "bg-emerald-700 hover:bg-emerald-800 text-white border-none shadow-sm"
                                            : ""
                                    }`}
                                >
                                    {!isOnline
                                        ? "Mất mạng — Không thể đóng phiên"
                                        : preview.financials.refundVnd > 0
                                        ? `Thối tiền ${formatVnd(preview.financials.refundVnd)} & In bill`
                                        : preview.financials.netDueVnd > 0
                                        ? `Thu thêm ${formatVnd(preview.financials.netDueVnd)} & In bill`
                                        : "Hoàn tất & In bill"}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
