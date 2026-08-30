"use client";

import { useState } from "react";

import { PaymentDirection, PaymentMethod } from "@/generated/prisma/enums";

export interface PaymentItem {
    id: string;
    amountVnd: number;
    method: PaymentMethod;
    direction: PaymentDirection;
    createdAt: Date | string;
}

interface PaymentHistoryProps {
    payments: PaymentItem[];
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

function getDirectionLabel(direction: PaymentDirection): string {
    switch (direction) {
        case PaymentDirection.IN:
            return "Thu vào";
        case PaymentDirection.OUT:
            return "Chi ra";
        default:
            return direction;
    }
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!payments || payments.length === 0) {
        return null;
    }

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
                    <ul className="space-y-1.5 divide-y divide-slate-200/60">
                        {payments.map((p) => {
                            const isIncoming =
                                p.direction === PaymentDirection.IN;

                            return (
                                <li
                                    key={p.id}
                                    className="flex flex-col justify-between gap-1 pt-1.5 first:pt-0 sm:flex-row sm:items-center"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`font-semibold ${
                                                isIncoming
                                                    ? "text-emerald-700"
                                                    : "text-red-700"
                                            }`}
                                        >
                                            {isIncoming ? "+" : "−"}
                                            {formatVnd(p.amountVnd)}
                                        </span>
                                        <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                            {getMethodLabel(p.method)}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            ({getDirectionLabel(p.direction)})
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                        {formatDateTime(p.createdAt)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
