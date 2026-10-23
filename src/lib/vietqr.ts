export const BANK_CONFIG = {
    bankId: "TCB", // Techcombank
    bankBin: "970407",
    bankName: "Techcombank",
    accountNumber: "8799999990",
    accountName: "TRAN ANH HUAN",
    hotline: "0855550813",
    legalFeeNote:
        "Mức phí trên là số tiền thực nhận của gói cước. Mọi khoản phí phát sinh từ ngân hàng hoặc cổng thanh toán (nếu có) do chủ hồ chịu trách nhiệm thanh toán.",
} as const;

export const TRIAL_DAYS = 30;
export const YEARLY_MONTHS_CHARGED = 10;
export const YEARLY_DURATION_DAYS = 365;

export const PLAN_PRICING = {
    TRIAL: {
        code: "TRIAL",
        name: "Dùng thử 30 ngày",
        priceVnd: 0,
        durationDays: TRIAL_DAYS,
        maxSpots: null,
        maxStaff: null,
        description: "Full chức năng (giống Gói Vàng), 30 ngày dùng thử cho tài khoản mới.",
    },
    SILVER: {
        code: "SILVER",
        name: "Gói Bạc (Silver)",
        priceVnd: 129000,
        durationDays: 30,
        maxSpots: 30,
        maxStaff: 2,
        description: "129.000đ/tháng: tối đa 30 ô câu, chủ hồ và 2 tài khoản nhân sự.",
    },
    GOLD: {
        code: "GOLD",
        name: "Gói Vàng (Gold)",
        priceVnd: 199000,
        durationDays: 30,
        maxSpots: null,
        maxStaff: null,
        description: "199.000đ/tháng: không giới hạn ô câu và nhân sự.",
    },
} as const;

export type PlanTierType = keyof typeof PLAN_PRICING;
export type BillingCycle = "MONTHLY" | "YEARLY";

export function planCharge(plan: "SILVER" | "GOLD", cycle: BillingCycle = "MONTHLY"): {
    amountVnd: number;
    durationDays: number;
} {
    const monthly = PLAN_PRICING[plan].priceVnd;
    if (cycle === "YEARLY") {
        return {
            amountVnd: monthly * YEARLY_MONTHS_CHARGED,
            durationDays: YEARLY_DURATION_DAYS,
        };
    }
    return {
        amountVnd: monthly,
        durationDays: PLAN_PRICING[plan].durationDays,
    };
}

export const VIETQR_BANKS = [
    { code: "VCB", name: "Vietcombank" },
    { code: "TCB", name: "Techcombank" },
    { code: "MB", name: "MB Bank" },
    { code: "ACB", name: "ACB" },
    { code: "VPB", name: "VPBank" },
    { code: "BIDV", name: "BIDV" },
    { code: "ICB", name: "VietinBank" },
    { code: "STB", name: "Sacombank" },
    { code: "TPB", name: "TPBank" },
    { code: "HDB", name: "HDBank" },
    { code: "MSB", name: "MSB" },
    { code: "OCB", name: "OCB" },
    { code: "SHB", name: "SHB" },
    { code: "EIB", name: "Eximbank" },
    { code: "VIB", name: "VIB" },
    { code: "VBA", name: "Agribank" },
] as const;

export function normalizeAccountName(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^A-Za-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

export function bankNameForCode(code: string | null | undefined): string | null {
    if (!code) return null;
    return VIETQR_BANKS.find((bank) => bank.code === code)?.name ?? code;
}

/** Customer payment QR. Never falls back to the platform subscription account. */
export function generatePondVietQrUrl(params: {
    amount: number;
    orderCode: string;
    bankCode?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
}): {
    qrUrl: string | null;
    memo: string;
    missingAccount: boolean;
    accountNumber: string | null;
    accountName: string | null;
    bankName: string | null;
} {
    const memo = `VECAU ${params.orderCode.toUpperCase()}`;
    const bankCode = params.bankCode?.trim() || "";
    const accountNumber = params.accountNumber?.replace(/\s/g, "") || "";
    const accountName = params.accountName?.trim() || "";
    if (!bankCode || !accountNumber || !accountName) {
        return {
            qrUrl: null,
            memo,
            missingAccount: true,
            accountNumber: accountNumber || null,
            accountName: accountName || null,
            bankName: bankNameForCode(bankCode),
        };
    }
    const printableName = normalizeAccountName(accountName);
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${params.amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(printableName)}`;
    return {
        qrUrl,
        memo,
        missingAccount: false,
        accountNumber,
        accountName: printableName,
        bankName: bankNameForCode(bankCode),
    };
}

/**
 * Generate VietQR dynamic link with locked amount and transfer memo
 */
export function generateVietQrUrl(params: {
    amount: number;
    orderCode: string;
}): {
    qrUrl: string;
    memo: string;
    amount: number;
    accountNumber: string;
    accountName: string;
    bankName: string;
} {
    const memo = `HOCAU ${params.orderCode.toUpperCase()}`;
    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNumber}-compact2.png?amount=${params.amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;

    return {
        qrUrl,
        memo,
        amount: params.amount,
        accountNumber: BANK_CONFIG.accountNumber,
        accountName: BANK_CONFIG.accountName,
        bankName: BANK_CONFIG.bankName,
    };
}
