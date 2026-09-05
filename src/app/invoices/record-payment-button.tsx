"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PaymentMethod } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePrinter } from "@/lib/printing/use-printer";
import { PaymentReceiptData } from "@/lib/printing/types";

interface RecordPaymentButtonProps {
    invoiceId: string;
    remainingAmountVnd: number;
    className?: string;
    variant?: "primary" | "success" | "outline" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
}

export function RecordPaymentButton({
    invoiceId,
    remainingAmountVnd,
    className = "",
    variant = "primary",
    size = "md",
}: RecordPaymentButtonProps) {
    const router = useRouter();
    const { isConnected, printPaymentReceipt } = usePrinter();

    const [isOpen, setIsOpen] = useState(false);
    const [amountVnd, setAmountVnd] = useState<number | string>(
        remainingAmountVnd,
    );
    const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [idempotencyKey, setIdempotencyKey] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [reprinting, setReprinting] = useState(false);
    const [message, setMessage] = useState<{
        text: string;
        type: "success" | "info" | "error";
    } | null>(null);

    // Stored receipt data for retry printing
    const [lastReceiptData, setLastReceiptData] = useState<PaymentReceiptData | null>(null);
    const [printError, setPrintError] = useState<string | null>(null);

    const handleOpen = () => {
        setAmountVnd(remainingAmountVnd);
        setMethod(PaymentMethod.CASH);
        setIdempotencyKey(crypto.randomUUID());
        setMessage(null);
        setPrintError(null);
        setLastReceiptData(null);
        setIsOpen(true);
    };

    const handleClose = () => {
        if (!loading) {
            setIsOpen(false);
            setMessage(null);
            setPrintError(null);
            setLastReceiptData(null);
        }
    };

    const handleRetryPrint = async () => {
        if (!lastReceiptData) return;
        setReprinting(true);
        setPrintError(null);
        try {
            const res = await printPaymentReceipt(lastReceiptData, {
                jobId: `retry-${lastReceiptData.invoiceId}-${Date.now()}`,
                manual: true,
            });
            if (res.success) {
                setMessage({
                    text: "Đã gửi lệnh in biên lai thành công!",
                    type: "success",
                });
            } else {
                setPrintError(res.error || "Không thể in biên lai. Vui lòng kiểm tra kết nối máy in.");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi khi in lại.";
            setPrintError(msg);
        } finally {
            setReprinting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setPrintError(null);

        const numericAmount =
            typeof amountVnd === "string" ? parseInt(amountVnd, 10) : amountVnd;

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setMessage({
                text: "Số tiền thanh toán phải lớn hơn 0.",
                type: "error",
            });
            return;
        }

        if (numericAmount > remainingAmountVnd) {
            setMessage({
                text: `Số tiền thanh toán không được vượt quá số tiền còn lại (${new Intl.NumberFormat("vi-VN").format(remainingAmountVnd)} đ).`,
                type: "error",
            });
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                    amountVnd: numericAmount,
                    method,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({
                    text: data.error || "Có lỗi xảy ra khi ghi nhận thanh toán.",
                    type: "error",
                });
                return;
            }

            // Construct thermal receipt data
            const receiptData: PaymentReceiptData = {
                invoiceId,
                lakeName: data.lakeName || "HỒ CÂU",
                organizationName: data.organizationName,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                hutNames: data.hutNames,
                packageName: data.packageName,
                lines: data.lines || [],
                totalAmountVnd: data.totalAmountVnd || numericAmount,
                paidAmountVnd: data.paidAmountVnd || numericAmount,
                remainingVnd: data.remainingVnd ?? Math.max(0, remainingAmountVnd - numericAmount),
                paymentMethod: method === PaymentMethod.CASH ? "Tiền mặt" : "Chuyển khoản",
                paymentTime: new Date().toISOString(),
                cashierName: data.cashierName,
            };

            setLastReceiptData(receiptData);

            // Auto print if printer is connected
            if (isConnected) {
                printPaymentReceipt(receiptData, {
                    jobId: `pay-${invoiceId}-${Date.now()}`,
                }).then((printResult) => {
                    if (!printResult.success) {
                        setPrintError(printResult.error || "Lỗi khi in biên lai.");
                    }
                }).catch((err) => {
                    setPrintError(err instanceof Error ? err.message : "Lỗi khi in biên lai.");
                });
            }

            setMessage({
                text: "Ghi nhận thanh toán thành công!",
                type: "success",
            });

            setTimeout(() => {
                setIsOpen(false);
                router.refresh();
            }, 1200);
        } catch {
            setMessage({
                text: "Lỗi kết nối mạng khi ghi nhận thanh toán.",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {!isOpen ? (
                <Button
                    type="button"
                    onClick={handleOpen}
                    size={size}
                    variant={variant}
                    className={className}
                    icon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                >
                    Thu tiền
                </Button>
            ) : (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#D9D2C8] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFE4CF] text-[#8A5A20]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    Ghi nhận thanh toán
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="rounded-lg p-1.5 text-[#766F67] hover:text-[#27231F] hover:bg-[#F4F2EE]"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] p-3 flex items-center justify-between">
                                <span className="text-xs font-semibold text-[#766F67]">
                                    Số tiền còn lại cần thu:
                                </span>
                                <span className="text-base font-bold text-[#8A5A20] tabular-nums">
                                    {new Intl.NumberFormat("vi-VN").format(remainingAmountVnd)} đ
                                </span>
                            </div>

                            <Input
                                id="amountVnd"
                                label="Số tiền thanh toán (VNĐ)"
                                type="number"
                                min={1000}
                                max={remainingAmountVnd}
                                step={1000}
                                value={amountVnd}
                                onChange={(e) => setAmountVnd(e.target.value)}
                                disabled={loading}
                                required
                            />

                            <Select
                                id="paymentMethod"
                                label="Phương thức thanh toán"
                                value={method}
                                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                                disabled={loading}
                            >
                                <option value={PaymentMethod.CASH}>
                                    💵 Tiền mặt (CASH)
                                </option>
                                <option value={PaymentMethod.BANK_TRANSFER}>
                                    🏦 Chuyển khoản (BANK_TRANSFER)
                                </option>
                            </Select>

                            {message && (
                                <InlineAlert
                                    type={message.type === "error" ? "error" : message.type === "success" ? "success" : "info"}
                                    message={message.text}
                                />
                            )}

                            {printError && (
                                <div className="space-y-2">
                                    <InlineAlert
                                        type="warning"
                                        title="Lỗi in nhiệt"
                                        message={`Thanh toán đã lưu thành công nhưng máy in gặp sự cố (${printError}).`}
                                    />
                                    {lastReceiptData && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            isLoading={reprinting}
                                            loadingText="Đang in lại…"
                                            onClick={handleRetryPrint}
                                            className="w-full"
                                        >
                                            In lại biên lai
                                        </Button>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    Đóng
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    variant="primary"
                                    isLoading={loading}
                                    loadingText="Đang xử lý…"
                                    className="flex-2"
                                >
                                    Xác nhận thu tiền
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
