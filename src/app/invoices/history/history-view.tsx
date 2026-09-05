"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InvoiceStatus, PaymentDirection } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { usePrinter } from "@/lib/printing/use-printer";
import { PaymentReceiptData } from "@/lib/printing/types";

export interface HistoryInvoice {
    id: string;
    lakeId: string;
    customerId: string | null;
    fishingSessionId: string | null;
    status: InvoiceStatus;
    totalAmountVnd: number;
    createdAt: string | Date;
    customer: {
        id: string;
        name: string;
        phoneNormalized: string | null;
    } | null;
    fishingSession: {
        id: string;
        startAt: string | Date;
        endedAt: string | Date | null;
        packageNameSnapshot: string;
        packagePriceVndSnapshot: number;
        hutLinks?: Array<{
            hut: {
                id: string;
                name: string;
                area: { id: string; name: string };
            };
        }>;
    } | null;
    lines: Array<{
        id: string;
        name: string;
        unitPrice: number;
        quantity: number | string | { toString(): string };
        totalVnd: number;
    }>;
    payments: Array<{
        id: string;
        amountVnd: number;
        method: string;
        direction: PaymentDirection;
        reversalOfId: string | null;
        createdAt: string | Date;
    }>;
}

export interface HistoryAuditEvent {
    id: string;
    lakeId: string;
    entityType: string;
    entityId: string;
    action: string;
    payload: string;
    createdBy: string;
    createdAt: string | Date;
}

interface HistoryViewProps {
    invoices: HistoryInvoice[];
    auditEvents: HistoryAuditEvent[];
    canManageInvoices?: boolean;
    canReversePayments?: boolean;
    lakeName: string;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function formatDateTime(date: Date | string | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(date));
}

function formatTime(date: Date | string | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(date));
}

function formatActor(createdBy: string): string {
    if (!createdBy || createdBy === "system" || createdBy === "automated_repair") {
        return "Hệ thống tự động";
    }
    if (createdBy.includes("@")) {
        return createdBy.split("@")[0];
    }
    if (createdBy.length === 36 && createdBy.includes("-")) {
        return `Nhân viên #${createdBy.slice(0, 8)}`;
    }
    return createdBy;
}

const AUDIT_FILTER_OPTIONS: Array<{
    key: string;
    label: string;
    actions: string[];
    activeClass: string;
}> = [
    { key: "ALL", label: "Tất cả", actions: [], activeClass: "bg-[#8A5A20] text-white" },
    { key: "SESSION_OPEN", label: "Mở phiên", actions: ["FISHING_SESSION_OPENED", "SESSION_CREATED", "SESSION_OPENED", "INVOICE_CREATED"], activeClass: "bg-blue-700 text-white" },
    { key: "SESSION_CLOSE", label: "Đóng phiên", actions: ["FISHING_SESSION_COMPLETED", "SESSION_COMPLETED", "FISHING_SESSION_CANCELLED"], activeClass: "bg-purple-700 text-white" },
    { key: "PAYMENT", label: "Thu tiền", actions: ["PAYMENT_RECORDED", "PAYMENT_COLLECTED"], activeClass: "bg-teal-700 text-white" },
    { key: "FISH_BUYBACK", label: "Thu cá", actions: ["FISH_BUYBACK_RECORDED", "FISH_BUYBACK_CREATED"], activeClass: "bg-rose-700 text-white" },
    { key: "RETAIL", label: "Bán lẻ", actions: ["RETAIL_SALE_COMPLETED", "RETAIL_INVOICE_CREATED"], activeClass: "bg-emerald-700 text-white" },
];

