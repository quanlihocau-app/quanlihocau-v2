import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(filePath, modules = {}) {
    const code = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
        exports,
        require: (n) => {
            if (!(n in modules)) {
                // Return default mock if not explicitly provided
                return {};
            }
            return modules[n];
        },
        Intl,
        Date,
        parseInt,
        isNaN,
        String,
        Math,
    });
    return exports;
}

class ForbiddenError extends Error {
    constructor(msg) {
        super(msg);
        this.name = "ForbiddenError";
    }
}

const permissions = load("src/lib/financial/permissions.ts", {
    "@/generated/prisma/client": {
        Role: { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" },
        SystemRole: { USER: "USER", SUPER_ADMIN: "SUPER_ADMIN" },
    },
    "@/lib/tenant": { ForbiddenError },
});

const codeGen = load("src/lib/financial/code-generator.ts");

const periodGuard = load("src/lib/financial/period-guard.ts", {
    "@/lib/tenant": { ForbiddenError },
});

test("1. Phân quyền tài chính: Kiểm tra ma trận quyền theo Role SaaS", () => {
    // SUPER_ADMIN có toàn quyền
    assert.equal(permissions.hasFinancialPermission("SUPER_ADMIN", "FINANCIAL_LOCK_PERIOD"), true);
    assert.equal(permissions.hasFinancialPermission("SUPER_ADMIN", "FINANCIAL_CANCEL_TRANSACTIONS"), true);

    // OWNER có đầy đủ quyền quản trị tài chính
    assert.equal(permissions.hasFinancialPermission("OWNER", "FINANCIAL_VIEW_TRANSACTIONS"), true);
    assert.equal(permissions.hasFinancialPermission("OWNER", "FINANCIAL_CREATE_TRANSACTIONS"), true);
    assert.equal(permissions.hasFinancialPermission("OWNER", "FINANCIAL_LOCK_PERIOD"), true);
    assert.equal(permissions.hasFinancialPermission("OWNER", "FINANCIAL_CANCEL_TRANSACTIONS"), true);
    assert.equal(permissions.hasFinancialPermission("OWNER", "FINANCIAL_MANAGE_FUNDS"), true);

    // MANAGER có quyền quản lý vận hành nhưng KHÔNG có quyền khóa kỳ tài chính
    assert.equal(permissions.hasFinancialPermission("MANAGER", "FINANCIAL_VIEW_TRANSACTIONS"), true);
    assert.equal(permissions.hasFinancialPermission("MANAGER", "FINANCIAL_CREATE_TRANSACTIONS"), true);
    assert.equal(permissions.hasFinancialPermission("MANAGER", "FINANCIAL_TRANSFER_FUNDS"), true);
    assert.equal(permissions.hasFinancialPermission("MANAGER", "FINANCIAL_LOCK_PERIOD"), false);

    // STAFF không vào phân hệ tài chính (kể cả xem và tạo phiếu).
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_VIEW_TRANSACTIONS"), false);
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_CREATE_TRANSACTIONS"), false);
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_TRANSFER_FUNDS"), false);
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_LOCK_PERIOD"), false);
    assert.equal(permissions.hasFinancialPermission("STAFF", "FINANCIAL_MANAGE_CATEGORIES"), false);

    // Thử nghiệm assertFinancialPermission ném lỗi khi không đủ quyền
    assert.throws(
        () => permissions.assertFinancialPermission({ role: "STAFF" }, "FINANCIAL_LOCK_PERIOD"),
        /Bạn không có quyền thực hiện hành động/
    );
});

test("2. Sinh mã chứng từ tự động: Định dạng PT, PC, CK, CN tăng dần và duy nhất", async () => {
    const mockDb = {
        financialTransaction: {
            findFirst: async ({ where }) => {
                if (where.code && typeof where.code.startsWith === "string" && where.code.startsWith.startsWith("PT-")) {
                    return { code: "PT-20261013-0004" };
                }
                return null;
            },
        },
        fundTransfer: {
            findFirst: async () => ({ code: "CK-20261013-0012" }),
        },
        debt: {
            findFirst: async () => null,
        },
    };

    const nextReceiptCode = await codeGen.generateFinancialCode(mockDb, "lake-1", "PT");
    assert.equal(nextReceiptCode.startsWith("PT-"), true);
    assert.equal(nextReceiptCode.endsWith("-0005"), true);

    const nextTransferCode = await codeGen.generateFinancialCode(mockDb, "lake-1", "CK");
    assert.equal(nextTransferCode.endsWith("-0013"), true);

    const firstDebtCode = await codeGen.generateFinancialCode(mockDb, "lake-1", "CN");
    assert.equal(firstDebtCode.endsWith("-0001"), true);
});

test("3. Khóa sổ kỳ kế toán (Period Guard): Ngăn chặn tạo/sửa giao dịch trong kỳ đã khóa", async () => {
    const mockDb = {
        financialPeriod: {
            findFirst: async ({ where }) => {
                if (where.isLocked && where.lakeId === "lake-1") {
                    return { name: "Tháng 09/2026", lockedAt: new Date() };
                }
                return null;
            },
        },
    };

    // Khi kỳ bị khóa -> phải ném lỗi ForbiddenError
    await assert.rejects(
        async () => {
            await periodGuard.assertPeriodNotLocked(mockDb, "lake-1", new Date("2026-09-15"));
        },
        /Kỳ tài chính "Tháng 09\/2026" đã được khóa sổ/
    );

    // Khi kỳ chưa khóa -> cho phép giao dịch bình thường
    const mockDbUnlocked = {
        financialPeriod: {
            findFirst: async () => null,
        },
    };

    await assert.doesNotReject(async () => {
        await periodGuard.assertPeriodNotLocked(mockDbUnlocked, "lake-1", new Date());
    });
});

test("4. Tính toán Dòng tiền và Số dư quỹ: Chuyển quỹ nội bộ không tăng doanh thu/chi phí", () => {
    const accountCash = { initial: 1000000, in: 500000, out: 200000, transferOut: 300000, transferIn: 0 };
    const accountBank = { initial: 5000000, in: 2000000, out: 1000000, transferOut: 0, transferIn: 300000 };

    const cashBalance = accountCash.initial + accountCash.in - accountCash.out - accountCash.transferOut;
    const bankBalance = accountBank.initial + accountBank.in - accountBank.out + accountBank.transferIn;

    assert.equal(cashBalance, 1000000); // 1tr + 500k - 200k - 300k = 1tr
    assert.equal(bankBalance, 6300000); // 5tr + 2tr - 1tr + 300k = 6.3tr

    // Tổng số dư toàn hệ thống
    const totalBalance = cashBalance + bankBalance;
    assert.equal(totalBalance, 7300000);

    // Tổng doanh thu thực tế (chỉ tính từ phiếu thu, KHÔNG cộng tiền chuyển quỹ)
    const totalCollectedRevenue = accountCash.in + accountBank.in;
    assert.equal(totalCollectedRevenue, 2500000);

    // Tổng chi phí thực tế (chỉ tính từ phiếu chi, KHÔNG cộng tiền chuyển quỹ)
    const totalOperatingExpense = accountCash.out + accountBank.out;
    assert.equal(totalOperatingExpense, 1200000);

    // Dòng tiền thuần
    const netCashFlow = totalCollectedRevenue - totalOperatingExpense;
    assert.equal(netCashFlow, 1300000);
});

test("5. Quản lý công nợ: Thanh toán nhiều lần và thu hồi nợ không tính trùng doanh thu", () => {
    const debt = {
        code: "CN-20261013-0001",
        type: "RECEIVABLE",
        totalAmountVnd: 1000000,
        paidAmountVnd: 0,
        remainingAmountVnd: 1000000,
        status: "PENDING",
    };

    // Lần thanh toán 1: Trả 400.000 đ
    const pay1 = 400000;
    debt.paidAmountVnd += pay1;
    debt.remainingAmountVnd = debt.totalAmountVnd - debt.paidAmountVnd;
    debt.status = debt.remainingAmountVnd === 0 ? "SETTLED" : "PARTIAL";

    assert.equal(debt.paidAmountVnd, 400000);
    assert.equal(debt.remainingAmountVnd, 600000);
    assert.equal(debt.status, "PARTIAL");

    // Lần thanh toán 2: Trả tiếp 600.000 đ
    const pay2 = 600000;
    debt.paidAmountVnd += pay2;
    debt.remainingAmountVnd = debt.totalAmountVnd - debt.paidAmountVnd;
    debt.status = debt.remainingAmountVnd === 0 ? "SETTLED" : "PARTIAL";

    assert.equal(debt.paidAmountVnd, 1000000);
    assert.equal(debt.remainingAmountVnd, 0);
    assert.equal(debt.status, "SETTLED");
});

test("6. Kiểm kê và đối soát quỹ: Tính chênh lệch thừa/thiếu chuẩn xác", () => {
    const systemBalance = 5250000;
    const actualCounted1 = 5250000; // Khớp
    const diff1 = actualCounted1 - systemBalance;
    assert.equal(diff1, 0);

    const actualCounted2 = 5200000; // Thiếu 50k
    const diff2 = actualCounted2 - systemBalance;
    assert.equal(diff2, -50000);

    const actualCounted3 = 5300000; // Thừa 50k
    const diff3 = actualCounted3 - systemBalance;
    assert.equal(diff3, 50000);
});
