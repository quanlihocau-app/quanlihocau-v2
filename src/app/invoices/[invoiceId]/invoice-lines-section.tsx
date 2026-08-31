"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";

export interface InvoiceLineItem {
    id: string;
    productId: string | null;
    fishBuybackId: string | null;
    name: string;
    unitPrice: number;
    quantity: number | string;
    totalVnd: number;
}

export interface ActiveProductItem {
    id: string;
    name: string;
    sku: string | null;
    priceVnd: number;
    currentStock: number;
}

interface InvoiceLinesSectionProps {
    invoiceId: string;
    isDraft: boolean;
    lines: InvoiceLineItem[];
    availableProducts: ActiveProductItem[];
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function calculateEstimatedTotalVnd(
    quantityInput: string | number,
    unitPrice: number,
): number | null {
    if (
        typeof unitPrice !== "number" ||
        !Number.isInteger(unitPrice) ||
        unitPrice <= 0
    ) {
        return null;
    }

    const str = String(quantityInput).trim();
    if (!/^\d+(\.\d+)?$/.test(str)) {
        return null;
    }

    try {
        const [intPart, fracPart = ""] = str.split(".");
        const cleanInt = intPart.replace(/^0+(?=\d)/, "") || "0";
        const weightNumerator = BigInt(cleanInt + fracPart);
        if (weightNumerator <= BigInt(0)) {
            return null;
        }

        const decimals = fracPart.length;
        const weightDenominator = BigInt(10) ** BigInt(decimals);
        const priceBig = BigInt(unitPrice);
        const totalNumerator = weightNumerator * priceBig;

        const quotient = totalNumerator / weightDenominator;
        const remainder = totalNumerator % weightDenominator;
        const rounded =
            remainder * BigInt(2) >= weightDenominator
                ? quotient + BigInt(1)
                : quotient;

        if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) {
            return null;
        }

        return Number(rounded);
    } catch {
        return null;
    }
}

