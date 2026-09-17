import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInternalErrorResponse } from "@/lib/api-error";
import { createAdminAuditEvent } from "@/lib/admin-audit";
import { PlanTier, SubscriptionStatus } from "@/generated/prisma/client";

const extendTrialSchema = z.object({
    days: z.number().int().min(1, "Số ngày gia hạn phải từ 1 trở lên.").max(365, "Tối đa 365 ngày."),
    reason: z.string().trim().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    const requestId = crypto.randomUUID();
    try {
        const admin = await requireSuperAdmin();
        const { userId } = await params;

        const body = await request.json().catch(() => ({}));
        const parsed = extendTrialSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Số ngày gia hạn không hợp lệ." }, requestId },
                { status: 400 },
            );
        }

        const { days, reason } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                memberships: {
                    where: { deletedAt: null },
                    select: {
                        lake: {
                            select: {
                                id: true,
                                name: true,
                                subscriptionStatus: true,
                                subscriptionExpiresAt: true,
                                organizationId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { ok: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." }, requestId },
                { status: 404 },
            );
        }

        const primaryLake = user.memberships[0]?.lake;
        if (!primaryLake) {
            return NextResponse.json(
                { ok: false, error: { code: "NO_LAKE_FOUND", message: "Người dùng chưa thuộc về hồ câu nào để gia hạn dùng thử." }, requestId },
                { status: 400 },
            );
        }

        const now = new Date();
        const prevExpiresAt = primaryLake.subscriptionExpiresAt;
        const baseDate = prevExpiresAt && new Date(prevExpiresAt) > now ? new Date(prevExpiresAt) : now;
        const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

        // Transaction to update both Lake and Organization
        await prisma.$transaction([
            prisma.lake.update({
                where: { id: primaryLake.id },
                data: {
                    subscriptionStatus: SubscriptionStatus.TRIAL,
                    subscriptionPlan: PlanTier.TRIAL,
                    subscriptionExpiresAt: newExpiresAt,
                },
            }),
            prisma.organization.update({
                where: { id: primaryLake.organizationId },
                data: {
                    subscriptionPlan: PlanTier.TRIAL,
                    validUntil: newExpiresAt,
                },
            }),
        ]);

        await createAdminAuditEvent({
            action: "TRIAL_EXTENDED",
            actorEmail: admin.email,
            targetUserId: user.id,
            lakeId: primaryLake.id,
            reason: reason || `Gia hạn dùng thử +${days} ngày`,
            metadata: {
                addedDays: days,
                previousExpiresAt: prevExpiresAt?.toISOString() || null,
                newExpiresAt: newExpiresAt.toISOString(),
            },
            requestId,
        });

        return NextResponse.json({
            ok: true,
            lakeId: primaryLake.id,
            previousExpiresAt: prevExpiresAt,
            newExpiresAt,
            addedDays: days,
            requestId,
        });
    } catch (err) {
        if (err instanceof AuthenticationError) {
            return NextResponse.json(
                { ok: false, error: { code: "UNAUTHORIZED", message: err.message }, requestId },
                { status: 401 },
            );
        }
        if (err instanceof ForbiddenError) {
            return NextResponse.json(
                { ok: false, error: { code: "FORBIDDEN", message: err.message }, requestId },
                { status: 403 },
            );
        }
        return createInternalErrorResponse("admin-extend-trial", err, "Không thể gia hạn dùng thử.");
    }
}
