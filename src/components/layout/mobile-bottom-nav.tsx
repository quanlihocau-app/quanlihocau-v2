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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#102A43]" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.3 : 1.8}
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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#102A43]" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.3 : 1.8}
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
        label: "Bán hàng",
        href: "/invoices",
        isActive: (pathname: string) => pathname.startsWith("/invoices"),
        icon: (isActive: boolean) => (
            <svg
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#102A43]" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.3 : 1.8}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#102A43]" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.3 : 1.8}
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
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#102A43]" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2.3 : 1.8}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
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
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2DDD2] bg-white/95 backdrop-blur-md shadow-lg print:hidden"
        >
            <div className="mx-auto flex h-14 max-w-md items-center justify-around px-2">
                {NAV_ITEMS.map((item) => {
                    const active = item.isActive(pathname);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-150 ease-out active:scale-95 ${
                                active
                                    ? "font-bold text-[#102A43]"
                                    : "font-medium text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <div className="flex h-5 w-5 items-center justify-center">
                                {item.icon(active)}
                            </div>
                            <span
                                className={`mt-0.5 text-[10px] tracking-tight ${
                                    active ? "font-extrabold text-[#102A43]" : "font-medium text-slate-500"
                                }`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
