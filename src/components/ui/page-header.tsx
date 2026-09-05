import Link from "next/link";
import React from "react";

export function PageHeader({
    title,
    subtitle,
    backHref,
    backLabel = "Quay lại",
    badge,
    action,
    className = "",
}: {
    title: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    badge?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <header
            className={`mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center ${className}`}
        >
            <div className="flex items-center gap-3">
                {backHref && (
                    <Link
                        href={backHref}
                        aria-label={backLabel}
                        className="flex h-11 w-11 min-w-11 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white text-[#27231F] transition-colors hover:bg-[#F4F2EE] active:scale-95"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                            />
                        </svg>
                    </Link>
                )}
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight text-[#27231F] sm:text-2xl">
                            {title}
                        </h1>
                        {badge && <div>{badge}</div>}
                    </div>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-[#766F67]">{subtitle}</p>
                    )}
                </div>
            </div>

            {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </header>
    );
}

export function Skeleton({
    className = "",
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse rounded-xl bg-[#D9D2C8]/60 ${className}`}
            {...props}
        />
    );
}
