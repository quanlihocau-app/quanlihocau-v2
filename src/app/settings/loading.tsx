import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6 animate-pulse">
            <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-10 w-10 rounded-xl bg-[#E3E8E3]" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-5 w-32 rounded bg-[#E3E8E3]" />
                        <Skeleton className="h-3 w-40 rounded bg-[#EEF3EB]" />
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl bg-white border border-[#E3E8E3]" />
                ))}
            </div>
        </div>
    );
}

