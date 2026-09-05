import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";
import { BANK_CONFIG, generateVietQrUrl, PLAN_PRICING } from "@/lib/vietqr";

const createOrderSchema = z.object({
    plan: z.enum(["SILVER", "GOLD"], {
        message: "Chỉ chấp nhận gói SILVER hoặc GOLD.",
    }),
});

function generateOrderCode(): string {
    // Generate an 8-character code: HC + 6 random digits
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    return `HC${randomDigits}`;
}

export async function POST(request: Request) {
    try {
        const tenant = await requireTenantContext([Role.OWNER]);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = createOrderSchema.safeParse(body);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message ?? "Gói cước không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const planTier = parsed.data.plan;
        const planConfig = PLAN_PRICING[planTier];
        const amountVnd = planConfig.priceVnd;

        // Generate unique orderCode
        let orderCode = generateOrderCode();
        let exists = await prisma.subscriptionOrder.findUnique({
            where: { orderCode },
            select: { id: true },
        });

        while (exists) {
            orderCode = generateOrderCode();
            exists = await prisma.subscriptionOrder.findUnique({
                where: { orderCode },
                select: { id: true },
            });
        }

        // Create PENDING order
        const order = await prisma.subscriptionOrder.create({
            data: {
                orderCode,
                organizationId: tenant.organizationId,
                lakeId: tenant.lakeId,
                planCode: planTier,
                amountVnd,
                durationDays: planConfig.durationDays,
                status: "PENDING",
                paymentMethod: "VIETQR",
            },
        });

        const paymentInfo = generateVietQrUrl({
            amount: amountVnd,
            orderCode,
        });

        return NextResponse.json(
            {
                order: {
                    id: order.id,
                    orderCode: order.orderCode,
                    planCode: order.planCode,
                    amountVnd: order.amountVnd,
                    status: order.status,
                    createdAt: order.createdAt,
                },
                paymentInfo: {
                    ...paymentInfo,
                    hotline: BANK_CONFIG.hotline,
                    legalFeeNote: BANK_CONFIG.legalFeeNote,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error("Create subscription order error:", error);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tạo đơn hàng gia hạn." },
            { status: 500 },
        );
    }
}

export async function GET() {
    try {
        const tenant = await requireTenantContext([Role.OWNER]);

        const orders = await prisma.subscriptionOrder.findMany({
            where: {
                lakeId: tenant.lakeId,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 10,
        });

        return NextResponse.json({ orders });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy danh sách đơn hàng." },
            { status: 500 },
        );
    }
}
