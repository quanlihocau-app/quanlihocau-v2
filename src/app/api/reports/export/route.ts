import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { InvoiceStatus, PaymentMethod } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    DatePreset,
    formatVnDateDisplay,
    formatVnDateTimeDisplay,
    getDateRangeForPreset,
} from "@/lib/reports/date-utils";
import { getTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

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

        const format = searchParams.get("format") || "csv"; // csv, excel
        const preset = (searchParams.get("preset") as DatePreset) || "today";
        const customFrom = searchParams.get("from") || undefined;
        const customTo = searchParams.get("to") || undefined;
        const customFromTime = searchParams.get("fromTime") || "00:00";
        const customToTime = searchParams.get("toTime") || "23:59";

        const dateRange = getDateRangeForPreset(
            preset,
            new Date(),
            customFrom,
            customTo,
            customFromTime,
            customToTime
        );

        // Fetch lake info
        const lake = await prisma.lake.findUnique({
            where: { id: lakeId },
        });
        const lakeName = lake?.name || "Hồ câu";

        // Fetch invoices in range
        const invoices = await prisma.invoice.findMany({
            where: {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
                status: { not: InvoiceStatus.VOIDED },
            },
            include: {
                customer: true,
                fishingSession: true,
                payments: true,
                lines: true,
            },
            orderBy: { createdAt: "desc" },
        });

        // Fetch expenses in range
        const expenses = await prisma.expense.findMany({
            where: {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
            },
            include: { payments: true },
            orderBy: { createdAt: "desc" },
        });

        // Fetch fish buybacks in range
        const fishBuybacks = await prisma.fishBuyback.findMany({
            where: {
                lakeId,
                createdAt: { gte: dateRange.from, lte: dateRange.to },
            },
            include: { fishType: true },
            orderBy: { createdAt: "desc" },
        });

        // Compute summaries
        let ticketRevenue = 0;
        let productRevenue = 0;
        let overtimeRevenue = 0;
        let otherRevenue = 0;

        for (const inv of invoices) {
            for (const line of inv.lines) {
                if (line.productId) productRevenue += line.totalVnd;
                else if (line.name.toLowerCase().includes("thêm giờ") || line.name.toLowerCase().includes("phụ trội")) overtimeRevenue += line.totalVnd;
                else if (inv.fishingSessionId) ticketRevenue += line.totalVnd;
                else otherRevenue += line.totalVnd;
            }
        }

        const totalRevenue = ticketRevenue + productRevenue + overtimeRevenue + otherRevenue;
        const totalExpense = expenses.reduce((acc, e) => acc + e.amountVnd, 0);
        const totalFishBuyback = fishBuybacks.reduce((acc, f) => acc + f.totalVnd, 0);
        const netProfit = totalRevenue - totalExpense - totalFishBuyback;

        // Build CSV rows with proper UTF-8 BOM
        const escapeCsv = (str: string | number | null | undefined) => {
            if (str === null || str === undefined) return '""';
            const s = String(str).replace(/"/g, '""');
            return `"${s}"`;
        };

        const rows: string[] = [];

        // Header block
        rows.push([escapeCsv("BÁO CÁO DOANH THU & HOẠT ĐỘNG HỒ CÂU")].join(","));
        rows.push([escapeCsv(`Tên hồ: ${lakeName}`)].join(","));
        rows.push([escapeCsv(`Khoảng thời gian: ${formatVnDateTimeDisplay(dateRange.from)} đến ${formatVnDateTimeDisplay(dateRange.to)} (${dateRange.label})`)].join(","));
        rows.push([escapeCsv(`Người xuất báo cáo: ${session.user.name || session.user.email} (${session.user.email})`)].join(","));
        rows.push([escapeCsv(`Thời gian xuất: ${formatVnDateTimeDisplay(new Date())}`)].join(","));
        rows.push("");

        // Summary block
        rows.push([escapeCsv("--- BẢNG TỔNG HỢP CHỈ SỐ DOANH THU & CHI PHÍ ---")].join(","));
        rows.push([escapeCsv("Chỉ số"), escapeCsv("Số tiền (VNĐ)")].join(","));
        rows.push([escapeCsv("1. Doanh thu vé câu"), escapeCsv(ticketRevenue)].join(","));
        rows.push([escapeCsv("2. Doanh thu sản phẩm & dịch vụ"), escapeCsv(productRevenue)].join(","));
        rows.push([escapeCsv("3. Tiền thêm giờ phụ trội"), escapeCsv(overtimeRevenue)].join(","));
        rows.push([escapeCsv("4. Thu khác"), escapeCsv(otherRevenue)].join(","));
        rows.push([escapeCsv("TỔNG DOANH THU"), escapeCsv(totalRevenue)].join(","));
        rows.push([escapeCsv("5. Tổng phiếu chi (Chi phí vận hành)"), escapeCsv(totalExpense)].join(","));
        rows.push([escapeCsv("6. Tổng tiền thu mua cá cần thủ"), escapeCsv(totalFishBuyback)].join(","));
        rows.push([escapeCsv("LỢI NHUẬN TẠM TÍNH"), escapeCsv(netProfit)].join(","));
        rows.push("");

        // Transactions block
        rows.push([escapeCsv("--- CHI TIẾT CÁC HÓA ĐƠN & PHIẾU THU ---")].join(","));
        rows.push([
            escapeCsv("Mã HĐ"),
            escapeCsv("Ngày giờ"),
            escapeCsv("Khách hàng"),
            escapeCsv("Nội dung"),
            escapeCsv("Tổng tiền (VNĐ)"),
            escapeCsv("PT Thanh toán"),
            escapeCsv("Trạng thái"),
        ].join(","));

        for (const inv of invoices) {
            const methods = Array.from(new Set(inv.payments.map(p => p.method === PaymentMethod.CASH ? "Tiền mặt" : "Chuyển khoản"))).join(", ") || "Chưa thanh toán";
            rows.push([
                escapeCsv(inv.id.substring(0, 8).toUpperCase()),
                escapeCsv(formatVnDateTimeDisplay(inv.createdAt)),
                escapeCsv(inv.customer?.name || "Khách vãng lai"),
                escapeCsv(inv.lines.map(l => `${l.name} (x${Number(l.quantity)})`).join("; ")),
                escapeCsv(inv.totalAmountVnd),
                escapeCsv(methods),
                escapeCsv(inv.status),
            ].join(","));
        }

        rows.push("");
        // Expenses block
        rows.push([escapeCsv("--- CHI TIẾT CÁC PHIẾU CHI ---")].join(","));
        rows.push([
            escapeCsv("Mã chi"),
            escapeCsv("Ngày giờ"),
            escapeCsv("Nội dung chi"),
            escapeCsv("Số tiền (VNĐ)"),
            escapeCsv("Phương thức"),
        ].join(","));

        for (const exp of expenses) {
            const m = exp.payments[0]?.method === PaymentMethod.CASH ? "Tiền mặt" : "Chuyển khoản";
            rows.push([
                escapeCsv(exp.id.substring(0, 8).toUpperCase()),
                escapeCsv(formatVnDateTimeDisplay(exp.createdAt)),
                escapeCsv(exp.description),
                escapeCsv(exp.amountVnd),
                escapeCsv(m),
            ].join(","));
        }

        const csvContent = "\uFEFF" + rows.join("\r\n");

        // Record Audit Log for compliance
        await prisma.auditEvent.create({
            data: {
                lakeId,
                entityType: "Report",
                entityId: preset,
                action: "EXPORT_REPORT",
                payload: JSON.stringify({
                    format,
                    dateRange: {
                        from: dateRange.from.toISOString(),
                        to: dateRange.to.toISOString(),
                        label: dateRange.label,
                    },
                    totalRevenue,
                    totalExpense,
                    netProfit,
                }),
                createdBy: session.user.email,
            },
        });

        const fromStr = formatVnDateDisplay(dateRange.from).replace(/\//g, "-");
        const toStr = formatVnDateDisplay(dateRange.to).replace(/\//g, "-");
        const fileName = `Bao-cao-doanh-thu_${fromStr}_den_${toStr}.${format === "excel" ? "xlsx" : "csv"}`;

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in GET /api/reports/export:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: message },
            { status: 500 }
        );
    }
}
