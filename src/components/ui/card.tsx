import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "muted" | "selected" | "highlight" | "danger" | "warning";
}

export function Card({
    children,
    variant = "default",
    className = "",
    ...props
}: CardProps) {
    const variantClasses = {
        default: "border-[#E0E0E0] bg-white text-[#1A1A1A]",
        muted: "border-[#E0E0E0] bg-[#FAFAF7] text-[#555555]",
        selected: "border-[#2C4C3B] bg-[#EAEFEA] text-[#1A1A1A]",
        highlight: "border-[#2C4C3B]/40 bg-[#EAEFEA] text-[#1A1A1A]",
        warning: "border-[#8C5C00]/40 bg-[#FDF7EB] text-[#1A1A1A]",
        danger: "border-[#9E2A2B]/40 bg-[#FBEBEB] text-[#1A1A1A]",
    }[variant];

    return (
        <div
            className={`rounded-xs border p-3.5 transition-colors sm:p-4 font-serif ${variantClasses} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    subtitle,
    action,
    className = "",
}: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`flex items-start justify-between gap-3 border-b border-[#E0E0E0] pb-2.5 ${className}`}
        >
            <div>
                <h3 className="text-base font-bold text-[#1A1A1A] sm:text-lg font-serif">
                    {title}
                </h3>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-[#555555] font-serif">{subtitle}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
