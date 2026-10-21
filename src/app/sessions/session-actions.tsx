"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SerializableInvoiceLine } from "./sessions-client";

import { Button } from "@/components/ui/button";
import { ModalPortal } from "@/components/ui/modal-portal";
import { usePrinter } from "@/lib/printing/use-printer";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
import { getCachedProducts, type Product } from "./add-product-modal";

export interface ActionPackage {
    id: string;
    name: string;
    durationMinutes: number;
    priceVnd: number;
}

export { getCachedProducts, type Product };

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

// ── Dynamically imported modals with ssr: false for optimal initial bundle ────
const SettlementCheckoutModal = dynamic(
    () =>
        import("./settlement-checkout-modal").then(
            (m) => m.SettlementCheckoutModal,
        ),
    { ssr: false },
);

const AddProductModal = dynamic(
    () => import("./add-product-modal").then((m) => m.AddProductModal),
    { ssr: false },
);

const FishBuybackModal = dynamic(
    () => import("./fish-buyback-modal").then((m) => m.FishBuybackModal),
    { ssr: false },
);

// ── Main SessionActions ───────────────────────────────────────────────────────
export interface SessionActionsProps {
    sessionId: string;
    canComplete: boolean;
    canCancel: boolean;
    invoiceId?: string | null;
    packages?: ActionPackage[];
    fishTypes?: Array<{ id: string; name: string; pricePerKg: number }>;
    netBalance?: number;
    onOptimisticAddProduct?: (product: Product, quantity: number) => void;
    onOptimisticExtend?: (result: ExtensionResult) => void;
    extensionRequested?: boolean;
    onExtensionRequestHandled?: () => void;
    onOptimisticFishBuyback?: (type: { id: string; name: string; pricePerKg: number }, weight: number, totalVnd: number) => void;
}

export interface ExtensionResult {
    session: { id: string; plannedEndAt: string };
    invoice: { id: string; newTotalAmountVnd: number };
    line: SerializableInvoiceLine;
}

