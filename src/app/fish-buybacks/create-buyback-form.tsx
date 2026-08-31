"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

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
            <div className="rounded-xl border border-dashed border-[#E2DDD2] p-6 text-center text-xs text-slate-500 font-medium">
                Chưa có loại cá nào trong danh mục. Vui lòng cấu hình loại cá trước khi ghi nhận thu mua.
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

            {/* Select Fish Type */}
            <Select
                id="buyback-fish-type"
                label="Chọn loại cá *"
                value={fishTypeId}
                onChange={(e) => setFishTypeId(e.target.value)}
                helperText={selectedFishType ? `Đơn giá áp dụng: ${formatVnd(selectedFishType.pricePerKg)} / kg` : undefined}
            >
                {fishTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                        {ft.name} ({formatVnd(ft.pricePerKg)} / kg)
                    </option>
                ))}
            </Select>

            {/* Weight Input */}
            <Input
                id="buyback-weight"
                label="Khối lượng cá (kg) *"
                type="number"
                required
                min="0.01"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ví dụ: 3.5, 5.25..."
            />

            {/* Live Estimation Box */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Tổng tiền thu mua:</span>
                    <span className="text-base font-black text-[#0D9488] tabular-nums">
                        {estimatedTotal !== null
                            ? formatVnd(estimatedTotal)
                            : "—"}
                    </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                    Hệ thống sẽ làm tròn chính xác theo quy tắc chuẩn tài chính khi lưu phiếu.
                </p>
            </div>

            <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                loadingText="Đang ghi nhận…"
                className="w-full"
            >
                Xác nhận thu mua cá
            </Button>
        </form>
    );
}
