import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let authCookie = "";
let testLakeId = "";
let testUserId = "";
let testPackageId = "";
let testHuts = [];
let testProductId = "";

async function setupTestLake() {
    const suffix = Date.now().toString().slice(-6);
    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `prepost_${suffix}@example.com`;
    const testPassword = "SecurePassword123!";

    const randomIp = `10.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": randomIp,
        },
        body: JSON.stringify({
            fullName: `Chủ Hồ Test ${suffix}`,
            phone: testPhone,
            email: testEmail,
            password: testPassword,
            lakeName: `Hồ Test PrePost ${suffix}`,
        }),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201) {
        console.error("Register failed:", regData);
    }
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
    authCookie = sessionCookie;

    testLakeId = regData.lakeId || regData.lake?.id;
    testUserId = regData.userId || regData.user?.id;

    // Seed area & 6 huts
    const areaRes = await pool.query(
        `INSERT INTO "Area" ("id", "lakeId", "name", "updatedAt") VALUES (gen_random_uuid(), $1, 'Khu Test', NOW()) RETURNING "id"`,
        [testLakeId],
    );
    const areaId = areaRes.rows[0].id;

    const hutRes = await pool.query(
        `INSERT INTO "Hut" ("id", "lakeId", "areaId", "name", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'Ô VIP 1', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô VIP 2', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô VIP 3', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô VIP 4', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô VIP 5', NOW()),
                (gen_random_uuid(), $1, $2, 'Ô VIP 6', NOW())
         RETURNING "id", "name"`,
        [testLakeId, areaId],
    );
    testHuts = hutRes.rows;

    // Seed standard package: 320.000đ, 240 mins (4 hours)
    const pkgRes = await pool.query(
        `INSERT INTO "Package" ("id", "lakeId", "name", "durationMinutes", "priceVnd", "overtimeHourlyVnd", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'Gói Câu 4 Giờ', 240, 320000, 65000, NOW())
         RETURNING "id"`,
        [testLakeId],
    );
    testPackageId = pkgRes.rows[0].id;

    // Seed product: Nước ngọt 40.000đ
    const prodRes = await pool.query(
        `INSERT INTO "Product" ("id", "lakeId", "name", "priceVnd", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'Bò Húc Thái', 40000, NOW())
         RETURNING "id"`,
        [testLakeId],
    );
    testProductId = prodRes.rows[0].id;

    // Cho phép bán âm kho & nạp 100 sản phẩm
    await pool.query(`UPDATE "Lake" SET "allowNegativeInventory" = true WHERE "id" = $1`, [testLakeId]);
    await pool.query(
        `INSERT INTO "InventoryMovement" ("id", "lakeId", "productId", "quantity", "reason", "createdBy", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, 100, 'Nạp kho test', $3, NOW())`,
        [testLakeId, testProductId, testUserId],
    );
}

before(async () => {
    await setupTestLake();
});

after(async () => {
    await pool.end();
});

test("1. Thu tiền sau (POSTPAID): Tạo phiên, không tạo payment, balanceDue = tổng vé, ô câu đang sử dụng", async () => {
    const hutId = testHuts[0].id;
    const res = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            packageId: testPackageId,
            hutIds: [hutId],
            paymentTiming: "POSTPAID",
            paymentMode: "POSTPAID",
        }),
    });

    if (!res.ok) {
        console.error("OpenSession failed with status:", res.status, await res.text());
    }
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.paymentTiming, "POSTPAID");
    assert.equal(data.totalAmountVnd, 320000);
    assert.equal(data.paidAmountVnd, 0);
    assert.equal(data.balanceDueVnd, 320000);

    // Kiểm tra DB
    const sessionDb = await pool.query(
        `SELECT "status", "paymentTiming" FROM "FishingSession" WHERE "id" = $1`,
        [data.id],
    );
    assert.equal(sessionDb.rows[0].status, "ACTIVE");
    assert.equal(sessionDb.rows[0].paymentTiming, "POSTPAID");

    const hutDb = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE "id" = $1`, [hutId]);
    assert.equal(hutDb.rows[0].currentSessionId, data.id);

    const invDb = await pool.query(
        `SELECT "status", "totalAmountVnd", "paidAmountVnd", "balanceDueVnd" FROM "Invoice" WHERE "id" = $1`,
        [data.invoiceId],
    );
    assert.equal(invDb.rows[0].status, "DRAFT");
    assert.equal(invDb.rows[0].totalAmountVnd, 320000);
    assert.equal(invDb.rows[0].paidAmountVnd, 0);
    assert.equal(invDb.rows[0].balanceDueVnd, 320000);

    // Không có payment nào được tạo
    const paymentsDb = await pool.query(
        `SELECT COUNT(*) as count FROM "Payment" WHERE "invoiceId" = $1`,
        [data.invoiceId],
    );
    assert.equal(parseInt(paymentsDb.rows[0].count, 10), 0);
});

