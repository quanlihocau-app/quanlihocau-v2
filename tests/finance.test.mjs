import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

function load(path, modules = {}) {
    const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: n => {
        if (!(n in modules)) throw new Error(`Unexpected import ${n}`);
        return modules[n];
    }, Request, Response, URL, Map });
    return exports;
}
const finance = load("src/lib/finance.ts", { "./money": load("src/lib/money.ts") });
const quickActions = load("src/lib/quick-actions.ts");
test("Quick actions open only operational pages and dispatch only to cashbook lists", () => {
    for (const path of ["/home", "/reports", "/sessions/new", "/cashbook/receipt-id", "/expenses/cashbook", "/inventory"])
        assert.equal(quickActions.isQuickActionPage(path), true, path);
    for (const path of ["/", "/login", "/register", "/admin", "/home-fake", "/cashbook-fake"])
        assert.equal(quickActions.isQuickActionPage(path), false, path);
    assert.equal(quickActions.isCashbookList("/cashbook"), true);
    assert.equal(quickActions.isCashbookList("/expenses/cashbook"), true);
    assert.equal(quickActions.isCashbookList("/cashbook/receipt-id"), false);
    assert.equal(quickActions.cashbookQuickAction("receipt"), "receipt");
    assert.equal(quickActions.cashbookQuickAction("expense"), "expense");
    assert.equal(quickActions.cashbookQuickAction(null), null);
    assert.equal(quickActions.cashbookQuickAction("delete"), null);
});
class AuthenticationError extends Error {}
class ForbiddenError extends Error {}
const key = "7f2e9237-8309-44ea-b1f8-a692c9e031ea";

function routeHarness(path) {
    const state = { keys: new Map(), payments: [], expenses: [], invoices: [], audit: [], role: "OWNER", authenticated: true };
    const createdAt = new Date("2026-10-12T05:00:00Z");
    const tx = {
        idempotencyKey: { findUnique: async ({ where }) => state.keys.get(where.lakeId_key.key),
            create: async ({ data }) => { state.keys.set(data.key, data); return data; } },
        expense: { create: async ({ data }) => { const row = { ...data, id: "expense-1", createdAt }; state.expenses.push(row); return row; } },
        invoice: { create: async ({ data }) => { const row = { ...data, id: "invoice-1", createdAt }; state.invoices.push(row); return row; } },
        payment: { create: async ({ data }) => { state.payments.push(data); return data; } },
        auditEvent: { create: async ({ data }) => { state.audit.push(data); return data; } },
    };
    const route = load(path, {
        "next/server": { NextResponse: class extends Response { static json(body, init) { return Response.json(body, init); } } },
        zod: { z }, "@/generated/prisma/client": { Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" } },
        "@/lib/prisma": { prisma: { ...tx, $transaction: async fn => fn(tx) } },
        "@/lib/tenant": { AuthenticationError, ForbiddenError, requireTenantContext: async roles => {
            if (!state.authenticated) throw new AuthenticationError();
            if (!roles.includes(state.role)) throw new ForbiddenError();
            return { lakeId: "lake-1", userId: "user-1" };
        } },
    });
    const post = (body, requestKey = key) => route.POST(new Request("http://localhost/api/finance", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey }, body: JSON.stringify(body),
    }));
    return { state, post };
}
const body = { description: "Thanh toán dịch vụ", amountVnd: 200000, paymentMethod: "CASH", category: "Dịch vụ" };

test("Expense creates one cash movement; replay is safe and changed payload conflicts", async () => {
    const { state, post } = routeHarness("src/app/api/expenses/route.ts");
    assert.equal((await post(body)).status, 201);
    assert.equal((await post(body)).status, 201);
    assert.equal(state.expenses.length, 1);
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].direction, "OUT");
    assert.equal(state.payments[0].expenseId, "expense-1");
    assert.equal(state.payments[0].lakeId, "lake-1");
    assert.equal((await post({ ...body, amountVnd: 300000 })).status, 409);
    assert.equal((await post({ ...body, paymentMethod: "BANK_TRANSFER" })).status, 409);
    assert.equal(state.audit.length, 1);
});

test("Receipt creates paid invoice and income, with an auditable record", async () => {
    const { state, post } = routeHarness("src/app/api/receipts/route.ts");
    assert.equal((await post({ ...body, paymentMethod: "BANK_TRANSFER" })).status, 201);
    assert.equal(state.expenses.length, 0);
    assert.equal(state.invoices[0].status, "PAID");
    assert.equal(state.invoices[0].totalAmountVnd, 200000);
    assert.equal(state.invoices[0].lines.create.totalVnd, 200000);
    assert.equal(state.payments[0].invoiceId, "invoice-1");
    assert.equal(state.payments[0].method, "BANK_TRANSFER");
    assert.equal(state.payments[0].direction, "IN");
    assert.equal(state.audit[0].action, "RECEIPT_CREATED");
    assert.equal((await post({ ...body, paymentMethod: "BANK_TRANSFER" })).status, 201);
    assert.equal(state.invoices.length, 1);
});

