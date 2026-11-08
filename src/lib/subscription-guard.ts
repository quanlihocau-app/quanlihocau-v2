import { Role, type Prisma } from "@/generated/prisma/client";
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
export async function assertSpotLimit(lakeId: string, client: Prisma.TransactionClient = prisma): Promise<void> {
    const lake = await client.lake.findUnique({
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
        const activeSpotsCount = await client.hut.count({
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
export async function assertStaffLimit(lakeId: string, client: Prisma.TransactionClient = prisma): Promise<void> {
    const lake = await client.lake.findUnique({
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
        const staffCount = await client.membership.count({
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

/** Lock, read quota and create must share this transaction on every write path. */
export async function withLakeQuota<T>(
    lakeId: string, kind: "spot" | "staff" | "owner",
    create: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Lake" WHERE "id" = ${lakeId} AND "deletedAt" IS NULL FOR UPDATE`;
        if (!rows.length) throw new ForbiddenError("Không tìm thấy hồ câu.");
        if (kind === "spot") await assertSpotLimit(lakeId, tx);
        if (kind === "staff") await assertStaffLimit(lakeId, tx);
        return create(tx);
    }, { timeout: 15000 });
}
