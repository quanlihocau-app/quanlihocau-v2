import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission } from "@/lib/financial/permissions";
import { generateFinancialCode } from "@/lib/financial/code-generator";
import { assertPeriodNotLocked } from "@/lib/financial/period-guard";

const transferSchema = z.object({
    fromAccountId: z.string().uuid("Tài khoản nguồn không hợp lệ."),
    toAccountId: z.string().uuid("Tài khoản đích không hợp lệ."),
    amountVnd: z.number().int().positive("Số tiền chuyển quỹ phải là số nguyên dương lớn hơn 0."),
    feeAmountVnd: z.number().int().nonnegative("Phí chuyển không được âm.").default(0),
    note: z.string().trim().max(255).optional(),
    transferredAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext();
        assertFinancialPermission(tenantContext, "FINANCIAL_VIEW_FUNDS");
        const lakeId = tenantContext.lakeId;

        const url = new URL(request.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit = 30;

        const [total, transfers] = await Promise.all([
            prisma.fundTransfer.count({ where: { lakeId } }),
            prisma.fundTransfer.findMany({
                where: { lakeId },
                orderBy: { transferredAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    fromAccount: { select: { id: true, name: true, accountType: true } },
                    toAccount: { select: { id: true, name: true, accountType: true } },
                },
            }),
        ]);

        return NextResponse.json({
            transfers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Không thể tải lịch sử chuyển quỹ." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext();
        assertFinancialPermission(tenantContext, "FINANCIAL_TRANSFER_FUNDS");
        const lakeId = tenantContext.lakeId;

        const body = await request.json().catch(() => null);
        const parsed = transferSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { fromAccountId, toAccountId, amountVnd, feeAmountVnd, note } = parsed.data;

        if (fromAccountId === toAccountId) {
            return NextResponse.json(
                { error: "Tài khoản nguồn và tài khoản đích không được trùng nhau." },
                { status: 400 },
            );
        }

        const transferDate = parsed.data.transferredAt ? new Date(parsed.data.transferredAt) : new Date();

        // Kiểm tra khóa sổ kỳ tài chính
        await assertPeriodNotLocked(prisma, lakeId, transferDate);

        const result = await prisma.$transaction(async (tx) => {
            const [fromAcc, toAcc] = await Promise.all([
                tx.financialAccount.findFirst({ where: { id: fromAccountId, lakeId } }),
                tx.financialAccount.findFirst({ where: { id: toAccountId, lakeId } }),
            ]);

            if (!fromAcc) {
                throw new Error("Tài khoản nguồn không tồn tại.");
            }
            if (!toAcc) {
                throw new Error("Tài khoản đích không tồn tại.");
            }

            const code = await generateFinancialCode(tx, lakeId, "CK");

            const transfer = await tx.fundTransfer.create({
                data: {
                    lakeId,
                    code,
                    fromAccountId,
                    toAccountId,
                    amountVnd,
                    feeAmountVnd,
                    note: note || null,
                    transferredAt: transferDate,
                    createdById: tenantContext.userId,
                },
                include: {
                    fromAccount: { select: { id: true, name: true } },
                    toAccount: { select: { id: true, name: true } },
                },
            });

            // Ghi AuditEvent
            await tx.auditEvent.create({
                data: {
                    lakeId,
                    entityType: "FundTransfer",
                    entityId: transfer.id,
                    action: "FUND_TRANSFERRED",
                    payload: JSON.stringify({
                        code,
                        from: fromAcc.name,
                        to: toAcc.name,
                        amountVnd,
                        feeAmountVnd,
                        note,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return transfer;
        });

        return NextResponse.json(
            {
                message: "Chuyển tiền giữa các quỹ thành công.",
                transfer: result,
            },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: (error instanceof Error ? error.message : null) || "Lỗi hệ thống khi chuyển quỹ." },
            { status: 500 },
        );
    }
}
