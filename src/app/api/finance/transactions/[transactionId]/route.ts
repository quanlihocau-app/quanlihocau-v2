import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";
import { assertClientIdsInLake, publicCustomer } from "@/lib/tenant-scope";
import { assertPeriodNotLocked } from "@/lib/financial/period-guard";
import { postApprovedCash } from "@/lib/financial/post-approved-cash";

const updateDraftSchema = z.object({
    amountVnd: z.number().int().positive().optional(),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER"]).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    accountId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1).max(255).optional(),
    note: z.string().trim().max(500).nullable().optional(),
    status: z.enum(["DRAFT", "APPROVED"]).optional(),
});

const cancelSchema = z.object({
    reason: z.string().trim().min(1, "Lý do hủy phiếu không được để trống.").max(255),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ transactionId: string }> },
) {
    try {
        const { transactionId } = await params;
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_VIEW_TRANSACTIONS");
        const lakeId = tenantContext.lakeId;

        const transaction = await prisma.financialTransaction.findFirst({
            where: { id: transactionId, lakeId },
            include: {
                category: true,
                account: true,
                customer: { select: { id: true, name: true, phoneNormalized: true, lakeId: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true } },
                invoice: { include: { lines: true } },
                expense: true,
                debtPayments: { include: { debt: true } },
            },
        });

        if (!transaction) {
            return NextResponse.json({ error: "Không tìm thấy phiếu giao dịch." }, { status: 404 });
        }

        // Lấy lịch sử thay đổi (AuditEvents) liên quan
        const auditLogs = await prisma.auditEvent.findMany({
            where: { lakeId, entityId: transaction.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({
            transaction: { ...transaction, customer: publicCustomer(transaction.customer, lakeId) },
            auditLogs,
        });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi khi lấy thông tin phiếu." }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ transactionId: string }> },
) {
    try {
        const { transactionId } = await params;
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_EDIT_DRAFT");
        const lakeId = tenantContext.lakeId;

        const txRecord = await prisma.financialTransaction.findFirst({
            where: { id: transactionId, lakeId },
        });

        if (!txRecord) {
            return NextResponse.json({ error: "Không tìm thấy phiếu giao dịch." }, { status: 404 });
        }

        // BẢO VỆ KẾ TOÁN: Chỉ cho phép sửa phiếu khi ở trạng thái DRAFT
        if (txRecord.status !== "DRAFT") {
            return NextResponse.json(
                {
                    error: "Phiếu đã được phê duyệt (APPROVED) hoặc đã hủy. Không thể chỉnh sửa trực tiếp. Vui lòng thực hiện quy trình Hủy phiếu có lưu vết.",
                },
                { status: 400 },
            );
        }

        await assertPeriodNotLocked(prisma, lakeId, txRecord.transactionDate);

        const body = await request.json().catch(() => null);
        const parsed = updateDraftSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        await assertClientIdsInLake(prisma, lakeId, {
            categoryId: parsed.data.categoryId,
            accountId: parsed.data.accountId,
        });

        const approving = parsed.data.status === "APPROVED";
        const updated = await prisma.$transaction(async (tx) => {
            const draft = await tx.financialTransaction.update({
                where: { id: transactionId },
                data: {
                    ...(parsed.data.amountVnd ? { amountVnd: parsed.data.amountVnd } : {}),
                    ...(parsed.data.paymentMethod ? { paymentMethod: parsed.data.paymentMethod } : {}),
                    ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
                    ...(parsed.data.accountId !== undefined ? { accountId: parsed.data.accountId } : {}),
                    ...(parsed.data.description ? { description: parsed.data.description } : {}),
                    ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
                    ...(!approving && parsed.data.status ? { status: parsed.data.status } : {}),
                },
            });

            if (!approving) {
                return tx.financialTransaction.findFirstOrThrow({
                    where: { id: transactionId },
                    include: { category: true, account: true },
                });
            }

            if (draft.paymentId) {
                return tx.financialTransaction.update({
                    where: { id: transactionId },
                    data: { status: "APPROVED", approvedById: tenantContext.userId },
                    include: { category: true, account: true },
                });
            }

            return postApprovedCash(tx, {
                lakeId,
                transactionId,
                type: draft.type,
                amountVnd: draft.amountVnd,
                paymentMethod: draft.paymentMethod,
                description: draft.description,
                code: draft.code,
                occurredAt: draft.transactionDate,
                idempotencyKey: draft.idempotencyKey || `approved:${draft.id}`,
                approvedById: tenantContext.userId,
            });
        });

        return NextResponse.json({ message: "Đã cập nhật phiếu nháp thành công.", transaction: updated });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi khi cập nhật phiếu." }, { status: 500 });
    }
}

/**
 * Hủy phiếu giao dịch (hoàn tiền / đảo ngược số dư có lưu vết audit)
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ transactionId: string }> },
) {
    try {
        const { transactionId } = await params;
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_CANCEL_TRANSACTIONS");
        const lakeId = tenantContext.lakeId;

        const txRecord = await prisma.financialTransaction.findFirst({
            where: { id: transactionId, lakeId },
        });

        if (!txRecord) {
            return NextResponse.json({ error: "Không tìm thấy phiếu giao dịch." }, { status: 404 });
        }

        if (txRecord.status === "CANCELLED" || txRecord.status === "REVERSED") {
            return NextResponse.json({ error: "Phiếu này đã được hủy trước đó." }, { status: 400 });
        }

        await assertPeriodNotLocked(prisma, lakeId, txRecord.transactionDate);

        let reason = "Người dùng hủy phiếu";
        try {
            const body = await request.json();
            const parsed = cancelSchema.safeParse(body);
            if (parsed.success) {
                reason = parsed.data.reason;
            }
        } catch {
            // Safe fallback
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.financialTransaction.update({
                where: { id: transactionId },
                data: {
                    status: "CANCELLED",
                    cancelledById: tenantContext.userId,
                    cancelledReason: reason,
                },
            });

            // Nếu phiếu có liên kết payment, tạo payment đảo ngược (reversal)
            if (txRecord.paymentId) {
                await tx.payment.create({
                    data: {
                        lakeId,
                        amountVnd: txRecord.amountVnd,
                        method: txRecord.paymentMethod,
                        direction: txRecord.type === "RECEIPT" ? "OUT" : "IN", // Đảo chiều dòng tiền
                        reversalOfId: txRecord.paymentId,
                    },
                });
            }

            // Ghi AuditEvent
            await tx.auditEvent.create({
                data: {
                    lakeId,
                    entityType: "FinancialTransaction",
                    entityId: transactionId,
                    action: "TRANSACTION_CANCELLED",
                    payload: JSON.stringify({
                        code: txRecord.code,
                        amountVnd: txRecord.amountVnd,
                        reason,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return updated;
        });

        return NextResponse.json({
            message: `Đã hủy phiếu ${result.code} thành công. Dòng tiền đã được điều chỉnh đảo ngược.`,
            transaction: result,
        });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống khi hủy phiếu." }, { status: 500 });
    }
}
