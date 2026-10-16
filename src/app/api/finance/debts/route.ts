import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission } from "@/lib/financial/permissions";
import { generateFinancialCode } from "@/lib/financial/code-generator";

const createDebtSchema = z.object({
    type: z.enum(["RECEIVABLE", "PAYABLE"], {
        message: "Loại công nợ phải là RECEIVABLE (Phải thu khách) hoặc PAYABLE (Phải trả nhà cung cấp).",
    }),
    customerId: z.string().uuid().optional().nullable(),
    supplierName: z.string().trim().max(100).optional().nullable(),
    title: z.string().trim().min(1, "Nội dung khoản nợ không được để trống.").max(255),
    totalAmountVnd: z.number().int().positive("Số tiền nợ phải lớn hơn 0.").max(2147483647),
    dueDate: z.string().datetime().optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
    invoiceId: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext();
        assertFinancialPermission(tenantContext, "FINANCIAL_MANAGE_DEBT");
        const lakeId = tenantContext.lakeId;

        const url = new URL(request.url);
        const type = url.searchParams.get("type"); // RECEIVABLE | PAYABLE
        const status = url.searchParams.get("status"); // PENDING | PARTIAL | SETTLED | OVERDUE
        const customerId = url.searchParams.get("customerId");
        const q = url.searchParams.get("q")?.trim();
        const overdueOnly = url.searchParams.get("overdueOnly") === "true";

        const where: Prisma.DebtWhereInput = { lakeId };
        if (type === "RECEIVABLE" || type === "PAYABLE") {
            where.type = type;
        }
        if (status) {
            where.status = status as "PENDING" | "PARTIAL" | "SETTLED" | "CANCELLED";
        }
        if (customerId) {
            where.customerId = customerId;
        }
        if (overdueOnly) {
            where.remainingAmountVnd = { gt: 0 };
            where.dueDate = { lt: new Date() };
        }
        if (q) {
            where.OR = [
                { code: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { supplierName: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
            ];
        }

        const debts = await prisma.debt.findMany({
            where,
            orderBy: [{ createdAt: "desc" }],
            include: {
                customer: { select: { id: true, name: true, phoneNormalized: true } },
                invoice: { select: { id: true, totalAmountVnd: true } },
                payments: {
                    orderBy: { paymentDate: "desc" },
                    take: 5,
                },
                _count: { select: { payments: true } },
            },
        });

        // Kiểm tra và cập nhật trạng thái nợ quá hạn
        const now = new Date();
        const enrichedDebts = debts.map((d) => {
            const isOverdue =
                d.status !== "SETTLED" && d.status !== "CANCELLED" && d.dueDate && new Date(d.dueDate) < now;
            return {
                ...d,
                isOverdue: Boolean(isOverdue),
                computedStatus: isOverdue ? "OVERDUE" : d.status,
            };
        });

        const totalDebtVnd = debts.reduce((sum, d) => sum + d.totalAmountVnd, 0);
        const totalPaidVnd = debts.reduce((sum, d) => sum + d.paidAmountVnd, 0);
        const totalRemainingVnd = debts.reduce((sum, d) => sum + d.remainingAmountVnd, 0);

        return NextResponse.json({
            debts: enrichedDebts,
            summary: {
                totalDebtVnd,
                totalPaidVnd,
                totalRemainingVnd,
            },
        });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Không thể tải danh sách công nợ." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext();
        assertFinancialPermission(tenantContext, "FINANCIAL_MANAGE_DEBT");
        const lakeId = tenantContext.lakeId;

        const body = await request.json().catch(() => null);
        const parsed = createDebtSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { type, customerId, supplierName, title, totalAmountVnd, dueDate: dueDateStr, note, invoiceId } =
            parsed.data;

        if (type === "RECEIVABLE" && !customerId && !supplierName) {
            return NextResponse.json(
                { error: "Vui lòng chọn khách hàng hoặc nhập tên đối tượng công nợ." },
                { status: 400 },
            );
        }

        if (type === "PAYABLE" && !supplierName) {
            return NextResponse.json(
                { error: "Vui lòng nhập tên nhà cung cấp cần trả nợ." },
                { status: 400 },
            );
        }

        const dueDate = dueDateStr ? new Date(dueDateStr) : null;

        const code = await generateFinancialCode(prisma, lakeId, "CN");

        const debt = await prisma.debt.create({
            data: {
                lakeId,
                code,
                type,
                customerId: customerId || null,
                supplierName: supplierName || null,
                title,
                totalAmountVnd,
                paidAmountVnd: 0,
                remainingAmountVnd: totalAmountVnd,
                dueDate,
                status: "PENDING",
                note: note || null,
                invoiceId: invoiceId || null,
            },
            include: {
                customer: true,
            },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId,
                entityType: "Debt",
                entityId: debt.id,
                action: "DEBT_RECORDED",
                payload: JSON.stringify({
                    code,
                    type,
                    title,
                    totalAmountVnd,
                    customerId,
                    supplierName,
                }),
                createdBy: tenantContext.userId,
            },
        });

        return NextResponse.json(
            { message: "Đã ghi nhận khoản công nợ thành công.", debt },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống khi tạo khoản nợ." }, { status: 500 });
    }
}
