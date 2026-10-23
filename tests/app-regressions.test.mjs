import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Execute the actual TypeScript modules with external services mocked.
function loadModule(path, modules, globals = {}) {
    const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
    const code = ts.transpileModule(source, {
        fileName: path,
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: (name) => {
        if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
        return modules[name];
    }, Buffer, process: { env: { NEXTAUTH_SECRET: "isolated-test-secret" } }, ...globals });
    return exports;
}

const authRateLimit = {
    authFailureState: async (_namespace, account) => ({ blocked: false, retryAfterSeconds: 0, identifier: String(account ?? "unknown") }),
    authLockMessage: () => "locked",
    isRateLimitUnavailable: () => false,
    rateLimitUnavailableMessage: () => "busy",
    recordAuthFailure: async () => {},
};

function authModule(user = { email: "owner@example.com", systemRole: "USER", sessionVersion: 2, isLocked: false }) {
    let cookie;
    const signature = loadModule("../src/lib/session-signature.ts", { crypto, "node:crypto": crypto });
    const auth = loadModule("../src/lib/auth.ts", {
        crypto,
        "node:crypto": crypto,
        "next/headers": { cookies: async () => ({ get: () => ({ value: cookie }), set: (_name, token) => { cookie = token; } }) },
        bcryptjs: {}, "next-auth/providers/credentials": () => ({}), "next-auth/providers/google": () => ({}),
        zod: { z: { string: () => ({ trim() { return this; }, min() { return this; }, email() { return this; } }), object: () => ({}) } },
        "@/generated/prisma/client": { SystemRole: {}, Role: { OWNER: "OWNER" }, Prisma: {} }, "@/lib/phone": {},
        "@/lib/prisma": { prisma: { user: { findUnique: async () => user } } },
        "@/lib/onboarding/seed-sample-lake": { seedSampleLakeData: async () => ({}) },
        "@/lib/auth-rate-limit": authRateLimit,
        "@/lib/session-signature": signature,
        "@/lib/vietqr": { TRIAL_DAYS: 30 },
        "@/lib/audit-log": { recordLoginAudit: async () => {} },
    });
    return { auth, user, setCookie: (token) => { cookie = token; } };
}
const payload = { userId: "owner-1", email: "owner@example.com", name: "Owner", role: "USER" };

test("Login redirects cannot escape to an external origin", () => {
    const navigation = loadModule("../src/lib/navigation.ts", {}, { URL });
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "javascript:alert(1)"]) {
        assert.equal(navigation.safeRedirectPath(value), "/dashboard");
    }
    assert.equal(navigation.safeRedirectPath("/sessions?tab=active#list"), "/sessions?tab=active#list");
});

test("Google sign-in requires a verified email and accepts an existing unlocked account", async () => {
    const { auth } = authModule();
    const callback = auth.authOptions.callbacks.signIn;
    assert.equal(await callback({
        user: { email: "owner@example.com" },
        account: { provider: "google" },
        profile: { email_verified: true },
    }), true);
    assert.equal(await callback({
        user: { email: "owner@example.com" },
        account: { provider: "google" },
        profile: { email_verified: false },
    }), false);
});

test("Signed sessions reject tampering, expired tokens and malformed extra segments", () => {
    const { auth } = authModule();
    const token = auth.signSession(payload);
    assert.equal(auth.verifySession(token).userId, payload.userId);
    assert.equal(auth.verifySession(`${token}x`), null);
    assert.equal(auth.verifySession(`${token}.extra`), null);
    assert.equal(auth.verifySession(auth.signSession({ ...payload, expiresAt: Date.now() - 1 })), null);
});

test("Fallback cookies honor session revocation, account locking and deletion", async () => {
    const { auth, user } = authModule();
    await auth.setSessionCookie(payload);
    assert.equal((await auth.getSessionCookie()).sessionVersion, 2);
    user.sessionVersion++;
    assert.equal(await auth.getSessionCookie(), null);
    user.sessionVersion--;
    user.isLocked = true;
    assert.equal(await auth.getSessionCookie(), null);
    const deleted = authModule(null);
    deleted.setCookie(deleted.auth.signSession(payload));
    assert.equal(await deleted.auth.getSessionCookie(), null);
});

