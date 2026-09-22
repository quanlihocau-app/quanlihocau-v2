"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";

export interface Product {
    id: string;
    name: string;
    priceVnd: number;
    sku: string | null;
}

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

let cachedProducts: Product[] | null = null;
let fetchProductsPromise: Promise<Product[]> | null = null;

export async function getCachedProducts(): Promise<Product[]> {
    if (cachedProducts) return cachedProducts;
    if (fetchProductsPromise) return fetchProductsPromise;

    fetchProductsPromise = fetch("/api/products")
        .then((r) => r.json())
        .then((data: { products?: Product[]; error?: string }) => {
            if (data.products) {
                cachedProducts = data.products;
                return cachedProducts;
            }
            return [];
        })
        .catch(() => [])
        .finally(() => {
            fetchProductsPromise = null;
        });

    return fetchProductsPromise;
}

export interface AddProductModalProps {
    invoiceId: string;
    onClose: () => void;
    onSuccess: () => void;
    onOptimisticAdd?: (product: Product, quantity: number) => void;
}

export function AddProductModal({
    invoiceId,
    onClose,
    onSuccess,
    onOptimisticAdd,
}: AddProductModalProps) {
    const [products, setProducts] = useState<Product[]>(() => cachedProducts ?? []);
    const [isLoadingProducts, setIsLoadingProducts] = useState(!cachedProducts);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const { onBackdropClick } = useModalDismiss({
        isOpen: true,
        onClose,
        disabled: isSubmitting,
    });

    const searchRef = useRef<HTMLInputElement>(null);

    // Load products with memory cache for instant 0ms open
    useEffect(() => {
        let cancelled = false;

        if (!cachedProducts) {
            getCachedProducts()
                .then((prods) => {
                    if (!cancelled) {
                        setProducts(prods);
                        setIsLoadingProducts(false);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setLoadError("Không thể tải danh sách sản phẩm.");
                        setIsLoadingProducts(false);
                    }
                });
        }

        return () => {
            cancelled = true;
        };
    }, []);

    // Focus search on open
    useEffect(() => {
        const t = setTimeout(() => searchRef.current?.focus(), 100);
        return () => clearTimeout(t);
    }, []);

    const filtered = products.filter(
        (p) =>
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

            const data = (await res.json()) as {
                error?: string;
                message?: string;
                negativeInventoryWarning?: boolean;
                warningMessage?: string;
            };

            if (!res.ok) {
                setSubmitError(data.error ?? "Không thể thêm sản phẩm vào hóa đơn.");
                setIsSubmitting(false);
                return;
            }

            setSubmitSuccess(data.message ?? "Đã thêm sản phẩm thành công!");
            setIsSubmitting(false);

            if (onOptimisticAdd && selectedProduct) {
                onOptimisticAdd(selectedProduct, quantity);
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
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/50 backdrop-blur-2xs modal-backdrop-animate font-serif"
            onClick={onBackdropClick}
        >
            <div className="add-product-sheet modal-content-animate my-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2.5">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
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
                        <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">
                            Thêm sản phẩm & đồ uống
                        </h3>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="h-7 w-7 rounded-xs border border-[#CCCCCC] bg-[#F2F2F0] flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAEAE6] transition-colors cursor-pointer"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Feedback */}
                {submitError && (
                    <div className="rounded-xs border border-[#FFCCC7] bg-[#FFF1F0] p-2.5 text-xs font-semibold text-[#A8071A]">
                        {submitError}
                    </div>
                )}
                {submitSuccess && (
                    <div className="rounded-xs border border-[#B7EB8F] bg-[#F6FFED] p-2.5 text-xs font-semibold text-[#2C4C3B]">
                        {submitSuccess}
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#777777]"
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
                        placeholder="Tìm kiếm theo tên sản phẩm, mã..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 w-full rounded-xs border border-[#CCCCCC] bg-white pl-8 pr-3 text-xs text-[#1A1A1A] placeholder:text-[#888888] focus:border-[#2C4C3B] focus:outline-none transition-colors font-serif"
                    />
                </div>

                {/* Product grid */}
                <div className="product-scroll-area">
                    {isLoadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                            <svg className="h-5 w-5 animate-spin text-[#2C4C3B]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xs border border-[#FFCCC7] bg-[#FFF1F0] p-3 text-center text-xs text-[#A8071A]">
                            {loadError}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-xs border border-[#CCCCCC] bg-[#FAFAF7] p-4 text-center text-xs text-[#666666]">
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
                                        disabled={isSubmitting}
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
                    <div className="rounded-xs border border-[#CCCCCC] bg-[#FAFAF7] p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-[#1A1A1A] truncate">
                                    {selectedProduct.name}
                                </p>
                                <p className="text-[11px] text-[#555555]">
                                    {formatPrice(selectedProduct.priceVnd)} / đơn vị
                                </p>
                            </div>
                            {/* Quantity stepper */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    disabled={quantity <= 1 || isSubmitting}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="flex h-7 w-7 items-center justify-center rounded-xs border border-[#CCCCCC] bg-white text-[#1A1A1A] disabled:opacity-40 hover:bg-[#F2F2F0] transition-colors cursor-pointer"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                    </svg>
                                </button>
                                <span className="w-6 text-center text-xs font-bold tabular-nums text-[#1A1A1A]">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                                    className="flex h-7 w-7 items-center justify-center rounded-xs border border-[#CCCCCC] bg-white text-[#1A1A1A] disabled:opacity-40 hover:bg-[#F2F2F0] transition-colors cursor-pointer"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#E0E0E0] pt-1.5">
                            <span className="text-xs text-[#555555]">Thành tiền món:</span>
                            <span className="text-sm font-bold tabular-nums text-[#2C4C3B] font-serif">
                                {formatPrice(subtotal)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    <Button
                        type="button"
                        size="md"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="flex-1"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        size="md"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang ghi sổ…"
                        disabled={!selectedProductId || isSubmitting || !!submitSuccess}
                        onClick={handleConfirm}
                        className="flex-2"
                    >
                        Ghi vào đơn
                    </Button>
                </div>

                {/* Styles */}
                <style>{`
                    .add-product-sheet {
                        width: 100%;
                        max-width: 480px;
                        background: white;
                        border-radius: 28px;
                        border: 1px solid #E2E8F0;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        padding: 18px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        max-height: 90dvh;
                        overflow: hidden;
                    }

                    @media (min-width: 640px) {
                        .add-product-sheet {
                            border-radius: 28px;
                            max-height: 90dvh;
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
                        gap: 6px;
                    }

                    .product-item {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                        min-width: 0;
                        text-align: left;
                        padding: 8px 10px;
                        border-radius: 2px;
                        border: 1px solid #CCCCCC;
                        background: white;
                        cursor: pointer;
                        transition: border-color 0.12s, background 0.12s;
                        -webkit-tap-highlight-color: transparent;
                        font-family: inherit;
                    }

                    .product-item:hover {
                        border-color: #2C4C3B;
                        background: #FAFAF7;
                    }

                    .product-item--selected {
                        border-color: #2C4C3B;
                        background: #EAEFEA;
                    }

                    .product-item__name {
                        font-size: 12px;
                        font-weight: 700;
                        color: #1A1A1A;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        line-height: 1.3;
                    }

                    .product-item__price {
                        font-size: 12px;
                        font-weight: 700;
                        color: #2C4C3B;
                        font-variant-numeric: tabular-nums;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .product-item__sku {
                        font-size: 10px;
                        color: #777777;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                `}</style>
            </div>
        </div>
    );
}
