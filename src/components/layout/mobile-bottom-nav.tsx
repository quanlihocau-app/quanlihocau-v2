"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#E3B76E]" : "text-[#BCA98D]"}`}
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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#E3B76E]" : "text-[#BCA98D]"}`}
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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#E3B76E]" : "text-[#BCA98D]"}`}
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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#E3B76E]" : "text-[#BCA98D]"}`}
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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#E3B76E]" : "text-[#BCA98D]"}`}
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

    return (
        <nav
            aria-label="Mobile Navigation"
            className="mobile-pos-nav print:hidden"
        >
            <div className="mx-auto flex h-14.5 items-center justify-around px-1">
                {NAV_ITEMS.map((item) => {
                    const active = item.isActive(pathname);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex min-h-13 min-w-13 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-center transition-all duration-150 active:scale-95 select-none ${
                                active
                                    ? "text-[#E3B76E] font-bold"
                                    : "text-[#BCA98D] hover:text-[#F0D19A]"
                            }`}
                        >
                            <div className="flex h-5 w-5 items-center justify-center">
                                {item.icon(active)}
                            </div>
                            <span className="text-[10px] tracking-tight">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
