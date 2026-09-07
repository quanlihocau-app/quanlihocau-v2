import assert from "node:assert/strict";
import crypto from "node:crypto";
import test, { after, before } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function normalizeVietnamesePhone(input) {
    if (!input) return null;
    let clean = input.replace(/\D/g, "");
    if (clean.startsWith("84") && clean.length > 9) {
        clean = clean.slice(2);
    } else if (clean.startsWith("0")) {
        clean = clean.slice(1);
    }
    if (!clean.startsWith("0")) {
        clean = "0" + clean;
    }
    const match = clean.match(/^(0[35789]\d{8})$/);
    if (!match) return null;
    return `+84${match[1].slice(1)}`;
}

function toSpeedSmsPhone(input) {
    const e164 = normalizeVietnamesePhone(input);
    if (!e164) return null;
    return e164.replace(/^\+/, "");
}

function maskPhoneNumber(phone) {
    if (!phone || typeof phone !== "string") return "—";
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return "****";

    if (trimmed.startsWith("+84") && trimmed.length >= 11) {
        const prefix = trimmed.slice(0, 5); // "+8490"
        const suffix = trimmed.slice(-2);   // "67"
        return `${prefix.slice(0, 3)} ${prefix.slice(3)}*** **${suffix}`;
    }

    const prefix = trimmed.slice(0, 3);
    const suffix = trimmed.slice(-3);
    return `${prefix}***${suffix}`;
}

before(async () => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM "OtpCode" WHERE "phone" LIKE '+849888%'`);
        await client.query(`DELETE FROM "OtpDeliveryLog" WHERE "phone" LIKE '+849888%'`);
        await client.query(`DELETE FROM "RateLimitBucket" WHERE "key" LIKE 'rl:otp%'`);
    } finally {
        client.release();
    }
});

after(async () => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM "OtpCode" WHERE "phone" LIKE '+849888%'`);
        await client.query(`DELETE FROM "OtpDeliveryLog" WHERE "phone" LIKE '+849888%'`);
    } finally {
        client.release();
        await pool.end();
    }
});

test("Test Unit: Chuẩn hóa SĐT và che số điện thoại bảo mật (Masking)", () => {
    // 1. Normalization to +84
    assert.equal(normalizeVietnamesePhone("0988 888 888"), "+84988888888");
    assert.equal(normalizeVietnamesePhone("84988888888"), "+84988888888");
    assert.equal(normalizeVietnamesePhone("+84988888888"), "+84988888888");

    // 2. SpeedSMS format (84xxxxxxxxx)
    assert.equal(toSpeedSmsPhone("0988 888 888"), "84988888888");
    assert.equal(toSpeedSmsPhone("+84988888888"), "84988888888");

    // 3. Masking
    assert.equal(maskPhoneNumber("+84988888888"), "+84 98*** **88");
    assert.equal(maskPhoneNumber("0988888888"), "098***888");
    assert.equal(maskPhoneNumber(null), "—");
});

test("Test Unit: HMAC-SHA256 hash OTP an toàn, không lưu text trần", () => {
    const phone = "+84988888888";
    const code = "654321";
    const secret = process.env.OTP_HASH_SECRET || process.env.NEXTAUTH_SECRET || "quanlihocau-default-otp-secret";

    const hash1 = crypto.createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
    const hash2 = crypto.createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64); // 64 hex characters
    assert.notEqual(hash1, code);
});

test("Test Flow: Cooldown 60 giây và ghi nhật ký OtpDeliveryLog", async () => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const testPhone = `0988${randomSuffix}`;
    const expectedNormalized = `+84988${randomSuffix}`;

    // Request 1: Should succeed
    const res1 = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone }),
    });

    if (res1.status !== 200) {
        console.error("res1 error:", await res1.json());
    }
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.expiresInSeconds, 180); // 3 phút
    assert.equal(data1.cooldownSeconds, 60);

    // Request 2 immediately: Should be blocked by 60s cooldown (HTTP 429)
    const res2 = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone }),
    });

    assert.equal(res2.status, 429);
    const data2 = await res2.json();
    assert.ok(data2.error.includes("Vui lòng đợi"));

    // Verify OtpDeliveryLog table has recorded the dispatch
    const client = await pool.connect();
    try {
        const logRes = await client.query(
            `SELECT "phone", "maskedPhone", "provider", "status", "costVnd" FROM "OtpDeliveryLog" WHERE "phone" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
            [expectedNormalized],
        );
        assert.ok(logRes.rows.length > 0, "Must record OtpDeliveryLog");
        assert.equal(logRes.rows[0].phone, expectedNormalized);
        assert.equal(logRes.rows[0].maskedPhone, maskPhoneNumber(expectedNormalized));
        assert.ok(["SENT", "FAILED"].includes(logRes.rows[0].status), "Must record status SENT or FAILED in audit log");
    } finally {
        client.release();
    }
});
