"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "pos_outdoor_mode";
const EVENT_NAME = "outdoor-mode-change";

export function useOutdoorMode() {
    const [isOutdoorMode, setIsOutdoorMode] = useState<boolean>(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const enabled = saved === "true";
            setIsOutdoorMode(enabled);
            if (enabled) {
                document.documentElement.classList.add("outdoor-high-contrast");
            } else {
                document.documentElement.classList.remove("outdoor-high-contrast");
            }
        } catch {
            // Safe fallback for SSR or restricted storage
        }

        const handleSync = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>;
            const next = customEvent.detail?.enabled ?? false;
            setIsOutdoorMode(next);
            if (next) {
                document.documentElement.classList.add("outdoor-high-contrast");
            } else {
                document.documentElement.classList.remove("outdoor-high-contrast");
            }
        };

        window.addEventListener(EVENT_NAME, handleSync);
        return () => window.removeEventListener(EVENT_NAME, handleSync);
    }, []);

    const toggleOutdoorMode = useCallback(() => {
        setIsOutdoorMode((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY, String(next));
                if (next) {
                    document.documentElement.classList.add("outdoor-high-contrast");
                } else {
                    document.documentElement.classList.remove("outdoor-high-contrast");
                }
                window.dispatchEvent(
                    new CustomEvent(EVENT_NAME, { detail: { enabled: next } }),
                );
            } catch {
                // Ignore storage error
            }
            return next;
        });
    }, []);

    return {
        isOutdoorMode,
        toggleOutdoorMode,
    };
}
