import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";
import { ensureDefaultFinancialData } from "@/lib/financial/seed-defaults";

const createAccountSchema = z.object({
    name: z.string().trim().min(1, "Tên quỹ không được để trống.").max(100),
    accountType: z.enum(["CASH", "BANK", "WALLET"]),
    accountNumber: z.string().trim().max(50).optional(),
    bankName: z.string().trim().max(100).optional(),
    initialBalanceVnd: z.number().int().default(0),
    isDefault: z.boolean().default(false),
});

export async function GET() {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_VIEW_FUNDS");
        const lakeId = tenantContext.lakeId;

        await ensureDefaultFinancialData(prisma, lakeId);

        const accounts = await prisma.financialAccount.findMany({
            where: { lakeId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            include: {
                _count: {
                    select: { transactions: true, transfersFrom: true, transfersTo: true },
                },
            },
        });

        // Tính toán tổng tiền vào / tổng tiền ra thực tế cho từng quỹ
        const enrichedAccounts = await Promise.all(
            accounts.map(async (acc) => {
                const [receiptsAgg, expensesAgg, transfersOutAgg, transfersInAgg] = await Promise.all([
                    prisma.financialTransaction.aggregate({
                        where: { lakeId, accountId: acc.id, type: "RECEIPT", status: "APPROVED" },
                        _sum: { amountVnd: true },
                    }),
                    prisma.financialTransaction.aggregate({
                        where: { lakeId, accountId: acc.id, type: "EXPENSE", status: "APPROVED" },
                        _sum: { amountVnd: true },
                    }),
                    prisma.fundTransfer.aggregate({
                        where: { lakeId, fromAccountId: acc.id },
                        _sum: { amountVnd: true, feeAmountVnd: true },
                    }),
                    prisma.fundTransfer.aggregate({
                        where: { lakeId, toAccountId: acc.id },
                        _sum: { amountVnd: true },
                    }),
                ]);

                const totalIn = receiptsAgg._sum.amountVnd || 0;
                const totalOut = expensesAgg._sum.amountVnd || 0;
                const totalTransfersOut =
                    (transfersOutAgg._sum.amountVnd || 0) + (transfersOutAgg._sum.feeAmountVnd || 0);
                const totalTransfersIn = transfersInAgg._sum.amountVnd || 0;

                const calculatedBalance =
                    acc.initialBalanceVnd + totalIn - totalOut + totalTransfersIn - totalTransfersOut;

                return {
                    ...acc,
                    totalInVnd: totalIn,
                    totalOutVnd: totalOut,
                    totalTransfersInVnd: totalTransfersIn,
                    totalTransfersOutVnd: totalTransfersOut,
                    currentBalanceVnd: calculatedBalance,
                };
            }),
        );

        const totalFundBalanceVnd = enrichedAccounts.reduce((sum, a) => sum + a.currentBalanceVnd, 0);

        return NextResponse.json({
            accounts: enrichedAccounts,
            totalFundBalanceVnd,
        });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Không thể tải danh sách quỹ." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_MANAGE_FUNDS");
        const lakeId = tenantContext.lakeId;

        const body = await request.json().catch(() => null);
        const parsed = createAccountSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { name, accountType, accountNumber, bankName, initialBalanceVnd, isDefault } = parsed.data;

        const existing = await prisma.financialAccount.findUnique({
            where: {
                lakeId_name: { lakeId, name },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: `Tài khoản quỹ "${name}" đã tồn tại.` },
                { status: 409 },
            );
        }

        if (isDefault) {
            // Đặt tất cả tài khoản khác thành không mặc định
            await prisma.financialAccount.updateMany({
                where: { lakeId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const account = await prisma.financialAccount.create({
            data: {
                lakeId,
                name,
                accountType,
                accountNumber: accountNumber || null,
                bankName: bankName || null,
                initialBalanceVnd,
                currentBalanceVnd: initialBalanceVnd,
                isDefault,
                isActive: true,
            },
        });

        return NextResponse.json(
            { message: "Đã tạo tài khoản quỹ thành công.", account },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống khi tạo quỹ." }, { status: 500 });
    }
}
