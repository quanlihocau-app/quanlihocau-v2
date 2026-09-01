"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export interface ActionPackage {
    id: string;
    name: string;
    durationMinutes: number;
    priceVnd: number;
}

interface Product {
    id: string;
    name: string;
    priceVnd: number;
    sku: string | null;
}

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

// ── Add Product Modal ─────────────────────────────────────────────────────────
interface AddProductModalProps {
    invoiceId: string;
    onClose: () => void;
    onSuccess: () => void;
}

function AddProductModal({ invoiceId, onClose, onSuccess }: AddProductModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const searchRef = useRef<HTMLInputElement>(null);

    // Load products on mount
    useEffect(() => {
        let cancelled = false;

        fetch("/api/products")
            .then((r) => r.json())
            .then((data: { products?: Product[]; error?: string }) => {
                if (cancelled) return;
                if (data.error) {
                    setLoadError(data.error);
                } else {
                    setProducts(data.products ?? []);
                }
            })
            .catch(() => {
                if (!cancelled) setLoadError("Không thể tải danh sách sản phẩm.");
            })
            .finally(() => {
                if (!cancelled) setIsLoadingProducts(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Focus search on open
    useEffect(() => {
        const t = setTimeout(() => searchRef.current?.focus(), 100);
        return () => clearTimeout(t);
    }, []);

    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())),
    );

    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const subtotal = selectedProduct ? selectedProduct.priceVnd * quantity : 0;

    async function handleConfirm() {
        if (!selectedProductId || !selectedProduct) {
            setSubmitError("Vui lòng chọn sản phẩm.");
            return;
        }
        if (quantity < 1) {
            setSubmitError("Số lượng phải ít nhất là 1.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError("");
        setSubmitSuccess("");

        const idempotencyKey = crypto.randomUUID();

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/lines`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                    productId: selectedProductId,
                    quantity,
                }),
            });

            const data = (await res.json()) as { error?: string; message?: string; negativeInventoryWarning?: boolean; warningMessage?: string };

            if (!res.ok) {
                setSubmitError(data.error ?? "Không thể thêm sản phẩm vào hóa đơn.");
                setIsSubmitting(false);
                return;
            }

            setSubmitSuccess(data.message ?? "Đã thêm sản phẩm thành công!");
            setIsSubmitting(false);

            setTimeout(() => {
                onSuccess();
            }, 700);
        } catch {
            setSubmitError("Lỗi kết nối mạng. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div className="add-product-sheet">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#D9D2C8] pb-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFE4CF] text-[#8A5A20]">
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
                        </div>
                        <h3 className="text-base font-bold text-[#27231F]">
                            Thêm hàng
                        </h3>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#766F67] hover:bg-[#F4F2EE] hover:text-[#27231F]"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Feedback */}
                {submitError && (
                    <div className="rounded-xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-3 text-xs font-semibold text-[#8B1E1E]">
                        {submitError}
                    </div>
                )}
                {submitSuccess && (
                    <div className="rounded-xl border border-[#2D6A4F]/30 bg-[#E8F3ED] p-3 text-xs font-semibold text-[#2D6A4F]">
                        {submitSuccess}
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#766F67]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        ref={searchRef}
                        type="search"
                        placeholder="Tìm sản phẩm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] pl-9 pr-3 text-[13px] text-[#27231F] placeholder:text-[#766F67] focus:border-[#8A5A20] focus:outline-none focus:ring-1 focus:ring-[#8A5A20]/30"
                    />
                </div>

                {/* Product grid */}
                <div className="product-scroll-area">
                    {isLoadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                            <svg className="h-5 w-5 animate-spin text-[#8A5A20]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-3 text-center text-xs text-[#8B1E1E]">
                            {loadError}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] p-4 text-center text-xs text-[#766F67]">
                            {search ? "Không tìm thấy sản phẩm phù hợp." : "Chưa có sản phẩm nào."}
                        </div>
                    ) : (
                        <div className="product-grid">
                            {filtered.map((product) => {
                                const isSelected = selectedProductId === product.id;
                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedProductId(product.id);
                                            setQuantity(1);
                                            setSubmitError("");
                                        }}
                                        className={[
                                            "product-item",
                                            isSelected ? "product-item--selected" : "",
                                        ].filter(Boolean).join(" ")}
                                    >
                                        <span className="product-item__name">{product.name}</span>
                                        <span className="product-item__price">{formatPrice(product.priceVnd)}</span>
                                        {product.sku && (
                                            <span className="product-item__sku">{product.sku}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quantity + subtotal */}
                {selectedProduct && (
                    <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-[#27231F]">
                                    {selectedProduct.name}
                                </p>
                                <p className="text-[12px] text-[#766F67]">
                                    {formatPrice(selectedProduct.priceVnd)} / sản phẩm
                                </p>
                            </div>
                            {/* Quantity stepper */}
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    disabled={quantity <= 1 || isSubmitting}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9D2C8] bg-white text-[#27231F] disabled:opacity-40"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                    </svg>
                                </button>
                                <span className="w-8 text-center text-[14px] font-bold tabular-nums text-[#27231F]">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9D2C8] bg-white text-[#27231F] disabled:opacity-40"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-[#D9D2C8] pt-2.5">
                            <span className="text-[12px] text-[#766F67]">Tạm tính</span>
                            <span className="text-[14px] font-bold tabular-nums text-[#8A5A20]">
                                {formatPrice(subtotal)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
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
                        loadingText="Đang thêm…"
                        disabled={!selectedProductId || isSubmitting || !!submitSuccess}
                        onClick={handleConfirm}
                        className="flex-2"
                    >
                        Xác nhận thêm hàng
                    </Button>
                </div>

                {/* Styles */}
                <style>{`
                    .add-product-sheet {
                        width: 100%;
                        max-width: 480px;
                        background: white;
                        border-radius: 20px 20px 0 0;
                        padding: 20px 16px;
                        padding-bottom: calc(16px + env(safe-area-inset-bottom));
                        display: flex;
                        flex-direction: column;
                        gap: 14px;
                        max-height: 90dvh;
                        overflow: hidden;
                    }

                    @media (min-width: 640px) {
                        .add-product-sheet {
                            border-radius: 20px;
                            max-height: 85vh;
                        }
                    }

                    .product-scroll-area {
                        overflow-y: auto;
                        max-height: 240px;
                        -webkit-overflow-scrolling: touch;
                        flex-shrink: 1;
                    }

                    .product-grid {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 8px;
                    }

                    .product-item {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                        min-width: 0;
                        text-align: left;
                        padding: 10px 12px;
                        border-radius: 12px;
                        border: 1.5px solid #D9D2C8;
                        background: white;
                        cursor: pointer;
                        transition: border-color 0.12s, background 0.12s;
                        -webkit-tap-highlight-color: transparent;
                    }

                    .product-item:hover {
                        border-color: rgba(138, 90, 32, 0.4);
                        background: #F9F6F1;
                    }

                    .product-item--selected {
                        border-color: #8A5A20;
                        background: #EFE4CF;
                    }

                    .product-item__name {
                        font-size: 12px;
                        font-weight: 600;
                        color: #27231F;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        line-height: 1.4;
                    }

                    .product-item__price {
                        font-size: 12px;
                        font-weight: 700;
                        color: #8A5A20;
                        font-variant-numeric: tabular-nums;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .product-item__sku {
                        font-size: 10px;
                        color: #766F67;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                `}</style>
            </div>
        </div>
    );
}

interface FishBuybackModalProps {
    fishTypes?: Array<{ id: string; name: string; pricePerKg: number }>;
    onClose: () => void;
    onSuccess: () => void;
}

function FishBuybackModal({
    fishTypes = [],
    onClose,
    onSuccess,
}: FishBuybackModalProps) {
    const [types, setTypes] = useState(fishTypes);
    const [selectedTypeId, setSelectedTypeId] = useState(fishTypes[0]?.id ?? "");
    const [weight, setWeight] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

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
            setTimeout(() => {
                onSuccess();
            }, 700);
        } catch {
            setSubmitError("Lỗi kết nối mạng. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
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
                            onClick={() => setWeight((w) => Math.max(0.5, Math.round((w - 0.5) * 10) / 10))}
                            className="h-10 w-10 rounded-lg border border-[#EAE4D7] bg-white font-bold text-slate-800 hover:bg-slate-50"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={weight}
                            onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="h-10 flex-1 text-center font-mono font-bold text-slate-900 border border-[#EAE4D7] rounded-lg bg-[#FFFDF9]"
                        />
                        <button
                            type="button"
                            onClick={() => setWeight((w) => Math.round((w + 0.5) * 10) / 10)}
                            className="h-10 w-10 rounded-lg border border-[#EAE4D7] bg-white font-bold text-slate-800 hover:bg-slate-50"
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

// ── Main SessionActions ───────────────────────────────────────────────────────
export interface SessionActionsProps {
    sessionId: string;
    canComplete: boolean;
    canCancel: boolean;
    invoiceId?: string | null;
    packages?: ActionPackage[];
    fishTypes?: Array<{ id: string; name: string; pricePerKg: number }>;
}

export function SessionActions({
    sessionId,
    canComplete,
    canCancel,
    invoiceId,
    packages = [],
    fishTypes = [],
}: SessionActionsProps) {
    const router = useRouter();

    // Main action states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmAction, setConfirmAction] = useState<
        "COMPLETE" | "CANCEL" | null
    >(null);

    // Add product modal states
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [showNoInvoiceNotice, setShowNoInvoiceNotice] = useState(false);

    // Extension modal states
    const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        packages[0]?.id ?? "",
    );
    const [isExtending, setIsExtending] = useState(false);
    const [extensionError, setExtensionError] = useState("");
    const [extensionSuccess, setExtensionSuccess] = useState("");

    // Fish Buyback modal states
    const [isFishBuybackOpen, setIsFishBuybackOpen] = useState(false);

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
        <div className="space-y-2.5">
            {error ? (
                <div className="rounded-xl bg-[#FAECEC] border border-[#8B1E1E]/30 px-3.5 py-2.5">
                    <p className="text-xs text-[#8B1E1E] font-semibold">
                        {error}
                    </p>
                </div>
            ) : null}

            {/* Notice when session has no linked DRAFT invoice */}
            {showNoInvoiceNotice && (
                <div className="rounded-2xl bg-[#F8ECE2] border border-[#9A4C16]/30 p-3.5 space-y-2">
                    <div className="flex items-start gap-2.5">
                        <svg
                            className="h-4 w-4 text-[#9A4C16] mt-0.5 shrink-0"
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
                            <p className="text-xs font-bold text-[#27231F]">
                                Phiên câu chưa có hóa đơn nháp liên kết
                            </p>
                            <p className="text-xs text-[#766F67] mt-0.5 leading-relaxed">
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
                <div className="rounded-2xl bg-[#FAECEC] border border-[#8B1E1E]/30 p-4 space-y-3">
                    <div>
                        <p className="text-xs font-bold text-[#8B1E1E]">
                            {confirmAction === "COMPLETE"
                                ? "Xác nhận kết thúc phiên câu này?"
                                : "Xác nhận hủy phiên câu này?"}
                        </p>
                        <p className="text-xs text-[#766F67] mt-0.5">
                            {confirmAction === "COMPLETE"
                                ? "Chòi sẽ được giải phóng và chuyển sang thanh toán hóa đơn."
                                : "Thao tác hủy không thể hoàn tác."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="lg"
                            variant="danger"
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
                    {/* Primary Button Row: Thêm hàng — Gia hạn — Thu cá */}
                    <div className="grid grid-cols-3 gap-2">
                        {/* 1. Thêm hàng */}
                        <button
                            type="button"
                            onClick={handleAddProduct}
                            className="mobile-pos-btn flex-col py-2 px-1 text-center"
                        >
                            <svg
                                className="h-4 w-4 mb-0.5 text-slate-700"
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
                            <span>Thêm hàng</span>
                        </button>

                        {/* 2. Gia hạn */}
                        <button
                            type="button"
                            onClick={openExtensionModal}
                            className="mobile-pos-btn flex-col py-2 px-1 text-center"
                        >
                            <svg
                                className="h-4 w-4 mb-0.5 text-[#8A5B00]"
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
                            <span>Gia hạn</span>
                        </button>

                        {/* 3. Thu cá */}
                        <button
                            type="button"
                            onClick={() => setIsFishBuybackOpen(true)}
                            className="mobile-pos-btn flex-col py-2 px-1 text-center"
                        >
                            <svg
                                className="h-4 w-4 mb-0.5 text-[#8B1E1E]"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                            </svg>
                            <span>Thu cá</span>
                        </button>
                    </div>

                    {/* Secondary Row: Kết thúc ca & Hủy phiên */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                        {canComplete && (
                            <button
                                type="button"
                                onClick={() => setConfirmAction("COMPLETE")}
                                className="mobile-pos-btn mobile-pos-btn-primary flex-1 text-xs py-2"
                            >
                                Kết thúc ca
                            </button>
                        )}
                        {canCancel && (
                            <button
                                type="button"
                                onClick={() => setConfirmAction("CANCEL")}
                                className="text-xs font-semibold text-[#8B1E1E] hover:underline px-3 py-2 cursor-pointer"
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
                />
            )}

            {/* ── Fish Buyback Modal ─────────────────────────────────────────────── */}
            {isFishBuybackOpen && (
                <FishBuybackModal
                    fishTypes={fishTypes}
                    onClose={() => setIsFishBuybackOpen(false)}
                    onSuccess={() => {
                        setIsFishBuybackOpen(false);
                        router.refresh();
                    }}
                />
            )}

            {/* ── Extension Modal ────────────────────────────────────────────────── */}
            {isExtensionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAE2CE] text-[#8A5B00]">
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
                                <h3 className="text-base font-bold text-slate-900">
                                    Gia hạn phiên câu
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={isExtending}
                                onClick={() => setIsExtensionModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
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
                            <div className="rounded-xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-3 text-xs text-[#8B1E1E] font-semibold">
                                {extensionError}
                            </div>
                        )}
                        {extensionSuccess && (
                            <div className="rounded-xl border border-[#2D6A4F]/30 bg-[#E8F3ED] p-3 text-xs text-[#2D6A4F] font-semibold">
                                {extensionSuccess}
                            </div>
                        )}

                        {/* Package List */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-600">
                                Chọn gói câu gia hạn:
                            </label>
                            {packages.length === 0 ? (
                                <div className="rounded-xl bg-[#F5F2EB] border border-[#EAE4D7] p-3 text-center text-xs text-slate-500">
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
                                                className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition-colors ${
                                                    isSelected
                                                        ? "border-[#9E6B05] bg-[#EAE2CE]"
                                                        : "border-[#EAE4D7] bg-white hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                            isSelected
                                                                ? "border-[#9E6B05] bg-[#9E6B05]"
                                                                : "border-[#EAE4D7] bg-white"
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-900">
                                                            {pkg.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            +
                                                            {
                                                                pkg.durationMinutes
                                                            }{" "}
                                                            phút
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-[#8A5B00] tabular-nums">
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
                            <div className="rounded-xl bg-[#FFFDF9] border border-[#EAE4D7] p-3 text-xs flex items-center justify-between">
                                <span className="text-slate-600">
                                    Thêm:{" "}
                                    <span className="font-semibold text-slate-900">
                                        +{selectedPkg.durationMinutes} phút
                                    </span>
                                </span>
                                <span className="font-bold text-[#8A5B00] tabular-nums">
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
                                variant="primary"
                                isLoading={isExtending}
                                loadingText="Đang gia hạn…"
                                disabled={
                                    !selectedPackageId ||
                                    packages.length === 0
                                }
                                onClick={handleConfirmExtension}
                                className="flex-2"
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
