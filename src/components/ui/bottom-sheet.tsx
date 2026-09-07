"use client";

import React, { useEffect } from "react";

export interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export function BottomSheet({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    className = "",
}: BottomSheetProps) {
    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        if (isOpen) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-[28px] border-t border-[#E3E8E3] bg-white shadow-sheet animate-page-enter ${className}`}
            >
                {/* Drag handle bar */}
                <div className="flex items-center justify-center pt-3 pb-1">
                    <div className="h-1.25 w-10 rounded-full bg-[#D0D8CF]" />
                </div>

                {/* Header */}
                {(title || description) && (
                    <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-[#E3E8E3]">
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
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F9F5] text-[#66716A] hover:bg-[#EEF3EB] hover:text-[#17201A] transition-colors"
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
                <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
                    {children}
                </div>

                {/* Optional Footer */}
                {footer && (
                    <div className="border-t border-[#E3E8E3] bg-[#F7F9F5] px-5 py-3.5 rounded-b-none">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
