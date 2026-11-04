import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";
import { assertSpotLimit } from "@/lib/subscription-guard";

const createSpotSchema = z.object({
    name: z.string().trim().min(2, "Tên ô câu tối thiểu 2 ký tự").max(100, "Tên ô câu tối đa 100 ký tự"),
    areaId: z.string().trim().min(1, "Vui lòng chọn khu vực"),
});

export async function GET() {
    try {
        const tenantContext = await requireTenantContext();

        const spots = await prisma.hut.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return NextResponse.json(spots, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = createSpotSchema.safeParse(body);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        // Kiểm tra giới hạn số ô câu của gói cước (SILVER max 30)
        await assertSpotLimit(tenantContext.lakeId);

        const area = await prisma.area.findFirst({
            where: {
                id: parsed.data.areaId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (!area) {
            return NextResponse.json(
                { error: "Khu vực không tồn tại hoặc không thuộc hồ câu này." },
                { status: 404 },
            );
        }

        const spot = await prisma.hut.create({
            data: {
                lakeId: tenantContext.lakeId,
                areaId: parsed.data.areaId,
                name: parsed.data.name,
            },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json(spot, { status: 201 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}
