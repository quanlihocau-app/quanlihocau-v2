import assert from "node:assert/strict";
import test from "node:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

test("Phone OTP endpoints are disabled and do not contact SMS providers", async () => {
    const sendResponse = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "0901234567" }),
    });
    assert.equal(sendResponse.status, 410);
    assert.match((await sendResponse.json()).error, /email và mật khẩu/i);

    const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "0901234567", code: "123456" }),
    });
    assert.equal(verifyResponse.status, 410);
    assert.match((await verifyResponse.json()).error, /email và mật khẩu/i);
});
