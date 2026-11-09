import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6 animate-pulse">
            <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-10 w-10 rounded-xl bg-[#E3E8E3]" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-5 w-32 rounded bg-[#E3E8E3]" />
                        <Skeleton className="h-3 w-24 rounded bg-[#EEF3EB]" />
                    </div>
                </div>
                <Skeleton className="h-8 w-24 rounded-full bg-[#E8F3E5]" />
            </div>

            <div className="my-3 grid grid-cols-2 gap-3">
                <Skeleton className="h-24 rounded-2xl bg-white border border-[#E3E8E3]" />
                <Skeleton className="h-24 rounded-2xl bg-white border border-[#E3E8E3]" />
            </div>

            <Skeleton className="h-28 w-full rounded-2xl bg-white border border-[#E3E8E3] mb-4" />

            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl bg-white border border-[#E3E8E3]" />
                ))}
            </div>
        </div>
    );
}

