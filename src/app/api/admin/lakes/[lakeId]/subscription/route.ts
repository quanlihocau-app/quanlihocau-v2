import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";

const updateSubscriptionSchema = z.object({
    status: z.nativeEnum(SubscriptionStatus),
    expiresAt: z.string().nullable().optional(),
    reason: z.string().max(255).optional(),
});

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ lakeId: string }> }
) {
    try {
        const admin = await requireSuperAdmin();
        const { lakeId } = await context.params;

        const body = await request.json();
        const parsed = updateSubscriptionSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Dữ liệu trạng thái không hợp lệ.", details: parsed.error.format() },
                { status: 400 }
            );
        }

        const lake = await prisma.lake.findUnique({
            where: { id: lakeId, deletedAt: null },
            select: {
                id: true,
                name: true,
                subscriptionStatus: true,
                subscriptionExpiresAt: true,
            },
        });

        if (!lake) {
            return NextResponse.json({ error: "Không tìm thấy hồ câu." }, { status: 404 });
        }

        const newExpiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

        const updatedLake = await prisma.lake.update({
            where: { id: lakeId },
            data: {
                subscriptionStatus: parsed.data.status,
                subscriptionExpiresAt: newExpiresAt,
            },
            select: {
                id: true,
                name: true,
                subscriptionStatus: true,
                subscriptionExpiresAt: true,
            },
        });

        // Record AuditEvent into DB as strictly mandated by PRD
        await prisma.auditEvent.create({
            data: {
                lakeId: lake.id,
                entityType: "SUBSCRIPTION",
                entityId: lake.id,
                action: "UPDATE_SUBSCRIPTION_STATUS",
                payload: JSON.stringify({
                    previousStatus: lake.subscriptionStatus,
                    newStatus: parsed.data.status,
                    previousExpiresAt: lake.subscriptionExpiresAt,
                    newExpiresAt: updatedLake.subscriptionExpiresAt,
                    reason: parsed.data.reason || "Super Admin điều chỉnh trạng thái thuê bao",
                    adminEmail: admin.email,
                    adminId: admin.id,
                    timestamp: new Date().toISOString(),
                }),
                createdBy: admin.id,
            },
        });

        return NextResponse.json({
            success: true,
            data: updatedLake,
            message: `Đã cập nhật trạng thái thuê bao hồ "${lake.name}" sang ${parsed.data.status}.`,
        });
    } catch (err: unknown) {
        const error = err as Error;
        if (error.name === "AuthenticationError") {
            return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
        }
        if (error.name === "ForbiddenError") {
            return NextResponse.json({ error: "Yêu cầu quyền SUPER_ADMIN." }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Lỗi hệ thống khi cập nhật trạng thái thuê bao." },
            { status: 500 }
        );
    }
}
