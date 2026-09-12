import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, SessionStatus } from "@/generated/prisma/client";
import { HomeMobileView } from "@/app/home-mobile-view";

export const metadata = {
    title: "Tổng quan hồ câu | Quản Lý Hồ Câu",
};

export default async function AppHomePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();
    if (!tenantContext) {
        if (session.user.systemRole === "SUPER_ADMIN") {
            redirect("/admin/lakes");
        }
        redirect("/login");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeSessionsCount, totalHutsCount, todayInvoices, recentSessions] = await Promise.all([
        prisma.fishingSession.count({
            where: {
                lakeId: tenantContext.lakeId,
                status: SessionStatus.ACTIVE,
            },
        }),
        prisma.hut.count({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        }),
        prisma.invoice.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                createdAt: { gte: todayStart },
                status: InvoiceStatus.PAID,
            },
            select: {
                id: true,
                totalAmountVnd: true,
                createdAt: true,
                customer: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
        prisma.fishingSession.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                status: SessionStatus.ACTIVE,
            },
            include: {
                customer: { select: { name: true } },
                package: { select: { name: true } },
                hutLinks: { include: { hut: { select: { name: true } } } },
            },
            orderBy: { startAt: "desc" },
            take: 3,
        }),
    ]);

    const todayRevenue = todayInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmountVnd || 0),
        0,
    );

    return (
        <HomeMobileView
            lakeName={tenantContext.lakeName}
            roleBadge={tenantContext.role}
            isSupportMode={tenantContext.isSupportMode}
            isSuperAdmin={session.user.systemRole === "SUPER_ADMIN"}
            activeSessionsCount={activeSessionsCount}
            totalHutsCount={totalHutsCount}
            todayRevenue={todayRevenue}
            recentSessions={recentSessions.map((s) => ({
                id: s.id,
                customerName: s.customer?.name || "Khách lẻ",
                packageName: s.package.name,
                huts: s.hutLinks.map((hl) => hl.hut.name),
                startAt: s.startAt.toISOString(),
                status: s.status,
            }))}
            recentInvoices={todayInvoices.map((inv) => ({
                id: inv.id,
                invoiceNumber: `HD-${inv.id.slice(0, 6).toUpperCase()}`,
                customerName: inv.customer?.name || "Khách lẻ",
                totalAmountVnd: Number(inv.totalAmountVnd || 0),
                createdAt: inv.createdAt.toISOString(),
            }))}
        />
    );
}
