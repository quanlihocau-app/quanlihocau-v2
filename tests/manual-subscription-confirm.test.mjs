import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let superAdminCookie = "";
let ownerCookie = "";

let superAdminId = "";
let ownerId = "";

let testOrgId = "";
let testLakeId = "";
let testRolloverLakeId = "";
let testExpiredLakeId = "";

let order1Id = ""; // Normal pending -> paid with real bankRef
let order2Id = ""; // Pending -> paid with empty bankRef
let order3Id = ""; // Cancelled -> should reject
let order4Id = ""; // For concurrent race condition test
let order5Id = ""; // For rollover before expiration test
let order6Id = ""; // For expired lake test

const timestamp = Date.now();
const testPassword = "TestPassword123!";

before(async () => {
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        // 1. Create Organization & Lakes
        const orgRes = await client.query(
            `INSERT INTO "Organization" ("id", "name", "subscriptionPlan", "validUntil", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'TRIAL', NOW() + INTERVAL '7 days', NOW(), NOW()) RETURNING "id"`,
            [`Org Test Manual Confirm ${timestamp}`]
        );
        testOrgId = orgRes.rows[0].id;

        // Lake 1: normal test lake
        const lake1Res = await client.query(
            `INSERT INTO "Lake" ("id", "organizationId", "name", "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'TRIAL', 'TRIAL', NOW() + INTERVAL '7 days', NOW(), NOW()) RETURNING "id"`,
            [testOrgId, `Lake Normal ${timestamp}`]
        );
        testLakeId = lake1Res.rows[0].id;

        // Lake 2: Lake with 10 days remaining in the future
        const lake2Res = await client.query(
            `INSERT INTO "Lake" ("id", "organizationId", "name", "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'SILVER', 'ACTIVE', NOW() + INTERVAL '10 days', NOW(), NOW()) RETURNING "id"`,
            [testOrgId, `Lake Rollover ${timestamp}`]
        );
        testRolloverLakeId = lake2Res.rows[0].id;

        // Lake 3: Lake already expired 5 days ago (SUSPENDED)
        const lake3Res = await client.query(
            `INSERT INTO "Lake" ("id", "organizationId", "name", "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'SILVER', 'SUSPENDED', NOW() - INTERVAL '5 days', NOW(), NOW()) RETURNING "id"`,
            [testOrgId, `Lake Expired ${timestamp}`]
        );
        testExpiredLakeId = lake3Res.rows[0].id;

        // 2. Create Super Admin User
        const saEmail = `superadmin_confirm_${timestamp}@quanlihocau.test`;
        const saRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Super Admin Test', $2, 'SUPER_ADMIN', true, 1, NOW(), NOW()) RETURNING "id"`,
            [saEmail, hashedPassword]
        );
        superAdminId = saRes.rows[0].id;

        // 3. Create Normal Owner User
        const ownerEmail = `owner_confirm_${timestamp}@quanlihocau.test`;
        const ownerRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Owner Test', $2, 'USER', true, 1, NOW(), NOW()) RETURNING "id"`,
            [ownerEmail, hashedPassword]
        );
        ownerId = ownerRes.rows[0].id;

        await client.query(
            `INSERT INTO "Membership" ("id", "userId", "lakeId", "role", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW(), NOW())`,
            [ownerId, testLakeId]
        );

        // 4. Create Subscription Orders
        // Order 1: PENDING
        const o1 = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 'SILVER', 99000, 30, 'PENDING', NOW(), NOW()) RETURNING "id"`,
            [`HC${Math.floor(100000 + Math.random() * 900000)}`, testOrgId, testLakeId]
        );
        order1Id = o1.rows[0].id;

        // Order 2: PENDING (for empty bankRef test)
        const o2 = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 'GOLD', 179000, 30, 'PENDING', NOW(), NOW()) RETURNING "id"`,
            [`HC${Math.floor(100000 + Math.random() * 900000)}`, testOrgId, testLakeId]
        );
        order2Id = o2.rows[0].id;

        // Order 3: CANCELLED
        const o3 = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 'SILVER', 99000, 30, 'CANCELLED', NOW(), NOW()) RETURNING "id"`,
            [`HC${Math.floor(100000 + Math.random() * 900000)}`, testOrgId, testLakeId]
        );
        order3Id = o3.rows[0].id;

        // Order 4: PENDING (for concurrent race test)
        const o4 = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 'SILVER', 99000, 30, 'PENDING', NOW(), NOW()) RETURNING "id"`,
            [`HC${Math.floor(100000 + Math.random() * 900000)}`, testOrgId, testLakeId]
        );
        order4Id = o4.rows[0].id;

        // Order 5: PENDING on Rollover Lake
        const o5 = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 'SILVER', 99000, 30, 'PENDING', NOW(), NOW()) RETURNING "id"`,
            [`HC${Math.floor(100000 + Math.random() * 900000)}`, testOrgId, testRolloverLakeId]
        );
        order5Id = o5.rows[0].id;

        // Order 6: PENDING on Expired Lake
        const o6 = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 'SILVER', 99000, 30, 'PENDING', NOW(), NOW()) RETURNING "id"`,
            [`HC${Math.floor(100000 + Math.random() * 900000)}`, testOrgId, testExpiredLakeId]
        );
        order6Id = o6.rows[0].id;

        // Helper login function
        async function getSessionCookie(email, password) {
            const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
            const { csrfToken } = await csrfRes.json();
            const cookies = csrfRes.headers.get("set-cookie") || "";

            const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: cookies,
                },
                body: new URLSearchParams({
                    csrfToken,
                    email,
                    password,
                    redirect: "false",
                    json: "true",
                }),
                redirect: "manual",
            });

            const setCookies = loginRes.headers.getSetCookie
                ? loginRes.headers.getSetCookie()
                : [loginRes.headers.get("set-cookie")];
            const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
            return sessionCookie ? sessionCookie.split(";")[0] : "";
        }

        superAdminCookie = await getSessionCookie(saEmail, testPassword);
        ownerCookie = await getSessionCookie(ownerEmail, testPassword);
    } finally {
        client.release();
    }
});

