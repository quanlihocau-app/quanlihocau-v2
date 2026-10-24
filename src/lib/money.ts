/**
 * One definition of revenue and cash for the daily report, shift close,
 * cashbook and finance overview.
 *
 * Revenue is what the bill says (ticket, product, extension, other), counted
 * when the line is added. Fish-buyback lines are not revenue. VOIDED invoices
 * are left out by the caller.
 *
 * Cash is a real payment, split by method. A fish line linked to a bill is an
 * offset, not cash. An unlinked fish buyback is a cash-out (no invoice, no
 * expense). An expense slip moves cash only after it is approved.
 *
 * Identity, exact on integers:
 *   Doanh thu = Tiền mặt đã thu + Chuyển khoản + Còn phải thu + Cấn trừ bằng cá
 *
 * Drawer, separate from that identity:
 *   Tiền mặt phải có trong két = tiền đầu ca + tiền mặt vào − tiền mặt ra
 */

export const OVERTIME_LINE_PATTERN = /thêm giờ|phụ trội|gia hạn/i;

export const REVENUE_IDENTITY =
    "Doanh thu = Tiền mặt đã thu + Chuyển khoản + Còn phải thu + Cấn trừ bằng cá";

export type MoneyMovement = {
    amountVnd: number;
    direction: string;
    method: string;
    expenseId?: string | null;
    invoiceId?: string | null;
};

export type RevenueLine = {
    productId?: string | null;
    fishBuybackId?: string | null;
    name: string;
    totalVnd: number;
    createdAt?: Date | string | null;
};

export type RevenueInvoice = {
    fishingSessionId?: string | null;
    lines: RevenueLine[];
};

export function isOvertimeLineName(name: string): boolean {
    return OVERTIME_LINE_PATTERN.test(name);
}

export function isFishOffsetLine(line: { fishBuybackId?: string | null }): boolean {
    return Boolean(line.fishBuybackId);
}

/** Cash leaving the drawer for fish that was not attached to a customer's bill. */
export function isStandaloneFishCashOut(payment: MoneyMovement): boolean {
    return payment.direction === "OUT" && !payment.expenseId && !payment.invoiceId;
}

export function summarizeMoney(payments: MoneyMovement[], refundAmount?: number) {
    let cashIn = 0, cashOut = 0, transferIn = 0, transferOut = 0, refunds = 0;
    for (const payment of payments) {
        if (payment.method === "CASH") {
            if (payment.direction === "IN") cashIn += payment.amountVnd;
            else cashOut += payment.amountVnd;
        } else {
            if (payment.direction === "IN") transferIn += payment.amountVnd;
            else transferOut += payment.amountVnd;
        }
        if (payment.direction === "OUT" && !payment.expenseId) refunds += payment.amountVnd;
    }
    refunds = refundAmount ?? refunds;
    return {
        cashIn,
        cashOut,
        transferIn,
        transferOut,
        refunds,
        netCash: cashIn - cashOut,
        netTransfer: transferIn - transferOut,
        collectedRevenue: cashIn + transferIn - refunds,
    };
}

