import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";
import { assertClientIdsInLake, belongsToLake } from "@/lib/tenant-scope";
import { generateFinancialCode } from "@/lib/financial/code-generator";
import { assertPeriodNotLocked } from "@/lib/financial/period-guard";

const recordDebtPaymentSchema = z.object({
    amountVnd: z.number().int().positive("Số tiền thanh toán phải lớn hơn 0.").max(2147483647),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER"]).default("CASH"),
    accountId: z.string().uuid("Tài khoản quỹ không hợp lệ.").optional().nullable(),
    paymentDate: z.string().datetime().optional(),
    note: z.string().trim().max(255).optional().nullable(),
});

export async function POST(
    request: Request,
    { params }: { params: Promise<{ debtId: string }> },
) {
    try {
        const { debtId } = await params;
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_MANAGE_DEBT");
        const lakeId = tenantContext.lakeId;

        const debt = await prisma.debt.findFirst({
            where: { id: debtId, lakeId },
            include: { customer: { select: { id: true, name: true, lakeId: true } } },
        });

        if (!debt) {
            return NextResponse.json({ error: "Không tìm thấy khoản công nợ." }, { status: 404 });
        }

        if (debt.status === "SETTLED" || debt.remainingAmountVnd <= 0) {
            return NextResponse.json(
                { error: "Khoản công nợ này đã được thanh toán toàn bộ." },
                { status: 400 },
            );
        }

        const body = await request.json().catch(() => null);
        const parsed = recordDebtPaymentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { amountVnd, paymentMethod, accountId, paymentDate: pDateStr, note } = parsed.data;

        if (amountVnd > debt.remainingAmountVnd) {
            return NextResponse.json(
                {
                    error: `Số tiền thanh toán (${amountVnd.toLocaleString("vi-VN")} đ) không được lớn hơn số nợ còn lại (${debt.remainingAmountVnd.toLocaleString("vi-VN")} đ).`,
                },
                { status: 400 },
            );
        }

        const payDate = pDateStr ? new Date(pDateStr) : new Date();

        await assertPeriodNotLocked(prisma, lakeId, payDate);

        const result = await prisma.$transaction(async (tx) => {
            // Chọn quỹ mặc định nếu không truyền
            await assertClientIdsInLake(tx, lakeId, { accountId });
            let targetAccountId = accountId;
            if (!targetAccountId) {
                const defaultAcc = await tx.financialAccount.findFirst({
                    where: { lakeId, isDefault: true },
                });
                targetAccountId = defaultAcc?.id || null;
            }

            const newPaid = debt.paidAmountVnd + amountVnd;
            const newRemaining = debt.totalAmountVnd - newPaid;
            const newStatus = newRemaining === 0 ? "SETTLED" : "PARTIAL";

            // Tạo phiếu thu hoặc chi tương ứng
            const isReceivable = debt.type === "RECEIVABLE";
            const codePrefix = isReceivable ? "PT" : "PC";
            const txCode = await generateFinancialCode(tx, lakeId, codePrefix);

            // Tìm danh mục mặc định cho thu/trả nợ
            const catName = isReceivable ? "Thu hồi công nợ khách" : "Thanh toán nhà cung cấp";
            const category = await tx.financialCategory.findFirst({
                where: { lakeId, name: catName },
            });

            const sameLakeCustomer = debt.customer && belongsToLake(debt.customer.lakeId, lakeId) ? debt.customer : null;
            const payerOrReceiver = sameLakeCustomer?.name || debt.supplierName || "Đối tác";
            const description = isReceivable
                ? `Thu nợ: [${debt.code}] ${debt.title} - ${payerOrReceiver}`
                : `Trả nợ: [${debt.code}] ${debt.title} - ${payerOrReceiver}`;

            const financialTx = await tx.financialTransaction.create({
                data: {
                    lakeId,
                    code: txCode,
                    type: isReceivable ? "RECEIPT" : "EXPENSE",
                    amountVnd,
                    paymentMethod,
                    status: "APPROVED",
                    categoryId: category?.id || null,
                    accountId: targetAccountId,
                    customerId: sameLakeCustomer ? debt.customerId : null,
                    supplierName: debt.supplierName,
                    payerOrReceiver,
                    description,
                    note: note || null,
                    transactionDate: payDate,
                    createdById: tenantContext.userId,
                    approvedById: tenantContext.userId,
                },
            });

            // Tạo bản ghi DebtPayment
            const debtPayment = await tx.debtPayment.create({
                data: {
                    lakeId,
                    debtId,
                    transactionId: financialTx.id,
                    amountVnd,
                    paymentMethod,
                    paymentDate: payDate,
                    note: note || null,
                    createdById: tenantContext.userId,
                },
            });

            // Cập nhật khoản công nợ
            const updatedDebt = await tx.debt.update({
                where: { id: debtId },
                data: {
                    paidAmountVnd: newPaid,
                    remainingAmountVnd: newRemaining,
                    status: newStatus,
                },
            });

            // Ghi AuditEvent
            await tx.auditEvent.create({
                data: {
                    lakeId,
                    entityType: "DebtPayment",
                    entityId: debtPayment.id,
                    action: "DEBT_PAYMENT_RECORDED",
                    payload: JSON.stringify({
                        debtCode: debt.code,
                        amountVnd,
                        remainingAmountVnd: newRemaining,
                        txCode,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return { updatedDebt, debtPayment, financialTx };
        });

        return NextResponse.json(
            {
                message: `Đã ghi nhận thanh toán công nợ thành công (${amountVnd.toLocaleString("vi-VN")} đ).`,
                debt: result.updatedDebt,
                payment: result.debtPayment,
                transaction: result.financialTx,
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
            { error: (error instanceof Error ? error.message : null) || "Lỗi hệ thống khi thanh toán nợ." },
            { status: 500 },
        );
    }
}
