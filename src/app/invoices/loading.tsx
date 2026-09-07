import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
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

            <div className="my-3">
                <Skeleton className="h-11 w-full rounded-2xl bg-white border border-[#E3E8E3]" />
            </div>

            <div className="space-y-3 mt-4">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-[#E3E8E3] bg-white p-4 space-y-2.5 shadow-xs"
                    >
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-24 rounded bg-[#E3E8E3]" />
                            <Skeleton className="h-4 w-16 rounded-full bg-[#E8F3E5]" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3.5 w-32 rounded bg-[#EEF3EB]" />
                            <Skeleton className="h-5 w-20 rounded bg-[#E8F3E5]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
