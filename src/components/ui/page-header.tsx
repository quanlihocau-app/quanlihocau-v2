import Link from "next/link";
import React from "react";

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    badge?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

/**
 * PageHeader â€” Brand-standard inner page header.
 * Uses 48px back button (WCAG AAA), serif title, clean border structure.
 */
export function PageHeader({
    title,
    subtitle,
    backHref,
    backLabel = "Quay láº¡i",
    badge,
    action,
    className = "",
}: PageHeaderProps) {
    return (
        <header
            className={`flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-[#E5E7EB] ${className}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                {backHref && (
                    <Link
                        href={backHref}
                        aria-label={backLabel}
                        className="flex h-12 w-12 min-w-12 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAF8] active:bg-[#E8F0EC] transition-colors shrink-0"
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
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold font-serif text-[#111827] leading-tight truncate">
                            {title}
                        </h1>
                        {badge && <div className="shrink-0">{badge}</div>}
                    </div>
                    {subtitle && (
                        <p className="mt-0.5 text-sm text-[#4B5563]">{subtitle}</p>
                    )}
                </div>
            </div>

            {action && (
                <div className="flex items-center gap-2 shrink-0">{action}</div>
            )}
        </header>
    );
}

export function Skeleton({
    className = "",
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-[#E5E7EB] ${className}`}
            {...props}
        />
    );
}

