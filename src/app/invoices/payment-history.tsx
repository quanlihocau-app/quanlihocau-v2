"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { PaymentDirection, PaymentMethod } from "@/generated/prisma/enums";

export interface PaymentItem {
    id: string;
    amountVnd: number;
    method: PaymentMethod;
    direction: PaymentDirection;
    reversalOfId?: string | null;
    createdAt: Date | string;
}

interface PaymentHistoryProps {
    payments: PaymentItem[];
    canReverse?: boolean;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function formatDateTime(date: Date | string): string {
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(date));
}

function getMethodLabel(method: PaymentMethod): string {
    switch (method) {
        case PaymentMethod.CASH:
            return "Tiền mặt";
        case PaymentMethod.BANK_TRANSFER:
            return "Chuyển khoản";
        default:
            return method;
    }
}

export function PaymentHistory({
    payments,
    canReverse = false,
}: PaymentHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loadingPaymentId, setLoadingPaymentId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const router = useRouter();
    // Maintain idempotency keys per payment across network retries
    const idempotencyKeysRef = useRef<Record<string, string>>({});

    if (!payments || payments.length === 0) {
        return null;
    }

    // Set of original payment IDs that have already been reversed
    const reversedPaymentIds = new Set(
        payments
            .filter((p) => p.reversalOfId != null)
            .map((p) => p.reversalOfId as string),
    );

    const handleReverse = async (paymentId: string, amountVnd: number) => {
        const confirmed = window.confirm(
            `Xác nhận hoàn tác khoản thanh toán ${formatVnd(amountVnd)}?\nThao tác này sẽ tạo một bản ghi chi ra và tính lại trạng thái hóa đơn.`,
        );
        if (!confirmed) {
            return;
        }

        setErrorMessage(null);
        setLoadingPaymentId(paymentId);

        // Generate and persist idempotency key if not already generated for this payment
        if (!idempotencyKeysRef.current[paymentId]) {
            idempotencyKeysRef.current[paymentId] = crypto.randomUUID();
        }
        const idempotencyKey = idempotencyKeysRef.current[paymentId];

        try {
            const response = await fetch(`/api/payments/${paymentId}/reverse`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(data.error || "Hoàn tác thanh toán thất bại.");
                return;
            }

            // On success, remove the used idempotency key and refresh the page
            delete idempotencyKeysRef.current[paymentId];
            router.refresh();
        } catch {
            setErrorMessage("Lỗi kết nối mạng khi hoàn tác thanh toán. Bạn có thể bấm hoàn tác lại.");
        } finally {
            setLoadingPaymentId(null);
        }
    };

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
            >
                <span>{isOpen ? "▼" : "▶"}</span>
                <span>Lịch sử thanh toán ({payments.length})</span>
            </button>

            {isOpen && (
                <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50/90 p-2.5 text-xs text-slate-700">
                    {errorMessage && (
                        <div className="mb-2 rounded bg-rose-50 p-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                            {errorMessage}
                        </div>
                    )}
                    <ul className="space-y-2 divide-y divide-slate-200/60">
                        {payments.map((p) => {
                            const isIncoming = p.direction === PaymentDirection.IN;
                            const isAlreadyReversed =
                                isIncoming && reversedPaymentIds.has(p.id);

                            return (
                                <li
                                    key={p.id}
                                    className="flex flex-col justify-between gap-1.5 pt-2 first:pt-0 sm:flex-row sm:items-center"
                                >
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span
                                            className={`font-semibold ${
                                                isIncoming
                                                    ? isAlreadyReversed
                                                        ? "text-slate-500 line-through"
                                                        : "text-emerald-700"
                                                    : "text-rose-700"
                                            }`}
                                        >
                                            {isIncoming ? "+" : "−"}
                                            {formatVnd(p.amountVnd)}
                                        </span>
                                        <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                            {getMethodLabel(p.method)}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            ({isIncoming ? "Thu vào" : "Chi ra"})
                                        </span>
                                        {isAlreadyReversed && (
                                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                                Đã hoàn tác
                                            </span>
                                        )}
                                        {!isIncoming && (
                                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800 ring-1 ring-inset ring-rose-600/20">
                                                Hoàn tác
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-400">
                                            {formatDateTime(p.createdAt)}
                                        </span>

                                        {canReverse &&
                                            isIncoming &&
                                            !isAlreadyReversed && (
                                                <button
                                                    type="button"
                                                    disabled={loadingPaymentId === p.id}
                                                    onClick={() =>
                                                        handleReverse(
                                                            p.id,
                                                            p.amountVnd,
                                                        )
                                                    }
                                                    className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                                >
                                                    {loadingPaymentId === p.id
                                                        ? "Đang xử lý..."
                                                        : "Hoàn tác"}
                                                </button>
                                            )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
