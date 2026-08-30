import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const createFishTypeSchema = z
    .object({
        name: z
            .string({
                message: "Tên loại cá không được để trống.",
            })
            .trim()
            .min(1, "Tên loại cá không được để trống.")
            .max(100, "Tên loại cá tối đa 100 ký tự."),
        pricePerKg: z
            .number({
                message: "Giá thu mua phải là số.",
            })
            .int("Giá thu mua phải là số nguyên.")
            .positive("Giá thu mua phải lớn hơn 0."),
    })
    .strict();

export async function GET() {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const fishTypes = await prisma.fishType.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({ fishTypes }, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy danh mục loại cá." },
            { status: 500 },
        );
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

        const parsed = createFishTypeSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const data = parsed.data;

        // Check if name already exists in current lake
        const existing = await prisma.fishType.findFirst({
            where: {
                lakeId: tenantContext.lakeId,
                name: data.name.trim(),
                deletedAt: null,
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Loại cá này đã tồn tại trong danh mục của hồ." },
                { status: 409 },
            );
        }

        const fishType = await prisma.$transaction(async (tx) => {
            const created = await tx.fishType.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    name: data.name.trim(),
                    pricePerKg: data.pricePerKg,
                },
            });

            await tx.auditEvent.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    entityType: "FishType",
                    entityId: created.id,
                    action: "FISH_TYPE_CREATED",
                    payload: JSON.stringify({
                        name: created.name,
                        pricePerKg: created.pricePerKg,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return created;
        });

        return NextResponse.json(
            {
                message: "Thêm loại cá thành công.",
                fishType,
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
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tạo loại cá." },
            { status: 500 },
        );
    }
}
