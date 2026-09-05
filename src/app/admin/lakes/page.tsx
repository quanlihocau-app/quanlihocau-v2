import { Role, SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";
import { LakesAdminClient, LakeItem, StatsOverview } from "./lakes-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminLakesPage() {
    await requireSuperAdmin();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCount, lakes, totalLakes, activeCount, trialCount, graceCount, suspendedCount] =
        await Promise.all([
            prisma.lake.count({ where: { deletedAt: null } }),
            prisma.lake.findMany({
                where: { deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    subscriptionStatus: true,
                    subscriptionExpiresAt: true,
                    organization: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    memberships: {
                        where: {
                            role: Role.OWNER,
                            deletedAt: null,
                        },
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            fishingSessions: {
                                where: {
                                    createdAt: { gte: startOfMonth },
                                },
                            },
                            invoices: {
                                where: {
                                    createdAt: { gte: startOfMonth },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
            prisma.lake.count({ where: { deletedAt: null } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.ACTIVE } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.TRIAL } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.GRACE_PERIOD } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.SUSPENDED } }),
        ]);

    const initialLakes: LakeItem[] = lakes.map((lake) => {
        const owner = lake.memberships[0]?.user || null;
        return {
            id: lake.id,
            lakeName: lake.name,
            organizationName: lake.organization.name,
            ownerName: owner?.name || "Chưa có chủ sở hữu",
            ownerPhone: owner?.phone || "—",
            ownerEmail: owner?.email || "—",
            subscriptionStatus: lake.subscriptionStatus,
            subscriptionExpiresAt: lake.subscriptionExpiresAt ? lake.subscriptionExpiresAt.toISOString() : null,
            currentMonthSessionsCount: lake._count.fishingSessions,
            currentMonthInvoicesCount: lake._count.invoices,
            createdAt: lake.createdAt.toISOString(),
        };
    });

    const initialStats: StatsOverview = {
        totalLakes,
        activeCount,
        trialCount,
        graceCount,
        suspendedCount,
    };

    const initialPagination = {
        page: 1,
        limit: 10,
        totalCount,
        totalPages: Math.ceil(totalCount / 10) || 1,
    };

    return (
        <LakesAdminClient
            initialLakes={initialLakes}
            initialPagination={initialPagination}
            initialStats={initialStats}
        />
    );
}
