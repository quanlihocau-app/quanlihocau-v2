import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
    return (
        <div className="mx-auto min-h-screen max-w-md bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6 animate-pulse">
            <div className="flex items-center justify-between pb-3">
                <Skeleton className="h-6 w-36 rounded bg-[#E3E8E3]" />
                <Skeleton className="h-9 w-24 rounded-xl bg-[#E8F3E5]" />
            </div>
            <Skeleton className="h-11 w-full rounded-2xl bg-white border border-[#E3E8E3] my-3" />
            <div className="grid grid-cols-2 gap-3 mt-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl bg-white border border-[#E3E8E3]" />
                ))}
            </div>
        </div>
    );
}

