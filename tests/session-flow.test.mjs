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
let freeHutsA = [];
let createdSession1Id = "";
let createdInvoice1Id = "";

let testLakeIdB = "";
let testUserIdB = "";
let testPackageIdB = "";
let freeHutsB = [];

// Helper to register & login a lake owner
async function setupOwner(lakeSuffix) {
    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testEmail = `test_${lakeSuffix}_${Date.now()}@example.com`;
    const testPassword = "SecurePassword123!";

    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: `Owner ${lakeSuffix}`,
            phone: testPhone,
            email: testEmail,
            password: testPassword,
            lakeName: `Lake ${lakeSuffix} ${Date.now()}`,
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

    // Seed area, huts, package
    const areaRes = await pool.query(
        `INSERT INTO "Area" ("id", "lakeId", "name", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'Khu A', NOW(), NOW())
         RETURNING id`,
        [regData.lakeId],
    );
    const areaId = areaRes.rows[0].id;

    const hutRes = await pool.query(
        `INSERT INTO "Hut" ("id", "lakeId", "areaId", "name", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'Ô Test 1', NOW(), NOW()),
                (gen_random_uuid(), $1, $2, 'Ô Test 2', NOW(), NOW()),
                (gen_random_uuid(), $1, $2, 'Ô Test 3', NOW(), NOW()),
                (gen_random_uuid(), $1, $2, 'Ô Test 4', NOW(), NOW())
         RETURNING id, name`,
        [regData.lakeId, areaId],
    );

    const pkgRes = await pool.query(
        `INSERT INTO "Package" ("id", "lakeId", "name", "durationMinutes", "priceVnd", "overtimeHourlyVnd", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'Ca 5 tiếng', 300, 250000, 50000, NOW(), NOW())
         RETURNING id`,
        [regData.lakeId],
    );

    return {
        cookie: sessionCookie.split(";")[0],
        lakeId: regData.lakeId,
        userId: regData.userId,
        packageId: pkgRes.rows[0].id,
        huts: hutRes.rows,
    };
}

before(async () => {
    await pool.query('DELETE FROM "RateLimitBucket"');

    const lakeA = await setupOwner("A");
    authCookieA = lakeA.cookie;
    testLakeIdA = lakeA.lakeId;
    testUserIdA = lakeA.userId;
    testPackageIdA = lakeA.packageId;
    freeHutsA = lakeA.huts;

    const lakeB = await setupOwner("B");
    testLakeIdB = lakeB.lakeId;
    testUserIdB = lakeB.userId;
    testPackageIdB = lakeB.packageId;
    freeHutsB = lakeB.huts;
});

