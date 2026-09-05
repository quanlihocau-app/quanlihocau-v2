"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePrinter } from "@/lib/printing/use-printer";
import { useNetworkStatus } from "@/lib/network/use-network-status";

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
    lakeName?: string;
    cashierName?: string;
}

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(d);
}

export interface CreatedSessionTicket {
    sessionId: string;
    ticketCode: string;
    lakeName: string;
    huts: Array<{ name: string; areaName?: string }>;
    packageName: string;
    packagePriceVnd: number;
    durationMinutes: number;
    customerName: string;
    customerPhone?: string | null;
    startAt: string;
    plannedEndAt?: string | null;
    cashierName: string;
    note?: string | null;
}

const quickCustomerSchema = z.object({
    name: z
        .string({ message: "Tên khách hàng là bắt buộc." })
        .trim()
        .min(2, "Tên khách hàng tối thiểu 2 ký tự.")
        .max(100, "Tên khách hàng tối đa 100 ký tự."),
    phone: z
        .string()
        .trim()
        .optional()
        .refine(
            (val) => !val || /^[0-9+()\-.\s]{9,15}$/.test(val),
            "Số điện thoại không đúng định dạng.",
        ),
});

export function OpenSessionForm({
    customers: initialCustomers,
    packages,
    huts: initialHuts,
    lakeName,
    cashierName,
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
    const [hutList, setHutList] = useState<SelectHut[]>(initialHuts);
    const [selectedHutIds, setSelectedHutIds] = useState<string[]>([]);
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // Ticket modal state
    const [createdTicket, setCreatedTicket] =
        useState<CreatedSessionTicket | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(
        null,
    );

    // ── Offline & Network Synchronization State ──────────────────────────────
    const { isOnline } = useNetworkStatus();
    const wasOfflineRef = useRef(false);
    const [reconnectNotice, setReconnectNotice] = useState<string | null>(null);
    const [isDraftRestored, setIsDraftRestored] = useState(false);

    const DRAFT_KEY = "qlhc_ticket_form_draft";

    // Khôi phục draft từ localStorage sau khi mount
    useEffect(() => {
        const restoreTimer = setTimeout(() => {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                if (!raw) return;
                const draft = JSON.parse(raw);
                let restoredAny = false;

                if (draft.packageId && packages.some((p) => p.id === draft.packageId)) {
                    setSelectedPackageId(draft.packageId);
                    restoredAny = true;
                }
                if (Array.isArray(draft.hutIds) && draft.hutIds.length > 0) {
                    const validIds = draft.hutIds.filter((id: string) =>
                        initialHuts.some((h) => h.id === id && h.currentSessionId === null),
                    );
                    if (validIds.length > 0) {
                        setSelectedHutIds(validIds);
                        restoredAny = true;
                    }
                }
                if (
                    draft.customerId &&
                    initialCustomers.some((c) => c.id === draft.customerId)
                ) {
                    setSelectedCustomerId(draft.customerId);
                    restoredAny = true;
                }
                if (typeof draft.note === "string" && draft.note.trim()) {
                    setNote(draft.note);
                    restoredAny = true;
                }
                if (restoredAny) {
                    setIsDraftRestored(true);
                }
            } catch {
                // Không chặn nếu lỗi localStorage
            }
        }, 0);

        return () => clearTimeout(restoreTimer);
    }, [packages, initialHuts, initialCustomers]);

    // Tự động lưu draft khi người dùng thay đổi dữ liệu
    useEffect(() => {
        try {
            if (selectedHutIds.length > 0 || note || selectedCustomerId) {
                localStorage.setItem(
                    DRAFT_KEY,
                    JSON.stringify({
                        packageId: selectedPackageId,
                        hutIds: selectedHutIds,
                        customerId: selectedCustomerId,
                        note,
                    }),
                );
            }
        } catch {
            // bỏ qua
        }
    }, [selectedPackageId, selectedHutIds, selectedCustomerId, note]);

    function clearDraft() {
        try {
            localStorage.removeItem(DRAFT_KEY);
            setIsDraftRestored(false);
        } catch {}
    }

    function handleDiscardDraft() {
        clearDraft();
        setSelectedHutIds([]);
        setSelectedCustomerId(null);
        setNote("");
    }

    const availableHuts = hutList.filter((h) => h.currentSessionId === null);

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

    const refreshHuts = useCallback(async () => {
        try {
            const res = await fetch("/api/huts");
            if (res.ok) {
                const data = (await res.json()) as SelectHut[];
                if (Array.isArray(data)) {
                    setHutList(data);
                    const occupiedIds = new Set(
                        data
                            .filter((h) => h.currentSessionId !== null)
                            .map((h) => h.id),
                    );
                    setSelectedHutIds((prev) =>
                        prev.filter((id) => !occupiedIds.has(id)),
                    );
                }
            }
        } catch {
            // fallback
        }
        router.refresh();
    }, [router]);

    // Tự động re-sync trạng thái ô khi mạng bật lại sau khi rớt mạng
    useEffect(() => {
        if (!isOnline) {
            wasOfflineRef.current = true;
        } else if (wasOfflineRef.current) {
            wasOfflineRef.current = false;
            setReconnectNotice("Đã có mạng trở lại! Đang làm mới danh sách ô câu trống…");
            refreshHuts().then(() => {
                setTimeout(() => setReconnectNotice(null), 3500);
            });
        }
    }, [isOnline, refreshHuts]);

    async function handleQuickCreateCustomer(e: FormEvent) {
        e.preventDefault();
        setCustomerError("");

        const validation = quickCustomerSchema.safeParse({
            name: newCustomerName,
            phone: newCustomerPhone.trim() || undefined,
        });

        if (!validation.success) {
            setCustomerError(
                validation.error.issues[0]?.message ??
                    "Thông tin khách hàng không hợp lệ.",
            );
            return;
        }

        setIsCreatingCustomer(true);

        try {
            const res = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: validation.data.name,
                    phone: validation.data.phone,
                }),
            });

            const data = (await res.json().catch(() => ({}))) as {
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
                name: data.name ?? validation.data.name,
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
        if (isSubmitting) return;
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
            const idempotencyKey = crypto.randomUUID();
            const response = await fetch("/api/fishing-sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                    customerId: selectedCustomerId || null,
                    packageId: selectedPackageId,
                    hutIds: selectedHutIds,
                }),
            });

            const result = (await response.json().catch(() => ({}))) as {
                ok?: boolean;
                id?: string;
                invoiceId?: string;
                startAt?: string;
                startTime?: string;
                plannedEndAt?: string;
                endTime?: string;
                data?: {
                    session?: {
                        id: string;
                        startTime: string;
                        endTime: string;
                    };
                    invoice?: {
                        id: string;
                    };
                };
                packageNameSnapshot?: string;
                packagePriceVndSnapshot?: number;
                packageDurationMinutesSnapshot?: number;
                customer?: { name?: string; phoneNormalized?: string | null } | null;
                error?: string;
                code?: string;
                requestId?: string;
            };

            const resolvedSessionId = result.id || result.data?.session?.id;
            const resolvedInvoiceId = result.invoiceId || result.data?.invoice?.id;
            const resolvedStartTime =
                result.startTime ||
                result.startAt ||
                result.data?.session?.startTime;
            const resolvedEndTime =
                result.endTime ||
                result.plannedEndAt ||
                result.data?.session?.endTime;

            if (
                !response.ok ||
                !resolvedSessionId ||
                !resolvedInvoiceId ||
                !resolvedStartTime
            ) {
                if (response.status === 409 || result.code === "SPOT_OCCUPIED") {
                    setFormError(result.error ?? "Ô câu đã có khách đang câu.");
                    await refreshHuts();
                } else {
                    const reqIdInfo = result.requestId
                        ? ` (Mã: ${result.requestId})`
                        : "";
                    setFormError(
                        (result.error ?? "Không thể mở phiên câu.") + reqIdInfo,
                    );
                }
                setIsSubmitting(false);
                return;
            }

            const selectedHutsInfo = hutList
                .filter((h) => selectedHutIds.includes(h.id))
                .map((h) => ({ name: h.name, areaName: h.area.name }));

            const ticketData: CreatedSessionTicket = {
                sessionId: resolvedSessionId,
                ticketCode: `#${resolvedSessionId.slice(0, 8).toUpperCase()}`,
                lakeName: lakeName || "HỒ CÂU KIM THÔNG",
                huts: selectedHutsInfo,
                packageName:
                    selectedPackage?.name ||
                    result.packageNameSnapshot ||
                    "Gói câu",
                packagePriceVnd:
                    (selectedPackage?.priceVnd ||
                        result.packagePriceVndSnapshot ||
                        0) * selectedHutIds.length,
                durationMinutes:
                    selectedPackage?.durationMinutes ||
                    result.packageDurationMinutesSnapshot ||
                    0,
                customerName:
                    selectedCustomer?.name ||
                    result.customer?.name ||
                    "Khách lẻ",
                customerPhone:
                    selectedCustomer?.phoneNormalized ||
                    result.customer?.phoneNormalized ||
                    null,
                startAt: resolvedStartTime,
                plannedEndAt: resolvedEndTime || null,
                cashierName: cashierName || "Thu ngân",
                note: note.trim() || null,
            };

            setCreatedTicket(ticketData);
            clearDraft();
            setIsSubmitting(false);
        } catch {
            setFormError("Đã có lỗi xảy ra khi mở phiên câu.");
            setIsSubmitting(false);
        }
    }

    async function handlePrintTicket(isReprint = false) {
        if (!createdTicket) return;
        setIsPrinting(true);
        setPrintSuccessNotice("Đang gửi lệnh in vé câu…");

        try {
            if (isConnected) {
                await printSessionTicket(
                    {
                        sessionId: createdTicket.sessionId,
                        ticketCode: createdTicket.ticketCode,
                        lakeName: createdTicket.lakeName,
                        huts: createdTicket.huts,
                        packageName: createdTicket.packageName,
                        packagePriceVnd: createdTicket.packagePriceVnd,
                        durationMinutes: createdTicket.durationMinutes,
                        customerName: createdTicket.customerName,
                        customerPhone: createdTicket.customerPhone,
                        startAt: createdTicket.startAt,
                        plannedEndAt: createdTicket.plannedEndAt,
                        cashierName: createdTicket.cashierName,
                        note: createdTicket.note,
                        isReprint,
                    },
                    { manual: true },
                );
            } else {
                window.print();
            }
        } catch {
            window.print();
        } finally {
            setIsPrinting(false);
            setPrintSuccessNotice(
                isReprint
                    ? "Đã gửi lệnh in lại!"
                    : "Đã in vé! Đang chuyển sang Đang câu…",
            );
            if (!isReprint) {
                setTimeout(() => {
                    router.push("/sessions");
                    router.refresh();
                }, 800);
            }
        }
    }

    function handleSkipAndNavigate() {
        router.push("/sessions");
        router.refresh();
    }

    // Group huts by area
    const hutsByArea = useMemo(() => {
        const map = new Map<
            string,
            { areaName: string; huts: SelectHut[] }
        >();
        for (const hut of hutList) {
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
    }, [hutList]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {reconnectNotice && (
                <InlineAlert type="info" message={reconnectNotice} />
            )}

            {isDraftRestored && (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span>📝</span> Đã khôi phục thông tin vé đang soạn dở
                    </span>
                    <button
                        type="button"
                        onClick={handleDiscardDraft}
                        className="text-xs font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                    >
                        Xóa nháp
                    </button>
                </div>
            )}

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
                                setShowQuickAddCustomer(false);
                                setNewCustomerName("");
                                setNewCustomerPhone("");
                                setCustomerError("");
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

                {hutList.length === 0 ? (
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

            {/* 4. GHI CHÚ VÉ CÂU */}
            <Card className="space-y-2 bg-[#FFFDF9] border-[#EAE4D7]">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    4. Ghi chú vé câu (tùy chọn)
                </label>
                <Input
                    placeholder="Ví dụ: Khách quen, mượn cần câu số 2, cọc trước…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </Card>

            {/* 5. TỔNG DỰ KIẾN */}
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

            {/* Offline Guard Alert */}
            {!isOnline && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2 shadow-2xs">
                    <span className="text-base leading-none">⚠️</span>
                    <div>
                        <span className="font-bold">Đang mất kết nối mạng:</span> Thông tin vé vẫn được lưu nháp an toàn trên máy. Nút &quot;Tạo vé và mở ô&quot; tạm thời bị khóa để chống mở trùng ô và sai lệch tiền theo quy định PRD.
                    </div>
                </div>
            )}

            {/* 6. SUBMIT BUTTON */}
            <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={isSubmitting}
                loadingText="Đang tạo vé…"
                disabled={isSubmitting || !isOnline || availableHuts.length === 0}
                className="w-full shadow-md font-bold"
            >
                {!isOnline ? "Mất mạng — Không thể mở vé" : "Tạo vé và mở ô"}
            </Button>

            {/* MODAL: VÉ CÂU (BILL TẠM TÍNH) */}
            {createdTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-sm rounded-2xl bg-[#FFFDF9] border border-[#D9D2C8] shadow-2xl p-4.5 flex flex-col max-h-[92vh] overflow-y-auto space-y-3.5">
                        {/* Ticket Header */}
                        <div className="text-center space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE2CE] text-[#8A5B00] text-xs font-bold uppercase tracking-wider">
                                <span>🎫</span>
                                <span>Vé câu (Tạm tính)</span>
                            </div>
                            <h2 className="text-base font-extrabold uppercase text-[#27231F] tracking-wide">
                                {createdTicket.lakeName}
                            </h2>
                            <p className="text-xs text-[#766F67] font-mono">
                                Mã vé: {createdTicket.ticketCode}
                            </p>
                        </div>

                        {/* Dashed divider */}
                        <div className="border-b border-dashed border-[#C8BBA5]" />

                        {/* Ticket Content */}
                        <div className="rounded-xl bg-[#F8F6F0] p-3.5 border border-[#EAE4D7] space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[#766F67]">Khách hàng:</span>
                                <div className="text-right">
                                    <span className="font-bold text-[#27231F]">
                                        {createdTicket.customerName}
                                    </span>
                                    {createdTicket.customerPhone && (
                                        <p className="text-[11px] font-mono text-[#766F67]">
                                            {createdTicket.customerPhone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-[#766F67]">Vị trí / Ô câu:</span>
                                <span className="font-bold text-[#27231F] text-right">
                                    {createdTicket.huts
                                        .map((h) =>
                                            h.areaName
                                                ? `${h.name} (${h.areaName})`
                                                : h.name,
                                        )
                                        .join(", ") || "Tự do"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-[#766F67]">Gói câu:</span>
                                <span className="font-semibold text-[#27231F] text-right">
                                    {createdTicket.packageName} (
                                    {createdTicket.durationMinutes} phút)
                                </span>
                            </div>

                            <div className="border-t border-dashed border-[#D9D2C8] my-1 pt-1.5 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-[#766F67]">Giờ vào:</span>
                                    <span className="font-semibold text-emerald-800 font-mono">
                                        {formatDateTime(createdTicket.startAt)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-[#766F67]">
                                        Giờ ra (dự kiến):
                                    </span>
                                    <span className="font-semibold text-rose-800 font-mono">
                                        {formatDateTime(
                                            createdTicket.plannedEndAt,
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-[#766F67]">Nhân viên:</span>
                                    <span className="font-medium text-[#27231F]">
                                        {createdTicket.cashierName}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-[#766F67]">Ghi chú:</span>
                                    <span className="font-medium text-[#27231F] text-right max-w-45 truncate">
                                        {createdTicket.note || "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-[#C8BBA5] pt-2 flex justify-between items-center">
                                <span className="text-xs font-bold text-[#27231F]">
                                    Tạm tính tiền gói:
                                </span>
                                <span className="text-base font-extrabold font-mono text-[#8A5B00] tabular-nums">
                                    {formatPrice(createdTicket.packagePriceVnd)}
                                </span>
                            </div>
                        </div>

                        {/* Footer message */}
                        <p className="text-[11px] text-center text-[#766F67] italic">
                            * Vui lòng giữ vé câu cho đến khi kết thúc ca câu.
                        </p>

                        {printSuccessNotice && (
                            <InlineAlert
                                type="success"
                                message={printSuccessNotice}
                            />
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-1">
                            <Button
                                type="button"
                                size="lg"
                                variant="primary"
                                isLoading={isPrinting}
                                loadingText="Đang in vé…"
                                onClick={() => handlePrintTicket(false)}
                                className="w-full shadow-md font-bold text-sm"
                            >
                                🖨️ In vé câu & Sang Đang câu
                            </Button>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrintTicket(true)}
                                    disabled={isPrinting}
                                    className="w-full text-xs"
                                >
                                    In thêm 1 bản
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSkipAndNavigate}
                                    disabled={isPrinting}
                                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100"
                                >
                                    Không in, chuyển tiếp ➔
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
