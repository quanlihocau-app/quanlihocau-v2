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
        default: "border-[#E5E7EB] bg-white text-[#111827] shadow-2xs",
        muted: "border-[#E5E7EB] bg-[#F8FAF8] text-[#4B5563]",
        selected: "border-2 border-[#1B3B2B] bg-[#E8F0EC]/50 text-[#111827] shadow-xs",
        highlight: "border border-[#1B3B2B] bg-[#E8F0EC]/40 text-[#111827]",
        warning: "border border-[#92400E]/40 bg-[#FFFBEB] text-[#111827]",
        danger: "border border-[#B91C1C]/40 bg-[#FEF2F2] text-[#111827]",
    }[variant];

    return (
        <div
            className={`rounded-xl border p-4 transition-all font-serif ${variantClasses} ${className}`}
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
            className={`flex items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2.5 ${className}`}
        >
            <div>
                <h3 className="text-base font-bold text-[#111827] sm:text-lg font-serif">
                    {title}
                </h3>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-[#4B5563] font-serif">{subtitle}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
