import { Skeleton } from "@/components/ui/skeleton";

export default function NewSessionLoading() {
    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 rounded-xl bg-[#E3E8E3]" />
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-32 rounded bg-[#E3E8E3]" />
                        <Skeleton className="h-3 w-40 rounded bg-[#EEF3EB]" />
                    </div>
                </div>
            </div>

            {/* Segmented Switcher Skeleton */}
            <div className="my-4">
                <Skeleton className="h-12 w-full rounded-2xl bg-[#EEF3EB]" />
            </div>

            {/* Hut / Spot Selection Skeleton */}
            <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4 space-y-3 mb-4">
                <Skeleton className="h-4 w-28 rounded bg-[#E3E8E3]" />
                <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <Skeleton key={i} className="h-14 rounded-xl bg-[#EEF3EB]" />
                    ))}
                </div>
            </div>

            {/* Package Selection Skeleton */}
            <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4 space-y-3 mb-4">
                <Skeleton className="h-4 w-32 rounded bg-[#E3E8E3]" />
                <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-16 rounded-xl bg-[#EEF3EB]" />
                    ))}
                </div>
            </div>

            {/* Bottom CTA Skeleton */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-white/95 border-t border-[#E3E8E3] backdrop-blur-md">
                <Skeleton className="h-12 w-full rounded-xl bg-[#4F9D5A]/30" />
            </div>
        </div>
    );
}
