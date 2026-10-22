import crypto from "node:crypto";

/**
 * So khớp chuỗi bí mật theo thời gian cố định.
 * Độ dài khác nhau luôn là không khớp, và không ném lỗi.
 */
export function timingSafeEqualString(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Chỉ đánh dấu PAID khi có số tiền dương và lớn hơn hoặc bằng số tiền đơn.
 * Thiếu số tiền, 0, NaN hoặc thiếu đều bị từ chối.
 */
export function shouldMarkOrderPaid(received: unknown, expected: number): boolean {
    const amount = typeof received === "number" ? received : Number(received);
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (!Number.isFinite(expected) || expected <= 0) return false;
    return amount >= expected;
}

export function verifyWebhookSecret(request: Request, rawBody: string, secret: string | undefined): boolean {
    if (!secret) return false;

    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
    if (bearer && timingSafeEqualString(bearer, secret)) {
        return true;
    }

    const apiKey = request.headers.get("x-api-key")?.trim() ?? "";
    if (apiKey && timingSafeEqualString(apiKey, secret)) {
        return true;
    }

    const signature = request.headers.get("x-signature") || request.headers.get("x-hub-signature");
    if (signature) {
        const expectedSig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        const presented = signature.replace(/^sha256=/i, "").trim();
        if (timingSafeEqualString(presented, expectedSig)) {
            return true;
        }
    }

    return false;
}
