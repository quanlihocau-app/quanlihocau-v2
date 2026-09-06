"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
    label: string;
    href: string;
    icon: (isActive: boolean) => React.ReactNode;
    isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
    {
        label: "Đang câu",
        href: "/sessions",
        isActive: (pathname: string) =>
            pathname === "/sessions" ||
            (pathname.startsWith("/sessions/") && pathname !== "/sessions/new"),
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-150 ${isActive ? "text-[#E3B76E] scale-110" : "text-[#BCA98D]"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.5 : 1.75}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
            </svg>
        ),
    },
    {
        label: "Tạo vé",
        href: "/sessions/new",
        isActive: (pathname: string) => pathname === "/sessions/new",
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-150 ${isActive ? "text-[#E3B76E] scale-110" : "text-[#BCA98D]"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.5 : 1.75}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
                />
            </svg>
        ),
    },
    {
        label: "Nhật ký",
        href: "/invoices/history",
        isActive: (pathname: string) =>
            pathname.startsWith("/invoices/history") ||
            pathname === "/invoices",
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-150 ${isActive ? "text-[#E3B76E] scale-110" : "text-[#BCA98D]"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.5 : 1.75}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
            </svg>
        ),
    },
    {
        label: "Báo cáo",
        href: "/reports/daily",
        isActive: (pathname: string) => pathname.startsWith("/reports"),
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-150 ${isActive ? "text-[#E3B76E] scale-110" : "text-[#BCA98D]"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.5 : 1.75}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
            </svg>
        ),
    },
    {
        label: "Cài đặt",
        href: "/settings",
        isActive: (pathname: string) => pathname.startsWith("/settings"),
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-150 ${isActive ? "text-[#E3B76E] scale-110" : "text-[#BCA98D]"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.5 : 1.75}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
            </svg>
        ),
    },
];

export function MobileBottomNav() {
    const pathname = usePathname();
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const [prevPathname, setPrevPathname] = useState(pathname);

    // Adjust state during render when pathname changes (avoids cascading render warning)
    if (prevPathname !== pathname) {
        setPrevPathname(pathname);
        setPendingHref(null);
    }

    return (
        <nav
            aria-label="Mobile Navigation"
            className="mobile-pos-nav print:hidden"
        >
            <div className="mx-auto flex h-14.5 items-center justify-around px-1 relative">
                {NAV_ITEMS.map((item) => {
                    const active = item.isActive(pathname);
                    const isPending = pendingHref === item.href && !active;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            onClick={() => {
                                if (!active) {
                                    setPendingHref(item.href);
                                }
                            }}
                            className={`relative flex min-h-13 min-w-13 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-center transition-all duration-100 ease-out select-none cursor-pointer rounded-xl active:scale-[0.88] active:bg-white/10 ${
                                active
                                    ? "text-[#E3B76E] font-bold"
                                    : isPending
                                      ? "text-[#F5D79D] font-semibold"
                                      : "text-[#BCA98D] hover:text-[#F0D19A]"
                            }`}
                        >
                            {/* Active Top Glow Line */}
                            {active && (
                                <span className="absolute top-0 w-8 h-[2.5px] rounded-full bg-linear-to-r from-[#8A5A20] via-[#E3B76E] to-[#8A5A20] shadow-[0_0_8px_rgba(227,183,110,0.8)]" />
                            )}

                            {/* Icon container with loading spinner if pending */}
                            <div className="relative flex h-5 w-5 items-center justify-center">
                                {isPending ? (
                                    <div className="relative flex items-center justify-center">
                                        <svg
                                            className="h-5 w-5 animate-spin text-[#E3B76E]"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="3.5"
                                            />
                                            <path
                                                className="opacity-90"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        <span className="absolute h-2 w-2 rounded-full bg-[#E3B76E] animate-ping" />
                                    </div>
                                ) : (
                                    item.icon(active)
                                )}
                            </div>

                            <span className="text-[10px] tracking-tight">
                                {isPending ? "Đang mở..." : item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
