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
        const baseClasses =
            "inline-flex items-center justify-center font-bold font-serif text-center transition-all duration-120 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer rounded-2xl";

        const sizeClasses = {
            sm: "h-9 px-3 text-xs min-w-9 rounded-xl",
            md: "h-11 px-4 text-xs min-w-10 rounded-2xl",
            lg: "h-12 px-5 text-sm min-w-11 rounded-[20px]", // Standard modern mobile touch target
        }[size];

        const variantClasses = {
            primary:
                "bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#166534] shadow-md shadow-emerald-600/20 border-0",
            success:
                "bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#166534] shadow-md shadow-emerald-600/20 border-0",
            warning:
                "bg-[#D97706] text-white hover:bg-[#B45309] active:bg-[#92400E] shadow-md shadow-amber-600/20 border-0",
            danger:
                "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-md shadow-red-600/20 border-0",
            secondary:
                "bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] active:bg-[#CBD5E1] border-0",
            outline:
                "border-2 border-[#16A34A] bg-white text-[#16A34A] hover:bg-[#F0FDF4] active:bg-[#DCFCE7]",
            ghost:
                "bg-transparent text-[#0F172A] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]",
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
