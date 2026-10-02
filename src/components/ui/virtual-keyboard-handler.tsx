"use client";

import { useEffect } from "react";

/**
 * VirtualKeyboardHandler
 * Xử lý việc keyboard ảo mở trên iOS/Android gây che mất input.
 *
 * Khi bàn phím ảo mở:
 * - iOS Safari: window.innerHeight bị giảm → input bị che
 * - Android Chrome: visualViewport API thay đổi
 *
 * Solution: scroll input đang focus lên vùng nhìn thấy được khi
 * keyboard mở. Dùng visualViewport API (Chrome, iOS 15.4+).
 */
export function VirtualKeyboardHandler() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        // VisualViewport API: hỗ trợ tốt trên iOS 13+ và Android Chrome
        const viewport = window.visualViewport;
        if (!viewport) return;

        let rafId: number | null = null;

        function handleViewportResize() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const activeEl = document.activeElement;
                if (!activeEl) return;

                const tag = activeEl.tagName.toLowerCase();
                if (tag !== "input" && tag !== "textarea" && tag !== "select") return;

                // Không scroll nếu phần tử là trong modal cố định
                const closestFixed = activeEl.closest('[class*="fixed"]');
                if (closestFixed) return;

                // Đợi keyboard animation xong rồi scroll
                setTimeout(() => {
                    try {
                        activeEl.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                            inline: "nearest",
                        });
                    } catch {
                        // fallback
                        activeEl.scrollIntoView(false);
                    }
                }, 100);
            });
        }

        // iOS: lắng nghe focus vào input để scroll ngay
        function handleFocus(e: FocusEvent) {
            const target = e.target as Element;
            if (!target) return;
            const tag = target.tagName.toLowerCase();
            if (tag !== "input" && tag !== "textarea" && tag !== "select") return;

            // Delay để keyboard animation bắt đầu
            setTimeout(() => {
                try {
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                    });
                } catch {
                    target.scrollIntoView(false);
                }
            }, 350);
        }

        viewport.addEventListener("resize", handleViewportResize);
        document.addEventListener("focusin", handleFocus);

        return () => {
            viewport.removeEventListener("resize", handleViewportResize);
            document.removeEventListener("focusin", handleFocus);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    return null;
}
