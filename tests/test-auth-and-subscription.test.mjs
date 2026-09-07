import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import pg from "pg";

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let testUser = {
    fullName: "Nguyễn Văn Cần Thủ",
    phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: `test_auth_sub_${Date.now()}@example.com`,
    password: "SecurePassword123!",
    lakeName: `Hồ Câu Đại Gia ${Date.now()}`,
};

let userId = "";
let lakeId = "";
let authCookie = "";

before(async () => {
    // 1. Register new account
    const testIp = `10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200) + 1}`;
    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": testIp,
        },
        body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    assert.equal(regRes.status, 201, `Register failed: ${JSON.stringify(regData)}`);

    userId = regData.userId;
    lakeId = regData.lakeId;
});

after(async () => {
    await pool.end();
});

// =============================================================================
// PHẦN 1: TEST ĐĂNG NHẬP VÀO APP
// =============================================================================

test("Auth: Đăng nhập thất bại khi sai mật khẩu", async () => {
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
            email: testUser.email,
            password: "WrongPassword999!",
            redirect: "false",
            json: "true",
        }),
    });

    const setCookies = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get("set-cookie")];
    const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
    assert.equal(sessionCookie, undefined, "Không được cấp cookie khi sai mật khẩu");
});

test("Auth: Đăng nhập thất bại khi tài khoản không tồn tại", async () => {
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
            email: "non_existent_account_9999@example.com",
            password: "AnyPassword123!",
            redirect: "false",
            json: "true",
        }),
    });

    const setCookies = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get("set-cookie")];
    const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
    assert.equal(sessionCookie, undefined, "Không được cấp cookie khi email không tồn tại");
});

test("Auth: Đăng nhập thành công với Email + Password đúng & truy cập tính năng", async () => {
    // Đảm bảo số điện thoại đã xác thực để truy cập đầy đủ
    await pool.query(
        `UPDATE "User" SET "phoneVerified" = true, "phoneVerifiedAt" = NOW() WHERE id = $1`,
        [userId]
    );

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
            email: testUser.email,
            password: testUser.password,
            redirect: "false",
            json: "true",
        }),
    });

    const setCookies = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get("set-cookie")];
    const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
    assert.ok(sessionCookie, "Bắt buộc phải nhận được cookie session-token");

    authCookie = sessionCookie.split(";")[0];

    // Xác nhận phiên làm việc hợp lệ bằng cách gọi API yêu cầu đăng nhập
    const meRes = await fetch(`${BASE_URL}/api/reports/analytics?preset=today`, {
        headers: { Cookie: authCookie },
    });
    assert.equal(meRes.status, 200, "Truy cập báo cáo thành công với session cookie hợp lệ");
    const meData = await meRes.json();
    assert.equal(meData.lake.id, lakeId);
});

