"use client";

import { clearCatalogCache } from "@/lib/query-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { OnboardingModal, openGuideModal } from "@/components/guide/onboarding-modal";
import { useNetworkStatus } from "@/lib/network/use-network-status";
import { useOutdoorMode } from "@/hooks/use-outdoor-mode";
import { HeaderClock } from "./header-clock";
import { AccountSettingsModal } from "./account-settings-modal";

interface MobileAppHeaderProps {
    lakeName: string;
    /** Role badge label, e.g. "Chủ hồ", "Nhân viên", "Báo cáo" */
    roleBadge?: string;
    /** Whether to show online indicator (optional override, otherwise auto-detected) */
    isOnline?: boolean;
    /** Whether the current session is under Super Admin support mode */
    isSupportMode?: boolean;
    /** Optional phone number override */
    phone?: string | null;
}

export function MobileAppHeader({
    lakeName,
    roleBadge,
    isOnline: isOnlineProp,
    isSupportMode,
    phone: propPhone,
}: MobileAppHeaderProps) {
    const router = useRouter();
    const { isOnline: autoOnline, isReconnecting } = useNetworkStatus();
    const { isOutdoorMode, toggleOutdoorMode } = useOutdoorMode();
    const effectiveOnline = isOnlineProp !== undefined ? isOnlineProp : autoOnline;

    const [overrideLakeName, setOverrideLakeName] = useState<string | null>(null);
    const [overridePhone, setOverridePhone] = useState<string | null>(null);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    const currentLakeName = overrideLakeName ?? lakeName;
    const currentPhone = overridePhone ?? propPhone ?? "0855 550 813";

    // Fetch lake contactPhone and name on mount if available
    useEffect(() => {
        let isMounted = true;
        fetch("/api/me/account")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (isMounted && data) {
                    if (data.lake?.name && !overrideLakeName) {
                        setOverrideLakeName(data.lake.name);
                    }
                    const phone = data.lake?.contactPhone || data.user?.phone;
                    if (phone && !overridePhone) {
                        setOverridePhone(phone);
                    }
                }
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, [overrideLakeName, overridePhone]);

    // Extract short name for avatar
    const avatarInitials = currentLakeName
        ? currentLakeName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
        : "HC";

    return (
        <>
            <header
                style={{
                    paddingTop: "max(10px, env(safe-area-inset-top, 10px))",
                    background: isOutdoorMode
                        ? "#000000"
                        : "linear-gradient(180deg, #031A0F 0%, #082E1C 50%, #041D12 100%)",
                }}
                className={`sticky top-0 z-30 shrink-0 font-serif transition-colors overflow-hidden ${
                    isOutdoorMode
                        ? "border-b-2 border-amber-400 text-white shadow-md"
                        : "text-white border-b border-emerald-700/40 shadow-[0_4px_24px_rgba(2,26,15,0.45)]"
                }`}
            >
                {/* ── Luxury Specular Sheen (Vệt sáng sang trọng trên nền xanh đậm) ── */}
                {!isOutdoorMode && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                "radial-gradient(ellipse 90% 65% at 50% -15%, rgba(52, 211, 153, 0.26) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 80%)",
                        }}
                    />
                )}

                <div className="px-3.5 sm:px-4 pb-2.5 space-y-2.5">
                    {/* ── Top Bar: Tên App & Hotline Nổi Bật ─────────── */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 border-b border-emerald-800/30 pb-1.5">
                        {/* App Brand Name */}
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-linear-to-br from-emerald-400 to-green-600 text-slate-950 font-black text-xs shadow-xs">
                                🎣
                            </span>
                            <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-emerald-300 drop-shadow-xs">
                                QUẢN LÝ HỒ CÂU
                            </span>
                        </div>

                        {/* Hotline / Số điện thoại hồ nổi bật */}
                        <a
                            href={`tel:${currentPhone.replace(/\s+/g, "")}`}
                            className="group inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-amber-300 hover:text-amber-200 transition-all shadow-xs cursor-pointer active:scale-95"
                            title="Bấm để gọi hotline / số điện thoại hồ"
                        >
                            <span className="text-[10px] sm:text-xs">📞</span>
                            <span className="font-mono tracking-tight">{currentPhone}</span>
                        </a>
                    </div>

                    {/* ── Middle Bar: Tên Hồ & Avatar (Bấm vào xổ menu) + Đồng Hồ ───── */}
                    <div className="flex items-center justify-between gap-3 min-w-0">
                        {/* Clickable Lake Identity (Avatar + Name) */}
                        <button
                            type="button"
                            onClick={() => setIsAccountModalOpen(true)}
                            className="group flex items-center gap-2.5 min-w-0 text-left cursor-pointer active:scale-[0.98] transition-all p-1 -m-1 rounded-2xl hover:bg-emerald-900/40 focus:outline-hidden"
                            title="Bấm vào để tùy chỉnh tài khoản, đổi tên hồ, đổi mật khẩu..."
                            aria-haspopup="dialog"
                        >
                            {/* Lake Avatar / Logo */}
                            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 via-emerald-600 to-green-900 border-2 border-emerald-300/60 shadow-[0_0_14px_rgba(16,185,129,0.35)] font-bold text-white font-serif text-sm sm:text-base group-hover:border-amber-300/80 transition-all">
                                <span>{avatarInitials}</span>
                                {/* Small indicator badge indicating dropdown */}
                                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-emerald-950 text-[9px] font-black shadow-xs border border-emerald-950">
                                    ▼
                                </span>
                            </div>

                            {/* Lake Name & Subtitle */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <h2 className="text-[15px] sm:text-[17px] font-extrabold text-white group-hover:text-emerald-200 transition-colors leading-snug truncate drop-shadow-xs">
                                        {currentLakeName}
                                    </h2>
                                    <span className="text-[10px] text-emerald-400 group-hover:text-amber-300 transition-colors shrink-0">
                                        ⚙️
                                    </span>
                                </div>
                                <p className="text-[10px] text-emerald-300/70 group-hover:text-amber-200/90 transition-colors flex items-center gap-1">
                                    <span>Tùy chỉnh tài khoản</span>
                                    <span>▾</span>
                                </p>
                            </div>
                        </button>

                        {/* Realtime Clock */}
                        <div className="shrink-0">
                            <HeaderClock theme={isOutdoorMode ? "light" : "dark"} />
                        </div>
                    </div>

                    {/* ── Bottom Bar: Badges, Offline Status & Quick Actions ── */}
                    <div className="flex w-full flex-wrap items-center justify-between gap-1.5 pt-0.5 border-t border-emerald-800/25">
                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {roleBadge && (
                                <span className="inline-flex items-center rounded-full bg-emerald-950/90 border border-emerald-600/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                                    {roleBadge}
                                </span>
                            )}

                            {effectiveOnline ? (
                                isReconnecting ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-600/40">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        Nối lại…
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/40">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
                                        Đã kết nối
                                    </span>
                                )
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-950/90 px-2.5 py-0.5 text-[11px] font-bold text-red-300 border border-red-500/40">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                                    Offline
                                </span>
                            )}
                        </div>

                        {/* Outdoor Mode & Help Buttons */}
                        <div className="flex items-center gap-1.5">
                            {/* Outdoor Mode Button */}
                            <button
                                type="button"
                                onClick={toggleOutdoorMode}
                                className={`inline-flex h-8 items-center gap-1 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                                    isOutdoorMode
                                        ? "bg-amber-400 text-black border-black ring-2 ring-amber-300 font-black shadow-md"
                                        : "border-emerald-700/50 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/80 hover:text-white hover:border-emerald-500/60"
                                }`}
                                aria-label={
                                    isOutdoorMode
                                        ? "Tắt chế độ ngoài trời tương phản cao"
                                        : "Bật chế độ ngoài trời tương phản cao"
                                }
                                aria-pressed={isOutdoorMode}
                                title={
                                    isOutdoorMode
                                        ? "Đang bật chế độ ngoài trời (nắng gắt)"
                                        : "Bật chế độ tương phản cao dưới nắng gắt"
                                }
                            >
                                <span aria-hidden="true">☀️</span>
                                <span>{isOutdoorMode ? "Ngoài trời: Bật" : "Ngoài trời"}</span>
                            </button>

                            {/* Help Button */}
                            <button
                                type="button"
                                onClick={() => openGuideModal()}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-700/50 bg-emerald-950/60 text-sm font-bold text-emerald-200 hover:bg-emerald-900/80 hover:text-white hover:border-emerald-400 active:scale-95 transition-all cursor-pointer"
                                aria-label="Xem hướng dẫn sử dụng"
                                title="Hướng dẫn sử dụng nhanh"
                            >
                                ?
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Support Mode (Impersonate) Alert Banner */}
            {isSupportMode && (
                <div className="bg-[#14261B] text-amber-200 px-3.5 py-2 text-xs font-bold flex items-center justify-between shrink-0 border-b border-amber-400/40 font-serif">
                    <div className="flex items-center gap-2">
                        <span className="flex h-1.5 w-1.5 bg-amber-400 animate-pulse" />
                        <span>Chế độ Hỗ trợ Kỹ thuật (Super Admin)</span>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            const response = await fetch("/api/admin/impersonate/exit", { method: "POST" });
                            if (!response.ok) return;
                            clearCatalogCache();
                            router.push("/admin/lakes");
                            router.refresh();
                        }}
                        className="rounded-xs bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-[#14261B] hover:bg-amber-300 transition-colors cursor-pointer font-serif"
                    >
                        Thoát hỗ trợ
                    </button>
                </div>
            )}

            {!effectiveOnline && (
                <div className="bg-[#781D1E] text-white px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shrink-0 font-serif shadow-xs">
                    <svg className="w-4 h-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-12.536a5 5 0 017.072 0m0 0l-2.829 2.829"
                        />
                    </svg>
                    <span>Mất kết nối mạng. Dữ liệu đang được lưu tạm trên thiết bị.</span>
                </div>
            )}

            {/* Onboarding Guide Modal */}
            <OnboardingModal />

            {/* Account Settings Dropdown Modal */}
            <AccountSettingsModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                initialLakeName={currentLakeName}
                onLakeNameChange={(newName) => setOverrideLakeName(newName)}
                onPhoneChange={(newPhone) => setOverridePhone(newPhone)}
            />
        </>
    );
}
