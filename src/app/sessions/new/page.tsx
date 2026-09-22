import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { TicketOrRetailSwitcher } from "./ticket-or-retail-switcher";
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

    // Only OWNER, MANAGER, STAFF can open sessions / retail sale
    const canOpen =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER ||
        tenantContext.role === Role.STAFF;

    if (!canOpen) {
        redirect("/sessions");
    }

    // Fetch active data for the current lake
    const [customers, packages, huts, rawProducts, fishTypes] = await Promise.all([
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
        prisma.product.findMany({
            where: { lakeId: tenantContext.lakeId, deletedAt: null },
            select: {
                id: true,
                name: true,
                sku: true,
                priceVnd: true,
                movements: {
                    select: {
                        quantity: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        }),
        prisma.fishType.findMany({
            where: { lakeId: tenantContext.lakeId, deletedAt: null },
            select: {
                id: true,
                name: true,
                pricePerKg: true,
            },
            orderBy: { name: "asc" },
        }),
    ]);

    const products = rawProducts.map((p) => {
        const stock = p.movements.reduce(
            (sum, m) => sum + Number(m.quantity),
            0,
        );
        return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            priceVnd: p.priceVnd,
            stock,
        };
    });

    return (
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame">
                <MobileAppHeader lakeName={tenantContext.lakeName} />

                <div className="p-4 space-y-4 pb-28">
                    {/* ── Standardized Green Gradient Banner (Đồng bộ trang Đang câu) ── */}
                    <div className="w-full mb-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-[#F0FDF4] via-white to-[#F0FDF4] px-4 py-3.5 shadow-2xs font-serif">
                        <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-2">
                                <div className="h-4.5 w-1.5 rounded-full bg-[#16A34A] shrink-0" />
                                <h1 className="text-xs sm:text-[13px] font-bold uppercase tracking-normal text-[#0F172A] font-serif leading-none whitespace-nowrap">
                                    TẠO VÉ &amp; BÁN HÀNG
                                </h1>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-bold text-[#16A34A] border border-[#BBF7D0] shadow-2xs font-serif shrink-0 whitespace-nowrap">
                                POS Hồ câu
                            </span>
                        </div>
                    </div>

                    <TicketOrRetailSwitcher
                        customers={customers}
                        packages={packages}
                        huts={huts}
                        products={products}
                        fishTypes={fishTypes}
                        lakeName={tenantContext.lakeName}
                        cashierName={session.user.name || session.user.email?.split("@")[0] || "Thu ngân"}
                    />
                </div>

                <MobileBottomNav isSuperAdmin={session.user.systemRole === "SUPER_ADMIN"} />
            </div>
        </div>
    );
}

