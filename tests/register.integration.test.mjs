import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import test, { after, before } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3101";
const UNAVAILABLE_BASE_URL = process.env.TEST_UNAVAILABLE_BASE_URL || "http://localhost:3102";
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_OPTIONS = { timeout: 30_000, concurrency: false };
let pool;
let baselineCounts;

function generateTestPhone() {
    return `09${randomInt(10_000_000, 100_000_000)}`;
}

function generateTestEmail(prefix) {
    return `${prefix}_${randomUUID()}@example.com`;
}

function fetchWithTimeout(url, init) {
    return fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
}

async function readBusinessCounts() {
    const result = await pool.query(`
        SELECT
            (SELECT COUNT(*)::int FROM "Organization") AS organizations,
            (SELECT COUNT(*)::int FROM "Lake") AS lakes,
            (SELECT COUNT(*)::int FROM "User") AS users,
            (SELECT COUNT(*)::int FROM "Membership") AS memberships
    `);
    return result.rows[0];
}

before(async () => {
    assert.ok(TEST_DATABASE_URL, "TEST_DATABASE_URL is required");
    const databaseName = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, "");
    assert.notEqual(databaseName, "quanlihocau_v2", "Refusing to test against the development database");
    pool = new Pool({ connectionString: TEST_DATABASE_URL, max: 2 });
    baselineCounts = await readBusinessCounts();
});

after(async () => {
    if (!pool) return;
    try {
        const finalCounts = await readBusinessCounts();
        for (const field of ["organizations", "lakes", "users", "memberships"]) {
            assert.equal(
                finalCounts[field] - baselineCounts[field],
                3,
                `${field} must increase by exactly 3; mismatched counts indicate orphaned data`,
            );
        }
    } finally {
        await pool.end();
    }
});

test("Test G: valid registration succeeds", TEST_OPTIONS, async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "Test Owner G", phone: generateTestPhone(), email: generateTestEmail("test_g"), password: "SecurePassword123!", lakeName: "Test Lake G" }),
    });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.ok(data.userId);
    assert.ok(data.organizationId);
    assert.ok(data.lakeId);
});

test("Test H: concurrent registration creates one account", TEST_OPTIONS, async () => {
    const payload = JSON.stringify({ fullName: "Test Owner H", phone: generateTestPhone(), email: generateTestEmail("test_h"), password: "SecurePassword123!", lakeName: "Test Lake H" });
    const request = () => fetchWithTimeout(`${BASE_URL}/api/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
    const [res1, res2] = await Promise.all([request(), request()]);
    assert.deepEqual([res1.status, res2.status].sort(), [201, 409]);
});

test("Rate limit: fourth request returns 429", TEST_OPTIONS, async () => {
    const payload = JSON.stringify({ fullName: "Rate Limit Test", phone: generateTestPhone(), email: generateTestEmail("test_rl"), password: "SecurePassword123!", lakeName: "Rate Limit Lake" });
    const statuses = [];
    let lastResponse;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        lastResponse = await fetchWithTimeout(`${BASE_URL}/api/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
        statuses.push(lastResponse.status);
    }
    assert.deepEqual(statuses, [201, 409, 409, 429]);
    assert.ok(Number(lastResponse.headers.get("Retry-After")) > 0);
});

test("Test F: unavailable rate-limit database returns 503", TEST_OPTIONS, async () => {
    const response = await fetchWithTimeout(`${UNAVAILABLE_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "Test Owner F", phone: generateTestPhone(), email: generateTestEmail("test_f"), password: "SecurePassword123!", lakeName: "Unavailable Lake" }),
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "60");
});
