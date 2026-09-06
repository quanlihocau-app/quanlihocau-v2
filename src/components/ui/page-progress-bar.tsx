"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PageProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState<number>(0);
    const [visible, setVisible] = useState<boolean>(false);

    const currentRouteKey = `${pathname}?${searchParams?.toString() || ""}`;
    const [lastRouteKey, setLastRouteKey] = useState<string>(currentRouteKey);

    // Complete progress during render when route changes
    if (lastRouteKey !== currentRouteKey) {
        setLastRouteKey(currentRouteKey);
        if (visible) {
            setProgress(100);
        }
    }

    // Auto-hide when progress reaches 100%
    useEffect(() => {
        if (visible && progress === 100) {
            const timer = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [visible, progress]);

    // Handle clicks on navigation links for instant (0ms) visual feedback
    useEffect(() => {
        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const anchor = target?.closest("a") as HTMLAnchorElement | null;

            if (!anchor || !anchor.href) return;

            // Ignore modified clicks (ctrl/cmd/shift/alt) or new tabs
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                anchor.target === "_blank" ||
                anchor.hasAttribute("download") ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const currentUrl = new URL(window.location.href);
            const targetUrl = new URL(anchor.href, window.location.href);

            // Only trigger if navigating to same origin and different path/search
            if (
                targetUrl.origin === currentUrl.origin &&
                (targetUrl.pathname !== currentUrl.pathname ||
                    targetUrl.search !== currentUrl.search)
            ) {
                // If it's just a hash change on same page, don't trigger
                if (
                    targetUrl.pathname === currentUrl.pathname &&
                    targetUrl.search === currentUrl.search &&
                    targetUrl.hash !== currentUrl.hash
                ) {
                    return;
                }

                // Instant start progress
                setVisible(true);
                setProgress(25);

                const trickle1 = setTimeout(() => {
                    setProgress((prev) => (prev < 65 ? 65 : prev));
                }, 120);

                const trickle2 = setTimeout(() => {
                    setProgress((prev) => (prev < 85 ? 85 : prev));
                }, 400);

                return () => {
                    clearTimeout(trickle1);
                    clearTimeout(trickle2);
                };
            }
        };

        document.addEventListener("click", handleAnchorClick, { capture: true });
        return () => {
            document.removeEventListener("click", handleAnchorClick, { capture: true });
        };
    }, []);

    // Listen to global app events (e.g., async button submits or tab bar clicks)
    useEffect(() => {
        const handleStart = () => {
            setVisible(true);
            setProgress(30);
            setTimeout(() => setProgress((p) => (p < 70 ? 70 : p)), 150);
        };
        const handleStop = () => {
            setProgress(100);
            setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 200);
        };

        window.addEventListener("app:start-progress", handleStart);
        window.addEventListener("app:stop-progress", handleStop);
        return () => {
            window.removeEventListener("app:start-progress", handleStart);
            window.removeEventListener("app:stop-progress", handleStop);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            aria-hidden="true"
            className="fixed top-0 left-0 right-0 z-99999 pointer-events-none h-0.75 bg-transparent"
        >
            {/* Main Progress Bar */}
            <div
                className="h-full bg-linear-to-r from-[#8A5A20] via-[#E3B76E] to-[#F5D79D] transition-all duration-200 ease-out shadow-[0_0_12px_rgba(227,183,110,0.85)]"
                style={{
                    width: `${progress}%`,
                    opacity: visible ? 1 : 0,
                    transitionProperty: "width, opacity",
                }}
            />
            {/* Glowing leading dot */}
            {progress > 0 && progress < 100 && (
                <div
                    className="absolute -top-0.5 h-1.75 w-1.75 rounded-full bg-[#FFF5DF] shadow-[0_0_10px_3px_rgba(227,183,110,0.9)] transition-all duration-200 ease-out"
                    style={{
                        left: `calc(${progress}% - 3px)`,
                    }}
                />
            )}
        </div>
    );
}
