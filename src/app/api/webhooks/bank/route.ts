import { NextResponse } from "next/server";

import { verifyWebhookSecret } from "@/lib/bank-webhook";
import { confirmBankSubscriptionOrder } from "@/lib/services/manual-subscription-confirm.service";
import { prisma } from "@/lib/prisma";

function verifyWebhookSecurity(request: Request, rawBody: string): "ok" | "missing" | "invalid" {
    const secret = process.env.BANK_WEBHOOK_SECRET;
    if (!secret) {
        console.error("Bank webhook rejected: BANK_WEBHOOK_SECRET is unset.");
        return "missing";
    }
    return verifyWebhookSecret(request, rawBody, secret) ? "ok" : "invalid";
}

export async function POST(request: Request) {
    let rawBody = "";
    try {
        rawBody = await request.text();
    } catch {
        return NextResponse.json({ error: "Không đọc được body yêu cầu." }, { status: 400 });
    }

    // 1. Security Check. Thiếu cấu hình là lỗi máy chủ; chữ ký sai là từ chối.
    const webhookAuth = verifyWebhookSecurity(request, rawBody);
    if (webhookAuth === "missing") {
        return NextResponse.json(
            { error: "Webhook ngân hàng chưa được cấu hình." },
            { status: 503 },
        );
    }
    if (webhookAuth === "invalid") {
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
        "",
    );

    // Extract orderCode: supports HC123456, HOCAU HC123456, HOCAUHC123456, etc.
    let orderCode: string | null = null;
    const directMatch =
        content.match(/\b(HC[0-9]{6})\b/i) ||
        content.match(/(?:HOCAU|HC)\s*(HC[0-9]{6}|[0-9]{6})/i);

    if (directMatch) {
        const rawCode = directMatch[1].toUpperCase();
        orderCode = rawCode.startsWith("HC") ? rawCode : `HC${rawCode}`;
    } else {
        const generalMatch = content.match(/(HC[A-Z0-9]{5,10})/i);
        if (generalMatch) {
            orderCode = generalMatch[1].toUpperCase();
        }
    }

    if (!orderCode) {
        return NextResponse.json(
            { error: "Không tìm thấy mã đơn hàng HC... trong nội dung giao dịch." },
            { status: 400 },
        );
    }

    try {
        const order = await prisma.subscriptionOrder.findUnique({
            where: { orderCode }, select: { id: true },
        });
        if (!order) throw new Error("ORDER_NOT_FOUND");
        const activation = await confirmBankSubscriptionOrder({
            orderId: order.id, amountVnd: transferAmount, bankRef: transactionRef || null, rawBody,
        });
        const result = {
            idempotent: activation.alreadyPaid, orderId: order.id, orderCode,
            ...(!activation.alreadyPaid ? { newExpiresAt: activation.newExpiresAt, previousExpiresAt: activation.previousExpiresAt, planCode: activation.order.planCode } : {}),
        };

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
        if (["ORDER_CANCELLED", "ORDER_EXPIRED", "INVALID_ORDER_STATUS"].includes(errorMessage)) {
            return NextResponse.json({ error: "Đơn hàng không còn chờ thanh toán." }, { status: 409 });
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
