import { Skeleton } from "@/components/ui/skeleton";

export default function CashbookLoading() {
    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6 animate-pulse">
            <div className="flex items-center justify-between pb-3">
                <Skeleton className="h-6 w-36 rounded bg-[#E3E8E3]" />
                <Skeleton className="h-9 w-24 rounded-xl bg-[#E8F3E5]" />
            </div>
            <div className="grid grid-cols-2 gap-3 my-3">
                <Skeleton className="h-20 rounded-2xl bg-white border border-[#E3E8E3]" />
                <Skeleton className="h-20 rounded-2xl bg-white border border-[#E3E8E3]" />
            </div>
            <div className="space-y-2.5 mt-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl bg-white border border-[#E3E8E3]" />
                ))}
            </div>
        </div>
    );
}

