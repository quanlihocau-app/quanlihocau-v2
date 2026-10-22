import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/tenant";
import { PLAN_PRICING } from "@/lib/vietqr";

export class SubscriptionQuotaExceededError extends ForbiddenError {
    public code = "QUOTA_EXCEEDED";

    constructor(message: string) {
        super(message);
        this.name = "SubscriptionQuotaExceededError";
    }
}

/**
 * Kiểm tra giới hạn ô câu (spots / huts) theo gói cước của hồ
 */
export async function assertSpotLimit(lakeId: string): Promise<void> {
    const lake = await prisma.lake.findUnique({
        where: { id: lakeId },
        select: {
            id: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
        },
    });

    if (!lake) {
        return;
    }

    const maxSpots = PLAN_PRICING.SILVER.maxSpots;
    if (lake.subscriptionPlan === "SILVER" && maxSpots !== null) {
        const activeSpotsCount = await prisma.hut.count({
            where: {
                lakeId,
                deletedAt: null,
            },
        });

        if (activeSpotsCount >= maxSpots) {
            throw new SubscriptionQuotaExceededError(
                `Gói Bạc chỉ hỗ trợ tối đa ${maxSpots} ô câu. Vui lòng nâng cấp lên Gói Vàng để tạo thêm ô câu không giới hạn.`,
            );
        }
    }
}

/**
 * Kiểm tra giới hạn nhân sự (staff / manager) theo gói cước của hồ
 */
export async function assertStaffLimit(lakeId: string): Promise<void> {
    const lake = await prisma.lake.findUnique({
        where: { id: lakeId },
        select: {
            id: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
        },
    });

    if (!lake) {
        return;
    }

    const maxStaff = PLAN_PRICING.SILVER.maxStaff;
    if (lake.subscriptionPlan === "SILVER" && maxStaff !== null) {
        const staffCount = await prisma.membership.count({
            where: {
                lakeId,
                deletedAt: null,
                role: {
                    in: [Role.STAFF, Role.MANAGER],
                },
            },
        });

        if (staffCount >= maxStaff) {
            throw new SubscriptionQuotaExceededError(
                `Gói Bạc chỉ gồm chủ hồ và tối đa ${maxStaff} tài khoản nhân sự. Vui lòng nâng cấp lên Gói Vàng để thêm người.`,
            );
        }
    }
}
