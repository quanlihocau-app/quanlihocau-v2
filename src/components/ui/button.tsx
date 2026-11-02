"use client";

import React from "react";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:
        | "primary"
        | "secondary"
        | "outline"
        | "ghost"
        | "danger"
        | "warning"
        | "success";
    size?: "sm" | "md" | "lg" | "xl";
    isLoading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = "primary",
            size = "lg",
            isLoading = false,
            loadingText,
            icon,
            disabled,
            className = "",
            ...props
        },
        ref,
    ) => {
        // Base â€” accessibility + interaction
        const baseClasses =
            "inline-flex items-center justify-center gap-2 font-semibold text-center transition-all duration-150 ease-out " +
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3B2B] focus-visible:ring-offset-1 " +
            "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer";

        // Size â€” minimum 48px touch target (WCAG AAA)
        const sizeClasses = {
            sm:  "min-h-10 h-10 px-4 text-sm rounded-lg",    // 40px â€” compact only
            md:  "min-h-11 h-11 px-4 text-sm rounded-lg",    // 44px â€” standard compact
            lg:  "min-h-12 h-12 px-5 text-sm rounded-lg",    // 48px â€” default, WCAG AA
            xl:  "min-h-[56px] h-14 px-6 text-base rounded-lg",  // 56px â€” outdoor mode, wet-finger safe
        }[size];

        // Variant â€” brand palette only
        const variantClasses = {
            primary:
                "bg-[#1B3B2B] text-white hover:bg-[#142d20] active:bg-[#0f2218]",
            secondary:
                "bg-[#E8F0EC] text-[#1B3B2B] border border-[#E5E7EB] hover:bg-[#dceae3] active:bg-[#cde0d5]",
            outline:
                "bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F8FAF8] active:bg-[#E8F0EC]",
            ghost:
                "bg-transparent text-[#111827] hover:bg-[#F8FAF8] active:bg-[#E8F0EC]",
            danger:
                "bg-[#B91C1C] text-white hover:bg-[#991B1B] active:bg-[#7F1D1D]",
            warning:
                "bg-[#92400E] text-white hover:bg-[#78350F] active:bg-[#451A03]",
            success:
                "bg-[#166534] text-white hover:bg-[#14532D] active:bg-[#052E16]",
        }[variant];

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <>
                        <svg
                            className="h-4 w-4 animate-spin text-current shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <span>{loadingText || children}</span>
                    </>
                ) : (
                    <>
                        {icon && <span className="shrink-0">{icon}</span>}
                        <span>{children}</span>
                    </>
                )}
            </button>
        );
    },
);

Button.displayName = "Button";

