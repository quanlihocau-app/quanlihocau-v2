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
            "inline-flex items-center justify-center font-bold font-serif text-center transition-colors duration-100 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2C4C3B] disabled:opacity-40 disabled:pointer-events-none active:translate-y-px select-none cursor-pointer rounded-xs";

        const sizeClasses = {
            sm: "h-8 px-3 text-xs min-w-8",
            md: "h-10 px-3.5 text-xs min-w-10",
            lg: "h-11 px-4 text-sm min-w-11", // Standard editorial mobile touch target
        }[size];

        const variantClasses = {
            primary:
                "bg-[#2C4C3B] text-white hover:bg-[#233D2F] active:bg-[#1B3224] border border-[#1B3224]",
            success:
                "bg-[#2C4C3B] text-white hover:bg-[#233D2F] active:bg-[#1B3224] border border-[#1B3224]",
            warning:
                "bg-[#8C5C00] text-white hover:bg-[#734B00] active:bg-[#5A3B00] border border-[#734B00]",
            danger:
                "bg-[#9E2A2B] text-white hover:bg-[#832324] active:bg-[#681C1D] border border-[#832324]",
            secondary:
                "bg-[#F2F2F0] text-[#2C4C3B] border border-[#CCCCCC] hover:bg-[#EAEAE6] active:bg-[#DFDFD9]",
            outline:
                "border border-[#CCCCCC] bg-white text-[#1A1A1A] hover:bg-[#F2F2F0] active:bg-[#EAEAE6]",
            ghost:
                "bg-transparent text-[#1A1A1A] hover:bg-[#F2F2F0] active:bg-[#EAEAE6]",
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
