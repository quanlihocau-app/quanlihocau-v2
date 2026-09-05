import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let authCookieA = "";
let testLakeIdA = "";
let testUserIdA = "";
let testProductIdA = "";

let authCookieB = "";
let testLakeIdB = "";
let testUserIdB = "";

async function setupOwner(suffix) {
    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `retail_${suffix}_${Date.now()}@example.com`;
    const testPassword = "SecurePassword123!";

    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: `Owner ${suffix}`,
            phone: testPhone,
            email: testEmail,
            password: testPassword,
            lakeName: `Lake ${suffix} ${Date.now()}`,
        }),
    });
    const regData = await regRes.json();
    assert.equal(regRes.status, 201);

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

    const lakeId = regData.lakeId || regData.lake?.id;
    const userId = regData.userId || regData.user?.id;

    return {
        cookie: sessionCookie.split(";")[0],
        lakeId,
        userId,
    };
}

async function cleanupLake(lakeId) {
    if (!lakeId) return;
    try {
        await pool.query(`DELETE FROM "InvoiceLine" WHERE "invoiceId" IN (SELECT "id" FROM "Invoice" WHERE "lakeId" = $1)`, [lakeId]);
        await pool.query(`DELETE FROM "Payment" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "Invoice" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "FishingSessionHut" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "FishingSession" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "InventoryMovement" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "Product" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "AuditEvent" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "IdempotencyKey" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "Area" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "Package" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "ShiftClose" WHERE "shiftId" IN (SELECT "id" FROM "Shift" WHERE "lakeId" = $1)`, [lakeId]);
        await pool.query(`DELETE FROM "Shift" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [lakeId]);
        await pool.query(`DELETE FROM "Lake" WHERE "id" = $1`, [lakeId]);
    } catch (err) {
        console.error("Cleanup error for lake:", lakeId, err.message);
    }
}

before(async () => {
    const ownerA = await setupOwner("A");
    authCookieA = ownerA.cookie;
    testLakeIdA = ownerA.lakeId;
    testUserIdA = ownerA.userId;

    const ownerB = await setupOwner("B");
    authCookieB = ownerB.cookie;
    testLakeIdB = ownerB.lakeId;
    testUserIdB = ownerB.userId;

    // Create a product with 10 units in stock for Lake A
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            name: "Nước tăng lực RedBull",
            priceVnd: 20000,
            initialStock: 10,
        }),
    });
    const prodData = await prodRes.json();
    assert.equal(prodRes.status, 201);
    testProductIdA = prodData.product?.id || prodData.id;
});

after(async () => {
    await cleanupLake(testLakeIdA);
    await cleanupLake(testLakeIdB);
    if (testUserIdA) {
        await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [testUserIdA]).catch(() => {});
    }
    if (testUserIdB) {
        await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [testUserIdB]).catch(() => {});
    }
    await pool.end();
});

test("Phase 4: Retail checkout rejects if missing or invalid Idempotency-Key", async () => {
    const res = await fetch(`${BASE_URL}/api/invoices/retail`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            items: [{ productId: testProductIdA, quantity: 2 }],
            paymentMethod: "CASH",
        }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Idempotency-Key/);
});

test("Phase 4: Retail checkout rejects when requested quantity exceeds available stock", async () => {
    const idempotencyKey = crypto.randomUUID();
    const res = await fetch(`${BASE_URL}/api/invoices/retail`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
            items: [{ productId: testProductIdA, quantity: 999 }],
            paymentMethod: "CASH",
        }),
    });
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.code, "INSUFFICIENT_STOCK");
});

test("Phase 4: Multi-tenant protection: Lake B cannot purchase product belonging to Lake A", async () => {
    const idempotencyKey = crypto.randomUUID();
    const res = await fetch(`${BASE_URL}/api/invoices/retail`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieB,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
            items: [{ productId: testProductIdA, quantity: 1 }],
            paymentMethod: "CASH",
        }),
    });
    assert.equal(res.status, 404);
});

test("Phase 4: Atomic Retail Sale creates Invoice, Payment, Inventory Movement, Audit Event, and supports Idempotency", async () => {
    const idempotencyKey = crypto.randomUUID();
    const purchaseQty = 3;

    // First attempt
    const res1 = await fetch(`${BASE_URL}/api/invoices/retail`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
            items: [{ productId: testProductIdA, quantity: purchaseQty }],
            paymentMethod: "CASH",
            note: "Khách mua mang về",
        }),
    });

    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    assert.equal(data1.ok, true);
    assert.ok(data1.invoice.id);
    assert.equal(data1.invoice.totalAmountVnd, 60000);
    assert.equal(data1.receiptData.totalAmountVnd, 60000);
    assert.equal(data1.receiptData.lines.length, 1);

    const invoiceId = data1.invoice.id;

    // Verify DB records
    // 1. Invoice is created with fishingSessionId = null
    const invRow = await pool.query(`SELECT * FROM "Invoice" WHERE "id" = $1`, [invoiceId]);
    assert.equal(invRow.rows.length, 1);
    assert.equal(invRow.rows[0].fishingSessionId, null);
    assert.equal(invRow.rows[0].totalAmountVnd, 60000);
    assert.equal(invRow.rows[0].status, "PAID");

    // 2. Payment is created
    const payRow = await pool.query(`SELECT * FROM "Payment" WHERE "invoiceId" = $1`, [invoiceId]);
    assert.equal(payRow.rows.length, 1);
    assert.equal(payRow.rows[0].amountVnd, 60000);
    assert.equal(payRow.rows[0].direction, "IN");
    assert.equal(payRow.rows[0].method, "CASH");

    // 3. InventoryMovement has negative quantity (-3)
    const movRow = await pool.query(
        `SELECT * FROM "InventoryMovement" WHERE "lakeId" = $1 AND "productId" = $2 AND "quantity" < 0`,
        [testLakeIdA, testProductIdA]
    );
    assert.equal(movRow.rows.length, 1);
    assert.equal(Number(movRow.rows[0].quantity), -3);

    // 4. AuditEvent was recorded
    const auditRow = await pool.query(
        `SELECT * FROM "AuditEvent" WHERE "lakeId" = $1 AND "entityId" = $2 AND "action" = 'RETAIL_SALE_COMPLETED'`,
        [testLakeIdA, invoiceId]
    );
    assert.equal(auditRow.rows.length, 1);

    // 5. Check remaining live stock: 10 - 3 = 7
    const stockRow = await pool.query(
        `SELECT SUM("quantity") as current_stock FROM "InventoryMovement" WHERE "lakeId" = $1 AND "productId" = $2`,
        [testLakeIdA, testProductIdA]
    );
    assert.equal(Number(stockRow.rows[0].current_stock), 7);

    // 6. Idempotency replay with same key must return cached 201 without double deducting
    const res2 = await fetch(`${BASE_URL}/api/invoices/retail`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
            items: [{ productId: testProductIdA, quantity: purchaseQty }],
            paymentMethod: "CASH",
        }),
    });

    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.equal(data2.invoice.id, invoiceId);

    // Stock must STILL be 7, not 4
    const stockAfterReplay = await pool.query(
        `SELECT SUM("quantity") as current_stock FROM "InventoryMovement" WHERE "lakeId" = $1 AND "productId" = $2`,
        [testLakeIdA, testProductIdA]
    );
    assert.equal(Number(stockAfterReplay.rows[0].current_stock), 7);
});
