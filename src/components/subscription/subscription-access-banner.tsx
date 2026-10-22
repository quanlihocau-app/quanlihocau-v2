"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { graceDaysRemaining, type SubscriptionAccess } from "@/lib/subscription-access";

interface MeAccess {
    role?: string;
    subscriptionAccess?: SubscriptionAccess;
    subscriptionExpiresAt?: string | null;
}

const HIDDEN_PREFIXES = ["/login", "/register", "/admin", "/bang-gia", "/dieu-khoan", "/chinh-sach-bao-mat"];
const ACCESS_CACHE_MS = 60_000;
let accessCache: { at: number; data: MeAccess | null } | null = null;

export function SubscriptionAccessBanner() {
    const { status } = useSession();
    const pathname = usePathname() || "/";
    const [access, setAccess] = useState<MeAccess | null>(() =>
        accessCache && Date.now() - accessCache.at < ACCESS_CACHE_MS ? accessCache.data : null,
    );

    useEffect(() => {
        if (status !== "authenticated") {
            accessCache = null;
            return;
        }
        if (accessCache && Date.now() - accessCache.at < ACCESS_CACHE_MS) {
            return;
        }
        let cancelled = false;
        fetch("/api/me", { credentials: "same-origin" })
            .then(async (response) => (response.ok ? response.json() : null))
            .then((data: MeAccess | null) => {
                accessCache = { at: Date.now(), data };
                if (!cancelled) setAccess(data);
            })
            .catch(() => {
                if (!cancelled) setAccess(null);
            });
        return () => {
            cancelled = true;
        };
    }, [status, pathname]);

    if (status !== "authenticated" || !access?.subscriptionAccess || access.subscriptionAccess === "active") {
        return null;
    }
    if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
        return null;
    }

    const locked = access.subscriptionAccess === "locked";
    const daysLeft = graceDaysRemaining(access.subscriptionExpiresAt);
    const ownerCopy = access.role === "STAFF"
        ? "Nhờ chủ hồ vào Cài đặt để gia hạn."
        : "Chủ hồ gia hạn trong Cài đặt.";

    return (
        <div
            className={`print:hidden px-4 py-2 text-center text-xs font-semibold ${
                locked ? "bg-rose-700 text-white" : "bg-amber-100 text-amber-950"
            }`}
        >
            {locked ? (
                <span>
                    Hồ đã hết hạn và quá 3 ngày ân hạn. Chỉ xem được dữ liệu, không mở vé hay thu tiền. {ownerCopy}{" "}
                    <Link href="/settings" className="underline font-bold">
                        Mở trang gia hạn
                    </Link>
                </span>
            ) : (
                <span>
                    Gói đã hết hạn. Hồ vẫn dùng được khoảng {daysLeft} ngày ân hạn, sau đó sẽ khóa ghi dữ liệu. {ownerCopy}{" "}
                    <Link href="/settings" className="underline font-bold">
                        Gia hạn ngay
                    </Link>
                </span>
            )}
        </div>
    );
}
