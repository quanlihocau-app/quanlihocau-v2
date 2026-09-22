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
    position?: "center" | "bottom";
}

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

    // Handle Escape key to close & body scroll lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);
            return () => {
                document.body.style.overflow = originalOverflow;
                window.removeEventListener("keydown", handleKeyDown);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const isCenter = position !== "bottom";

    const modalContent = (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/50 backdrop-blur-2xs modal-backdrop-animate font-serif"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            aria-modal="true"
            role="dialog"
        >
            <div
                className={`relative my-auto flex max-h-[90dvh] w-full max-w-lg flex-col bg-white overflow-hidden rounded-[28px] border border-slate-100 shadow-2xl modal-content-animate ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="flex items-start justify-between border-b border-slate-100 bg-[#FFFFFF] px-5 sm:px-6 py-4 shrink-0">
                        <div>
                            {title && (
                                <h3 className="text-base font-bold text-[#0F172A] font-serif">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="mt-0.5 text-xs text-[#16A34A] font-bold uppercase tracking-wider font-serif">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Đóng"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.2}
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

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 scroll-smooth"
                >
                    {children}
                </div>

                {/* Optional Footer */}
                {footer && (
                    <div
                        className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 shrink-0"
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
