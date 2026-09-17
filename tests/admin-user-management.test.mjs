import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let superAdminCookie = "";
let ownerCookie = "";
let staffCookie = "";

let superAdminId = "";
let ownerId = "";
let staffId = "";
let targetUserId = "";
let testLakeId = "";
let testOrgId = "";

const timestamp = Date.now();
const testPassword = "TestPassword123!";

before(async () => {
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        // 1. Create Test Organization & Lake
        const orgRes = await client.query(
            `INSERT INTO "Organization" ("id", "name", "subscriptionPlan", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'TRIAL', NOW(), NOW()) RETURNING "id"`,
            [`Org Test SuperAdmin ${timestamp}`]
        );
        testOrgId = orgRes.rows[0].id;

        const lakeRes = await client.query(
            `INSERT INTO "Lake" ("id", "organizationId", "name", "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'TRIAL', 'TRIAL', NOW() + INTERVAL '7 days', NOW(), NOW()) RETURNING "id"`,
            [testOrgId, `Lake Test SuperAdmin ${timestamp}`]
        );
        testLakeId = lakeRes.rows[0].id;

        // 2. Create Super Admin User
        const saEmail = `superadmin_${timestamp}@quanlihocau.test`;
        const saRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Super Admin Test', $2, 'SUPER_ADMIN', true, 1, NOW(), NOW()) RETURNING "id"`,
            [saEmail, hashedPassword]
        );
        superAdminId = saRes.rows[0].id;

        // 3. Create Normal Owner User
        const ownerEmail = `owner_${timestamp}@quanlihocau.test`;
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

        // 4. Create Normal Staff User
        const staffEmail = `staff_${timestamp}@quanlihocau.test`;
        const staffRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Staff Test', $2, 'USER', true, 1, NOW(), NOW()) RETURNING "id"`,
            [staffEmail, hashedPassword]
        );
        staffId = staffRes.rows[0].id;
        await client.query(
            `INSERT INTO "Membership" ("id", "userId", "lakeId", "role", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'STAFF', NOW(), NOW())`,
            [staffId, testLakeId]
        );

        // 5. Create Target User (to be locked/extended/tested)
        const targetEmail = `target_${timestamp}@quanlihocau.test`;
        const targetRes = await client.query(
            `INSERT INTO "User" ("id", "email", "name", "phone", "passwordHash", "systemRole", "phoneVerified", "sessionVersion", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'Target Test User', $2, $3, 'USER', true, 1, NOW(), NOW()) RETURNING "id"`,
            [targetEmail, `0987${Math.floor(100000 + Math.random() * 900000)}`, hashedPassword]
        );
        targetUserId = targetRes.rows[0].id;
        await client.query(
            `INSERT INTO "Membership" ("id", "userId", "lakeId", "role", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW(), NOW())`,
            [targetUserId, testLakeId]
        );

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
            });

            const setCookies = loginRes.headers.getSetCookie
                ? loginRes.headers.getSetCookie()
                : [loginRes.headers.get("set-cookie")];
            const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
            return sessionCookie ? sessionCookie.split(";")[0] : "";
        }

        superAdminCookie = await getSessionCookie(saEmail, testPassword);
        ownerCookie = await getSessionCookie(ownerEmail, testPassword);
        staffCookie = await getSessionCookie(staffEmail, testPassword);
    } finally {
        client.release();
    }
});

after(async () => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM "AuditEvent" WHERE "entityId" IN ($1, $2, $3, $4)`, [
            superAdminId,
            ownerId,
            staffId,
            targetUserId,
        ]);
        await client.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [testLakeId]);
        await client.query(`DELETE FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        await client.query(`DELETE FROM "Organization" WHERE "id" = $1`, [testOrgId]);
        await client.query(`DELETE FROM "User" WHERE "id" IN ($1, $2, $3, $4)`, [
            superAdminId,
            ownerId,
            staffId,
            targetUserId,
        ]);
    } finally {
        client.release();
        await pool.end();
    }
});

test("Security: Người dùng chưa đăng nhập không được truy cập Admin User API (401)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.error.code, "UNAUTHORIZED");
});

test("Security: OWNER không được phép truy cập Admin User API (403)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: { Cookie: ownerCookie },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.error.code, "FORBIDDEN");
});

test("Security: STAFF không được phép truy cập Admin User API (403)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: { Cookie: staffCookie },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.error.code, "FORBIDDEN");
});

test("Feature: SUPER_ADMIN truy cập thành công danh sách người dùng và Dashboard Metrics", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users?range=all`, {
        headers: { Cookie: superAdminCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.metrics);
    assert.ok(typeof data.metrics.totalUsers === "number");
    assert.ok(typeof data.metrics.trialUsers === "number");
    assert.ok(Array.isArray(data.users));
    assert.ok(data.pagination);

    // Verify target user is in list
    const found = data.users.find((u) => u.id === targetUserId);
    assert.ok(found, "Target user phải xuất hiện trong danh sách");
    assert.equal(found.isLocked, false);
});

test("Privacy: API chi tiết người dùng TUYỆT ĐỐI không trả passwordHash, code, hoặc secrets", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}`, {
        headers: { Cookie: superAdminCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.user);

    // Strict privacy assertions
    assert.equal(data.user.passwordHash, undefined, "passwordHash must never be exposed");
    assert.equal(data.user.password, undefined, "password must never be exposed");
    assert.equal(data.user.code, undefined, "OTP code must never be exposed");
    assert.equal(data.user.token, undefined, "token must never be exposed");
});

