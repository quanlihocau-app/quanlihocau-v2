import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { csvCell, summarizeMoney } from "@/lib/finance";
import { financialScope } from "@/lib/reports/financial-scope";

const filters = z.object({
    from: z.iso.date(), to: z.iso.date(),
    fromTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("00:00"),
    toTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("23:59"),
    method: z.enum(["CASH", "BANK_TRANSFER"]).optional(),
    direction: z.enum(["IN", "OUT"]).optional(),
    scope: z.enum(["manual", "all"]).default("manual"),
    q: z.string().trim().max(100).optional(),
    areaId: z.string().uuid().optional(), hutId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(), packageId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(), employeeId: z.string().uuid().optional(),
    sessionStatus: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    export: z.enum(["csv"]).optional(),
}).refine(v => `${v.from} ${v.fromTime}` <= `${v.to} ${v.toTime}`, { message: "Ngày kết thúc phải sau ngày bắt đầu." });

export async function GET(request: Request) {
    try {
        const context = await requireTenantContext([Role.OWNER, Role.MANAGER]);
        const parsed = filters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!parsed.success) return NextResponse.json({ error: "Bộ lọc ngày hoặc phương thức không hợp lệ." }, { status: 400 });
        const f = parsed.data;
        const scope = await financialScope(context.lakeId, new URL(request.url).searchParams);
        const from = new Date(`${f.from}T${f.fromTime}:00+07:00`);
        const to = new Date(`${f.to}T${f.toTime}:59.999+07:00`);
        const where: Prisma.PaymentWhereInput = { ...scope.payment,
            createdAt: { gte: from, lte: to }, method: f.method, direction: f.direction };
        const conditions: Prisma.PaymentWhereInput[] = [];
        if (f.scope === "manual") conditions.push({ OR: [
            { expenseId: { not: null } },
            { invoice: { fishingSessionId: null, lines: { some: { name: { startsWith: "Thu khác: " } } } } },
        ] });
        if (f.q) conditions.push({ OR: [
            { expense: { description: { contains: f.q, mode: "insensitive" } } },
            { invoice: { lines: { some: { name: { contains: f.q, mode: "insensitive" } } } } },
        ] });
        if (conditions.length) where.AND = conditions;
        const limit = 30;
        const result = await prisma.$transaction(async tx => {
            const total = await tx.payment.count({ where });
            if (f.export && total > 10000) return null;
            const payments = await tx.payment.findMany({ where,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip: f.export ? 0 : (f.page - 1) * limit, take: f.export ? 10000 : limit,
                include: { expense: { select: { description: true } }, invoice: { select: { lines: { select: { name: true } } } } } });
            const groups = await tx.payment.groupBy({ by: ["method", "direction"], where,
                _sum: { amountVnd: true } });
            const refunds = await tx.payment.aggregate({ where: { AND: [where, { direction: "OUT", expenseId: null }] }, _sum: { amountVnd: true } });
            const legacy = await tx.expense.aggregate({ where: { lakeId: context.lakeId,
                createdAt: { gte: from, lte: to }, payments: { none: {} } }, _sum: { amountVnd: true } });
            const entityIds = payments.flatMap(p => [p.invoiceId, p.expenseId].filter((id): id is string => Boolean(id)));
            const events = await tx.auditEvent.findMany({ where: { lakeId: context.lakeId, entityId: { in: entityIds },
                action: { in: ["RECEIPT_CREATED", "EXPENSE_CREATED"] } }, select: { entityId: true, createdBy: true } });
            const users = await tx.user.findMany({ where: { id: { in: events.map(e => e.createdBy) } }, select: { id: true, name: true } });
            const names = new Map(users.map(u => [u.id, u.name]));
            const creators = new Map(events.map(e => [e.entityId, names.get(e.createdBy) ?? "Tài khoản đã ngừng sử dụng"]));
            return { total, payments, creators, summary: summarizeMoney(groups.map(g => ({ ...g, amountVnd: g._sum.amountVnd ?? 0 })), refunds._sum.amountVnd ?? 0),
                unlinkedExpensesVnd: legacy._sum.amountVnd ?? 0 };
        }, { isolationLevel: "RepeatableRead" });
        if (!result) return NextResponse.json({ error: "Tối đa 10.000 giao dịch mỗi file. Hãy thu hẹp khoảng ngày." }, { status: 400 });
        const items = result.payments.map(p => ({ id: p.id, createdAt: p.createdAt.toISOString(),
            amountVnd: p.amountVnd, direction: p.direction, method: p.method,
            description: p.expense?.description ?? p.invoice?.lines.map(l => l.name).join("; ") ?? "Giao dịch khác",
            invoiceId: p.invoiceId, reversalOfId: p.reversalOfId,
            expenseId: p.expenseId,
            recordedBy: result.creators.get(p.expenseId ?? p.invoiceId ?? "") ?? "Hệ thống" }));
        if (f.export) {
            const rows: (string | number)[][] = [["Mã giao dịch", "Ngày giờ", "Thu / Chi", "Phương thức", "Nội dung", "Số tiền VNĐ", "Người ghi"]];
            for (const p of items) rows.push([p.id, new Date(p.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
                p.direction === "IN" ? "Thu" : "Chi", p.method === "CASH" ? "Tiền mặt" : "Chuyển khoản", p.description, p.amountVnd, p.recordedBy]);
            return new NextResponse("\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"),
                { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="thu-chi-${f.from}-${f.to}.csv"`, "Cache-Control": "no-store" } });
        }
        return NextResponse.json({ items, summary: result.summary, unlinkedExpensesVnd: result.unlinkedExpensesVnd,
            pagination: { page: f.page, limit, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / limit)) } },
            { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không thể tải sổ thu chi." }, { status: 500 });
    }
}
