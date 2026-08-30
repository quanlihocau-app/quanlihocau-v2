"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SessionActionsProps {
    sessionId: string;
    canComplete: boolean;
    canCancel: boolean;
    invoiceId?: string | null;
}

export function SessionActions({
    sessionId,
    canComplete,
    canCancel,
    invoiceId,
}: SessionActionsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmAction, setConfirmAction] = useState<
        "COMPLETE" | "CANCEL" | null
    >(null);

    async function handleAction(action: "COMPLETE" | "CANCEL") {
        const label = action === "COMPLETE" ? "kết thúc" : "hủy";

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/fishing-sessions/${sessionId}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action }),
                },
            );

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setError(
                    result.error ?? `Không thể ${label} phiên câu.`,
                );
                setIsLoading(false);
                setConfirmAction(null);
                return;
            }

            router.refresh();
        } catch {
            setError(
                `Đã có lỗi xảy ra khi ${confirmAction === "COMPLETE" ? "kết thúc" : "hủy"} phiên câu.`,
            );
            setIsLoading(false);
            setConfirmAction(null);
        }
    }

    if (!canComplete && !canCancel && !invoiceId) {
        return null;
    }

    return (
        <div className="space-y-2">
            {error ? (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                    <p className="text-xs text-red-700 font-medium">
                        {error}
                    </p>
                </div>
            ) : null}

            {/* Confirmation overlay */}
            {confirmAction ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">
                        {confirmAction === "COMPLETE"
                            ? "Xác nhận kết thúc phiên câu này?"
                            : "Xác nhận hủy phiên câu này?"}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleAction(confirmAction)}
                            className={`h-10 rounded-xl px-4 text-xs font-bold text-white shadow-sm transition-all duration-150 ease-out active:scale-95 disabled:opacity-60 ${
                                confirmAction === "COMPLETE"
                                    ? "bg-[#9E6B05]"
                                    : "bg-red-600"
                            }`}
                        >
                            {isLoading
                                ? "Đang xử lý…"
                                : confirmAction === "COMPLETE"
                                  ? "Kết thúc"
                                  : "Hủy phiên"}
                        </button>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => setConfirmAction(null)}
                            className="h-10 rounded-xl border border-[#EAE4D7] bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-150 ease-out active:scale-95 disabled:opacity-60"
                        >
                            Không
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {invoiceId ? (
                        <button
                            type="button"
                            onClick={() =>
                                router.push(`/invoices/${invoiceId}`)
                            }
                            className="h-11 min-w-[44px] rounded-xl border border-[#EAE4D7] bg-white px-4 text-xs font-bold text-[#9E6B05] shadow-sm transition-all duration-150 ease-out active:scale-95"
                        >
                            <span className="flex items-center gap-1.5">
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                                    />
                                </svg>
                                Thêm hàng
                            </span>
                        </button>
                    ) : null}

                    {canComplete ? (
                        <button
                            type="button"
                            onClick={() => setConfirmAction("COMPLETE")}
                            className="h-11 min-w-[44px] rounded-xl bg-[#9E6B05] px-4 text-xs font-bold text-white shadow-sm transition-all duration-150 ease-out active:scale-95"
                        >
                            Kết thúc
                        </button>
                    ) : null}

                    {canCancel ? (
                        <button
                            type="button"
                            onClick={() => setConfirmAction("CANCEL")}
                            className="h-11 min-w-[44px] rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 shadow-sm transition-all duration-150 ease-out active:scale-95"
                        >
                            Hủy phiên
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
}
