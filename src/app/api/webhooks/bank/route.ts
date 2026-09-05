import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Helper to verify webhook authenticity
 */
function verifyWebhookSecurity(request: Request, rawBody: string): boolean {
    const secret = process.env.BANK_WEBHOOK_SECRET;
    // If no secret configured in development, allow requests for local testing
    if (!secret) {
        return true;
    }

    // 1. Check Bearer token or API key header
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");

    if (authHeader && authHeader.replace(/^Bearer\s+/i, "").trim() === secret) {
        return true;
    }

    if (apiKeyHeader && apiKeyHeader.trim() === secret) {
        return true;
    }

    // 2. Check HMAC signature if present
    const signature = request.headers.get("x-signature") || request.headers.get("x-hub-signature");
    if (signature) {
        const expectedSig = crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");
        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
            return true;
        }
    }

    return false;
}

export async function POST(request: Request) {
    let rawBody = "";
    try {
        rawBody = await request.text();
    } catch {
        return NextResponse.json({ error: "Không đọc được body yêu cầu." }, { status: 400 });
    }

    // 1. Security Check
    if (!verifyWebhookSecurity(request, rawBody)) {
        return NextResponse.json(
            { error: "Xác thực chữ ký / API key không hợp lệ." },
            { status: 401 },
        );
    }

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
    }

    // Support single transaction object or SePay/Casso webhook format
    // Common fields: content/description/memo, transferAmount/amount, referenceCode/transactionId/id
    const content = String(
        body.content ||
        body.description ||
        body.transferContent ||
        body.memo ||
        body.orderCode ||
        "",
    );

    const amountRaw =
        body.transferAmount !== undefined
            ? body.transferAmount
            : body.amount !== undefined
              ? body.amount
              : body.amountIn;

    const transferAmount = Number(amountRaw);
    const transactionRef = String(
        body.referenceCode ||
        body.transactionId ||
        body.reference ||
        body.id ||
        `REF_${Date.now()}`,
    );

    // Extract orderCode (e.g. HC123456 or HOCAU HC123456)
    const codeMatch = content.match(/\b(HC[A-Z0-9]{4,10})\b/i);
    if (!codeMatch) {
        return NextResponse.json(
            { error: "Không tìm thấy mã đơn hàng HC... trong nội dung giao dịch." },
            { status: 400 },
        );
    }

    const orderCode = codeMatch[1].toUpperCase();

    try {
        // 2. Core Transaction with Idempotency
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.subscriptionOrder.findUnique({
                where: { orderCode },
                include: {
                    lake: true,
                    organization: true,
                },
            });

            if (!order) {
                throw new Error("ORDER_NOT_FOUND");
            }

            // IDEMPOTENCY CHECK: If already paid, return immediately without re-adding time!
            if (order.status === "PAID") {
                return {
                    idempotent: true,
                    orderId: order.id,
                    orderCode: order.orderCode,
                    message: "Đơn hàng đã được ghi nhận thanh toán trước đó (Idempotent).",
                };
            }

            // Verify amount
            if (transferAmount && transferAmount < order.amountVnd) {
                throw new Error("INSUFFICIENT_AMOUNT");
            }

            const now = new Date();
            const currentExpiresAt = order.lake.subscriptionExpiresAt;
            const durationDays = order.durationDays || 30;
            const durationMs = durationDays * 24 * 60 * 60 * 1000;

            // Cộng dồn thời gian: Nếu hạn cũ còn dài hơn hiện tại thì cộng thêm vào hạn cũ, nếu không thì lấy now + 30 ngày
            const baseDate =
                currentExpiresAt && currentExpiresAt.getTime() > now.getTime()
                    ? currentExpiresAt
                    : now;
            const newExpiresAt = new Date(baseDate.getTime() + durationMs);

            // 1. Update Order to PAID
            const updatedOrder = await tx.subscriptionOrder.update({
                where: { id: order.id },
                data: {
                    status: "PAID",
                    paidAt: now,
                    bankRef: transactionRef,
                    rawWebhookPayload: rawBody,
                },
            });

            // 2. Update Organization
            await tx.organization.update({
                where: { id: order.organizationId },
                data: {
                    validUntil: newExpiresAt,
                    subscriptionPlan: order.planCode,
                },
            });

            // 3. Update Lake
            await tx.lake.update({
                where: { id: order.lakeId },
                data: {
                    subscriptionStatus: "ACTIVE",
                    subscriptionPlan: order.planCode,
                    subscriptionExpiresAt: newExpiresAt,
                },
            });

            // 4. Create AuditEvent
            await tx.auditEvent.create({
                data: {
                    lakeId: order.lakeId,
                    entityType: "SUBSCRIPTION",
                    entityId: order.id,
                    action: "PLAN_ACTIVATED",
                    payload: JSON.stringify({
                        orderCode: order.orderCode,
                        planCode: order.planCode,
                        amountVnd: order.amountVnd,
                        previousExpiresAt: currentExpiresAt,
                        newExpiresAt,
                        bankRef: transactionRef,
                    }),
                    createdBy: "WEBHOOK_BANK",
                },
            });

            return {
                idempotent: false,
                orderId: updatedOrder.id,
                orderCode: updatedOrder.orderCode,
                planCode: updatedOrder.planCode,
                previousExpiresAt: currentExpiresAt,
                newExpiresAt,
            };
        });

        return NextResponse.json(
            {
                success: true,
                message: result.idempotent
                    ? "Giao dịch đã xử lý trước đó (Idempotent)."
                    : "Kích hoạt gia hạn thành công.",
                data: result,
            },
            { status: 200 },
        );
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "";
        if (errorMessage === "ORDER_NOT_FOUND") {
            return NextResponse.json(
                { error: `Không tìm thấy đơn hàng ${orderCode}.` },
                { status: 404 },
            );
        }
        if (errorMessage === "INSUFFICIENT_AMOUNT") {
            return NextResponse.json(
                { error: "Số tiền chuyển khoản không đủ theo giá trị đơn hàng." },
                { status: 400 },
            );
        }
        console.error("Bank webhook error:", err);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi xử lý giao dịch ngân hàng." },
            { status: 500 },
        );
    }
}
