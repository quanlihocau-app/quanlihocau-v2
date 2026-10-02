"use client";

import React, { useState } from "react";
import { SessionAlarmModal } from "./session-alarm-modal";
import { getAlarmPreferences, type AlarmPreferences } from "@/lib/sound/session-alarm";

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg
            className={className ?? "h-4 w-4 shrink-0 text-[#8A938D]"}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
    );
}

export function SessionAlarmSettingsRow() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prefs, setPrefs] = useState<AlarmPreferences>(() => getAlarmPreferences());

    React.useEffect(() => {
        const handlePrefsChange = (e: Event) => {
            const customEvent = e as CustomEvent<AlarmPreferences>;
            if (customEvent.detail) setPrefs(customEvent.detail);
            else setPrefs(getAlarmPreferences());
        };
        window.addEventListener("qlhc_alarm_prefs_changed", handlePrefsChange);
        return () => window.removeEventListener("qlhc_alarm_prefs_changed", handlePrefsChange);
    }, []);

    const isEnabled = prefs.soundEnabled || prefs.vibrateEnabled;

    return (
        <>
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="menu-row w-full text-left cursor-pointer hover:bg-slate-50 transition-colors"
            >
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-[#17201A]">
                            Chuông &amp; Cảnh báo hết giờ
                        </p>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                isEnabled
                                    ? "bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                        >
                            {isEnabled ? `Bật (${prefs.leadMinutes}p)` : "Đang tắt"}
                        </span>
                    </div>
                    <p className="text-[12px] text-[#66716A] mt-0.5">
                        {prefs.soundEnabled && prefs.vibrateEnabled
                            ? "Phát âm thanh chuông và rung máy khi cần thủ sắp hết giờ"
                            : prefs.soundEnabled
                            ? "Chỉ phát âm thanh chuông báo"
                            : prefs.vibrateEnabled
                            ? "Chỉ rung máy điện thoại"
                            : "Đã tắt chuông và rung"}
                    </p>
                </div>
                <ChevronRight className="text-slate-400" />
            </button>

            <SessionAlarmModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
