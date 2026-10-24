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
const hours = load("src/lib/fishing-hours.ts");
const customer = load("src/lib/ticket-customer.ts");
const hut = load("src/lib/hut-name.ts");
const vnd = load("src/lib/vnd-amount.ts");

const SUMMARY = "Tiền bill 50.000đ, Cấn trừ cá 50.000đ, Trả lại khách 25.000đ";

test("fish above the bill is cash out, and revenue stays 50.000 rather than 52.500 or -25.000", () => {
    assert.equal(Math.round(2.5 * 30_000), 75_000);
    const split = money.splitFishBuyback(50_000, 75_000);
    assert.equal(split.offsetVnd, 50_000);
    assert.equal(split.cashOutVnd, 25_000);

    const revenue = money.summarizeRevenue([{
        fishingSessionId: "session",
        lines: [
            { name: "Vé câu", totalVnd: 50_000 },
            { name: "Thu cá: Cá (2.5 kg)", totalVnd: -50_000, fishBuybackId: "fish" },
        ],
    }]);
    assert.equal(revenue.totalRevenue, 50_000);
    assert.notEqual(revenue.totalRevenue, 52_500);
    assert.notEqual(revenue.totalRevenue, -25_000);
    assert.notEqual(revenue.totalRevenue, 0);

    const payout = { amountVnd: 25_000, direction: "OUT", method: "CASH" };
    const reconciled = money.reconcileRevenue({
        revenueVnd: revenue.totalRevenue,
        payments: [payout],
        fishOffsetVnd: 50_000,
    });
    assert.equal(reconciled.stillOwedVnd, 0);
    assert.equal(reconciled.fishOffsetVnd, 50_000);
    assert.equal(reconciled.cashCollectedVnd, 0);
    assert.equal(reconciled.identityHolds, true);
    assert.equal(
        reconciled.cashCollectedVnd + reconciled.transferCollectedVnd + reconciled.stillOwedVnd + reconciled.fishOffsetVnd,
        50_000,
    );

    const drawer = money.drawerMovements([payout]);
    assert.equal(drawer.cashOut, 25_000);
    assert.equal(drawer.fishCashOutVnd, 25_000);
    assert.equal(money.isStandaloneFishCashOut(payout), true);
    assert.equal(money.isStandaloneFishCashOut({ ...payout, invoiceId: "bill" }), false);

    const fresh = money.settlementFigures({
        lines: [
            { name: "Vé câu", totalVnd: 50_000 },
            { name: "Thu cá: Cá (2.5 kg)", totalVnd: -50_000, fishBuybackId: "fish" },
        ],
        linkedBuybackVnd: 75_000,
        invoiceOutVnd: 0,
    });
    assert.equal(fresh.billVnd, 50_000);
    assert.equal(fresh.fishOffsetVnd, 50_000);
    assert.equal(fresh.cashReturnedVnd, 25_000);
    assert.equal(fresh.refundStillDueVnd, 0);
    assert.equal(fresh.summary, SUMMARY);
    assert.equal(money.closeSettlementSummary({ billVnd: 50_000, fishOffsetVnd: 50_000, cashReturnedVnd: 25_000 }), SUMMARY);

    const oldUncapped = money.settlementFigures({
        lines: [
            { name: "Vé câu", totalVnd: 50_000 },
            { name: "Thu cá: Cá (2.5 kg)", totalVnd: -75_000, fishBuybackId: "fish" },
        ],
        linkedBuybackVnd: 75_000,
        invoiceOutVnd: 0,
    });
    assert.equal(oldUncapped.refundStillDueVnd, 25_000);
    assert.equal(oldUncapped.billVnd, 50_000);

    const afterInvoiceRefund = money.settlementFigures({
        lines: oldUncapped && [
            { name: "Vé câu", totalVnd: 50_000 },
            { name: "Thu cá: Cá (2.5 kg)", totalVnd: -75_000, fishBuybackId: "fish" },
        ],
        linkedBuybackVnd: 75_000,
        invoiceOutVnd: 25_000,
    });
    assert.equal(afterInvoiceRefund.refundStillDueVnd, 0);
    assert.equal(afterInvoiceRefund.cashReturnedVnd, 25_000);
});

test("the selected customer name wins over the search prefix", () => {
    const picked = customer.resolveTicketCustomer({
        selectedCustomerId: "id-1",
        selectedCustomerName: "Khách Thử Một",
        typedName: "Khách Thử",
    });
    assert.equal(picked.mode, "EXISTING");
    assert.equal(picked.customerId, "id-1");
    assert.equal(picked.name, "Khách Thử Một");
    const body = customer.openSessionCustomerBody(picked);
    assert.equal(body.customerId, "id-1");
    assert.equal(body.customer.mode, "EXISTING");
    assert.equal(body.customer.id, "id-1");
    assert.equal(body.customer.name, "Khách Thử Một");

    const typed = customer.resolveTicketCustomer({ typedName: "Khách Thử" });
    assert.equal(typed.mode, "NEW");
    assert.equal(typed.name, "Khách Thử");

    const guest = customer.resolveTicketCustomer({ typedName: " " });
    assert.equal(guest.mode, "GUEST");
    assert.equal(guest.customerId, null);
});

