import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let authCookieA = "";
let testLakeIdA = "";
let testUserIdA = "";
let testPackageIdA = "";
let testHutsA = [];
let testProductIdA = "";

async function setupOwner(suffix) {
    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `settle_${suffix}_${Date.now()}@example.com`;
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

    // Seed area & 4 huts
    const areaRes = await pool.query(
        `INSERT INTO "Area" ("id", "lakeId", "name", "updatedAt") VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING "id"`,
        [lakeId, `Khu ${suffix}`],
    );
    const areaId = areaRes.rows[0].id;

    const hutRes = await pool.query(
        `INSERT INTO "Hut" ("id", "lakeId", "areaId", "name", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'Ô 1', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô 2', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô 3', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô 4', NOW())
         RETURNING "id"`,
        [lakeId, areaId],
    );

    const pkgRes = await pool.query(
        `INSERT INTO "Package" ("id", "lakeId", "name", "durationMinutes", "priceVnd", "overtimeHourlyVnd", "updatedAt") VALUES (gen_random_uuid(), $1, 'Gói Ca 5 Giờ', 300, 250000, 50000, NOW()) RETURNING "id"`,
        [lakeId],
    );
    const packageId = pkgRes.rows[0].id;

    // Seed product
    const prodRes = await pool.query(
        `INSERT INTO "Product" ("id", "lakeId", "sku", "name", "priceVnd", "updatedAt") VALUES (gen_random_uuid(), $1, 'SP-0001', 'Nước suối', 15000, NOW()) RETURNING "id"`,
        [lakeId],
    );
    const productId = prodRes.rows[0].id;

    // Seed initial stock
    await pool.query(
        `INSERT INTO "InventoryMovement" ("id", "lakeId", "productId", "quantity", "reason", "createdBy") VALUES (gen_random_uuid(), $1, $2, 50, 'Tồn kho ban đầu', $3)`,
        [lakeId, productId, userId],
    );

    // Seed fish type
    const fishRes = await pool.query(
        `INSERT INTO "FishType" ("id", "lakeId", "name", "pricePerKg", "updatedAt") VALUES (gen_random_uuid(), $1, 'Cá chép', 150000, NOW()) RETURNING "id"`,
        [lakeId],
    );
    const fishTypeId = fishRes.rows[0].id;

    return {
        cookie: sessionCookie.split(";")[0],
        lakeId,
        userId,
        huts: hutRes.rows.map((r) => r.id),
        packageId,
        productId,
        fishTypeId,
    };
}

let testFishTypeIdA = "";

before(async () => {
    const ownerA = await setupOwner("Phase3A");
    authCookieA = ownerA.cookie;
    testLakeIdA = ownerA.lakeId;
    testUserIdA = ownerA.userId;
    testHutsA = ownerA.huts;
    testPackageIdA = ownerA.packageId;
    testProductIdA = ownerA.productId;
    testFishTypeIdA = ownerA.fishTypeId;
});

