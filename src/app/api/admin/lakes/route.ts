import { NextRequest, NextResponse } from "next/server";
import { Role, SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "10", 10)));
        const statusFilter = searchParams.get("status") as SubscriptionStatus | null;
        const search = searchParams.get("search")?.trim() || "";

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Build where condition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            deletedAt: null,
        };

        if (statusFilter && Object.values(SubscriptionStatus).includes(statusFilter)) {
            where.subscriptionStatus = statusFilter;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { organization: { name: { contains: search, mode: "insensitive" } } },
                {
                    memberships: {
                        some: {
                            role: Role.OWNER,
                            deletedAt: null,
                            user: {
                                OR: [
                                    { name: { contains: search, mode: "insensitive" } },
                                    { phone: { contains: search, mode: "insensitive" } },
                                    { email: { contains: search, mode: "insensitive" } },
                                ],
                            },
                        },
                    },
                },
            ];
        }

        const [totalCount, lakes] = await Promise.all([
            prisma.lake.count({ where }),
            prisma.lake.findMany({
                where,
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
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        // Aggregate high-level stats for dashboard pills
        const [totalLakes, activeCount, trialCount, graceCount, suspendedCount] = await Promise.all([
            prisma.lake.count({ where: { deletedAt: null } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.ACTIVE } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.TRIAL } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.GRACE_PERIOD } }),
            prisma.lake.count({ where: { deletedAt: null, subscriptionStatus: SubscriptionStatus.SUSPENDED } }),
        ]);

        return NextResponse.json({
            data: lakes.map((lake) => {
                const owner = lake.memberships[0]?.user || null;
                return {
                    id: lake.id,
                    lakeName: lake.name,
                    organizationName: lake.organization.name,
                    ownerName: owner?.name || "Chưa có chủ sở hữu",
                    ownerPhone: owner?.phone || "—",
                    ownerEmail: owner?.email || "—",
                    subscriptionStatus: lake.subscriptionStatus,
                    subscriptionExpiresAt: lake.subscriptionExpiresAt,
                    currentMonthSessionsCount: lake._count.fishingSessions,
                    currentMonthInvoicesCount: lake._count.invoices,
                    createdAt: lake.createdAt,
                };
            }),
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
            stats: {
                totalLakes,
                activeCount,
                trialCount,
                graceCount,
                suspendedCount,
            },
        });
    } catch (err: unknown) {
        const error = err as Error;
        if (error.name === "AuthenticationError") {
            return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
        }
        if (error.name === "ForbiddenError") {
            return NextResponse.json({ error: "Yêu cầu quyền SUPER_ADMIN." }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống khi tải danh sách hồ." }, { status: 500 });
    }
}
