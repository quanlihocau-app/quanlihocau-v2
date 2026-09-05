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

    const formatVnd = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
    };

    const hasPrice = pricePerKg !== "" && !isNaN(Number(pricePerKg)) && Number(pricePerKg) > 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Inline Alert / Feedback */}
            {error && (
                <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                    <svg className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 animate-in fade-in duration-150">
                    <svg className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="font-medium">{successMessage}</span>
                </div>
            )}

            {/* Form Fields: 2 cols on Desktop, 1 col on Mobile */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tên loại cá */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="fish-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                    >
                        Tên loại cá <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="fish-name"
                        type="text"
                        required
                        disabled={loading}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: Cá chép, Cá trôi, Cá trắm đen..."
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors disabled:bg-slate-50"
                    />
                </div>

                {/* Đơn giá thu mua */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="fish-price"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                    >
                        Đơn giá thu mua (VNĐ/kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="fish-price"
                        type="number"
                        required
                        min={0}
                        step={1000}
                        disabled={loading}
                        value={pricePerKg}
                        onChange={(e) => setPricePerKg(e.target.value)}
                        placeholder="Ví dụ: 35000, 40000..."
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors disabled:bg-slate-50 tabular-nums"
                    />
                    {hasPrice ? (
                        <p className="text-[11px] font-semibold text-blue-600">
                            Định dạng: {formatVnd(Number(pricePerKg))} / kg
                        </p>
                    ) : (
                        <p className="text-[11px] text-slate-400">
                            Nhập đơn giá tính theo 1 kg (bội số 1.000đ)
                        </p>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-11 h-11 w-full sm:w-auto sm:px-6 items-center justify-center gap-2 rounded-md bg-[#0f172a] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1e293b] active:bg-[#020617] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 transition-colors disabled:opacity-50 cursor-pointer"
                >
                    {loading ? (
                        <>
                            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Đang thêm…</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Thêm loại cá</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
