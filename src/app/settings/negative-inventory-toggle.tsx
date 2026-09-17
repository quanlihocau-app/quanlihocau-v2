"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

    async function handleToggle() {
        if (!canEdit || loading) return;

        const nextValue = !enabled;

        // Optimistic update for instant 0ms UI feedback
        setEnabled(nextValue);
        setLoading(true);

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
                // Revert on failure
                setEnabled(!nextValue);
                toast.error(data.error || "Không thể cập nhật cấu hình.");
                return;
            }

            toast.success(
                nextValue
                    ? "Đã bật: Cho phép xuất bán khi tồn kho âm"
                    : "Đã tắt: Chặn xuất bán khi thiếu tồn kho"
            );
            router.refresh();
        } catch {
            setEnabled(!nextValue);
            toast.error("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            onClick={canEdit && !loading ? handleToggle : undefined}
            className={`rounded-2xl border border-[#E3E8E3] bg-white p-4 shadow-xs transition-all flex items-center justify-between gap-4 ${
                canEdit && !loading ? "cursor-pointer hover:border-[#4F9D5A]/50 active:scale-[0.99]" : ""
            }`}
        >
            <div className="space-y-1 select-none pr-2 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#17201A]">
                        Cho phép bán âm kho
                    </span>
                    {enabled ? (
                        <Badge variant="warning">Đang bật</Badge>
                    ) : (
                        <Badge variant="neutral">Đang tắt</Badge>
                    )}
                </div>
                <p className="text-[12px] text-[#66716A] leading-relaxed">
                    Khi bật, hệ thống vẫn cho phép xuất bán khi tồn kho không đủ nhưng sẽ hiển thị cảnh báo màu cam.
                </p>
                {!canEdit && (
                    <p className="text-[11px] text-[#8A938D] italic pt-0.5">
                        Chỉ Chủ sở hữu (OWNER) có quyền thay đổi
                    </p>
                )}
            </div>

            <div className="shrink-0 flex items-center">
                {canEdit ? (
                    <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggle();
                        }}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#4F9D5A] disabled:opacity-50 ${
                            enabled ? "bg-[#4F9D5A]" : "bg-stone-300"
                        }`}
                        role="switch"
                        aria-checked={enabled}
                        aria-label="Bật tắt tính năng cho phép bán âm kho"
                    >
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                ) : (
                    <div
                        className="relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent bg-stone-200 opacity-60 cursor-not-allowed"
                        aria-disabled="true"
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-xs ${
                                enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
