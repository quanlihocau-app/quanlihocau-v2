import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const updateSettingsSchema = z
    .object({
        allowNegativeInventory: z.boolean({
            message: "Cấu hình bán âm kho phải là giá trị boolean (true/false).",
        }),
    })
    .strict();

export async function GET() {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const lake = await prisma.lake.findUnique({
            where: { id: tenantContext.lakeId },
            select: {
                id: true,
                name: true,
                allowNegativeInventory: true,
            },
        });

        if (!lake) {
            return NextResponse.json(
                { error: "Không tìm thấy thông tin hồ câu." },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                lakeId: lake.id,
                lakeName: lake.name,
                allowNegativeInventory: lake.allowNegativeInventory,
                canEdit: tenantContext.role === Role.OWNER,
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
            { error: "Đã xảy ra lỗi khi lấy thông tin cấu hình." },
            { status: 500 },
        );
    }
}

export async function PATCH(request: Request) {
    try {
        // Only OWNER is authorized to change lake settings
        const tenantContext = await requireTenantContext([Role.OWNER]);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = updateSettingsSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const data = parsed.data;

        const existingLake = await prisma.lake.findUnique({
            where: { id: tenantContext.lakeId },
            select: {
                id: true,
                allowNegativeInventory: true,
            },
        });

        if (!existingLake) {
            return NextResponse.json(
                { error: "Không tìm thấy hồ câu." },
                { status: 404 },
            );
        }

        const updated = await prisma.$transaction(async (tx) => {
            const lk = await tx.lake.update({
                where: { id: tenantContext.lakeId },
                data: {
                    allowNegativeInventory: data.allowNegativeInventory,
                },
            });

            await tx.auditEvent.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    entityType: "Lake",
                    entityId: tenantContext.lakeId,
                    action: "LAKE_SETTINGS_UPDATED",
                    payload: JSON.stringify({
                        setting: "allowNegativeInventory",
                        before: existingLake.allowNegativeInventory,
                        after: data.allowNegativeInventory,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return lk;
        });

        return NextResponse.json(
            {
                message: data.allowNegativeInventory
                    ? "Đã bật cấu hình cho phép bán âm kho thành công."
                    : "Đã tắt cấu hình cho phép bán âm kho thành công.",
                allowNegativeInventory: updated.allowNegativeInventory,
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
            { error: "Đã xảy ra lỗi khi cập nhật cấu hình hồ câu." },
            { status: 500 },
        );
    }
}
