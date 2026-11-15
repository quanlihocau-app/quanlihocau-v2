import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];

const patchSchema = z.object({
    id: z.string().uuid().optional(),
    markAllRead: z.boolean().optional(),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);
        const { searchParams } = new URL(request.url);
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: {
                    lakeId: tenantContext.lakeId,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    body: true,
                    read: true,
                    createdAt: true,
                },
            }),
            prisma.notification.count({
                where: {
                    lakeId: tenantContext.lakeId,
                    read: false,
                },
            }),
        ]);

        return NextResponse.json({
            notifications,
            unreadCount,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi tải thông báo." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);
        let body: unknown = {};
        try {
            body = await request.json();
        } catch {}

        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
        }

        const { id, markAllRead } = parsed.data;

        if (id) {
            await prisma.notification.updateMany({
                where: {
                    id,
                    lakeId: tenantContext.lakeId,
                },
                data: {
                    read: true,
                },
            });
            return NextResponse.json({ success: true });
        }

        if (markAllRead) {
            const result = await prisma.notification.updateMany({
                where: {
                    lakeId: tenantContext.lakeId,
                    read: false,
                },
                data: {
                    read: true,
                },
            });
            return NextResponse.json({ success: true, updated: result.count });
        }

        return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi cập nhật thông báo." }, { status: 500 });
    }
}