export function csvCell(value: string | number) {
    const text = String(value);
    return '"' + (typeof value === "string" && /^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
}

export function summarizeRevenue(invoices: RevenueInvoice[]) {
    let ticketRevenue = 0, productRevenue = 0, overtimeRevenue = 0, otherRevenue = 0;
    let refundAmount = 0, refundCount = 0;
    for (const invoice of invoices) {
        for (const line of invoice.lines) {
            if (line.fishBuybackId) continue;
            if (line.totalVnd < 0) {
                refundAmount -= line.totalVnd;
                refundCount++;
            } else if (line.productId) productRevenue += line.totalVnd;
            else if (line.name.startsWith("Thu khác: ")) otherRevenue += line.totalVnd;
            else if (isOvertimeLineName(line.name)) overtimeRevenue += line.totalVnd;
            else if (invoice.fishingSessionId) ticketRevenue += line.totalVnd;
            else otherRevenue += line.totalVnd;
        }
    }
    return {
        ticketRevenue,
        productRevenue,
        overtimeRevenue,
        otherRevenue,
        refundAmount,
        refundCount,
        totalRevenue: ticketRevenue + productRevenue + overtimeRevenue + otherRevenue - refundAmount,
    };
}

export function lineInWindow(createdAt: Date | string | null | undefined, from: Date, to: Date): boolean {
    if (!createdAt) return false;
    const time = new Date(createdAt).getTime();
    return time >= from.getTime() && time <= to.getTime();
}

export function netPaidVnd(payments: Array<{ amountVnd: number; direction: string }>): number {
    return payments.reduce(
        (sum, payment) => payment.direction === "IN" ? sum + payment.amountVnd : sum - payment.amountVnd,
        0,
    );
}

export type InvoiceMoneyStatus = "DRAFT" | "PARTIALLY_PAID" | "PAID" | "VOIDED";

/** Recompute the stored paid/balance columns from the invoice's own payments. */
export function invoiceMoneyFromPayments(input: {
    totalAmountVnd: number;
    payments: Array<{ amountVnd: number; direction: string }>;
    status?: string | null;
}): {
    paidAmountVnd: number;
    refundedAmountVnd: number;
    balanceDueVnd: number;
    netPaidVnd: number;
    status: InvoiceMoneyStatus;
} {
    const net = netPaidVnd(input.payments);
    const refundedAmountVnd = input.payments
        .filter((payment) => payment.direction === "OUT")
        .reduce((sum, payment) => sum + payment.amountVnd, 0);
    const paidAmountVnd = Math.max(0, net);
    const voided = input.status === "VOIDED";
    const balanceDueVnd = voided ? 0 : Math.max(0, input.totalAmountVnd - net);
    let status: InvoiceMoneyStatus;
    if (voided) status = "VOIDED";
    else if (paidAmountVnd <= 0) status = "DRAFT";
    else if (net >= input.totalAmountVnd) status = "PAID";
    else status = "PARTIALLY_PAID";
    return { paidAmountVnd, refundedAmountVnd, balanceDueVnd, netPaidVnd: net, status };
}

export function fishOffsetVnd(lines: Array<{ fishBuybackId?: string | null; totalVnd: number }>): number {
    return Math.abs(lines.filter((line) => line.fishBuybackId).reduce((sum, line) => sum + line.totalVnd, 0));
}

/**
 * Positive nets are money already collected that a void or cancel must pay back,
 * one OUT payment per method so cash and transfer both reverse.
 */
export function refundsDueByMethod(
    payments: Array<{ amountVnd: number; direction: string; method: string; expenseId?: string | null }>,
): Array<{ method: "CASH" | "BANK_TRANSFER"; amountVnd: number }> {
    const nets = new Map<string, number>();
    for (const payment of payments) {
        if (payment.expenseId) continue;
        const method = payment.method === "CASH" ? "CASH" : "BANK_TRANSFER";
        const sign = payment.direction === "IN" ? 1 : -1;
        nets.set(method, (nets.get(method) ?? 0) + sign * payment.amountVnd);
    }
    return [...nets.entries()]
        .filter((entry): entry is ["CASH" | "BANK_TRANSFER", number] => entry[1] > 0)
        .map(([method, amountVnd]) => ({ method, amountVnd }));
}

/** Drawer movements. Standalone fish cash-outs reduce the drawer and are not refunds. */
export function drawerMovements(payments: MoneyMovement[]) {
    const fish = payments.filter(isStandaloneFishCashOut);
    const operating = payments.filter((payment) => !isStandaloneFishCashOut(payment));
    const base = summarizeMoney(operating);
    const fishCash = fish.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + payment.amountVnd, 0);
    const fishTransfer = fish.filter((payment) => payment.method !== "CASH").reduce((sum, payment) => sum + payment.amountVnd, 0);
    const cashOut = base.cashOut + fishCash;
    const transferOut = base.transferOut + fishTransfer;
    return {
        ...base,
        cashOut,
        transferOut,
        netCash: base.cashIn - cashOut,
        netTransfer: base.transferIn - transferOut,
        fishCashOutVnd: fishCash + fishTransfer,
    };
}

