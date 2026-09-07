import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";

const confirmOrderSchema = z.object({
    reason: z
        .string()
        .min(5, "Vui lòng nhập lý do xác nhận (ít nhất 5 ký tự).")
        .max(500, "Lý do không được vượt quá 500 ký tự."),
    bankRef: z.string().max(100).optional(),
});

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ orderId: string }> },
) {
    try {
        const admin = await requireSuperAdmin();
        const { orderId } = await context.params;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = confirmOrderSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu xác nhận không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { reason, bankRef } = parsed.data;

        // Core Transaction with exact rollover rules
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.subscriptionOrder.findUnique({
                where: { id: orderId },
                include: {
                    lake: true,
                    organization: true,
                },
            });

            if (!order) {
                throw new Error("ORDER_NOT_FOUND");
            }

            if (order.status === "PAID") {
                return {
                    alreadyPaid: true,
                    order,
                    message: "Đơn hàng này đã được xác nhận thanh toán trước đó.",
                };
            }

            const now = new Date();
            const currentExpiresAt = order.lake.subscriptionExpiresAt;
            const durationDays = order.durationDays || 30;
            const durationMs = durationDays * 24 * 60 * 60 * 1000;

            // Quy tắc gia hạn chuẩn:
            // - Nếu còn hạn dùng thử hoặc gói cũ chưa hết: cộng dồn tiếp vào hạn cũ
            // - Nếu đã hết hạn: tính từ thời điểm xác nhận hiện tại
            const baseDate =
                currentExpiresAt && currentExpiresAt.getTime() > now.getTime()
                    ? currentExpiresAt
                    : now;
            const newExpiresAt = new Date(baseDate.getTime() + durationMs);

            const effectiveBankRef =
                bankRef?.trim() || `MANUAL_${admin.id.slice(0, 8)}_${Date.now()}`;

            // 1. Cập nhật SubscriptionOrder
            const updatedOrder = await tx.subscriptionOrder.update({
                where: { id: order.id },
                data: {
                    status: "PAID",
                    paidAt: now,
                    bankRef: effectiveBankRef,
                    rawWebhookPayload: JSON.stringify({
                        source: "MANUAL_SUPERADMIN_CONFIRMATION",
                        confirmedBy: admin.email,
                        adminId: admin.id,
                        reason,
                        timestamp: now.toISOString(),
                    }),
                },
            });

            // 2. Cập nhật Lake
            const updatedLake = await tx.lake.update({
                where: { id: order.lakeId },
                data: {
                    subscriptionStatus: "ACTIVE",
                    subscriptionPlan: order.planCode,
                    subscriptionExpiresAt: newExpiresAt,
                },
            });

            // 3. Cập nhật Organization
            await tx.organization.update({
                where: { id: order.organizationId },
                data: {
                    subscriptionPlan: order.planCode,
                    validUntil: newExpiresAt,
                },
            });

            // 4. Ghi AuditEvent
            await tx.auditEvent.create({
                data: {
                    lakeId: order.lakeId,
                    entityType: "SUBSCRIPTION",
                    entityId: order.id,
                    action: "MANUAL_PAYMENT_CONFIRM",
                    payload: JSON.stringify({
                        orderCode: order.orderCode,
                        planCode: order.planCode,
                        amountVnd: order.amountVnd,
                        previousStatus: order.lake.subscriptionStatus,
                        previousExpiresAt: currentExpiresAt,
                        newExpiresAt,
                        confirmedByAdminEmail: admin.email,
                        confirmedByAdminId: admin.id,
                        reason,
                        bankRef: effectiveBankRef,
                        timestamp: now.toISOString(),
                    }),
                    createdBy: admin.id,
                },
            });

            return {
                alreadyPaid: false,
                order: updatedOrder,
                lake: updatedLake,
                newExpiresAt,
            };
        });

        if (result.alreadyPaid) {
            return NextResponse.json(
                {
                    success: true,
                    message: result.message,
                    order: result.order,
                },
                { status: 200 },
            );
        }

        const formattedDate = result.newExpiresAt
            ? result.newExpiresAt.toLocaleDateString("vi-VN")
            : "kỳ tiếp theo";

        return NextResponse.json(
            {
                success: true,
                message: `Đã xác nhận thanh toán thủ công và gia hạn thành công đến ${formattedDate}.`,
                order: result.order,
                lake: result.lake,
            },
            { status: 200 },
        );
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
        if (error.message === "ORDER_NOT_FOUND") {
            return NextResponse.json(
                { error: "Không tìm thấy đơn hàng." },
                { status: 404 },
            );
        }

        console.error("Admin confirm order error:", err);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi xác nhận đơn hàng." },
            { status: 500 },
        );
    }
}
