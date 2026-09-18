import test from "node:test";
import assert from "node:assert/strict";
import { isTestLake, isTestUser } from "../src/lib/test-account.ts";

test("isTestLake: Phân loại chính xác các hồ thử nghiệm / demo", () => {
    // Test cases that MUST be classified as test
    assert.equal(isTestLake("Hồ câu Test 1", "owner@gmail.com"), true);
    assert.equal(isTestLake("Hồ câu Demo Miền Bắc", "owner@gmail.com"), true);
    assert.equal(isTestLake("Hồ câu thử nghiệm", "owner@gmail.com"), true);
    assert.equal(isTestLake("Hồ câu thu nghiem", "owner@gmail.com"), true);
    assert.equal(isTestLake("Sample Fishing Pond", "owner@gmail.com"), true);
    assert.equal(isTestLake("Hồ Kim Thông", "test@quanlihocau.com"), true);
    assert.equal(isTestLake("Hồ Kim Thông", "user@example.com"), true);
    assert.equal(isTestLake("Hồ Kim Thông", "dev@quanlihocau.internal"), true);

    // Test cases that MUST be classified as real commercial lakes
    assert.equal(isTestLake("Hồ câu Kim Thông", "kimthong@gmail.com"), false);
    assert.equal(isTestLake("Hồ câu Đồng Quê", "dongque.fishing@gmail.com"), false);
    assert.equal(isTestLake("Hồ câu Cá Lớn Sài Gòn", "calon.saigon@yahoo.com"), false);
    assert.equal(isTestLake("CLB Câu cá Sông Đáy", "songday@clb.vn"), false);
});

test("isTestUser: Phân loại chính xác người dùng test / demo", () => {
    assert.equal(isTestUser("Nguyễn Văn Test", "test@gmail.com", "0912345678"), true);
    assert.equal(isTestUser("Demo User", "user@gmail.com", "0912345678"), true);
    assert.equal(isTestUser("Người dùng thật", "test@example.com", "0912345678"), true);
    assert.equal(isTestUser("Người dùng thật", "user@gmail.com", "0900000000"), true);
    assert.equal(isTestUser("Người dùng thật", "user@gmail.com", "0001234567"), true);

    // Real user
    assert.equal(isTestUser("Trần Anh Huân", "huan@kimthong.vn", "0987654321"), false);
    assert.equal(isTestUser("Nguyễn Văn A", "nva@gmail.com", "0912345678"), false);
});