after(async () => {
    if (pool) {
        for (const lakeId of [testLakeIdA, testLakeIdB]) {
            if (lakeId) {
                await pool.query(`DELETE FROM "InvoiceLine" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "lakeId" = $1)`, [lakeId]);
                await pool.query(`DELETE FROM "Payment" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Invoice" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "FishingSessionHut" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "FishingSession" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Customer" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Area" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Package" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "AuditEvent" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "IdempotencyKey" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "InventoryMovement" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Product" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [lakeId]);
                await pool.query(`DELETE FROM "Lake" WHERE "id" = $1`, [lakeId]);
            }
        }
        for (const userId of [testUserIdA, testUserIdB]) {
            if (userId) {
                await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [userId]);
            }
        }
        await pool.end();
    }
});

// Test 1: Khách lẻ + ô trống + gói 5 giờ + thu sau: Tạo đúng 1 Session + 1 Invoice
test("Test 1: Khách lẻ + ô trống + gói 5 giờ + thu sau -> Tạo đúng 1 Session + 1 Invoice DRAFT", async () => {
    const hut = freeHutsA[0];
    const res = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            customerId: null,
            packageId: testPackageIdA,
            hutIds: [hut.id],
        }),
    });

    assert.equal(res.status, 201, "Status must be 201 Created");
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.id, "Root id must exist");
    assert.ok(data.startTime, "Root startTime must exist");
    assert.ok(data.endTime, "Root endTime must exist");
    assert.ok(data.invoiceId, "Root invoiceId must exist");
    assert.ok(data.data?.session?.id, "PRD data.session.id must exist");
    assert.ok(data.data?.invoice?.id, "PRD data.invoice.id must exist");
    assert.equal(data.data.invoice.status, "DRAFT");

    createdSession1Id = data.id;
    createdInvoice1Id = data.invoiceId;

    // Check DB: exactly 1 Session and 1 Invoice
    const sessRes = await pool.query(`SELECT id FROM "FishingSession" WHERE id = $1`, [data.id]);
    assert.equal(sessRes.rows.length, 1);

    const invRes = await pool.query(`SELECT id, status, "totalAmountVnd" FROM "Invoice" WHERE "fishingSessionId" = $1`, [data.id]);
    assert.equal(invRes.rows.length, 1);
    assert.equal(invRes.rows[0].status, "DRAFT");
    assert.equal(invRes.rows[0].totalAmountVnd, 250000);
});

// Test 2: Khách mới hợp lệ: Customer, Session và Invoice cùng được tạo
test("Test 2: Khách mới hợp lệ -> Customer, Session và Invoice cùng được tạo", async () => {
    const hut = freeHutsA[1];
    const newPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const res = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            customer: {
                mode: "NEW",
                name: "Nguyễn Văn Khách Mới",
                phone: newPhone,
            },
            packageId: testPackageIdA,
            hutIds: [hut.id],
        }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.customer?.id, "Customer must be created and linked");
    assert.equal(data.customer.name, "Nguyễn Văn Khách Mới");
    assert.ok(data.invoiceId);

    // Verify customer exists in DB
    const custRes = await pool.query(`SELECT id, name FROM "Customer" WHERE id = $1`, [data.customer.id]);
    assert.equal(custRes.rows.length, 1);
});

// Test 3: Customer tạo được nhưng Invoice lỗi -> Toàn bộ transaction rollback
test("Test 3: Lỗi nghiệp vụ trong transaction -> Toàn bộ transaction rollback", async () => {
    const hut = freeHutsA[2];
    const invalidPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Pass an invalid product item ID to force an error during item/invoice creation
    const res = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            customer: {
                mode: "NEW",
                name: "Khách Rollback Test",
                phone: invalidPhone,
            },
            packageId: testPackageIdA,
            hutIds: [hut.id],
            items: [
                {
                    productId: crypto.randomUUID(), // non-existent product
                    quantity: 2,
                },
            ],
        }),
    });

    assert.equal(res.status, 404);

    // Check DB: Customer must NOT be created (rolled back)
    const custRes = await pool.query(`SELECT id FROM "Customer" WHERE "phoneNormalized" = $1 AND "lakeId" = $2`, [invalidPhone, testLakeIdA]);
    assert.equal(custRes.rows.length, 0, "Customer must be rolled back");

    // Hut must remain empty
    const hutRes = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE id = $1`, [hut.id]);
    assert.equal(hutRes.rows[0].currentSessionId, null, "Hut must not be occupied");
});

// Test 4: Session tạo được nhưng Payment lỗi -> Toàn bộ transaction rollback
test("Test 4: Payment âm hoặc lỗi validation -> Toàn bộ transaction rollback", async () => {
    const hut = freeHutsA[2];
    const res = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            customerId: null,
            packageId: testPackageIdA,
            hutIds: [hut.id],
            payments: [
                {
                    method: "CASH",
                    amountVnd: -50000, // invalid negative payment
                },
            ],
        }),
    });

    assert.equal(res.status, 400);

    // Verify hut is still empty
    const hutRes = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE id = $1`, [hut.id]);
    assert.equal(hutRes.rows[0].currentSessionId, null);
});

// Test 5: Bấm “Mở vé” hai lần: Chỉ có một Session và một Invoice
test("Test 5: Bấm Mở vé hai lần (Idempotency) -> Chỉ có 1 Session và 1 Invoice được tạo", async () => {
    const hut = freeHutsA[2];
    const mutationId = crypto.randomUUID();

    const payload = JSON.stringify({
        customerId: null,
        packageId: testPackageIdA,
        hutIds: [hut.id],
    });

    const res1 = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": mutationId,
        },
        body: payload,
    });
    assert.equal(res1.status, 201);
    const data1 = await res1.json();

    const res2 = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": mutationId,
        },
        body: payload,
    });
    assert.equal(res2.status, 201);
    const data2 = await res2.json();

    assert.equal(data1.id, data2.id);
    assert.equal(data1.invoiceId, data2.invoiceId);

    // Verify exactly 1 session and 1 invoice exist in DB
    const countSess = await pool.query(`SELECT COUNT(*)::int as count FROM "FishingSessionHut" WHERE "hutId" = $1`, [hut.id]);
    assert.equal(countSess.rows[0].count, 1);

    const countInv = await pool.query(`SELECT COUNT(*)::int as count FROM "Invoice" WHERE "fishingSessionId" = $1`, [data1.id]);
    assert.equal(countInv.rows[0].count, 1);
});

// Test 6: Hai máy mở cùng một ô: Một thành công, một nhận 409 SPOT_OCCUPIED
test("Test 6: Hai máy mở cùng một ô -> 1 thành công (201), 1 nhận 409 SPOT_OCCUPIED", async () => {
    const hut = freeHutsA[3];
    const request = () =>
        fetch(`${BASE_URL}/api/fishing-sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: authCookieA,
                "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify({
                customerId: null,
                packageId: testPackageIdA,
                hutIds: [hut.id],
            }),
        });

    const [r1, r2] = await Promise.all([request(), request()]);
    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409]);

    const conflictResponse = r1.status === 409 ? r1 : r2;
    const conflictData = await conflictResponse.json();
    assert.equal(conflictData.error, "Ô câu đã có khách đang câu.");
    assert.equal(conflictData.code, "SPOT_OCCUPIED");
});

