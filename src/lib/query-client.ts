"use client";

import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

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
 * Bộ lưu trữ Persister vào LocalStorage (hỗ trợ hiển thị 0ms & Offline Mode tại hồ câu)
 */
export function createLocalStoragePersister() {
    if (typeof window === "undefined") return undefined;

    return createSyncStoragePersister({
        storage: window.localStorage,
        key: "QLHC_POS_CACHE_V1",
        throttleTime: 1000,
    });
}
