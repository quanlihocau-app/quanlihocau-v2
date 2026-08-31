"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export interface ActionPackage {
    id: string;
    name: string;
    durationMinutes: number;
    priceVnd: number;
}

interface SessionActionsProps {
    sessionId: string;
    canComplete: boolean;
    canCancel: boolean;
    invoiceId?: string | null;
    packages?: ActionPackage[];
}

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

export function SessionActions({
    sessionId,
    canComplete,
    canCancel,
    invoiceId,
    packages = [],
}: SessionActionsProps) {
    const router = useRouter();

    // Main action states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmAction, setConfirmAction] = useState<
        "COMPLETE" | "CANCEL" | null
    >(null);
    const [showNoInvoiceNotice, setShowNoInvoiceNotice] = useState(false);

    // Extension modal states
    const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        packages[0]?.id ?? "",
    );
    const [isExtending, setIsExtending] = useState(false);
    const [extensionError, setExtensionError] = useState("");
    const [extensionSuccess, setExtensionSuccess] = useState("");

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

    function handleAddProduct() {
        if (invoiceId) {
            router.push(`/invoices/${invoiceId}`);
        } else {
            setShowNoInvoiceNotice((prev) => !prev);
        }
    }

    function openExtensionModal() {
        setExtensionError("");
        setExtensionSuccess("");
        if (packages.length > 0 && !selectedPackageId) {
            setSelectedPackageId(packages[0].id);
        }
        setIsExtensionModalOpen(true);
    }

    async function handleConfirmExtension() {
        if (!selectedPackageId) {
            setExtensionError("Vui lòng chọn gói câu gia hạn.");
            return;
        }

        setIsExtending(true);
        setExtensionError("");
        setExtensionSuccess("");

        const idempotencyKey = crypto.randomUUID();

        try {
            const response = await fetch(
                `/api/fishing-sessions/${sessionId}/extensions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Idempotency-Key": idempotencyKey,
                    },
                    body: JSON.stringify({
                        packageId: selectedPackageId,
                    }),
                },
            );

            const data = (await response.json()) as {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                setExtensionError(
                    data.error ?? "Không thể gia hạn phiên câu.",
                );
                setIsExtending(false);
                return;
            }

            setExtensionSuccess(data.message ?? "Đã gia hạn thành công!");
            setIsExtending(false);

            setTimeout(() => {
                setIsExtensionModalOpen(false);
                router.refresh();
            }, 800);
        } catch {
            setExtensionError(
                "Lỗi kết nối mạng khi gia hạn. Vui lòng thử lại.",
            );
            setIsExtending(false);
        }
    }

    const selectedPkg = packages.find((p) => p.id === selectedPackageId);

    if (!canComplete && !canCancel && !invoiceId) {
        return null;
    }

    return (
        <div className="space-y-2">
            {error ? (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5">
                    <p className="text-xs text-red-700 font-bold">
                        {error}
                    </p>
                </div>
            ) : null}

            {/* Notice when session has no linked DRAFT invoice */}
            {showNoInvoiceNotice && (
                <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3.5 space-y-2">
                    <div className="flex items-start gap-2.5">
                        <svg
                            className="h-4 w-4 text-orange-600 mt-0.5 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                            />
                        </svg>
                        <div>
                            <p className="text-xs font-bold text-orange-950">
                                Phiên câu chưa có hóa đơn nháp liên kết
                            </p>
                            <p className="text-[11px] text-orange-800 mt-0.5 leading-relaxed">
                                Hóa đơn phiên câu sẽ tự động lập sau khi bấm
                                &quot;Kết thúc&quot;, hoặc bạn có thể lập hóa đơn
                                bán lẻ trực tiếp tại mục Bán hàng.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => router.push("/invoices")}
                        >
                            Đến mục Bán hàng
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowNoInvoiceNotice(false)}
                        >
                            Đóng
                        </Button>
                    </div>
                </div>
            )}

            {/* Confirmation overlay */}
            {confirmAction ? (
                <div className="rounded-2xl bg-red-50/70 border border-red-200 p-4 space-y-3">
                    <div>
                        <p className="text-xs font-bold text-red-950">
                            {confirmAction === "COMPLETE"
                                ? "Xác nhận kết thúc phiên câu này?"
                                : "Xác nhận hủy phiên câu này?"}
                        </p>
                        <p className="text-[11px] text-red-700 mt-0.5">
                            {confirmAction === "COMPLETE"
                                ? "Chòi sẽ được giải phóng và chuyển sang thanh toán hóa đơn."
                                : "Thao tác hủy không thể hoàn tác."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="lg"
                            variant={confirmAction === "COMPLETE" ? "danger" : "danger"}
                            isLoading={isLoading}
                            loadingText="Đang xử lý…"
                            onClick={() => handleAction(confirmAction)}
                            className="flex-1"
                        >
                            {confirmAction === "COMPLETE" ? "Kết thúc ngay" : "Hủy phiên"}
                        </Button>
                        <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => setConfirmAction(null)}
                            className="flex-1"
                        >
                            Không
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Primary Button Row: Thêm hàng — Gia hạn — Kết thúc */}
                    <div className="grid grid-cols-3 gap-2">
                        {/* 1. Thêm hàng (Navy) */}
                        <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            onClick={handleAddProduct}
                            className="px-2 text-xs text-[#102A43] border-[#E2DDD2] hover:bg-[#102A43]/5"
                            icon={
                                <svg
                                    className="h-4 w-4 shrink-0 text-[#102A43]"
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
                            }
                        >
                            <span>Thêm hàng</span>
                        </Button>

                        {/* 2. Gia hạn (Teal) */}
                        <Button
                            type="button"
                            size="lg"
                            variant="success"
                            onClick={openExtensionModal}
                            className="px-2 text-xs"
                            icon={
                                <svg
                                    className="h-4 w-4 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                    />
                                </svg>
                            }
                        >
                            <span>Gia hạn</span>
                        </Button>

                        {/* 3. Kết thúc (Red outline / Destructive action) */}
                        {canComplete ? (
                            <Button
                                type="button"
                                size="lg"
                                variant="danger"
                                onClick={() => setConfirmAction("COMPLETE")}
                                className="px-2 text-xs"
                            >
                                Kết thúc
                            </Button>
                        ) : null}
                    </div>

                    {/* Secondary Action: Hủy phiên */}
                    {canCancel ? (
                        <div className="flex justify-end pt-0.5">
                            <button
                                type="button"
                                onClick={() => setConfirmAction("CANCEL")}
                                className="text-[11px] font-bold text-red-600 hover:text-red-800 transition-colors p-1"
                            >
                                Hủy phiên câu
                            </button>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Extension Popup Modal */}
            {isExtensionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700">
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
                                            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-[#102A43]">
                                    Gia hạn phiên câu
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={isExtending}
                                onClick={() => setIsExtensionModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-[#F8F6F0]"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Error or Success notification */}
                        {extensionError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-bold">
                                {extensionError}
                            </div>
                        )}
                        {extensionSuccess && (
                            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800 font-bold">
                                {extensionSuccess}
                            </div>
                        )}

                        {/* Package List */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Chọn gói câu gia hạn:
                            </label>
                            {packages.length === 0 ? (
                                <div className="rounded-xl bg-[#F8F6F0] border border-[#E2DDD2] p-3 text-center text-xs text-slate-500 font-medium">
                                    Không có gói câu nào đang hoạt động.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {packages.map((pkg) => {
                                        const isSelected =
                                            selectedPackageId === pkg.id;
                                        return (
                                            <div
                                                key={pkg.id}
                                                onClick={() =>
                                                    setSelectedPackageId(
                                                        pkg.id,
                                                    )
                                                }
                                                className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition-all duration-150 ease-out active:scale-98 ${
                                                    isSelected
                                                        ? "border-[#0D9488] bg-teal-50/50 ring-1 ring-[#0D9488]"
                                                        : "border-[#E2DDD2] bg-white hover:border-slate-300"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                            isSelected
                                                                ? "border-[#0D9488] bg-[#0D9488]"
                                                                : "border-slate-300 bg-white"
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">
                                                            {pkg.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 font-medium">
                                                            +
                                                            {
                                                                pkg.durationMinutes
                                                            }{" "}
                                                            phút
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-[#0D9488] tabular-nums">
                                                    {formatPrice(
                                                        pkg.priceVnd,
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        {selectedPkg && (
                            <div className="rounded-xl bg-[#F8F6F0] border border-[#E2DDD2] p-3 text-xs flex items-center justify-between">
                                <span className="text-slate-600 font-medium">
                                    Thêm:{" "}
                                    <span className="font-bold text-slate-900">
                                        +{selectedPkg.durationMinutes} phút
                                    </span>
                                </span>
                                <span className="font-bold text-[#0D9488] tabular-nums">
                                    +{formatPrice(selectedPkg.priceVnd)}
                                </span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                disabled={isExtending}
                                onClick={() =>
                                    setIsExtensionModalOpen(false)
                                }
                                className="flex-1"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                size="lg"
                                variant="success"
                                isLoading={isExtending}
                                loadingText="Đang gia hạn…"
                                disabled={
                                    !selectedPackageId ||
                                    packages.length === 0
                                }
                                onClick={handleConfirmExtension}
                                className="flex-[2]"
                            >
                                Xác nhận gia hạn
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
