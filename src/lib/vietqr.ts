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
