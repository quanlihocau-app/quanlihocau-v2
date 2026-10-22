import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";

const periodSchema = z.object({
    name: z.string().trim().min(1, "Tên kỳ không được để trống.").max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    isLocked: z.boolean().default(true),
    note: z.string().trim().max(255).optional(),
});

export async function GET() {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_VIEW_REPORTS");
        const lakeId = tenantContext.lakeId;

        const periods = await prisma.financialPeriod.findMany({
            where: { lakeId },
            orderBy: { startDate: "desc" },
        });

        return NextResponse.json({ periods });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Không thể tải danh sách kỳ tài chính." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_LOCK_PERIOD");
        const lakeId = tenantContext.lakeId;

        const body = await request.json().catch(() => null);
        const parsed = periodSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { name, startDate, endDate, isLocked, note } = parsed.data;
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return NextResponse.json(
                { error: "Ngày bắt đầu kỳ phải trước hoặc bằng ngày kết thúc." },
                { status: 400 },
            );
        }

        const existing = await prisma.financialPeriod.findUnique({
            where: { lakeId_name: { lakeId, name } },
        });

        if (existing) {
            return NextResponse.json(
                { error: `Kỳ tài chính "${name}" đã tồn tại.` },
                { status: 409 },
            );
        }

        const period = await prisma.financialPeriod.create({
            data: {
                lakeId,
                name,
                startDate: start,
                endDate: end,
                isLocked,
                lockedAt: isLocked ? new Date() : null,
                lockedById: isLocked ? tenantContext.userId : null,
                note: note || null,
            },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId,
                entityType: "FinancialPeriod",
                entityId: period.id,
                action: isLocked ? "PERIOD_LOCKED" : "PERIOD_CREATED",
                payload: JSON.stringify({ name, startDate, endDate, isLocked }),
                createdBy: tenantContext.userId,
            },
        });

        return NextResponse.json(
            { message: isLocked ? "Đã khóa sổ kỳ tài chính thành công." : "Đã tạo kỳ tài chính.", period },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi khi quản lý kỳ tài chính." }, { status: 500 });
    }
}
