"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {error}
                </div>
            )}

            {message && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    {message}
                </div>
            )}

            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                            Cho phép bán âm kho
                        </span>
                        {enabled ? (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                Đang bật
                            </span>
                        ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                Đang tắt
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Khi bật, hệ thống vẫn cho bán khi tồn kho không đủ nhưng sẽ hiển thị cảnh báo.
                    </p>
                </div>

                <div>
                    {canEdit ? (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleToggle}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 ${
                                enabled ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                            role="switch"
                            aria-checked={enabled}
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
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
            </div>
        </div>
    );
}
