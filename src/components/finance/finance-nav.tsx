"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FinanceNav() {
    const pathname = usePathname();

    const links = [
        { href: "/finance/overview", label: "Tổng quan", icon: "📊" },
        { href: "/finance/transactions", label: "Phiếu thu chi", icon: "🧾" },
        { href: "/finance/funds", label: "Sổ quỹ & Chuyển tiền", icon: "💰" },
        { href: "/finance/debts", label: "Sổ công nợ", icon: "📑" },
        { href: "/finance/categories", label: "Danh mục thu chi", icon: "🏷️" },
        { href: "/finance/reports", label: "Báo cáo P&L / Dòng tiền", icon: "📈" },
    ];

    return (
        <div className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 py-2 text-sm font-medium text-slate-600 no-scrollbar">
                <nav className="flex space-x-2" aria-label="Menu Tài chính">
                    {links.map((link) => {
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                                    isActive
                                        ? "bg-emerald-50 text-emerald-700 shadow-xs ring-1 ring-emerald-200"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                            >
                                <span>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
