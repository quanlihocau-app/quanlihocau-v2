"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
import { getQueryClient } from "@/lib/query-client";
import { productCatalogKeys, useProducts } from "@/hooks/use-products";

export interface Product {
    id: string;
    name: string;
    priceVnd: number;
    sku: string | null;
}

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

export async function getCachedProducts(): Promise<Product[]> {
    return getQueryClient().fetchQuery({
        queryKey: productCatalogKeys.list(),
        queryFn: async ({ signal }) => {
            const response = await fetch("/api/products", { signal });
            if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm.");
            const data = (await response.json()) as { products?: Product[] };
            return data.products ?? [];
        },
    });
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
    const productQuery = useProducts();
    const products = useMemo(() => productQuery.data ?? [], [productQuery.data]);
    const isLoadingProducts = productQuery.isPending;
    const loadError = productQuery.error?.message ?? "";

    const [search, setSearch] = useState("");
    // Map productId -> quantity
    const [cart, setCart] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const { onBackdropClick } = useModalDismiss({
        isOpen: true,
        onClose,
        disabled: isSubmitting,
    });

    const searchRef = useRef<HTMLInputElement>(null);

    // Focus search on open
    useEffect(() => {
        const t = setTimeout(() => searchRef.current?.focus(), 100);
        return () => clearTimeout(t);
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q)),
        );
    }, [products, search]);

    // Handle tap on product: 1 tap = +1, 2 taps = 2, 3 taps = 3
    const handleAddOne = (productId: string) => {
        if (isSubmitting) return;
        setSubmitError("");
        setCart((prev) => {
            const current = prev[productId] || 0;
            return { ...prev, [productId]: current + 1 };
        });
    };

    const handleMinusOne = (productId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isSubmitting) return;
        setSubmitError("");
        setCart((prev) => {
            const current = prev[productId] || 0;
            if (current <= 1) {
                const next = { ...prev };
                delete next[productId];
                return next;
            }
            return { ...prev, [productId]: current - 1 };
        });
    };

    const handleRemoveAll = (productId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isSubmitting) return;
        setCart((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
        });
    };

    // Calculate totals
    const cartEntries = useMemo(() => {
        return Object.entries(cart)
            .map(([productId, quantity]) => {
                const product = products.find((p) => p.id === productId);
                if (!product || quantity <= 0) return null;
                return { product, quantity, subtotal: product.priceVnd * quantity };
            })
            .filter((entry): entry is { product: Product; quantity: number; subtotal: number } => entry !== null);
    }, [cart, products]);

    const totalQuantity = useMemo(
        () => cartEntries.reduce((sum, item) => sum + item.quantity, 0),
        [cartEntries],
    );

    const totalPrice = useMemo(
        () => cartEntries.reduce((sum, item) => sum + item.subtotal, 0),
        [cartEntries],
    );

    async function handleConfirm() {
        if (cartEntries.length === 0) {
            setSubmitError("Vui lòng bấm chọn ít nhất một sản phẩm.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError("");
        setSubmitSuccess("");

        try {
            // Sequential API call to add each selected product line
            for (const item of cartEntries) {
                const idempotencyKey = crypto.randomUUID();
                const res = await fetch(`/api/invoices/${invoiceId}/lines`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Idempotency-Key": idempotencyKey,
                    },
                    body: JSON.stringify({
                        productId: item.product.id,
                        quantity: item.quantity,
                    }),
                });

                const data = (await res.json()) as {
                    error?: string;
                    message?: string;
                };

                if (!res.ok) {
                    setSubmitError(
                        data.error ?? `Không thể thêm món "${item.product.name}".`,
                    );
                    setIsSubmitting(false);
                    return;
                }

                if (onOptimisticAdd) {
                    onOptimisticAdd(item.product, item.quantity);
                }
            }

            setSubmitSuccess(
                `Đã thêm ${totalQuantity} món (${formatPrice(totalPrice)}) vào hóa đơn thành công!`,
            );
            setIsSubmitting(false);

            setTimeout(() => {
                onSuccess();
            }, 250);
        } catch {
            setSubmitError("Lỗi kết nối mạng khi thêm sản phẩm. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-150 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs modal-backdrop-animate font-serif"
                onClick={onBackdropClick}
                role="dialog"
                aria-modal="true"
            >
                <div
                    className="relative my-auto w-full max-w-lg rounded-[28px] bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden modal-content-animate font-serif"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header: Sticky top */}
                    <div className="flex items-center justify-between border-b border-[#E0E0E0] bg-[#FAFAF7] px-4 py-3 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC] font-bold text-base">
                                🛒
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                                    Thêm sản phẩm & đồ uống
                                </h3>
                                <p className="text-[11px] text-[#666666]">
                                    Bấm 1 cái = +1 món, 2 cái = +2 món…
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="h-8 w-8 rounded-full border border-[#CCCCCC] bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#F2F2F0] transition-colors cursor-pointer"
                            aria-label="Đóng"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Feedback notices */}
                    {submitError && (
                        <div className="mx-4 mt-3 rounded-xl border border-[#FFCCC7] bg-[#FFF1F0] p-2.5 text-xs font-semibold text-[#A8071A]">
                            ⚠️ {submitError}
                        </div>
                    )}
                    {submitSuccess && (
                        <div className="mx-4 mt-3 rounded-xl border border-[#B7EB8F] bg-[#F6FFED] p-2.5 text-xs font-semibold text-[#2C4C3B]">
                            ✅ {submitSuccess}
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="px-4 pt-3 pb-1 shrink-0">
                        <div className="relative">
                            <svg
                                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]"
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
                                placeholder="Tìm sản phẩm, nước ngọt, mồi câu..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9.5 w-full rounded-xl border border-[#CCCCCC] bg-[#FDFDFD] pl-9 pr-8 text-xs text-[#1A1A1A] placeholder:text-[#888888] focus:border-[#2C4C3B] focus:bg-white focus:outline-none transition-colors font-serif shadow-xs"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Hướng dẫn trực quan thêm món (Dễ hiểu cho học sinh lớp 5) */}
                    <div className="mx-4 mt-1.5 mb-1 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-slate-700 font-serif shrink-0">
                        <p className="font-bold text-[#16A34A] mb-1">👉 Hướng dẫn thêm món siêu dễ:</p>
                        <div className="space-y-0.5 text-[11px] text-slate-600">
                            <p>• <strong>Bấm 1 cái</strong> vào món = +1 món. Bấm tiếp để tăng số lượng.</p>
                            <p>• Dùng nút <strong>[−]</strong> hoặc <strong>[+]</strong> ở danh sách bên dưới để chỉnh lại số lượng.</p>
                            <p>• Bấm nút xanh <strong>&quot;Xác nhận thêm món&quot;</strong> ở dưới cùng để lưu.</p>
                        </div>
                    </div>

                    {/* Product Grid Area: Scrollable */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 min-h-40 max-h-[46vh]">
                        {isLoadingProducts ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2C4C3B] border-t-transparent" />
                                <span className="text-xs">Đang tải danh sách sản phẩm…</span>
                            </div>
                        ) : loadError ? (
                            <div className="rounded-xl border border-[#FFCCC7] bg-[#FFF1F0] p-3 text-center text-xs text-[#A8071A]">
                                {loadError}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="rounded-xl border border-[#CCCCCC] bg-[#FAFAF7] p-6 text-center text-xs text-[#666666]">
                                {search ? `Không tìm thấy sản phẩm nào khớp với "${search}".` : "Chưa có sản phẩm nào."}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {filtered.map((product) => {
                                    const qty = cart[product.id] || 0;
                                    const isSelected = qty > 0;
                                    return (
                                        <div
                                            key={product.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleAddOne(product.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    handleAddOne(product.id);
                                                }
                                            }}
                                            className={`relative select-none text-left rounded-2xl border p-2.5 flex flex-col justify-between transition-all cursor-pointer active:scale-[0.98] ${
                                                isSelected
                                                    ? "border-[#2C4C3B] bg-[#EAEFEA] shadow-sm ring-1 ring-[#2C4C3B]/30"
                                                    : "border-[#DDDDDD] bg-white hover:border-[#2C4C3B] hover:bg-[#FAFAF7]"
                                            }`}
                                        >
                                            {/* Quantity Badge on Top-Right */}
                                            {isSelected && (
                                                <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#2C4C3B] px-1.5 text-[11px] font-extrabold text-white shadow-md animate-scale-in">
                                                    +{qty}
                                                </span>
                                            )}

                                            <div>
                                                <p className="text-xs font-bold text-[#1A1A1A] line-clamp-2 leading-snug">
                                                    {product.name}
                                                </p>
                                                {product.sku && (
                                                    <p className="text-[10px] text-[#777777] font-mono mt-0.5">
                                                        {product.sku}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-1.5">
                                                <span className="text-xs font-extrabold text-[#2C4C3B] tabular-nums">
                                                    {formatPrice(product.priceVnd)}
                                                </span>

                                                {/* Stepper Buttons on selected items */}
                                                {isSelected ? (
                                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleMinusOne(product.id, e)}
                                                            className="h-6 w-6 rounded-md bg-white border border-[#2C4C3B] text-[#2C4C3B] flex items-center justify-center font-bold text-xs hover:bg-[#F2F2F0] active:scale-95 cursor-pointer"
                                                            title="Bớt 1"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="min-w-4 text-center text-xs font-bold text-[#2C4C3B]">
                                                            {qty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddOne(product.id);
                                                            }}
                                                            className="h-6 w-6 rounded-md bg-[#2C4C3B] text-white flex items-center justify-center font-bold text-xs hover:bg-[#233D2F] active:scale-95 cursor-pointer"
                                                            title="Thêm 1"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-[#888888] bg-slate-100 rounded-md px-1.5 py-0.5">
                                                        + Chạm
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selected Cart Summary Bar: Always visible when items picked */}
                    {cartEntries.length > 0 && (
                        <div className="border-t border-[#E0E0E0] bg-[#FAFAF7] px-4 py-2 shrink-0">
                            <div className="flex items-center justify-between text-xs font-bold text-[#1A1A1A] mb-1.5">
                                <span className="flex items-center gap-1.5">
                                    <span>🛒 Đã chọn ({totalQuantity} món):</span>
                                    <button
                                        type="button"
                                        onClick={() => setCart({})}
                                        className="text-[10px] text-rose-600 hover:underline font-normal cursor-pointer"
                                    >
                                        Xóa tất cả
                                    </button>
                                </span>
                                <span className="text-sm text-[#2C4C3B] tabular-nums font-extrabold font-serif">
                                    {formatPrice(totalPrice)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                                {cartEntries.map(({ product, quantity: qty, subtotal }) => (
                                    <span
                                        key={product.id}
                                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#CCCCCC] px-2 py-0.5 text-[11px] text-[#1A1A1A]"
                                    >
                                        <span className="font-semibold">{product.name}</span>
                                        <span className="font-bold text-[#2C4C3B]">x{qty}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">({formatPrice(subtotal)})</span>
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemoveAll(product.id, e)}
                                            className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                                            title="Xóa món này"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STICKY FOOTER: ALWAYS VISIBLE - NÚT XÁC NHẬN VÀ HỦY THAO TÁC */}
                    <div className="border-t border-[#E0E0E0] bg-white px-4 py-3 shrink-0 flex items-center gap-2.5 shadow-lg">
                        <Button
                            type="button"
                            size="md"
                            variant="outline"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="flex-1 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Hủy thao tác
                        </Button>
                        <Button
                            type="button"
                            size="md"
                            variant="primary"
                            isLoading={isSubmitting}
                            loadingText="Đang ghi sổ…"
                            disabled={totalQuantity === 0 || isSubmitting || !!submitSuccess}
                            onClick={handleConfirm}
                            className="flex-2 text-xs sm:text-sm font-bold bg-[#2C4C3B] hover:bg-[#233D2F] text-white shadow-md disabled:opacity-50"
                        >
                            {totalQuantity > 0
                                ? `Xác nhận thêm (${totalQuantity} món • ${formatPrice(totalPrice)})`
                                : "Chưa chọn món nào"}
                        </Button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
