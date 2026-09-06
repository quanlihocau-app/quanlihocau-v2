export default function RootLoading() {
    return (
        <div className="mobile-pos-shell select-none animate-page-enter">
            <div className="mobile-pos-frame">
                {/* Skeleton Header */}
                <header className="mobile-pos-header-bar shrink-0">
                    <div className="flex flex-col gap-1.5">
                        <div className="h-5 w-32 rounded bg-[#5A3820]/70 skeleton-shimmer" />
                        <div className="h-3 w-20 rounded bg-[#422615]/70 skeleton-shimmer" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-6 w-20 rounded-md bg-[#5A3820]/70 skeleton-shimmer" />
                        <div className="h-9 w-9 rounded-xl bg-[#5A3820]/70 skeleton-shimmer" />
                    </div>
                </header>

                {/* Skeleton Main Body */}
                <main className="flex-1 px-4 py-4 space-y-3.5 pb-24 overflow-hidden">
                    {/* Top Action / Summary Bar Skeleton */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="h-10 flex-1 rounded-xl bg-[#E2DACB] skeleton-shimmer" />
                        <div className="h-10 w-28 rounded-xl bg-[#D9C7AA] skeleton-shimmer" />
                    </div>

                    {/* Quick Stats or Filter Tabs Skeleton */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="h-14 rounded-xl bg-[#E8DFD1] skeleton-shimmer" />
                        <div className="h-14 rounded-xl bg-[#E8DFD1] skeleton-shimmer" />
                        <div className="h-14 rounded-xl bg-[#E8DFD1] skeleton-shimmer" />
                    </div>

                    {/* Cards Skeleton (Active Sessions / POS items) */}
                    <div className="space-y-3 pt-1">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-[#D9D2C8] bg-white p-4 shadow-2xs space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-lg bg-[#EFE4CF] skeleton-shimmer" />
                                        <div className="space-y-1">
                                            <div className="h-4 w-28 rounded bg-[#E4D7C3] skeleton-shimmer" />
                                            <div className="h-3 w-16 rounded bg-[#EFE8DC] skeleton-shimmer" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-16 rounded-full bg-[#EFE4CF] skeleton-shimmer" />
                                </div>
                                <div className="h-12 w-full rounded-xl bg-[#F4F0E8] skeleton-shimmer" />
                                <div className="flex items-center justify-between pt-1">
                                    <div className="h-3 w-24 rounded bg-[#EFE8DC] skeleton-shimmer" />
                                    <div className="h-8 w-24 rounded-lg bg-[#DCCBB1] skeleton-shimmer" />
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Skeleton Bottom Navigation */}
                <nav
                    aria-label="Loading Navigation"
                    className="mobile-pos-nav print:hidden"
                >
                    <div className="mx-auto flex h-14.5 items-center justify-around px-1">
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div
                                key={item}
                                className="flex min-h-13 min-w-13 flex-1 flex-col items-center justify-center gap-1.5 py-1"
                            >
                                <div className="h-4 w-4 rounded-full bg-[#52331E]/60 skeleton-shimmer" />
                                <div className="h-2 w-8 rounded bg-[#52331E]/50 skeleton-shimmer" />
                            </div>
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    );
}
