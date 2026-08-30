import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const createBuybackSchema = z
    .object({
        fishTypeId: z.string().uuid({
            message: "ID loại cá không đúng định dạng UUID.",
        }),
        weight: z
            .number({
                message: "Trọng lượng cá phải là số.",
            })
            .positive("Trọng lượng cá phải lớn hơn 0."),
    })
    .strict();

export async function GET() {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const buybacks = await prisma.fishBuyback.findMany({
            where: {
                lakeId: tenantContext.lakeId,
            },
            include: {
                fishType: {
                    select: {
                        id: true,
                        name: true,
                        deletedAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        });

        const safeBuybacks = buybacks.map((b) => ({
            id: b.id,
            fishTypeId: b.fishTypeId,
            fishTypeName: b.fishType.name,
            isFishTypeDeleted: b.fishType.deletedAt !== null,
            weight: Number(b.weight),
            pricePerKg: b.pricePerKg,
            totalVnd: b.totalVnd,
            createdAt: b.createdAt,
        }));

        return NextResponse.json({ buybacks: safeBuybacks }, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy danh sách thu mua cá." },
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

        const parsed = createBuybackSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const data = parsed.data;

        // Verify fishType belongs to current lake and is active
        const fishType = await prisma.fishType.findFirst({
            where: {
                id: data.fishTypeId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!fishType) {
            return NextResponse.json(
                {
                    error: "Không tìm thấy loại cá hoặc loại cá đã ngừng áp dụng trong hồ câu này.",
                },
                { status: 404 },
            );
        }

        // Calculate totalVnd using Decimal with ROUND_HALF_UP
        const totalDecimal = new Prisma.Decimal(data.weight)
            .mul(fishType.pricePerKg)
            .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
        const totalVnd = totalDecimal.toNumber();

        const result = await prisma.$transaction(async (tx) => {
            const created = await tx.fishBuyback.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    fishTypeId: fishType.id,
                    weight: data.weight,
                    pricePerKg: fishType.pricePerKg,
                    totalVnd,
                },
            });

            await tx.auditEvent.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    entityType: "FishBuyback",
                    entityId: created.id,
                    action: "FISH_BUYBACK_CREATED",
                    payload: JSON.stringify({
                        fishTypeId: fishType.id,
                        fishTypeName: fishType.name,
                        weight: data.weight,
                        pricePerKg: fishType.pricePerKg,
                        totalVnd,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return created;
        });

        return NextResponse.json(
            {
                message: `Ghi nhận thu mua ${data.weight} kg "${fishType.name}" thành công.`,
                buyback: {
                    id: result.id,
                    fishTypeId: result.fishTypeId,
                    fishTypeName: fishType.name,
                    weight: Number(result.weight),
                    pricePerKg: result.pricePerKg,
                    totalVnd: result.totalVnd,
                    createdAt: result.createdAt,
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
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi ghi nhận thu mua cá." },
            { status: 500 },
        );
    }
}
