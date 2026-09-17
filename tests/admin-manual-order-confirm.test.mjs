import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
// Tell node-pg to parse timestamp without time zone (OID 1114) as UTC matching Prisma behavior
pg.types.setTypeParser(1114, (str) => new Date(str + "Z"));

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let superAdminCookie = "";
let ownerCookie = "";
let staffCookie = "";

let superAdminId = "";
let superAdminEmail = "";
let ownerId = "";
let staffId = "";
let testLakeId = "";
let testOrgId = "";

const timestamp = Date.now();
const testPassword = "TestPassword123!";

before(async () => {
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        // 1. Ensure SubscriptionPlans exist
        await client.query(`
            INSERT INTO "SubscriptionPlan" ("id", "code", "name", "priceVnd", "durationDays", "createdAt", "updatedAt")
            VALUES 
                ('plan_silver', 'SILVER', 'Gói Bạc', 99000, 30, NOW(), NOW()),
                ('plan_gold', 'GOLD', 'Gói Vàng', 179000, 30, NOW(), NOW())
            ON CONFLICT ("code") DO NOTHING;
        `);

        // 2. Create Test Organization & Lake
        const orgRes = await client.query(
            `INSERT INTO "Organization" ("id", "name", "subscriptionPlan", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'TRIAL', NOW(), NOW()) RETURNING "id"`,
            [`Org Test Confirm ${timestamp}`],
        );
        testOrgId = orgRes.rows[0].id;

        const lakeRes = await client.query(
            `INSERT INTO "Lake" ("id", "organizationId", "name", "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'TRIAL', 'TRIAL', NOW() + INTERVAL '7 days', NOW(), NOW()) RETURNING "id"`,
            [testOrgId, `Lake Test Confirm ${timestamp}`],
        );
        testLakeId = lakeRes.rows[0].id;

        // 3. Create Super Admin User
        superAdminEmail = `superadmin_${timestamp}@quanlihocau.test`;
        const saRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Super Admin Test', $2, 'SUPER_ADMIN', true, 1, NOW(), NOW()) RETURNING "id"`,
            [superAdminEmail, hashedPassword],
        );
        superAdminId = saRes.rows[0].id;

        // 4. Create Normal Owner User
        const ownerEmail = `owner_${timestamp}@quanlihocau.test`;
        const ownerRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Owner Test', $2, 'USER', true, 1, NOW(), NOW()) RETURNING "id"`,
            [ownerEmail, hashedPassword],
        );
        ownerId = ownerRes.rows[0].id;
        await client.query(
            `INSERT INTO "Membership" ("id", "userId", "lakeId", "role", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW(), NOW())`,
            [ownerId, testLakeId],
        );

        // 5. Create Normal Staff User
        const staffEmail = `staff_${timestamp}@quanlihocau.test`;
        const staffRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Staff Test', $2, 'USER', true, 1, NOW(), NOW()) RETURNING "id"`,
            [staffEmail, hashedPassword],
        );
        staffId = staffRes.rows[0].id;
        await client.query(
            `INSERT INTO "Membership" ("id", "userId", "lakeId", "role", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'STAFF', NOW(), NOW())`,
            [staffId, testLakeId],
        );

        // 6. Login helper to retrieve session cookies
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
            });

            const setCookies = loginRes.headers.getSetCookie
                ? loginRes.headers.getSetCookie()
                : [loginRes.headers.get("set-cookie")];
            const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
            return sessionCookie ? sessionCookie.split(";")[0] : "";
        }

        superAdminCookie = await getSessionCookie(superAdminEmail, testPassword);
        ownerCookie = await getSessionCookie(ownerEmail, testPassword);
        staffCookie = await getSessionCookie(staffEmail, testPassword);
    } finally {
        client.release();
    }
});

