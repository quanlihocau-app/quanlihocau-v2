"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/lib/network/use-network-status";

interface SessionCountdownProps {
    plannedEndAt: string; // ISO string
}

function computeTimeInfo(plannedEndAtIso: string, serverOffsetMs: number = 0) {
    // Điều chỉnh thời gian hiện tại theo độ lệch đồng hồ máy chủ
    const now = Date.now() + serverOffsetMs;
    const endMs = new Date(plannedEndAtIso).getTime();
    const diffMs = endMs - now;

    if (diffMs <= 0) {
        const overMs = Math.abs(diffMs);
        const overH = Math.floor(overMs / 3_600_000);
        const overM = Math.floor((overMs % 3_600_000) / 60_000);
        const overS = Math.floor((overMs % 60_000) / 1_000);
        const label =
            overH > 0
                ? `+${String(overH).padStart(2, "0")}:${String(overM).padStart(2, "0")}:${String(overS).padStart(2, "0")}`
                : `+${String(overM).padStart(2, "0")}:${String(overS).padStart(2, "0")}`;
        return {
            label,
            isEndingSoon: true,
            isOvertime: true,
        };
    }

    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    const s = Math.floor((diffMs % 60_000) / 1_000);
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const isEndingSoon = diffMs < 15 * 60_000;

    return { label, isEndingSoon, isOvertime: false };
}

export function SessionCountdown({ plannedEndAt }: SessionCountdownProps) {
    const { serverOffsetMs } = useNetworkStatus();
    const [timeInfo, setTimeInfo] = useState(() =>
        computeTimeInfo(plannedEndAt, serverOffsetMs),
    );

    useEffect(() => {
        const updateNow = () => {
            setTimeInfo(computeTimeInfo(plannedEndAt, serverOffsetMs));
        };

        // Chạy ngay 1 lần khi plannedEndAt hoặc serverOffsetMs thay đổi
        updateNow();

        const interval = setInterval(updateNow, 1_000);

        // Chống timer drift khi màn hình tắt / sleep / chuyển tab quay lại
        const handleWake = () => {
            if (document.visibilityState === "visible") {
                updateNow();
            }
        };

        document.addEventListener("visibilitychange", handleWake);
        window.addEventListener("focus", handleWake);
        window.addEventListener("online", handleWake);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleWake);
            window.removeEventListener("focus", handleWake);
            window.removeEventListener("online", handleWake);
        };
    }, [plannedEndAt, serverOffsetMs]);

    return (
        <span
            className={`font-mono text-base font-bold tracking-tight tabular-nums ${
                timeInfo.isEndingSoon || timeInfo.isOvertime
                    ? "text-rose-600 animate-pulse"
                    : "text-emerald-700"
            }`}
        >
            {timeInfo.label}
        </span>
    );
}