export function SessionActions({
    sessionId,
    canComplete,
    canCancel,
    invoiceId,
    packages = [],
    fishTypes = [],
    netBalance,
    onOptimisticAddProduct,
    onOptimisticExtend,
    extensionRequested,
    onExtensionRequestHandled,
    onOptimisticFishBuyback,
}: SessionActionsProps) {
    const router = useRouter();

    // Main action states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmAction, setConfirmAction] = useState<
        "COMPLETE" | "CANCEL" | null
    >(null);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

    // Idle preload modals after 1500ms so user clicks open instantly with 0ms delay
    useEffect(() => {
        const timer = setTimeout(() => {
            import("./settlement-checkout-modal");
            import("./add-product-modal");
            import("./fish-buyback-modal");
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Add product modal states
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [showNoInvoiceNotice, setShowNoInvoiceNotice] = useState(false);

    // Extension modal states
    const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        packages[0]?.id ?? "",
    );
    const [extensionQuantity, setExtensionQuantity] = useState<number>(1);
    const [isExtending, setIsExtending] = useState(false);
    const [extensionError, setExtensionError] = useState("");
    const [extensionSuccess, setExtensionSuccess] = useState("");
    const extensionKeyRef = useRef<{ packageId: string; key: string } | null>(null);
    const extensionSubmittingRef = useRef(false);

    useEffect(() => {
        if (!extensionRequested) return;
        const timer = setTimeout(() => {
            setExtensionError("");
            setExtensionSuccess("");
            setIsExtensionModalOpen(true);
            onExtensionRequestHandled?.();
        }, 0);
        return () => clearTimeout(timer);
    }, [extensionRequested, onExtensionRequestHandled]);

    const { onBackdropClick: onExtensionBackdropClick } = useModalDismiss({
        isOpen: isExtensionModalOpen,
        onClose: () => setIsExtensionModalOpen(false),
        disabled: isExtending,
    });

    // Fish Buyback modal states
    const [isFishBuybackOpen, setIsFishBuybackOpen] = useState(false);

    // Printing state
    const { printSessionTicket } = usePrinter();
    const [isReprintingTicket, setIsReprintingTicket] = useState(false);
    const [reprintNotice, setReprintNotice] = useState<string | null>(null);

    async function handleReprintTicket() {
        setIsReprintingTicket(true);
        setReprintNotice(null);
        try {
            const res = await fetch(`/api/fishing-sessions/${sessionId}`);
            if (!res.ok) {
                setReprintNotice("Không thể tải thông tin phiên câu.");
                return;
            }
            const data = await res.json();
            const ticketResult = await printSessionTicket({
                sessionId: sessionId,
                ticketCode: sessionId.slice(0, 8).toUpperCase(),
                lakeName: data.lakeName || "HỒ CÂU",
                huts: data.session.huts,
                packageName: data.session.packageName,
                packagePriceVnd: data.financials.packageTotalVnd,
                durationMinutes: data.session.packageDurationMinutes,
                customerName: data.session.customerName,
                customerPhone: data.session.customerPhone,
                startAt: data.session.startTime,
                plannedEndAt: data.session.endTime,
                items: Array.isArray(data.invoice?.lines)
                    ? data.invoice.lines
                          .filter((l: any) => Boolean(l.productId))
                          .map((l: any) => ({
                              name: l.name,
                              quantity: Number(l.quantity) || 1,
                              unitPrice: l.unitPrice,
                              totalVnd: l.totalVnd,
                          }))
                    : undefined,
                prepaidAmountVnd: data.financials.totalPaidVnd,
                balanceDueVnd: data.financials.netDueVnd,
                isReprint: true,
            });
            if (ticketResult.success) {
                setReprintNotice("Đã gửi lệnh in vé lại!");
            } else {
                setReprintNotice("Không thể in (kiểm tra máy in trong Cài đặt).");
            }
        } catch {
            setReprintNotice("Lỗi khi gửi lệnh in vé.");
        } finally {
            setIsReprintingTicket(false);
            setTimeout(() => setReprintNotice(null), 3000);
        }
    }

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
            setShowNoInvoiceNotice(false);
            setIsAddProductModalOpen(true);
        } else {
            setShowNoInvoiceNotice((prev) => !prev);
        }
    }

    function handleAddProductSuccess() {
        setIsAddProductModalOpen(false);
        router.refresh();
    }

    function openExtensionModal() {
        setExtensionError("");
        setExtensionSuccess("");
        if (packages.length > 0 && !selectedPackageId) {
            setSelectedPackageId(packages[0].id);
        }
        setExtensionQuantity(1);
        setIsExtensionModalOpen(true);
    }

    async function handleConfirmExtension() {
        if (extensionSubmittingRef.current) return;
        if (!selectedPackageId) {
            setExtensionError("Vui lòng chọn gói câu gia hạn.");
            return;
        }

        extensionSubmittingRef.current = true;
        setIsExtending(true);
        setExtensionError("");
        setExtensionSuccess("");

        if (extensionKeyRef.current?.packageId !== selectedPackageId) {
            extensionKeyRef.current = { packageId: selectedPackageId, key: crypto.randomUUID() };
        }
        const idempotencyKey = extensionKeyRef.current.key;

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
                        quantity: extensionQuantity,
                    }),
                },
            );

            const data = (await response.json()) as ExtensionResult & {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                setExtensionError(
                    data.error ?? "Không thể gia hạn phiên câu.",
                );
                return;
            }

            setExtensionSuccess(data.message ?? "Đã gia hạn thành công!");
            onOptimisticExtend?.(data);
            extensionKeyRef.current = null;
            setIsExtensionModalOpen(false);
            router.refresh();
        } catch {
            setExtensionError(
                "Lỗi kết nối mạng khi gia hạn. Vui lòng thử lại.",
            );
        } finally {
            extensionSubmittingRef.current = false;
            setIsExtending(false);
        }
    }

    const selectedPkg = packages.find((p) => p.id === selectedPackageId);

    if (!canComplete && !canCancel && !invoiceId) {
        return null;
    }

    return (
        <div className="space-y-2.5">
            {error ? (
                <div className="rounded-xs bg-[#FFF1F0] border border-[#FFA39E] px-3 py-2 font-serif">
                    <p className="text-xs text-[#A8071A] font-semibold">
                        {error}
                    </p>
                </div>
            ) : null}

            {/* Notice when session has no linked DRAFT invoice */}
            {showNoInvoiceNotice && (
                <div className="rounded-xs bg-[#FFFBE6] border border-[#FFE58F] p-3 space-y-2 font-serif">
                    <div className="flex items-start gap-2">
                        <svg
                            className="h-4 w-4 text-[#D48806] mt-0.5 shrink-0"
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
                            <p className="text-xs font-bold text-[#1A1A1A]">
                                Chưa tìm thấy hóa đơn của phiên
                            </p>
                            <p className="text-xs text-[#D48806] mt-0.5">
                                Không thể thêm hàng hoặc gia hạn khi phiên câu chưa được liên kết với hóa đơn mở ca.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end">
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

            {/* Confirmation overlay for cancel */}
            {confirmAction === "CANCEL" ? (
                <div className="rounded-xs bg-[#FFF1F0] border border-[#FFA39E] p-3 space-y-2.5 font-serif">
                    <div>
                        <p className="text-xs font-bold text-[#A8071A] uppercase tracking-wide">
                            Xác nhận hủy phiên câu này?
                        </p>
                        <p className="text-xs text-[#555555] mt-0.5">
                            Thao tác hủy không thể hoàn tác. Chòi câu sẽ được giải phóng lập tức.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="md"
                            variant="danger"
                            isLoading={isLoading}
                            loadingText="Đang xử lý…"
                            onClick={() => handleAction("CANCEL")}
                            className="flex-1"
                        >
                            Hủy phiên
                        </Button>
                        <Button
                            type="button"
                            size="md"
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
                    {/* Primary Grid: Thêm hàng, Gia hạn, Thu cá */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={handleAddProduct}
                            className="mobile-pos-btn mobile-pos-btn-secondary"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Thêm hàng</span>
                        </button>

                        <button
                            type="button"
                            onClick={openExtensionModal}
                            className="mobile-pos-btn mobile-pos-btn-secondary"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span>Gia hạn</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsFishBuybackOpen(true)}
                            className="mobile-pos-btn mobile-pos-btn-secondary"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span>Thu cá</span>
                        </button>
                    </div>

                    {reprintNotice && (
                        <div className="rounded-lg bg-slate-800 text-white text-xs px-3 py-1.5 text-center font-medium shadow-sm">
                            {reprintNotice}
                        </div>
                    )}

                    {/* Secondary Row: Kết thúc ca, In lại vé & Hủy phiên */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                        {canComplete && (
                            <button
                                type="button"
                                onClick={() => setIsSettlementModalOpen(true)}
                                className={`mobile-pos-btn flex-1 text-xs py-2 flex items-center justify-center gap-1.5 font-bold transition-all ${
                                    typeof netBalance === "number" && netBalance < 0
                                        ? "bg-[#A8071A] hover:bg-[#820014] text-white"
                                        : typeof netBalance === "number" && netBalance === 0
                                        ? "bg-[#2C4C3B] hover:bg-[#233D2F] text-white"
                                        : "mobile-pos-btn-primary"
                                }`}
                            >
                                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0H3m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0H2.25m0 0a.75.75 0 0 0 .75.75h.75m10.5-12v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0h-.75m0 0a.75.75 0 0 0 .75.75h.75M6 10.5h12m-12 3h12" />
                                </svg>
                                <span>
                                    {typeof netBalance === "number"
                                        ? netBalance < 0
                                            ? `Thối tiền -${formatPrice(Math.abs(netBalance))} & In bill`
                                            : netBalance > 0
                                            ? `Thu thêm +${formatPrice(netBalance)} & In bill`
                                            : "Đóng phiên & In bill"
                                        : "Thanh toán & In bill"}
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleReprintTicket}
                            disabled={isReprintingTicket}
                            title="In lại phiếu mở vé 58mm"
                            className="mobile-pos-btn mobile-pos-btn-secondary text-xs py-2 px-3 flex items-center gap-1 shrink-0"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.048-.28-1.574-.084-2.028a2.25 2.25 0 0 1 1.002-1.002c.454-.196.98-.156 2.028.084M17.28 13.829c.24-1.048.28-1.574.084-2.028a2.25 2.25 0 0 0-1.002-1.002c-.454-.196-.98-.156-2.028.084M9 19.5h6a2.25 2.25 0 0 0 2.25-2.25V9.75A2.25 2.25 0 0 0 15 7.5H9a2.25 2.25 0 0 0-2.25 2.25v7.5A2.25 2.25 0 0 0 9 19.5Z" />
                            </svg>
                            <span>{isReprintingTicket ? "Đang in…" : "In lại vé"}</span>
                        </button>
                        {canCancel && (
                            <button
                                type="button"
                                onClick={() => setConfirmAction("CANCEL")}
                                className="text-xs font-semibold text-[#8B1E1E] hover:underline px-2.5 py-2 cursor-pointer shrink-0"
                            >
                                Hủy phiên
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Add Product Modal ──────────────────────────────────────────────── */}
            {isAddProductModalOpen && invoiceId && (
                <AddProductModal
                    invoiceId={invoiceId}
                    onClose={() => setIsAddProductModalOpen(false)}
                    onSuccess={handleAddProductSuccess}
                    onOptimisticAdd={onOptimisticAddProduct}
                />
            )}

            {/* ── Fish Buyback Modal ─────────────────────────────────────────────── */}
            {isFishBuybackOpen && (
                <FishBuybackModal
                    sessionId={sessionId}
                    invoiceId={invoiceId}
                    fishTypes={fishTypes}
                    onClose={() => setIsFishBuybackOpen(false)}
                    onSuccess={() => {
                        setIsFishBuybackOpen(false);
                        router.refresh();
                    }}
                    onOptimisticBuyback={onOptimisticFishBuyback}
                />
            )}

            {/* ── Extension Modal ────────────────────────────────────────────────── */}
            {isExtensionModalOpen && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-150 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs modal-backdrop-animate font-serif"
                        onClick={onExtensionBackdropClick}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="relative my-auto w-full max-w-md rounded-[28px] bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden modal-content-animate font-serif"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header: Sticky top */}
                            <div className="flex items-center justify-between border-b border-[#E0E0E0] bg-[#FAFAF7] px-4 py-3 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                                            Gia hạn phiên câu
                                        </h3>
                                        <p className="text-[11px] text-[#666666]">
                                            Bấm 1 cái = 1 ca, bấm 2 cái = 2 ca (x2, x3…)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={isExtending}
                                    onClick={() => setIsExtensionModalOpen(false)}
                                    className="h-8 w-8 rounded-full border border-[#CCCCCC] bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#F2F2F0] transition-colors cursor-pointer"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Notifications */}
                            {extensionError && (
                                <div className="mx-4 mt-3 rounded-xl border border-[#FFCCC7] bg-[#FFF1F0] p-2.5 text-xs text-[#A8071A] font-semibold">
                                    ⚠️ {extensionError}
                                </div>
                            )}
                            {extensionSuccess && (
                                <div className="mx-4 mt-3 rounded-xl border border-[#B7EB8F] bg-[#F6FFED] p-2.5 text-xs text-[#2C4C3B] font-semibold">
                                    ✅ {extensionSuccess}
                                </div>
                            )}

                            {/* Package list: Scrollable */}
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                                {/* Hướng dẫn trực quan gia hạn giờ */}
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-slate-700 font-serif">
                                    <p className="font-bold text-[#16A34A] mb-1">👉 Hướng dẫn cộng thêm giờ:</p>
                                    <div className="space-y-0.5 text-[11px] text-slate-600">
                                        <p>• <strong>Bấm chọn gói câu</strong> khách muốn câu thêm.</p>
                                        <p>• Bấm tiếp nếu muốn nhân đôi số ca (x2, x3...).</p>
                                        <p>• Giờ câu mới sẽ <strong>tự động nối tiếp</strong> từ giờ kết thúc cũ.</p>
                                    </div>
                                </div>

                                <label className="text-xs font-bold text-[#1A1A1A] block pt-1">
                                    Chọn gói câu gia hạn:
                                </label>

                                {packages.length === 0 ? (
                                    <div className="rounded-xl bg-[#FAFAF7] border border-[#CCCCCC] p-4 text-center text-xs text-[#666666]">
                                        Không có gói câu nào đang hoạt động.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {packages.map((pkg) => {
                                            const isSelected = selectedPackageId === pkg.id;
                                            return (
                                                <div
                                                    key={pkg.id}
                                                    onClick={() => {
                                                        if (isExtending) return;
                                                        if (selectedPackageId === pkg.id) {
                                                            setExtensionQuantity((q) => Math.min(24, q + 1));
                                                        } else {
                                                            setSelectedPackageId(pkg.id);
                                                            setExtensionQuantity(1);
                                                        }
                                                    }}
                                                    className={`cursor-pointer rounded-2xl border p-3 flex items-center justify-between transition-all select-none active:scale-[0.99] ${
                                                        isSelected
                                                            ? "border-[#2C4C3B] bg-[#EAEFEA] shadow-xs ring-1 ring-[#2C4C3B]/30"
                                                            : "border-[#DDDDDD] bg-white hover:border-[#2C4C3B] hover:bg-[#FAFAF7]"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                isSelected
                                                                    ? "border-[#2C4C3B] bg-[#2C4C3B]"
                                                                    : "border-[#CCCCCC] bg-white"
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <div className="h-2 w-2 rounded-full bg-white" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-[#1A1A1A] truncate">
                                                                {pkg.name}
                                                            </p>
                                                            <p className="text-[11px] text-[#555555]">
                                                                +{pkg.durationMinutes} phút / ca
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {isSelected && (
                                                            <div
                                                                className="flex items-center gap-1 bg-white border border-[#2C4C3B] rounded-lg p-0.5 shadow-2xs"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    disabled={extensionQuantity <= 1 || isExtending}
                                                                    onClick={() => setExtensionQuantity((q) => Math.max(1, q - 1))}
                                                                    className="h-6 w-6 rounded-md text-[#2C4C3B] hover:bg-slate-100 flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-5 text-center text-xs font-extrabold text-[#2C4C3B]">
                                                                    {extensionQuantity}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    disabled={extensionQuantity >= 24 || isExtending}
                                                                    onClick={() => setExtensionQuantity((q) => Math.min(24, q + 1))}
                                                                    className="h-6 w-6 rounded-md bg-[#2C4C3B] text-white hover:bg-[#233D2F] flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        )}
                                                        <span className="text-xs font-extrabold text-[#2C4C3B] tabular-nums font-serif">
                                                            {formatPrice(pkg.priceVnd * (isSelected ? extensionQuantity : 1))}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Summary Box */}
                            {selectedPkg && (
                                <div className="border-t border-[#E0E0E0] bg-[#FAFAF7] px-4 py-2.5 shrink-0 text-xs flex items-center justify-between">
                                    <div>
                                        <span className="text-[#555555]">Gia hạn: </span>
                                        <strong className="text-[#1A1A1A]">
                                            {selectedPkg.name} {extensionQuantity > 1 ? `(x${extensionQuantity})` : ""}
                                        </strong>
                                        <div className="text-[11px] text-[#2C4C3B] font-semibold">
                                            +{selectedPkg.durationMinutes * extensionQuantity} phút ({(selectedPkg.durationMinutes * extensionQuantity / 60).toFixed(1)}h)
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[11px] text-[#555555] block">Tiền cộng vào bill</span>
                                        <span className="text-sm font-extrabold text-[#2C4C3B] tabular-nums font-serif">
                                            +{formatPrice(selectedPkg.priceVnd * extensionQuantity)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* STICKY FOOTER: ALWAYS VISIBLE */}
                            <div className="border-t border-[#E0E0E0] bg-white px-4 py-3 shrink-0 flex items-center gap-2.5 shadow-lg">
                                <Button
                                    type="button"
                                    size="md"
                                    variant="outline"
                                    disabled={isExtending}
                                    onClick={() => setIsExtensionModalOpen(false)}
                                    className="flex-1 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Hủy thao tác
                                </Button>
                                <Button
                                    type="button"
                                    size="md"
                                    variant="primary"
                                    isLoading={isExtending}
                                    loadingText="Đang ghi sổ…"
                                    disabled={!selectedPackageId || packages.length === 0 || isExtending}
                                    onClick={handleConfirmExtension}
                                    className="flex-2 text-xs sm:text-sm font-bold bg-[#2C4C3B] hover:bg-[#233D2F] text-white shadow-md disabled:opacity-50"
                                >
                                    {selectedPkg
                                        ? `Xác nhận (+${selectedPkg.durationMinutes * extensionQuantity}p • +${formatPrice(selectedPkg.priceVnd * extensionQuantity)})`
                                        : "Xác nhận gia hạn"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* ── Settlement Checkout Modal ─────────────────────────────────────── */}
            <SettlementCheckoutModal
                sessionId={sessionId}
                isOpen={isSettlementModalOpen}
                onClose={() => setIsSettlementModalOpen(false)}
                onCompleted={() => {
                    setIsSettlementModalOpen(false);
                    router.refresh();
                }}
            />
        </div>
    );
}
