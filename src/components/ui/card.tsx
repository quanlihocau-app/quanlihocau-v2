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
        default: "border-[#E3E8E3] bg-white text-[#17201A] shadow-xs",
        muted: "border-[#E3E8E3] bg-[#F7F9F5] text-[#66716A]",
        selected: "border-[#4F9D5A] bg-[#E8F3E5] text-[#17201A] shadow-xs",
        highlight: "border-[#3E9B4F]/30 bg-[#EBF6ED] text-[#17201A]",
        warning: "border-[#D99A32]/30 bg-[#FDF6E9] text-[#17201A]",
        danger: "border-[#D9534F]/30 bg-[#FCEEED] text-[#17201A]",
    }[variant];

    return (
        <div
            className={`rounded-2xl border p-4 transition-colors sm:p-5 ${variantClasses} ${className}`}
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
            className={`flex items-start justify-between gap-3 border-b border-[#E3E8E3] pb-3.5 ${className}`}
        >
            <div>
                <h3 className="text-base font-bold text-[#17201A] sm:text-lg">
                    {title}
                </h3>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-[#66716A]">{subtitle}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
