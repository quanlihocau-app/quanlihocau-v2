import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as JSX from "react/jsx-runtime";
import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { auditNavigation } from "../scripts/check-navigation.mjs";
import { isolatedEnvironment } from "../scripts/isolated-environment.mjs";

const root = path.resolve(import.meta.dirname, "..");
function load(file, modules, globals = {}) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, URL, URLSearchParams, Headers, Buffer,
        process: { env: { NODE_ENV: "test" } }, console, ...globals,
        require: (id) => {
            if (id === "react/jsx-runtime") return JSX;
            if (!(id in modules)) throw new Error(`Unexpected dependency ${id}`);
            return modules[id];
        },
    });
    return exports;
}
function hookHarness() {
    const states = [], effects = [], setters = [];
    return { states, effects, setters, react: { ...React,
        useState: (initial) => { const i = states.length; states.push(typeof initial === "function" ? initial() : initial); const setter = (v) => { states[i] = typeof v === "function" ? v(states[i]) : v; }; setters.push(setter); return [states[i], setter]; },
        useEffect: (effect) => { effects.push(effect); }, useCallback: (fn) => fn,
        useMemo: (fn) => fn(), useRef: (value) => ({ current: value }), useSyncExternalStore: (_subscribe, _client, server) => server(),
    } };
}
function elements(tree) {
    if (Array.isArray(tree)) return tree.flatMap(elements);
    if (!React.isValidElement(tree)) return [];
    return [tree, ...elements(tree.props.children)];
}
const Link = "test-link";
const request = (url) => new NextRequest(`http://isolated.local${url}`);

test("Source audit resolves all app targets and detects missing routes/inert production buttons", () => {
    const current = auditNavigation(root);
    assert.equal(current.errors.length, 0, JSON.stringify(current.errors));
    assert.ok(current.pages.includes("/sessions") && current.apis.includes("/api/invoices/[invoiceId]/payments"));
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "qlhc-navigation-"));
    try {
        fs.mkdirSync(path.join(fixture, "src/app"), { recursive: true });
        fs.writeFileSync(path.join(fixture, "src/app/page.tsx"), 'export default function Page(){return <><a href="/missing">Go</a><button type="button">Dead</button><form><button>Save</button></form></>}');
        const bad = auditNavigation(fixture);
        assert.equal(bad.errors.length, 2);
        assert.ok(bad.errors.some((error) => error.target === "/missing"));
        assert.ok(bad.errors.some((error) => error.kind === "button"));
    } finally {
        const target = path.resolve(fixture);
        assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
        assert.ok(path.basename(target).startsWith("qlhc-navigation-"));
        fs.rmSync(target, { recursive: true });
    }
});

test("Home entity links preserve the session ID and return from invoice to home", () => {
    const h = hookHarness();
    const { HomeMobileView } = load("src/app/home-mobile-view.tsx", {
        react: h.react, "next/link": Link,
        "@/components/layout/mobile-app-header": { MobileAppHeader: "header" },
        "@/components/layout/mobile-bottom-nav": { MobileBottomNav: "nav" },
        "@/components/ui/search-bar": { SearchBar: "search" },
        "@/components/ui/badge": { Badge: "badge", SessionStatusBadge: "status" },
    });
    const links = elements(HomeMobileView({ lakeName: "Synthetic lake", activeSessionsCount: 1, totalHutsCount: 10, todayRevenue: 160000,
        recentSessions: [{ id: "session-b", customerName: "B", huts: ["Ô số 2"], status: "ACTIVE", packageName: "4h" }],
        recentInvoices: [{ id: "invoice-b", customerName: "B", invoiceNumber: "HD-B", totalAmountVnd: 160000 }],
    })).filter((node) => node.type === Link).map((node) => node.props.href);
    assert.ok(links.includes("/sessions?sessionId=session-b"));
    assert.ok(links.includes("/invoices/invoice-b?returnTo=%2Fhome"));
});

test("Session deep links select their own tenant-loaded session; unknown IDs never select another customer's actions", () => {
    for (const id of ["session-b", "missing-or-other-tenant"]) {
        const h = hookHarness();
        const { SessionsClient } = load("src/app/sessions/sessions-client.tsx", {
            react: h.react, "next/link": Link, "next/dynamic": () => "modal", "next/navigation": { useRouter: () => ({}) },
            "./session-actions": { SessionActions: "session-actions" },
            "@/lib/money": { sessionBalancePresentation: () => ({}) },
            "./session-grid-card": { SessionGridCard: "session-card", computeSessionFinancials: () => ({}), formatVnd: String, formatDuration: String, formatDateTime: String, formatOvertimeDuration: String },
            "@/lib/network/use-network-status": { useNetworkStatus: () => ({ isOnline: true, serverOffsetMs: 0 }) },
            "@/hooks/use-modal-dismiss": { useModalDismiss: () => ({}) },
            "@/hooks/use-session-alarms": { useSessionAlarms: () => {} },
        });
        const sessions = ["session-a", "session-b"].map((key) => ({ id: key, customer: { name: key }, package: { durationMinutes: 240 }, hutLinks: [], invoices: [] }));
        const nodes = elements(SessionsClient({ initialSessionId: id, activeSessions: sessions, packages: [], canComplete: true, canCancel: true, canOpenSession: true }));
        const actions = nodes.filter((node) => node.type === "session-actions");
        if (id === "session-b") { assert.ok(actions.length > 0); assert.ok(actions.every((node) => node.props.sessionId === id)); }
        else { assert.equal(actions.length, 0); assert.ok(nodes.some((node) => node.props.role === "status")); }
    }
});

