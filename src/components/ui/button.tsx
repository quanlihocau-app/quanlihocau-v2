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
        // Base classes: minimum 48px on mobile for size 'lg', rounded-2xl (16px), font-semibold (600)
        const baseClasses =
            "inline-flex items-center justify-center font-semibold text-center transition-all duration-120 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] select-none cursor-pointer border border-transparent shadow-2xs";

        const sizeClasses = {
            sm: "h-9 px-3.5 text-xs rounded-xl min-w-9",
            md: "h-11 px-4 text-xs rounded-xl min-w-10",
            lg: "h-12 px-5 text-sm rounded-2xl min-w-12", // 48px standard touch target
        }[size];

        const variantClasses = {
            primary:
                "bg-[#4F9D5A] text-white hover:bg-[#3D8547] active:bg-[#246B38] focus-visible:ring-[#4F9D5A]",
            success:
                "bg-[#3E9B4F] text-white hover:bg-[#348643] active:bg-[#2B7038] focus-visible:ring-[#3E9B4F]",
            warning:
                "bg-[#D99A32] text-white hover:bg-[#C08526] active:bg-[#A8721D] focus-visible:ring-[#D99A32]",
            danger:
                "bg-[#D9534F] text-white hover:bg-[#C3433F] active:bg-[#AC3430] focus-visible:ring-[#D9534F]",
            secondary:
                "bg-[#E8F3E5] text-[#246B38] border-[#D1E5CE] hover:bg-[#DDF0D8] active:bg-[#CDE8C7] focus-visible:ring-[#4F9D5A]",
            outline:
                "border-[#E3E8E3] bg-white text-[#17201A] hover:bg-[#F7F9F5] active:bg-[#EEF3EB] focus-visible:ring-[#4F9D5A]",
            ghost:
                "bg-transparent text-[#17201A] hover:bg-[#F7F9F5] active:bg-[#EEF3EB] focus-visible:ring-[#4F9D5A]",
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
