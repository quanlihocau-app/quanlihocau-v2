"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OnboardingModal, openGuideModal } from "@/components/guide/onboarding-modal";
import { useNetworkStatus } from "@/lib/network/use-network-status";
import { HeaderClock } from "./header-clock";

interface MobileAppHeaderProps {
    lakeName: string;
    /** Role badge label, e.g. "Chủ hồ", "Nhân viên" */
    roleBadge?: string;
    /** Whether to show online indicator (optional override, otherwise auto-detected) */
    isOnline?: boolean;
    /** Whether the current session is under Super Admin support mode */
    isSupportMode?: boolean;
}

export function MobileAppHeader({
    lakeName,
    roleBadge,
    isOnline: isOnlineProp,
    isSupportMode,
}: MobileAppHeaderProps) {
    const router = useRouter();
    const { isOnline: autoOnline, isReconnecting } = useNetworkStatus();
    const effectiveOnline = isOnlineProp !== undefined ? isOnlineProp : autoOnline;

    return (
        <>
            <header
                style={{ paddingTop: "max(10px, env(safe-area-inset-top, 10px))" }}
                className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E0E0E0] bg-[#FFFFFF] px-4 pb-2.5 shrink-0 gap-3 font-serif"
            >
                {/* Lake name & Avatar & Realtime Clock */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-[#EAEFEA] font-bold text-[#2C4C3B] border border-[#CCCCCC] font-serif text-sm">
                        {lakeName ? lakeName.slice(0, 2).toUpperCase() : "HC"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[15px] font-bold text-[#1A1A1A] leading-tight truncate font-serif">
                            {lakeName}
                        </h2>
                        <div className="mt-0.5 font-serif text-xs text-[#555555]">
                            <HeaderClock />
                        </div>
                    </div>
                </div>

                {/* Badges + Help ? Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {roleBadge && (
                        <span className="inline-flex items-center rounded-xs bg-[#F2F2F0] px-2 py-0.5 text-[11px] font-bold text-[#1A1A1A] border border-[#CCCCCC] font-serif">
                            {roleBadge}
                        </span>
                    )}

                    {effectiveOnline ? (
                        isReconnecting ? (
                            <span className="inline-flex items-center gap-1 rounded-xs bg-[#FDF7EB] px-2 py-0.5 text-[11px] font-bold text-[#8C5C00] border border-[#E8D1A3] font-serif">
                                <span className="inline-block h-1.5 w-1.5 bg-[#8C5C00] animate-pulse" />
                                Nối lại…
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-xs bg-[#EAEFEA] px-2 py-0.5 text-[11px] font-bold text-[#2C4C3B] border border-[#B8CEB8] font-serif">
                                <span className="inline-block h-1.5 w-1.5 bg-[#2C4C3B]" />
                                Online
                            </span>
                        )
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-xs bg-[#FBEBEB] px-2 py-0.5 text-[11px] font-bold text-[#9E2A2B] border border-[#E9B6B7] font-serif">
                            <span className="inline-block h-1.5 w-1.5 bg-[#9E2A2B] animate-pulse" />
                            Offline
                        </span>
                    )}

                    {/* Guide Help Trigger Button */}
                    <button
                        type="button"
                        onClick={() => openGuideModal()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xs border border-[#CCCCCC] bg-[#F2F2F0] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAEAE6] active:translate-y-px transition-colors cursor-pointer font-serif"
                        aria-label="Xem hướng dẫn sử dụng"
                        title="Hướng dẫn sử dụng nhanh"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* Support Mode (Impersonate) Alert Banner */}
            {isSupportMode && (
                <div className="bg-[#1B3224] text-amber-200 px-3.5 py-2 text-xs font-bold flex items-center justify-between shrink-0 border-b border-amber-300/40 font-serif">
                    <div className="flex items-center gap-2">
                        <span className="flex h-1.5 w-1.5 bg-amber-400 animate-pulse" />
                        <span>Chế độ Hỗ trợ Kỹ thuật (Super Admin)</span>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            await fetch("/api/admin/impersonate/exit", { method: "POST" });
                            router.push("/admin/lakes");
                            router.refresh();
                        }}
                        className="rounded-xs bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-[#1B3224] hover:bg-amber-300 transition-colors cursor-pointer font-serif"
                    >
                        Thoát hỗ trợ
                    </button>
                </div>
            )}

            {!effectiveOnline && (
                <div className="bg-[#9E2A2B] text-white px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shrink-0 font-serif">
                    <svg className="w-4 h-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-12.536a5 5 0 017.072 0m0 0l-2.829 2.829" />
                    </svg>
                    <span>Mất kết nối mạng. Dữ liệu đang được lưu tạm trên thiết bị.</span>
                </div>
            )}

            <OnboardingModal />
        </>
    );
}