// Test 7: API trả 400/409: Frontend không đọc undefined.startTime
test("Test 7: API trả 400/409 -> Response payload an toàn, không có runtime crash", async () => {
    const errRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            customerId: null,
            packageId: crypto.randomUUID(), // invalid package
            hutIds: [freeHutsA[0].id],
        }),
    });

    assert.equal(errRes.ok, false);
    const errData = await errRes.json();
    assert.equal(errData.ok, false);
    assert.ok(errData.error);
    assert.equal(errData.startTime, undefined);
    assert.equal(errData.id, undefined);
});

// Test 8: Thêm hàng, Gia hạn và Thu cá: Cập nhật đúng Invoice liên kết
test("Test 8: Thêm hàng và Gia hạn -> Cập nhật đúng trên Invoice liên kết của phiên", async () => {
    assert.ok(createdSession1Id);
    assert.ok(createdInvoice1Id);

    // Gia hạn phiên (+250.000đ)
    const extRes = await fetch(`${BASE_URL}/api/fishing-sessions/${createdSession1Id}/extensions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
            "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            packageId: testPackageIdA,
        }),
    });

    assert.equal(extRes.status, 200);

    // Check DB: Invoice total is now 500.000đ with 2 lines
    const invRes = await pool.query(`SELECT "totalAmountVnd" FROM "Invoice" WHERE id = $1`, [createdInvoice1Id]);
    assert.equal(invRes.rows[0].totalAmountVnd, 500000);

    const linesRes = await pool.query(`SELECT name, "totalVnd" FROM "InvoiceLine" WHERE "invoiceId" = $1 ORDER BY "createdAt" ASC`, [createdInvoice1Id]);
    assert.equal(linesRes.rows.length, 2);
    assert.ok(linesRes.rows[1].name.includes("Gia hạn"));
});

// Test 9: Kết thúc phiên: Không tạo Invoice thứ hai
test("Test 9: Kết thúc phiên -> Không tạo Invoice thứ hai", async () => {
    assert.ok(createdSession1Id);

    const completeRes = await fetch(`${BASE_URL}/api/fishing-sessions/${createdSession1Id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            action: "COMPLETE",
        }),
    });
    assert.equal(completeRes.status, 200);

    const countInv = await pool.query(
        `SELECT COUNT(*)::int as count FROM "Invoice" WHERE "fishingSessionId" = $1`,
        [createdSession1Id],
    );
    assert.equal(countInv.rows[0].count, 1, "Must maintain exactly 1 invoice for the session");
});

// Test 10: User hồ A không thể truy cập Session/Invoice hồ B (Tenant isolation)
test("Test 10: User hồ A không thể mở vé hoặc truy cập tài nguyên của hồ B", async () => {
    // User A tries to open a session using Lake B's hut and package
    const crossRes = await fetch(`${BASE_URL}/api/fishing-sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA, // User A
        },
        body: JSON.stringify({
            customerId: null,
            packageId: testPackageIdB, // Lake B's package
            hutIds: [freeHutsB[0].id],  // Lake B's hut
        }),
    });

    assert.equal(crossRes.status, 404, "Must reject cross-tenant resource access with 404");
    const crossData = await crossRes.json();
    assert.equal(crossData.ok, false);

    // Verify hut in Lake B was NOT occupied
    const hutCheck = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE id = $1`, [freeHutsB[0].id]);
    assert.equal(hutCheck.rows[0].currentSessionId, null);
});

