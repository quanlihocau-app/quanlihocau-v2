import { prisma } from "@/lib/prisma";

export const DUMMY_BANK_REF_REGEX =
    /^(none|na|n\/a|null|undefined|0|khong|khong co|không có|chua co|chưa có|test|fake|dummy)$/i;

export interface ConfirmManualSubscriptionOrderInput {
    orderId: string;
    admin: {
        id: string;
        email: string;
        name: string;
    };
    reconciliationMethod: "BANK_STATEMENT" | "CASH" | "DIRECT_VERIFICATION" | "OTHER";
    reason: string;
    bankRef?: string | null;
    expectedAmountVnd?: number;
    expectedPlanCode?: string;
    expectedOrganizationId?: string;
}

export interface ConfirmManualSubscriptionOrderSuccessResult {
    alreadyPaid: false;
    order: {
        id: string;
        orderCode: string;
        status: string;
        amountVnd: number;
        planCode: string;
        paidAt: Date | null;
        bankRef: string | null;
    };
    lake: {
        id: string;
        subscriptionStatus: string;
        subscriptionPlan: string;
        subscriptionExpiresAt: Date | null;
    };
    newExpiresAt: Date;
    auditEventId: string;
}

export interface ConfirmManualSubscriptionOrderAlreadyPaidResult {
    alreadyPaid: true;
    order: unknown;
    message: string;
}

export type ConfirmManualSubscriptionOrderResult =
    | ConfirmManualSubscriptionOrderSuccessResult
    | ConfirmManualSubscriptionOrderAlreadyPaidResult;

/**
 * Service xử lý xác nhận thanh toán thủ công cho SubscriptionOrder bởi SUPER_ADMIN.
 * 
 * Đảm bảo:
 * - Khóa hàng (Row-level lock FOR UPDATE) trên SubscriptionOrder và Lake để chống race condition.
 * - Idempotency: Chỉ chuyển trạng thái PENDING -> PAID đúng một lần duy nhất.
 * - Kiểm tra tính toàn vẹn: số tiền, gói cước, hồ câu, tổ chức.
 * - Tính ngày hết hạn chuẩn (gia hạn nối tiếp nếu còn hạn, hoặc từ thời điểm xác nhận nếu đã hết hạn).
 * - Không tạo mã giao dịch ngân hàng giả mạo (nếu không có mã phải lưu null và bắt buộc có lý do đối soát chi tiết).
 * - Ghi nhận AuditEvent đầy đủ và nguyên tử trong cùng transaction.
 */
