import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "muted" | "highlight" | "danger" | "warning";
}

export function Card({
    children,
    variant = "default",
    className = "",
    ...props
}: CardProps) {
    const variantClasses = {
        default: "border-[#E2DDD2] bg-white text-slate-900",
        muted: "border-[#E2DDD2] bg-[#F3EFE6] text-slate-700",
        highlight: "border-[#0D9488]/30 bg-[#F0FDF4] text-slate-900",
        warning: "border-[#EA580C]/30 bg-[#FFF7ED] text-slate-900",
        danger: "border-[#DC2626]/30 bg-[#FEF2F2] text-slate-900",
    }[variant];

    return (
        <div
            className={`rounded-2xl border p-4 shadow-sm transition-all duration-150 sm:p-5 ${variantClasses} ${className}`}
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
            className={`flex items-start justify-between gap-3 border-b border-[#E2DDD2]/60 pb-3 ${className}`}
        >
            <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                    {title}
                </h3>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
