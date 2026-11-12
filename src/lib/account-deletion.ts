export const ACCOUNT_DELETION_PHRASE = "XOA TAI KHOAN";

export function deletionDecision(input: {
    phrase: string;
    hasPassword: boolean;
    passwordOk: boolean;
}): { ok: true } | { ok: false; error: string } {
    if (input.phrase !== ACCOUNT_DELETION_PHRASE) {
        return { ok: false, error: "Gõ đúng XOA TAI KHOAN để xác nhận." };
    }
    if (input.hasPassword && !input.passwordOk) {
        return { ok: false, error: "Mật khẩu không đúng." };
    }
    return { ok: true };
}

export function anonymizedUserFields(userId: string, now: Date) {
    return {
        email: `deleted+${userId}@da-xoa.quanlihocau.invalid`,
        name: "Tài khoản đã xóa",
        phone: null,
        phoneVerified: false,
        phoneVerifiedAt: null,
        passwordHash: null,
        isLocked: true,
        lockedAt: now,
        lockedReason: "account_deleted",
        appleSub: null,
    };
}
