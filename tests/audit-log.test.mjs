import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
    auditsToCsv,
    buildAuditEventWhere,
    buildStaffAuditRow,
    canViewStaffAudit,
    loginAuditTargets,
    compactChange,
    csvCell,
    hashAuditReadToken,
    parseBearerToken,
    presentAuditEntry,
    writeStaffAudit,
} from "../src/lib/audit-log-core.ts";

const LAKE_A = "11111111-1111-4111-8111-111111111111";
const LAKE_B = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";

test("compact diff keeps only changed fields and drops secrets", () => {
    const diff = compactChange(
        { startAt: "08:00", status: "ACTIVE", password: "secret", priceVnd: 1000 },
        { startAt: "09:00", status: "ACTIVE", passwordHash: "hash", priceVnd: 1000 },
    );
    assert.deepEqual(diff.before, { startAt: "08:00" });
    assert.deepEqual(diff.after, { startAt: "09:00" });
});

test("extension payload keeps priceVnd at the top level for invoice repair", () => {
    const row = buildStaffAuditRow({
        lakeId: LAKE_A,
        action: "FISHING_SESSION_EXTENDED",
        entityType: "FishingSession",
        entityId: SESSION_ID,
        createdBy: "staff-1",
        actorName: "Lan",
        actorRole: "STAFF",
        before: { plannedEndAt: "2026-10-23T08:00:00.000Z" },
        after: { plannedEndAt: "2026-10-23T09:00:00.000Z" },
        extra: { priceVnd: 100000, packageName: "Gói 1 giờ", token: "qlh_secret" },
    });
    const payload = JSON.parse(row.payload);
    assert.equal(payload.priceVnd, 100000);
    assert.equal(payload.packageName, "Gói 1 giờ");
    assert.equal(payload.token, undefined);
    assert.equal(payload.before.plannedEndAt, "2026-10-23T08:00:00.000Z");
    assert.equal(payload.after.plannedEndAt, "2026-10-23T09:00:00.000Z");
    assert.equal(payload.actor.name, "Lan");
    assert.equal(payload.actor.role, "STAFF");
    assert.equal(row.lakeId, LAKE_A);
    assert.equal(row.createdBy, "staff-1");
});

test("legacy rows without before/after still present", () => {
    const presented = presentAuditEntry({
        id: "evt-1",
        createdAt: new Date("2026-10-23T01:00:00.000Z"),
        action: "FISHING_SESSION_OPENED",
        entityType: "FishingSession",
        entityId: SESSION_ID,
        createdBy: "staff-1",
        payload: JSON.stringify({ startAt: "2026-10-23T01:00:00.000Z", isCustomStart: false }),
    });
    assert.equal(presented.before, null);
    assert.equal(presented.after, null);
    assert.equal(presented.legacy.startAt, "2026-10-23T01:00:00.000Z");
    assert.equal(presented.actorId, "staff-1");
    assert.equal(presented.actionLabel, "Mở phiên");
});

test("unknown login failures are not written, known ponds get one row each", () => {
    assert.equal(loginAuditTargets(false, []), null);
    assert.equal(loginAuditTargets(false, [{ lakeId: "", role: "STAFF" }]), null);
    assert.deepEqual(loginAuditTargets(false, [{ lakeId: LAKE_A, role: "STAFF" }]), [
        { lakeId: LAKE_A, role: "STAFF" },
    ]);
    assert.equal(loginAuditTargets(true, [])?.[0].lakeId, null);
    assert.equal(loginAuditTargets(true, [
        { lakeId: LAKE_A, role: "STAFF" },
        { lakeId: LAKE_B, role: "STAFF" },
        { lakeId: "33333333-3333-4333-8333-333333333333", role: "STAFF" },
        { lakeId: "44444444-4444-4444-8444-444444444444", role: "STAFF" },
    ]).length, 3);
});

test("owner and manager can view the log, staff cannot", () => {
    assert.equal(canViewStaffAudit("OWNER"), true);
    assert.equal(canViewStaffAudit("MANAGER"), true);
    assert.equal(canViewStaffAudit("STAFF"), false);
    assert.equal(canViewStaffAudit("ADMIN"), false);
    assert.equal(canViewStaffAudit(null), false);
});

