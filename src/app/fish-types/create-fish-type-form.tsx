"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

export function CreateFishTypeForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [pricePerKg, setPricePerKg] = useState<number | string>("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!name.trim()) {
            setError("Vui lòng nhập tên loại cá.");
            return;
        }

        const numPrice =
            typeof pricePerKg === "string" ? Number(pricePerKg) : pricePerKg;
        if (
            typeof numPrice !== "number" ||
            isNaN(numPrice) ||
            !Number.isInteger(numPrice) ||
            numPrice <= 0
        ) {
            setError("Giá thu mua phải là số nguyên dương lớn hơn 0.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/fish-types", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    pricePerKg: numPrice,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể tạo loại cá.");
                return;
            }

            setSuccessMessage(
                `Đã thêm loại cá "${data.fishType?.name}" thành công.`,
            );

            setName("");
            setPricePerKg("");

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
                label="Tên loại cá *"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Cá chép, Cá trôi, Cá trắm đen..."
            />

            <Input
                label="Đơn giá thu mua (VNĐ / kg) *"
                type="number"
                required
                min={1}
                step={1000}
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="Ví dụ: 35000"
            />

            <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                loadingText="Đang tạo loại cá…"
                className="w-full"
            >
                Thêm loại cá mới
            </Button>
        </form>
    );
}