test("Auth: Đăng nhập qua số điện thoại + SMS OTP", async () => {
    const phone = testUser.phone;

    // 1. Yêu cầu gửi OTP
    const sendOtpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
    });
    const sendOtpData = await sendOtpRes.json();
    assert.ok(
        sendOtpRes.status === 200 || (sendOtpRes.status === 502 && sendOtpData.devOtp),
        `Send OTP failed: ${JSON.stringify(sendOtpData)}`
    );

    // 2. Tra cứu OTP code từ DB (Mock provider/hash)
    const otpRow = await pool.query(
        `SELECT code FROM "OtpCode" WHERE phone = $1 OR phone = $2 LIMIT 1`,
        [phone, `+84${phone.replace(/^0/, "")}`]
    );
    assert.ok(otpRow.rows[0], "Phải có bản ghi OTP tạo trong database");

    // Trong dev/mock provider, OTP code mặc định có thể là code hash
    // Kiểm tra thử nhập sai mã OTP
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    const cookies = csrfRes.headers.get("set-cookie") || "";

    const failOtpLogin = await fetch(`${BASE_URL}/api/auth/callback/phone-otp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: cookies,
        },
        body: new URLSearchParams({
            csrfToken,
            phone,
            code: "000000", // Wrong code
            redirect: "false",
            json: "true",
        }),
    });

    const setCookies = failOtpLogin.headers.getSetCookie
        ? failOtpLogin.headers.getSetCookie()
        : [failOtpLogin.headers.get("set-cookie")];
    const sessionCookie = setCookies.find((c) => c && c.includes("session-token"));
    assert.equal(sessionCookie, undefined, "Nhập sai OTP không được đăng nhập");
});

// =============================================================================
// PHẦN 2: TEST ĐĂNG KÝ CÁC GÓI TRONG APP (SAAS SUBSCRIPTION ORDERS & WEBHOOK)
// =============================================================================

test("Subscription: Kiểm tra thông tin gói ban đầu khi tạo hồ", async () => {
    const lakeRow = await pool.query(
        `SELECT "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt" FROM "Lake" WHERE id = $1`,
        [lakeId]
    );
    assert.ok(lakeRow.rows[0]);
    const lake = lakeRow.rows[0];

    assert.equal(lake.subscriptionPlan, "TRIAL");
    assert.equal(lake.subscriptionStatus, "TRIAL");
    assert.ok(lake.subscriptionExpiresAt instanceof Date);

    // Thời gian dùng thử 7 ngày
    const daysLeft = (lake.subscriptionExpiresAt.getTime() - Date.now()) / (86400 * 1000);
    assert.ok(daysLeft > 6 && daysLeft <= 7.1, `Hạn dùng thử phải là 7 ngày (hiện tại: ${daysLeft})`);
});

let createdSilverOrderCode = "";
let createdGoldOrderCode = "";

test("Subscription: Tạo đơn đăng ký Gói Bạc (SILVER - 99.000 VNĐ)", async () => {
    const res = await fetch(`${BASE_URL}/api/subscription/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({ plan: "SILVER" }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();

    assert.ok(data.order);
    assert.ok(data.order.orderCode.startsWith("HC"));
    assert.equal(data.order.planCode, "SILVER");
    assert.equal(data.order.amountVnd, 99000);
    assert.equal(data.order.status, "PENDING");

    // Kiểm tra thông tin VietQR trả về
    assert.ok(data.paymentInfo);
    assert.ok(data.paymentInfo.qrUrl.includes("vietqr"));
    assert.equal(data.paymentInfo.amount, 99000);
    assert.ok(data.paymentInfo.memo.includes(data.order.orderCode));

    createdSilverOrderCode = data.order.orderCode;
});