test("Concurrent connectivity checks share the real pending result and clear timers", async () => {
    let requests = 0;
    let resolveResponse;
    const timers = new Set();
    const network = loadModule("../src/lib/network/use-network-status.ts", {
        react: {}, "@/lib/ticker/session-ticker": { sessionTicker: { setServerOffsetMs() {} } },
    }, {
        window: {}, navigator: { onLine: true }, AbortController,
        setTimeout: (fn) => { timers.add(fn); return fn; }, clearTimeout: (fn) => timers.delete(fn),
        fetch: () => { requests++; return new Promise((resolve) => { resolveResponse = resolve; }); },
    });
    const first = network.checkConnectivity();
    const second = network.checkConnectivity();
    assert.equal(first, second);
    assert.equal(requests, 1);
    resolveResponse({ ok: false });
    assert.deepEqual(await Promise.all([first, second]), [false, false]);
    assert.equal(timers.size, 0);
    const retry = network.checkConnectivity();
    resolveResponse({ ok: true, json: async () => ({ timestamp: Date.now() }) });
    assert.equal(await retry, true);
    assert.equal(requests, 2);
    assert.equal(timers.size, 0);
});

test("Network timeout also covers a stalled JSON response body", async () => {
    let abort;
    const network = loadModule("../src/lib/network/use-network-status.ts", {
        react: {}, "@/lib/ticker/session-ticker": { sessionTicker: { setServerOffsetMs() {} } },
    }, {
        window: {}, navigator: { onLine: true }, AbortController,
        setTimeout: (fn) => { abort = fn; return fn; }, clearTimeout() {},
        fetch: async (_url, { signal }) => ({ ok: true, json: () => new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(new Error("Aborted")));
        }) }),
    });
    const check = network.checkConnectivity();
    await new Promise((resolve) => setImmediate(resolve));
    abort();
    assert.equal(await check, false);
});

test("Stock aggregation remains tenant scoped and preserves negative and decimal stock", async () => {
    let query;
    const stock = loadModule("../src/lib/product-stock.ts", {
        "@/lib/prisma": { prisma: { inventoryMovement: { groupBy: async (args) => {
            query = args;
            return [{ productId: "a", _sum: { quantity: "-2.5" } }, { productId: "b", _sum: { quantity: null } }];
        } } } },
    });
    const result = await stock.getProductStockMap("lake-a");
    assert.equal(query.where.lakeId, "lake-a");
    assert.equal(query._sum.quantity, true);
    assert.equal(result.get("a"), -2.5);
    assert.equal(result.get("b"), 0);
});

test("Many mounted network consumers share one monitor and release all resources", () => {
    const effects = [];
    const intervals = new Set();
    const timers = new Set();
    const events = new Set();
    const target = { addEventListener: (_event, fn) => events.add(fn), removeEventListener: (_event, fn) => events.delete(fn) };
    const network = loadModule("../src/lib/network/use-network-status.ts", {
        react: { useEffect: (fn) => effects.push(fn), useState: (value) => [value, () => {}] },
        "@/lib/ticker/session-ticker": { sessionTicker: { setServerOffsetMs() {} } },
    }, {
        window: target, document: target,
        setTimeout: (fn) => { timers.add(fn); return fn; }, clearTimeout: (fn) => timers.delete(fn),
        setInterval: (fn) => { intervals.add(fn); return fn; }, clearInterval: (fn) => intervals.delete(fn),
    });
    for (let i = 0; i < 20; i++) network.useNetworkStatus();
    const cleanups = effects.map((effect) => effect());
    assert.equal(intervals.size, 1);
    cleanups.slice(0, -1).forEach((cleanup) => cleanup());
    assert.equal(intervals.size, 1);
    cleanups.at(-1)();
    assert.equal(intervals.size, 0);
    assert.equal(events.size, 0);
    assert.equal(timers.size, 0);
});

