import { NextRequest, NextResponse } from "next/server";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInternalErrorResponse } from "@/lib/api-error";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        await requireSuperAdmin();
        const { userId } = await params;

        if (!userId) {
            return NextResponse.json(
                { ok: false, error: { code: "VALIDATION_ERROR", message: "Thiếu userId." }, requestId: crypto.randomUUID() },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                phoneVerified: true,
                phoneVerifiedAt: true,
                systemRole: true,
                isLocked: true,
                lockedAt: true,
                lockedReason: true,
                lastLoginAt: true,
                sessionVersion: true,
                createdAt: true,
                updatedAt: true,
                memberships: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        role: true,
                        createdAt: true,
                        lake: {
                            select: {
                                id: true,
                                name: true,
                                subscriptionStatus: true,
                                subscriptionPlan: true,
                                subscriptionExpiresAt: true,
                                createdAt: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        subscriptionPlan: true,
                                        validUntil: true,
                                        createdAt: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { ok: false, error: { code: "USER_NOT_FOUND", message: "Không tìm thấy người dùng." }, requestId: crypto.randomUUID() },
                { status: 404 },
            );
        }

        // Collect lake and organization IDs for orders and logs
        const lakeIds = user.memberships.map((m) => m.lake.id);
        const orgIds = user.memberships.map((m) => m.lake.organization.id);

        // Fetch subscription orders and audit events in parallel
        const [orders, auditLogs] = await Promise.all([
            prisma.subscriptionOrder.findMany({
                where: {
                    OR: [
                        { lakeId: { in: lakeIds } },
                        { organizationId: { in: orgIds } },
                    ],
                },
                orderBy: { createdAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    orderCode: true,
                    planCode: true,
                    amountVnd: true,
                    durationDays: true,
                    status: true,
                    paymentMethod: true,
                    paidAt: true,
                    createdAt: true,
                },
            }),
            prisma.auditEvent.findMany({
                where: {
                    OR: [
                        { entityType: "User", entityId: user.id },
                        { createdBy: user.email },
                    ],
                },
                orderBy: { createdAt: "desc" },
                take: 30,
                select: {
                    id: true,
                    action: true,
                    entityType: true,
                    entityId: true,
                    payload: true,
                    createdBy: true,
                    createdAt: true,
                },
            }),
        ]);

        // Calculate subscription remaining days for primary lake
        const primaryLake = user.memberships[0]?.lake || null;
        let daysRemaining: number | null = null;
        if (primaryLake?.subscriptionExpiresAt) {
            const diffMs = new Date(primaryLake.subscriptionExpiresAt).getTime() - Date.now();
            daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }

        return NextResponse.json({
            ok: true,
            user: {
                ...user,
                primaryLake,
                daysRemaining,
                orders,
                auditLogs: auditLogs.map((log) => {
                    let parsedPayload: Record<string, unknown> | null = null;
                    try {
                        parsedPayload = JSON.parse(log.payload);
                    } catch {
                        parsedPayload = { raw: log.payload };
                    }
                    return {
                        id: log.id,
                        action: log.action,
                        createdBy: log.createdBy,
                        createdAt: log.createdAt,
                        payload: parsedPayload,
                    };
                }),
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
        return createInternalErrorResponse("admin-user-detail", err, "Không thể tải chi tiết người dùng.");
    }
}
