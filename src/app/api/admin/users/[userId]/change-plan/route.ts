import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInternalErrorResponse } from "@/lib/api-error";
import { createAdminAuditEvent } from "@/lib/admin-audit";
import { PlanTier, SubscriptionStatus } from "@/generated/prisma/client";

const changePlanSchema = z.object({
    planCode: z.nativeEnum(PlanTier),
    days: z.number().int().min(1).max(3650).optional(),
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
        const parsed = changePlanSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." }, requestId },
                { status: 400 },
            );
        }

        const { planCode, days, reason } = parsed.data;

        // Verify plan exists in database
        const targetPlan = await prisma.subscriptionPlan.findUnique({
            where: { code: planCode },
        });

        if (!targetPlan) {
            return NextResponse.json(
                { ok: false, error: { code: "PLAN_NOT_FOUND", message: `Không tìm thấy gói ${planCode} trong hệ thống.` }, requestId },
                { status: 404 },
            );
        }

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
                                subscriptionPlan: true,
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
                { ok: false, error: { code: "NO_LAKE_FOUND", message: "Người dùng chưa được gán hồ câu nào." }, requestId },
                { status: 400 },
            );
        }

        const now = new Date();
        const prevPlan = primaryLake.subscriptionPlan;
        const prevExpiresAt = primaryLake.subscriptionExpiresAt;

        // Calculate new expiration
        let newExpiresAt: Date;
        if (days) {
            // Explicit days provided
            const baseDate = prevExpiresAt && new Date(prevExpiresAt) > now ? new Date(prevExpiresAt) : now;
            newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        } else if (prevExpiresAt && new Date(prevExpiresAt) > now) {
            // Keep current expiration if still active
            newExpiresAt = new Date(prevExpiresAt);
        } else {
            // Default to plan's durationDays
            newExpiresAt = new Date(now.getTime() + (targetPlan.durationDays || 30) * 24 * 60 * 60 * 1000);
        }

        const newStatus =
            planCode === PlanTier.TRIAL ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;

        await prisma.$transaction([
            prisma.lake.update({
                where: { id: primaryLake.id },
                data: {
                    subscriptionPlan: planCode,
                    subscriptionStatus: newStatus,
                    subscriptionExpiresAt: newExpiresAt,
                },
            }),
            prisma.organization.update({
                where: { id: primaryLake.organizationId },
                data: {
                    subscriptionPlan: planCode,
                    validUntil: newExpiresAt,
                },
            }),
        ]);

        await createAdminAuditEvent({
            action: "PLAN_CHANGED",
            actorEmail: admin.email,
            targetUserId: user.id,
            lakeId: primaryLake.id,
            reason: reason || `Đổi gói từ ${prevPlan} sang ${planCode} bởi SUPER_ADMIN`,
            metadata: {
                previousPlan: prevPlan,
                newPlan: planCode,
                previousExpiresAt: prevExpiresAt?.toISOString() || null,
                newExpiresAt: newExpiresAt.toISOString(),
                isManualAdminChange: true,
            },
            requestId,
        });

        return NextResponse.json({
            ok: true,
            lakeId: primaryLake.id,
            previousPlan: prevPlan,
            newPlan: planCode,
            newExpiresAt,
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
        return createInternalErrorResponse("admin-change-plan", err, "Không thể thay đổi gói dịch vụ.");
    }
}
