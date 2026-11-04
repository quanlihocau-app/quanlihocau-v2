import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const uuidSchema = z.string().uuid({
    message: "ID loại cá không đúng định dạng UUID.",
});

const updateFishTypeSchema = z
    .object({
        name: z
            .string({
                message: "Tên loại cá không được để trống.",
            })
            .trim()
            .min(1, "Tên loại cá không được để trống.")
            .max(100, "Tên loại cá tối đa 100 ký tự.")
            .optional(),
        pricePerKg: z
            .number({
                message: "Giá thu mua phải là số.",
            })
            .int("Giá thu mua phải là số nguyên.")
            .positive("Giá thu mua phải lớn hơn 0.")
            .optional(),
    })
    .strict()
    .refine((data) => data.name !== undefined || data.pricePerKg !== undefined, {
        message: "Phải cung cấp ít nhất một thông tin cần cập nhật.",
    });

interface RouteParams {
    params: Promise<{
        fishTypeId: string;
    }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const { fishTypeId } = await params;
        const idParse = uuidSchema.safeParse(fishTypeId);
        if (!idParse.success) {
            return NextResponse.json(
                { error: "ID loại cá không hợp lệ." },
                { status: 400 },
            );
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = updateFishTypeSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const existing = await prisma.fishType.findFirst({
            where: {
                id: fishTypeId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Không tìm thấy loại cá trong hồ câu này." },
                { status: 404 },
            );
        }

        const data = parsed.data;

        if (data.name !== undefined && data.name.trim() !== existing.name) {
            const duplicate = await prisma.fishType.findFirst({
                where: {
                    lakeId: tenantContext.lakeId,
                    name: data.name.trim(),
                    deletedAt: null,
                    id: { not: existing.id },
                },
            });

            if (duplicate) {
                return NextResponse.json(
                    {
                        error: "Tên loại cá này đã tồn tại trong danh mục của hồ.",
                    },
                    { status: 409 },
                );
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            const ft = await tx.fishType.update({
                where: { id: existing.id },
                data: {
                    ...(data.name !== undefined
                        ? { name: data.name.trim() }
                        : {}),
                    ...(data.pricePerKg !== undefined
                        ? { pricePerKg: data.pricePerKg }
                        : {}),
                },
            });

            await tx.auditEvent.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    entityType: "FishType",
                    entityId: ft.id,
                    action: "FISH_TYPE_UPDATED",
                    payload: JSON.stringify({
                        before: {
                            name: existing.name,
                            pricePerKg: existing.pricePerKg,
                        },
                        after: {
                            name: ft.name,
                            pricePerKg: ft.pricePerKg,
                        },
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return ft;
        });

        return NextResponse.json(
            {
                message: "Cập nhật loại cá thành công.",
                fishType: updated,
            },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi cập nhật loại cá." },
            { status: 500 },
        );
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const { fishTypeId } = await params;
        const idParse = uuidSchema.safeParse(fishTypeId);
        if (!idParse.success) {
            return NextResponse.json(
                { error: "ID loại cá không hợp lệ." },
                { status: 400 },
            );
        }

        const existing = await prisma.fishType.findFirst({
            where: {
                id: fishTypeId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Không tìm thấy loại cá trong hồ câu này." },
                { status: 404 },
            );
        }

        const now = new Date();
        await prisma.$transaction(async (tx) => {
            const updateResult = await tx.fishType.updateMany({
                where: {
                    id: existing.id,
                    lakeId: tenantContext.lakeId,
                    deletedAt: null,
                },
                data: {
                    deletedAt: now,
                },
            });

            if (updateResult.count === 1) {
                await tx.auditEvent.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        entityType: "FishType",
                        entityId: existing.id,
                        action: "FISH_TYPE_DEACTIVATED",
                        payload: JSON.stringify({
                            name: existing.name,
                            pricePerKg: existing.pricePerKg,
                            deactivatedAt: now.toISOString(),
                        }),
                        createdBy: tenantContext.userId,
                    },
                });
            }
        });

        return NextResponse.json(
            {
                message: `Đã ngừng dùng loại cá "${existing.name}" thành công.`,
            },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi ngừng dùng loại cá." },
            { status: 500 },
        );
    }
}
