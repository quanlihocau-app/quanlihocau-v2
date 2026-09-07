export default function AdminLoading() {
    return (
        <div className="min-h-screen bg-[#F7F9F5] text-[#17201A] flex flex-col select-none animate-page-enter">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-40 w-full border-b border-[#E3E8E3] bg-white shadow-xs">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#4F9D5A]/15 skeleton-shimmer" />
                        <div className="flex flex-col gap-1">
                            <div className="h-3 w-32 rounded bg-[#17201A]/15 skeleton-shimmer" />
                            <div className="h-2.5 w-24 rounded bg-[#4F9D5A]/20 skeleton-shimmer" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-24 rounded-lg bg-[#E8F3E5] skeleton-shimmer" />
                        <div className="h-9 w-24 rounded-xl bg-[#E3E8E3] skeleton-shimmer" />
                    </div>
                </div>
            </header>

            {/* Admin Body Skeleton */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        <div className="h-7 w-48 rounded-lg bg-[#E3E8E3] skeleton-shimmer" />
                        <div className="h-4 w-72 rounded bg-[#EEF3EB] skeleton-shimmer" />
                    </div>
                    <div className="h-10 w-32 rounded-xl bg-[#E8F3E5] skeleton-shimmer" />
                </div>

                {/* Stat cards skeleton */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-[#E3E8E3] bg-white p-5 space-y-3"
                        >
                            <div className="h-3.5 w-24 rounded bg-[#EEF3EB] skeleton-shimmer" />
                            <div className="h-8 w-20 rounded bg-[#E8F3E5] skeleton-shimmer" />
                        </div>
                    ))}
                </div>

                {/* Table skeleton */}
                <div className="rounded-2xl border border-[#E3E8E3] bg-white p-6 space-y-4">
                    <div className="h-5 w-40 rounded bg-[#E3E8E3] skeleton-shimmer" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-12 w-full rounded-xl bg-[#EEF3EB] skeleton-shimmer"
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