export function InvoiceLinesSection({
    invoiceId,
    isDraft,
    lines,
    availableProducts,
}: InvoiceLinesSectionProps) {
    const router = useRouter();

    // Product search & selection
    const [productSearch, setProductSearch] = useState("");
    const [selectedProductId, setSelectedProductId] = useState<string>(
        availableProducts[0]?.id || "",
    );
    const [quantity, setQuantity] = useState<number | string>("1");

    // Idempotency & submission states
    const [addIdempotencyKey, setAddIdempotencyKey] = useState<string>(() =>
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "00000000-0000-0000-0000-000000000000",
    );
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState<string | null>(null);
    const [negativeWarning, setNegativeWarning] = useState<string | null>(null);

    // Delete Line State & Per-Line Idempotency Keys
    const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
    const [deleteKeys, setDeleteKeys] = useState<Record<string, string>>({});

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return availableProducts;
        const q = productSearch.toLowerCase().trim();
        return availableProducts.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q)),
        );
    }, [availableProducts, productSearch]);

    const selectedProduct = availableProducts.find(
        (p) => p.id === selectedProductId,
    );

    const estimatedLineTotal = useMemo(() => {
        if (!selectedProduct) return null;
        return calculateEstimatedTotalVnd(quantity, selectedProduct.priceVnd);
    }, [selectedProduct, quantity]);

    function handleQuantityChange(delta: number) {
        const current = typeof quantity === "string" ? parseInt(quantity, 10) || 0 : quantity;
        const next = Math.max(1, current + delta);
        setQuantity(next);
    }

    async function handleAddProduct(e: React.FormEvent) {
        e.preventDefault();
        setAddError(null);
        setAddSuccess(null);
        setNegativeWarning(null);

        if (!selectedProductId) {
            setAddError("Vui lòng chọn sản phẩm cần thêm.");
            return;
        }

        const qtyNum = typeof quantity === "string" ? parseInt(quantity, 10) : quantity;
        if (isNaN(qtyNum) || qtyNum <= 0) {
            setAddError("Số lượng phải là số nguyên dương hợp lệ.");
            return;
        }

        setAddLoading(true);

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/lines`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": addIdempotencyKey,
                },
                body: JSON.stringify({
                    productId: selectedProductId,
                    quantity: qtyNum,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setAddError(data.error || "Không thể thêm sản phẩm vào hóa đơn.");
                setAddLoading(false);
                return;
            }

            if (data.warning) {
                setNegativeWarning(data.warning);
            } else {
                setAddSuccess("Đã thêm sản phẩm thành công!");
            }

            setAddIdempotencyKey(crypto.randomUUID());
            setQuantity("1");
            router.refresh();
        } catch {
            setAddError("Lỗi kết nối mạng khi thêm sản phẩm. Vui lòng thử lại.");
        } finally {
            setAddLoading(false);
        }
    }

    async function handleDeleteLine(lineId: string) {
        setAddError(null);
        setAddSuccess(null);
        setNegativeWarning(null);

        let key = deleteKeys[lineId];
        if (!key) {
            key = crypto.randomUUID();
            setDeleteKeys((prev) => ({ ...prev, [lineId]: key }));
        }

        setDeletingLineId(lineId);

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/lines/${lineId}`, {
                method: "DELETE",
                headers: {
                    "Idempotency-Key": key,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setAddError(data.error || "Không thể xóa dòng hóa đơn.");
                setDeletingLineId(null);
                return;
            }

            router.refresh();
        } catch {
            setAddError("Lỗi kết nối khi xóa mục.");
        } finally {
            setDeletingLineId(null);
        }
    }

    return (
        <div className="space-y-6">
            {/* 1. Itemized Lines List */}
            <div className="overflow-hidden rounded-2xl border border-[#E2DDD2] bg-white shadow-2xs">
                <div className="border-b border-[#E2DDD2] bg-[#F8F6F0] px-4 py-3 sm:px-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Chi tiết các mục hóa đơn ({lines.length})
                    </h3>
                </div>

                {lines.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-medium">
                        Hóa đơn hiện chưa có mục nào.
                    </div>
                ) : (
                    <div className="divide-y divide-[#E2DDD2]">
                        {lines.map((line) => (
                            <div
                                key={line.id}
                                className="flex items-center justify-between p-3.5 sm:px-6 hover:bg-[#F8F6F0]/50 transition-colors"
                            >
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-900">
                                        {line.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        {formatVnd(line.unitPrice)} × {line.quantity.toString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-extrabold text-[#102A43] tabular-nums">
                                        {formatVnd(line.totalVnd)}
                                    </span>
                                    {isDraft && line.productId && (
                                        <button
                                            type="button"
                                            disabled={deletingLineId === line.id}
                                            onClick={() => handleDeleteLine(line.id)}
                                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                            title="Xóa mục này"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. Interactive Product Selection Grid (DRAFT only) */}
            {isDraft && (
                <Card className="bg-[#F8F6F0]/60 p-4 sm:p-5 space-y-4 print:hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-[#102A43] uppercase tracking-wider">
                                Chọn sản phẩm / Đồ dùng bán thêm
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Nhấp chọn sản phẩm để xuất bán và cộng trực tiếp vào hóa đơn.
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded-lg bg-[#102A43]/10 px-2.5 py-0.5 text-xs font-bold text-[#102A43]">
                            {availableProducts.length} sản phẩm
                        </span>
                    </div>

                    {availableProducts.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                            Chưa có sản phẩm nào trong danh mục hoặc tất cả sản phẩm đã ngừng bán.
                        </p>
                    ) : (
                        <form onSubmit={handleAddProduct} className="space-y-3.5">
                            {/* Search bar */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc mã SKU..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full h-11 rounded-xl border border-[#E2DDD2] bg-white pl-9 pr-3 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#102A43] focus:ring-2 focus:ring-[#102A43] focus:outline-none"
                                />
                                <svg
                                    className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                    />
                                </svg>
                            </div>

                            {/* Product Card Grid */}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-60 overflow-y-auto pr-1">
                                {filteredProducts.map((p) => {
                                    const isSelected = selectedProductId === p.id;
                                    const stock = p.currentStock;
                                    const isOutOfStock = stock <= 0;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedProductId(p.id)}
                                            className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all duration-150 ease-out active:scale-95 ${
                                                isSelected
                                                    ? "border-[#102A43] bg-white ring-2 ring-[#102A43] shadow-xs"
                                                    : "border-[#E2DDD2] bg-white hover:border-[#102A43]"
                                            }`}
                                        >
                                            <div>
                                                <p className="font-bold text-xs text-slate-900 line-clamp-1">
                                                    {p.name}
                                                </p>
                                                <p className="text-xs font-extrabold text-[#0D9488] tabular-nums mt-0.5">
                                                    {formatVnd(p.priceVnd)}
                                                </p>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#E2DDD2] text-[10px]">
                                                <span className="text-slate-400 font-mono">
                                                    {p.sku || "—"}
                                                </span>
                                                <span
                                                    className={`font-bold rounded px-1 py-0.5 ${
                                                        isOutOfStock
                                                            ? "bg-red-50 text-red-700 border border-red-200"
                                                            : "bg-teal-50 text-teal-800"
                                                    }`}
                                                >
                                                    Tồn: {stock}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Selected Product Action Bar */}
                            {selectedProduct && (
                                <div className="rounded-xl border border-[#E2DDD2] bg-white p-3.5 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">
                                                {selectedProduct.name}
                                            </p>
                                            <p className="text-[11px] text-[#0D9488] font-bold tabular-nums">
                                                Đơn giá: {formatVnd(selectedProduct.priceVnd)}
                                            </p>
                                        </div>

                                        {/* Quantity Stepper */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(-1)}
                                                className="h-10 w-10 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0] text-base font-bold text-slate-700 hover:bg-[#E2DDD2] transition-colors flex items-center justify-center active:scale-95"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                step={1}
                                                required
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="h-10 w-14 rounded-xl border border-[#E2DDD2] text-center text-xs font-bold text-slate-900 focus:border-[#102A43] focus:ring-2 focus:ring-[#102A43] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(1)}
                                                className="h-10 w-10 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0] text-base font-bold text-slate-700 hover:bg-[#E2DDD2] transition-colors flex items-center justify-center active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Estimated summary & Submit button */}
                                    <div className="flex items-center justify-between border-t border-[#E2DDD2] pt-2">
                                        <span className="text-xs text-slate-600 font-medium">
                                            Tạm tính:{" "}
                                            <strong className="text-sm font-extrabold text-[#0D9488] tabular-nums">
                                                {estimatedLineTotal !== null
                                                    ? formatVnd(estimatedLineTotal)
                                                    : "—"}
                                            </strong>
                                        </span>

                                        <Button
                                            type="submit"
                                            size="lg"
                                            variant="primary"
                                            isLoading={addLoading}
                                            loadingText="Đang lưu…"
                                        >
                                            Xác nhận thêm hàng
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Notifications */}
                            {addError && (
                                <InlineAlert type="error" message={addError} />
                            )}

                            {negativeWarning && (
                                <InlineAlert
                                    type="warning"
                                    title="Cảnh báo bán âm kho"
                                    message={
                                        <div>
                                            <p>{negativeWarning}</p>
                                            <p className="mt-0.5 text-[11px] text-orange-800">
                                                Vui lòng nhập kho hoặc đối soát tồn kho thực tế của sản phẩm này.
                                            </p>
                                        </div>
                                    }
                                />
                            )}

                            {addSuccess && !negativeWarning && (
                                <InlineAlert type="success" message={addSuccess} />
                            )}
                        </form>
                    )}
                </Card>
            )}
        </div>
    );
}
