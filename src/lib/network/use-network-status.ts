"use client";

import { useEffect, useState } from "react";
import { sessionTicker } from "@/lib/ticker/session-ticker";

interface Status {
    isOnline: boolean;
    isReconnecting: boolean;
    serverOffsetMs: number;
}
export interface NetworkStatus extends Status {
    checkConnectivity: () => Promise<boolean>;
}
let status: Status = { isOnline: true, isReconnecting: false, serverOffsetMs: 0 };
const listeners = new Set<(value: Status) => void>();
let pendingCheck: Promise<boolean> | null = null;
let lastCheckedAt = 0;

export function getCachedServerOffsetMs(): number {
    return status.serverOffsetMs;
}
function notifyAll(next: Status) {
    const offsetChanged = next.serverOffsetMs !== status.serverOffsetMs;
    status = next;
    if (offsetChanged) sessionTicker.setServerOffsetMs(next.serverOffsetMs);
    listeners.forEach((listener) => listener(next));
}
async function pingServer(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
        const sentAt = Date.now();
        const response = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Ping failed");
        const data = await response.json() as { timestamp?: number };
        const receivedAt = Date.now();
        const online = navigator.onLine;
        const offset = typeof data.timestamp === "number" && Number.isFinite(data.timestamp)
            ? data.timestamp - (sentAt + receivedAt) / 2
            : status.serverOffsetMs;
        notifyAll({ isOnline: online, isReconnecting: false, serverOffsetMs: offset });
        return online;
    } catch {
        notifyAll({ ...status, isOnline: false, isReconnecting: false });
        return false;
    } finally {
        clearTimeout(timer);
        lastCheckedAt = Date.now();
    }
}
// All callers await the same result, rather than reading stale cached status.
export function checkConnectivity(): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(true);
    if (pendingCheck) return pendingCheck;
    if (!navigator.onLine) {
        notifyAll({ ...status, isOnline: false, isReconnecting: false });
        return Promise.resolve(false);
    }
    notifyAll({ ...status, isReconnecting: true });
    pendingCheck = pingServer().finally(() => { pendingCheck = null; });
    return pendingCheck;
}
function startMonitoring() {
    const onOffline = () => notifyAll({ ...status, isOnline: false, isReconnecting: false });
    const onOnline = () => { void checkConnectivity(); };
    const onWake = () => {
        if (document.visibilityState === "visible" && Date.now() - lastCheckedAt > 2000) {
            void checkConnectivity();
        }
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    const initialTimer = setTimeout(onWake, 0);
    const interval = setInterval(onWake, 45_000);
    return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
        window.removeEventListener("focus", onWake);
        document.removeEventListener("visibilitychange", onWake);
    };
}
let stopMonitoring: (() => void) | undefined;
export function useNetworkStatus(): NetworkStatus {
    // Deterministic initial state avoids server/client hydration mismatch.
    const [snapshot, setSnapshot] = useState<Status>({ isOnline: true, isReconnecting: false, serverOffsetMs: 0 });
    useEffect(() => {
        listeners.add(setSnapshot);
        const timer = setTimeout(() => setSnapshot(status), 0);
        if (listeners.size === 1) stopMonitoring = startMonitoring();
        return () => {
            clearTimeout(timer);
            listeners.delete(setSnapshot);
            if (!listeners.size) {
                stopMonitoring?.();
                stopMonitoring = undefined;
            }
        };
    }, []);
    return { ...snapshot, checkConnectivity };
}