after(async () => {
    if (pool && testLakeIdA) {
        await pool.query(`DELETE FROM "InvoiceLine" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "lakeId" = $1)`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Payment" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "FishBuyback" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "FishType" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Invoice" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "FishingSessionHut" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "FishingSession" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "InventoryMovement" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Product" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "AuditEvent" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "IdempotencyKey" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Area" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Package" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "ShiftClose" WHERE "shiftId" IN (SELECT id FROM "Shift" WHERE "lakeId" = $1)`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Shift" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "Lake" WHERE "id" = $1`, [testLakeIdA]);
        await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [testUserIdA]);
    }
    await pool.end();
});

test("Test 1: Tạo phiên câu và GET /api/fishing-sessions/[sessionId] trả về số liệu quyết toán chuẩn xác", async () => {
    const createRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": `phase3-open-${Date.now()}`,
        },
        body: JSON.stringify({
            packageId: testPackageIdA,
            hutIds: [testHutsA[0]],
        }),
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const sessionId = createData.id;
    assert.ok(sessionId);

    // Call GET
    const getRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();

    assert.equal(getData.session.id, sessionId);
    assert.equal(getData.financials.packageTotalVnd, 250000);
    assert.equal(getData.financials.itemsTotalVnd, 0);
    assert.equal(getData.financials.grossChargeVnd, 250000);
    assert.equal(getData.financials.totalPaidVnd, 0);
    assert.equal(getData.financials.netDueVnd, 250000);
    assert.equal(getData.financials.refundVnd, 0);
});

test("Test 2: Thêm sản phẩm vào phiên câu và kiểm tra financials cập nhật tự động", async () => {
    // Open session on Hut 2
    const createRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": `phase3-item-${Date.now()}`,
        },
        body: JSON.stringify({
            packageId: testPackageIdA,
            hutIds: [testHutsA[1]],
        }),
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const sessionId = createData.id;
    const invoiceId = createData.invoiceId;

    // Add 2 water bottles (15,000 x 2 = 30,000)
    const addRes = await fetch(`${BASE_URL}/api/invoices/${invoiceId}/lines`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            productId: testProductIdA,
            quantity: 2,
        }),
    });
    assert.equal(addRes.status, 201);

    // Call GET on session
    const getRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();

    assert.equal(getData.financials.packageTotalVnd, 250000);
    assert.equal(getData.financials.itemsTotalVnd, 30000);
    assert.equal(getData.financials.grossChargeVnd, 280000);
    assert.equal(getData.financials.netDueVnd, 280000);
});

test("Test 3: Kết thúc phiên qua settlement checkout ghi nhận Payment, đóng phiên và giải phóng ô", async () => {
    // Open session on Hut 3
    const createRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": `phase3-checkout-${Date.now()}`,
        },
        body: JSON.stringify({
            packageId: testPackageIdA,
            hutIds: [testHutsA[2]],
        }),
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const sessionId = createData.id;

    // Complete session with settlement payment of 250,000đ CASH
    const completeRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            action: "COMPLETE",
            settlement: {
                amountVnd: 250000,
                paymentMethod: "CASH",
                note: "Khách trả đủ tiền mặt lúc đóng ca",
            },
        }),
    });
    assert.equal(completeRes.status, 200);
    const completeData = await completeRes.json();

    assert.equal(completeData.status, "COMPLETED");
    assert.ok(completeData.receiptData);
    assert.equal(completeData.receiptData.paymentAmountVnd, 250000);
    assert.equal(completeData.receiptData.paymentMethod, "CASH");
    assert.equal(completeData.receiptData.remainingVnd, 0);

    // Verify Hut 3 is released in DB
    const hutCheck = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE "id" = $1`, [testHutsA[2]]);
    assert.equal(hutCheck.rows[0].currentSessionId, null);

    // Verify Payment record exists in DB
    const paymentCheck = await pool.query(
        `SELECT "amountVnd", "method", "direction" FROM "Payment" WHERE "invoiceId" = $1`,
        [completeData.receiptData.invoiceId],
    );
    assert.ok(paymentCheck.rows.length >= 1);
    const lastPayment = paymentCheck.rows[paymentCheck.rows.length - 1];
    assert.equal(lastPayment.amountVnd, 250000);
    assert.equal(lastPayment.method, "CASH");
    assert.equal(lastPayment.direction, "IN");

    // Verify Invoice status is PAID
    const invCheck = await pool.query(`SELECT "status" FROM "Invoice" WHERE "id" = $1`, [
        completeData.receiptData.invoiceId,
    ]);
    assert.equal(invCheck.rows[0].status, "PAID");
});

test("Test 4: GET /api/reports/daily phản ánh đầy đủ breakdown số lượng vé, tiền mặt và sản phẩm", async () => {
    const reportRes = await fetch(`${BASE_URL}/api/reports/daily`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(reportRes.status, 200);
    const reportData = await reportRes.json();

    assert.ok(reportData.summary);
    assert.ok(reportData.breakdown);
    assert.ok(reportData.breakdown.sessions.total >= 1);
    assert.ok(reportData.breakdown.sessions.completed >= 1);
    assert.ok(reportData.breakdown.payments.cashInVnd >= 250000);
    assert.ok(Array.isArray(reportData.breakdown.sessions.packages));
});

test("Test 5: Thu mua cá tính vào bill phiên câu: (Gói câu + SP) - (Tạm tính + Thu cá), nếu âm hồ thối lại tiền cho khách", async () => {
    // 1. Mở phiên câu ở ô 4: Gói câu 250.000đ
    const openRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            hutIds: [testHutsA[3]],
            packageId: testPackageIdA,
            customerType: "WALK_IN",
        }),
    });
    assert.equal(openRes.status, 201);
    const openData = await openRes.json();
    const sessionId = openData.id;
    const invoiceId = openData.invoiceId;
    assert.ok(sessionId);
    assert.ok(invoiceId);

    // 2. Thêm 1 chai nước suối 15.000đ -> Tổng dịch vụ = 250k + 15k = 265k
    const addProdRes = await fetch(`${BASE_URL}/api/invoices/${invoiceId}/lines`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            productId: testProductIdA,
            quantity: 1,
        }),
    });
    assert.equal(addProdRes.status, 201);

    // 3. Ghi nhận thu mua cá liên kết phiên: 2.0 kg Cá chép @ 150k/kg = 300.000đ
    const buybackRes = await fetch(`${BASE_URL}/api/fish-buybacks`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            fishTypeId: testFishTypeIdA,
            weight: 2.0,
            sessionId,
            invoiceId,
        }),
    });
    assert.equal(buybackRes.status, 201);
    const buybackData = await buybackRes.json();
    assert.equal(buybackData.buyback.totalVnd, 300000);

    // 4. Kiểm tra GET /api/fishing-sessions/[sessionId]:
    // Tổng chi phí = 250k (gói) + 15k (nước) = 265.000đ
    // Giảm trừ = 0k (tạm tính) + 300k (thu cá) = 300.000đ
    // Kết quả = 265k - 300k = -35.000đ (ÂM) -> refundVnd = 35.000đ, netDueVnd = 0
    const previewRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        headers: { Cookie: authCookieA },
    });
    assert.equal(previewRes.status, 200);
    const previewData = await previewRes.json();

    assert.equal(previewData.financials.packageTotalVnd, 250000);
    assert.equal(previewData.financials.itemsTotalVnd, 15000);
    assert.equal(previewData.financials.fishBuybackTotalVnd, 300000);
    assert.equal(previewData.financials.grossChargeVnd, 265000);
    assert.equal(previewData.financials.totalDeductionsVnd, 300000);
    assert.equal(previewData.financials.netDueVnd, 0);
    assert.equal(previewData.financials.refundVnd, 35000);

    // 5. Kết thúc phiên với hoàn tiền (thối lại khách 35.000đ)
    const completeRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            action: "COMPLETE",
            settlement: {
                refundVnd: 35000,
                paymentMethod: "CASH",
                note: "Hồ thối lại tiền cá cho khách",
            },
        }),
    });
    assert.equal(completeRes.status, 200);
    const completeData = await completeRes.json();

    assert.equal(completeData.status, "COMPLETED");
    assert.ok(completeData.receiptData);
    assert.equal(completeData.receiptData.refundAmountVnd, 35000);
    assert.equal(completeData.receiptData.remainingVnd, 0);

    // 6. Xác minh DB:
    // Ô 4 đã giải phóng
    const hutCheck = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE "id" = $1`, [testHutsA[3]]);
    assert.equal(hutCheck.rows[0].currentSessionId, null);

    // Payment hoàn tiền direction OUT = 35.000đ
    const payCheck = await pool.query(
        `SELECT "amountVnd", "direction", "method" FROM "Payment" WHERE "invoiceId" = $1 AND "direction" = 'OUT'`,
        [invoiceId],
    );
    assert.equal(payCheck.rows.length, 1);
    assert.equal(payCheck.rows[0].amountVnd, 35000);
    assert.equal(payCheck.rows[0].direction, "OUT");

    // Hóa đơn chuyển trạng thái PAID
    const invCheck = await pool.query(`SELECT "status" FROM "Invoice" WHERE "id" = $1`, [invoiceId]);
    assert.equal(invCheck.rows[0].status, "PAID");
});
