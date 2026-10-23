import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path) {
    const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
        exports,
        require: (name) => { throw new Error(`Unexpected import ${name}`); },
    });
    return exports;
}

const money = load("src/lib/money.ts");
const dates = load("src/lib/reports/date-utils.ts");

test("shared identity explains the 23/10 shortfall as still owed, not missing cash", () => {
    const lines = [
        { name: "Vé 5 giờ", totalVnd: 3_600_000 },
        { name: "Nước", totalVnd: 690_000, productId: "drink" },
        { name: "Gia hạn 1 giờ", totalVnd: 440_000 },
    ];
    const revenue = money.summarizeRevenue([{ fishingSessionId: "session", lines }]);
    assert.equal(revenue.ticketRevenue, 3_600_000);
    assert.equal(revenue.productRevenue, 690_000);
    assert.equal(revenue.overtimeRevenue, 440_000);
    assert.equal(revenue.totalRevenue, 4_730_000);

    const payments = [
        { amountVnd: 890_000, direction: "IN", method: "CASH", invoiceId: "bill" },
        { amountVnd: 2_500_000, direction: "IN", method: "CASH", invoiceId: "bill" },
        { amountVnd: 900_000, direction: "IN", method: "BANK_TRANSFER", invoiceId: "bill" },
        { amountVnd: 2_580_000, direction: "OUT", method: "CASH", expenseId: "slip" },
        { amountVnd: 360_000, direction: "OUT", method: "CASH" },
    ];
    const reconciled = money.reconcileRevenue({
        revenueVnd: revenue.totalRevenue,
        payments,
        fishOffsetVnd: 0,
    });
    assert.equal(reconciled.cashCollectedVnd, 3_390_000);
    assert.equal(reconciled.transferCollectedVnd, 900_000);
    assert.equal(reconciled.stillOwedVnd, 440_000);
    assert.equal(reconciled.identityHolds, true);
    assert.equal(
        reconciled.cashCollectedVnd + reconciled.transferCollectedVnd + reconciled.stillOwedVnd + reconciled.fishOffsetVnd,
        4_730_000,
    );

    const drawer = money.drawerMovements(payments);
    assert.equal(drawer.fishCashOutVnd, 360_000);
    assert.equal(money.expectedDrawerCash(0, drawer.cashIn, drawer.cashOut), 890_000 + 2_500_000 - 2_580_000 - 360_000);
    assert.equal(reconciled.stillOwedVnd, 440_000);
});

test("opening cash is part of the drawer and a Saigon sale stays on the Saigon day", () => {
    assert.equal(money.expectedDrawerCash(500_000, 890_000, 200_000), 1_190_000);
    assert.equal(money.drawerDifference(1_000_000, 1_190_000), -190_000);

    const morning = new Date("2026-10-22T20:00:00.000Z");
    const vnStart = dates.startOfVnDay(new Date("2026-10-23T03:00:00.000Z"));
    assert.equal(vnStart.toISOString(), "2026-10-22T17:00:00.000Z");
    assert.equal(money.lineInWindow(morning, vnStart, dates.endOfVnDay(new Date("2026-10-23T03:00:00.000Z"))), true);

    const utcMidnight = new Date("2026-10-23T03:00:00.000Z");
    utcMidnight.setUTCHours(0, 0, 0, 0);
    assert.equal(money.lineInWindow(morning, utcMidnight, dates.endOfVnDay(new Date("2026-10-23T03:00:00.000Z"))), false);
});

test("prepaid overtime is not shown as collected zero dong", () => {
    const label = money.unbilledOvertimeLabel((3 * 60 + 7) * 60 * 1000 + 42 * 1000, 0);
    assert.equal(label, "Quá giờ 03:07 – chưa tính tiền");
    const view = money.sessionBalancePresentation({
        netBalanceVnd: 0,
        elapsedOvertimeMs: (3 * 60 + 7) * 60 * 1000 + 42 * 1000,
        recordedOvertimeVnd: 0,
    });
    assert.equal(view.kind, "unbilled-overtime");
    assert.equal(view.showAmount, false);
    assert.equal(view.label.includes("Đã đủ"), false);

    const open = money.openSessionMoney({
        now: new Date("2026-10-23T15:07:42.000Z"),
        plannedEndAt: new Date("2026-10-23T12:00:00.000Z"),
        lines: [
            { name: "Vé 5 giờ", totalVnd: 500_000 },
            { name: "Nước", totalVnd: 20_000, productId: "water" },
            { name: "Nước 2", totalVnd: 20_000, productId: "soda" },
        ],
        payments: [{ amountVnd: 540_000, direction: "IN", method: "CASH", invoiceId: "bill" }],
    });
    assert.equal(open.pendingAmountVnd, 0);
    assert.match(open.overtimeLabel, /^Quá giờ 03:07/);
});

test("paid amount is recomputed from payments, including a reversal", () => {
    const moneyState = money.invoiceMoneyFromPayments({
        totalAmountVnd: 200_000,
        payments: [
            { amountVnd: 200_000, direction: "IN" },
            { amountVnd: 50_000, direction: "OUT" },
        ],
    });
    assert.equal(moneyState.paidAmountVnd, 150_000);
    assert.equal(moneyState.refundedAmountVnd, 50_000);
    assert.equal(moneyState.balanceDueVnd, 50_000);
    assert.equal(moneyState.status, "PARTIALLY_PAID");

    const voided = money.invoiceMoneyFromPayments({
        totalAmountVnd: 200_000,
        status: "VOIDED",
        payments: [{ amountVnd: 200_000, direction: "OUT" }],
    });
    assert.equal(voided.status, "VOIDED");
    assert.equal(voided.balanceDueVnd, 0);
});

test("fish lines are not revenue and refunds split by method", () => {
    const revenue = money.summarizeRevenue([{
        fishingSessionId: "session",
        lines: [
            { name: "Vé", totalVnd: 100_000 },
            { name: "Thu cá", totalVnd: -40_000, fishBuybackId: "fish" },
        ],
    }]);
    assert.equal(revenue.totalRevenue, 100_000);
    assert.equal(money.fishOffsetVnd([{ totalVnd: -40_000, fishBuybackId: "fish" }]), 40_000);
    const refunds = money.refundsDueByMethod([
        { amountVnd: 70_000, direction: "IN", method: "CASH" },
        { amountVnd: 30_000, direction: "IN", method: "BANK_TRANSFER" },
        { amountVnd: 10_000, direction: "OUT", method: "CASH", expenseId: "slip" },
    ]);
    assert.equal(JSON.stringify(refunds), JSON.stringify([
        { method: "CASH", amountVnd: 70_000 },
        { method: "BANK_TRANSFER", amountVnd: 30_000 },
    ]));
});
