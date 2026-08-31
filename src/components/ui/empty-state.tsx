import React from "react";

export function EmptyState({
    title,
    description,
    action,
    icon,
    className = "",
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2DDD2] bg-white p-8 text-center sm:p-12 ${className}`}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E2DDD2]/40 text-slate-500 mb-3">
                {icon || (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                )}
            </div>
            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
            {description && (
                <p className="mt-1 max-w-xs text-xs text-slate-500">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
