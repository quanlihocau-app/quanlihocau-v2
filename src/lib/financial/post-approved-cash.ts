import type { Prisma } from "@/generated/prisma/client";

/** Cash and the matching invoice or expense exist only after the slip is approved. */
export async function postApprovedCash(
    tx: Prisma.TransactionClient,
    input: {
        lakeId: string;
        transactionId: string;
        type: "RECEIPT" | "EXPENSE";
        amountVnd: number;
        paymentMethod: "CASH" | "BANK_TRANSFER";
        description: string;
        code: string;
        occurredAt: Date;
        idempotencyKey: string;
        approvedById: string;
    },
) {
    if (input.type === "RECEIPT") {
        const invoice = await tx.invoice.create({
            data: {
                lakeId: input.lakeId,
                status: "PAID",
                totalAmountVnd: input.amountVnd,
                subtotalVnd: input.amountVnd,
                paidAmountVnd: input.amountVnd,
                balanceDueVnd: 0,
                createdAt: input.occurredAt,
                lines: {
                    create: {
                        name: `Thu khác: [${input.code}] ${input.description}`,
                        quantity: 1,
                        unitPrice: input.amountVnd,
                        totalVnd: input.amountVnd,
                        createdAt: input.occurredAt,
                    },
                },
            },
        });
        const payment = await tx.payment.create({
            data: {
                lakeId: input.lakeId,
                invoiceId: invoice.id,
                amountVnd: input.amountVnd,
                method: input.paymentMethod,
                direction: "IN",
                idempotencyKey: input.idempotencyKey,
                createdAt: input.occurredAt,
            },
        });
        return tx.financialTransaction.update({
            where: { id: input.transactionId },
            data: {
                invoiceId: invoice.id,
                paymentId: payment.id,
                status: "APPROVED",
                approvedById: input.approvedById,
            },
            include: { category: true, account: true, customer: true },
        });
    }

    const expense = await tx.expense.create({
        data: {
            lakeId: input.lakeId,
            description: `[${input.code}] ${input.description}`,
            amountVnd: input.amountVnd,
            createdAt: input.occurredAt,
        },
    });
    const payment = await tx.payment.create({
        data: {
            lakeId: input.lakeId,
            expenseId: expense.id,
            amountVnd: input.amountVnd,
            method: input.paymentMethod,
            direction: "OUT",
            idempotencyKey: input.idempotencyKey,
            createdAt: input.occurredAt,
        },
    });
    return tx.financialTransaction.update({
        where: { id: input.transactionId },
        data: {
            expenseId: expense.id,
            paymentId: payment.id,
            status: "APPROVED",
            approvedById: input.approvedById,
        },
        include: { category: true, account: true, customer: true },
    });
}