export function collectionSides(payments: MoneyMovement[]): { cashCollectedVnd: number; transferCollectedVnd: number } {
    let cashCollectedVnd = 0;
    let transferCollectedVnd = 0;
    for (const payment of payments) {
        if (payment.expenseId || isStandaloneFishCashOut(payment)) continue;
        const sign = payment.direction === "IN" ? 1 : -1;
        if (payment.method === "CASH") cashCollectedVnd += sign * payment.amountVnd;
        else transferCollectedVnd += sign * payment.amountVnd;
    }
    return { cashCollectedVnd, transferCollectedVnd };
}

export function expectedDrawerCash(openingCashVnd: number, cashInVnd: number, cashOutVnd: number): number {
    return openingCashVnd + cashInVnd - cashOutVnd;
}

export function drawerDifference(actualCashVnd: number, expectedCashVnd: number): number {
    return actualCashVnd - expectedCashVnd;
}

export function reconcileRevenue(input: {
    revenueVnd: number;
    payments: MoneyMovement[];
    fishOffsetVnd: number;
}) {
    const sides = collectionSides(input.payments);
    const stillOwedVnd = input.revenueVnd - sides.cashCollectedVnd - sides.transferCollectedVnd - input.fishOffsetVnd;
    const summed = sides.cashCollectedVnd + sides.transferCollectedVnd + stillOwedVnd + input.fishOffsetVnd;
    return {
        revenueVnd: input.revenueVnd,
        cashCollectedVnd: sides.cashCollectedVnd,
        transferCollectedVnd: sides.transferCollectedVnd,
        fishOffsetVnd: input.fishOffsetVnd,
        stillOwedVnd,
        identity: REVENUE_IDENTITY,
        identityHolds: summed === input.revenueVnd,
    };
}

/** Continue a shift that closed recently; otherwise start at local midnight (passed in). */
export function shiftStartInstant(now: Date, lastClosedEnd: Date | null, startOfLocalDay: Date): Date {
    if (lastClosedEnd && now.getTime() - lastClosedEnd.getTime() < 12 * 60 * 60 * 1000) return lastClosedEnd;
    return startOfLocalDay;
}

export function formatOvertimeHm(elapsedMs: number): string {
    const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
}

/** Prepaid (or settled) sessions that run past the clock have no overtime line yet. */
export function unbilledOvertimeLabel(elapsedMs: number, recordedOvertimeVnd: number): string | null {
    if (elapsedMs <= 0 || recordedOvertimeVnd > 0) return null;
    return `Quá giờ ${formatOvertimeHm(elapsedMs)} – chưa tính tiền`;
}

export type SessionBalanceKind = "refund" | "due" | "settled" | "unbilled-overtime";

export function sessionBalancePresentation(input: {
    netBalanceVnd: number;
    elapsedOvertimeMs: number;
    recordedOvertimeVnd: number;
}): { kind: SessionBalanceKind; label: string; showAmount: boolean } {
    const overtimeLabel = unbilledOvertimeLabel(input.elapsedOvertimeMs, input.recordedOvertimeVnd);
    if (overtimeLabel && input.netBalanceVnd === 0) {
        return { kind: "unbilled-overtime", label: overtimeLabel, showAmount: false };
    }
    if (input.netBalanceVnd < 0) return { kind: "refund", label: "Thối lại:", showAmount: true };
    if (input.netBalanceVnd === 0) return { kind: "settled", label: "Đã thu đủ", showAmount: false };
    return { kind: "due", label: "Cần thu:", showAmount: true };
}

