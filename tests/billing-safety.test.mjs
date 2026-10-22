import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path, modules = {}) {
    const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    }).outputText;
    const exports = {};
    const context = {
        exports,
        require: (name) => {
            if (name === "crypto" || name === "node:crypto") return crypto;
            if (!(name in modules)) throw new Error(`Unexpected import ${name} from ${path}`);
            return modules[name];
        },
        Buffer,
        URL,
        Map,
    };
    vm.runInNewContext(code, context, { filename: path });
    return exports;
}

function same(actual, expected) {
    assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

const access = load("src/lib/subscription-access.ts");
const webhook = load("src/lib/bank-webhook.ts");
const pricing = load("src/lib/vietqr.ts");
const scope = load("src/lib/tenant-scope.ts", {
    "@/generated/prisma/client": {},
    "@/lib/prisma": { prisma: {} },
    "@/lib/tenant": { ForbiddenError: class ForbiddenError extends Error {} },
});
const permissions = load("src/lib/financial/permissions.ts", {
    "@/generated/prisma/client": { Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" }, SystemRole: { SUPER_ADMIN: "SUPER_ADMIN" } },
    "@/lib/tenant": { ForbiddenError: class ForbiddenError extends Error {} },
});

const day = 24 * 60 * 60 * 1000;
const expires = new Date("2026-10-01T00:00:00.000Z");

test("subscription access stays open through a 3-day grace, then locks", () => {
    assert.equal(access.resolveSubscriptionAccess({ status: "ACTIVE", expiresAt: expires, now: new Date(expires.getTime() - 1000) }), "active");
    assert.equal(access.resolveSubscriptionAccess({ status: "TRIAL", expiresAt: expires, now: expires }), "active");
    assert.equal(access.resolveSubscriptionAccess({ status: "ACTIVE", expiresAt: expires, now: new Date(expires.getTime() + day) }), "grace");
    assert.equal(access.resolveSubscriptionAccess({ status: "GRACE_PERIOD", expiresAt: expires, now: new Date(expires.getTime() + 3 * day) }), "grace");
    assert.equal(access.resolveSubscriptionAccess({ status: "ACTIVE", expiresAt: expires, now: new Date(expires.getTime() + 3 * day + 1) }), "locked");
    assert.equal(access.resolveSubscriptionAccess({ status: "SUSPENDED", expiresAt: new Date(expires.getTime() + 30 * day), now: expires }), "locked");
    assert.equal(access.resolveSubscriptionAccess({ status: "ACTIVE", expiresAt: null, now: expires }), "active");
    assert.equal(access.resolveSubscriptionAccess({ status: "TRIAL", expiresAt: "not-a-date", now: expires }), "active");
    assert.equal(access.graceDaysRemaining(expires, new Date(expires.getTime() + day)), 2);
});

test("bank webhook rejects a missing secret, compares in constant time, and requires the full amount", () => {
    assert.equal(webhook.verifyWebhookSecret(new Request("http://localhost/hook"), "", undefined), false);
    assert.equal(webhook.verifyWebhookSecret(new Request("http://localhost/hook"), "", ""), false);

    const secret = "cron-or-bank-secret";
    const ok = new Request("http://localhost/hook", { headers: { authorization: `Bearer ${secret}` } });
    const bad = new Request("http://localhost/hook", { headers: { authorization: "Bearer nope" } });
    const short = new Request("http://localhost/hook", { headers: { authorization: "Bearer x" } });
    assert.equal(webhook.verifyWebhookSecret(ok, "", secret), true);
    assert.equal(webhook.verifyWebhookSecret(bad, "", secret), false);
    assert.equal(webhook.verifyWebhookSecret(short, "", secret), false);
    assert.equal(webhook.timingSafeEqualString(secret, secret), true);
    assert.equal(webhook.timingSafeEqualString(secret, `${secret}x`), false);

    const body = JSON.stringify({ order: "HC123456" });
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const signed = new Request("http://localhost/hook", { headers: { "x-signature": `sha256=${signature}` } });
    assert.equal(webhook.verifyWebhookSecret(signed, body, secret), true);

    for (const received of [undefined, null, "", 0, "0", Number.NaN, -1, 128999]) {
        assert.equal(webhook.shouldMarkOrderPaid(received, 129000), false, String(received));
    }
    assert.equal(webhook.shouldMarkOrderPaid(129000, 129000), true);
    assert.equal(webhook.shouldMarkOrderPaid(130000, 129000), true);
    assert.equal(webhook.shouldMarkOrderPaid(129000, 0), false);
});

test("approved prices, yearly term and 30-day trial", () => {
    assert.equal(pricing.TRIAL_DAYS, 30);
    assert.equal(pricing.PLAN_PRICING.SILVER.priceVnd, 129000);
    assert.equal(pricing.PLAN_PRICING.SILVER.maxSpots, 30);
    assert.equal(pricing.PLAN_PRICING.SILVER.maxStaff, 2);
    assert.equal(pricing.PLAN_PRICING.GOLD.priceVnd, 199000);
    assert.equal(pricing.PLAN_PRICING.GOLD.maxSpots, null);
    assert.equal(pricing.PLAN_PRICING.GOLD.maxStaff, null);
    same(pricing.planCharge("SILVER", "MONTHLY"), { amountVnd: 129000, durationDays: 30 });
    same(pricing.planCharge("GOLD", "MONTHLY"), { amountVnd: 199000, durationDays: 30 });
    same(pricing.planCharge("SILVER", "YEARLY"), { amountVnd: 1290000, durationDays: 365 });
    same(pricing.planCharge("GOLD", "YEARLY"), { amountVnd: 1990000, durationDays: 365 });
});

test("client ids from another lake are not treated as belonging here", () => {
    assert.equal(scope.belongsToLake("lake-a", "lake-a"), true);
    assert.equal(scope.belongsToLake("lake-b", "lake-a"), false);
    assert.equal(scope.belongsToLake(null, "lake-a"), false);
    const foreign = { id: "c1", name: "Khách", phoneNormalized: "0900000000", lakeId: "lake-b" };
    assert.equal(scope.publicCustomer(foreign, "lake-a"), null);
    same(scope.publicCustomer({ ...foreign, lakeId: "lake-a" }, "lake-a"), {
        id: "c1",
        name: "Khách",
        phoneNormalized: "0900000000",
    });
});

test("staff has no finance permissions; owner and manager do", () => {
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_VIEW_TRANSACTIONS"), false);
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_EXPORT_REPORTS"), false);
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_MANAGE_DEBT"), false);
    assert.equal(permissions.hasFinancialPermission("OWNER", "FINANCIAL_VIEW_TRANSACTIONS"), true);
    assert.equal(permissions.hasFinancialPermission("MANAGER", "FINANCIAL_EXPORT_REPORTS"), true);
    same(permissions.FINANCE_ROLES, ["OWNER", "MANAGER"]);
});

test("print job migration is additive and does not drop shift columns", () => {
    const sql = fs.readFileSync("prisma/migrations/20261022120000_add_print_job/migration.sql", "utf8");
    const executable = sql.replace(/--.*$/gm, "");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "PrintJob"/);
    assert.match(sql, /CREATE TYPE "PrintJobStatus"/);
    assert.match(executable, /129000/);
    assert.match(executable, /199000/);
    assert.doesNotMatch(executable, /DROP\s+(COLUMN|TABLE)/i);
    assert.doesNotMatch(executable, /subscriptionExpiresAt/);
    const migrations = fs.readdirSync("prisma/migrations").filter((name) => name.endsWith(".sql") || fs.existsSync(`prisma/migrations/${name}/migration.sql`));
    const earlier = migrations
        .filter((name) => name < "20261022120000_add_print_job")
        .map((name) => fs.readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"))
        .join("\n");
    assert.equal(earlier.includes("PrintJob"), false);
});
