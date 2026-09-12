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
            className={`fixed inset-0 z-100 flex justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200 ${
                isCenter ? "items-center p-3 sm:p-4" : "items-end"
            }`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            aria-modal="true"
            role="dialog"
        >
            <div
                className={`relative flex max-h-[90dvh] w-full max-w-md flex-col bg-white shadow-2xl transition-all duration-200 ${
                    isCenter
                        ? "rounded-3xl border border-[#E3E8E3] animate-in fade-in zoom-in-95"
                        : "rounded-t-[28px] border-t border-[#E3E8E3] shadow-sheet animate-page-enter"
                } ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle bar only for bottom drawer mode */}
                {!isCenter && (
                    <div className="flex items-center justify-center pt-3 pb-1">
                        <div className="h-1.25 w-10 rounded-full bg-[#D0D8CF]" />
                    </div>
                )}

                {/* Header */}
                {(title || description) && (
                    <div
                        className={`flex items-start justify-between border-b border-[#E3E8E3] ${
                            isCenter ? "px-6 pt-5 pb-4" : "px-5 pt-2 pb-3"
                        }`}
                    >
                        <div>
                            {title && (
                                <h3 className="text-base font-bold text-[#17201A]">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="mt-0.5 text-xs text-[#66716A]">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Đóng"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F9F5] text-[#66716A] hover:bg-[#EEF3EB] hover:text-[#17201A] transition-colors cursor-pointer"
                        >
                            <svg
                                className="h-4 w-4"
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

                {/* Content */}
                <div
                    className={`flex-1 overflow-y-auto overscroll-contain ${
                        isCenter ? "px-6 py-4" : "px-5 py-4"
                    }`}
                >
                    {children}
                </div>

                {/* Optional Footer */}
                {footer && (
                    <div
                        className={`border-t border-[#E3E8E3] bg-[#F7F9F5] ${
                            isCenter
                                ? "px-6 py-3.5 rounded-b-3xl"
                                : "px-5 py-3.5 rounded-b-none"
                        }`}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
