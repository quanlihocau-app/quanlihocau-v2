"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
                    htmlFor="fish-name"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Tên loại cá <span className="text-red-500">*</span>
                </label>
                <input
                    id="fish-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Cá chép, Cá trôi, Cá trắm đen..."
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            <div>
                <label
                    htmlFor="fish-price"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Đơn giá thu mua (VNĐ / kg){" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    id="fish-price"
                    type="number"
                    required
                    min={1}
                    step={1000}
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(e.target.value)}
                    placeholder="Ví dụ: 35000"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "Đang tạo loại cá..." : "Thêm loại cá mới"}
            </button>
        </form>
    );
}
