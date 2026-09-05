"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface NetworkStatus {
    /** Thiết bị có kết nối mạng và ping server thành công không */
    isOnline: boolean;
    /** Đang trong quá trình thử ping kiểm tra lại server khi mạng vừa bật lại */
    isReconnecting: boolean;
    /** Độ lệch thời gian giữa Client và Server (ms): serverNow - clientNow */
    serverOffsetMs: number;
    /** Hàm chủ động kiểm tra lại kết nối ngay lập tức */
    checkConnectivity: () => Promise<boolean>;
}

// Global cache để dùng chung giữa các components không bị ping nhiều lần cùng lúc
let cachedIsOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
let cachedOffsetMs: number = 0;
const listeners = new Set<(status: { isOnline: boolean; isReconnecting: boolean; serverOffsetMs: number }) => void>();

function notifyAll(status: { isOnline: boolean; isReconnecting: boolean; serverOffsetMs: number }) {
    cachedIsOnline = status.isOnline;
    cachedOffsetMs = status.serverOffsetMs;
    listeners.forEach((fn) => fn(status));
}

let isPingingGlobal = false;

async function pingServer(): Promise<{ success: boolean; offsetMs: number }> {
    if (typeof window === "undefined") return { success: true, offsetMs: 0 };
    if (!navigator.onLine) {
        return { success: false, offsetMs: cachedOffsetMs };
    }

    try {
        const clientSentAt = Date.now();
        // Dùng AbortController để timeout 3.5s tránh treo khi mạng chập chờn
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);

        const res = await fetch("/api/ping", {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
            return { success: false, offsetMs: cachedOffsetMs };
        }

        const data = (await res.json().catch(() => ({}))) as { timestamp?: number };
        const clientReceivedAt = Date.now();
        const roundTrip = clientReceivedAt - clientSentAt;

        // Ước lượng server timestamp lúc client nhận
        if (data.timestamp) {
            const serverEstimatedNow = data.timestamp + roundTrip / 2;
            const offset = serverEstimatedNow - clientReceivedAt;
            return { success: true, offsetMs: offset };
        }

        return { success: true, offsetMs: cachedOffsetMs };
    } catch {
        return { success: false, offsetMs: cachedOffsetMs };
    }
}

export function useNetworkStatus(): NetworkStatus {
    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof navigator !== "undefined" ? navigator.onLine : true,
    );
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
    const [serverOffsetMs, setServerOffsetMs] = useState<number>(cachedOffsetMs);
    const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const performCheck = useCallback(async (): Promise<boolean> => {
        if (isPingingGlobal) return cachedIsOnline;
        isPingingGlobal = true;
        notifyAll({ isOnline: cachedIsOnline, isReconnecting: true, serverOffsetMs: cachedOffsetMs });

        const result = await pingServer();
        isPingingGlobal = false;
        notifyAll({
            isOnline: result.success,
            isReconnecting: false,
            serverOffsetMs: result.offsetMs,
        });
        return result.success;
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleStatusUpdate = (status: {
            isOnline: boolean;
            isReconnecting: boolean;
            serverOffsetMs: number;
        }) => {
            setIsOnline(status.isOnline);
            setIsReconnecting(status.isReconnecting);
            setServerOffsetMs(status.serverOffsetMs);
        };

        listeners.add(handleStatusUpdate);

        const onOffline = () => {
            notifyAll({ isOnline: false, isReconnecting: false, serverOffsetMs: cachedOffsetMs });
        };

        const onOnline = () => {
            // Khi có sự kiện online, delay 200ms rồi ping server xác thực
            if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
            pingTimeoutRef.current = setTimeout(() => {
                performCheck();
            }, 300);
        };

        const onVisibilityOrFocus = () => {
            if (document.visibilityState === "visible") {
                // Ping nhẹ đồng bộ lại nếu đã quá 2 phút hoặc vừa quay lại
                performCheck();
            }
        };

        window.addEventListener("offline", onOffline);
        window.addEventListener("online", onOnline);
        document.addEventListener("visibilitychange", onVisibilityOrFocus);
        window.addEventListener("focus", onVisibilityOrFocus);

        // Chạy lần đầu sau khi component đã mount để tránh gọi setState trực tiếp trong effect
        const initTimer = setTimeout(() => {
            performCheck();
        }, 0);

        // Định kỳ ping ngầm mỗi 45 giây để kiểm tra kết nối nếu đang mở app
        const periodicInterval = setInterval(() => {
            if (document.visibilityState === "visible") {
                performCheck();
            }
        }, 45_000);

        return () => {
            clearTimeout(initTimer);
            listeners.delete(handleStatusUpdate);
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("online", onOnline);
            document.removeEventListener("visibilitychange", onVisibilityOrFocus);
            window.removeEventListener("focus", onVisibilityOrFocus);
            clearInterval(periodicInterval);
            if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
        };
    }, [performCheck]);

    return {
        isOnline,
        isReconnecting,
        serverOffsetMs,
        checkConnectivity: performCheck,
    };
}
