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
        initialStock: z
            .number({
                message: "Số lượng nhập kho ban đầu phải là số.",
            })
            .int("Số lượng nhập kho ban đầu phải là số nguyên.")
            .min(0, "Số lượng nhập kho ban đầu không được âm.")
            .default(0),
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
            include: {
                movements: {
                    select: {
                        quantity: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const productsWithStock = products.map((p) => {
            const stock = p.movements.reduce(
                (sum, m) => sum + Number(m.quantity),
                0,
            );
            const { movements: _movements, ...rest } = p;
            void _movements;
            return {
                ...rest,
                stock,
            };
        });

        return NextResponse.json({ products: productsWithStock }, { status: 200 });
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

        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    // 1. Auto-generate sequential SKU per lake (e.g. SP-0001, SP-0002)
                    const totalProducts = await tx.product.count({
                        where: { lakeId: tenantContext.lakeId },
                    });

                    let nextSeq = totalProducts + 1;
                    const latestSkuProduct = await tx.product.findFirst({
                        where: {
                            lakeId: tenantContext.lakeId,
                            sku: { startsWith: "SP-" },
                        },
                        orderBy: { createdAt: "desc" },
                        select: { sku: true },
                    });

                    if (latestSkuProduct?.sku) {
                        const match = latestSkuProduct.sku.match(/^SP-(\d+)$/);
                        if (match) {
                            nextSeq = Math.max(nextSeq, parseInt(match[1], 10) + 1);
                        }
                    }

                    let generatedSku = `SP-${String(nextSeq).padStart(4, "0")}`;

                    // Ensure absolute uniqueness within tenant
                    let attempts = 0;
                    while (attempts < 20) {
                        const existing = await tx.product.findFirst({
                            where: {
                                lakeId: tenantContext.lakeId,
                                sku: generatedSku,
                            },
                        });
                        if (!existing) break;
                        nextSeq++;
                        generatedSku = `SP-${String(nextSeq).padStart(4, "0")}`;
                        attempts++;
                    }

                    // 2. Create product
                    const createdProduct = await tx.product.create({
                        data: {
                            lakeId: tenantContext.lakeId,
                            name: data.name.trim(),
                            priceVnd: data.priceVnd,
                            sku: generatedSku,
                        },
                    });

                    // 3. Create initial inventory movement if initialStock > 0
                    if (data.initialStock > 0) {
                        await tx.inventoryMovement.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                productId: createdProduct.id,
                                quantity: data.initialStock,
                                reason: "Nhập kho ban đầu khi tạo sản phẩm",
                                createdBy: tenantContext.userId,
                            },
                        });
                    }

                    // 4. Create AuditEvent
                    await tx.auditEvent.create({
                        data: {
                            lakeId: tenantContext.lakeId,
                            entityType: "Product",
                            entityId: createdProduct.id,
                            action: "PRODUCT_CREATED",
                            payload: JSON.stringify({
                                name: createdProduct.name,
                                priceVnd: createdProduct.priceVnd,
                                sku: createdProduct.sku,
                                initialStock: data.initialStock,
                            }),
                            createdBy: tenantContext.userId,
                        },
                    });

                    return {
                        product: {
                            ...createdProduct,
                            stock: data.initialStock,
                        },
                        initialStock: data.initialStock,
                    };
                },
                {
                    isolationLevel: "Serializable",
                },
            );

            return NextResponse.json(
                {
                    message: "Tạo sản phẩm mới thành công.",
                    product: result.product,
                    initialStock: result.initialStock,
                },
                { status: 201 },
            );
        } catch (dbError: unknown) {
            console.error("[POST /api/products error]:", dbError);
            return NextResponse.json(
                { error: "Đã xảy ra lỗi khi tạo sản phẩm trong cơ sở dữ liệu." },
                { status: 500 },
            );
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
