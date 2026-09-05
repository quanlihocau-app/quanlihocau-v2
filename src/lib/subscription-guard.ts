import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/tenant";

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

    // Gói Bạc (SILVER) giới hạn tối đa 30 ô câu
    if (lake.subscriptionPlan === "SILVER") {
        const activeSpotsCount = await prisma.hut.count({
            where: {
                lakeId,
                deletedAt: null,
            },
        });

        if (activeSpotsCount >= 30) {
            throw new SubscriptionQuotaExceededError(
                "Gói Bạc (SILVER) chỉ hỗ trợ tối đa 30 ô câu. Vui lòng nâng cấp lên Gói Vàng (GOLD) để tạo thêm ô câu không giới hạn.",
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

    // Gói Bạc (SILVER) giới hạn tối đa 1 nhân viên (STAFF hoặc MANAGER, không tính OWNER)
    if (lake.subscriptionPlan === "SILVER") {
        const staffCount = await prisma.membership.count({
            where: {
                lakeId,
                deletedAt: null,
                role: {
                    in: [Role.STAFF, Role.MANAGER],
                },
            },
        });

        if (staffCount >= 1) {
            throw new SubscriptionQuotaExceededError(
                "Gói Bạc (SILVER) chỉ hỗ trợ tối đa 1 nhân viên. Vui lòng nâng cấp lên Gói Vàng (GOLD) để thêm nhân sự không giới hạn.",
            );
        }
    }
}
