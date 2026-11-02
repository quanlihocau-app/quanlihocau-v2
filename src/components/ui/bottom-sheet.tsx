"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    /** "center" = centered dialog (default). "bottom" = slide-up sheet on mobile */
    position?: "center" | "bottom";
}

/**
 * BottomSheet / Modal â€” Brand-standard dialog.
 * Clean white surface, 1px #E5E7EB borders, serif heading, 48px close button.
 * No heavy shadows, no rounded-3xl spam, no dark overlay blur.
 */
export function BottomSheet({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    className = "",
    position = "center",
}: BottomSheetProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Escape key + body scroll lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        if (isOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);
            return () => {
                document.body.style.overflow = prev;
                window.removeEventListener("keydown", handleKeyDown);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const panelClasses =
        position === "bottom"
            ? "relative w-full max-w-lg flex flex-col bg-white rounded-t-xl border border-[#E5E7EB] border-b-0 max-h-[88dvh] overflow-hidden"
            : `relative my-auto flex max-h-[88dvh] w-full max-w-lg flex-col bg-white overflow-hidden rounded-xl border border-[#E5E7EB] ${className}`;

    const overlayClasses =
        position === "bottom"
            ? "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0"
            : "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4";

    const modal = (
        <div
            className={overlayClasses}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            aria-modal="true"
            role="dialog"
        >
            <div
                className={panelClasses}
                onClick={(e) => e.stopPropagation()}
            >
                {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {(title || description) && (
                    <div className="flex items-start justify-between border-b border-[#E5E7EB] bg-white px-5 py-4 shrink-0">
                        <div className="min-w-0 pr-2">
                            {title && (
                                <h3 className="text-base font-bold font-serif text-[#111827] leading-snug">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="mt-0.5 text-sm text-[#4B5563]">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="ÄÃ³ng"
                            className="flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F8FAF8] active:bg-[#E8F0EC] transition-colors cursor-pointer"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18 18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                {/* â”€â”€ Content (scrollable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 scroll-smooth">
                    {children}
                </div>

                {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {footer && (
                    <div className="border-t border-[#E5E7EB] bg-[#F8FAF8] px-5 py-3.5 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}

