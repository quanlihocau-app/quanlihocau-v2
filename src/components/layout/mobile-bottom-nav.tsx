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
        label: "Trang chủ",
        href: "/",
        isActive: (pathname: string) => pathname === "/",
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-120 ${isActive ? "scale-105" : ""}`}
                fill={isActive ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2 : 1.75}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
            </svg>
        ),
    },
    {
        label: "Đang câu",
        href: "/sessions",
        isActive: (pathname: string) =>
            pathname === "/sessions" ||
            (pathname.startsWith("/sessions/") && pathname !== "/sessions/new"),
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-120 ${isActive ? "scale-105" : ""}`}
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
                className={`h-5 w-5 transition-transform duration-120 ${isActive ? "scale-105" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.5 : 1.75}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                />
            </svg>
        ),
    },
    {
        label: "Báo cáo",
        href: "/reports",
        isActive: (pathname: string) => pathname.startsWith("/reports"),
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-transform duration-120 ${isActive ? "scale-105" : ""}`}
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
                className={`h-5 w-5 transition-transform duration-120 ${isActive ? "scale-105" : ""}`}
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

    // Adjust state during render when pathname changes
    if (prevPathname !== pathname) {
        setPrevPathname(pathname);
        setPendingHref(null);
    }

    return (
        <nav
            aria-label="Mobile Navigation"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 border-t border-[#E3E8E3] bg-white/95 backdrop-blur-md print:hidden shadow-sm"
        >
            <div className="flex h-16 items-center justify-around px-2 relative">
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
                            className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 py-1 text-center transition-all duration-120 select-none cursor-pointer active:scale-95 ${
                                active
                                    ? "text-[#246B38]"
                                    : isPending
                                      ? "text-[#4F9D5A]"
                                      : "text-[#66716A] hover:text-[#17201A]"
                            }`}
                        >
                            {/* M3 Active pill container */}
                            <div
                                className={`flex h-8 w-13 items-center justify-center rounded-full transition-all duration-150 ${
                                    active
                                        ? "bg-[#E8F3E5] text-[#246B38]"
                                        : "bg-transparent text-[#66716A]"
                                }`}
                            >
                                {isPending ? (
                                    <svg
                                        className="h-4.5 w-4.5 animate-spin text-[#4F9D5A]"
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
                                ) : (
                                    item.icon(active)
                                )}
                            </div>

                            <span
                                className={`text-[10.5px] leading-none tracking-tight ${
                                    active
                                        ? "font-bold text-[#246B38]"
                                        : "font-medium text-[#66716A]"
                                }`}
                            >
                                {isPending ? "Đang mở..." : item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
