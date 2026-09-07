import { NextRequest, NextResponse } from "next/server";

import { SubscriptionOrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get("status") as SubscriptionOrderStatus | null;
        const search = searchParams.get("q")?.trim() || "";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "15", 10)));
        const skip = (page - 1) * limit;

        const whereClause: Record<string, unknown> = {};

        if (status && Object.values(SubscriptionOrderStatus).includes(status)) {
            whereClause.status = status;
        }

        if (search) {
            whereClause.OR = [
                { orderCode: { contains: search, mode: "insensitive" } },
                { bankRef: { contains: search, mode: "insensitive" } },
                { lake: { name: { contains: search, mode: "insensitive" } } },
                { organization: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        const [totalCount, orders] = await Promise.all([
            prisma.subscriptionOrder.count({ where: whereClause }),
            prisma.subscriptionOrder.findMany({
                where: whereClause,
                include: {
                    lake: {
                        select: {
                            id: true,
                            name: true,
                            subscriptionStatus: true,
                            subscriptionExpiresAt: true,
                        },
                    },
                    organization: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    plan: {
                        select: {
                            name: true,
                            priceVnd: true,
                            durationDays: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);

        return NextResponse.json({
            orders,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
        });
    } catch (err: unknown) {
        const error = err as Error;
        if (error.name === "AuthenticationError") {
            return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
        }
        if (error.name === "ForbiddenError") {
            return NextResponse.json(
                { error: "Yêu cầu quyền SUPER_ADMIN." },
                { status: 403 },
            );
        }
        console.error("Admin list orders error:", err);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy danh sách đơn hàng." },
            { status: 500 },
        );
    }
}