function getActionBadgeInfo(action: string): { label: string; colorClass: string } {
    switch (action) {
        case "RETAIL_SALE_COMPLETED":
        case "RETAIL_INVOICE_CREATED":
            return { label: "Bán lẻ", colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300" };
        case "SESSION_CREATED":
        case "SESSION_OPENED":
        case "FISHING_SESSION_OPENED":
            return { label: "Mở phiên", colorClass: "bg-blue-100 text-blue-800 border-blue-300" };
        case "SESSION_COMPLETED":
        case "FISHING_SESSION_COMPLETED":
            return { label: "Kết thúc phiên", colorClass: "bg-purple-100 text-purple-800 border-purple-300" };
        case "FISHING_SESSION_CANCELLED":
            return { label: "Hủy phiên", colorClass: "bg-red-100 text-red-800 border-red-300" };
        case "FISHING_SESSION_EXTENDED":
            return { label: "Gia hạn giờ", colorClass: "bg-cyan-100 text-cyan-800 border-cyan-300" };
        case "PAYMENT_RECORDED":
        case "PAYMENT_COLLECTED":
            return { label: "Thanh toán", colorClass: "bg-teal-100 text-teal-800 border-teal-300" };
        case "FISH_BUYBACK_RECORDED":
        case "FISH_BUYBACK_CREATED":
            return { label: "Thu cá", colorClass: "bg-rose-100 text-rose-800 border-rose-300" };
        case "INVOICE_CREATED":
            return { label: "Tạo hóa đơn", colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300" };
        case "INVOICE_LINE_ADDED":
            return { label: "Thêm món", colorClass: "bg-amber-100 text-amber-800 border-amber-300" };
        case "PRODUCT_CREATED":
            return { label: "Tạo SP", colorClass: "bg-indigo-100 text-indigo-800 border-indigo-300" };
        case "INVENTORY_ADJUSTED":
            return { label: "Kho hàng", colorClass: "bg-orange-100 text-orange-800 border-orange-300" };
        case "INVOICE_REPAIRED_FROM_SESSION":
        case "INVOICE_AUTO_REPAIRED_ON_COMPLETE":
            return { label: "Tự động bù hóa đơn", colorClass: "bg-amber-100 text-amber-800 border-amber-300" };
        default:
            return { label: action.replace(/_/g, " "), colorClass: "bg-stone-100 text-stone-800 border-stone-300" };
    }
}

function formatPayloadKey(key: string): string {
    const map: Record<string, string> = {
        fishingSessionId: "Phiên câu liên kết",
        sessionId: "Mã phiên",
        invoiceId: "Mã hóa đơn",
        status: "Trạng thái",
        totalAmountVnd: "Tổng tiền",
        paidAmountVnd: "Đã thanh toán",
        amountVnd: "Số tiền thu",
        refundVnd: "Số tiền thối lại",
        paymentMethod: "Phương thức",
        customerId: "Khách hàng",
        packageId: "Gói câu",
        hutIds: "Chòi / Ô câu",
        startAt: "Bắt đầu",
        plannedEndAt: "Dự kiến kết thúc",
        pricePerKg: "Đơn giá thu cá",
        weight: "Trọng lượng (kg)",
        fishTypeName: "Loại cá",
        note: "Ghi chú",
        reason: "Lý do",
        extraMinutes: "Phút gia hạn",
        priceVnd: "Phí phát sinh",
        name: "Tên mặt hàng",
        quantity: "Số lượng",
    };
    return map[key] || key;
}

function formatPayloadValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") {
        if (
            key.toLowerCase().includes("vnd") ||
            key.toLowerCase().includes("amount") ||
            key.toLowerCase().includes("price") ||
            key.toLowerCase().includes("refund")
        ) {
            return formatVnd(value);
        }
        return new Intl.NumberFormat("vi-VN").format(value);
    }
    if (typeof value === "string") {
        if (value === "DRAFT") return "Bản nháp (Đang câu)";
        if (value === "PAID") return "Đã thanh toán đủ";
        if (value === "VOID") return "Đã hủy";
        if (value === "CASH") return "Tiền mặt";
        if (value === "BANK_TRANSFER") return "Chuyển khoản";
        if (value.includes("T") && value.endsWith("Z") && !isNaN(Date.parse(value))) {
            return formatDateTime(value);
        }
        if (value.length === 36 && value.includes("-")) {
            return `#${value.slice(0, 8)}`;
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value
            .map((v) => (typeof v === "string" && v.length === 36 ? `#${v.slice(0, 8)}` : String(v)))
            .join(", ");
    }
    if (typeof value === "object") {
        return Object.entries(value as Record<string, unknown>)
            .map(([subK, subV]) => `${formatPayloadKey(subK)}: ${formatPayloadValue(subK, subV)}`)
            .join(" · ");
    }
    return String(value);
}

function getAuditHumanSummary(ev: HistoryAuditEvent, payload: Record<string, unknown> | null): string {
    if (!payload) return ev.payload ? ev.payload.slice(0, 90) : "Thao tác thành công";

    if (ev.action === "INVOICE_CREATED") {
        const total = typeof payload.totalAmountVnd === "number" ? formatVnd(payload.totalAmountVnd) : "";
        const sess = payload.fishingSessionId ? `#${String(payload.fishingSessionId).slice(0, 8)}` : "";
        return `Tạo hóa đơn nháp${sess ? ` cho phiên ${sess}` : ""}${total ? ` · Tạm tính: ${total}` : ""}`;
    }

    if (ev.action === "FISHING_SESSION_OPENED" || ev.action === "SESSION_OPENED" || ev.action === "SESSION_CREATED") {
        const start = payload.startAt ? formatTime(String(payload.startAt)) : "";
        return `Mở phiên câu mới${start ? ` lúc ${start}` : ""}`;
    }

    if (ev.action === "FISHING_SESSION_COMPLETED" || ev.action === "SESSION_COMPLETED") {
        const settlement = payload.settlement as Record<string, unknown> | undefined;
        if (settlement) {
            if (typeof settlement.refundVnd === "number" && settlement.refundVnd > 0) {
                return `Kết thúc phiên câu · Thối tiền cho khách: ${formatVnd(settlement.refundVnd)}`;
            }
            if (typeof settlement.amountVnd === "number" && settlement.amountVnd > 0) {
                return `Kết thúc phiên câu · Thu thêm của khách: ${formatVnd(settlement.amountVnd)}`;
            }
        }
        return "Kết thúc phiên câu thành công & giải phóng ô";
    }

    if (ev.action === "FISH_BUYBACK_RECORDED" || ev.action === "FISH_BUYBACK_CREATED") {
        const kg = payload.weight ? `${payload.weight} kg` : "";
        const total = typeof payload.totalVnd === "number" ? formatVnd(payload.totalVnd) : "";
        return `Thu mua cá từ cần thủ${kg ? ` (${kg})` : ""}${total ? ` · -${total}` : ""}`;
    }

    if (ev.action === "PAYMENT_RECORDED" || ev.action === "PAYMENT_COLLECTED") {
        const amt = typeof payload.amountVnd === "number" ? formatVnd(payload.amountVnd) : "";
        const method = payload.method === "CASH" ? "Tiền mặt" : payload.method === "BANK_TRANSFER" ? "Chuyển khoản" : "";
        return `Ghi nhận thanh toán${amt ? `: ${amt}` : ""}${method ? ` (${method})` : ""}`;
    }

    if (ev.action.includes("REPAIRED")) {
        return "Hệ thống tự động đồng bộ & tạo bù hóa đơn phiên câu";
    }

    // Default friendly summary
    const entries = Object.entries(payload).filter(([k]) => k !== "id" && k !== "lakeId");
    return entries
        .slice(0, 3)
        .map(([k, v]) => `${formatPayloadKey(k)}: ${formatPayloadValue(k, v)}`)
        .join(" · ");
}

export function HistoryView({
    invoices,
    auditEvents,
    lakeName,
}: HistoryViewProps) {
    const { isConnected, printPaymentReceipt } = usePrinter();

    const [activeTab, setActiveTab] = useState<"orders" | "audit">("orders");
    const [reprintingId, setReprintingId] = useState<string | null>(null);

    // Filter states for Orders
    const [orderSearch, setOrderSearch] = useState("");
    const [orderTypeFilter, setOrderTypeFilter] = useState<"ALL" | "TICKET" | "RETAIL">("ALL");
    const [orderStatusFilter, setOrderStatusFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");

    // Filter states for Audit
    const [auditSearch, setAuditSearch] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState<string>("ALL");
    const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({});

    // Filtered Invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const isTicket = inv.fishingSessionId !== null;
            if (orderTypeFilter === "TICKET" && !isTicket) return false;
            if (orderTypeFilter === "RETAIL" && isTicket) return false;

            const netPaid = inv.payments.reduce(
                (sum, p) =>
                    p.direction === PaymentDirection.IN
                        ? sum + p.amountVnd
                        : sum - p.amountVnd,
                0,
            );
            const paidAmount = Math.max(0, netPaid);
            const remaining = Math.max(0, inv.totalAmountVnd - paidAmount);

            if (orderStatusFilter === "PAID" && (inv.status !== InvoiceStatus.PAID && remaining > 0)) {
                return false;
            }
            if (orderStatusFilter === "UNPAID" && (inv.status === InvoiceStatus.PAID || remaining <= 0)) {
                return false;
            }

            if (orderSearch.trim()) {
                const q = orderSearch.toLowerCase().trim();
                const matchId = inv.id.toLowerCase().includes(q);
                const matchCustomer = inv.customer?.name.toLowerCase().includes(q) || false;
                const matchPhone = inv.customer?.phoneNormalized?.includes(q) || false;
                const matchHut =
                    inv.fishingSession?.hutLinks?.some((hl) =>
                        hl.hut.name.toLowerCase().includes(q),
                    ) || false;
                if (!matchId && !matchCustomer && !matchPhone && !matchHut) {
                    return false;
                }
            }

            return true;
        });
    }, [invoices, orderSearch, orderTypeFilter, orderStatusFilter]);

    // Filtered Audit Events
    const filteredAuditEvents = useMemo(() => {
        return auditEvents.filter((ev) => {
            if (auditActionFilter !== "ALL") {
                const selectedOpt = AUDIT_FILTER_OPTIONS.find((opt) => opt.key === auditActionFilter);
                if (selectedOpt && selectedOpt.actions.length > 0) {
                    if (!selectedOpt.actions.includes(ev.action)) {
                        return false;
                    }
                } else if (ev.action !== auditActionFilter) {
                    return false;
                }
            }

            if (auditSearch.trim()) {
                const q = auditSearch.toLowerCase().trim();
                const matchAction = ev.action.toLowerCase().includes(q);
                const matchEntity = ev.entityType.toLowerCase().includes(q);
                const matchEntityId = ev.entityId.toLowerCase().includes(q);
                const matchUser = ev.createdBy.toLowerCase().includes(q);
                const matchPayload = ev.payload.toLowerCase().includes(q);
                if (
                    !matchAction &&
                    !matchEntity &&
                    !matchEntityId &&
                    !matchUser &&
                    !matchPayload
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [auditEvents, auditSearch, auditActionFilter]);

    // Reprint handler for invoices
    async function handleReprint(invoice: HistoryInvoice) {
        setReprintingId(invoice.id);

        const netPaid = invoice.payments.reduce(
            (sum, p) =>
                p.direction === PaymentDirection.IN
                    ? sum + p.amountVnd
                    : sum - p.amountVnd,
            0,
        );
        const paidAmount = Math.max(0, netPaid);
        const remaining = Math.max(0, invoice.totalAmountVnd - paidAmount);

        const hutNames =
            invoice.fishingSession?.hutLinks
                ?.map((hl) => hl.hut.name)
                .join(", ") || (invoice.fishingSessionId ? "Chòi câu" : "Bán lẻ");

        const paymentMethods = Array.from(
            new Set(invoice.payments.map((p) => (p.method === "CASH" ? "Tiền mặt" : "Chuyển khoản"))),
        ).join(", ") || "Chưa xác định";

        const receiptData: PaymentReceiptData = {
            invoiceId: invoice.id,
            sessionId: invoice.fishingSessionId || undefined,
            lakeName: lakeName,
            customerName: invoice.customer?.name || "Khách lẻ",
            customerPhone: invoice.customer?.phoneNormalized || null,
            hutNames,
            packageName:
                invoice.fishingSession?.packageNameSnapshot ||
                (invoice.fishingSessionId ? "Vé câu" : "Đơn hàng bán lẻ"),
            lines: invoice.lines.map((l) => ({
                name: l.name,
                quantity: Number(l.quantity),
                unitPrice: l.unitPrice,
                totalVnd: l.totalVnd,
            })),
            totalAmountVnd: invoice.totalAmountVnd,
            paidAmountVnd: paidAmount,
            paymentAmountVnd: paidAmount,
            remainingVnd: remaining,
            refundAmountVnd: 0,
            paymentMethod: paymentMethods,
            paymentTime: invoice.createdAt,
            isReprint: true,
        };

        try {
            if (isConnected) {
                await printPaymentReceipt(receiptData, {
                    jobId: `reprint-${invoice.id}`,
                    manual: true,
                });
            } else {
                window.print();
            }
        } catch {
            window.print();
        } finally {
            setReprintingId(null);
        }
    }

    function toggleAuditExpand(id: string) {
        setExpandedAuditIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }

    return (
        <div className="space-y-4">
            {/* Top Navigation Bar: Dual Tabs */}
            <div className="rounded-2xl bg-[#EAE4D9] p-1.5 flex gap-1 shadow-inner">
                <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === "orders"
                            ? "bg-white text-[#27231F] shadow-sm"
                            : "text-[#766F67] hover:text-[#27231F]"
                    }`}
                >
                    <svg
                        className="h-4 w-4 text-[#8A5A20]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                        />
                    </svg>
                    Lịch sử đơn hàng ({invoices.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("audit")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === "audit"
                            ? "bg-white text-[#27231F] shadow-sm"
                            : "text-[#766F67] hover:text-[#27231F]"
                    }`}
                >
                    <svg
                        className="h-4 w-4 text-[#8A5A20]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                    </svg>
                    Nhật ký hoạt động ({auditEvents.length})
                </button>
            </div>

            {/* TAB 1: LỊCH SỬ ĐƠN HÀNG */}
            {activeTab === "orders" && (
                <div className="space-y-4">
                    {/* Filter Toolbar */}
                    <Card className="p-3 space-y-2.5">
                        <Input
                            placeholder="Tìm kiếm mã HĐ, khách hàng, số điện thoại, ô chòi..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Type filter pills */}
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setOrderTypeFilter("ALL")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                        orderTypeFilter === "ALL"
                                            ? "bg-[#8A5A20] text-white"
                                            : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                                    }`}
                                >
                                    Tất cả
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderTypeFilter("TICKET")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                        orderTypeFilter === "TICKET"
                                            ? "bg-[#8A5A20] text-white"
                                            : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                                    }`}
                                >
                                    Vé câu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderTypeFilter("RETAIL")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                        orderTypeFilter === "RETAIL"
                                            ? "bg-[#8A5A20] text-white"
                                            : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                                    }`}
                                >
                                    Bán lẻ
                                </button>
                            </div>

                            {/* Status filter pills */}
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setOrderStatusFilter("ALL")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        orderStatusFilter === "ALL"
                                            ? "bg-[#27231F] text-white"
                                            : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                                    }`}
                                >
                                    Tất cả TT
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderStatusFilter("PAID")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        orderStatusFilter === "PAID"
                                            ? "bg-emerald-700 text-white"
                                            : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                                    }`}
                                >
                                    Đã xong
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderStatusFilter("UNPAID")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        orderStatusFilter === "UNPAID"
                                            ? "bg-amber-700 text-white"
                                            : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                                    }`}
                                >
                                    Còn thiếu
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* Orders List */}
                    {filteredInvoices.length === 0 ? (
                        <Card className="p-8 text-center text-xs text-[#766F67]">
                            Không tìm thấy hóa đơn hoặc đơn bán lẻ nào phù hợp.
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {filteredInvoices.map((invoice) => {
                                const isTicket = invoice.fishingSessionId !== null;
                                const netPaid = invoice.payments.reduce(
                                    (sum, p) =>
                                        p.direction === PaymentDirection.IN
                                            ? sum + p.amountVnd
                                            : sum - p.amountVnd,
                                    0,
                                );
                                const paidAmount = Math.max(0, netPaid);
                                const remaining = Math.max(
                                    0,
                                    invoice.totalAmountVnd - paidAmount,
                                );

                                return (
                                    <Card
                                        key={invoice.id}
                                        className="p-4 space-y-3 hover:border-[#8A5A20] transition-colors"
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            isTicket
                                                                ? "bg-blue-100 text-blue-800"
                                                                : "bg-emerald-100 text-emerald-800"
                                                        }`}
                                                    >
                                                        {isTicket ? "Vé câu" : "Bán lẻ"}
                                                    </span>
                                                    <Link
                                                        href={`/invoices/${invoice.id}`}
                                                        className="text-xs font-bold text-[#8A5A20] hover:underline"
                                                    >
                                                        HĐ #{invoice.id.slice(0, 8)}
                                                    </Link>
                                                </div>

                                                <p className="text-sm font-bold text-[#27231F] mt-1">
                                                    {invoice.customer?.name ?? (isTicket ? "Khách vãng lai" : "Khách lẻ")}
                                                </p>
                                                {invoice.customer?.phoneNormalized && (
                                                    <p className="text-[11px] text-[#766F67] font-mono">
                                                        {invoice.customer.phoneNormalized}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-right space-y-1">
                                                <InvoiceStatusBadge status={invoice.status} />
                                                <p className="text-[10px] text-[#766F67]">
                                                    {formatTime(invoice.createdAt)} · {formatDateTime(invoice.createdAt).split(" ")[1]}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Content details */}
                                        <div className="rounded-xl bg-[#F4F2EE] p-3 text-xs space-y-1.5">
                                            {isTicket ? (
                                                <div className="flex justify-between text-[#766F67]">
                                                    <span>Gói / Ô chòi:</span>
                                                    <span className="font-bold text-[#27231F]">
                                                        {invoice.fishingSession?.packageNameSnapshot} (
                                                        {invoice.fishingSession?.hutLinks
                                                            ?.map((hl) => hl.hut.name)
                                                            .join(", ") || "—"}
                                                        )
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between text-[#766F67]">
                                                    <span>Mặt hàng:</span>
                                                    <span className="font-medium text-[#27231F] max-w-50 truncate text-right">
                                                        {invoice.lines.map((l) => `${l.name} x${Number(l.quantity)}`).join(", ") || "—"}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between">
                                                <span className="text-[#766F67]">Tổng tiền:</span>
                                                <span className="font-bold text-[#27231F] tabular-nums">
                                                    {formatVnd(invoice.totalAmountVnd)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#766F67]">Đã thu:</span>
                                                <span className="font-bold text-emerald-700 tabular-nums">
                                                    {formatVnd(paidAmount)}
                                                </span>
                                            </div>
                                            {remaining > 0 && (
                                                <div className="flex justify-between border-t border-[#D9D2C8] pt-1 font-bold">
                                                    <span className="text-[#9A4C16]">Còn thiếu:</span>
                                                    <span className="text-[#9A4C16] tabular-nums">
                                                        {formatVnd(remaining)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    isLoading={reprintingId === invoice.id}
                                                    onClick={() => handleReprint(invoice)}
                                                    className="h-8 px-2.5 text-xs font-bold text-[#8A5A20] border-[#8A5A20]/40"
                                                    icon={
                                                        <svg
                                                            className="h-3.5 w-3.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            strokeWidth={2}
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"
                                                            />
                                                        </svg>
                                                    }
                                                >
                                                    In lại bill
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/invoices/${invoice.id}`}
                                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white px-3 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] transition-colors"
                                                >
                                                    Chi tiết
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: NHẬT KÝ HOẠT ĐỘNG (AUDIT TRAIL) */}
            {activeTab === "audit" && (
                <div className="space-y-4">
                    {/* Filter toolbar */}
                    <Card className="p-3 space-y-2.5">
                        <Input
                            placeholder="Tìm hành động, người dùng, mã tham chiếu..."
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                        />

                        <div className="flex flex-wrap gap-1">
                            {AUDIT_FILTER_OPTIONS.map((opt) => {
                                const isSelected = auditActionFilter === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setAuditActionFilter(opt.key)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                            isSelected
                                                ? opt.activeClass
                                                : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Audit List */}
                    {filteredAuditEvents.length === 0 ? (
                        <Card className="p-8 text-center text-xs text-[#766F67]">
                            Không có nhật ký hoạt động nào.
                        </Card>
                    ) : (
                        <div className="space-y-2.5">
                            {filteredAuditEvents.map((ev) => {
                                const badgeInfo = getActionBadgeInfo(ev.action);
                                const isExpanded = !!expandedAuditIds[ev.id];

                                let parsedPayload: Record<string, unknown> | null = null;
                                try {
                                    parsedPayload = JSON.parse(ev.payload);
                                } catch {
                                    parsedPayload = null;
                                }

                                return (
                                    <Card
                                        key={ev.id}
                                        className="p-4 space-y-2.5 overflow-hidden hover:border-[#8A5A20] transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badgeInfo.colorClass}`}
                                                    >
                                                        {badgeInfo.label}
                                                    </span>
                                                    <span className="text-xs font-mono font-bold text-[#8A5A20]">
                                                        {ev.entityType} #{ev.entityId.slice(0, 8)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#27231F] break-words">
                                                    Thực hiện bởi:{" "}
                                                    <span className="font-semibold text-[#8A5A20]">
                                                        {formatActor(ev.createdBy)}
                                                    </span>
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-[11px] text-[#766F67] font-mono">
                                                    {formatDateTime(ev.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payload summary or toggle */}
                                        <div className="rounded-xl bg-[#F4F2EE] p-2.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[#766F67]">
                                                    Chi tiết tác vụ:
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAuditExpand(ev.id)}
                                                    className="text-[11px] font-semibold text-[#8A5A20] hover:underline cursor-pointer"
                                                >
                                                    {isExpanded ? "Thu gọn" : "Xem thêm"}
                                                </button>
                                            </div>

                                            {isExpanded ? (
                                                <div className="mt-2 space-y-2">
                                                    {ev.action.includes("REPAIRED") && (
                                                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                                                            💡 <b>Hệ thống tự động:</b> Đã tạo bù hóa đơn nháp thành công cho phiên câu ô 01 lúc trước để đảm bảo số liệu thu chi chính xác.
                                                        </div>
                                                    )}

                                                    {/* Structured Key-Value Grid */}
                                                    {parsedPayload && Object.keys(parsedPayload).length > 0 ? (
                                                        <div className="rounded-lg bg-white border border-[#D9D2C8] p-2.5 space-y-1 text-[11px]">
                                                            {Object.entries(parsedPayload).map(([k, v]) => (
                                                                <div
                                                                    key={k}
                                                                    className="flex items-start justify-between gap-2 py-1 border-b border-[#F4F2EE] last:border-none"
                                                                >
                                                                    <span className="text-slate-500 font-medium shrink-0">
                                                                        {formatPayloadKey(k)}:
                                                                    </span>
                                                                    <span className="font-mono font-semibold text-slate-800 text-right break-words">
                                                                        {formatPayloadValue(k, v)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <pre className="p-2 rounded-lg bg-white border border-[#D9D2C8] text-[11px] font-mono text-[#27231F] overflow-x-auto whitespace-pre-wrap">
                                                            {ev.payload}
                                                        </pre>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-[#27231F] truncate mt-1">
                                                    {getAuditHumanSummary(ev, parsedPayload)}
                                                </p>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
