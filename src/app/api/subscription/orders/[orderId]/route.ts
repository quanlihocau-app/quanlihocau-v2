import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ orderId: string }> },
) {
    try {
        const tenant = await requireTenantContext();
        const { orderId } = await params;

        const order = await prisma.subscriptionOrder.findFirst({
            where: {
                id: orderId,
                lakeId: tenant.lakeId,
            },
            select: {
                id: true,
                orderCode: true,
                planCode: true,
                amountVnd: true,
                status: true,
                paidAt: true,
                createdAt: true,
            },
        });

        if (!order) {
            return NextResponse.json(
                { error: "Không tìm thấy đơn hàng." },
                { status: 404 },
            );
        }

        return NextResponse.json({ order });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi kiểm tra đơn hàng." },
            { status: 500 },
        );
    }
}