test("2. Thu tiền trước (PREPAID): Tạo phiên, thanh toán đủ tiền gói, balanceDue = 0, totalAmount không bị đổi thành 0", async () => {
    const hutId = testHuts[1].id;
    const res = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            packageId: testPackageId,
            hutIds: [hutId],
            paymentTiming: "PREPAID",
            paymentMode: "PREPAID",
            payments: [
                { method: "CASH", amountVnd: 320000 },
            ],
        }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.paymentTiming, "PREPAID");
    // Tổng hóa đơn giữ nguyên 320.000đ - TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỔI THÀNH 0đ!
    assert.equal(data.totalAmountVnd, 320000);
    assert.equal(data.paidAmountVnd, 320000);
    assert.equal(data.balanceDueVnd, 0);

    // Kiểm tra DB
    const sessionDb = await pool.query(
        `SELECT "status", "paymentTiming" FROM "FishingSession" WHERE "id" = $1`,
        [data.id],
    );
    assert.equal(sessionDb.rows[0].status, "ACTIVE");
    assert.equal(sessionDb.rows[0].paymentTiming, "PREPAID");

    const invDb = await pool.query(
        `SELECT "status", "subtotalVnd", "totalAmountVnd", "paidAmountVnd", "balanceDueVnd" FROM "Invoice" WHERE "id" = $1`,
        [data.invoiceId],
    );
    assert.equal(invDb.rows[0].status, "PAID");
    assert.equal(invDb.rows[0].subtotalVnd, 320000);
    assert.equal(invDb.rows[0].totalAmountVnd, 320000);
    assert.equal(invDb.rows[0].paidAmountVnd, 320000);
    assert.equal(invDb.rows[0].balanceDueVnd, 0);

    // Payment được ghi nhận
    const payDb = await pool.query(
        `SELECT "amountVnd", "method", "direction" FROM "Payment" WHERE "invoiceId" = $1`,
        [data.invoiceId],
    );
    assert.equal(payDb.rows.length, 1);
    assert.equal(payDb.rows[0].amountVnd, 320000);
    assert.equal(payDb.rows[0].method, "CASH");
    assert.equal(payDb.rows[0].direction, "IN");
});

test("3. Thu tiền trước kết hợp (SPLIT): Tiền mặt 200k + Chuyển khoản 120k", async () => {
    const hutId = testHuts[2].id;
    const res = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            packageId: testPackageId,
            hutIds: [hutId],
            paymentTiming: "PREPAID",
            paymentMode: "PREPAID",
            payments: [
                { method: "CASH", amountVnd: 200000 },
                { method: "BANK_TRANSFER", amountVnd: 120000, reference: "VECAU_SPLIT" },
            ],
        }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.paymentTiming, "PREPAID");
    assert.equal(data.totalAmountVnd, 320000);
    assert.equal(data.paidAmountVnd, 320000);
    assert.equal(data.balanceDueVnd, 0);

    // Kiểm tra có đúng 2 bản ghi Payment
    const payDb = await pool.query(
        `SELECT "amountVnd", "method" FROM "Payment" WHERE "invoiceId" = $1 ORDER BY "amountVnd" DESC`,
        [data.invoiceId],
    );
    assert.equal(payDb.rows.length, 2);
    assert.equal(payDb.rows[0].amountVnd, 200000);
    assert.equal(payDb.rows[0].method, "CASH");
    assert.equal(payDb.rows[1].amountVnd, 120000);
    assert.equal(payDb.rows[1].method, "BANK_TRANSFER");
});