export async function confirmManualSubscriptionOrder(
    input: ConfirmManualSubscriptionOrderInput,
): Promise<ConfirmManualSubscriptionOrderResult> {
    const {
        orderId,
        admin,
        reconciliationMethod,
        reason,
        bankRef,
        expectedAmountVnd,
        expectedPlanCode,
        expectedOrganizationId,
    } = input;

    const trimmedReason = reason?.trim() || "";
    if (trimmedReason.length < 5) {
        throw new Error("REASON_TOO_SHORT");
    }

    const trimmedBankRef = bankRef?.trim() || null;
    if (trimmedBankRef) {
        if (DUMMY_BANK_REF_REGEX.test(trimmedBankRef)) {
            throw new Error("INVALID_BANK_REF_DUMMY");
        }
        if (trimmedBankRef.length < 3) {
            throw new Error("INVALID_BANK_REF_TOO_SHORT");
        }
    } else {
        // When bankRef is empty, detailed reason is required
        if (trimmedReason.length < 10) {
            throw new Error("DETAILED_REASON_REQUIRED_WITHOUT_BANK_REF");
        }
    }

    const effectiveBankRef = trimmedBankRef;

    return await prisma.$transaction(async (tx) => {
        // 1. Row lock on SubscriptionOrder to prevent concurrent double-confirmations
        await tx.$queryRaw`SELECT "id" FROM "SubscriptionOrder" WHERE "id" = ${orderId} FOR UPDATE`;

        const order = await tx.subscriptionOrder.findUnique({
            where: { id: orderId },
            include: {
                lake: true,
                organization: true,
                plan: true,
            },
        });

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        // Verify order status
        if (order.status === "PAID") {
            return {
                alreadyPaid: true,
                order,
                message: "Đơn hàng này đã được xác nhận thanh toán trước đó.",
            };
        }

        if (order.status === "CANCELLED") {
            throw new Error("ORDER_CANCELLED");
        }

        if (order.status === "EXPIRED") {
            throw new Error("ORDER_EXPIRED");
        }

        if (order.status !== "PENDING") {
            throw new Error("INVALID_ORDER_STATUS");
        }

        // Verify lake & organization association
        if (!order.lake || !order.organization) {
            throw new Error("INVALID_LAKE_OR_ORG");
        }

        if (order.lake.organizationId !== order.organizationId) {
            throw new Error("ORG_MISMATCH");
        }

        if (expectedOrganizationId && order.organizationId !== expectedOrganizationId) {
            throw new Error("ORG_MISMATCH");
        }

        // Verify plan existence
        if (!order.plan) {
            throw new Error("PLAN_NOT_FOUND");
        }

        // Verify amount integrity
        if (order.amountVnd <= 0) {
            throw new Error("INVALID_AMOUNT");
        }

        if (order.amountVnd < order.plan.priceVnd) {
            throw new Error("INVALID_AMOUNT");
        }

        if (expectedAmountVnd !== undefined && order.amountVnd !== expectedAmountVnd) {
            throw new Error("AMOUNT_MISMATCH");
        }

        if (expectedPlanCode !== undefined && order.planCode !== expectedPlanCode) {
            throw new Error("PLAN_MISMATCH");
        }

        // 2. Lock the Lake row for update to serialize any concurrent extensions on the same lake
        await tx.$queryRaw`SELECT "id" FROM "Lake" WHERE "id" = ${order.lakeId} FOR UPDATE`;

        // Re-fetch lake inside lock to ensure freshest subscriptionExpiresAt
        const currentLake = await tx.lake.findUniqueOrThrow({
            where: { id: order.lakeId },
        });

        const now = new Date();
        const currentExpiresAt = currentLake.subscriptionExpiresAt;

        // Quy tắc gia hạn chuẩn:
        // - Nếu còn hạn dùng thử hoặc gói cũ chưa hết (currentExpiresAt > now): cộng dồn tiếp vào hạn cũ của hồ câu
        // - Nếu đã hết hạn hoặc chưa có hạn: tính từ thời điểm xác nhận hiện tại (now)
        const baseDate =
            currentExpiresAt && currentExpiresAt.getTime() > now.getTime()
                ? currentExpiresAt
                : now;

        const durationDays = order.durationDays || order.plan.durationDays || 30;
        const durationMs = durationDays * 24 * 60 * 60 * 1000;
        const newExpiresAt = new Date(baseDate.getTime() + durationMs);

        // 3. Atomic update on SubscriptionOrder: ensure status is still PENDING
        const updateCount = await tx.subscriptionOrder.updateMany({
            where: {
                id: order.id,
                status: "PENDING",
            },
            data: {
                status: "PAID",
                paidAt: now,
                bankRef: effectiveBankRef,
                rawWebhookPayload: JSON.stringify({
                    source: "MANUAL_SUPERADMIN_RECONCILIATION",
                    reconciliationMethod,
                    confirmedBy: admin.email,
                    adminId: admin.id,
                    reason: trimmedReason,
                    hasBankRef: Boolean(effectiveBankRef),
                    isManualReconciled: true,
                    isAutomatedBankProof: false,
                    note: "Xác nhận thủ công bởi Quản trị viên dựa trên đối soát thực tế. Lý do do admin nhập không phải bằng chứng ngân hàng tự động.",
                    timestamp: now.toISOString(),
                }),
            },
        });

        if (updateCount.count === 0) {
            // Another concurrent request already confirmed it
            return {
                alreadyPaid: true,
                order,
                message: "Đơn hàng này đã được xác nhận thanh toán trước đó.",
            };
        }

        // Fetch freshly updated order record
        const updatedOrder = await tx.subscriptionOrder.findUniqueOrThrow({
            where: { id: order.id },
        });

        // 4. Update Lake subscription
        const updatedLake = await tx.lake.update({
            where: { id: order.lakeId },
            data: {
                subscriptionStatus: "ACTIVE",
                subscriptionPlan: order.planCode,
                subscriptionExpiresAt: newExpiresAt,
            },
        });

        // 5. Update Organization subscription
        const currentOrg = await tx.organization.findUnique({
            where: { id: order.organizationId },
        });
        const orgValidUntil =
            currentOrg?.validUntil && currentOrg.validUntil.getTime() > newExpiresAt.getTime()
                ? currentOrg.validUntil
                : newExpiresAt;

        await tx.organization.update({
            where: { id: order.organizationId },
            data: {
                subscriptionPlan: order.planCode,
                validUntil: orgValidUntil,
            },
        });

        // 6. Ghi nhận AuditEvent đầy đủ thông tin đối soát trong cùng transaction
        const auditEvent = await tx.auditEvent.create({
            data: {
                lakeId: order.lakeId,
                entityType: "SUBSCRIPTION_ORDER",
                entityId: order.id,
                action: "MANUAL_PAYMENT_CONFIRM",
                payload: JSON.stringify({
                    orderCode: order.orderCode,
                    planCode: order.planCode,
                    amountVnd: order.amountVnd,
                    durationDays,
                    reconciliationMethod,
                    previousStatus: currentLake.subscriptionStatus,
                    previousExpiresAt: currentExpiresAt,
                    newExpiresAt,
                    confirmedByAdminEmail: admin.email,
                    confirmedByAdminId: admin.id,
                    reason: trimmedReason,
                    bankRef: effectiveBankRef,
                    hasBankRef: Boolean(effectiveBankRef),
                    isManualReconciled: true,
                    isAutomatedBankProof: false,
                    note: "Đối soát thủ công có căn cứ xác thực, không tạo mã giao dịch giả.",
                    timestamp: now.toISOString(),
                }),
                createdBy: admin.email,
            },
        });

        return {
            alreadyPaid: false,
            order: updatedOrder,
            lake: updatedLake,
            newExpiresAt,
            auditEventId: auditEvent.id,
        };
    });
}
