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
        // Base classes: minimum 48px on mobile for size 'lg', rounded-xl (12px), 2D flat, font-semibold (600)
        const baseClasses =
            "inline-flex items-center justify-center font-semibold text-center transition-all duration-100 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.94] active:brightness-95 select-none cursor-pointer border border-transparent shadow-xs active:shadow-inner";

        const sizeClasses = {
            sm: "h-9 px-3 text-xs rounded-lg min-w-9",
            md: "h-11 px-4 text-xs rounded-xl min-w-10",
            lg: "h-12 px-5 text-sm rounded-xl min-w-12", // 48px standard touch target
        }[size];

        const variantClasses = {
            primary:
                "bg-[#8A5A20] text-white hover:bg-[#704716] active:bg-[#5A3810] focus-visible:ring-[#8A5A20]",
            success:
                "bg-[#2D6A4F] text-white hover:bg-[#22533D] active:bg-[#1A402F] focus-visible:ring-[#2D6A4F]",
            warning:
                "bg-[#9A4C16] text-white hover:bg-[#7F3C0E] active:bg-[#632D08] focus-visible:ring-[#9A4C16]",
            danger:
                "bg-[#8B1E1E] text-white hover:bg-[#701717] active:bg-[#551010] focus-visible:ring-[#8B1E1E]",
            secondary:
                "bg-[#EFE4CF] text-[#27231F] border-[#D9D2C8] hover:bg-[#E5D5BC] active:bg-[#D9C4A5] focus-visible:ring-[#8A5A20]",
            outline:
                "border-[#D9D2C8] bg-white text-[#27231F] hover:bg-[#F4F2EE] active:bg-[#EAE4D7] focus-visible:ring-[#8A5A20]",
            ghost:
                "bg-transparent text-[#27231F] hover:bg-[#EFE4CF]/60 active:bg-[#EFE4CF] focus-visible:ring-[#8A5A20]",
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