after(async () => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM "AuditEvent" WHERE "lakeId" = $1`, [testLakeId]);
        await client.query(`DELETE FROM "SubscriptionOrder" WHERE "lakeId" = $1`, [testLakeId]);
        await client.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [testLakeId]);
        await client.query(`DELETE FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        await client.query(`DELETE FROM "Organization" WHERE "id" = $1`, [testOrgId]);
        await client.query(`DELETE FROM "User" WHERE "id" IN ($1, $2, $3)`, [
            superAdminId,
            ownerId,
            staffId,
        ]);
    } finally {
        client.release();
        await pool.end();
    }
});

// Helper to create an order directly in DB
async function createTestOrder(status = "PENDING", planCode = "SILVER", amountVnd = 99000, durationDays = 30) {
    const client = await pool.connect();
    try {
        const orderCode = `HC${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
        const res = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "paymentMethod", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'VIETQR', NOW(), NOW()) RETURNING *`,
            [orderCode, testOrgId, testLakeId, planCode, amountVnd, durationDays, status],
        );
        return res.rows[0];
    } finally {
        client.release();
    }
}

// ---------------------------------------------------------------------------
// TEST 1: Xác nhận thành công & kiểm tra cập nhật Order, Lake, Org, AuditEvent
// ---------------------------------------------------------------------------
let confirmedOrderId = "";

