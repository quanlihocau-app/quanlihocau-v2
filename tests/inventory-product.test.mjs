import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let authCookie = "";
let testLakeId = "";
let testUserId = "";

// Helper to register & login a lake owner
async function setupOwner(lakeSuffix) {
    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `test_inv_${lakeSuffix}_${Date.now()}@example.com`;
    const testPassword = "SecurePassword123!";

    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: `Owner Inv ${lakeSuffix}`,
            phone: testPhone,
            email: testEmail,
            password: testPassword,
            lakeName: `Lake Inv ${lakeSuffix} ${Date.now()}`,
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

    return {
        lakeId: regData.lakeId,
        userId: regData.userId,
        cookie: sessionCookie,
    };
}

before(async () => {
    // Clear rate limit buckets for clean test runs
    await pool.query('DELETE FROM "RateLimitBucket"');
    const owner = await setupOwner("Phase2");
    testLakeId = owner.lakeId;
    testUserId = owner.userId;
    authCookie = owner.cookie;
});

after(async () => {
    if (pool && testLakeId) {
        await pool.query(`DELETE FROM "InventoryMovement" WHERE "lakeId" = $1`, [testLakeId]);
        await pool.query(`DELETE FROM "Product" WHERE "lakeId" = $1`, [testLakeId]);
        await pool.query(`DELETE FROM "AuditEvent" WHERE "lakeId" = $1`, [testLakeId]);
        await pool.query(`DELETE FROM "IdempotencyKey" WHERE "lakeId" = $1`, [testLakeId]);
        await pool.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [testLakeId]);
        await pool.query(`DELETE FROM "Lake" WHERE "id" = $1`, [testLakeId]);
        await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [testUserId]);
        await pool.end();
    }
});

test("Test 1: Tạo sản phẩm mới tự động sinh SKU tuần tự per lake", async () => {
    // 1. Create first product
    const res1 = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Mồi câu chép số 1",
            priceVnd: 25000,
            initialStock: 0,
        }),
    });

    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    assert.ok(data1.product);
    assert.ok(data1.product.sku.startsWith("SP-"), "SKU must start with SP-");
    const sku1 = data1.product.sku;

    // 2. Create second product
    const res2 = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Nước ngọt C2 Chanh",
            priceVnd: 12000,
            initialStock: 0,
        }),
    });

    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.ok(data2.product);
    assert.notEqual(data2.product.sku, sku1, "SKUs must be unique");
    assert.ok(data2.product.sku > sku1, "Second SKU must be sequentially greater than first SKU");
});

test("Test 2: Tạo sản phẩm kèm số lượng nhập kho ban đầu trong cùng transaction", async () => {
    const res = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Cám chim Ba Vì",
            priceVnd: 30000,
            initialStock: 50,
        }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.initialStock, 50);

    const productId = data.product.id;

    // Verify InventoryMovement in DB
    const movementRes = await pool.query(
        `SELECT * FROM "InventoryMovement" WHERE "productId" = $1`,
        [productId],
    );
    assert.equal(movementRes.rows.length, 1, "Must have exactly 1 initial movement");
    assert.equal(Number(movementRes.rows[0].quantity), 50);
    assert.ok(movementRes.rows[0].reason.includes("Nhập kho ban đầu"));

    // Verify AuditEvent in DB
    const auditRes = await pool.query(
        `SELECT * FROM "AuditEvent" WHERE "entityId" = $1 AND "action" = 'PRODUCT_CREATED'`,
        [productId],
    );
    assert.equal(auditRes.rows.length, 1);
    const auditPayload = JSON.parse(auditRes.rows[0].payload);
    assert.equal(auditPayload.initialStock, 50);
});

test("Test 3: Nhập thêm hàng có Idempotency-Key chống bấm trùng", async () => {
    // 1. Create a product with initialStock = 10
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Bánh mì ngọt Kinh Đô",
            priceVnd: 15000,
            initialStock: 10,
        }),
    });
    const prodData = await prodRes.json();
    const productId = prodData.product.id;

    const idempotencyKey = crypto.randomUUID();

    // 2. First stock-in call (+20)
    const stockIn1 = await fetch(`${BASE_URL}/api/inventory-movements`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
            Cookie: authCookie,
        },
        body: JSON.stringify({
            productId,
            type: "IN",
            quantity: 20,
            reason: "Nhập thêm hàng bán ca chiều",
            supplier: "Đại lý Bánh",
            costPriceVnd: 10000,
            note: "Hạn sử dụng 1 tuần",
        }),
    });

    assert.equal(stockIn1.status, 201);
    const data1 = await stockIn1.json();
    assert.equal(data1.movement.newStock, 30); // 10 + 20 = 30

    // 3. Duplicate stock-in call with same Idempotency-Key
    const stockIn2 = await fetch(`${BASE_URL}/api/inventory-movements`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
            Cookie: authCookie,
        },
        body: JSON.stringify({
            productId,
            type: "IN",
            quantity: 20,
            reason: "Nhập thêm hàng bán ca chiều",
            supplier: "Đại lý Bánh",
            costPriceVnd: 10000,
            note: "Hạn sử dụng 1 tuần",
        }),
    });

    assert.equal(stockIn2.status, 201);
    const data2 = await stockIn2.json();
    assert.equal(data2.movement.newStock, 30, "Must return cached newStock 30, NOT 50");

    // 4. Verify DB has only 2 movements total (1 initial + 1 import)
    const movCount = await pool.query(
        `SELECT COUNT(*)::int as count FROM "InventoryMovement" WHERE "productId" = $1`,
        [productId],
    );
    assert.equal(movCount.rows[0].count, 2, "Must NOT create duplicate movement in DB");
});

test("Test 4: Xuất kho vượt quá số lượng tồn kho trả 409 INSUFFICIENT_STOCK", async () => {
    // 1. Create a product with initialStock = 5
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            name: "Lưỡi câu cá tráp",
            priceVnd: 45000,
            initialStock: 5,
        }),
    });
    const prodData = await prodRes.json();
    const productId = prodData.product.id;

    // 2. Try to export 10 items (more than 5)
    const outRes = await fetch(`${BASE_URL}/api/inventory-movements`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            productId,
            type: "OUT",
            quantity: 10,
            reason: "Xuất kho thử nghiệm",
        }),
    });

    assert.equal(outRes.status, 409, "Must return 409 Conflict when stock is insufficient");
    const outData = await outRes.json();
    assert.ok(outData.error.includes("không đủ để xuất"));

    // 3. Verify stock in DB remains exactly 5
    const sumRes = await pool.query(
        `SELECT SUM("quantity")::int as total FROM "InventoryMovement" WHERE "productId" = $1`,
        [productId],
    );
    assert.equal(sumRes.rows[0].total, 5);
});
