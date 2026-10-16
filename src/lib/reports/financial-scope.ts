import { PaymentMethod, Prisma, SessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// One scope for overview, drilldowns and exports so the same filters select the same records.
export async function financialScope(lakeId: string, params: URLSearchParams) {
    const areaId = params.get("areaId") || undefined, hutId = params.get("hutId") || undefined;
    const packageId = params.get("packageId") || undefined, customerId = params.get("customerId") || undefined;
    const productId = params.get("productId") || undefined, employeeId = params.get("employeeId") || undefined;
    const methodValue = params.get("paymentMethod") || params.get("method");
    const method = Object.values(PaymentMethod).find(v => v === methodValue);
    const status = Object.values(SessionStatus).find(v => v === params.get("sessionStatus"));
    const session: Prisma.FishingSessionWhereInput = { lakeId, customerId, packageId, status };
    if (hutId) session.hutLinks = { some: { hutId } };
    else if (areaId) session.hutLinks = { some: { hut: { areaId } } };
    const hasSessionFilter = Boolean(areaId || hutId || packageId || status);
    const hasSalesFilter = Boolean(hasSessionFilter || customerId || productId);
    const invoice: Prisma.InvoiceWhereInput = { lakeId, customerId };
    if (hasSessionFilter) invoice.fishingSession = session;
    if (productId) invoice.lines = { some: { productId } };
    if (method) invoice.payments = { some: { method } };
    const expense: Prisma.ExpenseWhereInput = { lakeId };
    if (method) expense.payments = { some: { method } };
    if (hasSalesFilter) expense.id = { in: [] };
    const payment: Prisma.PaymentWhereInput = { lakeId, method };
    if (hasSalesFilter) payment.invoice = invoice;
    if (employeeId) {
        const events = await prisma.auditEvent.findMany({ where: { lakeId, createdBy: employeeId },
            select: { entityType: true, entityId: true } });
        const ids = (type: string) => events.filter(e => e.entityType === type).map(e => e.entityId);
        invoice.OR = [{ id: { in: ids("Invoice") } }, { fishingSessionId: { in: ids("FishingSession") } }];
        session.OR = [{ id: { in: ids("FishingSession") } }, { invoices: { some: { id: { in: ids("Invoice") } } } }];
        expense.id = { in: hasSalesFilter ? [] : ids("Expense") };
        payment.OR = [{ id: { in: ids("Payment") } }, { invoice }, { expense }];
    }
    const buyback: Prisma.FishBuybackWhereInput = { lakeId };
    if (hasSalesFilter || employeeId || method) buyback.invoiceLines = { some: { invoice } };
    return { invoice, expense, payment, session, buyback, productId, method };
}
