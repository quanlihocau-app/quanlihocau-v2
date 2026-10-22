import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";

const reconcileSchema = z.object({
    accountId: z.string().uuid("Tài khoản quỹ không hợp lệ."),
    actualBalanceVnd: z.number().int("Số dư thực tế phải là số nguyên VNĐ."),
    reason: z.string().trim().max(255).optional(),
});

export async function GET() {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_RECONCILE");
        const lakeId = tenantContext.lakeId;

        const records = await prisma.reconciliationRecord.findMany({
            where: { lakeId },
            orderBy: { checkedAt: "desc" },
            take: 50,
            include: {
                account: { select: { id: true, name: true, accountType: true } },
            },
        });

        // Lấy tên người kiểm kê
        const userIds = [...new Set(records.map((r) => r.checkedById))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u.name]));

        const enriched = records.map((r) => ({
            ...r,
            checkedByName: userMap.get(r.checkedById) || "Nhân viên",
        }));

        return NextResponse.json({ records: enriched });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Không thể tải lịch sử kiểm kê." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_RECONCILE");
        const lakeId = tenantContext.lakeId;

        const body = await request.json().catch(() => null);
        const parsed = reconcileSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { accountId, actualBalanceVnd, reason } = parsed.data;

        const account = await prisma.financialAccount.findFirst({
            where: { id: accountId, lakeId },
        });

        if (!account) {
            return NextResponse.json({ error: "Không tìm thấy tài khoản quỹ." }, { status: 404 });
        }

        // Tính số dư sổ sách hệ thống
        const [receiptsAgg, expensesAgg, transfersOutAgg, transfersInAgg] = await Promise.all([
            prisma.financialTransaction.aggregate({
                where: { lakeId, accountId, type: "RECEIPT", status: "APPROVED" },
                _sum: { amountVnd: true },
            }),
            prisma.financialTransaction.aggregate({
                where: { lakeId, accountId, type: "EXPENSE", status: "APPROVED" },
                _sum: { amountVnd: true },
            }),
            prisma.fundTransfer.aggregate({
                where: { lakeId, fromAccountId: accountId },
                _sum: { amountVnd: true, feeAmountVnd: true },
            }),
            prisma.fundTransfer.aggregate({
                where: { lakeId, toAccountId: accountId },
                _sum: { amountVnd: true },
            }),
        ]);

        const systemBalanceVnd =
            account.initialBalanceVnd +
            (receiptsAgg._sum.amountVnd || 0) -
            (expensesAgg._sum.amountVnd || 0) +
            (transfersInAgg._sum.amountVnd || 0) -
            ((transfersOutAgg._sum.amountVnd || 0) + (transfersOutAgg._sum.feeAmountVnd || 0));

        const differenceVnd = actualBalanceVnd - systemBalanceVnd;

        const record = await prisma.reconciliationRecord.create({
            data: {
                lakeId,
                accountId,
                systemBalanceVnd,
                actualBalanceVnd,
                differenceVnd,
                reason: reason || null,
                checkedById: tenantContext.userId,
            },
            include: {
                account: { select: { id: true, name: true } },
            },
        });

        // Ghi AuditEvent
        await prisma.auditEvent.create({
            data: {
                lakeId,
                entityType: "ReconciliationRecord",
                entityId: record.id,
                action: "FUND_RECONCILED",
                payload: JSON.stringify({
                    account: account.name,
                    systemBalanceVnd,
                    actualBalanceVnd,
                    differenceVnd,
                    reason,
                }),
                createdBy: tenantContext.userId,
            },
        });

        return NextResponse.json(
            {
                message: "Đã lưu kết quả kiểm kê đối soát quỹ.",
                record,
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
        return NextResponse.json({ error: "Lỗi hệ thống khi kiểm kê quỹ." }, { status: 500 });
    }
}
