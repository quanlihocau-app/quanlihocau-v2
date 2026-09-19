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
            className={`fixed inset-0 z-100 flex justify-center bg-black/40 backdrop-blur-none modal-backdrop-animate font-serif ${
                isCenter ? "items-center p-3 sm:p-4" : "items-end"
            }`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            aria-modal="true"
            role="dialog"
        >
            <div
                className={`relative flex max-h-[92dvh] w-full max-w-md flex-col bg-white border border-[#CCCCCC] ${
                    isCenter
                        ? "rounded-xs modal-content-animate"
                        : "rounded-t-xs border-b-0 animate-page-enter"
                } ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || description) && (
                    <div
                        className={`flex items-start justify-between border-b border-[#E0E0E0] bg-[#FFFFFF] ${
                            isCenter ? "px-5 py-3.5" : "px-4 py-3"
                        }`}
                    >
                        <div>
                            {title && (
                                <h3 className="text-base font-bold text-[#1A1A1A] font-serif">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="mt-0.5 text-xs text-[#555555] font-serif">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Đóng"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-[#CCCCCC] bg-[#F2F2F0] text-[#1A1A1A] hover:bg-[#EAEAE6] transition-colors cursor-pointer"
                        >
                            <svg
                                className="h-3.5 w-3.5"
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
                        isCenter ? "px-5 py-4" : "px-4 py-3.5"
                    }`}
                >
                    {children}
                </div>

                {/* Optional Footer */}
                {footer && (
                    <div
                        className={`border-t border-[#E0E0E0] bg-[#FAFAF7] ${
                            isCenter
                                ? "px-5 py-3"
                                : "px-4 py-3"
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
