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
        default: "border-[#D9D2C8] bg-white text-[#27231F]",
        muted: "border-[#D9D2C8] bg-[#F4F2EE] text-[#766F67]",
        selected: "border-[#8A5A20] bg-[#EFE4CF] text-[#27231F]",
        highlight: "border-[#2D6A4F]/30 bg-[#E8F3ED] text-[#27231F]",
        warning: "border-[#9A4C16]/30 bg-[#F8ECE2] text-[#27231F]",
        danger: "border-[#8B1E1E]/30 bg-[#FAECEC] text-[#27231F]",
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
            className={`flex items-start justify-between gap-3 border-b border-[#D9D2C8] pb-3.5 ${className}`}
        >
            <div>
                <h3 className="text-base font-bold text-[#27231F] sm:text-lg">
                    {title}
                </h3>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-[#766F67]">{subtitle}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
