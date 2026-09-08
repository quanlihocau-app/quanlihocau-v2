import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
    InvoiceStatus,
    PaymentDirection,
    PaymentMethod,
    Prisma,
    SessionStatus,
} from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    DatePreset,
    formatVnDateTimeDisplay,
    getDateRangeForPreset,
} from "@/lib/reports/date-utils";
import { getTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export interface DrilldownItem {
    id: string;
    code: string;
    dateTime: string;
    customerName: string;
    staffName: string;
    content: string;
    amountVnd: number;
    paymentMethod: string;
    status: string;
    details?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantContext = await getTenantContext();
        if (!tenantContext?.lakeId) {
            return NextResponse.json({ error: "Forbidden: No lake assigned" }, { status: 403 });
        }

        const lakeId = tenantContext.lakeId;
        const { searchParams } = new URL(request.url);

        const metric = searchParams.get("metric") || "ticketRevenue";
        const preset = (searchParams.get("preset") as DatePreset) || "today";
        const customFrom = searchParams.get("from") || undefined;
        const customTo = searchParams.get("to") || undefined;
        const customFromTime = searchParams.get("fromTime") || "00:00";
        const customToTime = searchParams.get("toTime") || "23:59";

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
        const skip = (page - 1) * limit;

        const dateRange = getDateRangeForPreset(
            preset,
            new Date(),
            customFrom,
            customTo,
            customFromTime,
            customToTime
        );

        let items: DrilldownItem[] = [];
        let totalCount = 0;
        let title = "Danh sách giao dịch chi tiết";

        if (metric === "ticketRevenue" || metric === "totalRevenue") {
            title = metric === "ticketRevenue" ? "Chi tiết Doanh thu Vé câu" : "Chi tiết Tổng Doanh thu";
            const where: Prisma.InvoiceWhereInput = {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
                status: { not: InvoiceStatus.VOIDED },
            };
            if (metric === "ticketRevenue") {
                where.fishingSessionId = { not: null };
            }

            totalCount = await prisma.invoice.count({ where });
            const invoices = await prisma.invoice.findMany({
                where,
                include: {
                    customer: true,
                    fishingSession: {
                        include: {
                            package: true,
                            hutLinks: { include: { hut: true } },
                        },
                    },
                    payments: true,
                    lines: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = invoices.map(inv => {
                const methods = Array.from(new Set(inv.payments.map(p => p.method === PaymentMethod.CASH ? "Tiền mặt" : "Chuyển khoản"))).join(", ") || "Chưa thanh toán";
                const spots = inv.fishingSession?.hutLinks.map(l => l.hut.name).join(", ") || "";
                const content = inv.fishingSession
                    ? `Vé câu [${inv.fishingSession.packageNameSnapshot}] ${spots ? `(${spots})` : ""}`
                    : `Hóa đơn bán lẻ (${inv.lines.length} món)`;

                return {
                    id: inv.id,
                    code: inv.id.substring(0, 8).toUpperCase(),
                    dateTime: formatVnDateTimeDisplay(inv.createdAt),
                    customerName: inv.customer?.name || "Khách vãng lai",
                    staffName: "Thu ngân",
                    content,
                    amountVnd: inv.totalAmountVnd,
                    paymentMethod: methods,
                    status: inv.status === InvoiceStatus.PAID ? "Đã thanh toán" : inv.status === InvoiceStatus.PARTIALLY_PAID ? "Thanh toán 1 phần" : "Chưa thanh toán",
                };
            });
        } else if (metric === "productRevenue") {
            title = "Chi tiết Sản phẩm & Dịch vụ đã bán";
            const where: Prisma.InvoiceLineWhereInput = {
                invoice: {
                    lakeId,
                    createdAt: { gte: dateRange.from, lte: dateRange.to },
                    status: { not: InvoiceStatus.VOIDED },
                },
                productId: { not: null },
            };

            totalCount = await prisma.invoiceLine.count({ where });
            const lines = await prisma.invoiceLine.findMany({
                where,
                include: {
                    product: true,
                    invoice: {
                        include: { customer: true, payments: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = lines.map(line => {
                const methods = Array.from(new Set(line.invoice.payments.map(p => p.method === PaymentMethod.CASH ? "Tiền mặt" : "Chuyển khoản"))).join(", ") || "Tiền mặt";
                return {
                    id: line.id,
                    code: line.id.substring(0, 8).toUpperCase(),
                    dateTime: formatVnDateTimeDisplay(line.createdAt),
                    customerName: line.invoice.customer?.name || "Khách lẻ",
                    staffName: "Nhân viên bán hàng",
                    content: `${line.name} (SL: ${Number(line.quantity)} × ${new Intl.NumberFormat("vi-VN").format(line.unitPrice)}đ)`,
                    amountVnd: line.totalVnd,
                    paymentMethod: methods,
                    status: "Đã giao",
                };
            });
        } else if (metric === "overtimeRevenue") {
            title = "Chi tiết Tiền thêm giờ phụ trội";
            const where: Prisma.InvoiceLineWhereInput = {
                invoice: {
                    lakeId,
                    createdAt: { gte: dateRange.from, lte: dateRange.to },
                    status: { not: InvoiceStatus.VOIDED },
                },
                name: { contains: "giờ" },
            };

            totalCount = await prisma.invoiceLine.count({ where });
            const lines = await prisma.invoiceLine.findMany({
                where,
                include: {
                    invoice: {
                        include: { customer: true, fishingSession: true, payments: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = lines.map(line => {
                return {
                    id: line.id,
                    code: line.id.substring(0, 8).toUpperCase(),
                    dateTime: formatVnDateTimeDisplay(line.createdAt),
                    customerName: line.invoice.customer?.name || "Khách câu",
                    staffName: "Hệ thống tính giờ",
                    content: line.name,
                    amountVnd: line.totalVnd,
                    paymentMethod: "Theo hóa đơn",
                    status: "Đã chốt giờ",
                };
            });
        } else if (metric === "totalFishBuyback") {
            title = "Chi tiết Thu mua cá từ cần thủ";
            const where: Prisma.FishBuybackWhereInput = {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
            };

            totalCount = await prisma.fishBuyback.count({ where });
            const buybacks = await prisma.fishBuyback.findMany({
                where,
                include: { fishType: true },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = buybacks.map(fb => ({
                id: fb.id,
                code: fb.id.substring(0, 8).toUpperCase(),
                dateTime: formatVnDateTimeDisplay(fb.createdAt),
                customerName: "Cần thủ",
                staffName: "Tổ cân cá",
                content: `Mua cá: ${fb.fishType.name} (${Number(fb.weight)} kg × ${new Intl.NumberFormat("vi-VN").format(fb.pricePerKg)}đ)`,
                amountVnd: fb.totalVnd,
                paymentMethod: "Khấu trừ vé / Tiền mặt",
                status: "Đã cân & thanh toán",
            }));
        } else if (metric === "totalExpense") {
            title = "Chi tiết Các Phiếu chi & Chi phí";
            const where: Prisma.ExpenseWhereInput = {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
            };

            totalCount = await prisma.expense.count({ where });
            const expenses = await prisma.expense.findMany({
                where,
                include: { payments: true },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = expenses.map(exp => {
                const method = exp.payments[0]?.method === PaymentMethod.CASH ? "Tiền mặt" : "Chuyển khoản";
                return {
                    id: exp.id,
                    code: exp.id.substring(0, 8).toUpperCase(),
                    dateTime: formatVnDateTimeDisplay(exp.createdAt),
                    customerName: "Người nhận / NCC",
                    staffName: "Quản lý / Thủ quỹ",
                    content: exp.description,
                    amountVnd: exp.amountVnd,
                    paymentMethod: method,
                    status: "Đã chi",
                };
            });
        } else if (metric === "totalReceivableDebt") {
            title = "Chi tiết Công nợ chưa thu";
            const where: Prisma.InvoiceWhereInput = {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
                status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.PARTIALLY_PAID] },
            };

            totalCount = await prisma.invoice.count({ where });
            const debts = await prisma.invoice.findMany({
                where,
                include: { customer: true, payments: true },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = debts.map(inv => {
                const paid = inv.payments.reduce((acc, p) => p.direction === PaymentDirection.IN ? acc + p.amountVnd : acc - p.amountVnd, 0);
                const remaining = Math.max(0, inv.totalAmountVnd - paid);
                return {
                    id: inv.id,
                    code: inv.id.substring(0, 8).toUpperCase(),
                    dateTime: formatVnDateTimeDisplay(inv.createdAt),
                    customerName: inv.customer?.name || "Khách nợ",
                    staffName: "Thu ngân",
                    content: `Công nợ hóa đơn (Đã trả: ${new Intl.NumberFormat("vi-VN").format(paid)}đ / Tổng: ${new Intl.NumberFormat("vi-VN").format(inv.totalAmountVnd)}đ)`,
                    amountVnd: remaining,
                    paymentMethod: "Chờ thanh toán",
                    status: inv.status === InvoiceStatus.PARTIALLY_PAID ? "Nợ một phần" : "Chưa trả",
                };
            });
        } else if (metric === "cash" || metric === "transfer") {
            const isCash = metric === "cash";
            title = isCash ? "Chi tiết Giao dịch Tiền mặt" : "Chi tiết Giao dịch Chuyển khoản";
            const method = isCash ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER;
            const where: Prisma.PaymentWhereInput = {
                lakeId,
                method,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
            };

            totalCount = await prisma.payment.count({ where });
            const payments = await prisma.payment.findMany({
                where,
                include: {
                    invoice: { include: { customer: true } },
                    expense: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = payments.map(p => ({
                id: p.id,
                code: p.id.substring(0, 8).toUpperCase(),
                dateTime: formatVnDateTimeDisplay(p.createdAt),
                customerName: p.invoice?.customer?.name || (p.direction === PaymentDirection.IN ? "Khách hàng" : "Người nhận"),
                staffName: "Thủ quỹ",
                content: p.direction === PaymentDirection.IN
                    ? (p.invoice ? `Thu tiền hóa đơn #${p.invoice.id.substring(0, 8)}` : "Thu tiền khác")
                    : (p.expense ? `Chi: ${p.expense.description}` : "Chi tiền / Hoàn tiền"),
                amountVnd: p.amountVnd,
                paymentMethod: isCash ? "Tiền mặt" : "Chuyển khoản",
                status: p.direction === PaymentDirection.IN ? "Tiền vào (+)" : "Tiền ra (-)",
            }));
        } else if (metric === "auditEvents") {
            title = "Chi tiết Nhật ký thao tác (Audit Logs)";
            const where: Prisma.AuditEventWhereInput = {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
            };

            totalCount = await prisma.auditEvent.count({ where });
            const audits = await prisma.auditEvent.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = audits.map((a) => {
                let parsedPayload: Record<string, unknown> | null = null;
                try {
                    parsedPayload = JSON.parse(a.payload);
                } catch {
                    parsedPayload = null;
                }

                let summary = a.action.replace(/_/g, " ");
                if (a.action.includes("SESSION")) {
                    summary = "Thao tác phiên câu";
                } else if (a.action.includes("INVOICE")) {
                    summary = "Thao tác hóa đơn";
                } else if (a.action.includes("PAYMENT")) {
                    summary = "Giao dịch thanh toán";
                }

                if (parsedPayload && typeof parsedPayload === "object") {
                    const keys = Object.keys(parsedPayload).slice(0, 2);
                    if (keys.length > 0) {
                        summary += ` (${keys.map(k => `${k}: ${String(parsedPayload?.[k])}`).join(", ")})`;
                    }
                }

                return {
                    id: a.id,
                    code: a.id.substring(0, 8).toUpperCase(),
                    dateTime: formatVnDateTimeDisplay(a.createdAt),
                    customerName: a.createdBy || "Hệ thống",
                    staffName: a.createdBy || "Nhân viên",
                    content: `[${a.action}] ${summary}`,
                    amountVnd: 0,
                    paymentMethod: a.entityType || "Hệ thống",
                    status: "Đã ghi nhận",
                };
            });
        } else {
            // Default: Fishing sessions
            title = "Chi tiết Các phiên / Vé câu";
            const where: Prisma.FishingSessionWhereInput = {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
            };
            if (metric === "activeSessions") where.status = SessionStatus.ACTIVE;
            else if (metric === "completedSessions") where.status = SessionStatus.COMPLETED;
            else if (metric === "cancelledSessions") where.status = SessionStatus.CANCELLED;

            totalCount = await prisma.fishingSession.count({ where });
            const sessions = await prisma.fishingSession.findMany({
                where,
                include: {
                    customer: true,
                    package: true,
                    hutLinks: { include: { hut: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            });

            items = sessions.map(s => {
                const spots = s.hutLinks.map(l => l.hut.name).join(", ") || "Chưa gắn ô";
                return {
                    id: s.id,
                    code: s.id.substring(0, 8).toUpperCase(),
                    dateTime: formatVnDateTimeDisplay(s.startAt),
                    customerName: s.customer?.name || "Khách câu",
                    staffName: "Nhân viên trực hồ",
                    content: `Gói [${s.packageNameSnapshot}] - Ô: ${spots}`,
                    amountVnd: s.packagePriceVndSnapshot,
                    paymentMethod: "Theo vé",
                    status: s.status === SessionStatus.ACTIVE ? "Đang câu" : s.status === SessionStatus.COMPLETED ? "Đã xong" : "Đã hủy",
                };
            });
        }

        return NextResponse.json({
            title,
            metric,
            timeLabel: dateRange.label,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            items,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in GET /api/reports/drilldown:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: message },
            { status: 500 }
        );
    }
}
