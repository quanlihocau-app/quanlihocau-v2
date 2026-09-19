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
    isSuperAdmin?: boolean;
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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        ),
    },
    {
        title: "Đang câu",
        subtitle: "Xem phiên",
        href: "/sessions",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        ),
    },
    {
        title: "Lịch sử vé",
        subtitle: "Nhật ký",
        href: "/invoices/history",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
        ),
    },
    {
        title: "Báo cáo ca",
        subtitle: "Doanh thu",
        href: "/reports/daily",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
        ),
    },
    {
        title: "Kho & Hàng",
        subtitle: "Mồi, nước",
        href: "/inventory",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
        ),
    },
    {
        title: "Bảng giá",
        subtitle: "Gói câu",
        href: "/pricing",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
        ),
    },
    {
        title: "Thu mua cá",
        subtitle: "Cân cá",
        href: "/sessions",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97ZM5.25 4.97c-1.01.143-2.01.317-3 .52m3-.52L2.63 15.696c-.122.499.106 1.028.589 1.202a5.989 5.989 0 0 0 2.031.352 5.989 5.989 0 0 0 2.031-.352c.483-.174.711-.703.59-1.202L5.25 4.97Z" />
            </svg>
        ),
    },
    {
        title: "Cài đặt",
        subtitle: "Hồ câu",
        href: "/settings",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
        ),
    },
];

