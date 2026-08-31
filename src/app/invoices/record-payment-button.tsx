"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PaymentMethod } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

interface RecordPaymentButtonProps {
    invoiceId: string;
    remainingAmountVnd: number;
    className?: string;
    variant?: "primary" | "success" | "outline";
    size?: "sm" | "md" | "lg";
}

export function RecordPaymentButton({
    invoiceId,
    remainingAmountVnd,
    className = "",
    variant = "success",
    size = "md",
}: RecordPaymentButtonProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [amountVnd, setAmountVnd] = useState<number | string>(
        remainingAmountVnd,
    );
    const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [idempotencyKey, setIdempotencyKey] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{
        text: string;
        type: "success" | "info" | "error";
    } | null>(null);

    const handleOpen = () => {
        setAmountVnd(remainingAmountVnd);
        setMethod(PaymentMethod.CASH);
        setIdempotencyKey(crypto.randomUUID());
        setMessage(null);
        setIsOpen(true);
    };

    const handleClose = () => {
        if (!loading) {
            setIsOpen(false);
            setMessage(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        const numericAmount =
            typeof amountVnd === "string" ? parseInt(amountVnd, 10) : amountVnd;

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setMessage({
                text: "Vui lòng nhập số tiền thanh toán hợp lệ (lớn hơn 0).",
                type: "error",
            });
            return;
        }

        if (numericAmount > remainingAmountVnd) {
            setMessage({
                text: `Số tiền thanh toán không được vượt quá số tiền còn lại (${new Intl.NumberFormat(
                    "vi-VN",
                ).format(remainingAmountVnd)} đ).`,
                type: "error",
            });
            return;
        }

        let keyToUse = idempotencyKey;
        if (!keyToUse) {
            keyToUse = crypto.randomUUID();
            setIdempotencyKey(keyToUse);
        }

        setLoading(true);

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": keyToUse,
                },
                body: JSON.stringify({
                    amountVnd: numericAmount,
                    method,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({
                    text: data.error || "Ghi nhận thanh toán thất bại.",
                    type: "error",
                });
                return;
            }

            if (data.alreadyExists) {
                setMessage({
                    text: "Thanh toán này đã được ghi nhận trước đó.",
                    type: "info",
                });
            } else {
                setMessage({
                    text: "Ghi nhận thanh toán thành công!",
                    type: "success",
                });
            }

            router.refresh();
            setTimeout(() => {
                setIsOpen(false);
            }, 1000);
        } catch {
            setMessage({
                text: "Lỗi kết nối mạng. Bạn có thể bấm Thử lại (Idempotency Key được giữ nguyên).",
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
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-[#0D9488]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#102A43]">
                                    Ghi nhận thanh toán
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-[#F8F6F0]"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="rounded-xl border border-[#E2DDD2] bg-[#F8F6F0] p-3 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700">
                                    Số tiền còn lại cần thu:
                                </span>
                                <span className="text-base font-extrabold text-[#0D9488] tabular-nums">
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

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    variant="success"
                                    isLoading={loading}
                                    loadingText="Đang xử lý…"
                                    className="flex-[2]"
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
