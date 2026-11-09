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
    lakeId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    payload: string;
    createdBy: string;
    createdAt: string | Date;
}

export interface InvoiceLineDetail {
    name: string;
    quantity: number;
    unitPrice?: number;
    totalVnd?: number;
}

export interface LookupMaps {
    usersMap?: Record<string, string>;
    sessionsMap?: Record<string, { customerName: string; huts: string; packageName?: string }>;
    packagesMap?: Record<string, string>;
    hutsMap?: Record<string, string>;
    customersMap?: Record<string, string>;
    productsMap?: Record<string, string>;
    invoicesMap?: Record<string, { customerName?: string; linesSummary: string; lines: InvoiceLineDetail[] }>;
}

interface HistoryViewProps {
    invoices: HistoryInvoice[];
    auditEvents: HistoryAuditEvent[];
    usersMap?: Record<string, string>;
    sessionsMap?: Record<string, { customerName: string; huts: string; packageName?: string }>;
    packagesMap?: Record<string, string>;
    hutsMap?: Record<string, string>;
    customersMap?: Record<string, string>;
    productsMap?: Record<string, string>;
    invoicesMap?: Record<string, { customerName?: string; linesSummary: string; lines: InvoiceLineDetail[] }>;
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

function formatActor(
    createdBy: string,
    payload?: Record<string, unknown> | null,
    usersMap?: Record<string, string>,
): string {
    if (!createdBy || createdBy === "system" || createdBy === "automated_repair") {
        return "Hệ thống tự động";
    }

    // 1. Tra cứu theo danh bạ người dùng hồ câu
    if (usersMap && usersMap[createdBy]) {
        return usersMap[createdBy];
    }

    // 2. Tên nhân viên/quản lý được lưu trong payload audit
    const actor = payload?.actor as Record<string, unknown> | undefined;
    if (typeof actor?.name === "string" && actor.name.trim()) {
        const role = typeof actor.role === "string" ? actor.role : "";
        const roleLabel =
            role === "OWNER"
                ? "Chủ hồ"
                : role === "MANAGER"
                ? "Quản lý"
                : role === "STAFF"
                ? "Nhân viên"
                : "";
        return roleLabel ? `${actor.name.trim()} (${roleLabel})` : actor.name.trim();
    }

    // 3. Fallbacks thân thiện không hiển thị chuỗi hex UUID
    if (createdBy.includes("@")) {
        return createdBy.split("@")[0];
    }
    return "Nhân viên trực ca";
}

function formatEntityTitle(
    ev: HistoryAuditEvent,
    payload: Record<string, unknown> | null,
    maps: LookupMaps,
): string {
    if (ev.entityType === "FishingSession") {
        const sess = maps.sessionsMap?.[ev.entityId];
        let hutPart = "";
        if (sess?.huts) {
            hutPart = sess.huts.startsWith("Chòi") || sess.huts.startsWith("Ô") ? sess.huts : `Chòi ${sess.huts}`;
        } else if (payload?.hutIds && Array.isArray(payload.hutIds)) {
            const hutNames = (payload.hutIds as string[])
                .map((hid) => maps.hutsMap?.[hid] || hid.slice(0, 4))
                .join(", ");
            hutPart = hutNames.startsWith("Chòi") || hutNames.startsWith("Ô") ? hutNames : `Chòi ${hutNames}`;
        }

        let custPart = "";
        if (sess?.customerName && sess.customerName !== "Khách vãng lai") {
            custPart = ` - ${sess.customerName}`;
        } else if (typeof payload?.customerId === "string" && maps.customersMap?.[payload.customerId]) {
            custPart = ` - ${maps.customersMap[payload.customerId]}`;
        }

        const pkgPart = sess?.packageName
            ? ` (${sess.packageName})`
            : typeof payload?.packageId === "string" && maps.packagesMap?.[payload.packageId]
            ? ` (${maps.packagesMap[payload.packageId]})`
            : "";

        if (hutPart || custPart) {
            return `Phiên câu: ${hutPart || "Ô câu"}${custPart}${pkgPart}`;
        }
        return `Phiên câu cá${pkgPart}`;
    }

    if (ev.entityType === "InventoryMovement") {
        const prodName =
            (typeof payload?.productId === "string" && maps.productsMap?.[payload.productId]) ||
            (typeof payload?.productName === "string" && payload.productName) ||
            "";
        const typeStr = payload?.type === "OUT" ? "Xuất kho" : payload?.type === "IN" ? "Nhập kho" : "Kho hàng";
        return prodName ? `${typeStr}: ${prodName}` : "Biến động kho hàng";
    }

    if (ev.entityType === "Invoice") {
        const sess = typeof payload?.fishingSessionId === "string" ? maps.sessionsMap?.[payload.fishingSessionId] : null;
        if (sess?.customerName && sess.customerName !== "Khách vãng lai") {
            return `Hóa đơn: ${sess.customerName}${sess.huts ? ` (${sess.huts})` : ""}`;
        }
        return "Hóa đơn thanh toán";
    }

    if (ev.entityType === "FishBuyback") {
        const fish = typeof payload?.fishTypeName === "string" ? payload.fishTypeName : "";
        return `Thu mua cá${fish ? `: ${fish}` : ""}`;
    }

    if (ev.entityType === "Product") {
        const name = typeof payload?.name === "string" ? payload.name : "";
        return `Sản phẩm${name ? `: ${name}` : ""}`;
    }

    if (ev.entityType === "Customer") {
        const name = typeof payload?.name === "string" ? payload.name : "";
        return `Khách hàng${name ? `: ${name}` : ""}`;
    }

    if (ev.entityType === "Expense") {
        return "Phiếu chi tiền";
    }

    if (ev.entityType === "Payment") {
        return "Giao dịch thanh toán";
    }

    if (ev.entityType === "User" || ev.entityType === "Membership") {
        return "Tài khoản & Phân quyền nhân sự";
    }

    if (ev.entityType === "LakeRolePermissions") {
        return "Cấu hình bảng phân quyền hồ câu";
    }

    if (ev.entityType === "Shift") {
        return "Ca trực & Bàn giao quỹ";
    }

    return ev.entityType;
}

const AUDIT_FILTER_OPTIONS: Array<{
    key: string;
    label: string;
    actions: string[];
    activeClass: string;
}> = [
    { key: "ALL", label: "Tất cả", actions: [], activeClass: "bg-[#2C4C3B] text-white border-[#2C4C3B]" },
    { key: "SESSION_OPEN", label: "Mở phiên", actions: ["FISHING_SESSION_OPENED", "SESSION_CREATED", "SESSION_OPENED", "INVOICE_CREATED"], activeClass: "bg-[#2C4C3B] text-white border-[#2C4C3B]" },
    { key: "SESSION_CLOSE", label: "Đóng phiên", actions: ["FISHING_SESSION_COMPLETED", "SESSION_COMPLETED", "FISHING_SESSION_CANCELLED"], activeClass: "bg-[#2C4C3B] text-white border-[#2C4C3B]" },
    { key: "PAYMENT", label: "Thu tiền", actions: ["PAYMENT_RECORDED", "PAYMENT_COLLECTED"], activeClass: "bg-[#2C4C3B] text-white border-[#2C4C3B]" },
    { key: "FISH_BUYBACK", label: "Thu cá", actions: ["FISH_BUYBACK_RECORDED", "FISH_BUYBACK_CREATED"], activeClass: "bg-[#2C4C3B] text-white border-[#2C4C3B]" },
    { key: "RETAIL", label: "Bán lẻ", actions: ["RETAIL_SALE_COMPLETED", "RETAIL_INVOICE_CREATED"], activeClass: "bg-[#2C4C3B] text-white border-[#2C4C3B]" },
];

function getActionBadgeInfo(action: string): { label: string; colorClass: string } {
    switch (action) {
        case "RETAIL_SALE_COMPLETED":
        case "RETAIL_INVOICE_CREATED":
            return { label: "Bán lẻ", colorClass: "bg-[#F2F2F0] text-[#1A1A1A] border-[#CCCCCC]" };
        case "SESSION_CREATED":
        case "SESSION_OPENED":
        case "FISHING_SESSION_OPENED":
            return { label: "Mở phiên", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "SESSION_COMPLETED":
        case "FISHING_SESSION_COMPLETED":
            return { label: "Kết thúc", colorClass: "bg-[#F2F2F0] text-[#555555] border-[#CCCCCC]" };
        case "FISHING_SESSION_CANCELLED":
            return { label: "Hủy phiên", colorClass: "bg-[#FFF1F0] text-[#A8071A] border-[#FFA39E]" };
        case "FISHING_SESSION_EXTENDED":
            return { label: "Gia hạn", colorClass: "bg-[#F2F2F0] text-[#1A1A1A] border-[#CCCCCC]" };
        case "PAYMENT_RECORDED":
        case "PAYMENT_COLLECTED":
            return { label: "Thanh toán", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "FISH_BUYBACK_RECORDED":
        case "FISH_BUYBACK_CREATED":
            return { label: "Thu cá", colorClass: "bg-[#FFF7E6] text-[#D46B08] border-[#FFD591]" };
        case "INVOICE_CREATED":
            return { label: "Tạo HĐ", colorClass: "bg-[#F2F2F0] text-[#1A1A1A] border-[#CCCCCC]" };
        case "INVOICE_PREPAID":
            return { label: "Trả trước", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "INVOICE_LINE_ADDED":
        case "INVOICE_PRODUCT_LINE_ADDED":
            return { label: "Thêm món", colorClass: "bg-[#F2F2F0] text-[#1A1A1A] border-[#CCCCCC]" };
        case "INVOICE_LINE_REMOVED":
        case "INVOICE_PRODUCT_LINE_REMOVED":
            return { label: "Xóa món", colorClass: "bg-[#FFF1F0] text-[#A8071A] border-[#FFA39E]" };
        case "INVOICE_VOIDED":
            return { label: "Hủy HĐ", colorClass: "bg-[#FFF1F0] text-[#A8071A] border-[#FFA39E]" };
        case "SHIFT_CLOSED":
            return { label: "Chốt ca", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "MEMBER_CREATED":
            return { label: "Tạo nhân sự", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "MEMBER_ROLE_UPDATED":
        case "LAKE_ROLE_PERMISSIONS_UPDATED":
            return { label: "Phân quyền", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "MEMBER_DEACTIVATED":
            return { label: "Khóa nhân sự", colorClass: "bg-[#FFF1F0] text-[#A8071A] border-[#FFA39E]" };
        case "MEMBER_PASSWORD_RESET":
            return { label: "Đổi mật khẩu", colorClass: "bg-[#F2F2F0] text-[#1A1A1A] border-[#CCCCCC]" };
        case "PRODUCT_CREATED":
            return { label: "Tạo SP", colorClass: "bg-[#F2F2F0] text-[#1A1A1A] border-[#CCCCCC]" };
        case "PRODUCT_UPDATED":
            return { label: "Sửa SP", colorClass: "bg-[#F2F2F0] text-[#1A1A1A] border-[#CCCCCC]" };
        case "INVENTORY_MOVEMENT_CREATED":
        case "INVENTORY_ADJUSTED":
            return { label: "Kho hàng", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "LOGIN_SUCCEEDED":
            return { label: "Đăng nhập", colorClass: "bg-[#EAEFEA] text-[#2C4C3B] border-[#2C4C3B]" };
        case "LOGIN_FAILED":
            return { label: "Đăng nhập lỗi", colorClass: "bg-[#FFF1F0] text-[#A8071A] border-[#FFA39E]" };
        case "INVOICE_REPAIRED_FROM_SESSION":
        case "INVOICE_AUTO_REPAIRED_ON_COMPLETE":
            return { label: "Bù HĐ", colorClass: "bg-[#FFFBE6] text-[#D48806] border-[#FFE58F]" };
        default:
            return { label: action.replace(/_/g, " "), colorClass: "bg-[#F2F2F0] text-[#555555] border-[#CCCCCC]" };
    }
}

function formatPayloadKey(key: string): string {
    const map: Record<string, string> = {
        fishingSessionId: "Phiên câu",
        sessionId: "Phiên câu",
        invoiceId: "Mã hóa đơn",
        status: "Trạng thái",
        totalAmountVnd: "Tổng tiền",
        paidAmountVnd: "Đã thanh toán",
        amountVnd: "Số tiền thu",
        refundVnd: "Tiền thối lại",
        refundedVnd: "Tiền thối lại",
        paymentMethod: "Phương thức thanh toán",
        paymentTiming: "Hình thức thanh toán",
        customerId: "Khách hàng",
        customerName: "Khách hàng",
        packageId: "Gói câu",
        packageName: "Gói câu",
        hutIds: "Chòi / Vị trí câu",
        hutId: "Chòi / Vị trí câu",
        startAt: "Bắt đầu",
        plannedEndAt: "Dự kiến kết thúc",
        endedAt: "Kết thúc lúc",
        previousPlannedEndAt: "Giờ kết thúc cũ",
        newPlannedEndAt: "Giờ kết thúc mới",
        addedMinutes: "Thời gian gia hạn",
        extraMinutes: "Phút gia hạn",
        pricePerKg: "Đơn giá thu cá",
        weight: "Trọng lượng (kg)",
        fishTypeName: "Loại cá",
        note: "Ghi chú",
        reason: "Lý do",
        priceVnd: "Phí phát sinh",
        newTotalAmountVnd: "Tổng tiền sau sửa",
        name: "Tên",
        quantity: "Số lượng",
        productName: "Tên sản phẩm",
        productSku: "Mã sản phẩm",
        type: "Loại biến động",
        newStock: "Tồn kho sau đó",
        signedQuantity: "Số lượng chênh lệch",
        costPriceVnd: "Giá vốn",
        supplier: "Nhà cung cấp",
        itemsCount: "Số lượng món",
        settlement: "Quyết toán ca",
        balanceDueVnd: "Còn lại phải thu",
        role: "Vai trò",
        actorRole: "Vai trò",
        actorName: "Người thực hiện",
        isCustomStart: "Bắt đầu tùy chỉnh",
        createdAt: "Thời gian tạo",
    };
    return map[key] || key;
}

function formatPayloadValue(key: string, value: unknown, maps?: LookupMaps): string {
    if (value === null || value === undefined) return "—";

    // 1. Tra cứu các ID sang tên người/sản phẩm/gói câu thực tế
    if (key === "packageId" && typeof value === "string") {
        return maps?.packagesMap?.[value] || (value.includes("-") || value.startsWith("#") ? "Gói câu tiêu chuẩn" : value);
    }
    if (key === "customerId" && typeof value === "string") {
        return maps?.customersMap?.[value] || (value.includes("-") || value.startsWith("#") ? "Khách vãng lai" : value);
    }
    if (key === "hutIds" || key === "hutId") {
        if (Array.isArray(value)) {
            const list = value
                .map((id) => (typeof id === "string" && maps?.hutsMap?.[id] ? maps.hutsMap[id] : (typeof id === "string" && (id.includes("-") || id.startsWith("#")) ? "Chòi câu" : String(id))))
                .filter(Boolean);
            return list.length > 0 ? list.join(", ") : "Chưa chọn ô";
        }
        if (typeof value === "string") {
            return maps?.hutsMap?.[value] || (value.includes("-") || value.startsWith("#") ? "Chòi câu hồ" : value);
        }
    }
    if (key === "productId" && typeof value === "string") {
        return maps?.productsMap?.[value] || (value.includes("-") || value.startsWith("#") ? "Mặt hàng hồ câu" : value);
    }
    if ((key === "sessionId" || key === "fishingSessionId") && typeof value === "string") {
        const sess = maps?.sessionsMap?.[value];
        if (sess) {
            return `${sess.huts ? `Chòi ${sess.huts}` : "Phiên câu"}${sess.customerName ? ` (${sess.customerName})` : ""}`;
        }
        return "Phiên câu hồ";
    }

    // 2. Dịch các giá trị cấu hình sang tiếng Việt
    if (key === "paymentTiming") {
        if (value === "POSTPAID") return "Trả sau (khi kết thúc câu)";
        if (value === "PREPAID") return "Trả trước (khi nhận ô câu)";
    }

    if ((key === "addedMinutes" || key === "extraMinutes") && typeof value === "number") {
        return `${value} phút`;
    }

    if (key === "status") {
        if (value === "ACTIVE") return "Đang diễn ra";
        if (value === "COMPLETED") return "Đã hoàn thành";
        if (value === "CANCELLED") return "Đã hủy";
        if (value === "DRAFT") return "Bản nháp (Đang câu)";
        if (value === "PAID") return "Đã thanh toán đủ";
        if (value === "VOID") return "Đã hủy";
    }

    if (key === "paymentMethod") {
        if (value === "CASH") return "Tiền mặt";
        if (value === "BANK_TRANSFER") return "Chuyển khoản";
    }

    if (key === "type") {
        if (value === "OUT") return "Xuất kho";
        if (value === "IN") return "Nhập kho";
        if (value === "ADJUST") return "Kiểm kê / Cân đối";
    }

    if (typeof value === "boolean") {
        return value ? "Có" : "Không";
    }

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

    if (key === "settlement" && typeof value === "object" && value !== null) {
        const s = value as Record<string, unknown>;
        const parts: string[] = [];
        if (s.paymentMethod) {
            parts.push(`Hình thức: ${s.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}`);
        }
        if (typeof s.refundVnd === "number" && s.refundVnd > 0) {
            parts.push(`Thối tiền cho khách: ${formatVnd(s.refundVnd)}`);
        }
        if (typeof s.amountVnd === "number" && s.amountVnd > 0) {
            parts.push(`Thu thêm: ${formatVnd(s.amountVnd)}`);
        }
        return parts.join(" · ") || "Đã quyết toán";
    }

    if (typeof value === "string") {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) || /^#[0-9a-f]{6,12}$/i.test(value)) {
            return "Hệ thống liên kết";
        }
        if (value === "OWNER") return "Chủ hồ";
        if (value === "MANAGER") return "Quản lý";
        if (value === "STAFF") return "Nhân viên";
        if (value === "DRAFT") return "Bản nháp (Đang câu)";
        if (value === "PAID") return "Đã thanh toán đủ";
        if (value === "VOID") return "Đã hủy";
        if (value === "CASH") return "Tiền mặt";
        if (value === "BANK_TRANSFER") return "Chuyển khoản";
        if (value === "OUT") return "Xuất kho";
        if (value === "IN") return "Nhập kho";
        if (value === "ADJUST") return "Kiểm kê / Cân đối";
        if (value.includes("T") && !isNaN(Date.parse(value))) {
            return formatDateTime(value);
        }
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map((v) => (typeof v === "string" && v.length === 36 ? "Mục liên kết" : String(v)))
            .join(", ");
    }

    if (typeof value === "object") {
        return Object.entries(value as Record<string, unknown>)
            .filter(([subK]) => !["id", "lakeId", "productId", "fishingSessionId", "sessionId", "invoiceId", "paymentId", "hutIds", "actor", "ip", "ua"].includes(subK))
            .map(([subK, subV]) => `${formatPayloadKey(subK)}: ${formatPayloadValue(subK, subV, maps)}`)
            .join(" · ");
    }

    return String(value);
}

function getAuditHumanSummary(
    ev: HistoryAuditEvent,
    payload: Record<string, unknown> | null,
    maps: LookupMaps,
): string {
    if (!payload) return ev.payload ? ev.payload.slice(0, 90) : "Thao tác thành công";

    if (ev.action === "INVOICE_CREATED") {
        const total = typeof payload.totalAmountVnd === "number" ? formatVnd(payload.totalAmountVnd) : "";
        const sess = payload.fishingSessionId ? maps.sessionsMap?.[String(payload.fishingSessionId)] : null;
        const hutStr = sess?.huts ? ` chòi ${sess.huts}` : "";
        const custStr = sess?.customerName && sess.customerName !== "Khách vãng lai" ? ` (${sess.customerName})` : "";
        return `Tạo hóa đơn tạm tính${hutStr}${custStr}${total ? ` · Số tiền: ${total}` : ""}`;
    }

    if (ev.action === "FISHING_SESSION_OPENED" || ev.action === "SESSION_OPENED" || ev.action === "SESSION_CREATED") {
        const sess = maps.sessionsMap?.[ev.entityId];
        let hutStr = sess?.huts ? ` chòi ${sess.huts}` : "";
        if (!hutStr && payload.hutIds && Array.isArray(payload.hutIds)) {
            const hNames = (payload.hutIds as string[]).map((h) => maps.hutsMap?.[h]).filter(Boolean).join(", ");
            if (hNames) hutStr = ` ${hNames}`;
        }
        const custName =
            (sess?.customerName && sess.customerName !== "Khách vãng lai" && sess.customerName) ||
            (typeof payload.customerId === "string" && maps.customersMap?.[payload.customerId]) ||
            "";
        const custStr = custName ? ` - Khách: ${custName}` : "";
        const pkgName =
            sess?.packageName ||
            (typeof payload.packageId === "string" && maps.packagesMap?.[payload.packageId]) ||
            "";
        const pkgStr = pkgName ? ` · Gói: ${pkgName}` : "";
        const start = payload.startAt ? formatTime(String(payload.startAt)) : "";
        return `Mở phiên câu${hutStr}${custStr}${pkgStr}${start ? ` lúc ${start}` : ""}`;
    }

    if (ev.action === "FISHING_SESSION_EXTENDED") {
        const sess = maps.sessionsMap?.[ev.entityId];
        const hutStr = sess?.huts ? ` chòi ${sess.huts}` : "";
        const custStr = sess?.customerName && sess.customerName !== "Khách vãng lai" ? ` (${sess.customerName})` : "";
        const mins = payload.addedMinutes || payload.extraMinutes ? `${payload.addedMinutes || payload.extraMinutes} phút` : "";
        const price = typeof payload.priceVnd === "number" ? formatVnd(payload.priceVnd) : "";
        return `Gia hạn phiên câu${hutStr}${custStr}${mins ? ` thêm ${mins}` : ""}${price ? ` · Tiền giờ: ${price}` : ""}`;
    }

    if (ev.action === "FISHING_SESSION_COMPLETED" || ev.action === "SESSION_COMPLETED") {
        const sess = maps.sessionsMap?.[ev.entityId];
        const hutStr = sess?.huts ? ` chòi ${sess.huts}` : "";
        const custStr = sess?.customerName && sess.customerName !== "Khách vãng lai" ? ` (${sess.customerName})` : "";
        const settlement = payload.settlement as Record<string, unknown> | undefined;
        if (settlement) {
            if (typeof settlement.refundVnd === "number" && settlement.refundVnd > 0) {
                return `Kết thúc phiên câu${hutStr}${custStr} · Thối tiền cho khách: ${formatVnd(settlement.refundVnd)}`;
            }
            if (typeof settlement.amountVnd === "number" && settlement.amountVnd > 0) {
                return `Kết thúc phiên câu${hutStr}${custStr} · Thu thêm của khách: ${formatVnd(settlement.amountVnd)}`;
            }
        }
        return `Kết thúc phiên câu${hutStr}${custStr} thành công & giải phóng ô câu`;
    }

    if (ev.action === "INVENTORY_MOVEMENT_CREATED" || ev.action === "INVENTORY_ADJUSTED" || ev.entityType === "InventoryMovement") {
        const pName =
            (typeof payload.productId === "string" && maps.productsMap?.[payload.productId]) ||
            (typeof payload.productName === "string" ? payload.productName : "mặt hàng");
        const typeStr = payload.type === "OUT" ? "Xuất kho" : payload.type === "IN" ? "Nhập kho" : "Điều chỉnh kho";
        const qty = payload.quantity ? ` ${payload.quantity}` : "";
        const reason = payload.reason || payload.note ? ` · Lý do: ${payload.reason || payload.note}` : "";
        const newStock = typeof payload.newStock === "number" ? ` · Tồn mới: ${payload.newStock}` : "";
        return `${typeStr}${qty} ${pName}${reason}${newStock}`;
    }

    if (ev.action === "RETAIL_SALE_COMPLETED" || ev.action === "RETAIL_INVOICE_CREATED") {
        const invId = typeof payload.invoiceId === "string" ? payload.invoiceId : ev.entityId;
        const inv = maps.invoicesMap?.[invId];
        const linesSummary = inv?.linesSummary || (typeof payload.itemsSummary === "string" ? payload.itemsSummary : "");
        const total = typeof payload.totalAmountVnd === "number" ? formatVnd(payload.totalAmountVnd) : "";
        const method = payload.paymentMethod === "CASH" ? "Tiền mặt" : payload.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản" : "";
        const productText = linesSummary ? ` (${linesSummary})` : payload.itemsCount ? ` (${payload.itemsCount} món)` : "";
        return `Bán lẻ thành công${productText}${total ? ` · Thu: ${total}` : ""}${method ? ` [${method}]` : ""}`;
    }

    if (ev.action === "INVOICE_PRODUCT_LINE_ADDED" || ev.action === "INVOICE_LINE_ADDED") {
        const pName =
            (typeof payload.productName === "string" && payload.productName) ||
            (typeof payload.name === "string" && payload.name) ||
            "mặt hàng";
        const qty = payload.quantity ? ` x${payload.quantity}` : "";
        const price = typeof payload.unitPrice === "number" ? ` (${formatVnd(payload.unitPrice)})` : "";
        return `Thêm vào hóa đơn: ${pName}${qty}${price}`;
    }

    if (ev.action === "INVOICE_PREPAID") {
        const total = typeof payload.totalAmountVnd === "number" ? formatVnd(payload.totalAmountVnd) : "";
        const paid = typeof payload.paidAmountVnd === "number" ? formatVnd(payload.paidAmountVnd) : "";
        return `Thanh toán trả trước vé câu${paid ? `: ${paid}` : total ? `: ${total}` : ""}`;
    }

    if (ev.action === "FISH_BUYBACK_RECORDED" || ev.action === "FISH_BUYBACK_CREATED") {
        const kg = payload.weight ? `${payload.weight} kg` : "";
        const total = typeof payload.totalVnd === "number" ? formatVnd(payload.totalVnd) : "";
        const fish = typeof payload.fishTypeName === "string" ? ` (${payload.fishTypeName})` : "";
        return `Thu mua cá${fish}${kg ? ` ${kg}` : ""}${total ? ` · -${total}` : ""}`;
    }

    if (ev.action === "PAYMENT_RECORDED" || ev.action === "PAYMENT_COLLECTED") {
        const amt = typeof payload.amountVnd === "number" ? formatVnd(payload.amountVnd) : "";
        const method = payload.method === "CASH" ? "Tiền mặt" : payload.method === "BANK_TRANSFER" ? "Chuyển khoản" : "";
        return `Ghi nhận thanh toán${amt ? `: ${amt}` : ""}${method ? ` (${method})` : ""}`;
    }

    if (ev.action.includes("REPAIRED")) {
        return "Hệ thống tự động đồng bộ & tạo bù hóa đơn phiên câu";
    }

    // Default friendly summary without raw database IDs
    const entries = Object.entries(payload).filter(
        ([k]) =>
            ![
                "id",
                "lakeId",
                "productId",
                "fishingSessionId",
                "sessionId",
                "invoiceId",
                "invoiceLineId",
                "lineId",
                "paymentId",
                "actor",
                "ip",
                "ua",
                "before",
                "after",
                "hutIds",
                "isCustomStart",
                "createdAt",
                "items",
                "itemsSummary",
            ].includes(k),
    );
    if (entries.length === 0) return "Thao tác hoàn tất";
    return entries
        .slice(0, 3)
        .map(([k, v]) => `${formatPayloadKey(k)}: ${formatPayloadValue(k, v, maps)}`)
        .join(" · ");
}

const HIDDEN_EXPANDED_KEYS = new Set([
    "before",
    "after",
    "actor",
    "ip",
    "ua",
    "isCustomStart",
    "createdAt",
    "lakeId",
    "id",
    "invoiceLineId",
    "lineId",
    "invoiceId",
    "fishingSessionId",
    "sessionId",
    "paymentId",
    "items",
    "itemsSummary",
]);

export function HistoryView({
    invoices,
    auditEvents,
    usersMap,
    sessionsMap,
    packagesMap,
    hutsMap,
    customersMap,
    productsMap,
    invoicesMap,
    lakeName,
    initialTab = "orders",
}: HistoryViewProps & { initialTab?: "orders" | "audit" }) {
    const { isConnected, printPaymentReceipt } = usePrinter();

    const [activeTab, setActiveTab] = useState<"orders" | "audit">(initialTab);
    const [reprintingId, setReprintingId] = useState<string | null>(null);

    // Filter states for Orders
    const [orderSearch, setOrderSearch] = useState("");
    const [orderTypeFilter, setOrderTypeFilter] = useState<"ALL" | "TICKET" | "RETAIL">("ALL");
    const [orderStatusFilter, setOrderStatusFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");

    // Filter states for Audit
    const [auditSearch, setAuditSearch] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState<string>("ALL");
    const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({});

    const lookupMaps: LookupMaps = useMemo(
        () => ({
            usersMap,
            sessionsMap,
            packagesMap,
            hutsMap,
            customersMap,
            productsMap,
            invoicesMap,
        }),
        [usersMap, sessionsMap, packagesMap, hutsMap, customersMap, productsMap, invoicesMap],
    );

    // Filtered Invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const isTicket = inv.fishingSessionId !== null;
            if (orderTypeFilter === "TICKET" && !isTicket) return false;
            if (orderTypeFilter === "RETAIL" && isTicket) return false;

            if (orderStatusFilter === "PAID" && inv.status !== InvoiceStatus.PAID) return false;
            if (orderStatusFilter === "UNPAID" && inv.status === InvoiceStatus.PAID) return false;

            if (orderSearch.trim()) {
                const q = orderSearch.toLowerCase().trim();
                const matchId = inv.id.toLowerCase().includes(q);
                const matchCust = inv.customer?.name.toLowerCase().includes(q);
                const matchPhone = inv.customer?.phoneNormalized?.includes(q);
                const matchHut = inv.fishingSession?.hutLinks?.some((hl) =>
                    hl.hut.name.toLowerCase().includes(q),
                );
                return matchId || matchCust || matchPhone || matchHut;
            }

            return true;
        });
    }, [invoices, orderTypeFilter, orderStatusFilter, orderSearch]);

    // Filtered Audit Events
    const filteredAuditEvents = useMemo(() => {
        return auditEvents.filter((ev) => {
            if (auditActionFilter !== "ALL") {
                const opt = AUDIT_FILTER_OPTIONS.find((o) => o.key === auditActionFilter);
                if (opt && opt.actions.length > 0 && !opt.actions.includes(ev.action)) {
                    return false;
                }
            }

            if (auditSearch.trim()) {
                const q = auditSearch.toLowerCase().trim();
                const matchAction = ev.action.toLowerCase().includes(q);
                const matchType = ev.entityType.toLowerCase().includes(q);
                const matchUser = usersMap?.[ev.createdBy]?.toLowerCase().includes(q);
                const matchPayload = ev.payload.toLowerCase().includes(q);
                const matchTitle = formatEntityTitle(ev, null, lookupMaps).toLowerCase().includes(q);
                return matchAction || matchType || matchUser || matchPayload || matchTitle;
            }

            return true;
        });
    }, [auditEvents, auditActionFilter, auditSearch, usersMap, lookupMaps]);

    // Toggle audit item expand
    function toggleAuditExpand(id: string) {
        setExpandedAuditIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }

    // Handle reprint invoice
    async function handleReprint(invoice: HistoryInvoice) {
        if (!isConnected) {
            alert("Vui lòng kết nối máy in trước khi in hóa đơn.");
            return;
        }

        setReprintingId(invoice.id);
        try {
            const paid = invoice.payments.reduce((s, p) => s + (p.direction === "IN" ? p.amountVnd : -p.amountVnd), 0);
            const remaining = Math.max(0, invoice.totalAmountVnd - paid);
            const receiptData: PaymentReceiptData = {
                lakeName,
                invoiceId: invoice.id,
                sessionId: invoice.fishingSessionId || undefined,
                hutNames: invoice.fishingSession?.hutLinks?.map((hl) => hl.hut.name).join(", ") || "Bán lẻ",
                customerName: invoice.customer?.name,
                customerPhone: invoice.customer?.phoneNormalized,
                packageName: invoice.fishingSession?.packageNameSnapshot,
                cashierName: "Thu ngân",
                paymentTime: invoice.createdAt,
                lines: invoice.lines.map((l) => ({
                    name: l.name,
                    quantity: Number(l.quantity),
                    unitPrice: l.unitPrice,
                    totalVnd: l.totalVnd,
                })),
                totalAmountVnd: invoice.totalAmountVnd,
                paidAmountVnd: paid,
                remainingVnd: remaining,
                paymentMethod: invoice.payments[0]?.method === "CASH" ? "Tiền mặt" : invoice.payments[0]?.method || "Tiền mặt",
                isReprint: true,
            };

            await printPaymentReceipt(receiptData);
        } catch (err) {
            console.error("Lỗi khi in lại bill:", err);
            alert("Có lỗi xảy ra khi in lại hóa đơn.");
        } finally {
            setReprintingId(null);
        }
    }

    return (
        <div className="space-y-4">
            {/* Main Tabs Segment */}
            <div className="flex border-b border-[#CCCCCC] bg-white">
                <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                        activeTab === "orders"
                            ? "border-[#2C4C3B] text-[#2C4C3B]"
                            : "border-transparent text-[#777777] hover:text-[#1A1A1A]"
                    }`}
                >
                    Hóa đơn & Đơn hàng ({invoices.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("audit")}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                        activeTab === "audit"
                            ? "border-[#2C4C3B] text-[#2C4C3B]"
                            : "border-transparent text-[#777777] hover:text-[#1A1A1A]"
                    }`}
                >
                    Nhật ký hoạt động ({auditEvents.length})
                </button>
            </div>

            {/* TAB 1: DANH SÁCH HÓA ĐƠN */}
            {activeTab === "orders" && (
                <div className="space-y-4">
                    {/* Filters */}
                    <Card className="p-3 space-y-2.5 border-[#CCCCCC] bg-white rounded-xs">
                        <Input
                            placeholder="Tìm theo tên khách, số chòi, mã đơn..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <div className="flex gap-1">
                                {(["ALL", "TICKET", "RETAIL"] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setOrderTypeFilter(t)}
                                        className={`px-2.5 py-1 rounded-xs font-semibold cursor-pointer border ${
                                            orderTypeFilter === t
                                                ? "bg-[#2C4C3B] text-white border-[#2C4C3B]"
                                                : "bg-white text-[#555555] border-[#CCCCCC] hover:border-[#999999]"
                                        }`}
                                    >
                                        {t === "ALL" ? "Tất cả" : t === "TICKET" ? "Vé câu" : "Bán lẻ"}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-1">
                                {(["ALL", "PAID", "UNPAID"] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setOrderStatusFilter(s)}
                                        className={`px-2.5 py-1 rounded-xs font-semibold cursor-pointer border ${
                                            orderStatusFilter === s
                                                ? "bg-[#2C4C3B] text-white border-[#2C4C3B]"
                                                : "bg-white text-[#555555] border-[#CCCCCC] hover:border-[#999999]"
                                        }`}
                                    >
                                        {s === "ALL" ? "Tất cả TT" : s === "PAID" ? "Đã thu" : "Chưa thu"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Orders List */}
                    {filteredInvoices.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#666666] border border-[#CCCCCC] bg-white rounded-xs">
                            Không tìm thấy hóa đơn nào phù hợp.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredInvoices.map((invoice) => {
                                const isTicket = invoice.fishingSessionId !== null;
                                const huts =
                                    invoice.fishingSession?.hutLinks
                                        ?.map((hl) => hl.hut.name)
                                        .join(", ") || "";

                                return (
                                    <div
                                        key={invoice.id}
                                        className="p-3.5 border border-[#CCCCCC] bg-white rounded-xs space-y-2 hover:border-[#999999] transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-xs text-[#1A1A1A]">
                                                        {isTicket
                                                            ? `Chòi ${huts || "—"}`
                                                            : "Bán lẻ độc lập"}
                                                    </span>
                                                    <InvoiceStatusBadge status={invoice.status} />
                                                </div>
                                                <p className="text-xs text-[#555555] mt-0.5">
                                                    Khách:{" "}
                                                    <strong className="text-[#1A1A1A]">
                                                        {invoice.customer?.name || "Khách vãng lai"}
                                                    </strong>
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-sm font-bold text-[#9E2A2B] block">
                                                    {formatVnd(invoice.totalAmountVnd)}
                                                </span>
                                                <span className="text-[11px] text-[#666666]">
                                                    {formatDateTime(invoice.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Lines summary */}
                                        <div className="text-xs text-[#555555] bg-[#FAFAF7] p-2 rounded-xs border border-[#E0E0E0]">
                                            {invoice.lines.slice(0, 2).map((l) => (
                                                <div key={l.id} className="flex justify-between py-0.5">
                                                    <span>{l.name}</span>
                                                    <span className="font-semibold text-[#1A1A1A]">
                                                        x{Number(l.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                            {invoice.lines.length > 2 && (
                                                <span className="text-[10px] text-[#777777] italic block mt-0.5">
                                                    + {invoice.lines.length - 2} món khác...
                                                </span>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center justify-between pt-1 border-t border-[#EAEAE6]">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    isLoading={reprintingId === invoice.id}
                                                    onClick={() => handleReprint(invoice)}
                                                    className="h-7 px-2.5 rounded-xs text-xs font-bold text-[#2C4C3B] border-[#2C4C3B] hover:bg-[#EAEFEA]"
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
                                                    href={`/invoices/${encodeURIComponent(invoice.id)}?returnTo=%2Finvoices%2Fhistory`}
                                                    className="inline-flex h-7 items-center justify-center rounded-xs border border-[#CCCCCC] bg-white px-3 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F2F2F0] transition-colors"
                                                >
                                                    Chi tiết
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
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
                    <Card className="p-3 space-y-2.5 border-[#CCCCCC] bg-white rounded-xs">
                        <Input
                            placeholder="Tìm hành động, người dùng, vị trí ô, khách..."
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                        />

                        <div className="flex flex-wrap gap-1.5">
                            {AUDIT_FILTER_OPTIONS.map((opt) => {
                                const isSelected = auditActionFilter === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setAuditActionFilter(opt.key)}
                                        className={`px-2.5 py-1 rounded-xs text-xs font-bold transition-colors cursor-pointer border ${
                                            isSelected
                                                ? opt.activeClass
                                                : "bg-white text-[#555555] border-[#CCCCCC] hover:border-[#999999]"
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
                        <div className="p-8 text-center text-xs text-[#666666] border border-[#CCCCCC] bg-white rounded-xs">
                            Không có nhật ký hoạt động nào.
                        </div>
                    ) : (
                        <div className="border border-[#CCCCCC] bg-white rounded-xs divide-y divide-[#E0E0E0]">
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
                                    <div
                                        key={ev.id}
                                        className="p-3.5 space-y-2 hover:bg-[#FAFAF7] transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className={`rounded-xs px-1.5 py-0.5 text-[10px] font-bold border ${badgeInfo.colorClass}`}
                                                    >
                                                        {badgeInfo.label}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#2C4C3B]">
                                                        {formatEntityTitle(ev, parsedPayload, lookupMaps)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#1A1A1A] wrap-break-word">
                                                    Thực hiện bởi:{" "}
                                                    <span className="font-semibold text-[#2C4C3B]">
                                                        {formatActor(ev.createdBy, parsedPayload, usersMap)}
                                                    </span>
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-[11px] text-[#666666]">
                                                    {formatDateTime(ev.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payload summary or toggle */}
                                        <div className="rounded-xs bg-[#FAFAF7] p-2.5 text-xs border border-[#E0E0E0]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[#666666]">
                                                    Chi tiết tác vụ:
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAuditExpand(ev.id)}
                                                    className="text-[11px] font-semibold text-[#2C4C3B] hover:underline cursor-pointer"
                                                >
                                                    {isExpanded ? "Thu gọn" : "Xem thêm"}
                                                </button>
                                            </div>

                                            {isExpanded ? (
                                                <div className="mt-2 space-y-2">
                                                    {ev.action.includes("REPAIRED") && (
                                                        <div className="p-2 rounded-xs bg-[#FFFBE6] border border-[#FFE58F] text-[#D48806] text-[11px]">
                                                            💡 <b>Hệ thống tự động:</b> Đã tạo bù hóa đơn nháp thành công cho phiên câu ô câu lúc trước để đảm bảo số liệu thu chi chính xác.
                                                        </div>
                                                    )}

                                                    {/* Structured Key-Value Grid */}
                                                    {parsedPayload && Object.keys(parsedPayload).length > 0 ? (
                                                        <div className="rounded-xs bg-white border border-[#CCCCCC] p-2.5 space-y-1.5 text-[11px]">
                                                            {/* Dòng Người thực hiện */}
                                                            <div className="flex items-start justify-between gap-2 py-1 border-b border-[#E0E0E0]">
                                                                <span className="text-[#666666] font-medium shrink-0">
                                                                    Người thực hiện:
                                                                </span>
                                                                <span className="font-semibold text-[#2C4C3B] text-right">
                                                                    {formatActor(ev.createdBy, parsedPayload, usersMap)}
                                                                </span>
                                                            </div>

                                                            {/* Dòng Thời gian ghi nhận */}
                                                            <div className="flex items-start justify-between gap-2 py-1 border-b border-[#E0E0E0]">
                                                                <span className="text-[#666666] font-medium shrink-0">
                                                                    Thời gian ghi nhận:
                                                                </span>
                                                                <span className="font-semibold text-[#1A1A1A] text-right">
                                                                    {formatDateTime(ev.createdAt)}
                                                                </span>
                                                            </div>

                                                            {/* Danh sách sản phẩm đã bán trong đơn bán lẻ / hóa đơn */}
                                                            {(() => {
                                                                const invId = typeof parsedPayload?.invoiceId === "string" ? parsedPayload.invoiceId : ev.entityId;
                                                                const invData = lookupMaps.invoicesMap?.[invId];
                                                                const itemsList =
                                                                    invData?.lines ||
                                                                    (Array.isArray(parsedPayload?.items)
                                                                        ? (parsedPayload.items as Array<{ name: string; quantity: number; unitPrice?: number; totalVnd?: number }>)
                                                                        : null);

                                                                if (itemsList && itemsList.length > 0) {
                                                                    return (
                                                                        <div className="py-2 border-b border-[#E0E0E0]">
                                                                            <span className="text-[#666666] font-medium block mb-1.5">
                                                                                Sản phẩm đã bán:
                                                                            </span>
                                                                            <div className="rounded-xs bg-[#F8F9FA] border border-[#E9ECEF] p-2 space-y-1.5">
                                                                                {itemsList.map((item, idx) => (
                                                                                    <div key={idx} className="flex items-center justify-between text-[11px]">
                                                                                        <span className="font-semibold text-[#1A1A1A]">
                                                                                            • {item.name}{" "}
                                                                                            <span className="text-[#2C4C3B] font-bold">x{item.quantity}</span>
                                                                                        </span>
                                                                                        <span className="font-semibold text-[#9E2A2B]">
                                                                                            {item.totalVnd
                                                                                                ? formatVnd(item.totalVnd)
                                                                                                : item.unitPrice
                                                                                                  ? formatVnd(item.unitPrice * item.quantity)
                                                                                                  : "—"}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}

                                                            {/* Render các trường nghiệp vụ minh bạch đã lọc sạch kỹ thuật */}
                                                            {Object.entries(parsedPayload)
                                                                .filter(
                                                                    ([k, v]) =>
                                                                        !HIDDEN_EXPANDED_KEYS.has(k) &&
                                                                        v !== null &&
                                                                        v !== undefined &&
                                                                        v !== "",
                                                                )
                                                                .map(([k, v]) => (
                                                                    <div
                                                                        key={k}
                                                                        className="flex items-start justify-between gap-2 py-1 border-b border-[#E0E0E0] last:border-none"
                                                                    >
                                                                        <span className="text-[#666666] font-medium shrink-0">
                                                                            {formatPayloadKey(k)}:
                                                                        </span>
                                                                        <span className="font-semibold text-[#1A1A1A] text-right wrap-break-word">
                                                                            {formatPayloadValue(k, v, lookupMaps)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-2 rounded-xs bg-white border border-[#CCCCCC] text-[11px] text-[#666666]">
                                                            {getAuditHumanSummary(ev, parsedPayload, lookupMaps)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-[#1A1A1A] truncate mt-1">
                                                    {getAuditHumanSummary(ev, parsedPayload, lookupMaps)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
