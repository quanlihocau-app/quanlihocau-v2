"use client";

import { QueryClient } from "@tanstack/react-query";

/**
 * Cấu hình QueryClient chuẩn hiệu năng cao cho Mobile POS (Capacitor / Next.js)
 * - staleTime: 5 phút (Dữ liệu danh mục ô câu, gói câu không bị fetch lại liên tục khi chuyển trang)
 * - gcTime: 24 giờ (Lưu trong RAM / Cache bộ nhớ)
 * - refetchOnWindowFocus: false (Tránh giật màn hình khi nhân viên mở lại ứng dụng)
 * - refetchOnReconnect: true (Tự động đồng bộ lại khi kết nối mạng được khôi phục)
 */
export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 phút
                gcTime: 1000 * 60 * 60 * 24, // 24 giờ
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
                retry: 1,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
    if (typeof window === "undefined") {
        // Server: Luôn tạo QueryClient mới
        return makeQueryClient();
    }
    // Browser / Capacitor: Dùng singleton client
    if (!browserQueryClient) {
        browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
}

/**
 * Discard tenant data when the authenticated account or support lake changes.
 */
export function clearCatalogCache() {
    browserQueryClient?.clear();
    // Remove the legacy cache, which was shared by all accounts and lakes.
    try {
        window.localStorage.removeItem("QLHC_POS_CACHE_V1");
        window.localStorage.removeItem("qlhc_ticket_form_draft");
    } catch {
        // Storage may be unavailable in private browsing or a restricted WebView.
    }
}