after(async () => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM "AuditEvent" WHERE "lakeId" IN ($1, $2, $3)`, [
            testLakeId,
            testRolloverLakeId,
            testExpiredLakeId,
        ]);
        await client.query(`DELETE FROM "SubscriptionOrder" WHERE "organizationId" = $1`, [testOrgId]);
        await client.query(`DELETE FROM "Membership" WHERE "userId" IN ($1, $2)`, [superAdminId, ownerId]);
        await client.query(`DELETE FROM "Lake" WHERE "organizationId" = $1`, [testOrgId]);
        await client.query(`DELETE FROM "Organization" WHERE "id" = $1`, [testOrgId]);
        await client.query(`DELETE FROM "User" WHERE "id" IN ($1, $2)`, [superAdminId, ownerId]);
    } catch {
        // cleanup best effort
    } finally {
        client.release();
        await pool.end();
    }
});

test("Test 1: Phân quyền - Người dùng chưa đăng nhập nhận 401 Unauthorized", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders/${order1Id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            reason: "Đối soát thủ công",
            reconciliationMethod: "BANK_STATEMENT",
        }),
    });

    assert.equal(res.status, 401);
});

test("Test 2: Phân quyền - Người dùng bình thường (OWNER) nhận 403 Forbidden", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders/${order1Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: ownerCookie,
        },
        body: JSON.stringify({
            reason: "Đối soát thủ công",
            reconciliationMethod: "BANK_STATEMENT",
        }),
    });

    assert.equal(res.status, 403);
});

test("Test 3: Trạng thái đơn sai - Không được phép xác nhận đơn hàng CANCELLED (400)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders/${order3Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            reason: "Cố gắng xác nhận đơn đã hủy",
            reconciliationMethod: "BANK_STATEMENT",
        }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "Đơn hàng đã bị hủy, không thể xác nhận thanh toán.");
});

test("Test 4: Xác nhận thành công với mã giao dịch ngân hàng thực tế (Real Bank Ref)", async () => {
    const realBankRef = "FT262509988776";
    const res = await fetch(`${BASE_URL}/api/admin/orders/${order1Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            bankRef: realBankRef,
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Đã đối soát sao kê Techcombank đúng 99.000đ",
        }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.message.includes("thành công"));

    // Verify DB
    const client = await pool.connect();
    try {
        const orderDb = await client.query(
            `SELECT "status", "bankRef", "rawWebhookPayload", "paidAt" FROM "SubscriptionOrder" WHERE "id" = $1`,
            [order1Id]
        );
        assert.equal(orderDb.rows[0].status, "PAID");
        assert.equal(orderDb.rows[0].bankRef, realBankRef);
        assert.ok(orderDb.rows[0].paidAt !== null);

        const lakeDb = await client.query(
            `SELECT "subscriptionStatus", "subscriptionPlan", "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId]
        );
        assert.equal(lakeDb.rows[0].subscriptionStatus, "ACTIVE");
        assert.equal(lakeDb.rows[0].subscriptionPlan, "SILVER");

        // Verify AuditEvent
        const auditDb = await client.query(
            `SELECT "action", "payload" FROM "AuditEvent" WHERE "entityId" = $1 AND "action" = 'MANUAL_PAYMENT_CONFIRM'`,
            [order1Id]
        );
        assert.equal(auditDb.rows.length, 1);
        const payload = JSON.parse(auditDb.rows[0].payload);
        assert.equal(payload.bankRef, realBankRef);
        assert.equal(payload.hasBankRef, true);
        assert.equal(payload.reconciliationMethod, "BANK_STATEMENT");
    } finally {
        client.release();
    }
});

test("Test 5: Xác nhận thành công khi để trống mã ngân hàng (Lưu NULL, TUYỆT ĐỐI không tạo mã giả)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders/${order2Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            bankRef: "   ", // Blank or empty string
            reconciliationMethod: "CASH",
            reason: "Khách nộp tiền mặt trực tiếp tại quầy và có phiếu thu số 889",
        }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    // Verify DB: bankRef MUST BE NULL, not MANUAL_xxx
    const client = await pool.connect();
    try {
        const orderDb = await client.query(
            `SELECT "status", "bankRef", "rawWebhookPayload" FROM "SubscriptionOrder" WHERE "id" = $1`,
            [order2Id]
        );
        assert.equal(orderDb.rows[0].status, "PAID");
        assert.equal(orderDb.rows[0].bankRef, null, "bankRef must be null when empty, no synthetic code!");

        const payload = JSON.parse(orderDb.rows[0].rawWebhookPayload);
        assert.equal(payload.hasBankRef, false);
        assert.equal(payload.reconciliationMethod, "CASH");
        assert.equal(payload.source, "MANUAL_SUPERADMIN_RECONCILIATION");
    } finally {
        client.release();
    }
});

test("Test 6: Xác nhận thất bại khi để trống mã ngân hàng nhưng lý do quá ngắn (<10 ký tự) (400)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders/${order4Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            bankRef: "",
            reconciliationMethod: "OTHER",
            reason: "Ngan hang", // only 9 chars
        }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes("tối thiểu 10 ký tự"));
});

test("Test 7: Idempotency / Xác nhận lặp lại trên đơn đã PAID không được cộng thêm ngày", async () => {
    // Check lake expires before
    const client = await pool.connect();
    let beforeExpires;
    try {
        const lakeRes = await client.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId]
        );
        beforeExpires = new Date(lakeRes.rows[0].subscriptionExpiresAt).getTime();
    } finally {
        client.release();
    }

    // Call confirm again on order 1
    const res = await fetch(`${BASE_URL}/api/admin/orders/${order1Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            bankRef: "FT262509988776",
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Bấm lại lần 2 do mạng lag",
        }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.alreadyPaid, true);
    assert.equal(data.success, false);

    // Verify Lake expiration DID NOT CHANGE
    const client2 = await pool.connect();
    try {
        const lakeRes2 = await client2.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId]
        );
        const afterExpires = new Date(lakeRes2.rows[0].subscriptionExpiresAt).getTime();
        assert.equal(afterExpires, beforeExpires, "Expiration date MUST NOT change on repeated confirmation!");
    } finally {
        client2.release();
    }
});

