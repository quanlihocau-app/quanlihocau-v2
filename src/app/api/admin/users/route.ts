import { NextRequest, NextResponse } from "next/server";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInternalErrorResponse } from "@/lib/api-error";
import { PlanTier, Prisma, SubscriptionStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const q = searchParams.get("q")?.trim() || "";
        const status = searchParams.get("status") || "ALL";
        const plan = searchParams.get("plan") || "ALL";
        const range = searchParams.get("range") || "all";

        const now = new Date();

        // Calculate date boundary for range
        let rangeStartDate: Date | null = null;
        if (range === "today") {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            rangeStartDate = start;
        } else if (range === "7d") {
            rangeStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === "30d") {
            rangeStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (range === "month") {
            rangeStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Build Where Clause
        const where: Prisma.UserWhereInput = {};

        if (rangeStartDate) {
            where.createdAt = { gte: rangeStartDate };
        }

        if (q) {
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                {
                    memberships: {
                        some: {
                            lake: {
                                name: { contains: q, mode: "insensitive" },
                            },
                        },
                    },
                },
            ];
        }

        if (status === "LOCKED") {
            where.isLocked = true;
            if (plan !== "ALL" && Object.values(PlanTier).includes(plan as PlanTier)) {
                where.memberships = {
                    some: {
                        lake: {
                            subscriptionPlan: plan as PlanTier,
                        },
                    },
                };
            }
        } else if (status !== "ALL" && Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
            where.isLocked = false;
            where.memberships = {
                some: {
                    lake: {
                        subscriptionStatus: status as SubscriptionStatus,
                        ...(plan !== "ALL" && Object.values(PlanTier).includes(plan as PlanTier)
                            ? { subscriptionPlan: plan as PlanTier }
                            : {}),
                    },
                },
            };
        } else if (plan !== "ALL" && Object.values(PlanTier).includes(plan as PlanTier)) {
            where.memberships = {
                some: {
                    lake: {
                        subscriptionPlan: plan as PlanTier,
                    },
                },
            };
        }

        const skip = (page - 1) * limit;

        // Fetch paginated users and total count
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
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
            prisma.user.count({ where }),
        ]);

        // Compute Overview Dashboard Metrics
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            totalOrganizations,
            totalLakes,
            newUsersPeriod,
            trialCount,
            activeCount,
            lockedCount,
            recentlyActiveCount,
            expiringSoonCount,
            expiredCount,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.organization.count({ where: { deletedAt: null } }),
            prisma.lake.count({ where: { deletedAt: null } }),
            rangeStartDate ? prisma.user.count({ where: { createdAt: { gte: rangeStartDate } } }) : prisma.user.count(),
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
        ]);

        // Format items for response
        const formattedUsers = users.map((u) => {
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
                lockedAt: u.lockedAt,
                lockedReason: u.lockedReason,
                lastLoginAt: u.lastLoginAt,
                createdAt: u.createdAt,
                visualStatus,
                organization: lake?.organization || null,
                lake: lake
                    ? {
                          id: lake.id,
                          name: lake.name,
                          subscriptionStatus: lake.subscriptionStatus,
                          subscriptionPlan: lake.subscriptionPlan,
                          subscriptionExpiresAt: lake.subscriptionExpiresAt,
                      }
                    : null,
                role: primaryMembership?.role || null,
                membershipCount: u.memberships.length,
            };
        });

        return NextResponse.json({
            ok: true,
            metrics: {
                totalUsers,
                totalOrganizations,
                totalLakes,
                newUsersPeriod,
                trialUsers: trialCount,
                activeUsers: activeCount,
                expiringSoonUsers: expiringSoonCount,
                expiredUsers: expiredCount,
                lockedUsers: lockedCount,
                recentlyActiveUsers: recentlyActiveCount,
            },
            users: formattedUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (err) {
        if (err instanceof AuthenticationError) {
            return NextResponse.json(
                { ok: false, error: { code: "UNAUTHORIZED", message: err.message }, requestId: crypto.randomUUID() },
                { status: 401 },
            );
        }
        if (err instanceof ForbiddenError) {
            return NextResponse.json(
                { ok: false, error: { code: "FORBIDDEN", message: err.message }, requestId: crypto.randomUUID() },
                { status: 403 },
            );
        }
        return createInternalErrorResponse("admin-users-list", err, "Không thể tải danh sách người dùng.");
    }
}
