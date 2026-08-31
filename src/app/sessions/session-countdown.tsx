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
            label: `+${overH > 0 ? `${overH}h ` : ""}${String(overM).padStart(2, "0")}p`,
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
        const interval = setInterval(() => {
            setTimeInfo(computeTimeInfo(plannedEndAt));
        }, 1_000);
        return () => clearInterval(interval);
    }, [plannedEndAt]);

    const styleConfig = timeInfo.isOvertime
        ? {
              container: "bg-red-50 border-red-200 text-red-950",
              number: "text-red-700",
              caption: "text-red-600 font-bold",
              text: "Quá giờ",
          }
        : timeInfo.isEndingSoon
          ? {
                container: "bg-orange-50 border-orange-200 text-orange-950",
                number: "text-orange-700",
                caption: "text-orange-600 font-bold",
                text: "Sắp hết giờ",
            }
          : {
                container: "bg-teal-50 border-teal-200 text-teal-950",
                number: "text-teal-800",
                caption: "text-teal-600 font-semibold",
                text: "Thời gian còn",
            };

    return (
        <div
            className={`rounded-xl border px-3 py-1.5 text-right shadow-2xs ${styleConfig.container}`}
        >
            <div className={`text-base font-extrabold tabular-nums tracking-tight ${styleConfig.number}`}>
                {timeInfo.label}
            </div>
            <p className={`text-[10px] uppercase tracking-wider ${styleConfig.caption}`}>
                {styleConfig.text}
            </p>
        </div>
    );
}
