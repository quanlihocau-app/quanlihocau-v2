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
    message: "ID sản phẩm không đúng định dạng UUID.",
});

const updateProductSchema = z
    .object({
        name: z
            .string({
                message: "Tên sản phẩm không được để trống.",
            })
            .trim()
            .min(1, "Tên sản phẩm không được để trống.")
            .max(120, "Tên sản phẩm tối đa 120 ký tự.")
            .optional(),
        priceVnd: z
            .number({
                message: "Giá sản phẩm phải là số.",
            })
            .int("Giá sản phẩm phải là số nguyên.")
            .positive("Giá sản phẩm phải lớn hơn 0.")
            .optional(),
        sku: z
            .string()
            .trim()
            .max(50, "Mã SKU tối đa 50 ký tự.")
            .optional()
            .nullable(),
    })
    .strict()
    .refine(
        (data) =>
            data.name !== undefined ||
            data.priceVnd !== undefined ||
            data.sku !== undefined,
        {
            message: "Phải cung cấp ít nhất một thông tin cần cập nhật.",
        },
    );

interface RouteParams {
    params: Promise<{
        productId: string;
    }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const { productId } = await params;
        const idParse = uuidSchema.safeParse(productId);
        if (!idParse.success) {
            return NextResponse.json(
                { error: "ID sản phẩm không hợp lệ." },
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

        const parsed = updateProductSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const existing = await prisma.product.findFirst({
            where: {
                id: productId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Không tìm thấy sản phẩm trong hồ câu này." },
                { status: 404 },
            );
        }

        const data = parsed.data;
        let normalizedSku: string | null | undefined = undefined;
        if (data.sku !== undefined) {
            if (data.sku === null) {
                normalizedSku = null;
            } else {
                const trimmed = data.sku.trim();
                normalizedSku = trimmed.length > 0 ? trimmed.toUpperCase() : null;
            }
        }

        if (
            normalizedSku !== undefined &&
            normalizedSku !== null &&
            normalizedSku !== existing.sku
        ) {
            const duplicate = await prisma.product.findFirst({
                where: {
                    lakeId: tenantContext.lakeId,
                    sku: normalizedSku,
                    deletedAt: null,
                    id: { not: existing.id },
                },
            });

            if (duplicate) {
                return NextResponse.json(
                    {
                        error: "Mã SKU này đã tồn tại cho một sản phẩm khác trong hồ câu.",
                    },
                    { status: 409 },
                );
            }
        }

        try {
            const updated = await prisma.$transaction(async (tx) => {
                const prod = await tx.product.update({
                    where: { id: existing.id },
                    data: {
                        ...(data.name !== undefined
                            ? { name: data.name.trim() }
                            : {}),
                        ...(data.priceVnd !== undefined
                            ? { priceVnd: data.priceVnd }
                            : {}),
                        ...(normalizedSku !== undefined
                            ? { sku: normalizedSku }
                            : {}),
                    },
                });

                await tx.auditEvent.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        entityType: "Product",
                        entityId: prod.id,
                        action: "PRODUCT_UPDATED",
                        payload: JSON.stringify({
                            before: {
                                name: existing.name,
                                priceVnd: existing.priceVnd,
                                sku: existing.sku,
                            },
                            after: {
                                name: prod.name,
                                priceVnd: prod.priceVnd,
                                sku: prod.sku,
                            },
                        }),
                        createdBy: tenantContext.userId,
                    },
                });

                return prod;
            });

            return NextResponse.json(
                {
                    message: "Cập nhật sản phẩm thành công.",
                    product: updated,
                },
                { status: 200 },
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
            { error: "Đã xảy ra lỗi khi cập nhật sản phẩm." },
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

        const { productId } = await params;
        const idParse = uuidSchema.safeParse(productId);
        if (!idParse.success) {
            return NextResponse.json(
                { error: "ID sản phẩm không hợp lệ." },
                { status: 400 },
            );
        }

        const existing = await prisma.product.findFirst({
            where: {
                id: productId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Không tìm thấy sản phẩm trong hồ câu này." },
                { status: 404 },
            );
        }

        const now = new Date();
        await prisma.$transaction(async (tx) => {
            const updateResult = await tx.product.updateMany({
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
                        entityType: "Product",
                        entityId: existing.id,
                        action: "PRODUCT_DEACTIVATED",
                        payload: JSON.stringify({
                            name: existing.name,
                            sku: existing.sku,
                            priceVnd: existing.priceVnd,
                            deactivatedAt: now.toISOString(),
                        }),
                        createdBy: tenantContext.userId,
                    },
                });
            }
        });

        return NextResponse.json(
            {
                message: `Đã vô hiệu hóa sản phẩm "${existing.name}" thành công.`,
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
            { error: "Đã xảy ra lỗi khi vô hiệu hóa sản phẩm." },
            { status: 500 },
        );
    }
}
