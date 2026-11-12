/**
 * Điều khiển rate limit khi chạy test. Tắt cứng nếu NODE_ENV=production,
 * kể cả khi biến môi trường bị đặt nhầm trên máy thật.
 */
export function isTestRateLimitControlEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    if (env.NODE_ENV === "production") return false;
    return env.ALLOW_TEST_RATE_LIMIT_RESET === "1";
}