for (const path of ["expenses", "receipts"]) {
    test(`${path}: role enforcement and invalid money never write data`, async () => {
        const { state, post } = routeHarness(`src/app/api/${path}/route.ts`);
        state.role = "UNAUTHORIZED";
        assert.equal((await post(body)).status, 403);
        state.role = "OWNER"; state.authenticated = false;
        assert.equal((await post(body)).status, 401);
        state.authenticated = true;
        for (const amountVnd of [0, -1, 1.5, 2147483648]) assert.equal((await post({ ...body, amountVnd })).status, 400);
        assert.equal((await post({ ...body, description: "   " })).status, 400);
        assert.equal((await post(body, "not-uuid")).status, 400);
        assert.equal(state.payments.length, 0);
    });
}

test("Staff can record outside sales and daily expenses with their audit identity", async () => {
    for (const route of ["receipts", "expenses"]) {
        const { state, post } = routeHarness(`src/app/api/${route}/route.ts`);
        state.role = "STAFF";
        const category = route === "receipts" ? "Bán gà" : "Tiền hàng shipper / COD";
        assert.equal((await post({ ...body, category })).status, 201);
        assert.equal(state.audit[0].createdBy, "user-1");
        assert.equal(JSON.parse(state.audit[0].payload).category, category);
        assert.equal(state.payments.length, 1);
    }
});

test("Expenses reduce cash flow once; refunds reduce collected revenue; negative cash is preserved", () => {
    const result = finance.summarizeMoney([
        { amountVnd: 100000, direction: "IN", method: "CASH" },
        { amountVnd: 200000, direction: "OUT", method: "CASH", expenseId: "expense-1" },
        { amountVnd: 30000, direction: "OUT", method: "CASH", expenseId: null },
        { amountVnd: 40000, direction: "IN", method: "BANK_TRANSFER" },
    ]);
    assert.equal(result.netCash, -130000);
    assert.equal(result.refunds, 30000);
    assert.equal(result.collectedRevenue, 110000);
    assert.equal(result.collectedRevenue - 200000, -90000);
    assert.equal(result.netCash + result.netTransfer, -90000);
});

test("CSV escapes quotes and neutralizes formulas without changing numeric amounts", () => {
    assert.equal(finance.csvCell('Tiền "dịch vụ"'), '"Tiền ""dịch vụ"""');
    assert.equal(finance.csvCell("=1+1"), '"\'=1+1"');
    assert.equal(finance.csvCell(-100), '"-100"');
});