/**
 * A fish buyback offsets the bill only up to the amount that brings it to 0.
 * Anything above that leaves the drawer as cash. It is not negative revenue.
 * 2.5 kg × 30.000đ is exactly 75.000; on a 50.000 bill that is 50.000 offset
 * and 25.000 cash out. It is not 52.500.
 */
export function splitFishBuyback(billBeforeVnd: number, buybackVnd: number): { offsetVnd: number; cashOutVnd: number } {
    const room = Math.max(0, Math.round(billBeforeVnd));
    const buyback = Math.max(0, Math.round(buybackVnd));
    const offsetVnd = Math.min(room, buyback);
    return { offsetVnd, cashOutVnd: buyback - offsetVnd };
}

export function formatVndGrouped(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + "đ";
}

export function closeSettlementSummary(input: { billVnd: number; fishOffsetVnd: number; cashReturnedVnd: number }): string {
    return `Tiền bill ${formatVndGrouped(input.billVnd)}, Cấn trừ cá ${formatVndGrouped(input.fishOffsetVnd)}, Trả lại khách ${formatVndGrouped(input.cashReturnedVnd)}`;
}

/**
 * One reading of a closed ticket: the bill (revenue), the fish that nets it,
 * and the cash already handed back. A second refund is due only when the
 * extra fish has not been paid out yet.
 */
export function settlementFigures(input: {
    lines: Array<{ fishBuybackId?: string | null; totalVnd: number; name: string; productId?: string | null }>;
    linkedBuybackVnd: number;
    invoiceOutVnd: number;
}): {
    billVnd: number;
    fishOffsetVnd: number;
    cashReturnedVnd: number;
    refundStillDueVnd: number;
    summary: string;
} {
    const billVnd = summarizeRevenue([{ fishingSessionId: "session", lines: input.lines }]).totalRevenue;
    const fishLines = fishOffsetVnd(input.lines);
    const fishOffset = Math.min(fishLines, Math.max(0, billVnd));
    const cashAlready = Math.max(0, input.linkedBuybackVnd - fishLines) + Math.max(0, input.invoiceOutVnd);
    const owed = Math.max(0, input.linkedBuybackVnd - fishOffset);
    const cashReturnedVnd = Math.max(cashAlready, owed);
    const refundStillDueVnd = Math.max(0, owed - cashAlready);
    return {
        billVnd,
        fishOffsetVnd: fishOffset,
        cashReturnedVnd,
        refundStillDueVnd,
        summary: closeSettlementSummary({ billVnd, fishOffsetVnd: fishOffset, cashReturnedVnd }),
    };
}

export function openSessionMoney(input: {
    now: Date;
    plannedEndAt: Date;
    lines: RevenueLine[];
    payments: MoneyMovement[];
}): { pendingAmountVnd: number; overtimeLabel: string | null; recordedOvertimeVnd: number } {
    const revenue = summarizeRevenue([{ fishingSessionId: "session", lines: input.lines }]).totalRevenue;
    const fish = fishOffsetVnd(input.lines);
    const sides = collectionSides(input.payments.map((payment) => ({ ...payment, invoiceId: payment.invoiceId ?? "session" })));
    const pendingAmountVnd = revenue - sides.cashCollectedVnd - sides.transferCollectedVnd - fish;
    const recordedOvertimeVnd = input.lines
        .filter((line) => !line.fishBuybackId && !line.productId && isOvertimeLineName(line.name) && line.totalVnd > 0)
        .reduce((sum, line) => sum + line.totalVnd, 0);
    const elapsed = input.now.getTime() - input.plannedEndAt.getTime();
    return {
        pendingAmountVnd,
        recordedOvertimeVnd,
        overtimeLabel: unbilledOvertimeLabel(elapsed, recordedOvertimeVnd),
    };
}
