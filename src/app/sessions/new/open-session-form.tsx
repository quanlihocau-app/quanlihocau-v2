"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePrinter } from "@/lib/printing/use-printer";

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
    const { isConnected, printSessionTicket } = usePrinter();

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

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError("");

        if (!selectedPackageId) {
            setFormError("Vui lòng chọn một gói câu.");
            return;
        }

        if (selectedHutIds.length === 0) {
            setFormError("Vui lòng chọn ít nhất một ô câu.");
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

            const result = (await response.json()) as {
                id?: string;
                startAt?: string;
                plannedEndAt?: string;
                packageNameSnapshot?: string;
                packagePriceVndSnapshot?: number;
                packageDurationMinutesSnapshot?: number;
                customer?: { name?: string; phoneNormalized?: string | null } | null;
                error?: string;
            };

            if (!response.ok || !result.id) {
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

            // Auto-print session ticket if printer is connected
            if (isConnected && result.id) {
                const selectedHutsInfo = huts
                    .filter((h) => selectedHutIds.includes(h.id))
                    .map((h) => ({ name: h.name, areaName: h.area.name }));

                printSessionTicket({
                    sessionId: result.id,
                    lakeName: "HỒ CÂU",
                    huts: selectedHutsInfo,
                    packageName: selectedPackage?.name || result.packageNameSnapshot || "Gói câu",
                    packagePriceVnd: selectedPackage?.priceVnd || result.packagePriceVndSnapshot || 0,
                    durationMinutes: selectedPackage?.durationMinutes || result.packageDurationMinutesSnapshot || 0,
                    customerName: selectedCustomer?.name || result.customer?.name || null,
                    customerPhone: selectedCustomer?.phoneNormalized || result.customer?.phoneNormalized || null,
                    startAt: result.startAt || new Date().toISOString(),
                    plannedEndAt: result.plannedEndAt || null,
                }).catch(() => {
                    // Non-blocking
                });
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
            <Card className="space-y-3 bg-[#FFFDF9] border-[#EAE4D7]">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        1. Khách hàng
                    </label>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCustomerId(null);
                                setCustomerSearch("");
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                selectedCustomerId === null
                                    ? "bg-[#382016] text-[#F6DFB2]"
                                    : "bg-white text-slate-700 border border-[#EAE4D7] hover:bg-slate-50"
                            }`}
                        >
                            Khách lẻ
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setShowQuickAddCustomer((prev) => !prev)
                            }
                            className="rounded-lg bg-[#EAE2CE] border border-[#DCD3C0] px-2.5 py-1 text-xs font-semibold text-[#8A5B00] hover:bg-[#E2D6C0] transition-colors"
                        >
                            + Thêm khách
                        </button>
                    </div>
                </div>

                {/* Quick Add Form */}
                {showQuickAddCustomer && (
                    <div className="rounded-xl border border-[#EAE4D7] bg-[#F8F6F0] p-3.5 space-y-3">
                        <p className="text-xs font-bold text-slate-900">
                            Thêm nhanh khách hàng mới
                        </p>
                        {customerError && (
                            <InlineAlert type="error" message={customerError} />
                        )}
                        <div className="space-y-2">
                            <Input
                                placeholder="Họ và tên khách..."
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                            />
                            <Input
                                placeholder="Số điện thoại (tùy chọn)..."
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                isLoading={isCreatingCustomer}
                                loadingText="Đang lưu…"
                                onClick={handleQuickCreateCustomer}
                            >
                                Lưu khách hàng
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowQuickAddCustomer(false)}
                            >
                                Hủy
                            </Button>
                        </div>
                    </div>
                )}

                {/* Customer Search & Selection */}
                {selectedCustomerId ? (
                    <div className="flex items-center justify-between rounded-xl border border-[#9E6B05] bg-[#EAE2CE] p-3 shadow-xs">
                        <div>
                            <p className="text-xs font-bold text-slate-900">
                                {selectedCustomer?.name}
                            </p>
                            {selectedCustomer?.phoneNormalized && (
                                <p className="text-xs text-slate-500 font-mono">
                                    {selectedCustomer.phoneNormalized}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedCustomerId(null)}
                            className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
                        >
                            Đổi khách
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Input
                            placeholder="Tìm theo tên hoặc số điện thoại..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                        {filteredCustomers.length > 0 && (
                            <div className="divide-y divide-[#EAE4D7] rounded-xl border border-[#EAE4D7] bg-white overflow-hidden shadow-xs">
                                {filteredCustomers.map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedCustomerId(c.id);
                                            setCustomerSearch("");
                                        }}
                                        className="cursor-pointer p-3 text-xs hover:bg-slate-50 flex items-center justify-between transition-colors"
                                    >
                                        <span className="font-semibold text-slate-900">
                                            {c.name}
                                        </span>
                                        <span className="text-slate-500 font-mono">
                                            {c.phoneNormalized ?? "—"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* 2. CHỌN Ô CÂU */}
            <Card className="space-y-3 bg-[#FFFDF9] border-[#EAE4D7]">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        2. Chọn ô câu <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-xs font-semibold text-emerald-700">
                        {selectedHutIds.length > 0
                            ? `Đã chọn ${selectedHutIds.length} ô`
                            : `Còn ${availableHuts.length} ô trống`}
                    </span>
                </div>

                {huts.length === 0 ? (
                    <p className="text-xs text-[#766F67]">Chưa có ô câu nào.</p>
                ) : (
                    <div className="space-y-3">
                        {Array.from(hutsByArea.entries()).map(
                            ([areaId, { areaName, huts: areaHuts }]) => (
                                <div key={areaId} className="space-y-1.5">
                                    <p className="text-[11px] font-semibold text-[#766F67] uppercase tracking-wide">
                                        {areaName}
                                    </p>
                                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                        {areaHuts.map((h) => {
                                            const isOccupied =
                                                h.currentSessionId !== null;
                                            const isSelected =
                                                selectedHutIds.includes(h.id);

                                            return (
                                                <button
                                                    key={h.id}
                                                    type="button"
                                                    disabled={isOccupied}
                                                    onClick={() =>
                                                        toggleHut(h.id)
                                                    }
                                                    className={`h-12 min-w-12 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                                                        isSelected
                                                            ? "bg-[#382016] text-[#F6DFB2] border-2 border-[#9E6B05] shadow-xs"
                                                            : isOccupied
                                                              ? "bg-slate-100 text-slate-400 border border-[#EAE4D7] opacity-60 cursor-not-allowed"
                                                              : "bg-white border border-[#EAE4D7] text-slate-800 hover:bg-[#FAF8F5]"
                                                    }`}
                                                >
                                                    <span>{h.name}</span>
                                                    {isOccupied && (
                                                        <span className="text-[9px] font-normal text-slate-400">
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
            </Card>

            {/* 3. GÓI / CA CÂU */}
            <Card className="space-y-3 bg-[#FFFDF9] border-[#EAE4D7]">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    3. Gói câu / Ca câu <span className="text-rose-600">*</span>
                </label>

                {packages.length === 0 ? (
                    <p className="text-xs text-amber-700">
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
                                    className={`cursor-pointer rounded-xl border p-3.5 flex items-center justify-between transition-colors ${
                                        isSelected
                                            ? "border-[#9E6B05] bg-[#EAE2CE] shadow-xs"
                                            : "border-[#EAE4D7] bg-white hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                isSelected
                                                    ? "border-[#9E6B05] bg-[#9E6B05]"
                                                    : "border-[#EAE4D7] bg-white"
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-900">
                                                {p.name}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">
                                                Thời lượng: {p.durationMinutes} phút
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-[#8A5B00] tabular-nums">
                                        {formatPrice(p.priceVnd)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* 4. TỔNG DỰ KIẾN */}
            <Card className="space-y-2 bg-[#FFFDF9] border-[#EAE4D7]">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
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
                        Thời gian:
                    </span>
                    <span className="font-semibold text-slate-800">
                        Tự động bắt đầu ngay khi tạo vé
                    </span>
                </div>

                {selectedPackage && selectedHutIds.length > 0 && (
                    <div className="border-t border-[#EAE4D7] pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                            Tiền gói ({selectedHutIds.length} ô):
                        </span>
                        <span className="text-base font-bold font-mono text-[#8A5B00] tabular-nums">
                            {formatPrice(
                                selectedPackage.priceVnd *
                                    selectedHutIds.length,
                            )}
                        </span>
                    </div>
                )}
            </Card>

            {/* Error Display */}
            {formError && (
                <InlineAlert type="error" message={formError} />
            )}

            {/* 5. SUBMIT BUTTON */}
            <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={isSubmitting}
                loadingText="Đang tạo vé…"
                disabled={availableHuts.length === 0}
                className="w-full"
            >
                Tạo vé và mở ô
            </Button>
        </form>
    );
}
