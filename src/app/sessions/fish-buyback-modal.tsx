"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

function cleanWeightInput(raw: string): string {
    if (!raw) return "";

    // 1. Chỉ giữ số, dấu chấm và dấu phẩy
    let cleaned = raw.replace(/[^0-9.,]/g, "");

    // 2. Nếu bắt đầu bằng dấu phân tách (. hoặc ,), tự động thêm "0" ở trước: ví dụ ",5" -> "0,5"
    if (cleaned.startsWith(",") || cleaned.startsWith(".")) {
        cleaned = "0" + cleaned;
    }

    // 3. Chỉ giữ dấu phân tách đầu tiên (. hoặc ,), loại bỏ các dấu chấm/phẩy dư thừa phía sau
    const firstSepIndex = cleaned.search(/[.,]/);
    if (firstSepIndex !== -1) {
        const sep = cleaned[firstSepIndex];
        const before = cleaned.slice(0, firstSepIndex);
        const after = cleaned.slice(firstSepIndex + 1).replace(/[.,]/g, "");
        // Giới hạn tối đa 2 chữ số phần thập phân (hỗ trợ nhập 0,5 ; 3,4 ; 1,25 ; 12,50)
        const trimmedAfter = after.slice(0, 2);
        cleaned = before + sep + trimmedAfter;
    }

    // 4. Xử lý số 0 ở đầu số nguyên: "03" -> "3", "00" -> "0", nhưng giữ "0," và "0."
    if (
        cleaned.length > 1 &&
        cleaned.startsWith("0") &&
        !cleaned.startsWith("0.") &&
        !cleaned.startsWith("0,")
    ) {
        cleaned = cleaned.replace(/^0+/, "") || "0";
    }

    return cleaned;
}

function parseWeight(input: string): number {
    if (!input) return 0;
    const normalized = input.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
}

export interface FishBuybackModalProps {
    sessionId?: string;
    invoiceId?: string | null;
    fishTypes?: Array<{ id: string; name: string; pricePerKg: number }>;
    onClose: () => void;
    onSuccess: () => void;
    onOptimisticBuyback?: (
        type: { id: string; name: string; pricePerKg: number },
        weight: number,
        totalVnd: number,
    ) => void;
}

export function FishBuybackModal({
    sessionId,
    invoiceId,
    fishTypes = [],
    onClose,
    onSuccess,
    onOptimisticBuyback,
}: FishBuybackModalProps) {
    const [types, setTypes] = useState(fishTypes);
    const [selectedTypeId, setSelectedTypeId] = useState(fishTypes[0]?.id ?? "");
    const [weightInput, setWeightInput] = useState("1");
    const weight = parseWeight(weightInput);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const { onBackdropClick } = useModalDismiss({
        isOpen: true,
        onClose,
        disabled: isSubmitting,
    });

    useEffect(() => {
        if (types.length === 0) {
            fetch("/api/fish-types")
                .then((r) => r.json())
                .then((data: { fishTypes?: Array<{ id: string; name: string; pricePerKg: number }> }) => {
                    if (data.fishTypes && data.fishTypes.length > 0) {
                        setTypes(data.fishTypes);
                        setSelectedTypeId(data.fishTypes[0].id);
                    }
                })
                .catch(() => {});
        }
    }, [types.length]);

    const selectedType = types.find((t) => t.id === selectedTypeId);
    const totalPayout = selectedType ? Math.round(weight * selectedType.pricePerKg) : 0;

    async function handleConfirm() {
        if (!selectedTypeId || !selectedType) {
            setSubmitError("Vui lòng chọn loại cá.");
            return;
        }
        if (weight <= 0) {
            setSubmitError("Số kg cá phải lớn hơn 0.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError("");
        setSubmitSuccess("");

        try {
            const res = await fetch("/api/fish-buybacks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fishTypeId: selectedTypeId,
                    weight,
                    sessionId: sessionId || undefined,
                    invoiceId: invoiceId || undefined,
                }),
            });

            const data = (await res.json()) as { error?: string; message?: string };

            if (!res.ok) {
                setSubmitError(data.error ?? "Không thể ghi nhận thu cá.");
                setIsSubmitting(false);
                return;
            }

            setSubmitSuccess(data.message ?? "Đã ghi nhận thu cá thành công!");
            setIsSubmitting(false);

            if (onOptimisticBuyback && selectedType) {
                onOptimisticBuyback(selectedType, weight, totalPayout);
            }

            setTimeout(() => {
                onSuccess();
            }, 150);
        } catch {
            setSubmitError("Lỗi kết nối mạng. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 modal-backdrop-animate"
            onClick={onBackdropClick}
        >
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 modal-content-animate">
                <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECEC] text-[#8B1E1E]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                            Thu cá từ cần thủ
                        </h3>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {submitError && (
                    <div className="rounded-xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-3 text-xs text-[#8B1E1E] font-semibold">
                        {submitError}
                    </div>
                )}
                {submitSuccess && (
                    <div className="rounded-xl border border-[#2D6A4F]/30 bg-[#E8F3ED] p-3 text-xs text-[#2D6A4F] font-semibold">
                        {submitSuccess}
                    </div>
                )}

                {/* Chọn loại cá */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">
                        Chọn loại cá:
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {types.map((type) => {
                            const isSelected = selectedTypeId === type.id;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSelectedTypeId(type.id)}
                                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                                        isSelected
                                            ? "border-[#9E6B05] bg-[#EAE2CE] font-bold text-slate-900 shadow-xs"
                                            : "border-[#EAE4D7] bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <p className="truncate">{type.name}</p>
                                    <p className="font-mono text-[11px] text-[#8A5B00] mt-0.5">{formatPrice(type.pricePerKg)}/kg</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Nhập số kg */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">
                        Số lượng cá (Kg):
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const newW = Math.max(0.1, Math.round((weight - 0.5) * 100) / 100);
                                const sep = weightInput.includes(".") ? "." : ",";
                                setWeightInput(String(newW).replace(".", sep));
                            }}
                            className="h-10 w-10 rounded-lg border border-[#EAE4D7] bg-white font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
                        >
                            -
                        </button>
                        <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={weightInput}
                            onFocus={(e) => {
                                const input = e.currentTarget;
                                setTimeout(() => {
                                    try {
                                        input.select();
                                    } catch {}
                                }, 50);
                            }}
                            onChange={(e) => {
                                setWeightInput(cleanWeightInput(e.target.value));
                            }}
                            className="h-10 flex-1 text-center font-mono font-bold text-slate-900 border border-[#EAE4D7] rounded-lg bg-[#FFFDF9]"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const newW = Math.round((weight + 0.5) * 100) / 100;
                                const sep = weightInput.includes(".") ? "." : ",";
                                setWeightInput(String(newW).replace(".", sep));
                            }}
                            className="h-10 w-10 rounded-lg border border-[#EAE4D7] bg-white font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Tạm tính tiền cá */}
                {selectedType && (
                    <div className="rounded-xl bg-[#FFFDF9] border border-[#EAE4D7] p-3 text-xs flex items-center justify-between">
                        <span className="text-slate-600">Tiền trả khách:</span>
                        <span className="font-mono font-bold text-[#8B1E1E] text-sm">
                            -{formatPrice(totalPayout)}
                        </span>
                    </div>
                )}

                {/* Nút hành động */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="flex-1"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang ghi nhận…"
                        disabled={!selectedTypeId || weight <= 0}
                        onClick={handleConfirm}
                        className="flex-2"
                    >
                        Xác nhận thu cá
                    </Button>
                </div>
            </div>
        </div>
    );
}
