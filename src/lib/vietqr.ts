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

export const PLAN_PRICING = {
    TRIAL: {
        code: "TRIAL",
        name: "Dùng thử 30 ngày",
        priceVnd: 0,
        durationDays: 30,
        maxSpots: null,
        maxStaff: null,
        description: "Full chức năng (giống Gói Vàng), 30 ngày dùng thử.",
    },
    SILVER: {
        code: "SILVER",
        name: "Gói Bạc (Silver)",
        priceVnd: 99000,
        durationDays: 30,
        maxSpots: 30,
        maxStaff: 1,
        description: "Tối đa 30 ô câu, tối đa 1 nhân viên.",
    },
    GOLD: {
        code: "GOLD",
        name: "Gói Vàng (Gold)",
        priceVnd: 179000,
        durationDays: 30,
        maxSpots: null,
        maxStaff: null,
        description: "Không giới hạn ô câu, không giới hạn nhân viên, full tính năng.",
    },
} as const;

export type PlanTierType = keyof typeof PLAN_PRICING;

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
