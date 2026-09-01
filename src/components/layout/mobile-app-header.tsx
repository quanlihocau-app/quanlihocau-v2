"use client";

import { useEffect, useState } from "react";

interface MobileAppHeaderProps {
    lakeName: string;
    /** Role badge label, e.g. "Chủ hồ", "Nhân viên" */
    roleBadge?: string;
    /** Whether to show online indicator (default true) */
    isOnline?: boolean;
}

function formatViDate(date: Date): string {
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dow = days[date.getDay()];
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${dow}, ${d}/${m}/${y}`;
}

export function MobileAppHeader({
    lakeName,
    roleBadge,
    isOnline = true,
}: MobileAppHeaderProps) {
    const [dateStr, setDateStr] = useState<string>(() => formatViDate(new Date()));

    // update midnight
    useEffect(() => {
        const tick = () => setDateStr(formatViDate(new Date()));
        tick();
        const now = new Date();
        const msToMidnight =
            new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
        const t = setTimeout(() => {
            tick();
        }, msToMidnight);
        return () => clearTimeout(t);
    }, []);

    return (
        <header className="mobile-pos-header-bar shrink-0">
            {/* Lake name + date */}
            <div>
                <h2 className="mobile-pos-header-title">
                    {lakeName}
                </h2>
                <p className="mobile-pos-header-date">{dateStr}</p>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
                {roleBadge && (
                    <span className="mobile-pos-header-badge">{roleBadge}</span>
                )}
                {isOnline && (
                    <span className="mobile-pos-header-badge">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#52B788]" />
                        Đang online
                    </span>
                )}
            </div>
        </header>
    );
}