export function HomeMobileView({
    lakeName,
    roleBadge,
    isSupportMode,
    isSuperAdmin,
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
        <div className="mobile-pos-shell font-serif">
            <div className="mobile-pos-frame pb-20">
                {/* ── Editorial Header ───────────────────────────────────── */}
                <MobileAppHeader
                    lakeName={lakeName}
                    roleBadge={roleBadge}
                    isSupportMode={isSupportMode}
                />

                {/* ── Main Scroll Area ───────────────────────────────────── */}
                <main className="flex-1 px-4 py-3 space-y-4 overflow-y-auto font-serif">
                    {/* ── Search Bar ──────────────────────────────────────── */}
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Tìm tính năng, mở vé, báo cáo..."
                    />

                    {/* ── Super Admin Portal Shortcut ─────────────────────── */}
                    {isSuperAdmin && (
                        <Link
                            href="/admin/lakes"
                            className="flex items-center justify-between rounded-xs bg-[#1B3224] p-3 text-white border border-[#2C4C3B] active:translate-y-px transition-transform font-serif"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-amber-400 text-slate-950 font-bold text-xs">
                                    ★
                                </span>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-amber-200">QUẢN TRỊ VIÊN HỆ THỐNG</span>
                                        <span className="rounded-xs bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold text-amber-200 border border-amber-300/30">SUPER ADMIN</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">Quản trị toàn bộ hồ câu, doanh thu &amp; đơn hàng</p>
                                </div>
                            </div>
                            <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    )}

                    {/* ── Editorial Operational Status Card ────────────────── */}
                    <div className="rounded-xs border border-[#CCCCCC] bg-[#FFFFFF] p-3.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-[#2C4C3B]">
                                SỔ TAY VẬN HÀNH
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2C4C3B]">
                                <span className="h-1.5 w-1.5 bg-[#2C4C3B]" />
                                Sẵn sàng phục vụ
                            </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <div>
                                <h2 className="text-base font-bold text-[#1A1A1A] leading-tight font-serif">
                                    {lakeName}
                                </h2>
                                <p className="text-xs text-[#555555] font-serif mt-0.5">
                                    Mở vé nhanh, đếm giờ tự động và đối chiếu tiền ca minh bạch.
                                </p>
                            </div>
                            <Link
                                href="/sessions/new"
                                className="inline-flex items-center justify-center rounded-xs bg-[#2C4C3B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#233D2F] active:translate-y-px transition-all shrink-0 ml-2 font-serif"
                            >
                                + Mở vé ngay
                            </Link>
                        </div>
                    </div>

                    {/* ── Shift Ledger Summary Table (Bảng cân đối ca) ─────── */}
                    <div className="rounded-xs border border-[#CCCCCC] bg-[#FFFFFF]">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#E0E0E0] bg-[#FAFAF7]">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                                SỐ LIỆU CA TRỰC HÔM NAY
                            </span>
                            <span className="text-[11px] font-bold text-[#2C4C3B]">
                                Thời gian thực
                            </span>
                        </div>

                        <div className="grid grid-cols-3 divide-x divide-[#E0E0E0] text-center py-2.5">
                            <div className="px-2">
                                <p className="text-lg font-bold text-[#2C4C3B] tabular-nums font-serif">
                                    {activeSessionsCount}
                                </p>
                                <p className="text-[11px] font-semibold text-[#555555] mt-0.5">
                                    Đang câu
                                </p>
                            </div>
                            <div className="px-2">
                                <p className="text-lg font-bold text-[#1A1A1A] tabular-nums font-serif">
                                    {totalHutsCount}
                                </p>
                                <p className="text-[11px] font-semibold text-[#555555] mt-0.5">
                                    Tổng số ô
                                </p>
                            </div>
                            <div className="px-2">
                                <p className="text-sm font-bold text-[#2C4C3B] tabular-nums font-serif pt-1 truncate">
                                    {todayRevenue.toLocaleString("vi-VN")}đ
                                </p>
                                <p className="text-[11px] font-semibold text-[#555555] mt-0.5">
                                    Đã thu ca
                                </p>
                            </div>
                        </div>

                        <div className="flex divide-x divide-[#E0E0E0] border-t border-[#E0E0E0]">
                            <Link
                                href="/sessions/new"
                                prefetch={true}
                                className="flex-1 py-2 text-center text-xs font-bold text-[#2C4C3B] hover:bg-[#F2F2F0] active:bg-[#EAEAE6] transition-colors"
                            >
                                + Mở vé mới
                            </Link>
                            <Link
                                href="/reports/daily"
                                prefetch={true}
                                className="flex-1 py-2 text-center text-xs font-bold text-[#1A1A1A] hover:bg-[#F2F2F0] active:bg-[#EAEAE6] transition-colors"
                            >
                                Báo cáo ca &gt;
                            </Link>
                        </div>
                    </div>

                    {/* ── Quick Actions Grid (Crisp 4x2) ───────────────────── */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-0.5 border-b border-[#E0E0E0] pb-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                                LỐI TẮT NGHIỆP VỤ
                            </h3>
                            <span className="text-[11px] text-[#555555]">1 chạm</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {filteredActions.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    prefetch={true}
                                    className="flex flex-col items-center justify-center rounded-xs border border-[#E0E0E0] bg-[#FFFFFF] p-2 text-center transition-colors hover:border-[#2C4C3B] hover:bg-[#FAFAF7] active:bg-[#F2F2F0] cursor-pointer"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-[#F2F2F0] text-[#2C4C3B] border border-[#CCCCCC] mb-1.5">
                                        {item.icon}
                                    </div>
                                    <span className="text-[11px] font-bold text-[#1A1A1A] leading-tight line-clamp-1">
                                        {item.title}
                                    </span>
                                    <span className="text-[9.5px] text-[#555555] leading-none mt-0.5">
                                        {item.subtitle}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ── Recent Sessions (Linear Ledger List) ─────────────── */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-0.5 border-b border-[#E0E0E0] pb-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                                PHIÊN CÂU GẦN NHẤT
                            </h3>
                            <Link
                                href="/sessions"
                                className="text-xs font-bold text-[#2C4C3B] hover:underline"
                            >
                                Xem tất cả &gt;
                            </Link>
                        </div>

                        {recentSessions.length === 0 ? (
                            <div className="rounded-xs border border-dashed border-[#CCCCCC] bg-[#FAFAF7] p-4 text-center">
                                <p className="text-xs text-[#555555]">
                                    Hiện chưa có phiên câu nào đang hoạt động.
                                </p>
                                <Link
                                    href="/sessions/new"
                                    className="mt-1.5 inline-flex items-center text-xs font-bold text-[#2C4C3B] hover:underline"
                                >
                                    + Mở vé đầu tiên ngay
                                </Link>
                            </div>
                        ) : (
                            <div className="rounded-xs border border-[#E0E0E0] bg-[#FFFFFF] divide-y divide-[#E0E0E0]">
                                {recentSessions.map((s) => (
                                    <Link
                                        key={s.id}
                                        href="/sessions"
                                        className="flex items-center justify-between p-2.5 transition-colors hover:bg-[#FAFAF7] active:bg-[#F2F2F0]"
                                    >
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[#1A1A1A] truncate">
                                                    {s.huts.length > 0 ? s.huts.join(", ") : "Chưa chọn ô"}
                                                </span>
                                                <SessionStatusBadge status={s.status} />
                                            </div>
                                            <p className="text-[11px] text-[#555555] truncate">
                                                {s.customerName} · {s.packageName}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 pl-2 text-xs font-bold text-[#2C4C3B]">
                                            Xem &gt;
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Recent Invoices (Linear Ledger List) ──────────────── */}
                    {recentInvoices.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-0.5 border-b border-[#E0E0E0] pb-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                                    HÓA ĐƠN CA VỪA THU
                                </h3>
                                <Link
                                    href="/invoices/history"
                                    className="text-xs font-bold text-[#2C4C3B] hover:underline"
                                >
                                    Xem nhật ký &gt;
                                </Link>
                            </div>

                            <div className="rounded-xs border border-[#E0E0E0] bg-[#FFFFFF] divide-y divide-[#E0E0E0]">
                                {recentInvoices.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between p-2.5 hover:bg-[#FAFAF7]"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-[#1A1A1A]">
                                                    {inv.invoiceNumber}
                                                </span>
                                                <Badge variant="success">Đã thanh toán</Badge>
                                            </div>
                                            <p className="text-[11px] text-[#555555] mt-0.5 truncate">
                                                {inv.customerName}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 pl-2">
                                            <span className="text-xs font-bold text-[#2C4C3B] tabular-nums font-serif">
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
                <MobileBottomNav isSuperAdmin={isSuperAdmin} />
            </div>
        </div>
    );
}
