"use client";

import Link from "next/link";
import { useState } from "react";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SearchBar } from "@/components/ui/search-bar";
import { Badge, SessionStatusBadge } from "@/components/ui/badge";

export interface HomeMobileViewProps {
    lakeName: string;
    roleBadge?: string;
    isSupportMode?: boolean;
    activeSessionsCount: number;
    totalHutsCount: number;
    todayRevenue: number;
    recentSessions: Array<{
        id: string;
        customerName: string;
        packageName: string;
        huts: string[];
        startAt: string;
        status: string;
    }>;
    recentInvoices: Array<{
        id: string;
        invoiceNumber: string;
        customerName: string;
        totalAmountVnd: number;
        createdAt: string;
    }>;
}

const QUICK_ACTIONS = [
    {
        title: "Tạo vé mới",
        subtitle: "Mở ca",
        href: "/sessions/new",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        ),
        bgColor: "bg-[#E8F3E5]",
        textColor: "text-[#246B38]",
    },
    {
        title: "Đang câu",
        subtitle: "Xem phiên",
        href: "/sessions",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        ),
        bgColor: "bg-[#E6F7F0]",
        textColor: "text-[#168050]",
    },
    {
        title: "Lịch sử vé",
        subtitle: "Nhật ký",
        href: "/invoices/history",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
        ),
        bgColor: "bg-[#FEF5E7]",
        textColor: "text-[#9A600B]",
    },
    {
        title: "Báo cáo ca",
        subtitle: "Doanh thu",
        href: "/reports/daily",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
        ),
        bgColor: "bg-[#EAF3FA]",
        textColor: "text-[#1F6FA3]",
    },
    {
        title: "Kho & Hàng",
        subtitle: "Mồi, nước",
        href: "/inventory",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
        ),
        bgColor: "bg-[#F3EDF9]",
        textColor: "text-[#6E389B]",
    },
    {
        title: "Bảng giá",
        subtitle: "Gói câu",
        href: "/pricing",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
        ),
        bgColor: "bg-[#FDEEE9]",
        textColor: "text-[#A34120]",
    },
    {
        title: "Thu mua cá",
        subtitle: "Cân cá",
        href: "/sessions",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97ZM5.25 4.97c-1.01.143-2.01.317-3 .52m3-.52L2.63 15.696c-.122.499.106 1.028.589 1.202a5.989 5.989 0 0 0 2.031.352 5.989 5.989 0 0 0 2.031-.352c.483-.174.711-.703.59-1.202L5.25 4.97Z" />
            </svg>
        ),
        bgColor: "bg-[#E5F6F6]",
        textColor: "text-[#1B7676]",
    },
    {
        title: "Cài đặt",
        subtitle: "Hồ câu",
        href: "/settings",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
        ),
        bgColor: "bg-[#F0F4EF]",
        textColor: "text-[#3A4A3E]",
    },
];

