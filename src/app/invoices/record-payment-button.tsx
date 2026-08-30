"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PaymentMethod } from "@/generated/prisma/enums";

interface RecordPaymentButtonProps {
    invoiceId: string;
    remainingAmountVnd: number;
}

export function RecordPaymentButton({
    invoiceId,
    remainingAmountVnd,
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
            }, 1200);
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
                <button
                    type="button"
                    onClick={handleOpen}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                    Ghi nhận thanh toán
                </button>
            ) : (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-semibold text-slate-900">
                                Ghi nhận thanh toán
                            </h3>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700">
                                    Số tiền còn lại cần thu
                                </label>
                                <p className="mt-1 text-sm font-semibold text-emerald-600">
                                    {new Intl.NumberFormat("vi-VN").format(
                                        remainingAmountVnd,
                                    )}{" "}
                                    đ
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="amountVnd"
                                    className="block text-xs font-medium text-slate-700"
                                >
                                    Số tiền thanh toán (VNĐ)
                                </label>
                                <input
                                    id="amountVnd"
                                    type="number"
                                    min={1000}
                                    max={remainingAmountVnd}
                                    step={1000}
                                    value={amountVnd}
                                    onChange={(e) => setAmountVnd(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="paymentMethod"
                                    className="block text-xs font-medium text-slate-700"
                                >
                                    Phương thức thanh toán
                                </label>
                                <select
                                    id="paymentMethod"
                                    value={method}
                                    onChange={(e) =>
                                        setMethod(e.target.value as PaymentMethod)
                                    }
                                    disabled={loading}
                                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value={PaymentMethod.CASH}>
                                        Tiền mặt (CASH)
                                    </option>
                                    <option value={PaymentMethod.BANK_TRANSFER}>
                                        Chuyển khoản (BANK_TRANSFER)
                                    </option>
                                </select>
                            </div>

                            {message && (
                                <div
                                    className={`rounded-lg p-2.5 text-xs ${
                                        message.type === "success"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : message.type === "info"
                                              ? "bg-blue-50 text-blue-700"
                                              : "bg-red-50 text-red-700"
                                    }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? "Đang xử lý..." : "Xác nhận thu tiền"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
