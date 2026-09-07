"use client";

import React from "react";

export interface IconButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    icon: React.ReactNode;
    label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            variant = "default",
            size = "md",
            icon,
            label,
            className = "",
            disabled,
            ...props
        },
        ref,
    ) => {
        const sizeClasses = {
            sm: "h-9 w-9 min-h-[36px] min-w-[36px] rounded-full text-xs",
            md: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-full text-sm",
            lg: "h-12 w-12 min-h-[48px] min-w-[48px] rounded-full text-base", // 48px standard M3 touch target
        }[size];

        const variantClasses = {
            default:
                "border border-[#E3E8E3] bg-white text-[#17201A] hover:bg-[#F7F9F5] active:bg-[#EEF3EB] shadow-2xs",
            primary:
                "bg-[#4F9D5A] text-white hover:bg-[#3D8547] active:bg-[#246B38] shadow-xs",
            secondary:
                "bg-[#E8F3E5] text-[#246B38] hover:bg-[#DDF0D8] active:bg-[#CDE8C7]",
            ghost:
                "bg-transparent text-[#66716A] hover:bg-[#F7F9F5] hover:text-[#17201A] active:bg-[#EEF3EB]",
            danger:
                "bg-[#FCEEED] text-[#D9534F] hover:bg-[#FADBD9] active:bg-[#F6C6C3]",
        }[variant];

        return (
            <button
                ref={ref}
                type="button"
                aria-label={label}
                title={label}
                disabled={disabled}
                className={`inline-flex items-center justify-center transition-all duration-120 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F9D5A] focus-visible:ring-offset-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
                {...props}
            >
                {icon}
            </button>
        );
    },
);

IconButton.displayName = "IconButton";
