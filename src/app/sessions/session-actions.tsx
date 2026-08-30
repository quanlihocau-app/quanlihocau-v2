"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SessionActionsProps {
    sessionId: string;
    canComplete: boolean;
    canCancel: boolean;
}

export function SessionActions({
    sessionId,
    canComplete,
    canCancel,
}: SessionActionsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleAction(action: "COMPLETE" | "CANCEL") {
        const label = action === "COMPLETE" ? "kết thúc" : "hủy";
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn ${label} phiên câu này?`,
        );
        if (!confirmed) return;

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
                return;
            }

            router.refresh();
        } catch {
            setError(`Đã có lỗi xảy ra khi ${action === "COMPLETE" ? "kết thúc" : "hủy"} phiên câu.`);
            setIsLoading(false);
        }
    }

    return (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {error ? (
                <p className="text-xs text-red-600">{error}</p>
            ) : null}
            <div className="flex items-center gap-2">
                {canComplete ? (
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAction("COMPLETE")}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {isLoading ? "Đang xử lý..." : "Kết thúc"}
                    </button>
                ) : null}
                {canCancel ? (
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAction("CANCEL")}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                        {isLoading ? "Đang xử lý..." : "Hủy phiên"}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
