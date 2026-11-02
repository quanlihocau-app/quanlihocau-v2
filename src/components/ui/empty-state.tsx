import React from "react";

/**
 * EmptyState â€” Brand-standard empty/zero-data placeholder.
 * Clean bordered area with icon, heading, description, optional CTA.
 */
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
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAF8] px-6 py-10 text-center ${className}`}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F0EC] text-[#1B3B2B] mb-4">
                {icon || (
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                )}
            </div>
            <h4 className="text-base font-semibold font-serif text-[#111827]">
                {title}
            </h4>
            {description && (
                <p className="mt-1.5 max-w-xs text-sm text-[#4B5563] leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

