import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let authCookie = "";
let testLakeId = "";
let testOrgId = "";
let testUserId = "";

// Helper to register & login a lake owner
async function setupOwner(lakeSuffix) {
    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `test_saas_${lakeSuffix}_${Date.now()}@example.com`;
    const testPassword = "SecurePassword123!";

    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: `Owner SaaS ${lakeSuffix}`,
            phone: testPhone,
            email: testEmail,
            password: testPassword,
            lakeName: `Lake SaaS ${lakeSuffix}`,
        }),
    });

    assert.equal(regRes.status, 201, "Registration failed");
    const regData = await regRes.json();
    testLakeId = regData.lakeId;
    testOrgId = regData.organizationId;
    testUserId = regData.userId;

    // Get NextAuth csrf token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfCookies = csrfRes.headers.get("set-cookie") || "";

    // Sign in to get session cookie
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: csrfCookies,
        },
        body: new URLSearchParams({
            csrfToken: csrfData.csrfToken,
            email: testEmail,
            password: testPassword,
            redirect: "false",
            json: "true",
        }),
        redirect: "manual",
    });

    const setCookies = loginRes.headers.get("set-cookie") || "";
    authCookie = setCookies
        .split(",")
        .map((c) => c.split(";")[0].trim())
        .filter((c) => c.startsWith("next-auth.session-token") || c.startsWith("__Secure-next-auth.session-token"))
        .join("; ");
}

let testAreaId = "";

before(async () => {
    await setupOwner("SubTest");

    // Create an Area for hut creation tests
    const client = await pool.connect();
    try {
        const areaRes = await client.query(
            `INSERT INTO "Area" ("id", "lakeId", "name", "updatedAt") VALUES (gen_random_uuid()::text, $1, 'Khu Thử Nghiệm', NOW()) RETURNING "id"`,
            [testLakeId],
        );
        testAreaId = areaRes.rows[0].id;
    } finally {
        client.release();
    }
});

after(async () => {
    const client = await pool.connect();
    try {
        if (testLakeId) {
            await client.query(`DELETE FROM "SubscriptionOrder" WHERE "lakeId" = $1`, [testLakeId]);
            await client.query(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [testLakeId]);
            await client.query(`DELETE FROM "Area" WHERE "lakeId" = $1`, [testLakeId]);
            await client.query(`DELETE FROM "AuditEvent" WHERE "lakeId" = $1`, [testLakeId]);
            await client.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [testLakeId]);
            await client.query(`DELETE FROM "Lake" WHERE "id" = $1`, [testLakeId]);
            if (testOrgId) {
                await client.query(`DELETE FROM "Organization" WHERE "id" = $1`, [testOrgId]);
            }
            if (testUserId) {
                await client.query(`DELETE FROM "User" WHERE "id" = $1`, [testUserId]);
            }
        }
    } finally {
        client.release();
        await pool.end();
    }
});

