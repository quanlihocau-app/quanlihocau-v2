import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get("status")?.trim();
        const search = searchParams.get("q")?.trim() || "";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "15", 10)));
        const skip = (page - 1) * limit;

        const whereClause: Record<string, unknown> = {};

        if (status && status !== "ALL") {
            whereClause.status = status;
        }

        if (search) {
            whereClause.OR = [
                { phone: { contains: search, mode: "insensitive" } },
                { maskedPhone: { contains: search, mode: "insensitive" } },
                { ipAddress: { contains: search, mode: "insensitive" } },
                { provider: { contains: search, mode: "insensitive" } },
            ];
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [
            totalCount,
            totalVerified,
            totalFailed,
            sentToday,
            costAggregate,
            logs,
        ] = await Promise.all([
            prisma.otpDeliveryLog.count(),
            prisma.otpDeliveryLog.count({ where: { status: "VERIFIED" } }),
            prisma.otpDeliveryLog.count({ where: { status: "FAILED" } }),
            prisma.otpDeliveryLog.count({
                where: { createdAt: { gte: startOfToday } },
            }),
            prisma.otpDeliveryLog.aggregate({
                _sum: { costVnd: true },
            }),
            prisma.otpDeliveryLog.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);

        const filteredCount = await prisma.otpDeliveryLog.count({ where: whereClause });
        const totalCostVnd = costAggregate._sum.costVnd || 0;
        const verificationRate =
            totalCount > 0 ? Math.round((totalVerified / totalCount) * 100) : 0;

        return NextResponse.json({
            stats: {
                totalCount,
                totalVerified,
                totalFailed,
                sentToday,
                totalCostVnd,
                verificationRate,
            },
            logs,
            pagination: {
                page,
                limit,
                totalCount: filteredCount,
                totalPages: Math.ceil(filteredCount / limit) || 1,
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
        console.error("Admin OTP logs error:", err);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy danh sách nhật ký OTP." },
            { status: 500 },
        );
    }
}