test("Test 8: Chống Race Condition - Hai request gửi đồng thời (Promise.all) chỉ cộng đúng 1 lần 30 ngày", async () => {
    const client = await pool.connect();
    let beforeExpires;
    try {
        const lakeRes = await client.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId]
        );
        beforeExpires = new Date(lakeRes.rows[0].subscriptionExpiresAt).getTime();
    } finally {
        client.release();
    }

    // Fire 2 concurrent requests
    const [res1, res2] = await Promise.all([
        fetch(`${BASE_URL}/api/admin/orders/${order4Id}/confirm`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: superAdminCookie,
            },
            body: JSON.stringify({
                bankRef: "FT_RACE_1",
                reconciliationMethod: "BANK_STATEMENT",
                reason: "Request dong thoi 1",
            }),
        }),
        fetch(`${BASE_URL}/api/admin/orders/${order4Id}/confirm`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: superAdminCookie,
            },
            body: JSON.stringify({
                bankRef: "FT_RACE_2",
                reconciliationMethod: "BANK_STATEMENT",
                reason: "Request dong thoi 2",
            }),
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [200, 409], "Exactly one request must succeed (200) and one must be rejected (409)");

    // Verify Lake expiration increased by EXACTLY 30 days, NOT 60 days
    const client2 = await pool.connect();
    try {
        const lakeRes2 = await client2.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testLakeId]
        );
        const afterExpires = new Date(lakeRes2.rows[0].subscriptionExpiresAt).getTime();
        const diffDays = Math.round((afterExpires - beforeExpires) / (1000 * 60 * 60 * 24));
        assert.equal(diffDays, 30, `Expiration must increase by exactly 30 days under race conditions, got ${diffDays}`);
    } finally {
        client2.release();
    }
});

