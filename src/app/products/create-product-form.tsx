"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateProductForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [priceVnd, setPriceVnd] = useState<number | string>("");
    const [sku, setSku] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!name.trim()) {
            setError("Vui lòng nhập tên sản phẩm.");
            return;
        }

        const numPrice = typeof priceVnd === "string" ? Number(priceVnd) : priceVnd;
        if (
            typeof numPrice !== "number" ||
            isNaN(numPrice) ||
            !Number.isInteger(numPrice) ||
            numPrice <= 0
        ) {
            setError("Giá sản phẩm phải là số nguyên dương lớn hơn 0.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    priceVnd: numPrice,
                    sku: sku.trim() ? sku.trim() : undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể tạo sản phẩm.");
                return;
            }

            setSuccessMessage(
                `Đã thêm sản phẩm "${data.product?.name}" thành công.`,
            );

            setName("");
            setPriceVnd("");
            setSku("");

            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
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

            <div>
                <label
                    htmlFor="product-name"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Tên sản phẩm / Dịch vụ <span className="text-red-500">*</span>
                </label>
                <input
                    id="product-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nước ngọt C2, Mồi câu cá chép..."
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            <div>
                <label
                    htmlFor="product-sku"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Mã sản phẩm (SKU){" "}
                    <span className="font-normal text-slate-400">(Tùy chọn)</span>
                </label>
                <input
                    id="product-sku"
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ví dụ: C2-TRA, MOI-CHEP-01"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
                />
            </div>

            <div>
                <label
                    htmlFor="product-price"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Đơn giá bán (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                    id="product-price"
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={priceVnd}
                    onChange={(e) => setPriceVnd(e.target.value)}
                    placeholder="Ví dụ: 15000"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "Đang tạo sản phẩm..." : "Thêm sản phẩm mới"}
            </button>
        </form>
    );
}