test("Test 1: Tạo hồ mới tự động kích hoạt gói TRIAL 30 ngày full tính năng", async () => {
    const client = await pool.connect();
    try {
        const lakeRes = await client.query(
            `SELECT "subscriptionStatus", "subscriptionPlan", "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId],
        );
        const orgRes = await client.query(
            `SELECT "subscriptionPlan", "validUntil" FROM "Organization" WHERE "id" = $1`,
            [testOrgId],
        );

        const lake = lakeRes.rows[0];
        const org = orgRes.rows[0];

        assert.equal(lake.subscriptionStatus, "TRIAL");
        assert.equal(lake.subscriptionPlan, "TRIAL");
        assert.ok(lake.subscriptionExpiresAt, "Lake subscriptionExpiresAt must exist");

        assert.equal(org.subscriptionPlan, "TRIAL");
        assert.ok(org.validUntil, "Organization validUntil must exist");

        // Verify validity is ~30 days in the future (between 29 and 31 days)
        const daysRemaining = (new Date(lake.subscriptionExpiresAt) - new Date()) / (1000 * 60 * 60 * 24);
        assert.ok(daysRemaining >= 29 && daysRemaining <= 31, `Trial duration should be ~30 days, got ${daysRemaining}`);
    } finally {
        client.release();
    }
});

let createdSilverOrderCode = "";
let createdSilverOrderId = "";

test("Test 2: Tạo đơn hàng PENDING sinh mã VietQR Techcombank (Gói Bạc 99k & Gói Vàng 179k)", async () => {
    // 1. Create Silver Order
    const silverRes = await fetch(`${BASE_URL}/api/subscription/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({ plan: "SILVER" }),
    });

    assert.equal(silverRes.status, 201);
    const silverData = await silverRes.json();
    assert.equal(silverData.order.status, "PENDING");
    assert.equal(silverData.order.amountVnd, 99000);
    assert.equal(silverData.order.planCode, "SILVER");
    assert.ok(silverData.order.orderCode.startsWith("HC"));
    assert.ok(silverData.paymentInfo.qrUrl.includes("TCB-8799999990"));
    assert.equal(silverData.paymentInfo.accountNumber, "8799999990");
    assert.equal(silverData.paymentInfo.accountName, "TRAN ANH HUAN");
    assert.equal(silverData.paymentInfo.hotline, "0855550813");
    assert.ok(silverData.paymentInfo.legalFeeNote.includes("thực nhận của gói cước"));

    createdSilverOrderCode = silverData.order.orderCode;
    createdSilverOrderId = silverData.order.id;

    // 2. Create Gold Order
    const goldRes = await fetch(`${BASE_URL}/api/subscription/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({ plan: "GOLD" }),
    });

    assert.equal(goldRes.status, 201);
    const goldData = await goldRes.json();
    assert.equal(goldData.order.amountVnd, 179000);
    assert.equal(goldData.order.planCode, "GOLD");
});

test("Test 3: Webhook ngân hàng tự động kích hoạt, cộng dồn 30 ngày vào validUntil & tạo AuditEvent", async () => {
    const client = await pool.connect();
    let initialExpiresAt;
    try {
        const curRes = await client.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId],
        );
        initialExpiresAt = new Date(curRes.rows[0].subscriptionExpiresAt);
    } finally {
        client.release();
    }

    // Call Bank Webhook with memo containing createdSilverOrderCode
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/bank`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content: `Thanh toan don hang ${createdSilverOrderCode}`,
            transferAmount: 99000,
            referenceCode: `FT_TEST_${Date.now()}`,
        }),
    });

    assert.equal(webhookRes.status, 200);
    const webhookData = await webhookRes.json();
    assert.equal(webhookData.success, true);
    assert.equal(webhookData.data.idempotent, false);

    // Verify DB updates
    const client2 = await pool.connect();
    try {
        const orderRes = await client2.query(
            `SELECT "status", "bankRef" FROM "SubscriptionOrder" WHERE "id" = $1`,
            [createdSilverOrderId],
        );
        assert.equal(orderRes.rows[0].status, "PAID");

        const lakeRes = await client2.query(
            `SELECT "subscriptionStatus", "subscriptionPlan", "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId],
        );
        const lake = lakeRes.rows[0];
        assert.equal(lake.subscriptionStatus, "ACTIVE");
        assert.equal(lake.subscriptionPlan, "SILVER");

        // Verify 30 days added to initialExpiresAt
        const newExpiresAt = new Date(lake.subscriptionExpiresAt);
        const diffDays = Math.round((newExpiresAt - initialExpiresAt) / (1000 * 60 * 60 * 24));
        assert.equal(diffDays, 30, `New expiresAt should be 30 days added to initial, diff was ${diffDays}`);

        // Verify AuditEvent
        const auditRes = await client2.query(
            `SELECT "action", "entityType" FROM "AuditEvent" WHERE "lakeId" = $1 AND "entityType" = 'SUBSCRIPTION' AND "action" = 'PLAN_ACTIVATED'`,
            [testLakeId],
        );
        assert.ok(auditRes.rows.length >= 1, "AuditEvent for PLAN_ACTIVATED must be recorded");
    } finally {
        client2.release();
    }
});

test("Test 4: Idempotency chống cộng dồn thời gian khi Webhook gửi lại", async () => {
    const client = await pool.connect();
    let beforeExpiresAt;
    try {
        const curRes = await client.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId],
        );
        beforeExpiresAt = new Date(curRes.rows[0].subscriptionExpiresAt).getTime();
    } finally {
        client.release();
    }

    // Call Webhook AGAIN with same content & orderCode
    const retryRes = await fetch(`${BASE_URL}/api/webhooks/bank`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content: `Thanh toan don hang ${createdSilverOrderCode}`,
            transferAmount: 99000,
            referenceCode: `FT_RETRY_${Date.now()}`,
        }),
    });

    assert.equal(retryRes.status, 200);
    const retryData = await retryRes.json();
    assert.equal(retryData.data.idempotent, true, "Should return idempotent: true");

    // Verify time was NOT added again
    const client2 = await pool.connect();
    try {
        const curRes = await client2.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId],
        );
        const afterExpiresAt = new Date(curRes.rows[0].subscriptionExpiresAt).getTime();
        assert.equal(beforeExpiresAt, afterExpiresAt, "ExpiresAt must NOT change on duplicate webhook");
    } finally {
        client2.release();
    }
});

test("Test 5: Guard Enforcement: Gói SILVER chặn tối đa 30 ô câu và 1 nhân viên, GOLD không giới hạn", async () => {
    const client = await pool.connect();
    try {
        // Clear huts to start clean
        await client.query(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [testLakeId]);

        // Insert 30 huts into DB
        for (let i = 1; i <= 30; i++) {
            await client.query(
                `INSERT INTO "Hut" ("id", "lakeId", "areaId", "name", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())`,
                [testLakeId, testAreaId, `Ô câu ${i}`],
            );
        }
    } finally {
        client.release();
    }

    // Try creating 31st spot via /api/spots (Lake is currently SILVER)
    const spot31Res = await fetch(`${BASE_URL}/api/spots`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Ô câu thứ 31",
            areaId: testAreaId,
        }),
    });

    assert.equal(spot31Res.status, 403, "Should reject 31st spot on SILVER plan");
    const spot31Data = await spot31Res.json();
    assert.ok(spot31Data.error.includes("Gói Bạc (SILVER) chỉ hỗ trợ tối đa 30 ô câu"));

    // Also test /api/huts route for 31st spot
    const hut31Res = await fetch(`${BASE_URL}/api/huts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Chòi thứ 31",
            areaId: testAreaId,
        }),
    });
    assert.equal(hut31Res.status, 403, "Should reject 31st hut on SILVER plan");

    // Test Staff limit on SILVER:
    // Create 1st staff member -> Should succeed
    const staff1Res = await fetch(`${BASE_URL}/api/members`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Nhân Viên 1",
            email: `staff1_${Date.now()}@example.com`,
            password: "StaffPassword123!",
            role: "STAFF",
        }),
    });
    assert.equal(staff1Res.status, 201, "Should allow 1 staff member on SILVER");

    // Try creating 2nd staff member -> Should fail with 403
    const staff2Res = await fetch(`${BASE_URL}/api/members`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Nhân Viên 2",
            email: `staff2_${Date.now()}@example.com`,
            password: "StaffPassword123!",
            role: "STAFF",
        }),
    });
    assert.equal(staff2Res.status, 403, "Should reject 2nd staff on SILVER plan");
    const staff2Data = await staff2Res.json();
    assert.ok(staff2Data.error.includes("Gói Bạc (SILVER) chỉ hỗ trợ tối đa 1 nhân viên"));

    // Upgrade lake to GOLD
    const client2 = await pool.connect();
    try {
        await client2.query(`UPDATE "Lake" SET "subscriptionPlan" = 'GOLD' WHERE "id" = $1`, [testLakeId]);
        await client2.query(`UPDATE "Organization" SET "subscriptionPlan" = 'GOLD' WHERE "id" = $1`, [testOrgId]);
    } finally {
        client2.release();
    }

    // Now test creating spot on GOLD -> Should succeed!
    const spotGoldRes = await fetch(`${BASE_URL}/api/spots`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Ô câu thứ 31 (GOLD)",
            areaId: testAreaId,
        }),
    });
    assert.equal(spotGoldRes.status, 201, "Should allow >30 spots on GOLD");

    // Test creating 2nd staff on GOLD -> Should succeed!
    const staffGoldRes = await fetch(`${BASE_URL}/api/members`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Nhân Viên 2 (GOLD)",
            email: `staff2_gold_${Date.now()}@example.com`,
            password: "StaffPassword123!",
            role: "STAFF",
        }),
    });
    assert.equal(staffGoldRes.status, 201, "Should allow >1 staff on GOLD");
});
