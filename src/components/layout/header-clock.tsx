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
            className="flex flex-col text-left leading-none shrink-0"
            title="Thời gian thực máy chủ (Giờ Việt Nam GMT+7)"
        >
            <div className="font-mono text-[11px] font-bold text-[#17201A] tabular-nums tracking-tight flex items-center">
                <span>{timeStr}</span>
                <span className="mx-1 text-[#66716A]/50">·</span>
                <span>{dateStr}</span>
            </div>
            <div className="text-[9px] font-semibold text-[#246B38] tracking-wider uppercase mt-0.5 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-[#3E9B4F]" />
                <span>Giờ Việt Nam</span>
            </div>
        </div>
    );
});