test("Test 1: SUPER_ADMIN xác nhận thanh toán thủ công thành công, cập nhật trọn vẹn trong transaction", async () => {
    const order = await createTestOrder("PENDING", "SILVER", 99000, 30);
    confirmedOrderId = order.id;

    const res = await fetch(`${BASE_URL}/api/admin/orders/${order.id}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Đã đối soát sao kê ngân hàng Vietcombank khớp 99.000đ",
            bankRef: "VCB20260916001",
        }),
    });

    assert.equal(res.status, 200, `Expected 200 but got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.message.includes("thành công"));
    assert.ok(data.newExpiresAt);

    // Verify Database
    const client = await pool.connect();
    try {
        // 1. Check Order
        const orderDbRes = await client.query(`SELECT * FROM "SubscriptionOrder" WHERE "id" = $1`, [order.id]);
        const orderDb = orderDbRes.rows[0];
        assert.equal(orderDb.status, "PAID");
        assert.ok(orderDb.paidAt);
        assert.equal(orderDb.bankRef, "VCB20260916001");

        const rawWebhook = JSON.parse(orderDb.rawWebhookPayload);
        assert.equal(rawWebhook.source, "MANUAL_SUPERADMIN_RECONCILIATION");
        assert.equal(rawWebhook.reconciliationMethod, "BANK_STATEMENT");
        assert.equal(rawWebhook.confirmedBy, superAdminEmail);
        assert.equal(rawWebhook.isManualReconciled, true);
        assert.equal(rawWebhook.isAutomatedBankProof, false);

        // 2. Check Lake
        const lakeRes = await client.query(`SELECT * FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        const lakeDb = lakeRes.rows[0];
        assert.equal(lakeDb.subscriptionStatus, "ACTIVE");
        assert.equal(lakeDb.subscriptionPlan, "SILVER");
        assert.ok(lakeDb.subscriptionExpiresAt);

        // 3. Check Organization
        const orgRes = await client.query(`SELECT * FROM "Organization" WHERE "id" = $1`, [testOrgId]);
        const orgDb = orgRes.rows[0];
        assert.equal(orgDb.subscriptionPlan, "SILVER");
        assert.ok(orgDb.validUntil);

        // 4. Check AuditEvent
        const auditRes = await client.query(
            `SELECT * FROM "AuditEvent" WHERE "entityId" = $1 AND "action" = 'MANUAL_PAYMENT_CONFIRM'`,
            [order.id],
        );
        assert.equal(auditRes.rowCount, 1, "Must have exactly 1 AuditEvent created");
        const audit = auditRes.rows[0];
        assert.equal(audit.createdBy, superAdminEmail);
        assert.equal(audit.lakeId, testLakeId);
        assert.equal(audit.entityType, "SUBSCRIPTION_ORDER");

        const payload = JSON.parse(audit.payload);
        assert.equal(payload.orderCode, order.orderCode);
        assert.equal(payload.planCode, "SILVER");
        assert.equal(payload.amountVnd, 99000);
        assert.equal(payload.bankRef, "VCB20260916001");
        assert.equal(payload.isManualReconciled, true);
        assert.equal(payload.isAutomatedBankProof, false);
    } finally {
        client.release();
    }
});

// ---------------------------------------------------------------------------
// TEST 2: Xác nhận lặp (Idempotency) - không được cộng ngày sử dụng 2 lần
// ---------------------------------------------------------------------------
test("Test 2: Xác nhận lặp lại trên đơn đã PAID trả về 409 alreadyPaid và KHÔNG cộng thêm ngày", async () => {
    // Record current expiresAt before repeating
    const client = await pool.connect();
    let initialLakeExpires;
    let initialOrgValidUntil;
    try {
        const lakeRes = await client.query(`SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        const orgRes = await client.query(`SELECT "validUntil" FROM "Organization" WHERE "id" = $1`, [testOrgId]);
        initialLakeExpires = new Date(lakeRes.rows[0].subscriptionExpiresAt).getTime();
        initialOrgValidUntil = new Date(orgRes.rows[0].validUntil).getTime();
    } finally {
        client.release();
    }

    // Call confirm again on the already paid order
    const repeatRes = await fetch(`${BASE_URL}/api/admin/orders/${confirmedOrderId}/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Thao tác xác nhận lặp lại lần 2 để kiểm tra chống double confirm",
            bankRef: "VCB20260916002",
        }),
    });

    assert.equal(repeatRes.status, 409, "Must return 409 Conflict");
    const repeatData = await repeatRes.json();
    assert.equal(repeatData.alreadyPaid, true);
    assert.ok(repeatData.message.includes("đã được xác nhận thanh toán trước đó"));

    // Verify DB was NOT modified and dates did NOT advance
    const client2 = await pool.connect();
    try {
        const lakeRes2 = await client2.query(`SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        const orgRes2 = await client2.query(`SELECT "validUntil" FROM "Organization" WHERE "id" = $1`, [testOrgId]);
        const newLakeExpires = new Date(lakeRes2.rows[0].subscriptionExpiresAt).getTime();
        const newOrgValidUntil = new Date(orgRes2.rows[0].validUntil).getTime();

        assert.equal(newLakeExpires, initialLakeExpires, "Lake subscriptionExpiresAt MUST NOT change on repeated confirm");
        assert.equal(newOrgValidUntil, initialOrgValidUntil, "Org validUntil MUST NOT change on repeated confirm");

        // Verify no second audit event was added
        const auditRes = await client2.query(
            `SELECT count(*) FROM "AuditEvent" WHERE "entityId" = $1 AND "action" = 'MANUAL_PAYMENT_CONFIRM'`,
            [confirmedOrderId],
        );
        assert.equal(parseInt(auditRes.rows[0].count, 10), 1, "Must still have only 1 AuditEvent");
    } finally {
        client2.release();
    }
});

// ---------------------------------------------------------------------------
// TEST 3: Hai request đồng thời (Concurrency Lock & Idempotency)
// ---------------------------------------------------------------------------
test("Test 3: Hai request đồng thời chỉ có đúng 1 request được kích hoạt, không cộng hạn 2 lần", async () => {
    const concurrentOrder = await createTestOrder("PENDING", "GOLD", 179000, 30);

    const client = await pool.connect();
    let initialExpiresAt;
    try {
        const curRes = await client.query(`SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        initialExpiresAt = new Date(curRes.rows[0].subscriptionExpiresAt).getTime();
    } finally {
        client.release();
    }

    const confirmPromise1 = fetch(`${BASE_URL}/api/admin/orders/${concurrentOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Đối soát đồng thời request A",
            bankRef: "REF_CONC_A",
        }),
    });

    const confirmPromise2 = fetch(`${BASE_URL}/api/admin/orders/${concurrentOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Đối soát đồng thời request B",
            bankRef: "REF_CONC_B",
        }),
    });

    const [res1, res2] = await Promise.all([confirmPromise1, confirmPromise2]);
    const statuses = [res1.status, res2.status].sort();

    assert.deepEqual(statuses, [200, 409], "One request must succeed (200) and the other must get 409 alreadyPaid");

    // Verify Lake expiration was extended by exactly 30 days, NOT 60 days
    const client2 = await pool.connect();
    try {
        const lakeRes = await client2.query(`SELECT "subscriptionExpiresAt" FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        const finalExpiresAt = new Date(lakeRes.rows[0].subscriptionExpiresAt).getTime();

        const diffMs = finalExpiresAt - initialExpiresAt;
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
        assert.equal(diffDays, 30, `Expiration must increase by exactly 30 days, got ${diffDays} days`);
    } finally {
        client2.release();
    }
});

