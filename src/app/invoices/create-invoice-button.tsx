"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CreateInvoiceButtonProps {
    fishingSessionId: string;
}

export function CreateInvoiceButton({
    fishingSessionId,
}: CreateInvoiceButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{
        text: string;
        type: "success" | "info" | "error";
    } | null>(null);

    const handleCreateInvoice = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ fishingSessionId }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({
                    text: data.error || "Không thể tạo hóa đơn.",
                    type: "error",
                });
                return;
            }

            if (data.alreadyExists) {
                setMessage({
                    text: "Hóa đơn đã tồn tại cho phiên câu này.",
                    type: "info",
                });
            } else {
                setMessage({
                    text: "Đã tạo hóa đơn DRAFT thành công!",
                    type: "success",
                });
            }

            router.refresh();
        } catch {
            setMessage({
                text: "Lỗi kết nối máy chủ. Vui lòng thử lại.",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-end gap-1.5">
            <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={loading}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
                {loading ? "Đang tạo..." : "Tạo hóa đơn"}
            </button>
            {message && (
                <p
                    className={`text-xs ${
                        message.type === "success"
                            ? "text-emerald-600"
                            : message.type === "info"
                              ? "text-blue-600"
                              : "text-red-600"
                    }`}
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
