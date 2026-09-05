"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

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
    const [costPriceVnd, setCostPriceVnd] = useState<number | string>("");
    const [supplier, setSupplier] = useState("");
    const [note, setNote] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const selectedProduct = products.find((p) => p.id === productId);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (loading) return;
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

        const numCost =
            costPriceVnd !== "" ? Number(costPriceVnd) : undefined;
        if (
            numCost !== undefined &&
            (isNaN(numCost) || !Number.isInteger(numCost) || numCost < 0)
        ) {
            setError("Giá nhập phải là số nguyên không âm (>= 0).");
            return;
        }

        setLoading(true);

        try {
            const idempotencyKey = crypto.randomUUID();
            const res = await fetch("/api/inventory-movements", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                    productId,
                    type,
                    quantity: numQty,
                    reason: reason.trim(),
                    costPriceVnd: numCost,
                    supplier: supplier.trim() || undefined,
                    note: note.trim() || undefined,
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
            setCostPriceVnd("");
            setSupplier("");
            setNote("");

            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    if (products.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[#E2DDD2] p-6 text-center text-xs text-slate-500 font-medium">
                Chưa có sản phẩm nào trong danh mục. Vui lòng tạo sản phẩm trước khi nhập/xuất kho.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <InlineAlert type="error" message={error} />
            )}

            {successMessage && (
                <InlineAlert type="success" message={successMessage} />
            )}

            {/* Type selector */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Loại giao dịch *
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setType("IN")}
                        className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            type === "IN"
                                ? "border-[#0D9488] bg-[#0D9488] text-white shadow-2xs"
                                : "border-[#E2DDD2] bg-white text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        <span>+ Nhập kho (IN)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setType("OUT")}
                        className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            type === "OUT"
                                ? "border-orange-600 bg-orange-600 text-white shadow-2xs"
                                : "border-[#E2DDD2] bg-white text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        <span>- Xuất kho (OUT)</span>
                    </button>
                </div>
            </div>

            {/* Product select */}
            <Select
                id="inventory-product"
                label="Chọn mặt hàng *"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                helperText={selectedProduct ? `Tồn kho hiện tại: ${selectedProduct.currentStock}` : undefined}
            >
                {products.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `[${p.sku}]` : ""} (Tồn: {p.currentStock})
                    </option>
                ))}
            </Select>

            {/* Quantity */}
            <Input
                id="inventory-quantity"
                label={`Số lượng ${type === "IN" ? "nhập" : "xuất"} *`}
                type="number"
                required
                min="0.0001"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ví dụ: 10, 2.5, 50..."
            />

            {/* Reason */}
            <Input
                id="inventory-reason"
                label={`Lý do ${type === "IN" ? "nhập" : "xuất"} *`}
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                    type === "IN"
                        ? "Ví dụ: Nhập hàng đợt 1, mua từ đại lý..."
                        : "Ví dụ: Xuất bán lẻ, xuất hủy hỏng..."
                }
            />

            {/* Optional Fields for Inward Movements */}
            {type === "IN" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                        id="inventory-cost-price"
                        label="Giá nhập / đơn giá gốc (VNĐ - Tùy chọn)"
                        type="number"
                        min="0"
                        step="1"
                        value={costPriceVnd}
                        onChange={(e) => setCostPriceVnd(e.target.value)}
                        placeholder="Ví dụ: 8000"
                    />

                    <Input
                        id="inventory-supplier"
                        label="Nhà cung cấp / Nguồn hàng (Tùy chọn)"
                        type="text"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="Ví dụ: Đại lý Tân Phát, Siêu thị..."
                    />
                </div>
            )}

            <Input
                id="inventory-note"
                label="Ghi chú thêm (Tùy chọn)"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú chi tiết thêm nếu có..."
            />

            <Button
                type="submit"
                size="lg"
                variant={type === "IN" ? "success" : "warning"}
                isLoading={loading}
                loadingText="Đang ghi sổ kho…"
                disabled={loading}
                className="w-full"
            >
                {type === "IN" ? "Xác nhận Nhập kho (+)" : "Xác nhận Xuất kho (-)"}
            </Button>
        </form>
    );
}