test("audit query is pinned to one pond and ignores another lake id", () => {
    const { where } = buildAuditEventWhere(LAKE_A, {
        actorId: "staff-1",
        action: "LOGIN_FAILED",
        entityId: SESSION_ID,
        from: "2026-10-01",
        to: "2026-10-23",
        now: new Date("2026-10-23T12:00:00.000Z"),
    });
    assert.equal(where.lakeId, LAKE_A);
    assert.notEqual(where.lakeId, LAKE_B);
    assert.equal(where.createdBy, "staff-1");
    assert.equal(where.action, "LOGIN_FAILED");
    assert.equal(where.AND[0].OR[0].entityId, SESSION_ID);
    assert.equal(where.AND[0].OR[1].payload.contains, SESSION_ID);
    assert.ok(where.createdAt.gte < where.createdAt.lte);
});

test("a wide date range is clamped and a missing pond id is rejected", () => {
    const wide = buildAuditEventWhere(LAKE_A, {
        from: "2020-01-01",
        to: "2026-10-23",
        now: new Date("2026-10-23T12:00:00.000Z"),
    });
    assert.equal(wide.clamped, true);
    assert.ok(wide.where.createdAt.lte.getTime() - wide.where.createdAt.gte.getTime() <= 90 * 24 * 60 * 60 * 1000);
    assert.equal(wide.where.lakeId, LAKE_A);
    assert.throws(() => buildAuditEventWhere("  ", {}), /lakeId is required/);
});

test("filters cannot inject a different action or actor", () => {
    const { where } = buildAuditEventWhere(LAKE_A, {
        actorId: "staff-1 OR lakeId = other",
        action: "LOGIN_FAILED; drop",
        entityId: "not-a-uuid",
    });
    assert.equal(where.createdBy, undefined);
    assert.equal(where.action, undefined);
    assert.equal(where.AND, undefined);
    assert.equal(where.lakeId, LAKE_A);
});

test("csv cells neutralize spreadsheet formulas", () => {
    assert.equal(csvCell("=cmd"), "'=cmd");
    assert.equal(csvCell("ok"), "ok");
    const csv = auditsToCsv([{
        id: "1",
        createdAt: "2026-10-23T01:00:00.000Z",
        action: "LOGIN_SUCCEEDED",
        actionLabel: "Đăng nhập thành công",
        entityType: "User",
        entityId: "user-1",
        actorId: "user-1",
        actorName: "Lan",
        actorRole: "OWNER",
        before: null,
        after: { result: "success" },
        legacy: null,
        ip: "203.0.113.5",
        userAgent: null,
    }]);
    assert.match(csv, /LOGIN_SUCCEEDED/);
    assert.match(csv, /203\.0\.113\.5/);
    assert.doesNotMatch(csv, /^=/);
});

test("bearer parser accepts only the pond token prefix", () => {
    assert.equal(parseBearerToken(null), null);
    assert.equal(parseBearerToken("Bearer qlh_abc"), "qlh_abc");
    assert.equal(parseBearerToken("bearer qlh_abc"), "qlh_abc");
    assert.equal(parseBearerToken("Bearer session-token"), "");
    assert.equal(hashAuditReadToken("qlh_abc"), hashAuditReadToken("qlh_abc"));
    assert.notEqual(hashAuditReadToken("qlh_abc"), hashAuditReadToken("qlh_abd"));
});

test("an oversized payload stays valid JSON", () => {
    const row = buildStaffAuditRow({
        lakeId: LAKE_A,
        action: "FISHING_SESSION_OPENED",
        entityType: "FishingSession",
        entityId: SESSION_ID,
        createdBy: "staff-1",
        before: null,
        after: { note: "x".repeat(4000) },
    });
    const payload = JSON.parse(row.payload);
    assert.equal(payload.after.truncated, true);
});

test("the owner page does not poll and the bot route is read-only", () => {
    const page = fs.readFileSync(new URL("../src/app/settings/nhat-ky/page.tsx", import.meta.url), "utf8");
    const route = fs.readFileSync(new URL("../src/app/api/audit-events/route.ts", import.meta.url), "utf8");
    assert.equal(page.includes("setInterval"), false);
    assert.equal(page.includes("router.refresh"), false);
    assert.match(route, /export async function GET/);
    assert.equal(/export async function (POST|PUT|PATCH|DELETE)/.test(route), false);
});

test("a failed audit insert can be swallowed by the caller", async () => {
    const db = {
        auditEvent: {
            create: async () => {
                throw new Error("disk full");
            },
        },
    };
    await assert.doesNotReject(() => writeStaffAudit(db, {
        lakeId: LAKE_A,
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: "user-1",
        createdBy: "user-1",
        before: null,
        after: { result: "failure" },
    }, { bestEffort: true }));
});
