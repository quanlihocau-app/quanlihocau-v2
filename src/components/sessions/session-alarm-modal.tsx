"use client";

import React, { useState } from "react";
import {
    getAlarmPreferences,
    saveAlarmPreferences,
    playEndingSoonTone,
    playOvertimeTone,
    triggerEndingSoonVibration,
    triggerOvertimeVibration,
    type AlarmPreferences,
} from "@/lib/sound/session-alarm";

interface SessionAlarmModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SessionAlarmModal({ isOpen, onClose }: SessionAlarmModalProps) {
    const [prefs, setPrefs] = useState<AlarmPreferences>(() => getAlarmPreferences());

    if (!isOpen) return null;

    const handleUpdate = (updates: Partial<AlarmPreferences>) => {
        const next = saveAlarmPreferences(updates);
        setPrefs(next);
    };

    const handleTestEndingSoon = () => {
        playEndingSoonTone();
        triggerEndingSoonVibration();
    };

    const handleTestOvertime = () => {
        playOvertimeTone();
        triggerOvertimeVibration();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs font-serif animate-in fade-in duration-150"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] border border-emerald-100 shadow-2xs">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#0F172A]">
                                Chuông Báo Hết Giờ
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Cảnh báo ca câu sắp hết &amp; lố giờ
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                    {/* Âm thanh */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/70">
                        <div className="flex items-center gap-2.5">
                            <span className="text-base">🔊</span>
                            <div>
                                <p className="text-xs font-bold text-[#0F172A]">Âm thanh chuông báo</p>
                                <p className="text-[10px] text-slate-500">Phát tiếng chuông khi có ô hết giờ</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleUpdate({ soundEnabled: !prefs.soundEnabled })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                prefs.soundEnabled ? "bg-[#16A34A]" : "bg-slate-300"
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    prefs.soundEnabled ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>

                    {/* Rung điện thoại */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/70">
                        <div className="flex items-center gap-2.5">
                            <span className="text-base">📳</span>
                            <div>
                                <p className="text-xs font-bold text-[#0F172A]">Rung điện thoại</p>
                                <p className="text-[10px] text-slate-500">Rung máy kèm theo tiếng chuông</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleUpdate({ vibrateEnabled: !prefs.vibrateEnabled })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                prefs.vibrateEnabled ? "bg-[#16A34A]" : "bg-slate-300"
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    prefs.vibrateEnabled ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>

                    {/* Mốc thời gian báo trước */}
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-[#0F172A]">Báo trước khi hết giờ:</p>
                            <span className="text-xs font-bold text-[#16A34A]">{prefs.leadMinutes} phút</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[5, 10, 15].map((mins) => (
                                <button
                                    key={mins}
                                    type="button"
                                    onClick={() => handleUpdate({ leadMinutes: mins })}
                                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                        prefs.leadMinutes === mins
                                            ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    {mins} phút
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Thử âm lượng */}
                <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Nghe thử chuông:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={handleTestEndingSoon}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer active:scale-95"
                        >
                            <span>🔔 Sắp hết</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleTestOvertime}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer active:scale-95"
                        >
                            <span>⚠️ Quá giờ</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-2xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                        Hoàn tất
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Nút bật/tắt nhanh chuông trên thanh Header hoặc Danh sách ca
 */
export function SessionAlarmButton() {
    const [prefs, setPrefs] = useState<AlarmPreferences>(() => getAlarmPreferences());
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                title={isEnabled ? "Cài đặt chuông báo hết giờ (Đang Bật)" : "Chuông báo giờ (Đang Tắt)"}
                className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all shadow-2xs cursor-pointer border ${
                    isEnabled
                        ? "bg-[#F0FDF4] text-[#16A34A] border-emerald-200 hover:bg-emerald-100/60"
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                }`}
            >
                <span className={isEnabled ? "animate-bounce" : ""}>
                    {isEnabled ? "🔔" : "🔕"}
                </span>
                <span className="hidden xs:inline">
                    {isEnabled ? "Chuông" : "Tắt chuông"}
                </span>
            </button>

            <SessionAlarmModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
