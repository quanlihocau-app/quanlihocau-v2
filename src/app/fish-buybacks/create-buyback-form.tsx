"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface FishTypeOption {
    id: string;
    name: string;
    pricePerKg: number;
}

interface CreateBuybackFormProps {
    fishTypes: FishTypeOption[];
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function calculateEstimatedTotalVnd(
    weightInput: string | number,
    pricePerKg: number,
): number | null {
    if (
        typeof pricePerKg !== "number" ||
        !Number.isInteger(pricePerKg) ||
        pricePerKg <= 0
    ) {
        return null;
    }

    const str = String(weightInput).trim();
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
        const priceBig = BigInt(pricePerKg);
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

export function CreateBuybackForm({ fishTypes }: CreateBuybackFormProps) {
    const router = useRouter();
    const [fishTypeId, setFishTypeId] = useState(fishTypes[0]?.id || "");
    const [weight, setWeight] = useState<number | string>("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const selectedFishType = fishTypes.find((ft) => ft.id === fishTypeId);

    const numWeight = typeof weight === "string" ? Number(weight) : weight;
    const estimatedTotal = selectedFishType
        ? calculateEstimatedTotalVnd(weight, selectedFishType.pricePerKg)
        : null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!fishTypeId) {
            setError("Vui lòng chọn loại cá.");
            return;
        }

        if (
            typeof numWeight !== "number" ||
            isNaN(numWeight) ||
            numWeight <= 0
        ) {
            setError("Trọng lượng cá phải là số dương lớn hơn 0.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/fish-buybacks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fishTypeId,
                    weight: numWeight,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể ghi nhận thu mua cá.");
                return;
            }

            setSuccessMessage(data.message || "Ghi nhận thu mua cá thành công.");
            setWeight("");

            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    if (fishTypes.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Chưa có loại cá nào trong danh mục. Vui lòng cấu hình loại cá trước khi ghi nhận thu mua.
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

            {/* Select Fish Type */}
            <div>
                <label
                    htmlFor="buyback-fish-type"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Chọn loại cá <span className="text-red-500">*</span>
                </label>
                <select
                    id="buyback-fish-type"
                    value={fishTypeId}
                    onChange={(e) => setFishTypeId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                    {fishTypes.map((ft) => (
                        <option key={ft.id} value={ft.id}>
                            {ft.name} ({formatVnd(ft.pricePerKg)} / kg)
                        </option>
                    ))}
                </select>
                {selectedFishType && (
                    <p className="mt-1 text-xs text-slate-500">
                        Đơn giá áp dụng:{" "}
                        <span className="font-semibold text-emerald-700">
                            {formatVnd(selectedFishType.pricePerKg)} / kg
                        </span>
                    </p>
                )}
            </div>

            {/* Weight Input */}
            <div>
                <label
                    htmlFor="buyback-weight"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Khối lượng cá (kg) <span className="text-red-500">*</span>
                </label>
                <input
                    id="buyback-weight"
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Ví dụ: 3.5, 5.25..."
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            {/* Live Estimation Box */}
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Tổng tiền thu mua dự kiến:</span>
                    <span className="text-base font-bold text-emerald-800">
                        {estimatedTotal !== null
                            ? formatVnd(estimatedTotal)
                            : "—"}
                    </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                    Hệ thống sẽ làm tròn chính xác theo quy tắc chuẩn tài chính khi lưu phiếu.
                </p>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "Đang ghi nhận..." : "Xác nhận thu mua cá"}
            </button>
        </form>
    );
}
