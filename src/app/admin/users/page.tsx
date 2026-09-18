import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { UserListItem, UserAdminStats } from "./types";
import { UsersAdminClient } from "./users-admin-client";
import { privateRouteMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    ...privateRouteMetadata,
    title: "Quản trị người dùng",
};

export default async function AdminUsersPage() {
    try {
        await requireSuperAdmin();
    } catch {
        redirect("/403");
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Initial page load data
    const [
        totalUsers,
        totalOrganizations,
        totalLakes,
        trialCount,
        activeCount,
        lockedCount,
        recentlyActiveCount,
        expiringSoonCount,
        expiredCount,
        users,
        plans,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count({ where: { deletedAt: null } }),
        prisma.lake.count({ where: { deletedAt: null } }),
        prisma.lake.count({ where: { subscriptionStatus: SubscriptionStatus.TRIAL, deletedAt: null } }),
        prisma.lake.count({ where: { subscriptionStatus: SubscriptionStatus.ACTIVE, deletedAt: null } }),
        prisma.user.count({ where: { isLocked: true } }),
        prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
        prisma.lake.count({
            where: {
                deletedAt: null,
                subscriptionExpiresAt: {
                    gt: now,
                    lte: sevenDaysFromNow,
                },
            },
        }),
        prisma.lake.count({
            where: {
                deletedAt: null,
                subscriptionExpiresAt: {
                    lt: now,
                },
            },
        }),
        prisma.user.findMany({
            skip: 0,
            take: 20,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                phoneVerified: true,
                systemRole: true,
                isLocked: true,
                lockedAt: true,
                lockedReason: true,
                lastLoginAt: true,
                createdAt: true,
                memberships: {
                    where: { deletedAt: null },
                    take: 5,
                    select: {
                        id: true,
                        role: true,
                        lake: {
                            select: {
                                id: true,
                                name: true,
                                subscriptionStatus: true,
                                subscriptionPlan: true,
                                subscriptionExpiresAt: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        prisma.subscriptionPlan.findMany({
            orderBy: { priceVnd: "asc" },
            select: {
                id: true,
                code: true,
                name: true,
                priceVnd: true,
                durationDays: true,
                description: true,
            },
        }),
    ]);

    const formattedUsers: UserListItem[] = users.map((u) => {
        const primaryMembership = u.memberships[0] || null;
        const lake = primaryMembership?.lake || null;

        let visualStatus = "TRIAL";
        if (u.isLocked) {
            visualStatus = "LOCKED";
        } else if (lake?.subscriptionStatus) {
            visualStatus = lake.subscriptionStatus;
        }

        return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            phoneVerified: u.phoneVerified,
            systemRole: u.systemRole,
            isLocked: u.isLocked,
            lockedAt: u.lockedAt ? u.lockedAt.toISOString() : null,
            lockedReason: u.lockedReason,
            lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
            createdAt: u.createdAt.toISOString(),
            visualStatus,
            organization: lake?.organization || null,
            lake: lake
                ? {
                      id: lake.id,
                      name: lake.name,
                      subscriptionStatus: lake.subscriptionStatus,
                      subscriptionPlan: lake.subscriptionPlan,
                      subscriptionExpiresAt: lake.subscriptionExpiresAt
                          ? lake.subscriptionExpiresAt.toISOString()
                          : null,
                  }
                : null,
            role: primaryMembership?.role || null,
            membershipCount: u.memberships.length,
        };
    });

    const initialStats: UserAdminStats = {
        totalUsers,
        totalOrganizations,
        totalLakes,
        newUsersPeriod: totalUsers,
        trialUsers: trialCount,
        activeUsers: activeCount,
        expiringSoonUsers: expiringSoonCount,
        expiredUsers: expiredCount,
        lockedUsers: lockedCount,
        recentlyActiveUsers: recentlyActiveCount,
    };

    return (
        <UsersAdminClient
            initialUsers={formattedUsers}
            initialStats={initialStats}
            initialPagination={{
                page: 1,
                limit: 20,
                total: totalUsers,
                totalPages: Math.ceil(totalUsers / 20) || 1,
            }}
            availablePlans={plans}
        />
    );
}