// Test 11: Session thiếu Invoice nhưng có gia hạn/sản phẩm được tái tạo đúng đầy đủ tổng tiền khi COMPLETED
test("Test 11: Session thiếu Invoice nhưng có gia hạn và sản phẩm được tái tạo đúng đầy đủ tổng tiền khi COMPLETED", async () => {
    const rawSessionId = crypto.randomUUID();
    const hut = freeHutsA[1];

    // 1. Seed an ACTIVE session intentionally missing an invoice
    await pool.query(
        `INSERT INTO "FishingSession" (
            "id", "lakeId", "packageId", "status", "startAt", "plannedEndAt",
            "packageNameSnapshot", "packagePriceVndSnapshot", "packageDurationMinutesSnapshot", "overtimeHourlyVndSnapshot",
            "createdAt", "updatedAt"
         ) VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW() + interval '5 hours', 'Ca 5 tiếng Test', 250000, 300, 50000, NOW(), NOW())`,
        [rawSessionId, testLakeIdA, testPackageIdA],
    );
    await pool.query(
        `INSERT INTO "FishingSessionHut" ("id", "lakeId", "fishingSessionId", "hutId", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
        [testLakeIdA, rawSessionId, hut.id],
    );
    await pool.query(
        `UPDATE "Hut" SET "currentSessionId" = $1 WHERE "id" = $2`,
        [rawSessionId, hut.id],
    );

    // 2. Add an extension event (100.000đ)
    await pool.query(
        `INSERT INTO "AuditEvent" ("id", "lakeId", "entityType", "entityId", "action", "payload", "createdBy", "createdAt")
         VALUES (gen_random_uuid(), $1, 'FishingSession', $2, 'FISHING_SESSION_EXTENDED', $3, $4, NOW())`,
        [
            testLakeIdA,
            rawSessionId,
            JSON.stringify({ packageName: "Gia hạn 2 tiếng", priceVnd: 100000, addedMinutes: 120 }),
            testUserIdA,
        ],
    );

    // 3. Add a product sale inventory movement (Nước suối 15.000đ x 2 = 30.000đ)
    const prodRes = await pool.query(
        `INSERT INTO "Product" ("id", "lakeId", "name", "priceVnd", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'Nước suối Aquafina', 15000, NOW(), NOW())
         RETURNING id`,
        [testLakeIdA],
    );
    const prodId = prodRes.rows[0].id;

    await pool.query(
        `INSERT INTO "InventoryMovement" ("id", "lakeId", "productId", "quantity", "reason", "createdBy", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, -2, $3, $4, NOW())`,
        [testLakeIdA, prodId, `Bán kèm phiên (${rawSessionId})`, testUserIdA],
    );

    // Verify initially NO invoice exists
    const initialInv = await pool.query(`SELECT id FROM "Invoice" WHERE "fishingSessionId" = $1`, [rawSessionId]);
    assert.equal(initialInv.rows.length, 0, "Initially must have 0 invoices");

    // Complete the session
    const completeRes = await fetch(`${BASE_URL}/api/fishing-sessions/${rawSessionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            action: "COMPLETE",
        }),
    });
    assert.equal(completeRes.status, 200, "Completion must succeed");

    // Verify session status is COMPLETED
    const sessCheck = await pool.query(`SELECT status FROM "FishingSession" WHERE id = $1`, [rawSessionId]);
    assert.equal(sessCheck.rows[0].status, "COMPLETED");

    // Verify backend invariant guard created exactly 1 Invoice with correct authoritative total (250k + 100k + 30k = 380k)
    const invCheck = await pool.query(
        `SELECT id, status, "totalAmountVnd" FROM "Invoice" WHERE "fishingSessionId" = $1`,
        [rawSessionId],
    );
    assert.equal(invCheck.rows.length, 1, "Must auto-repair exactly 1 invoice");
    assert.equal(invCheck.rows[0].status, "DRAFT");
    assert.equal(invCheck.rows[0].totalAmountVnd, 380000, "Total must be 380.000đ");

    // Verify line items (3 lines: package + extension + product)
    const linesCheck = await pool.query(
        `SELECT name, "totalVnd" FROM "InvoiceLine" WHERE "invoiceId" = $1 ORDER BY "createdAt" ASC`,
        [invCheck.rows[0].id],
    );
    assert.equal(linesCheck.rows.length, 3, "Must have exactly 3 lines");
    assert.ok(linesCheck.rows[0].name.includes("Ca 5 tiếng Test"));
    assert.equal(linesCheck.rows[0].totalVnd, 250000);
    assert.ok(linesCheck.rows[1].name.includes("Gia hạn 2 tiếng"));
    assert.equal(linesCheck.rows[1].totalVnd, 100000);
    assert.ok(linesCheck.rows[2].name.includes("Nước suối Aquafina"));
    assert.equal(linesCheck.rows[2].totalVnd, 30000);

    // Verify hut is released
    const hutCheck = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE id = $1`, [hut.id]);
    assert.equal(hutCheck.rows[0].currentSessionId, null);
});

// Test 12: Thiếu dữ liệu nguồn phải rollback, Session không COMPLETED và ô không được giải phóng
test("Test 12: Thiếu dữ liệu nguồn hợp lệ phải rollback, Session không COMPLETED và ô không giải phóng", async () => {
    const brokenSessionId = crypto.randomUUID();
    const hut = freeHutsA[2];

    // Seed an ACTIVE session with invalid/missing package price snapshot (0 VNĐ)
    await pool.query(
        `INSERT INTO "FishingSession" (
            "id", "lakeId", "packageId", "status", "startAt", "plannedEndAt",
            "packageNameSnapshot", "packagePriceVndSnapshot", "packageDurationMinutesSnapshot", "overtimeHourlyVndSnapshot",
            "createdAt", "updatedAt"
         ) VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW() + interval '5 hours', 'Ca Lỗi Giá', 0, 300, 50000, NOW(), NOW())`,
        [brokenSessionId, testLakeIdA, testPackageIdA],
    );
    await pool.query(
        `INSERT INTO "FishingSessionHut" ("id", "lakeId", "fishingSessionId", "hutId", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
        [testLakeIdA, brokenSessionId, hut.id],
    );
    await pool.query(
        `UPDATE "Hut" SET "currentSessionId" = $1 WHERE "id" = $2`,
        [brokenSessionId, hut.id],
    );

    // Attempt to complete session with broken invariant
    const completeRes = await fetch(`${BASE_URL}/api/fishing-sessions/${brokenSessionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookieA,
        },
        body: JSON.stringify({
            action: "COMPLETE",
        }),
    });

    // Must return 422 INVOICE_INVARIANT_BROKEN
    assert.equal(completeRes.status, 422, "Must reject completion with 422 Unprocessable Entity");
    const errData = await completeRes.json();
    assert.equal(errData.ok, false);
    assert.equal(errData.code, "INVOICE_INVARIANT_BROKEN");
    assert.ok(errData.requestId, "Must return requestId");

    // Verify Session is still ACTIVE (NOT COMPLETED)
    const sessCheck = await pool.query(`SELECT status FROM "FishingSession" WHERE id = $1`, [brokenSessionId]);
    assert.equal(sessCheck.rows[0].status, "ACTIVE", "Session must remain ACTIVE");

    // Verify Hut is still OCCUPIED by this session (NOT released)
    const hutCheck = await pool.query(`SELECT "currentSessionId" FROM "Hut" WHERE id = $1`, [hut.id]);
    assert.equal(hutCheck.rows[0].currentSessionId, brokenSessionId, "Hut must still be held");

    // Verify NO invoice was created
    const invCheck = await pool.query(`SELECT id FROM "Invoice" WHERE "fishingSessionId" = $1`, [brokenSessionId]);
    assert.equal(invCheck.rows.length, 0, "No invoice must be created on rollback");
});

test("Test 13: GET /api/ping trả về 200 OK kèm serverNow và timestamp để phục vụ đồng bộ offline", async () => {
    const res = await fetch(`${BASE_URL}/api/ping`);
    assert.equal(res.status, 200, "Ping endpoint must return 200 OK");
    const data = await res.json();
    assert.equal(data.ok, true, "Must have ok: true");
    assert.ok(data.serverNow, "Must return serverNow ISO timestamp");
    assert.ok(typeof data.timestamp === "number", "Must return numeric timestamp");
    assert.ok(data.timestamp > 0, "Timestamp must be valid");
});

