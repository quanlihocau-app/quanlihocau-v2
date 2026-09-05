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

    // Loading & feedback states
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState("");
    const [addSuccess, setAddSuccess] = useState("");
    const [negativeWarning, setNegativeWarning] = useState<string | null>(null);
    const [deletingLineId, setDeletingLineId] = useState<string | null>(null);

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return availableProducts;
        const query = productSearch.toLowerCase().trim();
        return availableProducts.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                (p.sku && p.sku.toLowerCase().includes(query)),
        );
    }, [availableProducts, productSearch]);

    const selectedProduct = availableProducts.find(
        (p) => p.id === selectedProductId,
    );

    const estimatedLineTotal = useMemo(() => {
        if (!selectedProduct) return null;
        return calculateEstimatedTotalVnd(quantity, selectedProduct.priceVnd);
    }, [quantity, selectedProduct]);

    function handleQuantityChange(delta: number) {
        const current = typeof quantity === "string" ? parseInt(quantity, 10) || 0 : quantity;
        const next = Math.max(1, current + delta);
        setQuantity(next);
    }

    async function handleAddProduct(e: React.FormEvent) {
        e.preventDefault();
        setAddError("");
        setAddSuccess("");
        setNegativeWarning(null);

        if (!selectedProductId) {
            setAddError("Vui lòng chọn một sản phẩm.");
            return;
        }

        const numericQty = typeof quantity === "string" ? parseInt(quantity, 10) : quantity;
        if (isNaN(numericQty) || numericQty <= 0) {
            setAddError("Số lượng phải là số nguyên dương lớn hơn 0.");
            return;
        }

        setAddLoading(true);

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/lines`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProductId,
                    quantity: numericQty,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setAddError(data.error || "Không thể thêm sản phẩm vào hóa đơn.");
                return;
            }

            if (data.negativeStockWarning) {
                setNegativeWarning(
                    `Sản phẩm "${data.line?.name || selectedProduct?.name}" đã bị xuất âm kho. Số lượng tồn kho sau bán là: ${data.remainingStock}.`,
                );
            } else {
                setAddSuccess(`Đã thêm thành công vào hóa đơn!`);
            }

            setQuantity("1");
            router.refresh();
        } catch {
            setAddError("Lỗi kết nối khi thêm sản phẩm.");
        } finally {
            setAddLoading(false);
        }
    }

    async function handleDeleteLine(lineId: string) {
        setAddError("");
        setAddSuccess("");
        setNegativeWarning(null);
        setDeletingLineId(lineId);

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/lines/${lineId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setAddError(data.error || "Không thể xóa mục khỏi hóa đơn.");
                return;
            }

            setAddSuccess("Đã xóa mục khỏi hóa đơn.");
            router.refresh();
        } catch {
            setAddError("Lỗi kết nối khi xóa mục.");
        } finally {
            setDeletingLineId(null);
        }
    }

    return (
        <div className="space-y-5">
            {/* 1. Chi tiết các dòng hàng trong hóa đơn */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#D9D2C8] bg-[#F4F2EE] px-4 py-3 sm:px-6">
                    <h3 className="text-xs font-semibold text-[#766F67] uppercase tracking-wide">
                        Các mục tính tiền ({lines.length})
                    </h3>
                </div>

                {lines.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#766F67]">
                        Hóa đơn hiện chưa có mục hàng nào.
                    </div>
                ) : (
                    <div className="divide-y divide-[#D9D2C8]">
                        {lines.map((line) => (
                            <div
                                key={line.id}
                                className="flex items-center justify-between p-3.5 sm:px-6 hover:bg-[#F4F2EE]/40 transition-colors"
                            >
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-[#27231F]">
                                        {line.name}
                                    </p>
                                    <p className="text-xs text-[#766F67]">
                                        {formatVnd(line.unitPrice)} × {line.quantity.toString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[#8A5A20] tabular-nums">
                                        {formatVnd(line.totalVnd)}
                                    </span>
                                    {isDraft && line.productId && (
                                        <button
                                            type="button"
                                            disabled={deletingLineId === line.id}
                                            onClick={() => handleDeleteLine(line.id)}
                                            className="text-[#766F67] hover:text-[#8B1E1E] transition-colors p-1 cursor-pointer"
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
                <Card className="bg-[#F4F2EE] p-4 sm:p-5 space-y-4 print:hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-semibold text-[#27231F] uppercase tracking-wide">
                                Chọn sản phẩm / Đồ dùng bán thêm
                            </h3>
                            <p className="text-xs text-[#766F67] mt-0.5">
                                Nhấp chọn sản phẩm để xuất bán và cộng trực tiếp vào hóa đơn.
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded-lg bg-[#EFE4CF] border border-[#D9D2C8] px-2.5 py-0.5 text-xs font-semibold text-[#8A5A20]">
                            {availableProducts.length} sản phẩm
                        </span>
                    </div>

                    {availableProducts.length === 0 ? (
                        <p className="text-xs text-[#766F67] italic">
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
                                    className="w-full h-11 rounded-xl border border-[#D9D2C8] bg-white pl-9 pr-3 text-xs font-medium text-[#27231F] focus:border-[#8A5A20] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none"
                                />
                                <svg
                                    className="absolute left-3 top-3.5 h-4 w-4 text-[#766F67] pointer-events-none"
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

                            {/* Product Card Grid (2 cols on mobile) */}
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 max-h-64 overflow-y-auto pr-1">
                                {filteredProducts.map((p) => {
                                    const isSelected = selectedProductId === p.id;
                                    const stock = p.currentStock;
                                    const isOutOfStock = stock <= 0;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedProductId(p.id)}
                                            className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-colors ${
                                                isSelected
                                                    ? "border-[#8A5A20] bg-[#EFE4CF]"
                                                    : "border-[#D9D2C8] bg-white hover:bg-[#F4F2EE]"
                                            }`}
                                        >
                                            <div>
                                                <p className="font-semibold text-xs text-[#27231F] line-clamp-1">
                                                    {p.name}
                                                </p>
                                                <p className="text-xs font-bold text-[#8A5A20] tabular-nums mt-0.5">
                                                    {formatVnd(p.priceVnd)}
                                                </p>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#D9D2C8] text-[11px]">
                                                <span className="text-[#766F67] font-mono">
                                                    {p.sku || "—"}
                                                </span>
                                                <span
                                                    className={`font-semibold rounded px-1 py-0.5 ${
                                                        isOutOfStock
                                                            ? "bg-[#FAECEC] text-[#8B1E1E] border border-[#8B1E1E]/30"
                                                            : "bg-[#E8F3ED] text-[#2D6A4F]"
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
                                <div className="rounded-xl border border-[#D9D2C8] bg-white p-3.5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-[#27231F]">
                                                {selectedProduct.name}
                                            </p>
                                            <p className="text-xs text-[#8A5A20] font-bold tabular-nums">
                                                Đơn giá: {formatVnd(selectedProduct.priceVnd)}
                                            </p>
                                        </div>

                                        {/* Quantity Stepper */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(-1)}
                                                className="h-10 w-10 rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] text-base font-bold text-[#27231F] hover:bg-[#EFE4CF] transition-colors flex items-center justify-center cursor-pointer"
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
                                                className="h-10 w-14 rounded-xl border border-[#D9D2C8] text-center text-xs font-bold text-[#27231F] focus:border-[#8A5A20] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(1)}
                                                className="h-10 w-10 rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] text-base font-bold text-[#27231F] hover:bg-[#EFE4CF] transition-colors flex items-center justify-center cursor-pointer"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Estimated summary & Submit button */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#D9D2C8] pt-2.5">
                                        <span className="text-xs text-[#766F67]">
                                            Tạm tính:{" "}
                                            <strong className="text-sm font-bold text-[#8A5A20] tabular-nums">
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
                                            className="w-full sm:w-auto"
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
                                            <p className="mt-0.5 text-xs text-[#9A4C16]">
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
