import type { Prisma } from "@/generated/prisma/client";

import { invoiceMoneyFromPayments } from "@/lib/money";

/**
 * Rewrite paidAmountVnd, refundedAmountVnd and balanceDueVnd from the
 * invoice's payments. VOIDED stays VOIDED and owes nothing. Callers pass
 * forceStatus after they have recorded the refund payments.
 */
export async function syncInvoiceTotals(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    lakeId: string,
    options?: { forceStatus?: "VOIDED" },
) {
    const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, lakeId },
        select: { id: true, status: true },
    });
    if (!invoice) return null;

    const [lines, payments] = await Promise.all([
        tx.invoiceLine.findMany({ where: { invoiceId }, select: { totalVnd: true } }),
        tx.payment.findMany({
            where: { invoiceId, lakeId },
            select: { amountVnd: true, direction: true },
        }),
    ]);

    const totalAmountVnd = lines.reduce((sum, line) => sum + line.totalVnd, 0);
    const money = invoiceMoneyFromPayments({
        totalAmountVnd,
        payments,
        status: options?.forceStatus ?? invoice.status,
    });

    const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
            totalAmountVnd,
            paidAmountVnd: money.paidAmountVnd,
            refundedAmountVnd: money.refundedAmountVnd,
            balanceDueVnd: money.balanceDueVnd,
            status: money.status,
        },
    });

    return { ...updated, ...money, totalAmountVnd };
}
