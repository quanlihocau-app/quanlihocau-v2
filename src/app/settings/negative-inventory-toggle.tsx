"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";

interface NegativeInventoryToggleProps {
    initialAllowNegative: boolean;
    canEdit: boolean;
}

export function NegativeInventoryToggle({
    initialAllowNegative,
    canEdit,
}: NegativeInventoryToggleProps) {
    const router = useRouter();
    const [enabled, setEnabled] = useState(initialAllowNegative);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleToggle() {
        if (!canEdit || loading) return;

        const nextValue = !enabled;
        const confirmText = nextValue
            ? "Bạn có chắc chắn muốn BẬT tính năng cho phép bán âm kho không?\n\nKhi bật, hệ thống vẫn cho bán khi tồn kho không đủ nhưng sẽ hiển thị cảnh báo."
            : "Bạn có chắc chắn muốn TẮT tính năng cho phép bán âm kho không?\n\nKhi tắt, hệ thống sẽ từ chối thêm sản phẩm vào hóa đơn nếu số lượng tồn kho không đủ.";

        const confirmed = window.confirm(confirmText);
        if (!confirmed) return;

        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    allowNegativeInventory: nextValue,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể cập nhật cấu hình.");
                return;
            }

            setEnabled(data.allowNegativeInventory);
            setMessage(data.message || "Cập nhật cấu hình thành công.");
            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            {error && (
                <InlineAlert type="error" message={error} />
            )}

            {message && (
                <InlineAlert type="success" message={message} />
            )}

            <Card className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                            Cho phép bán âm kho
                        </span>
                        {enabled ? (
                            <Badge variant="warning">Đang bật</Badge>
                        ) : (
                            <Badge variant="neutral">Đang tắt</Badge>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Khi bật, hệ thống vẫn cho phép xuất bán khi tồn kho không đủ nhưng sẽ hiển thị cảnh báo màu cam.
                    </p>
                </div>

                <div>
                    {canEdit ? (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleToggle}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#102A43] focus:ring-offset-2 disabled:opacity-50 ${
                                enabled ? "bg-[#0D9488]" : "bg-slate-300"
                            }`}
                            role="switch"
                            aria-checked={enabled}
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    enabled ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                        </button>
                    ) : (
                        <span className="text-xs text-slate-400 italic">
                            Chỉ Chủ sở hữu (OWNER) có quyền thay đổi
                        </span>
                    )}
                </div>
            </Card>
        </div>
    );
}
