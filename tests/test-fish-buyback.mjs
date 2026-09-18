// Automated test suite for fish buyback weight input and calculation logic
import assert from "node:assert";

// Implementations extracted from fish-buyback-modal.tsx
function cleanWeightInput(raw) {
    if (!raw) return "";
    let cleaned = raw.replace(/[^0-9.,]/g, "");
    if (cleaned.startsWith(",") || cleaned.startsWith(".")) {
        cleaned = "0" + cleaned;
    }
    const firstSepIndex = cleaned.search(/[.,]/);
    if (firstSepIndex !== -1) {
        const sep = cleaned[firstSepIndex];
        const before = cleaned.slice(0, firstSepIndex);
        const after = cleaned.slice(firstSepIndex + 1).replace(/[.,]/g, "");
        const trimmedAfter = after.slice(0, 2);
        cleaned = before + sep + trimmedAfter;
    }
    if (
        cleaned.length > 1 &&
        cleaned.startsWith("0") &&
        !cleaned.startsWith("0.") &&
        !cleaned.startsWith("0,")
    ) {
        cleaned = cleaned.replace(/^0+/, "") || "0";
    }
    return cleaned;
}

function parseWeight(input) {
    if (!input) return 0;
    const normalized = input.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
}

function calculatePayout(weight, pricePerKg) {
    return Math.round(weight * pricePerKg);
}

function formatVnd(amount) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

console.log("=== RUNNING TESTS FOR FISH BUYBACK LOGIC ===");

// 1. 3 kg
const t1_cleaned = cleanWeightInput("3");
const t1_w = parseWeight(t1_cleaned);
assert.strictEqual(t1_w, 3, "Test 1: 3 kg failed");
console.log("✔ Case 1: 3 kg ->", t1_w, "kg");

// 2. 3,4 kg
const t2_cleaned = cleanWeightInput("3,4");
const t2_w = parseWeight(t2_cleaned);
assert.strictEqual(t2_w, 3.4, "Test 2: 3,4 kg failed");
assert.strictEqual(calculatePayout(t2_w, 100000), 340000);
console.log("✔ Case 2: 3,4 kg ->", t2_w, "kg | 100.000đ/kg ->", formatVnd(calculatePayout(t2_w, 100000)));

// 3. 12,5 kg
const t3_cleaned = cleanWeightInput("12,5");
const t3_w = parseWeight(t3_cleaned);
assert.strictEqual(t3_w, 12.5, "Test 3: 12,5 kg failed");
assert.strictEqual(calculatePayout(t3_w, 100000), 1250000);
console.log("✔ Case 3: 12,5 kg ->", t3_w, "kg | 100.000đ/kg ->", formatVnd(calculatePayout(t3_w, 100000)));

// 4. 10,3 kg
const t4_cleaned = cleanWeightInput("10,3");
const t4_w = parseWeight(t4_cleaned);
assert.strictEqual(t4_w, 10.3, "Test 4: 10,3 kg failed");
assert.strictEqual(calculatePayout(t4_w, 100000), 1030000);
console.log("✔ Case 4: 10,3 kg ->", t4_w, "kg | 100.000đ/kg ->", formatVnd(calculatePayout(t4_w, 100000)));

// 5. 0,5 kg
const t5_cleaned = cleanWeightInput("0,5");
const t5_w = parseWeight(t5_cleaned);
assert.strictEqual(t5_w, 0.5, "Test 5: 0,5 kg failed");
assert.strictEqual(calculatePayout(t5_w, 100000), 50000);
console.log("✔ Case 5: 0,5 kg ->", t5_w, "kg | 100.000đ/kg ->", formatVnd(calculatePayout(t5_w, 100000)));

// 6. 1,25 kg
const t6_cleaned = cleanWeightInput("1,25");
const t6_w = parseWeight(t6_cleaned);
assert.strictEqual(t6_w, 1.25, "Test 6: 1,25 kg failed");
assert.strictEqual(calculatePayout(t6_w, 100000), 125000);
assert.strictEqual(calculatePayout(t6_w, 40000), 50000);
console.log("✔ Case 6: 1,25 kg ->", t6_w, "kg | 100.000đ/kg ->", formatVnd(calculatePayout(t6_w, 100000)));

// 7. 20 kg
const t7_cleaned = cleanWeightInput("20");
const t7_w = parseWeight(t7_cleaned);
assert.strictEqual(t7_w, 20, "Test 7: 20 kg failed");
assert.strictEqual(calculatePayout(t7_w, 100000), 2000000);
console.log("✔ Case 7: 20 kg ->", t7_w, "kg | 100.000đ/kg ->", formatVnd(calculatePayout(t7_w, 100000)));

