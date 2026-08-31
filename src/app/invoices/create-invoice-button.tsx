"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";

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
            <Button
                type="button"
                onClick={handleCreateInvoice}
                isLoading={loading}
                loadingText="Đang tạo…"
                size="md"
                variant="primary"
            >
                Tạo hóa đơn
            </Button>
            {message && (
                <div className="mt-1">
                    <InlineAlert
                        type={message.type === "error" ? "error" : "success"}
                        message={message.text}
                    />
                </div>
            )}
        </div>
    );
}