test("Cashbook keeps manual receipts separate, scopes by lake, uses Vietnam dates and shows recorder", async () => {
    let query;
    const createdAt = new Date("2026-10-12T04:00:00Z");
    const tx = {
        payment: {
            count: async ({ where }) => { query = where; return 61; },
            findMany: async ({ skip, take }) => {
                assert.equal(skip, 30); assert.equal(take, 30);
                return [{ id: "payment-1", createdAt, invoiceId: "invoice-1", expenseId: null,
                    amountVnd: 200000, direction: "IN", method: "CASH", reversalOfId: null,
                    invoice: { lines: [{ name: "Thu khác: [Bán gà - Tiền mặt] 2 con" }] } }];
            },
            groupBy: async () => [{ method: "CASH", direction: "IN", expenseId: null, _sum: { amountVnd: 500000 } }],
            aggregate: async () => ({ _sum: { amountVnd: 0 } }),
        },
        expense: { aggregate: async () => ({ _sum: { amountVnd: 10000 } }) },
        auditEvent: { findMany: async ({ where }) => { assert.equal(where.lakeId, "lake-1"); return [{ entityId: "invoice-1", createdBy: "staff-1" }]; } },
        user: { findMany: async () => [{ id: "staff-1", name: "Nhân viên A" }] },
    };
    const route = load("src/app/api/cashbook/route.ts", {
        "next/server": { NextResponse: class extends Response { static json(body, init) { return Response.json(body, init); } } },
        zod: { z }, "@/generated/prisma/client": { Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" } },
        "@/lib/prisma": { prisma: { $transaction: async fn => fn(tx) } },
        "@/lib/finance": finance,
        "@/lib/reports/financial-scope": { financialScope: async lakeId => ({ payment: { lakeId } }) },
        "@/lib/tenant": { AuthenticationError, ForbiddenError, requireTenantContext: async () => ({ lakeId: "lake-1" }) },
    });
    const response = await route.GET(new Request("http://localhost/api/cashbook?from=2026-10-12&to=2026-10-12&page=2"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(query.lakeId, "lake-1");
    assert.equal(query.createdAt.gte.toISOString(), "2026-10-11T17:00:00.000Z");
    assert.equal(query.createdAt.lte.toISOString(), "2026-10-12T16:59:59.999Z");
    assert.equal(query.AND[0].OR[1].invoice.lines.some.name.startsWith, "Thu khác: ");
    assert.equal(body.summary.cashIn, 500000); // Summary includes all pages.
    assert.equal(body.items[0].recordedBy, "Nhân viên A");
    assert.equal(body.pagination.totalPages, 3);
    assert.equal(body.unlinkedExpensesVnd, 10000);
    assert.equal((await route.GET(new Request("http://localhost/api/cashbook?from=2026-10-13&to=2026-10-12"))).status, 400);
    assert.equal((await route.GET(new Request("http://localhost/api/cashbook?from=2026-10-12&to=2026-10-12&method=INVALID"))).status, 400);
});

test("Overview, chart and export use revenue before buyback costs; outside sales remain other revenue", () => {
    const invoices = [
        { fishingSessionId: "session-1", lines: [
            { name: "Vé câu", totalVnd: 300000 },
            { name: "Nước", productId: "product-1", totalVnd: 20000 },
            { name: "Gia hạn", totalVnd: 50000 },
            { name: "Thu cá", fishBuybackId: "buyback-1", totalVnd: -100000 },
            { name: "Giảm giá", totalVnd: -10000 },
        ] },
        { fishingSessionId: null, lines: [{ name: "Thu khác: [Bán máy] Có thêm giờ bảo hành", totalVnd: 1000000 }] },
    ];
    const summary = finance.summarizeRevenue(invoices);
    assert.equal(summary.ticketRevenue, 300000);
    assert.equal(summary.productRevenue, 20000);
    assert.equal(summary.overtimeRevenue, 50000);
    assert.equal(summary.otherRevenue, 1000000);
    assert.equal(summary.refundAmount, 10000);
    assert.equal(summary.totalRevenue, 1360000);
    assert.equal(summary.totalRevenue - 100000 - 200000, 1060000);
    const chartRevenue = invoices.reduce((sum, invoice) => sum + finance.summarizeRevenue([invoice]).totalRevenue, 0);
    assert.equal(chartRevenue, summary.totalRevenue);
});

test("Cash totals from database groups preserve refund separation", () => {
    const summary = finance.summarizeMoney([
        { method: "CASH", direction: "IN", amountVnd: 1000000 },
        { method: "CASH", direction: "OUT", amountVnd: 130000 },
    ], 30000);
    assert.equal(summary.netCash, 870000);
    assert.equal(summary.refunds, 30000);
    assert.equal(summary.collectedRevenue, 970000);
});

test("Report scope consistently applies lake, area, payment and staff filters", async () => {
    let eventQuery;
    const scopeModule = load("src/lib/reports/financial-scope.ts", {
        "@/generated/prisma/client": { PaymentMethod: { CASH: "CASH", BANK_TRANSFER: "BANK_TRANSFER" }, SessionStatus: { ACTIVE: "ACTIVE", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED" } },
        "@/lib/prisma": { prisma: { auditEvent: { findMany: async ({ where }) => {
            eventQuery = where;
            return [{ entityType: "Invoice", entityId: "invoice-staff" }, { entityType: "Expense", entityId: "expense-staff" }, { entityType: "Payment", entityId: "payment-staff" }];
        } } } },
    });
    const scope = await scopeModule.financialScope("lake-1", new URLSearchParams({ employeeId: "staff-1", paymentMethod: "CASH" }));
    assert.equal(eventQuery.lakeId, "lake-1"); assert.equal(eventQuery.createdBy, "staff-1");
    assert.equal(scope.payment.lakeId, "lake-1"); assert.equal(scope.payment.method, "CASH");
    assert.equal(scope.invoice.OR[0].id.in[0], "invoice-staff");
    assert.equal(scope.expense.id.in[0], "expense-staff");
    const sales = await scopeModule.financialScope("lake-1", new URLSearchParams({ areaId: "area-1", productId: "product-1" }));
    assert.equal(sales.invoice.fishingSession.hutLinks.some.hut.areaId, "area-1");
    assert.equal(sales.invoice.lines.some.productId, "product-1");
    assert.equal(sales.payment.invoice, sales.invoice);
    assert.equal(sales.expense.id.in.length, 0);
});
