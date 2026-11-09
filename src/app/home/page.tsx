import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/server-session";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, SessionStatus, PaymentDirection } from "@/generated/prisma/client";
import { loadShiftReport } from "@/lib/reports/shift-report";
import { startOfVnDay } from "@/lib/reports/date-utils";
import { HomeMobileView } from "@/app/home-mobile-view";

export const metadata = {
    title: "Tổng quan hồ câu | Quản Lý Hồ Câu",
};

export default async function AppHomePage() {
    const [session, tenantContext] = await Promise.all([
        getPageSession(),
        getTenantContext(),
    ]);

    if (!session?.user) {
        redirect("/login");
    }

    if (!tenantContext) {
        if (session.user.systemRole === "SUPER_ADMIN") {
            redirect("/admin/lakes");
        }
        redirect("/login");
    }

    // Mốc 0h theo giờ Việt Nam (server Vercel chạy UTC nên không dùng setHours)
    const todayStart = startOfVnDay();

    const [activeSessionsCount, totalHutsCount, todayInvoices, recentSessions, shiftReportResult] = await Promise.all([
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
                NOT: { lines: { some: { name: { startsWith: "Thu khác: " } } } },
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
        loadShiftReport(tenantContext.lakeId).catch((err) => {
            console.error("[Home] Error loading shift report for home stats:", err);
            return null;
        }),
    ]);

    // Doanh thu ca lấy từ shiftReport (đối soát khớp hoàn toàn với Báo cáo ca /reports/daily), có fallback dự phòng nếu lỗi
    let todayRevenue = 0;
    let todayCash = 0;
    let todayTransfer = 0;

    if (shiftReportResult) {
        todayRevenue = shiftReportResult.summary.revenueVnd;
        todayCash = shiftReportResult.summary.cashVnd;
        todayTransfer = shiftReportResult.summary.transferVnd;
    } else {
        const payments = await prisma.payment.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                createdAt: { gte: todayStart },
                direction: PaymentDirection.IN,
            },
            select: { amountVnd: true, method: true },
        });
        for (const p of payments) {
            todayRevenue += p.amountVnd;
            if (p.method === "CASH") todayCash += p.amountVnd;
            else todayTransfer += p.amountVnd;
        }
    }

    return (
        <HomeMobileView
            lakeName={tenantContext.lakeName}
            roleBadge={tenantContext.role}
            isSupportMode={tenantContext.isSupportMode}
            isSuperAdmin={session.user.systemRole === "SUPER_ADMIN"}
            subscriptionPlan={tenantContext.subscriptionPlan}
            subscriptionStatus={tenantContext.subscriptionStatus}
            subscriptionExpiresAt={tenantContext.subscriptionExpiresAt ? tenantContext.subscriptionExpiresAt.toISOString() : null}
            subscriptionAccess={tenantContext.subscriptionAccess}
            activeSessionsCount={activeSessionsCount}
            totalHutsCount={totalHutsCount}
            todayRevenue={todayRevenue}
            todayCash={todayCash}
            todayTransfer={todayTransfer}
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
