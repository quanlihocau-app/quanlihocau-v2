export const IOS_NATIVE_UA_TOKEN = "QuanLiHoCauNative/ios";

export function isIosNativeUserAgent(userAgent: string | null | undefined): boolean {
    return Boolean(userAgent && userAgent.includes(IOS_NATIVE_UA_TOKEN));
}

/**
 * Mua gói phần mềm chỉ hiện trên web và Android.
 * iOS native (Capacitor hoặc user agent do app gắn) thì ẩn nút, giá và link thanh toán.
 */
export function shouldShowSaasPurchase(input: {
    userAgent?: string | null;
    capacitorPlatform?: string | null;
}): boolean {
    if (input.capacitorPlatform === "ios") return false;
    if (isIosNativeUserAgent(input.userAgent)) return false;
    return true;
}
