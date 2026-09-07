import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsLoading() {
    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 rounded-xl bg-[#E3E8E3]" />
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-28 rounded bg-[#E3E8E3]" />
                        <Skeleton className="h-3 w-36 rounded bg-[#EEF3EB]" />
                    </div>
                </div>
                <Skeleton className="h-9 w-24 rounded-full bg-[#E8F3E5]" />
            </div>

            {/* Search bar skeleton */}
            <div className="my-3">
                <Skeleton className="h-11 w-full rounded-2xl bg-white border border-[#E3E8E3]" />
            </div>

            {/* Filter pills skeleton */}
            <div className="flex items-center gap-2 overflow-x-hidden py-1 mb-4">
                <Skeleton className="h-8 w-20 rounded-full bg-[#4F9D5A]/20" />
                <Skeleton className="h-8 w-24 rounded-full bg-[#EEF3EB]" />
                <Skeleton className="h-8 w-24 rounded-full bg-[#EEF3EB]" />
                <Skeleton className="h-8 w-24 rounded-full bg-[#EEF3EB]" />
            </div>

            {/* Session cards skeleton list */}
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-[#E3E8E3] bg-white p-4 space-y-3 shadow-xs"
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-24 rounded-md bg-[#E3E8E3]" />
                                    <Skeleton className="h-4 w-16 rounded-full bg-[#E8F3E5]" />
                                </div>
                                <Skeleton className="h-3.5 w-32 rounded bg-[#EEF3EB]" />
                            </div>
                            <Skeleton className="h-12 w-24 rounded-xl bg-[#EEF3EB]" />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#E3E8E3]">
                            <Skeleton className="h-4 w-28 rounded bg-[#EEF3EB]" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-20 rounded-xl bg-[#EEF3EB]" />
                                <Skeleton className="h-8 w-20 rounded-xl bg-[#E8F3E5]" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