test("4. Phát sinh sau khi thu trước: Thêm sản phẩm 40k -> Cần thu thêm đúng 40k", async () => {
    const hutId = testHuts[3].id;
    // Bước 1: Mở phiên thu trước 320k
    const openRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            packageId: testPackageId,
            hutIds: [hutId],
            paymentTiming: "PREPAID",
            payments: [{ method: "CASH", amountVnd: 320000 }],
        }),
    });
    assert.equal(openRes.status, 201);
    const openData = await openRes.json();
    const sessionId = openData.id;
    const invoiceId = openData.data?.invoice?.id;
    assert.ok(invoiceId, "Must return invoice.id");

    // Bước 2: Thêm món (Bò Húc 40.000đ)
    const addRes = await fetch(`${BASE_URL}/api/invoices/${invoiceId}/lines`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
            Cookie: authCookie,
        },
        body: JSON.stringify({
            productId: testProductId,
            quantity: 1,
        }),
    });
    assert.equal(addRes.status, 201);

    // Bước 3: Xem bảng quyết toán preview
    const prevRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        headers: { Cookie: authCookie },
    });
    assert.equal(prevRes.status, 200);
    const prevData = await prevRes.json();

    assert.equal(prevData.financials.packageTotalVnd, 320000);
    assert.equal(prevData.financials.itemsTotalVnd, 40000);
    assert.equal(prevData.financials.grossChargeVnd, 360000);
    assert.equal(prevData.financials.totalPaidVnd, 320000);
    // Cần thu thêm đúng 40.000đ, không thu lại 320k lần 2!
    assert.equal(prevData.financials.netDueVnd, 40000);

    // Bước 4: Hoàn tất phiên, thu thêm 40.000đ
    const closeRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            action: "COMPLETE",
            settlement: {
                amountVnd: 40000,
                paymentMethod: "CASH",
            },
        }),
    });
    assert.equal(closeRes.status, 200);
    const closeData = await closeRes.json();

    // Bill receiptData hiển thị đầy đủ khoản đã thu trước và thu bổ sung
    assert.ok(closeData.receiptData);
    assert.equal(closeData.receiptData.prepaidAmountVnd, 320000);
    assert.equal(closeData.receiptData.supplementaryAmountVnd, 40000);
    assert.equal(closeData.receiptData.remainingVnd, 0);

    // Kiểm tra ô câu đã được giải phóng
    const hutCheck = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE "id" = $1`, [hutId]);
    assert.equal(hutCheck.rows[0].currentSessionId, null);
});

test("5. Thu tiền trước không phát sinh: Kết thúc không tạo payment thừa, còn phải thu 0đ", async () => {
    const hutId = testHuts[4].id;
    const openRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            packageId: testPackageId,
            hutIds: [hutId],
            paymentTiming: "PREPAID",
            payments: [{ method: "CASH", amountVnd: 320000 }],
        }),
    });
    assert.equal(openRes.status, 201);
    const openData = await openRes.json();
    const sessionId = openData.id;

    // Xem preview
    const prevRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        headers: { Cookie: authCookie },
    });
    assert.equal(prevRes.status, 200);
    const prevData = await prevRes.json();
    assert.equal(prevData.financials.netDueVnd, 0);

    // Đóng phiên không cần thu thêm (amountVnd = 0)
    const closeRes = await fetch(`${BASE_URL}/api/fishing-sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({
            action: "COMPLETE",
            settlement: {
                amountVnd: 0,
            },
        }),
    });
    assert.equal(closeRes.status, 200);
    const closeData = await closeRes.json();

    assert.ok(closeData.receiptData);
    assert.equal(closeData.receiptData.remainingVnd, 0);
    assert.equal(closeData.receiptData.prepaidAmountVnd, 320000);
    assert.equal(closeData.receiptData.supplementaryAmountVnd, 0);
});

test("6. Báo cáo doanh thu không tính trùng tiền thu trước và thu cuối", async () => {
    const reportRes = await fetch(`${BASE_URL}/api/reports/analytics?range=today`, {
        headers: { Cookie: authCookie },
    });
    assert.equal(reportRes.status, 200);
    const reportData = await reportRes.json();

    // Doanh thu được tính từ tổng hóa đơn/payments thực tế
    assert.ok(reportData.summary.totalRevenue >= 320000);

    // Kiểm tra tổng tiền trong bảng Payment bằng đúng tổng báo cáo dòng tiền
    const paymentsSum = await pool.query(
        `SELECT SUM("amountVnd") as total FROM "Payment" WHERE "lakeId" = $1 AND "direction" = 'IN'`,
        [testLakeId],
    );
    const dbTotal = parseInt(paymentsSum.rows[0].total, 10);
    const cashTotal = (reportData.summary.cashIn || 0) + (reportData.summary.transferIn || 0);
    assert.ok(cashTotal >= 320000);
    assert.equal(cashTotal, dbTotal);
});