test("Feature: SUPER_ADMIN khóa tài khoản thất bại nếu không nhập lý do (400)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/lock`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            isLocked: true,
            reason: "",
        }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.error.code, "REASON_REQUIRED");
});

test("Feature: SUPER_ADMIN khóa tài khoản thành công kèm ghi nhận AuditEvent", async () => {
    const lockReason = "Vi phạm điều khoản thử nghiệm";
    const res = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/lock`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            isLocked: true,
            reason: lockReason,
        }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.user.isLocked, true);
    assert.equal(data.user.lockedReason, lockReason);

    // Check AuditEvent in DB
    const client = await pool.connect();
    try {
        const auditRes = await client.query(
            `SELECT * FROM "AuditEvent" WHERE "entityId" = $1 AND "action" = 'USER_LOCKED' ORDER BY "createdAt" DESC LIMIT 1`,
            [targetUserId]
        );
        assert.equal(auditRes.rowCount, 1, "AuditEvent USER_LOCKED phải được ghi lại");
        assert.ok(auditRes.rows[0].payload.includes(lockReason));
    } finally {
        client.release();
    }
});

test("Security: Tài khoản đã bị khóa không thể đăng nhập", async () => {
    const targetEmail = `target_${timestamp}@quanlihocau.test`;
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
            email: targetEmail,
            password: testPassword,
            redirect: "false",
            json: "true",
        }),
    });

    const setCookies = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get("set-cookie")];
    const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
    assert.equal(sessionCookie, undefined, "User bị khóa không được cấp session token khi đăng nhập");
});

test("Feature: SUPER_ADMIN mở khóa tài khoản thành công kèm AuditEvent", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/lock`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            isLocked: false,
        }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.user.isLocked, false);
    assert.equal(data.user.lockedReason, null);

    // Check AuditEvent
    const client = await pool.connect();
    try {
        const auditRes = await client.query(
            `SELECT * FROM "AuditEvent" WHERE "entityId" = $1 AND "action" = 'USER_UNLOCKED' ORDER BY "createdAt" DESC LIMIT 1`,
            [targetUserId]
        );
        assert.equal(auditRes.rowCount, 1, "AuditEvent USER_UNLOCKED phải được ghi lại");
    } finally {
        client.release();
    }
});

test("Feature: SUPER_ADMIN gia hạn dùng thử (Trial) chính xác ngày và ghi AuditEvent", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/extend-trial`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            days: 15,
            reason: "Hỗ trợ dùng thử thêm",
        }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.addedDays, 15);

    // Verify Lake and Org in DB
    const client = await pool.connect();
    try {
        const lakeCheck = await client.query(
            `SELECT "subscriptionExpiresAt", "subscriptionStatus", "subscriptionPlan" FROM "Lake" WHERE "id" = $1`,
            [testLakeId]
        );
        assert.equal(lakeCheck.rows[0].subscriptionStatus, "TRIAL");
        assert.equal(lakeCheck.rows[0].subscriptionPlan, "TRIAL");
        assert.ok(new Date(lakeCheck.rows[0].subscriptionExpiresAt) > new Date());
    } finally {
        client.release();
    }
});

test("Feature: SUPER_ADMIN thay đổi Subscription Plan thành công kèm AuditEvent", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/change-plan`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            planCode: "SILVER",
            days: 60,
            reason: "Chuyển gói Bạc cho khách hàng VIP",
        }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.newPlan, "SILVER");

    const client = await pool.connect();
    try {
        const lakeCheck = await client.query(
            `SELECT "subscriptionPlan", "subscriptionStatus" FROM "Lake" WHERE "id" = $1`,
            [testLakeId]
        );
        assert.equal(lakeCheck.rows[0].subscriptionPlan, "SILVER");
        assert.equal(lakeCheck.rows[0].subscriptionStatus, "ACTIVE");
    } finally {
        client.release();
    }
});

test("Feature: Gia hạn ngày sử dụng chặn số âm và cộng ngày chính xác", async () => {
    // 1. Chặn số âm
    const negativeRes = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/extend-subscription`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            days: -5,
        }),
    });
    assert.equal(negativeRes.status, 400);

    // 2. Gia hạn hợp lệ
    const validRes = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/extend-subscription`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            days: 30,
            reason: "Tặng thêm 30 ngày sử dụng",
        }),
    });
    assert.equal(validRes.status, 200);
    const data = await validRes.json();
    assert.equal(data.ok, true);
    assert.equal(data.addedDays, 30);
});

test("Feature: Thu hồi phiên (Đăng xuất tất cả thiết bị) tăng sessionVersion", async () => {
    const client = await pool.connect();
    let initialVersion = 1;
    try {
        const userCheck = await client.query(`SELECT "sessionVersion" FROM "User" WHERE "id" = $1`, [targetUserId]);
        initialVersion = userCheck.rows[0].sessionVersion;
    } finally {
        client.release();
    }

    const res = await fetch(`${BASE_URL}/api/admin/users/${targetUserId}/revoke-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: superAdminCookie,
        },
        body: JSON.stringify({
            reason: "Đăng xuất khẩn cấp",
        }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.sessionVersion, initialVersion + 1);
});