test("Account changes discard catalog cache even if browser storage is blocked", () => {
    const cache = loadModule("../src/lib/query-client.ts", { "@tanstack/react-query": { QueryClient } }, {
        window: { get localStorage() { throw new Error("Storage blocked"); } },
    });
    const client = cache.getQueryClient();
    client.setQueryData(["products-catalog", "list"], [{ id: "other-lake-product" }]);
    cache.clearCatalogCache();
    assert.equal(client.getQueryData(["products-catalog", "list"]), undefined);
    assert.equal(cache.getQueryClient(), client);
});

test("Registration validates input and normalizes phone numbers before writing", async () => {
    let writtenPhone;
    let registrationCreatedSession = false;
    const phone = loadModule("../src/lib/phone.ts", {});
    const actions = loadModule("../src/app/actions/auth.ts", {
        "@/lib/prisma": { prisma: {
            user: { findUnique: async () => null },
            $transaction: async (fn) => fn({
                organization: { create: async () => ({ id: "org-1" }) },
                lake: { create: async () => ({ id: "lake-1" }) },
                user: { create: async ({ data }) => { writtenPhone = data.phone; return { ...data, id: "user-1" }; } },
                membership: { create: async () => ({}) },
            }),
        } },
        bcryptjs: { hash: async () => "hash" },
        "@/lib/auth": { setSessionCookie: async () => { registrationCreatedSession = true; } },
        "@/lib/onboarding/seed-sample-lake": { seedSampleLakeData: async () => ({}) },
        "next/navigation": {}, "@/lib/phone": phone, zod: { z },
        "@/lib/auth-rate-limit": authRateLimit,
        "@/lib/vietqr": { TRIAL_DAYS: 30 },
        "@/lib/audit-log": { recordLoginAudit: async () => {} },
    }, { console });
    assert.equal((await actions.registerUser({ email: 12 })).success, false);
    assert.equal((await actions.registerUser({ email: "owner@example.com", password: "Password123!", name: "Owner", phone: "bad" })).success, false);
    const result = await actions.registerUser({ email: " owner@example.com ", password: "Password123!", name: "Owner", phone: "090 123 4567" });
    assert.equal(result.success, true);
    assert.equal(writtenPhone, "+84901234567");
    assert.equal(registrationCreatedSession, false, "Registration must continue to Google sign-in instead of silently creating a session");
});

test("Existing staff can log in by email while phone-number login is disabled", async () => {
    const lookups = [];
    let session;
    const user = { id: "staff-1", email: "staff@example.com", name: "Staff", phone: "+84901234567", passwordHash: "hash", systemRole: "USER", isLocked: false };
    const actions = loadModule("../src/app/actions/auth.ts", {
        "@/lib/prisma": { prisma: { user: {
            findUnique: async (args) => { lookups.push(args); return args.where.email === user.email ? user : null; },
            update: async () => user,
        } } },
        bcryptjs: { compare: async () => true },
        "@/lib/auth": { setSessionCookie: async (value) => { session = value; } },
        "@/lib/onboarding/seed-sample-lake": { seedSampleLakeData: async () => ({}) },
        "next/navigation": {}, "@/lib/phone": {}, zod: { z },
        "@/lib/auth-rate-limit": authRateLimit,
        "@/lib/vietqr": { TRIAL_DAYS: 30 },
        "@/lib/audit-log": { recordLoginAudit: async () => {} },
    }, { console });
    const membershipInclude = {
        memberships: {
            where: { deletedAt: null },
            select: { lakeId: true, role: true },
            orderBy: { createdAt: "asc" },
            take: 3,
        },
    };
    const result = await actions.loginUser({ email: " Staff@Example.com ", password: "valid-password" });
    assert.equal(result.success, true);
    assert.deepEqual(JSON.parse(JSON.stringify(lookups[0])), { where: { email: "staff@example.com" }, include: membershipInclude });
    assert.equal(session.userId, "staff-1");
    const phoneLogin = await actions.loginUser({ email: "0901234567", password: "valid-password" });
    assert.equal(phoneLogin.success, false);
    assert.deepEqual(JSON.parse(JSON.stringify(lookups[1])), { where: { email: "0901234567" }, include: membershipInclude });
});

