import React from "react";

export function Skeleton({
    className = "",
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse rounded-xl bg-[#E8EFE6]/70 ${className}`}
            {...props}
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4 rounded-lg" />
            <div className="flex gap-2 pt-2 border-t border-[#E3E8E3]">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
        </div>
    );
}