// ---------------------------------------------------------------------------
// TEST 4: Phân quyền ở Server (Chỉ SUPER_ADMIN được xác nhận)
// ---------------------------------------------------------------------------
test("Test 4: Kiểm tra bảo mật server: chưa đăng nhập (401), OWNER/STAFF (403)", async () => {
    const order = await createTestOrder("PENDING", "SILVER", 99000, 30);

    // 1. Unauthenticated -> 401
    const noAuthRes = await fetch(`${BASE_URL}/api/admin/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Thử xác nhận không có cookie auth",
        }),
    });
    assert.equal(noAuthRes.status, 401, "Unauthenticated request must return 401");

    // 2. OWNER -> 403
    const ownerRes = await fetch(`${BASE_URL}/api/admin/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Thử xác nhận với quyền OWNER hồ câu",
        }),
    });
    assert.equal(ownerRes.status, 403, "OWNER user must return 403 Forbidden");

    // 3. STAFF -> 403
    const staffRes = await fetch(`${BASE_URL}/api/admin/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: staffCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Thử xác nhận với quyền STAFF nhân viên",
        }),
    });
    assert.equal(staffRes.status, 403, "STAFF user must return 403 Forbidden");
});

// ---------------------------------------------------------------------------
// TEST 5: Kiểm tra trạng thái đơn hàng không hợp lệ & đơn không tồn tại
// ---------------------------------------------------------------------------
test("Test 5: Không thể xác nhận đơn CANCELLED, EXPIRED hoặc không tồn tại (400 / 404)", async () => {
    // 1. Cancelled order
    const cancelledOrder = await createTestOrder("CANCELLED", "SILVER", 99000, 30);
    const cancelRes = await fetch(`${BASE_URL}/api/admin/orders/${cancelledOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Cố tình xác nhận đơn đã hủy",
            bankRef: "CANCEL_REF",
        }),
    });
    assert.equal(cancelRes.status, 400);
    const cancelData = await cancelRes.json();
    assert.ok(cancelData.error.includes("hủy"));

    // 2. Expired order
    const expiredOrder = await createTestOrder("EXPIRED", "SILVER", 99000, 30);
    const expiredRes = await fetch(`${BASE_URL}/api/admin/orders/${expiredOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Cố tình xác nhận đơn đã hết hạn",
            bankRef: "EXPIRE_REF",
        }),
    });
    assert.equal(expiredRes.status, 400);
    const expiredData = await expiredRes.json();
    assert.ok(expiredData.error.includes("hết hạn"));

    // 3. Non-existent orderId
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const nonExistentRes = await fetch(`${BASE_URL}/api/admin/orders/${nonExistentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Đơn hàng không tồn tại",
            bankRef: "NON_EXIST_REF",
        }),
    });
    assert.equal(nonExistentRes.status, 404);
});