test("Tenant data follows qa_session when an older NextAuth account cookie remains", async () => {
    let membershipQuery;
    const employee = {
        user: { id: "staff-1", email: "staff@example.com", name: "Staff", phone: null, phoneVerified: true, systemRole: "USER", isLocked: false },
        lake: { id: "lake-old", name: "Existing Lake", organization: { id: "org-old", name: "Existing Organization" } },
        role: "STAFF",
    };
    const tenant = loadModule("../src/lib/tenant.ts", {
        "next/headers": { cookies: async () => ({ has: (name) => name === "qa_session", get: () => undefined }) },
        react: { cache: (fn) => fn },
        "next/navigation": { redirect: (path) => { throw new Error(`redirect:${path}`); } },
        "next-auth": { getServerSession: async () => ({ user: { email: "old-admin@example.com", systemRole: "SUPER_ADMIN" } }) },
        "@/lib/server-session": { getAppSession: async () => ({ user: { email: "old-admin@example.com", systemRole: "SUPER_ADMIN" } }) },
        "@/generated/prisma/client": { Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" } },
        "@/lib/auth": { authOptions: {}, getSessionCookie: async () => ({ email: "staff@example.com", role: "USER" }) },
        "@/lib/prisma": { prisma: { membership: { findFirst: async (args) => { membershipQuery = args; return employee; } }, user: {} } },
        "@/lib/subscription-access": { resolveSubscriptionAccess: () => "active" },
    }, { process: { env: {} } });
    const context = await tenant.getTenantContext();
    assert.equal(membershipQuery.where.user.email, "staff@example.com");
    assert.equal(context.userId, "staff-1");
    assert.equal(context.lakeId, "lake-old");
    assert.equal(context.role, "STAFF");
});

test("An expired qa_session falls back to a valid regular NextAuth account", async () => {
    let membershipQuery;
    const employee = {
        user: { id: "staff-1", email: "staff@example.com", name: "Staff", phone: null, phoneVerified: false, systemRole: "USER", isLocked: false },
        lake: { id: "lake-old", name: "Existing Lake", organization: { id: "org-old", name: "Existing Organization" } },
        role: "STAFF",
    };
    const tenant = loadModule("../src/lib/tenant.ts", {
        "next/headers": { cookies: async () => ({ has: (name) => name === "qa_session", get: () => undefined }) },
        react: { cache: (fn) => fn },
        "next/navigation": { redirect: (path) => { throw new Error(`redirect:${path}`); } },
        "next-auth": { getServerSession: async () => ({ user: { email: "staff@example.com", systemRole: "USER" } }) },
        "@/lib/server-session": { getAppSession: async () => ({ user: { email: "staff@example.com", systemRole: "USER" } }) },
        "@/generated/prisma/client": { Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" } },
        "@/lib/auth": { authOptions: {}, getSessionCookie: async () => null },
        "@/lib/prisma": { prisma: { membership: { findFirst: async (args) => { membershipQuery = args; return employee; } }, user: {} } },
        "@/lib/subscription-access": { resolveSubscriptionAccess: () => "active" },
    }, { process: { env: {} } });
    const context = await tenant.getTenantContext();
    assert.equal(membershipQuery.where.user.email, "staff@example.com");
    assert.equal(context.userId, "staff-1");
    assert.equal(context.lakeId, "lake-old");
    assert.equal(context.role, "STAFF");
});

test("An invalid qa_session cannot use a SUPER_ADMIN NextAuth cookie", async () => {
    const tenant = loadModule("../src/lib/tenant.ts", {
        "next/headers": { cookies: async () => ({ has: (name) => name === "qa_session", get: () => undefined }) },
        react: { cache: (fn) => fn },
        "next/navigation": { redirect: (path) => { throw new Error(`redirect:${path}`); } },
        "next-auth": { getServerSession: async () => ({ user: { email: "admin@example.com", systemRole: "SUPER_ADMIN" } }) },
        "@/lib/server-session": { getAppSession: async () => ({ user: { email: "admin@example.com", systemRole: "SUPER_ADMIN" } }) },
        "@/generated/prisma/client": { Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" } },
        "@/lib/auth": { authOptions: {}, getSessionCookie: async () => null },
        "@/lib/prisma": { prisma: { membership: { findFirst: async () => { throw new Error("must not query tenant"); } }, user: {} } },
        "@/lib/subscription-access": { resolveSubscriptionAccess: () => "active" },
    }, { process: { env: {} } });
    assert.equal(await tenant.getTenantContext(), null);
});

const roles = { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" };
const sessionStatuses = { ACTIVE: "ACTIVE", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED" };
const invoiceStatuses = { DRAFT: "DRAFT", PAID: "PAID", PARTIALLY_PAID: "PARTIALLY_PAID", VOIDED: "VOIDED" };
const tenantModule = {
    requireTenantContext: async () => ({ lakeId: "lake-1", userId: "staff-1", lakeName: "Lake" }),
    AuthenticationError: class extends Error {}, ForbiddenError: class extends Error {},
};
function routeModule(path, prisma) {
    return loadModule(path, {
        "next/server": { NextResponse: Response }, zod: { z },
        "@/generated/prisma/client": { Role: roles, SessionStatus: sessionStatuses, InvoiceStatus: invoiceStatuses, Prisma: {} },
        "@/lib/prisma": { prisma }, "@/lib/tenant": tenantModule,
        "@/lib/audit-log": {
            readRequestMeta: async () => ({ ip: null, userAgent: null }),
            writeStaffAudit: async (db, input) => {
                await db.auditEvent.create({
                    data: {
                        lakeId: input.lakeId,
                        entityType: input.entityType,
                        entityId: input.entityId,
                        action: input.action,
                        payload: "{}",
                        createdBy: input.createdBy,
                    },
                });
            },
        },
        "@/lib/api-error": { createInternalErrorResponse: (_tag, error) => { throw error; } },
    }, { Date, Response, crypto: crypto.webcrypto, console });
}

test("Extending an expired session adds time from the old deadline and charges exactly once", async () => {
    const oldEnd = new Date(Date.now() - 10 * 60_000);
    const session = { id: "session-1", status: "ACTIVE", plannedEndAt: oldEnd };
    const lines = [{ totalVnd: 100000 }];
    const keys = new Map();
    let invoiceTotal;
    const tx = {
        idempotencyKey: {
            findUnique: async ({ where }) => keys.get(where.lakeId_key.key) ?? null,
            create: async ({ data }) => { keys.set(data.key, data); return data; },
        },
        fishingSession: { findFirst: async () => session, update: async ({ data }) => { session.plannedEndAt = data.plannedEndAt; return session; } },
        package: { findFirst: async () => ({ id: "550e8400-e29b-41d4-a716-446655440000", name: "1 giờ", durationMinutes: 60, priceVnd: 30000 }) },
        invoice: { findUnique: async () => ({ id: "invoice-1", status: "DRAFT", paidAmountVnd: 0 }), update: async ({ data }) => { invoiceTotal = data.totalAmountVnd; } },
        invoiceLine: {
            create: async ({ data }) => { const line = { ...data, id: "extension-1", createdAt: new Date() }; lines.push(line); return line; },
            aggregate: async () => ({ _sum: { totalVnd: lines.reduce((total, line) => total + line.totalVnd, 0) } }),
        },
        auditEvent: { create: async () => ({}) },
    };
    const route = routeModule("../src/app/api/fishing-sessions/[sessionId]/extensions/route.ts", { ...tx, $transaction: async (fn) => fn(tx) });
    const request = () => new Request("http://localhost/api/extensions", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "650e8400-e29b-41d4-a716-446655440000" },
        body: JSON.stringify({ packageId: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const params = { params: Promise.resolve({ sessionId: session.id }) };
    const response = await route.POST(request(), params);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(new Date(result.session.plannedEndAt).getTime(), oldEnd.getTime() + 60 * 60_000);
    assert.equal(result.line.totalVnd, 30000);
    assert.equal(invoiceTotal, 130000);
    const retry = await route.POST(request(), params);
    assert.equal(retry.status, 200);
    assert.deepEqual(await retry.json(), result);
    assert.equal(lines.length, 2);
});

test("Finishing an expired session never creates automatic overtime charges", async () => {
    const session = {
        id: "session-1", startAt: new Date(Date.now() - 2 * 3600000), plannedEndAt: new Date(Date.now() - 3600000),
        packagePriceVndSnapshot: 100000, overtimeHourlyVndSnapshot: 30000,
        package: { id: "package-1", name: "1 giờ", priceVnd: 100000, durationMinutes: 60, overtimeHourlyVnd: 30000 },
        hutLinks: [], customer: null,
    };
    let invoiceTotal;
    const tx = {
        fishingSession: { findFirst: async () => session, update: async ({ data }) => ({ ...session, ...data }) },
        invoice: {
            findFirst: async () => ({ id: "invoice-1", status: "DRAFT", lines: [{ name: "Tiền ca: 1 giờ", totalVnd: 100000, quantity: 1 }], payments: [] }),
            update: async ({ data }) => { invoiceTotal = data.totalAmountVnd; },
        },
        invoiceLine: { create: async () => { throw new Error("Unexpected overtime charge"); }, update: async () => { throw new Error("Unexpected overtime update"); } },
        auditEvent: { create: async () => ({}) },
    };
    const route = routeModule("../src/app/api/fishing-sessions/[sessionId]/route.ts", { $transaction: async (fn) => fn(tx) });
    const response = await route.PATCH(new Request("http://localhost/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "COMPLETE" }) }), { params: Promise.resolve({ sessionId: session.id }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(invoiceTotal, 100000);
    assert.equal(result.status, "COMPLETED");
    assert.equal(result.receiptData.overtimeTotalVnd, 0);
});

test("Expired session cards show both decisions immediately and keep the bill frozen", () => {
    const end = Date.now();
    const card = loadModule("../src/app/sessions/session-grid-card.tsx", {
        react: React,
        "./session-countdown": { SessionCountdown: () => React.createElement("span", null, "Clock") },
        "@/lib/ticker/session-ticker": { sessionTicker: { subscribe: () => () => {}, getNowMs: () => end } },
    });
    const session = { id: "session-1", plannedEndAt: new Date(end).toISOString(), package: { name: "1 giờ", durationMinutes: 60, priceVnd: 100000, overtimeHourlyVnd: 30000 }, hutLinks: [], invoices: [{ lines: [], payments: [] }] };
    assert.equal(card.computeSessionFinancials(session, end).netBalance, 100000);
    assert.equal(card.computeSessionFinancials(session, end + 2 * 3600000).netBalance, 100000);
    const html = renderToStaticMarkup(React.createElement(card.SessionGridCard, { session, nowMs: end, canComplete: true, onSelect() {}, onLongPress() {}, onSettlement() {}, onExtend() {} }));
    assert.ok(html.includes("Kết thúc"));
    assert.ok(html.includes("Gia hạn thêm giờ"));
    assert.ok(html.includes("HẾT GIỜ"));
    const active = renderToStaticMarkup(React.createElement(card.SessionGridCard, { session, nowMs: end - 1, canComplete: true, onSelect() {}, onLongPress() {}, onSettlement() {}, onExtend() {} }));
    assert.equal(active.includes("Gia hạn thêm giờ"), false);
});
