/**
 * Normalizes a Vietnamese phone number to E.164 format (+84xxxxxxxxx).
 * Returns null if the input is empty or null.
 * Throws an Error if the phone number is invalid.
 */
export function normalizeVietnamesePhone(
    phone?: string | null,
): string | null {
    if (!phone || typeof phone !== "string") {
        return null;
    }

    const trimmed = phone.trim();
    if (!trimmed) {
        return null;
    }

    // Remove whitespace, dots, hyphens, parentheses
    const cleaned = trimmed.replace(/[\s.\-()]/g, "");

    let standardDigits = cleaned;

    if (standardDigits.startsWith("+84")) {
        standardDigits = "84" + standardDigits.slice(3);
    } else if (standardDigits.startsWith("0")) {
        standardDigits = "84" + standardDigits.slice(1);
    } else if (!standardDigits.startsWith("84")) {
        throw new Error(
            "Số điện thoại không hợp lệ. Vui lòng nhập số bắt đầu bằng 0, 84 hoặc +84.",
        );
    }

    // Standard Vietnamese mobile number format: 84 followed by 9 digits (total 11 chars)
    const vnMobileRegex = /^84[35789]\d{8}$/;
    if (!vnMobileRegex.test(standardDigits)) {
        throw new Error(
            "Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số, VD: 0901234567).",
        );
    }

    return `+${standardDigits}`;
}
