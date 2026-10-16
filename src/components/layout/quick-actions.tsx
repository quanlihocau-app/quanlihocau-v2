"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CASHBOOK_QUICK_CREATE_EVENT, isCashbookList, isQuickActionPage, type CashbookQuickAction } from "@/lib/quick-actions";

export function QuickActions() {
    const pathname = usePathname();
    const router = useRouter();
    const eligible = isQuickActionPage(pathname);
    function createMoney(action: CashbookQuickAction) {
        if (isCashbookList(pathname)) window.dispatchEvent(new CustomEvent(CASHBOOK_QUICK_CREATE_EVENT, { detail: action }));
        else router.push(`/cashbook?action=${action}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
    if (!eligible) return null;
    return <nav aria-label="Thu chi nhanh" className="quick-actions quick-actions-anchor finance-ui fixed z-70 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-md" data-no-auto-center="true">
        <Button size="sm" type="button" onClick={() => createMoney("receipt")} aria-label="Tạo phiếu thu" icon={<span aria-hidden="true">↓</span>}>Thu</Button>
        <Button size="sm" variant="outline" type="button" onClick={() => createMoney("expense")} aria-label="Tạo phiếu chi" icon={<span aria-hidden="true">↑</span>}>Chi</Button>
    </nav>;
}
