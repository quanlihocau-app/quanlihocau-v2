import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { OpenSessionForm } from "./open-session-form";

export default async function NewSessionPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
                    <h1 className="text-xl font-semibold text-amber-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-sm text-amber-700">
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
        <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
            <header className="mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-bold text-slate-900">
                    Mở phiên câu mới
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                    Hồ câu:{" "}
                    <span className="font-semibold text-slate-800">
                        {tenantContext.lakeName}
                    </span>{" "}
                    ({tenantContext.organizationName})
                </p>
            </header>

            <OpenSessionForm
                customers={customers}
                packages={packages}
                huts={huts}
            />
        </main>
    );
}
