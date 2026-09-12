"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
    const isStandalone = useSyncExternalStore(
        (callback) => {
            const mql = window.matchMedia("(display-mode: standalone)");
            mql.addEventListener("change", callback);
            return () => mql.removeEventListener("change", callback);
        },
        () =>
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true,
        () => false
    );
    const isIOS = useSyncExternalStore(
        () => () => {},
        () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return (
                /iphone|ipad|ipod/.test(userAgent) ||
                (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
            );
        },
        () => false
    );
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [showDetailGuide, setShowDetailGuide] = useState(false);

    useEffect(() => {
        // 1. If already running in standalone mode (installed), do not show prompt
        if (isStandalone) {
            return;
        }

        // 2. Check dismissal in localStorage (show once per 7 days if dismissed)
        const dismissedAt = localStorage.getItem("pwa_install_dismissed_at");
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const recentlyDismissed = dismissedAt && Date.now() - Number(dismissedAt) < sevenDays;

        if (!recentlyDismissed) {
            // Give user 3 seconds on the page before gently presenting the install banner
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 3000);
            return () => clearTimeout(timer);
        }

        // 4. Capture Android/Chrome install event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            if (!recentlyDismissed) {
                setIsOpen(true);
            }
        };

        const handleOpenGuide = () => {
            setShowDetailGuide(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("open-pwa-install-guide", handleOpenGuide);
        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("open-pwa-install-guide", handleOpenGuide);
        };
    }, []);

    const handleDismiss = () => {
        localStorage.setItem("pwa_install_dismissed_at", String(Date.now()));
        setIsOpen(false);
        setShowDetailGuide(false);
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult.outcome === "accepted") {
                setDeferredPrompt(null);
                setIsOpen(false);
            }
        } else {
            setShowDetailGuide(true);
        }
    };

    // If already installed or banner not open, render nothing (unless user manually opened guide via event)
    if (isStandalone || (!isOpen && !showDetailGuide)) return null;

    return (
        <>
            {/* Gentle Bottom Banner */}
            {isOpen && !showDetailGuide && (
                <div
                    style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
                    className="fixed left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
                >
                    <div className="flex items-center gap-3 rounded-2xl border border-[#246B38]/30 bg-[#0B2E1D]/95 px-3.5 py-3 text-white shadow-xl backdrop-blur-md">
                        {/* App Icon */}
                        <img
                            src="/icons/icon-192x192.png"
                            alt="Hồ Câu POS"
                            className="h-10 w-10 shrink-0 rounded-xl shadow-md border border-emerald-400/30 object-cover"
                        />

                        {/* Title & Short text */}
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-emerald-100 flex items-center gap-1.5 leading-tight">
                                <span>Cài đặt ứng dụng</span>
                                <span className="rounded-full bg-emerald-500/25 px-1.5 py-0.2 text-[9.5px] font-semibold text-emerald-300">
                                    Tiện lợi
                                </span>
                            </p>
                            <p className="text-[11px] text-emerald-200/80 leading-tight mt-0.5 truncate">
                                Dùng toàn màn hình như App trên điện thoại
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={handleInstallClick}
                                className="rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:from-emerald-400 hover:to-emerald-500 active:scale-95 transition-all cursor-pointer"
                            >
                                {deferredPrompt ? "Cài đặt" : "Xem cách cài"}
                            </button>
                            <button
                                type="button"
                                onClick={handleDismiss}
                                aria-label="Đóng"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-300/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Guide Modal (especially useful for iOS or manual trigger) */}
            {showDetailGuide && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
                    onClick={() => setShowDetailGuide(false)}
                >
                    <div
                        className="relative w-full max-w-sm rounded-3xl border border-emerald-900/40 bg-[#082618] p-5 text-white shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
                            <div className="flex items-center gap-2.5">
                                <img
                                    src="/icons/icon-192x192.png"
                                    alt="Icon"
                                    className="h-10 w-10 rounded-xl shadow-md border border-emerald-400/30"
                                />
                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        Thêm vào màn hình chính
                                    </h3>
                                    <p className="text-[11px] text-emerald-300">
                                        Mở tức thì không cần vào trình duyệt
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetailGuide(false)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-emerald-200 hover:bg-white/20 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Instructions depending on OS */}
                        {isIOS ? (
                            <div className="space-y-3 text-xs text-emerald-100">
                                <p className="text-[11px] text-emerald-300/90 font-medium">
                                    Dành cho iPhone / iPad (trên Safari):
                                </p>
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 border border-white/10">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">
                                                Bấm nút Chia sẻ
                                            </p>
                                            <p className="text-[11px] text-emerald-200/70 mt-0.5">
                                                Biểu tượng ô vuông có mũi tên chỉ lên <span className="inline-block px-1.5 py-0.5 rounded bg-white/15 text-white font-mono">⎋/⇧</span> ở thanh dưới cùng của Safari.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 border border-white/10">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">
                                                Chọn &quot;Thêm vào MH chính&quot;
                                            </p>
                                            <p className="text-[11px] text-emerald-200/70 mt-0.5">
                                                Cuộn xuống và chọn <span className="text-emerald-300 font-semibold">&quot;Thêm vào MH chính&quot;</span> (hoặc <span className="text-emerald-300 font-semibold">&quot;Add to Home Screen&quot;</span>).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 border border-white/10">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                                            3
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">
                                                Bấm &quot;Thêm&quot; (Add)
                                            </p>
                                            <p className="text-[11px] text-emerald-200/70 mt-0.5">
                                                Icon app vàng kim cá chép sẽ xuất hiện trên màn hình điện thoại của bạn!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 text-xs text-emerald-100">
                                <p className="text-[11px] text-emerald-300/90 font-medium">
                                    Dành cho điện thoại Android (Chrome / Cốc Cốc):
                                </p>
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 border border-white/10">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">
                                                Bấm nút menu 3 chấm (⋮)
                                            </p>
                                            <p className="text-[11px] text-emerald-200/70 mt-0.5">
                                                Ở góc trên bên phải trình duyệt Chrome.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 border border-white/10">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">
                                                Chọn &quot;Cài đặt ứng dụng&quot; hoặc &quot;Thêm vào Màn hình chính&quot;
                                            </p>
                                            <p className="text-[11px] text-emerald-200/70 mt-0.5">
                                                App sẽ được cài đặt và hoạt động độc lập không thanh URL.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowDetailGuide(false)}
                                className="w-full rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-md"
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Global trigger to open the guide from anywhere (e.g. from Settings page)
export function openPwaInstallGuide() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-pwa-install-guide"));
    }
}
