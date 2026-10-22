import { headers } from "next/headers";

import { consumeRateLimit, peekRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";

export const AUTH_FAILURE_LIMIT = 5;
export const AUTH_FAILURE_WINDOW_SECONDS = 15 * 60;

export type AuthRateNamespace = "auth-login" | "auth-register";

export async function getRequestIp(): Promise<string> {
    try {
        const headerStore = await headers();
        const forwarded = headerStore.get("x-forwarded-for");
        const ip = (forwarded?.split(",")[0] || headerStore.get("x-real-ip") || "unknown").trim();
        return ip.slice(0, 64) || "unknown";
    } catch {
        return "unknown";
    }
}

export function authRateIdentifier(account: string, ip: string): string {
    const normalized = account.trim().toLowerCase().slice(0, 200) || "unknown";
    return `${normalized}|${ip}`;
}

export function authLockMessage(retryAfterSeconds: number): string {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return `Bạn đã thử quá ${AUTH_FAILURE_LIMIT} lần. Vui lòng đợi khoảng ${minutes} phút rồi thử lại.`;
}

export async function authFailureState(namespace: AuthRateNamespace, account: string): Promise<{
    blocked: boolean;
    retryAfterSeconds: number;
    identifier: string;
}> {
    const ip = await getRequestIp();
    const identifier = authRateIdentifier(account, ip);
    const peek = await peekRateLimit({ namespace, identifier });
    return {
        blocked: peek.currentCount >= AUTH_FAILURE_LIMIT,
        retryAfterSeconds: peek.retryAfterSeconds,
        identifier,
    };
}

export async function recordAuthFailure(namespace: AuthRateNamespace, identifier: string): Promise<void> {
    await consumeRateLimit({
        namespace,
        identifier,
        maxRequests: AUTH_FAILURE_LIMIT,
        windowSeconds: AUTH_FAILURE_WINDOW_SECONDS,
    });
}

export function rateLimitUnavailableMessage(): string {
    return "Hệ thống đang bận kiểm tra lượt đăng nhập. Vui lòng thử lại sau ít phút.";
}

export function isRateLimitUnavailable(error: unknown): boolean {
    return error instanceof RateLimitUnavailableError;
}
