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
        default: "border-[#E2E8F0] bg-white text-[#0F172A] shadow-2xs",
        muted: "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]",
        selected: "border-2 border-[#16A34A] bg-[#F0FDF4] text-[#0F172A] shadow-xs",
        highlight: "border-2 border-[#16A34A] bg-[#DCFCE7]/40 text-[#0F172A]",
        warning: "border-2 border-[#D97706]/40 bg-[#FFFBEB] text-[#0F172A]",
        danger: "border-2 border-[#DC2626]/40 bg-[#FEF2F2] text-[#0F172A]",
    }[variant];

    return (
        <div
            className={`rounded-2xl border p-4 transition-all font-serif ${variantClasses} ${className}`}
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
