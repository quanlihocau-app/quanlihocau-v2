export const SUBSCRIPTION_GRACE_DAYS = 3;
export const SUBSCRIPTION_GRACE_MS = SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000;

export type SubscriptionAccess = "active" | "grace" | "locked";

/**
 * active: còn hạn.
 * grace: đã quá hạn nhưng còn trong ân hạn (hồ vẫn ghi được).
 * locked: quá ân hạn, hoặc quản trị đặt SUSPENDED — chỉ xem và trang gia hạn.
 * Hồ chưa có ngày hết hạn và không bị SUSPENDED giữ nguyên quyền, để không khóa dữ liệu cũ.
 */
export function resolveSubscriptionAccess(input: {
    status?: string | null;
    expiresAt?: Date | string | null;
    now?: Date;
}): SubscriptionAccess {
    if (input.status === "SUSPENDED") {
        return "locked";
    }

    if (!input.expiresAt) {
        return "active";
    }

    const expiresMs = new Date(input.expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) {
        return "active";
    }

    const nowMs = (input.now ?? new Date()).getTime();
    if (nowMs <= expiresMs) {
        return "active";
    }
    if (nowMs <= expiresMs + SUBSCRIPTION_GRACE_MS) {
        return "grace";
    }
    return "locked";
}

export function graceDaysRemaining(expiresAt: Date | string | null | undefined, now = new Date()): number {
    if (!expiresAt) return 0;
    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return 0;
    const remainingMs = expiresMs + SUBSCRIPTION_GRACE_MS - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}