test("Test 9: Tính ngày hết hạn khi hồ gia hạn TRƯỚC HẠN (Rollover - không mất ngày còn lại)", async () => {
    // testRolloverLakeId has expiration in now + 10 days
    const client = await pool.connect();
    let initialExpires;
    try {
        const lakeRes = await client.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testRolloverLakeId]
        );
        initialExpires = new Date(lakeRes.rows[0].subscriptionExpiresAt).getTime();
    } finally {
        client.release();
    }

    const res = await fetch(`${BASE_URL}/api/admin/orders/${order5Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            bankRef: "FT_ROLLOVER_01",
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Khách chuyển khoản gia hạn sớm trước khi hết hạn",
        }),
    });

    assert.equal(res.status, 200);

    const client2 = await pool.connect();
    try {
        const lakeRes2 = await client2.query(
            `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`,
            [testRolloverLakeId]
        );
        const newExpires = new Date(lakeRes2.rows[0].subscriptionExpiresAt).getTime();
        const diffDays = Math.round((newExpires - initialExpires) / (1000 * 60 * 60 * 24));
        assert.equal(diffDays, 30, "Rollover should add 30 days on top of existing remaining time!");
    } finally {
        client2.release();
    }
});

test("Test 10: Tính ngày hết hạn khi hồ ĐÃ HẾT HẠN (Tính từ thời điểm now + 30 ngày)", async () => {
    // testExpiredLakeId expired 5 days ago
    const beforeNow = Date.now();

    const res = await fetch(`${BASE_URL}/api/admin/orders/${order6Id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            bankRef: "FT_EXPIRED_RENEW_01",
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Khách hết hạn nộp tiền kích hoạt lại dịch vụ",
        }),
    });

    assert.equal(res.status, 200);

    const client = await pool.connect();
    try {
        const lakeRes = await client.query(
            `SELECT "subscriptionExpiresAt", "subscriptionStatus" FROM "Lake" WHERE "id" = $1`,
            [testExpiredLakeId]
        );
        assert.equal(lakeRes.rows[0].subscriptionStatus, "ACTIVE");
        const newExpires = new Date(lakeRes.rows[0].subscriptionExpiresAt).getTime();
        const diffDaysFromNow = Math.round((newExpires - beforeNow) / (1000 * 60 * 60 * 24));
        assert.equal(diffDaysFromNow, 30, "Expired lake should be extended 30 days starting from NOW");
    } finally {
        client.release();
    }
});
