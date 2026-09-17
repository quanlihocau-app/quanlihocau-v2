"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div className="add-product-sheet">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F3E5] text-[#246B38]">
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
                        <h3 className="text-base font-bold text-[#17201A]">
                            Thêm hàng
                        </h3>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#66716A] hover:bg-[#EEF3EB] hover:text-[#17201A] transition-colors"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Feedback */}
                {submitError && (
                    <div className="rounded-xl border border-[#D9534F]/30 bg-[#FCEEED] p-3 text-xs font-semibold text-[#D9534F]">
                        {submitError}
                    </div>
                )}
                {submitSuccess && (
                    <div className="rounded-xl border border-[#3E9B4F]/30 bg-[#EBF6ED] p-3 text-xs font-semibold text-[#246B38]">
                        {submitSuccess}
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A938D]"
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
                        className="h-10 w-full rounded-xl border border-[#E3E8E3] bg-[#F7F9F5] pl-9 pr-3 text-[13px] text-[#17201A] placeholder:text-[#8A938D] focus:border-[#4F9D5A] focus:outline-none focus:ring-1 focus:ring-[#4F9D5A]/30 transition-colors"
                    />
                </div>

                {/* Product grid */}
                <div className="product-scroll-area">
                    {isLoadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                            <svg className="h-5 w-5 animate-spin text-[#4F9D5A]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xl border border-[#D9534F]/30 bg-[#FCEEED] p-3 text-center text-xs text-[#D9534F]">
                            {loadError}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-xl border border-[#E3E8E3] bg-[#F7F9F5] p-4 text-center text-xs text-[#66716A]">
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
                    <div className="rounded-xl border border-[#E3E8E3] bg-[#F7F9F5] p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold text-[#17201A] truncate">
                                    {selectedProduct.name}
                                </p>
                                <p className="text-[11px] text-[#66716A]">
                                    {formatPrice(selectedProduct.priceVnd)} / sản phẩm
                                </p>
                            </div>
                            {/* Quantity stepper */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    disabled={quantity <= 1 || isSubmitting}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E8E3] bg-white text-[#17201A] disabled:opacity-40 hover:bg-[#EEF3EB] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                    </svg>
                                </button>
                                <span className="w-7 text-center text-sm font-bold tabular-nums text-[#17201A]">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E8E3] bg-white text-[#17201A] disabled:opacity-40 hover:bg-[#EEF3EB] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-[#E3E8E3] pt-2.5">
                            <span className="text-[12px] text-[#66716A]">Tạm tính</span>
                            <span className="text-[14px] font-bold tabular-nums text-[#246B38]">
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
                        border: 1.5px solid #E3E8E3;
                        background: white;
                        cursor: pointer;
                        transition: border-color 0.12s, background 0.12s;
                        -webkit-tap-highlight-color: transparent;
                    }

                    .product-item:hover {
                        border-color: rgba(79, 157, 90, 0.4);
                        background: #F7F9F5;
                    }

                    .product-item--selected {
                        border-color: #4F9D5A;
                        background: #E8F3E5;
                    }

                    .product-item__name {
                        font-size: 12px;
                        font-weight: 600;
                        color: #17201A;
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
                        color: #246B38;
                        font-variant-numeric: tabular-nums;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .product-item__sku {
                        font-size: 10px;
                        color: #66716A;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                `}</style>
            </div>
        </div>
    );
}