// 8. 3.4 kg
const t8_cleaned = cleanWeightInput("3.4");
const t8_w = parseWeight(t8_cleaned);
assert.strictEqual(t8_w, 3.4, "Test 8: 3.4 kg failed");
console.log("✔ Case 8: 3.4 kg ->", t8_w, "kg");

// 9. 12.5 kg
const t9_cleaned = cleanWeightInput("12.5");
const t9_w = parseWeight(t9_cleaned);
assert.strictEqual(t9_w, 12.5, "Test 9: 12.5 kg failed");
console.log("✔ Case 9: 12.5 kg ->", t9_w, "kg");

// 10. Xóa số rồi nhập lại
let state = cleanWeightInput("12,5");
assert.strictEqual(state, "12,5");
state = cleanWeightInput("");
assert.strictEqual(state, "");
assert.strictEqual(parseWeight(state), 0);
state = cleanWeightInput("3");
assert.strictEqual(parseWeight(state), 3);
console.log("✔ Case 10: Xóa số rồi nhập lại ->", state);

// 11. Sửa số ở giữa (12,5 -> 10,5)
const t11_cleaned = cleanWeightInput("10,5");
assert.strictEqual(parseWeight(t11_cleaned), 10.5);
console.log("✔ Case 11: Sửa số ở giữa ->", t11_cleaned);

// 12. Nhập rỗng
const t12_cleaned = cleanWeightInput("");
assert.strictEqual(t12_cleaned, "");
assert.strictEqual(parseWeight(t12_cleaned), 0);
console.log("✔ Case 12: Nhập rỗng an toàn, parseWeight = 0, payout = 0");

// 13. Nhập số âm (-5 -> 5)
const t13_cleaned = cleanWeightInput("-5");
assert.strictEqual(t13_cleaned, "5");
assert.strictEqual(parseWeight(t13_cleaned), 5);
console.log("✔ Case 13: Nhập số âm bị chặn dấu âm ->", t13_cleaned);

// 14. Nhập chữ (abc, 3a4)
const t14_a = cleanWeightInput("abc");
assert.strictEqual(t14_a, "");
const t14_b = cleanWeightInput("3kg4");
assert.strictEqual(t14_b, "34");
console.log("✔ Case 14: Nhập chữ bị loại bỏ sạch sẽ");

// 15. Tính tiền với các đơn giá khác nhau
assert.strictEqual(calculatePayout(3, 40000), 120000);
assert.strictEqual(calculatePayout(3.4, 40000), 136000);
assert.strictEqual(calculatePayout(1.25, 60000), 75000);
assert.strictEqual(calculatePayout(0.5, 60000), 30000);
console.log("✔ Case 15: Đơn giá cá khác nhau tính chính xác 100%");

// 16. Tổng tiền nhiều mặt hàng + thu cá
const grossCharge = 720000;
const prepaid = 410000;
const fishPayout = calculatePayout(12.75, 40000); // 510.000đ
const totalDeductions = prepaid + fishPayout; // 920.000đ
const refund = Math.max(0, totalDeductions - grossCharge); // 200.000đ
assert.strictEqual(refund, 200000);
console.log("✔ Case 16 & 17: Thối tiền sau khi có tiền cá:", formatVnd(refund));

// 18. Receipt builder line item formatting test
const fishLine = {
    name: "Thu cá: Chép (3.4 kg)",
    unitPrice: 40000,
    quantity: 3.4,
    totalVnd: -calculatePayout(3.4, 40000), // -136000
};
assert.strictEqual(fishLine.quantity, 3.4);
assert.strictEqual(fishLine.totalVnd, -136000);
console.log("✔ Case 18: Line in bill:", fishLine.name, "x" + fishLine.quantity, "@", formatVnd(fishLine.unitPrice), "=", formatVnd(fishLine.totalVnd));

// Extra: Gõ dấu phẩy đầu tiên (,5 -> 0,5)
const extra1 = cleanWeightInput(",5");
assert.strictEqual(extra1, "0,5");
assert.strictEqual(parseWeight(extra1), 0.5);
console.log("✔ Extra: Gõ dấu phẩy trước (,5) -> 0,5 kg");

// Extra: Gõ nhiều dấu phẩy (3,4,5 -> 3,45)
const extra2 = cleanWeightInput("3,4,5");
assert.strictEqual(extra2, "3,45");
assert.strictEqual(parseWeight(extra2), 3.45);
console.log("✔ Extra: Nhiều dấu phẩy (3,4,5) ->", extra2);

// Extra: Giữ số 0 khi đang gõ (1,0 -> 1,0)
const extra3 = cleanWeightInput("1,0");
assert.strictEqual(extra3, "1,0");
console.log("✔ Extra: Giữ số 0 đang gõ (1,0) ->", extra3);

console.log("\nALL 20 TEST CASES PASSED SUCCESSFULLY!");