test("Customer-specific ticket preselects an allowed customer and isolates drafts; absent IDs cannot open a ticket", () => {
    for (const id of ["customer-b", "other-tenant"]) {
        const h = hookHarness();
        const generalDraft = JSON.stringify({ customerId: "customer-a", selectedItems: [{ productId: "other-goods", quantity: 7 }] });
        const storage = new Map([["qlhc_ticket_form_draft", generalDraft]]);
        const { OpenSessionForm } = load("src/app/sessions/new/open-session-form.tsx", {
            react: h.react, "react-dom": { createPortal: () => null }, "next/link": Link, "next/navigation": { useRouter: () => ({}) },
            "@tanstack/react-query": { useQueryClient: () => ({}) }, zod: { z },
            "@/components/ui/button": { Button: "button" }, "@/components/ui/card": { Card: "card" },
            "@/components/ui/input": { Input: "input" }, "@/components/ui/inline-alert": { InlineAlert: "alert" },
            "@/lib/printing/use-printer": { usePrinter: () => ({}) }, "@/lib/printing/types": {},
            "@/lib/network/use-network-status": { useNetworkStatus: () => ({ isOnline: true }) },
            "@/components/ui/bottom-sheet": { BottomSheet: "sheet" }, "@/components/ui/toast": { useToast: () => ({}) },
            "@/hooks/use-fishing-catalog": { useFishingSpots: () => {}, useFishingPackages: () => {} },
            "@/hooks/use-modal-dismiss": { useModalDismiss: () => ({}) }, "../quick-create-actions": {},
            "@/components/payments/pond-transfer-qr": { PondTransferQr: "qr" }, "./check-in-time-section": { CheckInTimeSection: "check-in" },
        }, {
            localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
            setTimeout: (callback) => { callback(); return 1; }, clearTimeout: () => {},
        });
        const nodes = elements(OpenSessionForm({ initialCustomerId: id, customers: [{ id: "customer-b", name: "Customer B" }], packages: [], huts: [] }));
        if (id === "customer-b") {
            h.effects[0](); // restore the selected customer's own draft
            h.effects[1](); // autosave under that customer's key
            assert.equal(storage.get("qlhc_ticket_form_draft"), generalDraft);
            assert.equal(JSON.parse(storage.get("qlhc_ticket_form_draft:customer:customer-b")).customerId, id);
            assert.equal(JSON.parse(storage.get("qlhc_ticket_form_draft:customer:customer-b")).selectedItems.length, 0);
            assert.ok(h.states.includes("customer-b"));
            assert.ok(h.states.includes("Customer B"));
            assert.ok(nodes.some((node) => node.type === "form"));
        } else {
            assert.ok(!nodes.some((node) => node.type === "form"));
            assert.ok(nodes.some((node) => node.type === Link && node.props.href === "/customers"));
        }
    }
});

test("Guest redirect preserves entity/filter/return queries for login without trusting an external origin", async () => {
    const { proxy } = load("src/proxy.ts", {
        "next/server": { NextResponse }, "@/lib/stale-auth-cookie": { classifyAuthCookies: async () => ({ stale: [], authenticated: false }) },
    });
    for (const target of ["/sessions?sessionId=session-b", "/sessions/new?customerId=customer-b", "/reports?preset=custom&from=2026-10-01&customerId=customer-b", "/settings/printer?setup=windows"]) {
        const response = await proxy(request(target));
        const destination = new URL(response.headers.get("location"));
        assert.equal(destination.origin, "http://isolated.local");
        assert.equal(destination.pathname, "/login");
        assert.equal(destination.searchParams.get("redirect"), target);
    }
});

test("Print job endpoints return auth errors without touching jobs or converting them to 500", async () => {
    class AuthenticationError extends Error {}
    class ForbiddenError extends Error {}
    for (const ErrorType of [AuthenticationError, ForbiddenError]) {
        const modules = {
            "next/server": { NextResponse }, "@/generated/prisma/client": { Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" } },
            "@/lib/prisma": { prisma: new Proxy({}, { get() { assert.fail("An unauthenticated request accessed the database"); } }) },
            "@/lib/tenant": { AuthenticationError, ForbiddenError, requireTenantContext: async () => { throw new ErrorType("Access denied"); } },
            "@/lib/api-error": { createInternalErrorResponse: () => assert.fail("Auth error became 500") },
        };
        const list = load("src/app/api/print-jobs/route.ts", modules);
        const detail = load("src/app/api/print-jobs/[jobId]/route.ts", modules);
        for (const method of [() => list.GET(request("/api/print-jobs")), () => list.POST(request("/api/print-jobs")), () => detail.PATCH(request("/api/print-jobs/id"), { params: Promise.resolve({ jobId: "id" }) })]) {
            const response = await method();
            assert.equal(response.status, ErrorType === AuthenticationError ? 401 : 403);
        }
    }
});

test("Isolated build masks inherited production credentials and replaces every database target", () => {
    const env = isolatedEnvironment(root, { DATABASE_URL: "postgresql://production.example/db", GOOGLE_CLIENT_SECRET: "private", BANK_WEBHOOK_SECRET: "private", SOME_API_KEY: "private" });
    for (const key of ["DATABASE_URL", "DIRECT_URL", "SHADOW_DATABASE_URL"]) assert.equal(new URL(env[key]).hostname, "127.0.0.1");
    for (const key of ["GOOGLE_CLIENT_SECRET", "BANK_WEBHOOK_SECRET", "SOME_API_KEY"]) assert.equal(env[key], "");
});
