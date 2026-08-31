"use client";

import React from "react";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:
        | "primary"
        | "success"
        | "warning"
        | "danger"
        | "outline"
        | "ghost"
        | "secondary";
    size?: "sm" | "md" | "lg";
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
        // Base classes: minimum 48px on mobile for size 'lg', rounded-xl, font-semibold, transitions
        const baseClasses =
            "inline-flex items-center justify-center font-bold transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer";

        const sizeClasses = {
            sm: "h-9 px-3 text-xs rounded-lg min-w-9",
            md: "h-10 px-4 text-xs rounded-xl min-w-10",
            lg: "h-12 px-5 text-sm rounded-xl min-w-12", // 48px default for mobile POS
        }[size];

        const variantClasses = {
            primary:
                "bg-[#102A43] text-white hover:bg-[#1E3A5F] active:bg-[#0D1F33] focus-visible:ring-[#102A43] shadow-sm",
            success:
                "bg-[#0D9488] text-white hover:bg-[#0F766E] active:bg-[#115E59] focus-visible:ring-[#0D9488] shadow-sm",
            warning:
                "bg-[#EA580C] text-white hover:bg-[#C2410C] active:bg-[#9A3412] focus-visible:ring-[#EA580C] shadow-sm",
            danger:
                "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] focus-visible:ring-[#DC2626] shadow-sm",
            secondary:
                "bg-[#E2DDD2] text-slate-900 hover:bg-[#D5CFC3] active:bg-[#C8C2B5] focus-visible:ring-slate-400",
            outline:
                "border border-[#E2DDD2] bg-white text-slate-800 hover:bg-[#F8F6F0] active:bg-[#EAE4D7] focus-visible:ring-[#102A43] shadow-xs",
            ghost:
                "bg-transparent text-slate-700 hover:bg-[#EAE4D7]/50 active:bg-[#EAE4D7] focus-visible:ring-slate-400",
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
                            className="h-4 w-4 animate-spin text-current"
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
