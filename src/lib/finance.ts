type MoneyMovement = { amountVnd: number; direction: string; method: string; expenseId?: string | null };

// Operating expenses reduce cash flow, but must not also reduce collected revenue.
export function summarizeMoney(payments: MoneyMovement[], refundAmount?: number) {
    let cashIn = 0, cashOut = 0, transferIn = 0, transferOut = 0, refunds = 0;
    for (const p of payments) {
        if (p.method === "CASH") {
            if (p.direction === "IN") cashIn += p.amountVnd;
            else cashOut += p.amountVnd;
        } else {
            if (p.direction === "IN") transferIn += p.amountVnd;
            else transferOut += p.amountVnd;
        }
        if (p.direction === "OUT" && !p.expenseId) refunds += p.amountVnd;
    }
    refunds = refundAmount ?? refunds;
    return { cashIn, cashOut, transferIn, transferOut, refunds,
        netCash: cashIn - cashOut, netTransfer: transferIn - transferOut,
        collectedRevenue: cashIn + transferIn - refunds };
}

export function csvCell(value: string | number) {
    // Neutralize spreadsheet formulas in user-entered descriptions.
    const text = String(value);
    return '"' + (typeof value === "string" && /^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
}

type RevenueInvoice = { fishingSessionId?: string | null; lines: Array<{
    productId?: string | null; fishBuybackId?: string | null; name: string; totalVnd: number;
}> };

export function summarizeRevenue(invoices: RevenueInvoice[]) {
    let ticketRevenue = 0, productRevenue = 0, overtimeRevenue = 0, otherRevenue = 0;
    let refundAmount = 0, refundCount = 0;
    for (const invoice of invoices) for (const line of invoice.lines) {
        // Buybacks are recorded as costs separately; deducting their invoice lines again doubles the cost.
        if (line.fishBuybackId) continue;
        if (line.totalVnd < 0) { refundAmount -= line.totalVnd; refundCount++; }
        else if (line.productId) productRevenue += line.totalVnd;
        else if (line.name.startsWith("Thu khác: ")) otherRevenue += line.totalVnd;
        else if (/thêm giờ|phụ trội|gia hạn/i.test(line.name)) overtimeRevenue += line.totalVnd;
        else if (invoice.fishingSessionId) ticketRevenue += line.totalVnd;
        else otherRevenue += line.totalVnd;
    }
    return { ticketRevenue, productRevenue, overtimeRevenue, otherRevenue, refundAmount, refundCount,
        totalRevenue: ticketRevenue + productRevenue + overtimeRevenue + otherRevenue - refundAmount };
}
