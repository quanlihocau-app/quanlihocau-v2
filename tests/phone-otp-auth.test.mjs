import assert from "node:assert/strict";
import test, { after } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const createdUserIds = [];
const createdLakeIds = [];
const createdOrgIds = [];

after(async () => {
    const client = await pool.connect();
    try {
        for (const lakeId of createdLakeIds) {
            await client.query(`DELETE FROM "SubscriptionOrder" WHERE "lakeId" = $1`, [lakeId]);
            await client.query(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [lakeId]);
            await client.query(`DELETE FROM "Area" WHERE "lakeId" = $1`, [lakeId]);
            await client.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [lakeId]);
            await client.query(`DELETE FROM "Lake" WHERE "id" = $1`, [lakeId]);
        }
        for (const orgId of createdOrgIds) {
            await client.query(`DELETE FROM "Organization" WHERE "id" = $1`, [orgId]);
        }
        for (const userId of createdUserIds) {
            await client.query(`DELETE FROM "Membership" WHERE "userId" = $1`, [userId]);
            await client.query(`DELETE FROM "User" WHERE "id" = $1`, [userId]);
        }
        await client.query(`DELETE FROM "OtpCode" WHERE "phone" LIKE '+8499%'`);
    } finally {
        client.release();
        await pool.end();
    }
});

test("Test 1: POST /api/auth/send-otp chuẩn hóa SĐT Việt Nam, sinh OTP 6 số và lưu DB", async () => {
    const rawPhone = "0991 234 567";
    const expectedNormalized = "+84991234567";

    const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: rawPhone }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.phone, expectedNormalized);
    assert.equal(data.expiresInSeconds, 300);
    assert.ok(data.devOtp, "devOtp should be provided in non-production");
    assert.equal(data.devOtp.length, 6);

    // Verify in database
    const client = await pool.connect();
    try {
        const dbRes = await client.query(
            `SELECT "phone", "code", "attempts", "expiresAt" FROM "OtpCode" WHERE "phone" = $1`,
            [expectedNormalized],
        );
        assert.equal(dbRes.rows.length, 1);
        assert.equal(dbRes.rows[0].code, data.devOtp);
        assert.equal(dbRes.rows[0].attempts, 0);
        assert.ok(dbRes.rows[0].expiresAt, "expiresAt must be recorded");
    } finally {
        client.release();
    }

    // Invalid phone rejection
    const badRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "12345" }),
    });
    assert.equal(badRes.status, 400);
});

test("Test 2: POST /api/auth/verify-otp kiểm tra mã sai và giới hạn 5 lần thử", async () => {
    const testPhone = "0992 345 678";
    const expectedNormalized = "+84992345678";

    // Send OTP first
    const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone }),
    });
    assert.equal(sendRes.status, 200);
    assert.ok(sendData.devOtp);

    // Verify with WRONG code
    const wrongRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, code: "000000" }),
    });
    assert.equal(wrongRes.status, 400);
    const wrongData = await wrongRes.json();
    assert.ok(wrongData.error.includes("Mã OTP không chính xác"));

    // Check attempts in DB is now 1
    const client = await pool.connect();
    try {
        const dbRes = await client.query(
            `SELECT "attempts" FROM "OtpCode" WHERE "phone" = $1`,
            [expectedNormalized],
        );
        assert.equal(dbRes.rows[0].attempts, 1);
    } finally {
        client.release();
    }
});

test("Test 3: POST /api/auth/verify-otp với tài khoản đã có -> Cập nhật phoneVerified = true", async () => {
    const testPhone = `0993${Math.floor(100000 + Math.random() * 900000)}`;
    const testEmail = `existing_${Date.now()}@example.com`;

    // 1. Create a user via register
    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: "Chủ Hồ Cũ",
            phone: testPhone,
            email: testEmail,
            password: "Password123!",
            lakeName: "Hồ Câu Cũ",
        }),
    });
    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    createdUserIds.push(regData.userId);
    createdLakeIds.push(regData.lakeId);
    createdOrgIds.push(regData.organizationId);

    // Initial phoneVerified should be false
    const client = await pool.connect();
    try {
        const uRes = await client.query(`SELECT "phoneVerified" FROM "User" WHERE "id" = $1`, [regData.userId]);
        assert.equal(uRes.rows[0].phoneVerified, false);
    } finally {
        client.release();
    }

    // 2. Send OTP
    const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone }),
    });
    assert.equal(sendRes.status, 200);
    const sendData = await sendRes.json();

    // 3. Verify OTP
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, code: sendData.devOtp }),
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.isNewUser, false);
    assert.equal(verifyData.user.phoneVerified, true);

    // Check DB updated
    const client2 = await pool.connect();
    try {
        const uRes2 = await client2.query(`SELECT "phoneVerified" FROM "User" WHERE "id" = $1`, [regData.userId]);
        assert.equal(uRes2.rows[0].phoneVerified, true);
    } finally {
        client2.release();
    }
});

