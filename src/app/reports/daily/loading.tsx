import { Skeleton } from "@/components/ui/skeleton";

export default function DailyReportLoading() {
    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6 animate-pulse">
            <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 rounded-xl bg-[#E3E8E3]" />
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-28 rounded bg-[#E3E8E3]" />
                        <Skeleton className="h-3 w-36 rounded bg-[#EEF3EB]" />
                    </div>
                </div>
            </div>

            {/* Hero Revenue Card Skeleton */}
            <div className="rounded-3xl bg-[#17201A]/80 p-5 space-y-4 my-4">
                <Skeleton className="h-4 w-32 rounded bg-white/20" />
                <Skeleton className="h-10 w-48 rounded bg-white/30" />
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                    <Skeleton className="h-12 rounded-xl bg-white/10" />
                    <Skeleton className="h-12 rounded-xl bg-white/10" />
                </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <Skeleton className="h-24 rounded-2xl bg-white border border-[#E3E8E3]" />
                <Skeleton className="h-24 rounded-2xl bg-white border border-[#E3E8E3]" />
            </div>

            <Skeleton className="h-32 rounded-2xl bg-white border border-[#E3E8E3]" />
        </div>
    );
}
