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
        // Base — accessibility, touch target & focus ring
        const baseClasses =
            "inline-flex items-center justify-center gap-2 font-semibold text-center transition-all duration-150 ease-out " +
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3B2B] focus-visible:ring-offset-1 " +
            "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer";

        // Size — minimum 48px touch target for default (lg), outdoor 56px (xl)
        const sizeClasses = {
            sm: "min-h-10 h-10 px-3.5 text-xs rounded-lg",
            md: "min-h-11 h-11 px-4 text-sm rounded-lg",
            lg: "min-h-12 h-12 px-5 text-sm rounded-lg",
            xl: "min-h-[56px] h-14 sm:h-16 px-6 text-sm sm:text-base rounded-lg",
        }[size];

        // Variant — Deep Forest Green & brand palette
        const variantClasses = {
            primary:
                "bg-[#1B3B2B] text-white hover:bg-[#142d20] active:bg-[#0f2218] shadow-xs border-0",
            success:
                "bg-[#166534] text-white hover:bg-[#14532D] active:bg-[#052E16] shadow-xs border-0",
            warning:
                "bg-[#92400E] text-white hover:bg-[#78350F] active:bg-[#451A03] shadow-xs border-0",
            danger:
                "bg-[#B91C1C] text-white hover:bg-[#991B1B] active:bg-[#7F1D1D] shadow-xs border-0",
            secondary:
                "bg-[#E8F0EC] text-[#1B3B2B] border border-[#E5E7EB] hover:bg-[#dceae3] active:bg-[#cde0d5]",
            outline:
                "border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAF8] active:bg-[#E8F0EC]",
            ghost:
                "bg-transparent text-[#111827] hover:bg-[#F8FAF8] active:bg-[#E8F0EC]",
        }[variant];

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
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
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        {icon && <span className="shrink-0">{icon}</span>}
                        <span>{children}</span>
                    </div>
                )}
            </button>
        );
    },
);

Button.displayName = "Button";