test("Subscription: Tạo đơn đăng ký Gói Vàng (GOLD - 179.000 VNĐ)", async () => {
    const res = await fetch(`${BASE_URL}/api/subscription/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
        },
        body: JSON.stringify({ plan: "GOLD" }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();

    assert.ok(data.order);
    assert.equal(data.order.planCode, "GOLD");
    assert.equal(data.order.amountVnd, 179000);
    assert.equal(data.order.status, "PENDING");

    createdGoldOrderCode = data.order.orderCode;
});

test("Subscription: Lấy danh sách lịch sử đơn hàng của hồ", async () => {
    const res = await fetch(`${BASE_URL}/api/subscription/orders`, {
        headers: { Cookie: authCookie },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.orders));
    assert.ok(data.orders.length >= 2);

    const codes = data.orders.map((o) => o.orderCode);
    assert.ok(codes.includes(createdSilverOrderCode));
    assert.ok(codes.includes(createdGoldOrderCode));
});

test("Subscription Webhook: Chặn kích hoạt khi khách thanh toán thiếu tiền", async () => {
    // Gói Bạc 99k nhưng khách chỉ chuyển 50k
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: `Chuyen khoan ${createdSilverOrderCode}`,
            amount: 50000,
            transactionId: `TXN_INSUFFICIENT_${Date.now()}`,
        }),
    });

    assert.equal(webhookRes.status, 400);
    const data = await webhookRes.json();
    assert.ok(data.error.includes("không đủ"));

    // Đơn hàng trong DB vẫn phải là PENDING
    const orderRow = await pool.query(
        `SELECT status FROM "SubscriptionOrder" WHERE "orderCode" = $1`,
        [createdSilverOrderCode]
    );
    assert.equal(orderRow.rows[0].status, "PENDING");
});

test("Subscription Webhook: Kích hoạt Gói Bạc (SILVER) khi chuyển khoản đủ tiền", async () => {
    const prevLakeRow = await pool.query(
        `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE id = $1`,
        [lakeId]
    );
    const prevExpiresAt = new Date(prevLakeRow.rows[0].subscriptionExpiresAt);

    // Gửi webhook chuyển khoản chuẩn 99k
    const txnRef = `TXN_SILVER_${Date.now()}`;
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: `Thanh toan don hang ${createdSilverOrderCode} QLHC`,
            transferAmount: 99000,
            referenceCode: txnRef,
        }),
    });

    assert.equal(webhookRes.status, 200);
    const data = await webhookRes.json();
    assert.equal(data.success, true);
    assert.equal(data.data.idempotent, false);
    assert.equal(data.data.planCode, "SILVER");

    // 1. Kiểm tra đơn hàng cập nhật thành PAID
    const orderRow = await pool.query(
        `SELECT status, "paidAt", "bankRef" FROM "SubscriptionOrder" WHERE "orderCode" = $1`,
        [createdSilverOrderCode]
    );
    assert.equal(orderRow.rows[0].status, "PAID");
    assert.ok(orderRow.rows[0].paidAt);
    assert.equal(orderRow.rows[0].bankRef, txnRef);

    // 2. Kiểm tra Lake & Organization cập nhật lên SILVER và cộng dồn 30 ngày
    const lakeRow = await pool.query(
        `SELECT "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt" FROM "Lake" WHERE id = $1`,
        [lakeId]
    );
    const updatedLake = lakeRow.rows[0];
    assert.equal(updatedLake.subscriptionPlan, "SILVER");
    assert.equal(updatedLake.subscriptionStatus, "ACTIVE");

    const newExpiresAt = new Date(updatedLake.subscriptionExpiresAt);
    // Hạn mới = hạn cũ + 30 ngày (2592000000 ms)
    const diffMs = newExpiresAt.getTime() - prevExpiresAt.getTime();
    const diffDays = Math.round(diffMs / (86400 * 1000));
    assert.equal(diffDays, 30, "Thời hạn gói cước phải được cộng dồn chính xác 30 ngày");

    // 3. Kiểm tra có bản ghi AuditEvent
    const auditRow = await pool.query(
        `SELECT * FROM "AuditEvent" WHERE "lakeId" = $1 AND "action" = 'PLAN_ACTIVATED' AND "entityId" = $2`,
        [lakeId, data.data.orderId]
    );
    assert.ok(auditRow.rows.length > 0);
});

test("Subscription Webhook: Idempotency chống cộng dồn thời gian trùng lặp", async () => {
    const lakeBeforeRow = await pool.query(
        `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE id = $1`,
        [lakeId]
    );
    const expiresAtBefore = new Date(lakeBeforeRow.rows[0].subscriptionExpiresAt).getTime();

    // Gửi lại webhook một lần nữa cho cùng đơn hàng
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: `Thanh toan don hang ${createdSilverOrderCode} QLHC`,
            transferAmount: 99000,
            referenceCode: `TXN_REPEAT_${Date.now()}`,
        }),
    });

    assert.equal(webhookRes.status, 200);
    const data = await webhookRes.json();
    assert.equal(data.data.idempotent, true, "Phải nhận diện giao dịch đã xử lý trước đó");

    // Kiểm tra hạn hồ không bị cộng thêm lần nữa
    const lakeAfterRow = await pool.query(
        `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE id = $1`,
        [lakeId]
    );
    const expiresAtAfter = new Date(lakeAfterRow.rows[0].subscriptionExpiresAt).getTime();
    assert.equal(expiresAtAfter, expiresAtBefore, "Tuyệt đối không được cộng thêm ngày khi webhook gửi lại");
});

test("Subscription Webhook: Nâng cấp tiếp lên Gói Vàng (GOLD - 179k)", async () => {
    const prevLakeRow = await pool.query(
        `SELECT "subscriptionExpiresAt" FROM "Lake" WHERE id = $1`,
        [lakeId]
    );
    const prevExpiresAt = new Date(prevLakeRow.rows[0].subscriptionExpiresAt);

    // Gửi webhook thanh toán cho đơn GOLD
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: `Thanh toan don hang ${createdGoldOrderCode}`,
            amount: 179000,
            id: `TXN_GOLD_${Date.now()}`,
        }),
    });

    assert.equal(webhookRes.status, 200);
    const data = await webhookRes.json();
    assert.equal(data.data.planCode, "GOLD");

    // Kiểm tra hồ nâng lên GOLD và cộng dồn tiếp 30 ngày
    const lakeRow = await pool.query(
        `SELECT "subscriptionPlan", "subscriptionStatus", "subscriptionExpiresAt" FROM "Lake" WHERE id = $1`,
        [lakeId]
    );
    assert.equal(lakeRow.rows[0].subscriptionPlan, "GOLD");

    const newExpiresAt = new Date(lakeRow.rows[0].subscriptionExpiresAt);
    const diffDays = Math.round((newExpiresAt.getTime() - prevExpiresAt.getTime()) / (86400 * 1000));
    assert.equal(diffDays, 30, "Cộng dồn thêm 30 ngày cho gói Vàng");
});