// ---------------------------------------------------------------------------
// TEST 6: Tính toán ngày hết hạn (Gia hạn trước khi hết hạn vs Đã hết hạn)
// ---------------------------------------------------------------------------
test("Test 6: Tính ngày hết hạn: Hồ còn hạn thì nối tiếp hạn cũ; Hồ đã hết hạn thì tính từ hiện tại", async () => {
    const client = await pool.connect();
    try {
        // Subtest 6A: Hồ đã hết hạn (5 ngày trước)
        const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        await client.query(`UPDATE "Lake" SET "subscriptionExpiresAt" = $1 WHERE "id" = $2`, [pastDate, testLakeId]);

        const orderExpiredLake = await createTestOrder("PENDING", "SILVER", 99000, 30);
        const resA = await fetch(`${BASE_URL}/api/admin/orders/${orderExpiredLake.id}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
            body: JSON.stringify({
                reconciliationMethod: "BANK_STATEMENT",
                reason: "Gia hạn cho hồ đã hết hạn trong quá khứ",
                bankRef: "EXPIRED_LAKE_REF",
            }),
        });
        assert.equal(resA.status, 200);
        const dataA = await resA.json();

        // New expires should be approx now + 30 days (within 1 minute tolerance)
        const expectedDateA = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const actualDateA = new Date(dataA.newExpiresAt);
        const diffMsA = Math.abs(actualDateA.getTime() - expectedDateA.getTime());
        assert.ok(diffMsA < 60000, `Expired lake renewal must start from now, diff was ${diffMsA}ms`);

        // Subtest 6B: Hồ còn hạn (20 ngày trong tương lai)
        const updateRes = await client.query(
            `UPDATE "Lake" SET "subscriptionExpiresAt" = NOW() + INTERVAL '20 days' WHERE "id" = $1 RETURNING "subscriptionExpiresAt"`,
            [testLakeId],
        );
        const recordedFutureDate = new Date(updateRes.rows[0].subscriptionExpiresAt);

        const orderActiveLake = await createTestOrder("PENDING", "GOLD", 179000, 30);
        const resB = await fetch(`${BASE_URL}/api/admin/orders/${orderActiveLake.id}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
            body: JSON.stringify({
                reconciliationMethod: "BANK_STATEMENT",
                reason: "Gia hạn khi hồ vẫn còn 20 ngày sử dụng",
                bankRef: "ACTIVE_LAKE_REF",
            }),
        });
        assert.equal(resB.status, 200);
        const dataB = await resB.json();

        const expectedDateB = new Date(recordedFutureDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const actualDateB = new Date(dataB.newExpiresAt);
        const diffMsB = Math.abs(actualDateB.getTime() - expectedDateB.getTime());
        assert.ok(diffMsB < 2000, `Active lake renewal must preserve remaining days, diff was ${diffMsB}ms`);
    } finally {
        client.release();
    }
});

// ---------------------------------------------------------------------------
// TEST 7: Kiểm tra đối soát thực tế, mã ngân hàng rỗng vs mã giả mạo
// ---------------------------------------------------------------------------
test("Test 7: Mã ngân hàng để trống có lý do rõ ràng hợp lệ; Chặn mã ngân hàng giả mạo (none, n/a, test)", async () => {
    // 7A: Empty bankRef with detailed reason >= 10 chars -> Success
    const orderNoRef = await createTestOrder("PENDING", "SILVER", 99000, 30);
    const res7A = await fetch(`${BASE_URL}/api/admin/orders/${orderNoRef.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "CASH",
            reason: "Thu tiền mặt trực tiếp tại quầy thanh toán hồ câu",
            bankRef: "", // Empty bankRef
        }),
    });
    assert.equal(res7A.status, 200);
    const data7A = await res7A.json();
    assert.equal(data7A.order.bankRef, null, "Must store bankRef as null, no fake code created");

    // 7B: Empty bankRef with short reason (< 10 chars) -> 400
    const orderShortReason = await createTestOrder("PENDING", "SILVER", 99000, 30);
    const res7B = await fetch(`${BASE_URL}/api/admin/orders/${orderShortReason.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "OTHER",
            reason: "Đã thu", // Only 6 chars
            bankRef: "",
        }),
    });
    assert.equal(res7B.status, 400);
    const data7B = await res7B.json();
    assert.ok(data7B.error.includes("10 ký tự"));

    // 7C: Dummy/placeholder bankRef (none, n/a, null, fake) -> 400
    const orderDummyRef = await createTestOrder("PENDING", "SILVER", 99000, 30);
    const res7C = await fetch(`${BASE_URL}/api/admin/orders/${orderDummyRef.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Đã kiểm tra chuyển khoản nhưng điền mã giả",
            bankRef: "none", // Dummy placeholder
        }),
    });
    assert.equal(res7C.status, 400);
    const data7C = await res7C.json();
    assert.ok(data7C.error.includes("giả mạo"));
});

// ---------------------------------------------------------------------------
// TEST 8: Kiểm tra tính toàn vẹn gói cước và số tiền đơn hàng
// ---------------------------------------------------------------------------
test("Test 8: Kiểm tra tính toàn vẹn: Không cho xác nhận đơn có số tiền <= 0 hoặc sai lệch gói", async () => {
    // Create order with invalid amount
    const invalidAmountOrder = await createTestOrder("PENDING", "SILVER", 0, 30);
    const resInvalidAmount = await fetch(`${BASE_URL}/api/admin/orders/${invalidAmountOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Kiểm tra đơn hàng có số tiền không hợp lệ",
            bankRef: "ZERO_AMOUNT_REF",
        }),
    });
    assert.equal(resInvalidAmount.status, 400);
    const dataInvalidAmount = await resInvalidAmount.json();
    assert.ok(dataInvalidAmount.error.includes("Số tiền đơn hàng không hợp lệ"));
});

