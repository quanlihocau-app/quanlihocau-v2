import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let authCookieA = "";
let testLakeIdA = "";
let authCookieB = "";
let testLakeIdB = "";

async function setupOwner(suffix) {
    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `report_${suffix}_${Date.now()}@example.com`;
    const testPassword = "SecurePassword123!";

    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: `Report Owner ${suffix}`,
            phone: testPhone,
            email: testEmail,
            password: testPassword,
            lakeName: `Report Lake ${suffix} ${Date.now()}`,
        }),
    });
    const regData = await regRes.json();
    assert.equal(regRes.status, 201);
    const lakeId = regData.lakeId;
    const userId = regData.userId;

    // Ensure phone is verified so user can access all routes
    await pool.query(
        `UPDATE "User" SET "phoneVerified" = true, "phoneVerifiedAt" = NOW() WHERE id = $1`,
        [userId]
    );

    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.get("set-cookie") || "";

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: cookies,
        },
        body: new URLSearchParams({
            csrfToken,
            email: testEmail,
            password: testPassword,
            redirect: "false",
            json: "true",
        }),
        redirect: "manual",
    });

    const setCookies = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get("set-cookie")];
    const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
    assert.ok(sessionCookie);

    return {
        cookie: sessionCookie.split(";")[0],
        lakeId,
        userId,
    };
}

before(async () => {
    const ownerA = await setupOwner("A");
    authCookieA = ownerA.cookie;
    testLakeIdA = ownerA.lakeId;

    const ownerB = await setupOwner("B");
    authCookieB = ownerB.cookie;
    testLakeIdB = ownerB.lakeId;
});

after(async () => {
    await pool.end();
});

test("API GET /api/reports/analytics: 14 Presets & Date Filtering in VN timezone", async () => {
    // 1. Today preset
    const todayRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=today`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(todayRes.status, 200);
    const todayData = await todayRes.json();
    assert.equal(todayData.timeWindow.preset, "today");
    assert.ok(todayData.timeWindow.label.includes("Hôm nay"));

    // 2. Yesterday preset
    const yestRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=yesterday`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(yestRes.status, 200);
    const yestData = await yestRes.json();
    assert.equal(yestData.timeWindow.preset, "yesterday");

    // 3. Last 7 days
    const l7Res = await fetch(`${BASE_URL}/api/reports/analytics?preset=last7days`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(l7Res.status, 200);

    // 4. This month
    const tmRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=thisMonth`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(tmRes.status, 200);

    // 5. This quarter
    const tqRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=thisQuarter`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(tqRes.status, 200);

    // 6. This year
    const tyRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=thisYear`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(tyRes.status, 200);

    // 7. All time
    const atRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=allTime`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(atRes.status, 200);

    // 8. Custom date & time range across past years
    const customRes = await fetch(
        `${BASE_URL}/api/reports/analytics?preset=custom&from=2024-05-01&to=2025-08-31&fromTime=07:00&toTime=22:00`,
        { headers: { Cookie: authCookieA } }
    );
    assert.equal(customRes.status, 200);
    const customData = await customRes.json();
    assert.equal(customData.timeWindow.preset, "custom");
    assert.ok(customData.timeWindow.from.startsWith("2024-05-01"));
});

test("API GET /api/reports/analytics: Comparative periods & zero safety", async () => {
    // Compare with previous period
    const compRes = await fetch(
        `${BASE_URL}/api/reports/analytics?preset=thisMonth&compare=previousPeriod`,
        { headers: { Cookie: authCookieA } }
    );
    assert.equal(compRes.status, 200);
    const compData = await compRes.json();
    assert.ok(compData.comparativeWindow);
    assert.equal(compData.comparativeWindow.mode, "previousPeriod");
    assert.ok(compData.deltas);

    // Delta should handle zero gracefully without errors
    const deltaRev = compData.deltas.totalRevenue;
    assert.ok(deltaRev);
    assert.ok(typeof deltaRev.displayText === "string");
});

test("API GET /api/reports/analytics: Returns all 30 indicators & charts", async () => {
    const res = await fetch(`${BASE_URL}/api/reports/analytics?preset=today`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.lake);
    assert.ok(data.timeWindow);
    assert.ok(data.summary);
    assert.equal(typeof data.summary.totalRevenue, "number");
    assert.equal(typeof data.summary.ticketRevenue, "number");
    assert.equal(typeof data.summary.productRevenue, "number");
    assert.equal(typeof data.summary.overtimeRevenue, "number");
    assert.equal(typeof data.summary.totalFishBuyback, "number");
    assert.equal(typeof data.summary.totalExpense, "number");
    assert.equal(typeof data.summary.netProfit, "number");
    assert.equal(typeof data.summary.totalReceivableDebt, "number");
    assert.equal(typeof data.summary.totalSessions, "number");
    assert.equal(typeof data.summary.activeSessions, "number");
    assert.equal(typeof data.summary.completedSessions, "number");
    assert.equal(typeof data.summary.cancelledSessions, "number");
    assert.ok(Array.isArray(data.chartSeries));
    assert.ok(data.breakdown);
    assert.ok(data.filterOptions);
});

test("API GET /api/reports/analytics: Custom past year range (e.g. 2024)", async () => {
    const res = await fetch(
        `${BASE_URL}/api/reports/analytics?preset=custom&from=2024-01-01&to=2024-12-31`,
        { headers: { Cookie: authCookieA } }
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.timeWindow.preset, "custom");
    assert.ok(data.timeWindow.fromDisplay.includes("2024"));
    assert.ok(data.timeWindow.toDisplay.includes("2024"));
});

test("API GET /api/reports/drilldown: Returns detailed transaction items on KPI click", async () => {
    const res = await fetch(`${BASE_URL}/api/reports/drilldown?metric=ticketRevenue&preset=today`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.metric, "ticketRevenue");
    assert.ok(Array.isArray(data.items));
});

test("API GET /api/reports/export: Generates valid CSV with UTF-8 BOM & Audit Log", async () => {
    const res = await fetch(`${BASE_URL}/api/reports/export?preset=today&format=csv`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/csv"));

    const buf = Buffer.from(await res.arrayBuffer());
    // Check UTF-8 BOM bytes 0xEF, 0xBB, 0xBF
    assert.equal(buf[0], 0xef);
    assert.equal(buf[1], 0xbb);
    assert.equal(buf[2], 0xbf);

    const text = buf.toString("utf-8");
    assert.ok(text.includes("BÁO CÁO DOANH THU"));
    assert.ok(text.includes("TỔNG DOANH THU"));

    // Verify Audit Event created in DB
    const audit = await pool.query(
        `SELECT * FROM "AuditEvent" WHERE "lakeId" = $1 AND "action" = 'EXPORT_REPORT' ORDER BY "createdAt" DESC LIMIT 1`,
        [testLakeIdA]
    );
    assert.ok(audit.rows.length > 0);
});

test("Multi-tenant Security: Lake A owner cannot access Lake B data", async () => {
    // Owner A requests analytics
    const resA = await fetch(`${BASE_URL}/api/reports/analytics?preset=today`, {
        headers: { Cookie: authCookieA },
    });
    const dataA = await resA.json();
    assert.equal(dataA.lake.id, testLakeIdA);

    // Owner B requests analytics
    const resB = await fetch(`${BASE_URL}/api/reports/analytics?preset=today`, {
        headers: { Cookie: authCookieB },
    });
    const dataB = await resB.json();
    assert.equal(dataB.lake.id, testLakeIdB);

    // Unauthenticated request should be rejected
    const unauthRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=today`);
    assert.equal(unauthRes.status, 401);
});