test("Test 4: POST /api/auth/verify-otp với số mới -> Tự động đăng ký chủ hồ + hồ mới kèm gói TRIAL 30 ngày", async () => {
    const newPhone = `0994${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Send OTP
    const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
    });
    assert.equal(sendRes.status, 200);
    const sendData = await sendRes.json();

    // 2. Verify OTP with custom name & lakeName
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            phone: newPhone,
            code: sendData.devOtp,
            fullName: "Chủ Hồ Mới OTP",
            lakeName: "Hồ Câu Thủy Trúc",
        }),
    });

    assert.equal(verifyRes.status, 201);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.isNewUser, true);
    assert.equal(verifyData.user.phoneVerified, true);
    assert.ok(verifyData.user.id);
    assert.ok(verifyData.lakeId);

    createdUserIds.push(verifyData.user.id);
    createdLakeIds.push(verifyData.lakeId);

    // Verify in DB: User, Lake, Organization, Membership
    const client = await pool.connect();
    try {
        const userRes = await client.query(`SELECT "name", "phoneVerified" FROM "User" WHERE "id" = $1`, [verifyData.user.id]);
        assert.equal(userRes.rows[0].name, "Chủ Hồ Mới OTP");
        assert.equal(userRes.rows[0].phoneVerified, true);

        const lakeRes = await client.query(
            `SELECT "name", "subscriptionStatus", "subscriptionPlan", "subscriptionExpiresAt", "organizationId" FROM "Lake" WHERE "id" = $1`,
            [verifyData.lakeId],
        );
        const lake = lakeRes.rows[0];
        createdOrgIds.push(lake.organizationId);

        assert.equal(lake.name, "Hồ Câu Thủy Trúc");
        assert.equal(lake.subscriptionStatus, "TRIAL");
        assert.equal(lake.subscriptionPlan, "TRIAL");

        const days = (new Date(lake.subscriptionExpiresAt) - new Date()) / (1000 * 60 * 60 * 24);
        assert.ok(days >= 29 && days <= 31, "New lake should have ~30 days trial");

        const orgRes = await client.query(`SELECT "subscriptionPlan", "validUntil" FROM "Organization" WHERE "id" = $1`, [lake.organizationId]);
        assert.equal(orgRes.rows[0].subscriptionPlan, "TRIAL");
        assert.ok(orgRes.rows[0].validUntil);
    } finally {
        client.release();
    }
});

test("Test 5: Đăng nhập NextAuth bằng phone-otp cấp session cookie thành công", async () => {
    const authPhone = `0995${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Send OTP
    const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: authPhone }),
    });
    assert.equal(sendRes.status, 200);
    const sendData = await sendRes.json();

    // 2. NextAuth CSRF
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfCookies = csrfRes.headers.get("set-cookie") || "";

    // 3. Call NextAuth callback with provider phone-otp
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/phone-otp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: csrfCookies,
        },
        body: new URLSearchParams({
            csrfToken: csrfData.csrfToken,
            phone: authPhone,
            code: sendData.devOtp,
            redirect: "false",
            json: "true",
        }),
        redirect: "manual",
    });

    const setCookies = loginRes.headers.get("set-cookie") || "";
    const sessionCookie = setCookies
        .split(",")
        .map((c) => c.split(";")[0].trim())
        .filter((c) => c.startsWith("next-auth.session-token") || c.startsWith("__Secure-next-auth.session-token"))
        .join("; ");

    assert.ok(sessionCookie, "Must set session-token cookie on successful OTP login");

    // 4. Access authenticated endpoint /api/me with sessionCookie
    const meRes = await fetch(`${BASE_URL}/api/me`, {
        headers: { Cookie: sessionCookie },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.ok(meData.userId);
    createdUserIds.push(meData.userId);
    if (meData.lakeId) createdLakeIds.push(meData.lakeId);
    if (meData.organizationId) createdOrgIds.push(meData.organizationId);
});
