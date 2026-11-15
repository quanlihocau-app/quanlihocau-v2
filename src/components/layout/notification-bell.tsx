"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface NotificationItem {
    id: string;
    title: string | null;
    body: string | null;
    read: boolean;
    createdAt: string;
}

interface NotificationBellProps {
    theme?: "dark" | "light";
}

export function NotificationBell({ theme = "dark" }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications?limit=15");
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // Ignore background fetch error
        }
    };

    // Initial fetch & slow poll every 60s
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            if (res.ok) {
                setUnreadCount(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            }
        } catch {
            // Best effort
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = async (notif: NotificationItem) => {
        if (!notif.read) {
            try {
                await fetch("/api/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: notif.id }),
                });
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch {}
        }
        setIsOpen(false);
    };

    const isLight = theme === "light";

    return (
        <div className="relative inline-block" ref={panelRef}>
            {/* Bell Icon Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-bold transition-all cursor-pointer active:scale-95 ${
                    isLight
                        ? "bg-amber-400 text-black border-black ring-1 ring-amber-300"
                        : "border-emerald-700/50 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/80 hover:text-white hover:border-emerald-400"
                }`}
                aria-label="Thông báo"
                title={unreadCount > 0 ? `Có ${unreadCount} thông báo mới` : "Thông báo"}
            >
                <span aria-hidden="true" className="text-sm">🔔</span>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-md animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] rounded-2xl border border-[#E3E8E3] bg-white text-[#17201A] shadow-2xl z-50 overflow-hidden font-sans">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#E3E8E3] bg-[#F7F9F7] px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-[#1B3B2B]">Thông báo & Cảnh báo</span>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                                    {unreadCount} mới
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                disabled={loading}
                                className="text-xs font-medium text-[#246B38] hover:underline cursor-pointer disabled:opacity-50"
                            >
                                Đã đọc hết
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#E3E8E3]">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-[#66716A]">
                                <div className="text-2xl mb-1">🛡️</div>
                                <p className="font-semibold text-[#17201A]">Chưa có thông báo nào</p>
                                <p className="mt-0.5 text-[#8A938D]">Hệ thống bảo vệ đang theo dõi mọi thao tác trên hồ.</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const isWarning = notif.title?.includes("⚠️") || notif.title?.includes("Cảnh báo");
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleItemClick(notif)}
                                        className={`p-3 text-left transition-colors cursor-pointer hover:bg-[#F0F4F0] ${
                                            !notif.read
                                                ? isWarning
                                                    ? "bg-red-50/70 border-l-4 border-l-red-500"
                                                    : "bg-emerald-50/60 border-l-4 border-l-emerald-500"
                                                : "bg-white"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-xs font-bold ${isWarning ? "text-red-700" : "text-[#1B3B2B]"}`}>
                                                {notif.title || "Thông báo hệ thống"}
                                            </p>
                                            <span className="text-[10px] text-[#8A938D] shrink-0">
                                                {formatTimeAgo(notif.createdAt)}
                                            </span>
                                        </div>
                                        {notif.body && (
                                            <p className="mt-1 text-xs text-[#404943] leading-relaxed line-clamp-2">
                                                {notif.body}
                                            </p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#E3E8E3] bg-[#F7F9F7] px-4 py-2.5 text-center">
                        <Link
                            href="/settings/nhat-ky?risk=SUSPICIOUS"
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-semibold text-[#246B38] hover:text-[#1B3B2B] flex items-center justify-center gap-1"
                        >
                            <span>Xem toàn bộ Nhật ký thao tác</span>
                            <span>→</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatTimeAgo(dateStr: string): string {
    try {
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return "Vừa xong";
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}p trước`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}h trước`;
        const diffDay = Math.floor(diffHour / 24);
        return `${diffDay} ngày trước`;
    } catch {
        return "";
    }
}
