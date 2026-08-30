"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
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

    // Add Product Form State & Idempotency Key
    const [selectedProductId, setSelectedProductId] = useState(
        availableProducts[0]?.id || "",
    );
    const [quantity, setQuantity] = useState<number | string>("1");
    const [addIdempotencyKey, setAddIdempotencyKey] = useState<string>(() =>
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "00000000-0000-0000-0000-000000000000",
    );
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState<string | null>(null);

    // Delete Line State & Per-Line Idempotency Keys
    const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
    const [deleteKeys, setDeleteKeys] = useState<Record<string, string>>({});

    const selectedProduct = availableProducts.find(
        (p) => p.id === selectedProductId,
    );

    const numQty = typeof quantity === "string" ? Number(quantity) : quantity;
    const estimatedLineTotal = selectedProduct
        ? calculateEstimatedTotalVnd(quantity, selectedProduct.priceVnd)
        : null;

    async function handleAddProduct(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setAddError(null);
        setAddSuccess(null);

        if (!selectedProductId) {
            setAddError("Vui lòng chọn sản phẩm.");
            return;
        }

        if (typeof numQty !== "number" || isNaN(numQty) || numQty <= 0) {
            setAddError("Số lượng phải là số dương lớn hơn 0.");
            return;
        }

        if (selectedProduct && numQty > selectedProduct.currentStock) {
            setAddError(
                `Số lượng tồn kho không đủ (hiện có: ${selectedProduct.currentStock}).`,
            );
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

            setAddSuccess(data.message || "Đã thêm sản phẩm vào hóa đơn.");
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

            alert(data.message || "Đã gỡ sản phẩm và hoàn kho thành công.");
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
            {/* Invoice Lines Table */}
            <div>
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Chi tiết các mục ({lines.length})
                    </h2>
                </div>

                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 print:bg-slate-100">
                            <tr>
                                <th className="px-4 py-2.5">Mục / Dịch vụ</th>
                                <th className="px-4 py-2.5 text-right">Đơn giá</th>
                                <th className="px-4 py-2.5 text-center">Số lượng</th>
                                <th className="px-4 py-2.5 text-right">Thành tiền</th>
                                {isDraft && (
                                    <th className="px-4 py-2.5 text-right print:hidden">
                                        Thao tác
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lines.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={isDraft ? 5 : 4}
                                        className="px-4 py-6 text-center text-sm text-slate-400"
                                    >
                                        Không có mục chi tiết nào trong hóa đơn.
                                    </td>
                                </tr>
                            ) : (
                                lines.map((line) => (
                                    <tr
                                        key={line.id}
                                        className="transition hover:bg-slate-50/50"
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <span>{line.name}</span>
                                                {line.productId ? (
                                                    <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 print:hidden">
                                                        Hàng hóa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 print:hidden">
                                                        Gói câu gốc
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs">
                                            {formatVnd(line.unitPrice)}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono font-medium text-slate-800">
                                            {line.quantity.toString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-900">
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
                                                        className="inline-flex items-center rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
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

            {/* Add Product Line Form (Only for DRAFT invoices) */}
            {isDraft && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5 print:hidden">
                    <div className="flex flex-col justify-between gap-1 border-b border-blue-100 pb-3 sm:flex-row sm:items-center">
                        <div>
                            <h3 className="text-sm font-semibold text-blue-950">
                                Thêm nước uống, mồi câu & đồ dùng vào hóa đơn
                            </h3>
                            <p className="text-xs text-slate-500">
                                Chọn sản phẩm từ danh mục để xuất kho và tính tiền trực tiếp vào hóa đơn nháp này.
                            </p>
                        </div>
                    </div>

                    {availableProducts.length === 0 ? (
                        <p className="mt-3 text-xs text-slate-500 italic">
                            Chưa có sản phẩm nào trong danh mục hoặc tất cả sản phẩm đã ngừng bán.
                        </p>
                    ) : (
                        <form
                            onSubmit={handleAddProduct}
                            className="mt-4 space-y-4"
                        >
                            {addError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                                    {addError}
                                </div>
                            )}

                            {addSuccess && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                                    {addSuccess}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                                {/* Select Product */}
                                <div className="sm:col-span-6">
                                    <label
                                        htmlFor="invoice-product-select"
                                        className="block text-xs font-semibold text-slate-700"
                                    >
                                        Sản phẩm / Hàng hóa{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="invoice-product-select"
                                        value={selectedProductId}
                                        onChange={(e) =>
                                            setSelectedProductId(e.target.value)
                                        }
                                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        {availableProducts.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} — {formatVnd(p.priceVnd)} (Tồn kho: {p.currentStock})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity Input */}
                                <div className="sm:col-span-3">
                                    <label
                                        htmlFor="invoice-product-qty"
                                        className="block text-xs font-semibold text-slate-700"
                                    >
                                        Số lượng <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="invoice-product-qty"
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        required
                                        value={quantity}
                                        onChange={(e) =>
                                            setQuantity(e.target.value)
                                        }
                                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="sm:col-span-3">
                                    <button
                                        type="submit"
                                        disabled={addLoading}
                                        className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {addLoading ? "Đang thêm..." : "+ Thêm vào HĐ"}
                                    </button>
                                </div>
                            </div>

                            {/* Live Estimation & Stock Info */}
                            {selectedProduct && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs">
                                    <div className="flex items-center gap-4 text-slate-600">
                                        <span>
                                            Tồn kho:{" "}
                                            <strong
                                                className={
                                                    selectedProduct.currentStock <= 0
                                                        ? "text-red-600"
                                                        : "text-slate-900"
                                                }
                                            >
                                                {selectedProduct.currentStock}
                                            </strong>
                                        </span>
                                        <span>
                                            Đơn giá:{" "}
                                            <strong className="text-slate-900">
                                                {formatVnd(
                                                    selectedProduct.priceVnd,
                                                )}
                                            </strong>
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-500">
                                            Tạm tính dòng:{" "}
                                        </span>
                                        <span className="font-bold text-blue-700">
                                            {estimatedLineTotal !== null
                                                ? formatVnd(estimatedLineTotal)
                                                : "—"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