// ---------------------------------------------------------------------------
// TEST 9: Lỗi database hoặc ràng buộc dữ liệu: Rollback hoàn toàn transaction
// ---------------------------------------------------------------------------
test("Test 9: Lỗi hoặc sai lệch dữ liệu khiến transaction rollback: Đơn giữ PENDING, không tạo AuditEvent", async () => {
    // 1. Create order with mismatched organization
    const client = await pool.connect();
    let mismatchedOrder;
    try {
        // Create an alternate organization
        const altOrgRes = await client.query(
            `INSERT INTO "Organization" ("id", "name", "subscriptionPlan", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), 'Alt Org For Rollback Test', 'TRIAL', NOW(), NOW()) RETURNING "id"`,
        );
        const altOrgId = altOrgRes.rows[0].id;

        // Create order pointing to altOrgId while lake belongs to testOrgId
        const orderCode = `HCROLLBACK${Date.now().toString().slice(-4)}`;
        const res = await client.query(
            `INSERT INTO "SubscriptionOrder" ("id", "orderCode", "organizationId", "lakeId", "planCode", "amountVnd", "durationDays", "status", "paymentMethod", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 'SILVER', 99000, 30, 'PENDING', 'VIETQR', NOW(), NOW()) RETURNING *`,
            [orderCode, altOrgId, testLakeId],
        );
        mismatchedOrder = res.rows[0];
    } finally {
        client.release();
    }

    const res = await fetch(`${BASE_URL}/api/admin/orders/${mismatchedOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({
            reconciliationMethod: "BANK_STATEMENT",
            reason: "Xác nhận đơn hàng có lỗi bất đồng bộ tổ chức",
            bankRef: "ROLLBACK_TEST_REF",
        }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes("không hợp lệ"));

    // Verify Database Rollback
    const client2 = await pool.connect();
    try {
        const orderCheck = await client2.query(
            `SELECT status, "paidAt" FROM "SubscriptionOrder" WHERE "id" = $1`,
            [mismatchedOrder.id],
        );
        assert.equal(orderCheck.rows[0].status, "PENDING", "Order must remain PENDING after rollback");
        assert.equal(orderCheck.rows[0].paidAt, null);

        const auditCheck = await client2.query(
            `SELECT count(*) FROM "AuditEvent" WHERE "entityId" = $1`,
            [mismatchedOrder.id],
        );
        assert.equal(parseInt(auditCheck.rows[0].count, 10), 0, "AuditEvent must not exist after rollback");
    } finally {
        client2.release();
    }
});

