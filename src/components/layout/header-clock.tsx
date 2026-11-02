"use client";

import React, { memo, useEffect, useState } from "react";
import { sessionTicker } from "@/lib/ticker/session-ticker";

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
});

interface HeaderClockProps {
    theme?: "light" | "dark";
}

/**
 * HeaderClock: Đồng hồ thời gian thực độc lập tại thanh tiêu đề ứng dụng.
 * - Hiển thị: HH:mm:ss · DD/MM/YYYY kèm nhãn "Giờ Việt Nam" (GMT+7).
 * - Kết nối trực tiếp với centralized sessionTicker (đồng bộ server offset từ /api/ping).
 * - Tự động hiệu chỉnh khi thiết bị ngủ/chạy ngầm mở lại.
 * - Khoanh vùng render: chỉ HeaderClock re-render mỗi giây, không gây lag toàn bộ trang.
 */
export const HeaderClock = memo(function HeaderClock({ theme = "dark" }: HeaderClockProps) {
    const [nowMs, setNowMs] = useState<number>(() => sessionTicker.getNowMs());

    useEffect(() => {
        const update = () => {
            setNowMs(sessionTicker.getNowMs());
        };
        update();
        return sessionTicker.subscribe(update);
    }, []);

    const dateObj = new Date(nowMs);
    const timeStr = timeFormatter.format(dateObj);
    const dateStr = dateFormatter.format(dateObj);

    const isDark = theme === "dark";

    return (
        <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left"
            title="Thời gian thực máy chủ (GMT+7)"
        >
            <span
                className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums transition-colors ${
                    isDark
                        ? "text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 shadow-xs shadow-emerald-950/50"
                        : "text-[#16A34A] bg-[#DCFCE7]/70 border border-[#BBF7D0] shadow-3xs"
                }`}
            >
                <svg className={`h-3 w-3 ${isDark ? "text-emerald-400" : "text-[#16A34A]"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {timeStr}
            </span>
            <span
                className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md tabular-nums transition-colors ${
                    isDark
                        ? "text-emerald-200/80 bg-emerald-900/40 border border-emerald-700/30"
                        : "text-slate-600 bg-slate-100/80 border border-slate-200 shadow-3xs font-medium"
                }`}
            >
                <svg className={`h-3 w-3 ${isDark ? "text-emerald-400/80" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                {dateStr}
            </span>
        </div>
    );
});