test("a stored price of 32.500 is a whole đồng, not a thousand-step", () => {
    assert.equal(vnd.VND_INPUT_STEP, 1);
    assert.match(vnd.VND_INTEGER_MESSAGE, /32\.500/);
    assert.equal(vnd.explainVndInputValidity({ stepMismatch: true, badInput: false }), vnd.VND_INTEGER_MESSAGE);
    const sources = [
        "src/app/sessions/new/open-session-form.tsx",
        "src/app/pricing/package-manager.tsx",
        "src/app/fish-types/create-fish-type-form.tsx",
        "src/app/fish-types/fish-type-list.tsx",
        "src/app/invoices/record-payment-button.tsx",
    ];
    for (const path of sources) {
        const source = fs.readFileSync(path, "utf8");
        assert.equal(source.includes("step={1000}"), false, path);
        assert.equal(source.includes('step="1000"'), false, path);
        assert.equal(source.includes('step="10000"'), false, path);
        assert.equal(source.includes('step="5000"'), false, path);
        assert.equal(source.includes("VND_INPUT_STEP"), true, path);
    }
});

test("fishing hours follow the session clock, including an open session", () => {
    const now = new Date("2026-10-24T03:00:00.000Z");
    const open = hours.fishingSpan({
        startAt: new Date(now.getTime() - 90 * 60 * 1000),
        endedAt: null,
        plannedEndAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        status: "ACTIVE",
        now,
        windowFrom: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        windowTo: now,
    });
    assert.equal(open.minutes, 90);
    assert.equal(hours.fishingHoursFromMinutes(open.minutes), 1.5);
    assert.equal(open.overtimeMinutes, 0);

    const vnMidnight = new Date("2026-10-23T17:00:00.000Z");
    const overnight = hours.fishingSpan({
        startAt: new Date("2026-10-23T10:00:00.000Z"),
        endedAt: null,
        plannedEndAt: new Date("2026-10-24T10:00:00.000Z"),
        status: "ACTIVE",
        now,
        windowFrom: vnMidnight,
        windowTo: new Date("2026-10-24T16:59:59.999Z"),
    });
    assert.equal(overnight.minutes, 10 * 60);
    assert.ok(overnight.minutes > 0);

    const finished = hours.fishingSpan({
        startAt: new Date("2026-10-24T00:00:00.000Z"),
        endedAt: new Date("2026-10-24T02:00:00.000Z"),
        plannedEndAt: new Date("2026-10-24T05:00:00.000Z"),
        status: "COMPLETED",
        now,
    });
    assert.equal(finished.minutes, 120);
});

test("hut names are unique per lake without a database constraint", () => {
    assert.equal(hut.duplicateHutName(" Ô A ", [{ name: "ô a" }]), true);
    assert.equal(hut.duplicateHutName("Ô  A", [{ name: "ô a" }]), true);
    assert.equal(hut.duplicateHutName("Ô B", [{ name: "ô a" }]), false);
    assert.equal(hut.DUPLICATE_HUT_MESSAGE, "Ô câu này đã có trong hồ. Hãy đặt tên khác.");
    for (const path of [
        "src/app/api/huts/route.ts",
        "src/app/api/spots/route.ts",
        "src/app/sessions/quick-create-actions.ts",
    ]) {
        assert.equal(fs.readFileSync(path, "utf8").includes("duplicateHutName"), true, path);
    }
    const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
    const hutModel = schema.slice(schema.indexOf("model Hut "), schema.indexOf("model ", schema.indexOf("model Hut ") + 10));
    assert.equal(hutModel.includes("@@unique"), false);
});

test("the sessions header keeps Tạo vé visible while the title can shrink", () => {
    const page = fs.readFileSync("src/app/sessions/page.tsx", "utf8");
    assert.equal(page.includes("min-w-0 flex-1"), true);
    assert.equal(page.includes("truncate"), true);
    assert.equal(page.includes("whitespace-nowrap\">\n                                    PHIÊN"), false);
    const link = page.slice(page.indexOf('href="/sessions/new"'), page.indexOf("Tạo vé</span>"));
    assert.equal(link.includes("hidden sm:inline-flex"), false);
    assert.equal(link.includes("shrink-0"), true);
    assert.equal(link.includes("whitespace-nowrap"), true);
    const nav = fs.readFileSync("src/components/layout/mobile-bottom-nav.tsx", "utf8");
    assert.equal(nav.includes('label: "Tạo vé"'), true);
    const cashbook = fs.readFileSync("src/app/api/cashbook/route.ts", "utf8");
    assert.equal(cashbook.includes('invoiceId: null, expenseId: null, direction: "OUT"'), true);
    assert.equal(cashbook.includes("Trả lại khách (thu cá vượt tiền bill)"), true);
    assert.equal(fs.readFileSync("src/app/home/page.tsx", "utf8").includes("reconciliation.revenueVnd"), true);
    assert.equal(fs.readFileSync("src/app/api/reports/analytics/route.ts", "utf8").includes("fishingSpan"), true);
});
