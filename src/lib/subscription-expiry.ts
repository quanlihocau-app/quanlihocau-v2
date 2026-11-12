/**
 * Quy tắc chuyển hạn gói. Cùng một hồ chỉ đi một bước mỗi lần:
 * TRIAL/ACTIVE quá hạn nhưng còn trong ân hạn -> GRACE_PERIOD;
 * TRIAL/ACTIVE/GRACE_PERIOD quá cả ân hạn -> SUSPENDED.
 * Hồ đã ở trạng thái đích, hồ đã xóa, hoặc hồ chưa có ngày hết hạn thì không đụng.
 * Chạy lại ngay sau đó trả về null (idempotent).
 */

export const GRACE_FROM_STATUSES = ["TRIAL", "ACTIVE"] as const;
export const SUSPEND_FROM_STATUSES = ["TRIAL", "ACTIVE", "GRACE_PERIOD"] as const;

export function subscriptionExpiryWindows(now: Date, graceMs: number): { now: Date; graceCutoff: Date } {
    return {
        now,
        graceCutoff: new Date(now.getTime() - graceMs),
    };
}

export function classifySubscriptionExpiry(input: {
    now: Date;
    graceMs: number;
    status: string;
    expiresAt: Date | null;
    deletedAt?: Date | null;
}): "GRACE_PERIOD" | "SUSPENDED" | null {
    if (input.deletedAt) return null;
    if (!input.expiresAt) return null;
    const expiry = input.expiresAt.getTime();
    if (!Number.isFinite(expiry)) return null;

    const { now, graceCutoff } = subscriptionExpiryWindows(input.now, input.graceMs);
    const nowMs = now.getTime();
    const cutoffMs = graceCutoff.getTime();

    if (expiry < cutoffMs && (SUSPEND_FROM_STATUSES as readonly string[]).includes(input.status)) {
        return "SUSPENDED";
    }
    if (
        expiry < nowMs &&
        expiry >= cutoffMs &&
        (GRACE_FROM_STATUSES as readonly string[]).includes(input.status)
    ) {
        return "GRACE_PERIOD";
    }
    return null;
}
