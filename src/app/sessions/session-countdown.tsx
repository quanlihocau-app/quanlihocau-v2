"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
    sessionTicker,
    computeTimeInfoFromMs,
    computeTimeInfo,
    type TimeInfo,
} from "@/lib/ticker/session-ticker";

export interface SessionCountdownProps {
    plannedEndAt: string; // ISO string
}

export { computeTimeInfoFromMs, computeTimeInfo, type TimeInfo };

export const SessionCountdown = memo(function SessionCountdown({ plannedEndAt }: SessionCountdownProps) {
    const plannedEndMs = useMemo(() => new Date(plannedEndAt).getTime(), [plannedEndAt]);

    const [timeInfo, setTimeInfo] = useState(() =>
        computeTimeInfoFromMs(plannedEndMs, sessionTicker.getNowMs()),
    );
    const timeInfoRef = useRef(timeInfo);
    timeInfoRef.current = timeInfo;

    useEffect(() => {
        const updateNow = () => {
            const nextInfo = computeTimeInfoFromMs(plannedEndMs, sessionTicker.getNowMs());
            const prev = timeInfoRef.current;
            if (
                prev.label !== nextInfo.label ||
                prev.isEndingSoon !== nextInfo.isEndingSoon ||
                prev.isOvertime !== nextInfo.isOvertime
            ) {
                setTimeInfo(nextInfo);
            }
        };

        // Run immediately to sync on plannedEndMs change
        updateNow();

        // Subscribe to centralized ticker (auto-cleans up on unmount)
        return sessionTicker.subscribe(updateNow);
    }, [plannedEndMs]);

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
});
