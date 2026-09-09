"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OnboardingModal, openGuideModal } from "@/components/guide/onboarding-modal";
import { useNetworkStatus } from "@/lib/network/use-network-status";

interface MobileAppHeaderProps {
    lakeName: string;
    /** Role badge label, e.g. "Chủ hồ", "Nhân viên" */
    roleBadge?: string;
    /** Whether to show online indicator (optional override, otherwise auto-detected) */
    isOnline?: boolean;
    /** Whether the current session is under Super Admin support mode */
    isSupportMode?: boolean;
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
    isOnline: isOnlineProp,
    isSupportMode,
}: MobileAppHeaderProps) {
    const router = useRouter();
    const [dateStr, setDateStr] = useState<string>(() => formatViDate(new Date()));
    const { isOnline: autoOnline, isReconnecting } = useNetworkStatus();
    const effectiveOnline = isOnlineProp !== undefined ? isOnlineProp : autoOnline;

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
        <>
            <header
                style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
                className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E3E8E3] bg-white/95 px-4 pb-3 backdrop-blur-md shrink-0"
            >
                {/* Lake name & Avatar */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E8F3E5] font-bold text-[#246B38] border border-[#D5E5D1] shadow-2xs">
                        {lakeName ? lakeName.slice(0, 2).toUpperCase() : "HC"}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[15px] font-bold text-[#17201A] leading-tight truncate">
                            {lakeName}
                        </h2>
                        <p className="text-[11px] font-medium text-[#66716A] leading-tight mt-0.5">
                            {dateStr}
                        </p>
                    </div>
                </div>

                {/* Badges + Help ? Button */}
                <div className="flex items-center gap-2 shrink-0">
                    {roleBadge && (
                        <span className="inline-flex items-center rounded-full bg-[#EEF3EB] px-2.5 py-0.5 text-[11px] font-semibold text-[#17201A] border border-[#E3E8E3]">
                            {roleBadge}
                        </span>
                    )}

                    {effectiveOnline ? (
                        isReconnecting ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Đang nối...
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF6ED] px-2.5 py-0.5 text-[11px] font-semibold text-[#246B38] border border-[#CDE8C7]">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E9B4F]" />
                                Online
                            </span>
                        )
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCEEED] px-2.5 py-0.5 text-[11px] font-semibold text-[#AC3430] border border-[#F7CBC9]">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D9534F] animate-pulse" />
                            Offline
                        </span>
                    )}

                    {/* Guide Help Trigger Button */}
                    <button
                        type="button"
                        onClick={() => openGuideModal()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E3E8E3] bg-[#F7F9F5] text-xs font-bold text-[#246B38] hover:bg-[#EEF3EB] active:scale-95 transition-all shadow-2xs cursor-pointer"
                        aria-label="Xem hướng dẫn sử dụng"
                        title="Hướng dẫn sử dụng nhanh"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* Support Mode (Impersonate) Alert Banner */}
            {isSupportMode && (
                <div className="bg-[#102A43] text-amber-300 px-3.5 py-2 text-xs font-semibold flex items-center justify-between shadow-xs shrink-0 border-b border-amber-400/30">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>⚠️ Đang trong chế độ Hỗ trợ Kỹ thuật (Super Admin)</span>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            await fetch("/api/admin/impersonate/exit", { method: "POST" });
                            router.push("/admin/lakes");
                            router.refresh();
                        }}
                        className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-[#102A43] hover:bg-amber-300 transition-colors cursor-pointer"
                    >
                        Thoát hỗ trợ
                    </button>
                </div>
            )}

            {!effectiveOnline && (
                <div className="bg-rose-500 text-white px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-xs shrink-0">
                    <svg className="w-4 h-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-12.536a5 5 0 017.072 0m0 0l-2.829 2.829" />
                    </svg>
                    <span>Mất kết nối mạng. Dữ liệu đang được lưu tạm, các chức năng ghi tiền/mở vé sẽ tự mở lại khi có mạng.</span>
                </div>
            )}

            <OnboardingModal />
        </>
    );
}

