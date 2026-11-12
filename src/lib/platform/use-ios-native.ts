"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

import { shouldShowSaasPurchase } from "@/lib/platform/commerce-visibility";

/** Gắn cờ iOS sớm để CSS ẩn nút mua gói, kể cả khi user agent chưa kịp đọc. */
export function useMarkIosNativePlatform(): void {
    useEffect(() => {
        try {
            if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
                document.documentElement.setAttribute("data-native-platform", "ios");
            }
        } catch {
            // Trình duyệt không có Capacitor vẫn dùng web bình thường.
        }
    }, []);
}

export function saasPurchaseVisibleNow(): boolean {
    if (typeof navigator === "undefined") return true;
    let platform: string | null = null;
    try {
        platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : null;
    } catch {
        platform = null;
    }
    return shouldShowSaasPurchase({
        userAgent: navigator.userAgent,
        capacitorPlatform: platform,
    });
}
