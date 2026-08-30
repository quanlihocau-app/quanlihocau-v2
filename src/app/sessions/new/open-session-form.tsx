"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

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

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

export function OpenSessionForm({
    customers: initialCustomers,
    packages,
    huts,
}: OpenSessionFormProps) {
    const router = useRouter();

    // Customer state
    const [customerList, setCustomerList] =
        useState<SelectCustomer[]>(initialCustomers);
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
        null,
    );
    const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [customerError, setCustomerError] = useState("");
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

    // Package & Hut state
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        packages[0]?.id ?? "",
    );
    const [selectedHutIds, setSelectedHutIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const availableHuts = huts.filter((h) => h.currentSessionId === null);

    const selectedCustomer = customerList.find(
        (c) => c.id === selectedCustomerId,
    );
    const selectedPackage = packages.find((p) => p.id === selectedPackageId);

    // Search filter for customers
    const filteredCustomers = useMemo(() => {
        if (!customerSearch.trim()) return [];
        const query = customerSearch.toLowerCase().trim();
        return customerList
            .filter(
                (c) =>
                    c.name.toLowerCase().includes(query) ||
                    (c.phoneNormalized &&
                        c.phoneNormalized.toLowerCase().includes(query)),
            )
            .slice(0, 5);
    }, [customerList, customerSearch]);

    function toggleHut(hutId: string) {
        setSelectedHutIds((prev) =>
            prev.includes(hutId)
                ? prev.filter((id) => id !== hutId)
                : prev.length < 10
                  ? [...prev, hutId]
                  : prev,
        );
    }

    async function handleQuickCreateCustomer(e: FormEvent) {
        e.preventDefault();
        setCustomerError("");

        if (!newCustomerName.trim()) {
            setCustomerError("Vui lòng nhập tên khách hàng.");
            return;
        }

        setIsCreatingCustomer(true);

        try {
            const res = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newCustomerName.trim(),
                    phone: newCustomerPhone.trim() || undefined,
                }),
            });

            const data = (await res.json()) as {
                id?: string;
                name?: string;
                phoneNormalized?: string | null;
                error?: string;
            };

            if (!res.ok || !data.id) {
                setCustomerError(data.error ?? "Không thể tạo khách hàng.");
                setIsCreatingCustomer(false);
                return;
            }

            const newC: SelectCustomer = {
                id: data.id,
                name: data.name ?? newCustomerName.trim(),
                phoneNormalized: data.phoneNormalized ?? null,
            };

            setCustomerList((prev) => [newC, ...prev]);
            setSelectedCustomerId(newC.id);
            setShowQuickAddCustomer(false);
            setNewCustomerName("");
            setNewCustomerPhone("");
            setCustomerSearch("");
            setIsCreatingCustomer(false);
        } catch {
            setCustomerError("Lỗi kết nối khi tạo khách hàng.");
            setIsCreatingCustomer(false);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");

        if (!selectedPackageId) {
            setFormError("Vui lòng chọn gói câu.");
            return;
        }
        if (selectedHutIds.length === 0) {
            setFormError("Vui lòng chọn ít nhất 1 ô câu.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/fishing-sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: selectedCustomerId || null,
                    packageId: selectedPackageId,
                    hutIds: selectedHutIds,
                }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                if (response.status === 409) {
                    setFormError(
                        result.error ??
                            "Ô câu đã bị người khác chọn. Vui lòng tải lại trang và chọn ô khác.",
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

    // Group huts by area
    const hutsByArea = useMemo(() => {
        const map = new Map<
            string,
            { areaName: string; huts: SelectHut[] }
        >();
        for (const hut of huts) {
            const existing = map.get(hut.area.id);
            if (existing) {
                existing.huts.push(hut);
            } else {
                map.set(hut.area.id, {
                    areaName: hut.area.name,
                    huts: [hut],
                });
            }
        }
        return map;
    }, [huts]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. KHÁCH HÀNG */}
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Khách hàng
                    </label>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCustomerId(null);
                                setCustomerSearch("");
                            }}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                selectedCustomerId === null
                                    ? "bg-[#EAE2CE] text-[#8A5B00]"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            Khách lẻ
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setShowQuickAddCustomer((prev) => !prev)
                            }
                            className="rounded-lg bg-[#9E6B05]/10 px-2.5 py-1 text-[11px] font-bold text-[#9E6B05] hover:bg-[#9E6B05]/20 transition-colors"
                        >
                            + Thêm khách
                        </button>
                    </div>
                </div>

                {/* Quick Add Customer inline form */}
                {showQuickAddCustomer && (
                    <div className="rounded-xl bg-[#F7F4EE] border border-[#EAE4D7] p-3 space-y-2">
                        <p className="text-xs font-bold text-slate-800">
                            Thêm nhanh khách hàng
                        </p>
                        {customerError && (
                            <p className="text-xs text-red-600 font-medium">
                                {customerError}
                            </p>
                        )}
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Tên khách (bắt buộc)"
                                value={newCustomerName}
                                onChange={(e) =>
                                    setNewCustomerName(e.target.value)
                                }
                                className="w-full h-10 rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-medium text-slate-900 focus:border-[#9E6B05] focus:outline-none"
                            />
                            <input
                                type="tel"
                                placeholder="Số điện thoại (tùy chọn)"
                                value={newCustomerPhone}
                                onChange={(e) =>
                                    setNewCustomerPhone(e.target.value)
                                }
                                className="w-full h-10 rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-medium text-slate-900 focus:border-[#9E6B05] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowQuickAddCustomer(false);
                                        setCustomerError("");
                                    }}
                                    className="h-8 rounded-lg border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-slate-600"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    disabled={isCreatingCustomer}
                                    onClick={handleQuickCreateCustomer}
                                    className="h-8 rounded-lg bg-[#9E6B05] px-3 text-xs font-bold text-white disabled:opacity-60"
                                >
                                    {isCreatingCustomer
                                        ? "Đang lưu…"
                                        : "Lưu khách"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Selected Customer Card or Search Bar */}
                {selectedCustomer ? (
                    <div className="flex items-center justify-between rounded-xl bg-[#F7F4EE] border border-[#EAE4D7] p-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAE2CE]">
                                <svg
                                    className="h-4 w-4 text-[#9E6B05]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900">
                                    {selectedCustomer.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {selectedCustomer.phoneNormalized ||
                                        "Chưa có SĐT"}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedCustomerId(null)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white"
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
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm khách theo tên hoặc SĐT…"
                                value={customerSearch}
                                onChange={(e) =>
                                    setCustomerSearch(e.target.value)
                                }
                                className="w-full h-11 rounded-xl border border-[#EAE4D7] bg-white pl-10 pr-4 text-xs font-medium text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                            />
                            <svg
                                className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                />
                            </svg>
                        </div>

                        {/* Search Matches List */}
                        {filteredCustomers.length > 0 && (
                            <div className="rounded-xl border border-[#EAE4D7] bg-white divide-y divide-[#EAE4D7] shadow-sm overflow-hidden">
                                {filteredCustomers.map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedCustomerId(c.id);
                                            setCustomerSearch("");
                                        }}
                                        className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#F7F4EE] transition-colors"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">
                                                {c.name}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {c.phoneNormalized ||
                                                    "Không có SĐT"}
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-semibold text-[#9E6B05]">
                                            Chọn
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. CHỌN Ô CÂU */}
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Chọn ô câu *
                    </label>
                    <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-2.5 py-0.5 text-xs font-semibold text-[#8A5B00]">
                        {selectedHutIds.length} đã chọn
                    </span>
                </div>

                {availableHuts.length === 0 ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                        <p className="text-xs text-amber-800 font-medium">
                            Hiện không còn ô câu nào trống. Vui lòng đợi phiên
                            khác kết thúc.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...hutsByArea.entries()].map(
                            ([areaId, { areaName, huts: areaHuts }]) => (
                                <div key={areaId} className="space-y-1.5">
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        {areaName}
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {areaHuts.map((h) => {
                                            const isSelected =
                                                selectedHutIds.includes(h.id);
                                            const isOccupied =
                                                h.currentSessionId !== null;

                                            return (
                                                <button
                                                    key={h.id}
                                                    type="button"
                                                    disabled={isOccupied}
                                                    onClick={() =>
                                                        toggleHut(h.id)
                                                    }
                                                    className={`h-11 min-w-11 rounded-xl text-xs font-bold transition-all duration-150 ease-out active:scale-95 flex flex-col items-center justify-center ${
                                                        isSelected
                                                            ? "bg-[#9E6B05] text-white shadow-md ring-2 ring-[#9E6B05]/30"
                                                            : isOccupied
                                                              ? "bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed"
                                                              : "bg-[#F7F4EE] border border-[#EAE4D7] text-slate-800 hover:border-[#9E6B05]"
                                                    }`}
                                                >
                                                    <span>{h.name}</span>
                                                    {isOccupied && (
                                                        <span className="text-[9px] font-normal">
                                                            Đang câu
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </div>

            {/* 3. GÓI / CA CÂU */}
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Gói câu / Ca câu *
                </label>

                {packages.length === 0 ? (
                    <p className="text-xs text-amber-600">
                        Chưa có gói câu nào. Vui lòng tạo gói câu trước.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {packages.map((p) => {
                            const isSelected = selectedPackageId === p.id;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPackageId(p.id)}
                                    className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition-all duration-150 ease-out active:scale-98 ${
                                        isSelected
                                            ? "border-[#9E6B05] bg-[#F7F4EE] ring-1 ring-[#9E6B05]"
                                            : "border-[#EAE4D7] bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                                isSelected
                                                    ? "border-[#9E6B05] bg-[#9E6B05]"
                                                    : "border-slate-300 bg-white"
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">
                                                {p.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Thời lượng: {p.durationMinutes}{" "}
                                                phút
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-[#9E6B05]">
                                        {formatPrice(p.priceVnd)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 4. GIỜ BẮT ĐẦU & TỔNG DỰ KIẾN */}
            <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5">
                        <svg
                            className="h-4 w-4 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        </svg>
                        Giờ bắt đầu:
                    </span>
                    <span className="font-semibold text-slate-900">
                        Tự động bắt đầu ngay khi tạo vé
                    </span>
                </div>

                {selectedPackage && selectedHutIds.length > 0 && (
                    <div className="border-t border-[#EAE4D7] pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                            Tiền gói ({selectedHutIds.length} ô):
                        </span>
                        <span className="text-sm font-bold text-[#9E6B05]">
                            {formatPrice(
                                selectedPackage.priceVnd *
                                    selectedHutIds.length,
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-medium">
                    {formError}
                </div>
            )}

            {/* 5. SUBMIT BUTTON */}
            <button
                type="submit"
                disabled={isSubmitting || availableHuts.length === 0}
                className="w-full h-12 rounded-xl bg-[#9E6B05] text-sm font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-98 disabled:opacity-60"
            >
                {isSubmitting ? "Đang tạo vé…" : "Tạo vé và mở ô"}
            </button>
        </form>
    );
}
