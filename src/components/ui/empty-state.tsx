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
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAF8] p-8 text-center sm:p-12 ${className}`}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F0EC] text-[#1B3B2B] mb-3">
                {icon || (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                )}
            </div>
            <h4 className="text-sm font-bold text-[#111827] font-serif">{title}</h4>
            {description && (
                <p className="mt-1 max-w-xs text-xs text-[#4B5563] font-serif">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
