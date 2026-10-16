import assert from "node:assert/strict";
import test from "node:test";

function normalizeVietnamesePhone(input) {
    if (!input) return null;
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("84") && digits.length > 9) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = digits.slice(1);
    if (!digits.startsWith("0")) digits = `0${digits}`;
    return /^0[35789]\d{8}$/.test(digits) ? `+84${digits.slice(1)}` : null;
}

test("Stored phone contact values remain normalizable for existing customer data", () => {
    assert.equal(normalizeVietnamesePhone("0988 888 888"), "+84988888888");
    assert.equal(normalizeVietnamesePhone("84988888888"), "+84988888888");
    assert.equal(normalizeVietnamesePhone("invalid"), null);
});

