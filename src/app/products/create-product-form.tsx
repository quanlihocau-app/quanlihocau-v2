"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

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
                <InlineAlert type="error" message={error} />
            )}

            {successMessage && (
                <InlineAlert type="success" message={successMessage} />
            )}

            <Input
                label="Tên sản phẩm / Dịch vụ *"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nước ngọt C2, Mồi câu cá chép..."
            />

            <Input
                label="Mã sản phẩm (SKU - Tùy chọn)"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ví dụ: C2-TRA, MOI-CHEP-01"
            />

            <Input
                label="Đơn giá bán (VNĐ) *"
                type="number"
                required
                min={1}
                step={1}
                value={priceVnd}
                onChange={(e) => setPriceVnd(e.target.value)}
                placeholder="Ví dụ: 15000"
            />

            <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                loadingText="Đang tạo sản phẩm…"
                className="w-full"
            >
                Thêm sản phẩm mới
            </Button>
        </form>
    );
}
