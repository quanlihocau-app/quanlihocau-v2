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

/**
 * HeaderClock: Đồng hồ thời gian thực độc lập tại thanh tiêu đề ứng dụng.
 * - Hiển thị: HH:mm:ss · DD/MM/YYYY kèm nhãn "Giờ Việt Nam" (GMT+7).
 * - Kết nối trực tiếp với centralized sessionTicker (đồng bộ server offset từ /api/ping).
 * - Tự động hiệu chỉnh khi thiết bị ngủ/chạy ngầm mở lại.
 * - Khoanh vùng render: chỉ HeaderClock re-render mỗi giây, không gây lag toàn bộ trang.
 */
export const HeaderClock = memo(function HeaderClock() {
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

    return (
        <div
            className="flex items-center gap-1.5 text-left shrink-0 mt-0.5"
            title="Thời gian thực máy chủ"
        >
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7]/70 border border-[#BBF7D0] px-1.5 py-0.5 rounded-lg tabular-nums shadow-3xs">
                <svg className="h-3 w-3 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {timeStr}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-600 bg-slate-100/80 border border-slate-200 px-1.5 py-0.5 rounded-lg tabular-nums shadow-3xs">
                <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                {dateStr}
            </span>
        </div>
    );
});
