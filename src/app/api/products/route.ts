import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const createProductSchema = z
    .object({
        name: z
            .string({
                message: "Tên sản phẩm không được để trống.",
            })
            .trim()
            .min(1, "Tên sản phẩm không được để trống.")
            .max(120, "Tên sản phẩm tối đa 120 ký tự."),
        priceVnd: z
            .number({
                message: "Giá sản phẩm phải là số.",
            })
            .int("Giá sản phẩm phải là số nguyên.")
            .positive("Giá sản phẩm phải lớn hơn 0."),
        sku: z
            .string()
            .trim()
            .max(50, "Mã SKU tối đa 50 ký tự.")
            .optional()
            .nullable(),
    })
    .strict();

export async function GET() {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const products = await prisma.product.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ products }, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy danh sách sản phẩm." },
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

        const parsed = createProductSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const data = parsed.data;
        let normalizedSku: string | null = null;
        if (data.sku !== undefined && data.sku !== null) {
            const trimmed = data.sku.trim();
            normalizedSku = trimmed.length > 0 ? trimmed.toUpperCase() : null;
        }

        if (normalizedSku) {
            const existing = await prisma.product.findFirst({
                where: {
                    lakeId: tenantContext.lakeId,
                    sku: normalizedSku,
                    deletedAt: null,
                },
            });

            if (existing) {
                return NextResponse.json(
                    { error: "Mã SKU này đã tồn tại trong hồ câu." },
                    { status: 409 },
                );
            }
        }

        try {
            const product = await prisma.$transaction(async (tx) => {
                const created = await tx.product.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        name: data.name.trim(),
                        priceVnd: data.priceVnd,
                        sku: normalizedSku,
                    },
                });

                await tx.auditEvent.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        entityType: "Product",
                        entityId: created.id,
                        action: "PRODUCT_CREATED",
                        payload: JSON.stringify({
                            name: created.name,
                            priceVnd: created.priceVnd,
                            sku: created.sku,
                        }),
                        createdBy: tenantContext.userId,
                    },
                });

                return created;
            });

            return NextResponse.json(
                {
                    message: "Tạo sản phẩm mới thành công.",
                    product,
                },
                { status: 201 },
            );
        } catch (dbError: unknown) {
            if (
                typeof dbError === "object" &&
                dbError !== null &&
                "code" in dbError &&
                dbError.code === "P2002"
            ) {
                return NextResponse.json(
                    { error: "Mã SKU này đã tồn tại trong hồ câu." },
                    { status: 409 },
                );
            }
            throw dbError;
        }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tạo sản phẩm." },
            { status: 500 },
        );
    }
}
