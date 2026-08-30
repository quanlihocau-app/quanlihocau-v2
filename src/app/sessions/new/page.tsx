import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { OpenSessionForm } from "./open-session-form";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default async function NewSessionPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
                <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
                    <h1 className="text-lg font-bold text-amber-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-amber-700">
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền
                        hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    // Only OWNER, MANAGER, STAFF can open sessions
    const canOpen =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER ||
        tenantContext.role === Role.STAFF;

    if (!canOpen) {
        redirect("/sessions");
    }

    // Fetch active data for the current lake
    const [customers, packages, huts] = await Promise.all([
        prisma.customer.findMany({
            where: { lakeId: tenantContext.lakeId, deletedAt: null },
            select: { id: true, name: true, phoneNormalized: true },
            orderBy: { name: "asc" },
        }),
        prisma.package.findMany({
            where: { lakeId: tenantContext.lakeId, deletedAt: null },
            select: {
                id: true,
                name: true,
                durationMinutes: true,
                priceVnd: true,
            },
            orderBy: { createdAt: "asc" },
        }),
        prisma.hut.findMany({
            where: { lakeId: tenantContext.lakeId, deletedAt: null },
            select: {
                id: true,
                name: true,
                currentSessionId: true,
                area: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    return (
        <main className="mx-auto min-h-screen max-w-md bg-[#F5F2EB] px-4 pb-24 pt-6">
            {/* Header */}
            <header className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/sessions"
                        className="flex h-10 w-10 min-w-10 items-center justify-center rounded-xl border border-[#EAE4D7] bg-white text-slate-600 shadow-sm transition-transform duration-150 ease-out active:scale-95"
                        aria-label="Quay lại"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                            />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            Tạo vé
                        </h1>
                        <p className="text-xs text-slate-500">
                            {tenantContext.lakeName}
                        </p>
                    </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                    Mở phiên
                </span>
            </header>

            <OpenSessionForm
                customers={customers}
                packages={packages}
                huts={huts}
            />

            <MobileBottomNav />
        </main>
    );
}
