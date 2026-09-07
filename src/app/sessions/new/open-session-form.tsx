"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePrinter } from "@/lib/printing/use-printer";
import { useNetworkStatus } from "@/lib/network/use-network-status";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { useFishingSpots, useFishingPackages } from "@/hooks/use-fishing-catalog";
import {
    addQuickHutAction,
    deleteQuickHutAction,
    addQuickPackageAction,
    deleteQuickPackageAction,
    addQuickProductAction,
    addQuickFishTypeAction,
} from "../quick-create-actions";
import { RetailProduct } from "./retail-pos-form";

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

export interface SelectFishType {
    id: string;
    name: string;
    pricePerKg: number;
}

interface OpenSessionFormProps {
    customers: SelectCustomer[];
    packages: SelectPackage[];
    huts: SelectHut[];
    products?: RetailProduct[];
    fishTypes?: SelectFishType[];
    lakeName?: string;
    cashierName?: string;
}

function formatPrice(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

function formatDuration(minutes: number): string {
    if (!minutes || isNaN(minutes)) return "0 phút";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0 && remainingMinutes > 0) {
        return `${hours} giờ ${remainingMinutes} phút (${minutes}p)`;
    }
    if (hours > 0) {
        return `${hours} tiếng (${minutes}p)`;
    }
    return `${minutes} phút`;
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
    products: initialProducts = [],
    fishTypes: initialFishTypes = [],
    lakeName,
    cashierName,
}: OpenSessionFormProps) {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();
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

    // SWR / TanStack Query Caching with LocalStorage Persistence
    useFishingSpots(initialHuts as unknown as import("@/hooks/use-fishing-catalog").FishingHut[]);
    useFishingPackages(packages);

    // Package state
    const [packageList, setPackageList] = useState<SelectPackage[]>(packages);
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        packages[0]?.id ?? "",
    );

    // Hut state
    const [hutList, setHutList] = useState<SelectHut[]>(initialHuts);
    const [selectedHutIds, setSelectedHutIds] = useState<string[]>([]);

    // Product items state (Mục 5)
    const [productList, setProductList] = useState<RetailProduct[]>(initialProducts);
    const [selectedItems, setSelectedItems] = useState<
        Array<{ productId: string; name: string; priceVnd: number; quantity: number }>
    >([]);

    // Fish buyback state (Mục 6)
    const [fishTypeList, setFishTypeList] = useState<SelectFishType[]>(initialFishTypes);
    const [selectedFishTypeId, setSelectedFishTypeId] = useState<string>("");

    // General Form state
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // Bottom Sheet Quick-Add States
    const [isHutSheetOpen, setIsHutSheetOpen] = useState(false);
    const [isPackageSheetOpen, setIsPackageSheetOpen] = useState(false);
    const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
    const [isFishTypeSheetOpen, setIsFishTypeSheetOpen] = useState(false);

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

                if (draft.packageId && packageList.some((p) => p.id === draft.packageId)) {
                    setSelectedPackageId(draft.packageId);
                    restoredAny = true;
                }
                if (Array.isArray(draft.hutIds) && draft.hutIds.length > 0) {
                    const validIds = draft.hutIds.filter((id: string) =>
                        hutList.some((h) => h.id === id && h.currentSessionId === null),
                    );
                    if (validIds.length > 0) {
                        setSelectedHutIds(validIds);
                        restoredAny = true;
                    }
                }
                if (
                    draft.customerId &&
                    customerList.some((c) => c.id === draft.customerId)
                ) {
                    setSelectedCustomerId(draft.customerId);
                    restoredAny = true;
                }
                if (Array.isArray(draft.selectedItems) && draft.selectedItems.length > 0) {
                    setSelectedItems(draft.selectedItems);
                    restoredAny = true;
                }
                if (draft.selectedFishTypeId) {
                    setSelectedFishTypeId(draft.selectedFishTypeId);
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
    }, [packageList, hutList, customerList]);

    // Tự động lưu draft khi người dùng thay đổi dữ liệu
    useEffect(() => {
        try {
            if (
                selectedHutIds.length > 0 ||
                note ||
                selectedCustomerId ||
                selectedItems.length > 0 ||
                selectedFishTypeId
            ) {
                localStorage.setItem(
                    DRAFT_KEY,
                    JSON.stringify({
                        packageId: selectedPackageId,
                        hutIds: selectedHutIds,
                        customerId: selectedCustomerId,
                        selectedItems,
                        selectedFishTypeId,
                        note,
                    }),
                );
            }
        } catch {
            // bỏ qua
        }
    }, [
        selectedPackageId,
        selectedHutIds,
        selectedCustomerId,
        selectedItems,
        selectedFishTypeId,
        note,
    ]);

    // Keep local lists in sync when server revalidates or passes updated props
    const [prevInitialHuts, setPrevInitialHuts] = useState(initialHuts);
    if (prevInitialHuts !== initialHuts) {
        setPrevInitialHuts(initialHuts);
        if (initialHuts && initialHuts.length > 0) {
            setHutList((prev) => {
                const map = new Map<string, SelectHut>();
                for (const h of initialHuts) {
                    map.set(h.id, h);
                }
                for (const h of prev) {
                    if (!map.has(h.id)) {
                        map.set(h.id, h);
                    }
                }
                return Array.from(map.values());
            });
        }
    }

    const [prevPackages, setPrevPackages] = useState(packages);
    if (prevPackages !== packages) {
        setPrevPackages(packages);
        if (packages && packages.length > 0) {
            setPackageList(packages);
        }
    }

    const [prevInitialProducts, setPrevInitialProducts] = useState(initialProducts);
    if (prevInitialProducts !== initialProducts) {
        setPrevInitialProducts(initialProducts);
        if (initialProducts && initialProducts.length > 0) {
            setProductList(initialProducts);
        }
    }

    const [prevInitialFishTypes, setPrevInitialFishTypes] = useState(initialFishTypes);
    if (prevInitialFishTypes !== initialFishTypes) {
        setPrevInitialFishTypes(initialFishTypes);
        if (initialFishTypes && initialFishTypes.length > 0) {
            setFishTypeList(initialFishTypes);
        }
    }

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
        setSelectedItems([]);
        setSelectedFishTypeId("");
        setNote("");
    }

    const availableHuts = hutList.filter((h) => h.currentSessionId === null);

    const selectedCustomer = customerList.find(
        (c) => c.id === selectedCustomerId,
    );
    const selectedPackage = packageList.find((p) => p.id === selectedPackageId);

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

    async function handleDeleteHut(hutId: string, hutName: string) {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa/ẩn ô câu "${hutName}" khỏi danh mục không?`)) {
            return;
        }

        const deletePromise = (async () => {
            const res = await deleteQuickHutAction({ hutId });
            if (!res.ok) {
                if (res.redirectTo) {
                    router.push(res.redirectTo);
                }
                throw new Error(res.error || "Không thể xóa ô câu.");
            }
            setHutList((prev) => prev.filter((item) => item.id !== hutId));
            setSelectedHutIds((prev) => prev.filter((id) => id !== hutId));
            queryClient.invalidateQueries({ queryKey: ["fishing-catalog", "spots"] });
            return res.data;
        })();

        toast.promise(deletePromise, {
            loading: "Đang xử lý xóa ô câu...",
            success: `Đã xóa ô câu "${hutName}" khỏi danh mục!`,
            error: (err: unknown) => {
                const message = err instanceof Error ? err.message : "Thất bại: Có lỗi xảy ra!";
                return `Thất bại: ${message}`;
            },
        });
    }

    async function handleDeletePackage(packageId: string, packageName: string) {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa/ẩn gói câu "${packageName}" khỏi danh mục không?`)) {
            return;
        }

        const deletePromise = (async () => {
            const res = await deleteQuickPackageAction({ packageId });
            if (!res.ok) {
                if (res.redirectTo) {
                    router.push(res.redirectTo);
                }
                throw new Error(res.error || "Không thể xóa gói câu.");
            }
            setPackageList((prev) => prev.filter((item) => item.id !== packageId));
            if (selectedPackageId === packageId) {
                setSelectedPackageId("");
            }
            queryClient.invalidateQueries({ queryKey: ["fishing-catalog", "packages"] });
            return res.data;
        })();

        toast.promise(deletePromise, {
            loading: "Đang xử lý xóa gói câu...",
            success: `Đã xóa gói câu "${packageName}" khỏi danh mục!`,
            error: (err: unknown) => {
                const message = err instanceof Error ? err.message : "Thất bại: Có lỗi xảy ra!";
                return `Thất bại: ${message}`;
            },
        });
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
        const loadingId = toast.loading("Đang đồng bộ dữ liệu lên hệ thống...");

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
                    items:
                        selectedItems.length > 0
                            ? selectedItems.map((it) => ({
                                  productId: it.productId,
                                  quantity: it.quantity,
                              }))
                            : undefined,
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
                toast.dismiss(loadingId);
                if (response.status === 409 || result.code === "SPOT_OCCUPIED") {
                    const msg = result.error ?? "Ô câu đã có khách đang câu.";
                    setFormError(msg);
                    toast.error(msg);
                    await refreshHuts();
                } else {
                    const reqIdInfo = result.requestId
                        ? ` (Mã: ${result.requestId})`
                        : "";
                    const msg = (result.error ?? "Không thể mở phiên câu.") + reqIdInfo;
                    setFormError(msg);
                    toast.error(msg);
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
            toast.dismiss(loadingId);
            toast.success("Mở ca câu thành công!");
        } catch {
            toast.dismiss(loadingId);
            const msg = "Đã có lỗi xảy ra khi mở phiên câu.";
            setFormError(msg);
            toast.error(msg);
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
            const areaId = hut.area?.id || "default-area";
            const areaName = hut.area?.name || "Khu chính";
            const existing = map.get(areaId);
            if (existing) {
                existing.huts.push(hut);
            } else {
                map.set(areaId, {
                    areaName,
                    huts: [hut],
                });
            }
        }
        return map;
    }, [hutList]);

    return (
        <>
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
            <Card className="space-y-3 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#66716A]">
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
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                selectedCustomerId === null
                                    ? "bg-[#4F9D5A] text-white shadow-2xs"
                                    : "bg-white text-[#17201A] border border-[#E3E8E3] hover:bg-[#F7F9F5]"
                            }`}
                        >
                            Khách lẻ
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setShowQuickAddCustomer((prev) => !prev)
                            }
                            className="rounded-xl bg-[#E8F3E5] border border-[#D1E5CE] px-3 py-1.5 text-xs font-semibold text-[#246B38] hover:bg-[#DDF0D8] transition-colors cursor-pointer"
                        >
                            + Thêm khách
                        </button>
                    </div>
                </div>

                {/* Quick Add Form */}
                {showQuickAddCustomer && (
                    <div className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-3.5 space-y-3">
                        <p className="text-xs font-bold text-[#17201A]">
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
                    <div className="flex items-center justify-between rounded-xl border border-[#4F9D5A] bg-[#E8F3E5] p-3 shadow-2xs">
                        <div>
                            <p className="text-xs font-bold text-[#17201A]">
                                {selectedCustomer?.name}
                            </p>
                            {selectedCustomer?.phoneNormalized && (
                                <p className="text-xs text-[#66716A] font-mono">
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
                            <div className="divide-y divide-[#E3E8E3] rounded-xl border border-[#E3E8E3] bg-white overflow-hidden shadow-2xs">
                                {filteredCustomers.map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedCustomerId(c.id);
                                            setCustomerSearch("");
                                        }}
                                        className="cursor-pointer p-3 text-xs hover:bg-[#F7F9F5] flex items-center justify-between transition-colors"
                                    >
                                        <span className="font-semibold text-[#17201A]">
                                            {c.name}
                                        </span>
                                        <span className="text-[#66716A] font-mono">
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
            <Card className="space-y-3 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#66716A]">
                        2. Chọn ô câu <span className="text-rose-600">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#246B38]">
                            {selectedHutIds.length > 0
                                ? `Đã chọn ${selectedHutIds.length} ô`
                                : `Còn ${availableHuts.length} ô trống`}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsHutSheetOpen(true)}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#E8F3E5] px-2.5 py-1 text-xs font-bold text-[#246B38] border border-[#D1E5CE] hover:bg-[#DDF0D8] transition-colors cursor-pointer"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Thêm ô câu</span>
                        </button>
                    </div>
                </div>

                {/* Dải Chips hiển thị các ô đã chọn kèm nút Thùng rác xóa nhanh */}
                {selectedHutIds.length > 0 && (
                    <div className="rounded-xl border border-[#D1E5CE] bg-[#F7FAF6] p-2.5 space-y-1.5">
                        <div className="text-[11px] font-semibold text-[#66716A] uppercase tracking-wide">
                            Ô đang chọn ({selectedHutIds.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedHutIds.map((id) => {
                                const h = hutList.find((item) => item.id === id);
                                if (!h) return null;
                                return (
                                    <span
                                        key={id}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#4F9D5A] pl-2.5 pr-1.5 py-1 text-xs font-bold text-[#17201A] shadow-2xs"
                                    >
                                        <span>{h.name}</span>
                                        <button
                                            type="button"
                                            title="Bỏ chọn ô này khỏi vé"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedHutIds((prev) => prev.filter((item) => item !== id));
                                            }}
                                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            title="Xóa ô này khỏi danh mục (Chỉ Chủ hồ / Quản lý)"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteHut(h.id, h.name);
                                            }}
                                            className="text-rose-600 hover:text-rose-800 p-0.5 rounded cursor-pointer transition-colors"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {hutList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CCD5CA] p-4 text-center space-y-2">
                        <p className="text-xs text-[#66716A]">Chưa có ô câu nào trong hồ.</p>
                        <button
                            type="button"
                            onClick={() => setIsHutSheetOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F9D5A] px-3 py-1.5 text-xs font-bold text-white shadow-2xs cursor-pointer hover:bg-[#3E8047]"
                        >
                            + Thêm ô câu đầu tiên
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {Array.from(hutsByArea.entries()).map(
                            ([areaId, { areaName, huts: areaHuts }]) => (
                                <div key={areaId} className="space-y-1.5">
                                    <p className="text-[11px] font-semibold text-[#66716A] uppercase tracking-wide">
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
                                                    className={`h-12 min-w-12 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                                                        isSelected
                                                            ? "bg-[#4F9D5A] text-white border-2 border-[#246B38] shadow-xs"
                                                            : isOccupied
                                                              ? "bg-slate-100 text-slate-400 border border-[#E3E8E3] opacity-60 cursor-not-allowed"
                                                              : "bg-white border border-[#E3E8E3] text-[#17201A] hover:bg-[#F7F9F5]"
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
            <Card className="space-y-3 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#66716A]">
                        3. Gói câu / Ca câu <span className="text-rose-600">*</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsPackageSheetOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#E8F3E5] px-2.5 py-1 text-xs font-bold text-[#246B38] border border-[#D1E5CE] hover:bg-[#DDF0D8] transition-colors cursor-pointer"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Tạo nhanh gói câu</span>
                    </button>
                </div>

                {packageList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CCD5CA] p-4 text-center space-y-2">
                        <p className="text-xs text-[#66716A]">Chưa có gói câu nào được cấu hình.</p>
                        <button
                            type="button"
                            onClick={() => setIsPackageSheetOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F9D5A] px-3.5 py-2 text-xs font-bold text-white shadow-2xs cursor-pointer hover:bg-[#3E8047]"
                        >
                            + Tạo nhanh gói câu
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {packageList.map((p) => {
                            const isSelected = selectedPackageId === p.id;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPackageId(p.id)}
                                    className={`cursor-pointer rounded-2xl border p-3.5 flex items-center justify-between transition-colors ${
                                        isSelected
                                            ? "border-[#4F9D5A] bg-[#E8F3E5] shadow-xs"
                                            : "border-[#E3E8E3] bg-white hover:bg-[#F7F9F5]"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                isSelected
                                                    ? "border-[#4F9D5A] bg-[#4F9D5A]"
                                                    : "border-[#E3E8E3] bg-white"
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-[#17201A]">
                                                {p.name}
                                            </p>
                                            <p className="text-xs text-[#66716A]">
                                                Thời lượng: <span className="font-semibold text-[#17201A]">{formatDuration(p.durationMinutes)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold font-mono text-[#246B38] tabular-nums">
                                            {formatPrice(p.priceVnd)}
                                        </span>
                                        <button
                                            type="button"
                                            title="Xóa gói câu này khỏi danh mục (Chỉ Chủ hồ / Quản lý)"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePackage(p.id, p.name);
                                            }}
                                            className="p-1 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* 4. GHI CHÚ VÉ CÂU */}
            <Card className="space-y-2 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#66716A]">
                    4. Ghi chú vé câu (tùy chọn)
                </label>
                <Input
                    placeholder="Ví dụ: Khách quen, mượn cần câu số 2, cọc trước…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </Card>

            {/* 5. SẢN PHẨM / DỊCH VỤ DÙNG KÈM */}
            <Card className="space-y-3 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#66716A]">
                        5. Sản phẩm / Dịch vụ bán kèm
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsProductSheetOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#E8F3E5] px-2.5 py-1 text-xs font-bold text-[#246B38] border border-[#D1E5CE] hover:bg-[#DDF0D8] transition-colors cursor-pointer"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Thêm sản phẩm mới</span>
                    </button>
                </div>

                {productList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CCD5CA] p-3 text-center space-y-1.5">
                        <p className="text-xs text-[#66716A]">Chưa có sản phẩm / dịch vụ nào trong kho.</p>
                        <button
                            type="button"
                            onClick={() => setIsProductSheetOpen(true)}
                            className="text-xs font-bold text-[#246B38] underline cursor-pointer"
                        >
                            + Thêm sản phẩm đầu tiên (Nước suối, Mồi câu...)
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Selected items list */}
                        {selectedItems.length > 0 && (
                            <div className="divide-y divide-[#E3E8E3] rounded-xl border border-[#D1E5CE] bg-[#F7FAF6] overflow-hidden">
                                {selectedItems.map((item) => (
                                    <div key={item.productId} className="flex items-center justify-between p-2.5 text-xs">
                                        <div>
                                            <p className="font-bold text-[#17201A]">{item.name}</p>
                                            <p className="text-[11px] text-[#66716A] font-mono">
                                                {formatPrice(item.priceVnd)} x {item.quantity} ={" "}
                                                <span className="font-bold text-[#246B38]">
                                                    {formatPrice(item.priceVnd * item.quantity)}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedItems((prev) =>
                                                        prev
                                                            .map((it) =>
                                                                it.productId === item.productId
                                                                    ? { ...it, quantity: it.quantity - 1 }
                                                                    : it,
                                                            )
                                                            .filter((it) => it.quantity > 0),
                                                    );
                                                }}
                                                className="h-7 w-7 rounded-lg bg-white border border-[#CCD5CA] flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <span className="w-6 text-center font-bold font-mono">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedItems((prev) =>
                                                        prev.map((it) =>
                                                            it.productId === item.productId
                                                                ? { ...it, quantity: it.quantity + 1 }
                                                                : it,
                                                        ),
                                                    );
                                                }}
                                                className="h-7 w-7 rounded-lg bg-white border border-[#CCD5CA] flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                            >
                                                +
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedItems((prev) =>
                                                        prev.filter((it) => it.productId !== item.productId),
                                                    );
                                                }}
                                                className="p-1 text-rose-600 hover:text-rose-800 ml-1 cursor-pointer"
                                                title="Xóa món"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quick pick chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {productList.slice(0, 8).map((prod) => {
                                const isAdded = selectedItems.some((it) => it.productId === prod.id);
                                return (
                                    <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedItems((prev) => {
                                                const found = prev.find((it) => it.productId === prod.id);
                                                if (found) {
                                                    return prev.map((it) =>
                                                        it.productId === prod.id
                                                            ? { ...it, quantity: it.quantity + 1 }
                                                            : it,
                                                    );
                                                }
                                                return [
                                                    ...prev,
                                                    {
                                                        productId: prod.id,
                                                        name: prod.name,
                                                        priceVnd: prod.priceVnd,
                                                        quantity: 1,
                                                    },
                                                ];
                                            });
                                        }}
                                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                            isAdded
                                                ? "bg-[#E8F3E5] border-[#4F9D5A] text-[#246B38]"
                                                : "bg-white border-[#E3E8E3] text-[#17201A] hover:bg-[#F7F9F5]"
                                        }`}
                                    >
                                        <span>+ {prod.name}</span>
                                        <span className="font-mono text-[11px] opacity-75">
                                            {formatPrice(prod.priceVnd)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Card>

            {/* 6. GIÁ THU LẠI CÁ */}
            <Card className="space-y-3 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#66716A]">
                        6. Giá thu lại cá (Quy định hồ)
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsFishTypeSheetOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#E8F3E5] px-2.5 py-1 text-xs font-bold text-[#246B38] border border-[#D1E5CE] hover:bg-[#DDF0D8] transition-colors cursor-pointer"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Thêm quy định thu lại</span>
                    </button>
                </div>

                {fishTypeList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CCD5CA] p-3 text-center space-y-1.5">
                        <p className="text-xs text-[#66716A]">Hồ chưa thiết lập bảng giá thu lại cá.</p>
                        <button
                            type="button"
                            onClick={() => setIsFishTypeSheetOpen(true)}
                            className="text-xs font-bold text-[#246B38] underline cursor-pointer"
                        >
                            + Thiết lập giá thu lại (Cá Trắm, Chép, Rô phi...)
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {fishTypeList.map((ft) => {
                            const isSelected = selectedFishTypeId === ft.id;
                            return (
                                <div
                                    key={ft.id}
                                    onClick={() =>
                                        setSelectedFishTypeId((prev) => (prev === ft.id ? "" : ft.id))
                                    }
                                    className={`cursor-pointer rounded-xl border p-2.5 text-xs transition-all ${
                                        isSelected
                                            ? "border-[#4F9D5A] bg-[#E8F3E5] shadow-xs"
                                            : "border-[#E3E8E3] bg-white hover:bg-[#F7F9F5]"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-[#17201A]">{ft.name}</p>
                                        {isSelected && (
                                            <span className="text-[10px] font-bold text-[#246B38] bg-white px-1.5 py-0.5 rounded border border-[#D1E5CE]">
                                                Đã lưu
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-mono text-[#246B38] mt-1">
                                        Thu lại: {formatPrice(ft.pricePerKg)}/kg
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* 7. TỔNG DỰ KIẾN */}
            <Card className="space-y-2 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-[#66716A] flex items-center gap-1.5">
                        <svg
                            className="h-4 w-4 text-[#66716A]"
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
                    <span className="font-semibold text-[#17201A]">
                        Tự động bắt đầu ngay khi tạo vé
                    </span>
                </div>

                {selectedPackage && selectedHutIds.length > 0 && (
                    <div className="border-t border-[#E3E8E3] pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[#66716A]">
                                Tiền gói ({selectedHutIds.length} ô x {formatPrice(selectedPackage.priceVnd)}):
                            </span>
                            <span className="font-semibold font-mono text-[#17201A] tabular-nums">
                                {formatPrice(selectedPackage.priceVnd * selectedHutIds.length)}
                            </span>
                        </div>

                        {selectedItems.length > 0 && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[#66716A]">
                                    Sản phẩm kèm theo ({selectedItems.reduce((s, it) => s + it.quantity, 0)} món):
                                </span>
                                <span className="font-semibold font-mono text-[#17201A] tabular-nums">
                                    {formatPrice(
                                        selectedItems.reduce((s, it) => s + it.priceVnd * it.quantity, 0),
                                    )}
                                </span>
                            </div>
                        )}

                        <div className="border-t border-dashed border-[#E3E8E3] pt-1.5 flex items-center justify-between">
                            <span className="text-xs font-bold text-[#17201A]">
                                Tổng tạm tính:
                            </span>
                            <span className="text-base font-extrabold font-mono text-[#246B38] tabular-nums">
                                {formatPrice(
                                    selectedPackage.priceVnd * selectedHutIds.length +
                                        selectedItems.reduce((s, it) => s + it.priceVnd * it.quantity, 0),
                                )}
                            </span>
                        </div>
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

            {/* SUBMIT BUTTON */}
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
        </form>

            {/* ========================================================================= */}
            {/* BOTTOM SHEETS: TẠO TỨC THỜI DỮ LIỆU CHÉO (DYNAMIC FLOW)                   */}
            {/* ========================================================================= */}

            {/* 1. BOTTOM SHEET THÊM Ô CÂU */}
            <AddQuickHutSheet
                isOpen={isHutSheetOpen}
                onClose={() => setIsHutSheetOpen(false)}
                onCreated={(newHut) => {
                    const newHutItem: SelectHut = {
                        id: newHut.id,
                        name: newHut.name,
                        currentSessionId: null,
                        area: {
                            id: newHut.areaId || "default-area",
                            name: newHut.areaName || "Khu chính",
                        },
                    };
                    setHutList((prev) => {
                        if (prev.some((h) => h.id === newHut.id)) return prev;
                        return [...prev, newHutItem];
                    });
                    // Tự động chọn ô vừa tạo
                    setSelectedHutIds((prev) =>
                        prev.includes(newHut.id) ? prev : [...prev, newHut.id],
                    );
                    setFormError("");
                    setIsHutSheetOpen(false);
                }}
            />

            {/* 2. BOTTOM SHEET THÊM GÓI CÂU */}
            <AddQuickPackageSheet
                isOpen={isPackageSheetOpen}
                onClose={() => setIsPackageSheetOpen(false)}
                onCreated={(newPkg) => {
                    setPackageList((prev) => [...prev, newPkg]);
                    // Tự động chọn gói vừa tạo
                    setSelectedPackageId(newPkg.id);
                    setIsPackageSheetOpen(false);
                }}
            />

            {/* 3. BOTTOM SHEET THÊM SẢN PHẨM */}
            <AddQuickProductSheet
                isOpen={isProductSheetOpen}
                onClose={() => setIsProductSheetOpen(false)}
                onCreated={(newProd) => {
                    setProductList((prev) => [newProd, ...prev]);
                    // Tự động chọn sản phẩm này vào giỏ bán kèm với số lượng 1
                    setSelectedItems((prev) => [
                        ...prev,
                        {
                            productId: newProd.id,
                            name: newProd.name,
                            priceVnd: newProd.priceVnd,
                            quantity: 1,
                        },
                    ]);
                    setIsProductSheetOpen(false);
                }}
            />

            {/* 4. BOTTOM SHEET THÊM QUY ĐỊNH THU LẠI CÁ */}
            <AddQuickFishTypeSheet
                isOpen={isFishTypeSheetOpen}
                onClose={() => setIsFishTypeSheetOpen(false)}
                onCreated={(newFish) => {
                    setFishTypeList((prev) => [...prev, newFish]);
                    setSelectedFishTypeId(newFish.id);
                    setIsFishTypeSheetOpen(false);
                }}
            />

            {/* MODAL: VÉ CÂU (BILL TẠM TÍNH) */}
            {createdTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-sm rounded-3xl bg-white border border-[#E3E8E3] shadow-2xl p-5 flex flex-col max-h-[92vh] overflow-y-auto space-y-3.5">
                        {/* Ticket Header */}
                        <div className="text-center space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F3E5] text-[#246B38] text-xs font-bold uppercase tracking-wider">
                                <span>🎫</span>
                                <span>Vé câu (Tạm tính)</span>
                            </div>
                            <h2 className="text-base font-extrabold uppercase text-[#17201A] tracking-wide">
                                {createdTicket.lakeName}
                            </h2>
                            <p className="text-xs text-[#66716A] font-mono">
                                Mã vé: {createdTicket.ticketCode}
                            </p>
                        </div>

                        {/* Dashed divider */}
                        <div className="border-b border-dashed border-[#E3E8E3]" />

                        {/* Ticket Content */}
                        <div className="rounded-2xl bg-[#F7F9F5] p-3.5 border border-[#E3E8E3] space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[#66716A]">Khách hàng:</span>
                                <div className="text-right">
                                    <span className="font-bold text-[#17201A]">
                                        {createdTicket.customerName}
                                    </span>
                                    {createdTicket.customerPhone && (
                                        <p className="text-[11px] font-mono text-[#66716A]">
                                            {createdTicket.customerPhone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-[#66716A]">Vị trí / Ô câu:</span>
                                <span className="font-bold text-[#17201A] text-right">
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
                                <span className="text-[#66716A]">Gói câu:</span>
                                <span className="font-semibold text-[#17201A] text-right">
                                    {createdTicket.packageName} ({formatDuration(createdTicket.durationMinutes)})
                                </span>
                            </div>

                            <div className="border-t border-dashed border-[#E3E8E3] my-1 pt-1.5 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-[#66716A]">Giờ vào:</span>
                                    <span className="font-semibold text-[#246B38] font-mono">
                                        {formatDateTime(createdTicket.startAt)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-[#66716A]">
                                        Giờ ra (dự kiến):
                                    </span>
                                    <span className="font-semibold text-[#D9534F] font-mono">
                                        {formatDateTime(
                                            createdTicket.plannedEndAt,
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-[#66716A]">Nhân viên:</span>
                                    <span className="font-medium text-[#17201A]">
                                        {createdTicket.cashierName}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-[#66716A]">Ghi chú:</span>
                                    <span className="font-medium text-[#17201A] text-right max-w-45 truncate">
                                        {createdTicket.note || "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-[#E3E8E3] pt-2 flex justify-between items-center">
                                <span className="text-xs font-bold text-[#17201A]">
                                    Tạm tính tiền gói:
                                </span>
                                <span className="text-base font-extrabold font-mono text-[#246B38] tabular-nums">
                                    {formatPrice(createdTicket.packagePriceVnd)}
                                </span>
                            </div>
                        </div>

                        {/* Footer message */}
                        <p className="text-[11px] text-center text-[#66716A] italic">
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
        </>
    );
}

// -----------------------------------------------------------------------------
// 1. BOTTOM SHEET: THÊM Ô CÂU NHANH
// -----------------------------------------------------------------------------
interface AddQuickHutSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (hut: { id: string; name: string; areaId: string; areaName: string }) => void;
}

function AddQuickHutSheet({ isOpen, onClose, onCreated }: AddQuickHutSheetProps) {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        e.stopPropagation();
        const trimmed = name.trim();
        if (!trimmed || trimmed.length < 2) {
            setError("Tên ô câu tối thiểu 2 ký tự (Ví dụ: Ô 12, Ô VIP 1).");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const res = await addQuickHutAction({ name: trimmed });
            if (!res.ok || !res.data) {
                if (res.redirectTo) {
                    router.push(res.redirectTo);
                }
                const msg = res.error || "Không thể tạo ô câu mới.";
                setError(msg);
                toast.error(`Thất bại: ${msg}`);
                return;
            }

            toast.success(`Đã thêm nhanh ô câu "${res.data.name}" thành công!`);
            setName("");
            onCreated(res.data);
            onClose();
            queryClient.invalidateQueries({ queryKey: ["fishing-catalog", "spots"] });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Thất bại: Có lỗi xảy ra!";
            setError(message);
            toast.error(`Thất bại: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={() => {
                setError("");
                setName("");
                onClose();
            }}
            title="Thêm nhanh ô câu mới"
            description="Tạo và liên kết ô câu tức thời vào vé đang tạo mà không mất dữ liệu."
        >
            <form onSubmit={handleSave} className="space-y-4">
                {error && <InlineAlert type="error" message={error} />}

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#17201A]">
                        Tên ô câu / Vị trí <span className="text-rose-600">*</span>
                    </label>
                    <Input
                        autoFocus
                        placeholder="Ví dụ: Ô 08, Chòi 3, Ô VIP 2..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <p className="text-[11px] text-[#66716A]">
                        * Vị trí mới sẽ tự động đưa vào danh sách ô trống và chọn vào vé này.
                    </p>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        type="submit"
                        size="md"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang lưu…"
                        className="flex-1 font-bold shadow-xs"
                    >
                        Lưu nhanh
                    </Button>
                    <Button
                        type="button"
                        size="md"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </Button>
                </div>
            </form>
        </BottomSheet>
    );
}

// -----------------------------------------------------------------------------
// 2. BOTTOM SHEET: TẠO NHANH GÓI CÂU
// -----------------------------------------------------------------------------
interface AddQuickPackageSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (pkg: { id: string; name: string; durationMinutes: number; priceVnd: number }) => void;
}

function AddQuickPackageSheet({ isOpen, onClose, onCreated }: AddQuickPackageSheetProps) {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [durationMinutes, setDurationMinutes] = useState<number | string>(240);
    const [priceVnd, setPriceVnd] = useState<number | string>(200000);
    const [overtimeHourlyVnd, setOvertimeHourlyVnd] = useState<number | string>(50000);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const PRESET_DURATIONS = [60, 120, 180, 240, 300, 360, 480];

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        e.stopPropagation();
        const trimmed = name.trim();
        const m = Number(durationMinutes);
        const p = Number(priceVnd);
        const ot = overtimeHourlyVnd !== "" ? Number(overtimeHourlyVnd) : undefined;

        if (!trimmed || trimmed.length < 2) {
            setError("Tên ca câu tối thiểu 2 ký tự (Ví dụ: Ca 4 tiếng, Ca sáng).");
            return;
        }
        if (isNaN(m) || m < 15 || m > 1440) {
            setError("Thời lượng ca câu từ 15 phút đến 1440 phút (24 giờ).");
            return;
        }
        if (isNaN(p) || p < 0) {
            setError("Giá gói câu không được âm.");
            return;
        }
        if (ot !== undefined && (isNaN(ot) || ot < 0)) {
            setError("Phí phụ thu quá giờ không được âm.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const res = await addQuickPackageAction({
                name: trimmed,
                durationMinutes: m,
                priceVnd: p,
                overtimeHourlyVnd: ot,
            });

            if (!res.ok || !res.data) {
                if (res.redirectTo) {
                    router.push(res.redirectTo);
                }
                const msg = res.error || "Không thể tạo gói câu mới.";
                setError(msg);
                toast.error(`Thất bại: ${msg}`);
                return;
            }

            toast.success(`Đã tạo nhanh gói câu "${res.data.name}" và áp dụng vào vé!`);
            setName("");
            setDurationMinutes(240);
            setPriceVnd(200000);
            setOvertimeHourlyVnd(50000);
            onCreated(res.data);
            onClose();
            queryClient.invalidateQueries({ queryKey: ["fishing-catalog", "packages"] });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Thất bại: Có lỗi xảy ra!";
            setError(message);
            toast.error(`Thất bại: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleSelectPreset(preset: number) {
        setDurationMinutes(preset);
        if (!name || name.startsWith("Ca ")) {
            const hours = preset / 60;
            setName(hours >= 1 && preset % 60 === 0 ? `Ca ${hours} tiếng` : `Ca ${preset} phút`);
        }
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={() => {
                setError("");
                setName("");
                setDurationMinutes(240);
                setPriceVnd(200000);
                setOvertimeHourlyVnd(50000);
                onClose();
            }}
            title="Tạo nhanh gói câu / ca câu"
            description="Đồng bộ trực tiếp với danh mục hồ câu theo đơn vị phút chuẩn."
        >
            <form onSubmit={handleSave} className="space-y-4">
                {error && <InlineAlert type="error" message={error} />}

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#17201A]">
                        Tên gói câu <span className="text-rose-600">*</span>
                    </label>
                    <Input
                        autoFocus
                        placeholder="Ví dụ: Ca 4 tiếng, Ca 6 tiếng, Ca sáng..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                {/* THỜI LƯỢNG (PHÚT) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#17201A]">
                            Thời lượng (Phút) <span className="text-rose-600">*</span>
                        </label>
                        <span className="text-[11px] font-bold text-[#246B38] bg-[#E8F3E5] px-2 py-0.5 rounded-md">
                            {formatDuration(Number(durationMinutes) || 0)}
                        </span>
                    </div>

                    <Input
                        type="number"
                        step="15"
                        min="15"
                        max="1440"
                        placeholder="VD: 240 (tương đương 4 tiếng)"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        disabled={isSubmitting}
                    />

                    {/* Dải phím chọn nhanh thời lượng */}
                    <div className="space-y-1 pt-0.5">
                        <span className="text-[11px] text-[#66716A]">Chọn nhanh:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_DURATIONS.map((preset) => {
                                const isSelected = Number(durationMinutes) === preset;
                                return (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handleSelectPreset(preset)}
                                        disabled={isSubmitting}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                            isSelected
                                                ? "bg-[#246B38] text-white border-[#246B38] shadow-xs"
                                                : "bg-[#F7F9F5] text-[#17201A] border-[#E3E8E3] hover:bg-[#EEF3EB]"
                                        }`}
                                    >
                                        {preset >= 60 && preset % 60 === 0
                                            ? `${preset / 60}h (${preset}p)`
                                            : `${preset} phút`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ĐƠN GIÁ & PHỤ THU QUÁ GIỜ */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#17201A]">
                            Giá vé (VNĐ) <span className="text-rose-600">*</span>
                        </label>
                        <Input
                            type="number"
                            step="10000"
                            min="0"
                            value={priceVnd}
                            onChange={(e) => setPriceVnd(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#17201A]">
                            Phụ thu quá giờ (VNĐ/h)
                        </label>
                        <Input
                            type="number"
                            step="5000"
                            min="0"
                            placeholder="50,000"
                            value={overtimeHourlyVnd}
                            onChange={(e) => setOvertimeHourlyVnd(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        type="submit"
                        size="md"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang lưu…"
                        className="flex-1 font-bold shadow-xs"
                    >
                        Lưu nhanh & Áp dụng
                    </Button>
                    <Button
                        type="button"
                        size="md"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </Button>
                </div>
            </form>
        </BottomSheet>
    );
}

// -----------------------------------------------------------------------------
// 3. BOTTOM SHEET: THÊM SẢN PHẨM MỚI
// -----------------------------------------------------------------------------
interface AddQuickProductSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (prod: RetailProduct) => void;
}

function AddQuickProductSheet({ isOpen, onClose, onCreated }: AddQuickProductSheetProps) {
    const router = useRouter();
    const toast = useToast();
    const [name, setName] = useState("");
    const [priceVnd, setPriceVnd] = useState<number | string>(15000);
    const [initialStock, setInitialStock] = useState<number | string>(20);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        e.stopPropagation();
        const trimmed = name.trim();
        const p = Number(priceVnd);
        const s = Number(initialStock);

        if (!trimmed) {
            setError("Tên sản phẩm không được để trống.");
            return;
        }
        if (isNaN(p) || p < 0) {
            setError("Đơn giá bán không hợp lệ.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const res = await addQuickProductAction({
                name: trimmed,
                priceVnd: p,
                initialStock: isNaN(s) ? 0 : s,
            });

            if (res.ok && res.data) {
                setName("");
                toast.success(`Đã thêm nhanh sản phẩm "${res.data.name}" vào giỏ hàng!`);
                onCreated({
                    id: res.data.id,
                    name: res.data.name,
                    sku: res.data.sku,
                    priceVnd: res.data.priceVnd,
                    stock: res.data.stock,
                });
                onClose();
            } else {
                if (res.redirectTo) {
                    toast.error(res.error || "Yêu cầu đăng nhập lại");
                    router.push(res.redirectTo);
                    return;
                }
                const msg = res.error || "Không thể tạo sản phẩm.";
                setError(msg);
                toast.error(msg);
            }
        } catch {
            const msg = "Lỗi kết nối khi lưu sản phẩm.";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={() => {
                setError("");
                setName("");
                onClose();
            }}
            title="Thêm nhanh sản phẩm / dịch vụ"
            description="Tạo mặt hàng mới và tự động thêm ngay 1 món vào vé mở hồ."
        >
            <form onSubmit={handleSave} className="space-y-4">
                {error && <InlineAlert type="error" message={error} />}

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#17201A]">
                        Tên mặt hàng <span className="text-rose-600">*</span>
                    </label>
                    <Input
                        autoFocus
                        placeholder="Ví dụ: Nước suối Aquafina, Mồi ốc, Bánh mì..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#17201A]">
                            Đơn giá bán (VNĐ) <span className="text-rose-600">*</span>
                        </label>
                        <Input
                            type="number"
                            step="1000"
                            min="0"
                            value={priceVnd}
                            onChange={(e) => setPriceVnd(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#17201A]">
                            Nhập kho ban đầu
                        </label>
                        <Input
                            type="number"
                            min="0"
                            value={initialStock}
                            onChange={(e) => setInitialStock(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        type="submit"
                        size="md"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang lưu…"
                        className="flex-1 font-bold shadow-xs"
                    >
                        Lưu & Thêm vào vé
                    </Button>
                    <Button
                        type="button"
                        size="md"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </Button>
                </div>
            </form>
        </BottomSheet>
    );
}

// -----------------------------------------------------------------------------
// 4. BOTTOM SHEET: THÊM QUY ĐỊNH THU LẠI CÁ
// -----------------------------------------------------------------------------
interface AddQuickFishTypeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (fish: SelectFishType) => void;
}

function AddQuickFishTypeSheet({ isOpen, onClose, onCreated }: AddQuickFishTypeSheetProps) {
    const router = useRouter();
    const toast = useToast();
    const [name, setName] = useState("");
    const [pricePerKg, setPricePerKg] = useState<number | string>(35000);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        e.stopPropagation();
        const trimmed = name.trim();
        const p = Number(pricePerKg);

        if (!trimmed) {
            setError("Tên loại cá không được để trống.");
            return;
        }
        if (isNaN(p) || p <= 0) {
            setError("Đơn giá thu mua/kg phải lớn hơn 0đ.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const res = await addQuickFishTypeAction({
                name: trimmed,
                pricePerKg: p,
            });

            if (res.ok && res.data) {
                setName("");
                toast.success(`Đã thêm quy định thu lại cá "${res.data.name}"!`);
                onCreated(res.data);
                onClose();
            } else {
                if (res.redirectTo) {
                    toast.error(res.error || "Yêu cầu đăng nhập lại");
                    router.push(res.redirectTo);
                    return;
                }
                const msg = res.error || "Không thể tạo quy định thu lại cá.";
                setError(msg);
                toast.error(msg);
            }
        } catch {
            const msg = "Lỗi kết nối khi lưu quy định cá.";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={() => {
                setError("");
                setName("");
                onClose();
            }}
            title="Thêm quy định thu lại cá"
            description="Cấu hình loại cá và giá thu mua/kg theo chính sách hồ câu."
        >
            <form onSubmit={handleSave} className="space-y-4">
                {error && <InlineAlert type="error" message={error} />}

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#17201A]">
                        Tên loại cá <span className="text-rose-600">*</span>
                    </label>
                    <Input
                        autoFocus
                        placeholder="Ví dụ: Cá Trắm đen, Cá Chép giòn, Cá Rô phi..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#17201A]">
                        Giá thu lại (VNĐ / kg) <span className="text-rose-600">*</span>
                    </label>
                    <Input
                        type="number"
                        step="1000"
                        min="1000"
                        value={pricePerKg}
                        onChange={(e) => setPricePerKg(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        type="submit"
                        size="md"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang lưu…"
                        className="flex-1 font-bold shadow-xs"
                    >
                        Lưu quy định
                    </Button>
                    <Button
                        type="button"
                        size="md"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </Button>
                </div>
            </form>
        </BottomSheet>
    );
}
