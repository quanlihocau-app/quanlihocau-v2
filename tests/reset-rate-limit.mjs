/** Xóa bộ đếm rate limit trên server test. Bỏ qua nếu server không bật chế độ test. */
export async function resetServerRateLimits() {
    const base = process.env.TEST_BASE_URL || "http://localhost:3000";
    try {
        await fetch(`${base}/api/test/reset-rate-limits`, { method: "POST" });
    } catch {
        // Server chưa chạy thì bài test tự thất bại ở request nghiệp vụ.
    }
}
