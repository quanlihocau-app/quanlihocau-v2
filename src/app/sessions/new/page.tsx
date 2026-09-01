import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { OpenSessionForm } from "./open-session-form";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";

export default async function NewSessionPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
                    <h1 className="text-lg font-bold text-red-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-red-700">
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
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame">
                <MobileAppHeader lakeName={tenantContext.lakeName} isOnline={true} />

                <div className="p-4 space-y-4 pb-28">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            Tạo vé mới
                        </h1>
                        <span className="rounded-full bg-[#EAE2CE] px-2.5 py-0.5 text-xs font-bold text-[#8A5B00]">
                            Thu trước / Thu sau
                        </span>
                    </div>

                    <OpenSessionForm
                        customers={customers}
                        packages={packages}
                        huts={huts}
                    />
                </div>

                <MobileBottomNav />
            </div>
        </div>
    );
}
