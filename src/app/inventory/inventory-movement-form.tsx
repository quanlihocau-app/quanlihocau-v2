"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProductOption {
    id: string;
    name: string;
    sku: string | null;
    currentStock: number;
}

interface InventoryMovementFormProps {
    products: ProductOption[];
}

export function InventoryMovementForm({ products }: InventoryMovementFormProps) {
    const router = useRouter();
    const [productId, setProductId] = useState(products[0]?.id || "");
    const [type, setType] = useState<"IN" | "OUT">("IN");
    const [quantity, setQuantity] = useState<number | string>("");
    const [reason, setReason] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const selectedProduct = products.find((p) => p.id === productId);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!productId) {
            setError("Vui lòng chọn sản phẩm.");
            return;
        }

        const numQty = typeof quantity === "string" ? Number(quantity) : quantity;
        if (
            typeof numQty !== "number" ||
            isNaN(numQty) ||
            numQty <= 0
        ) {
            setError("Số lượng phải là số dương lớn hơn 0.");
            return;
        }

        if (!reason.trim()) {
            setError("Vui lòng nhập lý do nhập/xuất kho.");
            return;
        }

        if (
            type === "OUT" &&
            selectedProduct &&
            selectedProduct.currentStock < numQty
        ) {
            setError(
                `Số lượng xuất (${numQty}) vượt quá số lượng tồn kho hiện tại (${selectedProduct.currentStock}).`,
            );
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/inventory-movements", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    productId,
                    type,
                    quantity: numQty,
                    reason: reason.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể tạo phiếu kho.");
                return;
            }

            setSuccessMessage(data.message || "Tạo phiếu kho thành công.");
            setQuantity("");
            setReason("");

            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    if (products.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Chưa có sản phẩm nào trong danh mục. Vui lòng tạo sản phẩm trước khi nhập/xuất kho.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    {successMessage}
                </div>
            )}

            {/* Type selector */}
            <div>
                <label className="block text-xs font-semibold text-slate-700">
                    Loại giao dịch <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setType("IN")}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            type === "IN"
                                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
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
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                        Nhập kho (IN)
                    </button>

                    <button
                        type="button"
                        onClick={() => setType("OUT")}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            type === "OUT"
                                ? "border-amber-600 bg-amber-50 text-amber-700"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
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
                                d="M5 12h14"
                            />
                        </svg>
                        Xuất kho (OUT)
                    </button>
                </div>
            </div>

            {/* Product select */}
            <div>
                <label
                    htmlFor="inventory-product"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Chọn mặt hàng <span className="text-red-500">*</span>
                </label>
                <select
                    id="inventory-product"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `[${p.sku}]` : ""} (Tồn: {p.currentStock})
                        </option>
                    ))}
                </select>
                {selectedProduct && (
                    <p className="mt-1 text-xs text-slate-500">
                        Tồn kho hiện tại:{" "}
                        <span className="font-semibold text-slate-800">
                            {selectedProduct.currentStock}
                        </span>
                    </p>
                )}
            </div>

            {/* Quantity */}
            <div>
                <label
                    htmlFor="inventory-quantity"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Số lượng {type === "IN" ? "nhập" : "xuất"}{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    id="inventory-quantity"
                    type="number"
                    required
                    min="0.0001"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Ví dụ: 10, 2.5, 50..."
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            {/* Reason */}
            <div>
                <label
                    htmlFor="inventory-reason"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Lý do {type === "IN" ? "nhập" : "xuất"}{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    id="inventory-reason"
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                        type === "IN"
                            ? "Ví dụ: Nhập hàng đợt 1, mua từ đại lý..."
                            : "Ví dụ: Xuất bán lẻ, xuất hủy hỏng..."
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    type === "IN"
                        ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                        : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
                }`}
            >
                {loading
                    ? "Đang ghi sổ kho..."
                    : type === "IN"
                    ? "Xác nhận Nhập kho (+)"
                    : "Xác nhận Xuất kho (-)"}
            </button>
        </form>
    );
}
