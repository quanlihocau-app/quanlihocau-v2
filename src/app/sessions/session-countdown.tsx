"use client";

import { useEffect, useState } from "react";

interface SessionCountdownProps {
    plannedEndAt: string; // ISO string
}

function computeTimeInfo(plannedEndAtIso: string) {
    const now = Date.now();
    const endMs = new Date(plannedEndAtIso).getTime();
    const diffMs = endMs - now;

    if (diffMs <= 0) {
        const overMs = Math.abs(diffMs);
        const overH = Math.floor(overMs / 3_600_000);
        const overM = Math.floor((overMs % 3_600_000) / 60_000);
        return {
            label: `Quá ${overH > 0 ? `${overH}h` : ""}${String(overM).padStart(2, "0")}p`,
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
    const [timeInfo, setTimeInfo] = useState(() =>
        computeTimeInfo(plannedEndAt),
    );

    useEffect(() => {
        // Update every second
        const interval = setInterval(() => {
            setTimeInfo(computeTimeInfo(plannedEndAt));
        }, 1_000);
        return () => clearInterval(interval);
    }, [plannedEndAt]);

    return (
        <div
            className={`rounded-lg px-2.5 py-1 text-right ${
                timeInfo.isOvertime
                    ? "bg-red-50 border border-red-200"
                    : timeInfo.isEndingSoon
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-emerald-50 border border-emerald-200"
            }`}
        >
            <span
                className={`text-sm font-bold tabular-nums ${
                    timeInfo.isOvertime
                        ? "text-red-700"
                        : timeInfo.isEndingSoon
                          ? "text-amber-700"
                          : "text-emerald-700"
                }`}
            >
                {timeInfo.label}
            </span>
            <p
                className={`text-[10px] font-medium ${
                    timeInfo.isOvertime
                        ? "text-red-500"
                        : timeInfo.isEndingSoon
                          ? "text-amber-500"
                          : "text-emerald-500"
                }`}
            >
                {timeInfo.isOvertime ? "Quá giờ" : "Còn lại"}
            </p>
        </div>
    );
}
