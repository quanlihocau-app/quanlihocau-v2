"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export interface SelectCustomer {
    id: string;
    name: string;
    phoneNormalized: string | null;
}

export interface SelectPackage {
    id: string;
    name: string;
    durationMinutes: number;
    priceVnd: number;
}

export interface SelectHut {
    id: string;
    name: string;
    currentSessionId: string | null;
    area: { id: string; name: string };
}

interface OpenSessionFormProps {
    customers: SelectCustomer[];
    packages: SelectPackage[];
    huts: SelectHut[];
}

export function OpenSessionForm({
    customers,
    packages,
    huts,
}: OpenSessionFormProps) {
    const router = useRouter();

    const [customerId, setCustomerId] = useState("");
    const [packageId, setPackageId] = useState("");
    const [selectedHutIds, setSelectedHutIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const availableHuts = huts.filter((h) => h.currentSessionId === null);

    function toggleHut(hutId: string) {
        setSelectedHutIds((prev) =>
            prev.includes(hutId)
                ? prev.filter((id) => id !== hutId)
                : prev.length < 10
                  ? [...prev, hutId]
                  : prev,
        );
    }

    function formatPrice(vnd: number) {
        return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");

        if (!packageId) {
            setFormError("Vui lòng chọn gói câu.");
            return;
        }
        if (selectedHutIds.length === 0) {
            setFormError("Vui lòng chọn ít nhất 1 chòi.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/fishing-sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: customerId || null,
                    packageId,
                    hutIds: selectedHutIds,
                }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                if (response.status === 409) {
                    setFormError(
                        result.error ??
                            "Chòi đã bị người khác chiếm. Vui lòng tải lại trang và chọn chòi khác.",
                    );
                } else {
                    setFormError(result.error ?? "Không thể mở phiên câu.");
                }
                setIsSubmitting(false);
                return;
            }

            router.push("/sessions");
            router.refresh();
        } catch {
            setFormError("Đã có lỗi xảy ra khi mở phiên câu.");
            setIsSubmitting(false);
        }
    }

    // Group huts by area for better UX
    const hutsByArea = new Map<string, { areaName: string; huts: SelectHut[] }>();
    for (const hut of availableHuts) {
        const existing = hutsByArea.get(hut.area.id);
        if (existing) {
            existing.huts.push(hut);
        } else {
            hutsByArea.set(hut.area.id, { areaName: hut.area.name, huts: [hut] });
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-8"
        >
            {/* Customer selection (optional) */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                    Khách hàng
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    Chọn khách hàng hoặc để trống cho khách vãng lai.
                </p>

                <div className="mt-4">
                    <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    >
                        <option value="">— Khách vãng lai —</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                                {c.phoneNormalized
                                    ? ` (${c.phoneNormalized})`
                                    : ""}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Package selection */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                    Gói câu *
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    Chọn gói câu áp dụng cho phiên này.
                </p>

                {packages.length === 0 ? (
                    <p className="mt-4 text-sm text-amber-600">
                        Chưa có gói câu nào. Vui lòng tạo gói câu trước.
                    </p>
                ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {packages.map((p) => (
                            <label
                                key={p.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                                    packageId === p.id
                                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                                        : "border-slate-200 hover:border-slate-400"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="packageId"
                                    value={p.id}
                                    checked={packageId === p.id}
                                    onChange={(e) => setPackageId(e.target.value)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {p.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {p.durationMinutes} phút —{" "}
                                        {formatPrice(p.priceVnd)}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Hut selection */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                    Chòi câu * ({selectedHutIds.length} đã chọn)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    Chọn 1–10 chòi trống cho phiên này. Chòi đang bận không hiển thị.
                </p>

                {availableHuts.length === 0 ? (
                    <p className="mt-4 text-sm text-amber-600">
                        Không còn chòi nào trống. Vui lòng đợi phiên khác kết thúc.
                    </p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {[...hutsByArea.entries()].map(([areaId, { areaName, huts: areaHuts }]) => (
                            <div key={areaId}>
                                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                                    {areaName}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {areaHuts.map((h) => {
                                        const isSelected = selectedHutIds.includes(h.id);
                                        return (
                                            <button
                                                key={h.id}
                                                type="button"
                                                onClick={() => toggleHut(h.id)}
                                                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                                                    isSelected
                                                        ? "border-slate-900 bg-slate-900 text-white"
                                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                                }`}
                                            >
                                                {h.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Error + Submit */}
            {formError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {formError}
                </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.push("/sessions")}
                    className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                    {isSubmitting ? "Đang mở phiên..." : "Mở phiên câu"}
                </button>
            </div>
        </form>
    );
}