export function HomeMobileView({
    lakeName,
    roleBadge,
    isSupportMode,
    activeSessionsCount,
    totalHutsCount,
    todayRevenue,
    recentSessions,
    recentInvoices,
}: HomeMobileViewProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredActions = QUICK_ACTIONS.filter((act) =>
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame pb-24">
                {/* ── Header ─────────────────────────────────────────────── */}
                <MobileAppHeader
                    lakeName={lakeName}
                    roleBadge={roleBadge}
                    isSupportMode={isSupportMode}
                />

                {/* ── Main Scroll Area ───────────────────────────────────── */}
                <main className="flex-1 px-4 sm:px-5 py-4 space-y-5 overflow-y-auto">
                    {/* ── Search Bar ──────────────────────────────────────── */}
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Tìm tính năng, mở vé, báo cáo..."
                    />

                    {/* ── Hero Promotional / Operational Banner ───────────── */}
                    <div className="relative overflow-hidden rounded-3xl bg-[#E8F3E5] p-5 border border-[#D5E5D1] shadow-xs">
                        <div className="relative z-10 max-w-[80%] space-y-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-[#246B38] shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#3E9B4F]" />
                                Sẵn sàng phục vụ
                            </span>
                            <h2 className="text-lg font-bold text-[#17201A] leading-snug">
                                Vận hành mượt mà <br />
                                <span className="text-[#246B38]">{lakeName}</span>
                            </h2>
                            <p className="text-xs text-[#66716A]">
                                Mở vé nhanh, đếm giờ tự động và đối chiếu tiền ca minh bạch.
                            </p>
                            <div className="pt-1">
                                <Link
                                    href="/sessions/new"
                                    className="inline-flex items-center justify-center rounded-xl bg-[#4F9D5A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#3D8547] active:scale-95 transition-all"
                                >
                                    + Mở vé câu ngay
                                </Link>
                            </div>
                        </div>

                        {/* Background subtle decorative icon */}
                        <div className="absolute -right-3 -bottom-3 text-[#D1E5CE]/50 pointer-events-none">
                            <svg className="h-32 w-32" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                            </svg>
                        </div>
                    </div>

                    {/* ── Today Overview / Stats Card ─────────────────────── */}
                    <div className="rounded-3xl border border-[#E3E8E3] bg-white p-4 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#66716A]">
                                Tình trạng hôm nay
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3E9B4F]">
                                <span className="h-2 w-2 rounded-full bg-[#3E9B4F] animate-pulse" />
                                Thời gian thực
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-2xl bg-[#F7F9F5] p-3 border border-[#E3E8E3]/60">
                                <p className="text-xl font-bold text-[#246B38] tabular-nums">
                                    {activeSessionsCount}
                                </p>
                                <p className="text-[11px] font-medium text-[#66716A] mt-0.5">
                                    Đang câu
                                </p>
                            </div>
                            <div className="rounded-2xl bg-[#F7F9F5] p-3 border border-[#E3E8E3]/60">
                                <p className="text-xl font-bold text-[#17201A] tabular-nums">
                                    {totalHutsCount}
                                </p>
                                <p className="text-[11px] font-medium text-[#66716A] mt-0.5">
                                    Tổng số ô
                                </p>
                            </div>
                            <div className="rounded-2xl bg-[#F7F9F5] p-3 border border-[#E3E8E3]/60">
                                <p className="text-sm font-bold text-[#246B38] tabular-nums pt-1 truncate">
                                    {todayRevenue.toLocaleString("vi-VN")}đ
                                </p>
                                <p className="text-[11px] font-medium text-[#66716A] mt-1">
                                    Đã thu ca
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Link
                                href="/sessions/new"
                                prefetch={true}
                                className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#4F9D5A] py-2.5 text-xs font-bold text-white hover:bg-[#3D8547] active:scale-95 transition-all shadow-2xs"
                            >
                                Tạo vé mới
                            </Link>
                            <Link
                                href="/reports/daily"
                                prefetch={true}
                                className="flex-1 inline-flex items-center justify-center rounded-xl border border-[#E3E8E3] bg-[#F7F9F5] py-2.5 text-xs font-bold text-[#17201A] hover:bg-[#EEF3EB] active:scale-95 transition-all"
                            >
                                Báo cáo ca
                            </Link>
                        </div>
                    </div>

                    {/* ── Quick Actions Grid (8 items in 4x2) ──────────────── */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-bold text-[#17201A]">
                                Lối tắt nghiệp vụ
                            </h3>
                            <span className="text-[11px] text-[#66716A]">1 chạm</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2.5">
                            {filteredActions.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    prefetch={true}
                                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E3E8E3] bg-white p-2.5 text-center shadow-2xs transition-all duration-120 hover:border-[#4F9D5A]/40 active:scale-95 cursor-pointer"
                                >
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bgColor} ${item.textColor} mb-1.5 transition-transform`}
                                    >
                                        {item.icon}
                                    </div>
                                    <span className="text-[11px] font-bold text-[#17201A] leading-tight line-clamp-1">
                                        {item.title}
                                    </span>
                                    <span className="text-[9.5px] text-[#66716A] leading-none mt-0.5">
                                        {item.subtitle}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ── Recent Sessions / Activity ──────────────────────── */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-bold text-[#17201A]">
                                Phiên câu gần nhất
                            </h3>
                            <Link
                                href="/sessions"
                                className="text-xs font-semibold text-[#246B38] hover:underline"
                            >
                                Xem tất cả &gt;
                            </Link>
                        </div>

                        {recentSessions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#E3E8E3] bg-[#F7F9F5] p-6 text-center">
                                <p className="text-xs text-[#66716A]">
                                    Hiện chưa có phiên câu nào đang hoạt động.
                                </p>
                                <Link
                                    href="/sessions/new"
                                    className="mt-2 inline-flex items-center text-xs font-bold text-[#246B38] hover:underline"
                                >
                                    + Mở vé đầu tiên ngay
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentSessions.map((s) => (
                                    <Link
                                        key={s.id}
                                        href="/sessions"
                                        className="flex items-center justify-between rounded-2xl border border-[#E3E8E3] bg-white p-3.5 shadow-2xs hover:border-[#4F9D5A]/40 transition-all active:scale-[0.99]"
                                    >
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-[#17201A] truncate">
                                                    {s.huts.length > 0 ? s.huts.join(", ") : "Chưa chọn ô"}
                                                </span>
                                                <SessionStatusBadge status={s.status} />
                                            </div>
                                            <p className="text-xs text-[#66716A] truncate">
                                                {s.customerName} · {s.packageName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-[#66716A] pl-2 shrink-0">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Recent Invoices / Receipts ──────────────────────── */}
                    {recentInvoices.length > 0 && (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-bold text-[#17201A]">
                                    Hóa đơn ca vừa thu
                                </h3>
                                <Link
                                    href="/invoices/history"
                                    className="text-xs font-semibold text-[#246B38] hover:underline"
                                >
                                    Xem nhật ký &gt;
                                </Link>
                            </div>

                            <div className="space-y-2">
                                {recentInvoices.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between rounded-2xl border border-[#E3E8E3] bg-white p-3 shadow-2xs"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[#17201A]">
                                                    {inv.invoiceNumber}
                                                </span>
                                                <Badge variant="success">Đã thanh toán</Badge>
                                            </div>
                                            <p className="text-[11px] text-[#66716A] mt-0.5 truncate">
                                                {inv.customerName}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-bold text-[#246B38] tabular-nums">
                                                {inv.totalAmountVnd.toLocaleString("vi-VN")}đ
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                {/* ── Navigation Bar ─────────────────────────────────────── */}
                <MobileBottomNav />
            </div>
        </div>
    );
}
