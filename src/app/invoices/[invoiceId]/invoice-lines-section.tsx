"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

    const numQty = typeof quantity === "string" ? Number(quantity) : quantity;
    const estimatedLineTotal = selectedProduct
        ? calculateEstimatedTotalVnd(quantity, selectedProduct.priceVnd)
        : null;

    function handleQuantityChange(delta: number) {
        const current = typeof quantity === "string" ? Number(quantity) || 1 : quantity;
        const next = Math.max(1, current + delta);
        setQuantity(next.toString());
    }

    async function handleAddProduct(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setAddError(null);
        setAddSuccess(null);
        setNegativeWarning(null);

        if (!selectedProductId) {
            setAddError("Vui lòng chọn sản phẩm.");
            return;
        }

        if (typeof numQty !== "number" || isNaN(numQty) || numQty <= 0) {
            setAddError("Số lượng phải là số dương lớn hơn 0.");
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
                    quantity: numQty,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setAddError(data.error || "Không thể thêm sản phẩm vào hóa đơn.");
                return;
            }

            if (data.negativeInventoryWarning) {
                setNegativeWarning(
                    data.warningMessage ||
                        "Sản phẩm đã được bán nhưng tồn kho đang âm. Hãy kiểm tra và bổ sung kho.",
                );
            } else {
                setAddSuccess(
                    data.message || "Đã thêm sản phẩm vào hóa đơn thành công.",
                );
            }

            setQuantity("1");
            setAddIdempotencyKey(crypto.randomUUID());

            router.refresh();
        } catch {
            setAddError(
                "Lỗi kết nối mạng, vui lòng thử lại. Thao tác được bảo vệ không bị trừ kho trùng.",
            );
        } finally {
            setAddLoading(false);
        }
    }

    async function handleDeleteLine(line: InvoiceLineItem) {
        if (!line.productId) return;

        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn gỡ sản phẩm "${line.name}" khỏi hóa đơn không?\n\nSố lượng (${line.quantity}) sẽ được tự động hoàn trả lại vào kho hàng.`,
        );

        if (!confirmed) return;

        const key = deleteKeys[line.id] || crypto.randomUUID();
        setDeleteKeys((prev) => ({ ...prev, [line.id]: key }));
        setDeletingLineId(line.id);

        try {
            const res = await fetch(
                `/api/invoices/${invoiceId}/lines/${line.id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Idempotency-Key": key,
                    },
                },
            );

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Không thể gỡ sản phẩm khỏi hóa đơn.");
                return;
            }

            setDeleteKeys((prev) => {
                const next = { ...prev };
                delete next[line.id];
                return next;
            });

            router.refresh();
        } catch {
            alert(
                "Lỗi kết nối mạng khi gỡ sản phẩm. Vui lòng thử lại, thao tác được bảo vệ không bị hoàn kho trùng.",
            );
        } finally {
            setDeletingLineId(null);
        }
    }

    return (
        <div className="space-y-6">
            {/* 1. PRODUCT SELECTION GRID (Only for DRAFT invoices) */}
            {isDraft && (
                <div className="rounded-2xl border border-[#EAE4D7] bg-[#F7F4EE] p-4 sm:p-5 shadow-sm space-y-4 print:hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                Chọn sản phẩm / Đồ dùng bán thêm
                            </h3>
                            <p className="text-xs text-slate-500">
                                Nhấp chọn sản phẩm để xuất bán và cộng trực tiếp vào hóa đơn.
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-2.5 py-0.5 text-xs font-semibold text-[#8A5B00]">
                            {availableProducts.length} sản phẩm
                        </span>
                    </div>

                    {availableProducts.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                            Chưa có sản phẩm nào trong danh mục hoặc tất cả sản phẩm đã ngừng bán.
                        </p>
                    ) : (
                        <form onSubmit={handleAddProduct} className="space-y-4">
                            {/* Search bar */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc mã SKU..."
                                    value={productSearch}
                                    onChange={(e) =>
                                        setProductSearch(e.target.value)
                                    }
                                    className="w-full h-10 rounded-xl border border-[#EAE4D7] bg-white pl-9 pr-3 text-xs font-medium text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                                />
                                <svg
                                    className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none"
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
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 max-h-60 overflow-y-auto pr-1">
                                {filteredProducts.map((p) => {
                                    const isSelected = selectedProductId === p.id;
                                    const isOutOfStock = p.currentStock <= 0;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedProductId(p.id)}
                                            className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all duration-150 ease-out active:scale-95 ${
                                                isSelected
                                                    ? "border-[#9E6B05] bg-white ring-2 ring-[#9E6B05] shadow-sm"
                                                    : "border-[#EAE4D7] bg-white hover:border-[#9E6B05]"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span className="font-bold text-xs text-slate-900 line-clamp-1">
                                                        {p.name}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-[#9E6B05]">
                                                    {formatVnd(p.priceVnd)}
                                                </p>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#EAE4D7] text-[10px]">
                                                <span className="text-slate-400 font-mono">
                                                    {p.sku || "—"}
                                                </span>
                                                <span
                                                    className={`font-semibold rounded px-1.5 py-0.5 ${
                                                        isOutOfStock
                                                            ? "bg-red-50 text-red-600 border border-red-200"
                                                            : "bg-emerald-50 text-emerald-700"
                                                    }`}
                                                >
                                                    {isOutOfStock
                                                        ? `Tồn: ${p.currentStock}`
                                                        : `Tồn: ${p.currentStock}`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Selected Product Action Bar */}
                            {selectedProduct && (
                                <div className="rounded-xl border border-[#EAE4D7] bg-white p-3 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">
                                                {selectedProduct.name}
                                            </p>
                                            <p className="text-[11px] text-[#9E6B05] font-semibold">
                                                Đơn giá: {formatVnd(selectedProduct.priceVnd)}
                                            </p>
                                        </div>

                                        {/* Quantity Stepper */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(-1)}
                                                className="h-9 w-9 rounded-lg border border-[#EAE4D7] bg-[#F7F4EE] text-base font-bold text-slate-700 hover:bg-[#EAE2CE] transition-colors flex items-center justify-center active:scale-95"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                step={1}
                                                required
                                                value={quantity}
                                                onChange={(e) =>
                                                    setQuantity(e.target.value)
                                                }
                                                className="h-9 w-14 rounded-lg border border-[#EAE4D7] text-center text-xs font-bold text-slate-900 focus:border-[#9E6B05] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(1)}
                                                className="h-9 w-9 rounded-lg border border-[#EAE4D7] bg-[#F7F4EE] text-base font-bold text-slate-700 hover:bg-[#EAE2CE] transition-colors flex items-center justify-center active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Estimated summary & Submit button */}
                                    <div className="flex items-center justify-between border-t border-[#EAE4D7] pt-2">
                                        <span className="text-xs text-slate-600">
                                            Tạm tính:{" "}
                                            <strong className="text-sm text-[#9E6B05]">
                                                {estimatedLineTotal !== null
                                                    ? formatVnd(estimatedLineTotal)
                                                    : "—"}
                                            </strong>
                                        </span>

                                        <button
                                            type="submit"
                                            disabled={addLoading}
                                            className="h-11 min-w-11 px-5 rounded-xl bg-[#9E6B05] text-xs font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-98 disabled:opacity-60"
                                        >
                                            {addLoading
                                                ? "Đang lưu…"
                                                : "Xác nhận thêm hàng"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Notifications */}
                            {addError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                                    {addError}
                                </div>
                            )}

                            {negativeWarning && (
                                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-sm">
                                    <svg
                                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                        />
                                    </svg>
                                    <div>
                                        <p className="font-semibold">
                                            {negativeWarning}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-amber-700">
                                            Vui lòng nhập kho hoặc đối soát tồn kho thực tế của sản phẩm này.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {addSuccess && !negativeWarning && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium">
                                    {addSuccess}
                                </div>
                            )}
                        </form>
                    )}
                </div>
            )}

            {/* 2. INVOICE LINES TABLE / LIST */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Chi tiết các mục trong hóa đơn ({lines.length})
                    </h2>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#EAE4D7] bg-white shadow-sm">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-[#EAE4D7] bg-[#F7F4EE] text-xs font-bold uppercase text-slate-600 print:bg-slate-100">
                            <tr>
                                <th className="px-4 py-3">Mục / Dịch vụ</th>
                                <th className="px-4 py-3 text-right">Đơn giá</th>
                                <th className="px-4 py-3 text-center">Số lượng</th>
                                <th className="px-4 py-3 text-right">Thành tiền</th>
                                {isDraft && (
                                    <th className="px-4 py-3 text-right print:hidden">
                                        Thao tác
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE4D7]">
                            {lines.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={isDraft ? 5 : 4}
                                        className="px-4 py-6 text-center text-xs text-slate-400"
                                    >
                                        Không có mục chi tiết nào trong hóa đơn.
                                    </td>
                                </tr>
                            ) : (
                                lines.map((line) => (
                                    <tr
                                        key={line.id}
                                        className="transition hover:bg-[#F7F4EE]/50"
                                    >
                                        <td className="px-4 py-3 font-semibold text-slate-900 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span>{line.name}</span>
                                                {line.productId ? (
                                                    <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-2 py-0.5 text-[10px] font-semibold text-[#8A5B00] print:hidden">
                                                        Hàng hóa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 print:hidden">
                                                        Gói câu
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs">
                                            {formatVnd(line.unitPrice)}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono font-bold text-xs text-slate-800">
                                            {line.quantity.toString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-xs text-[#9E6B05]">
                                            {formatVnd(line.totalVnd)}
                                        </td>
                                        {isDraft && (
                                            <td className="px-4 py-3 text-right print:hidden">
                                                {line.productId ? (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            deletingLineId === line.id
                                                        }
                                                        onClick={() =>
                                                            handleDeleteLine(line)
                                                        }
                                                        className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        {deletingLineId === line.id
                                                            ? "Đang gỡ..."
                                                            : "Gỡ"}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">
                                                        Cố định
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
