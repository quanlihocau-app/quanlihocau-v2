import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const createMovementSchema = z
    .object({
        productId: z.string().uuid("ID sản phẩm không đúng định dạng UUID."),
        type: z.enum(["IN", "OUT"], {
            message: "Loại giao dịch phải là Nhập kho (IN) hoặc Xuất kho (OUT).",
        }),
        quantity: z
            .number({
                message: "Số lượng phải là số.",
            })
            .positive("Số lượng phải lớn hơn 0."),
        reason: z
            .string({
                message: "Lý do nhập/xuất kho không được để trống.",
            })
            .trim()
            .min(1, "Lý do không được để trống.")
            .max(255, "Lý do tối đa 255 ký tự."),
    })
    .strict();

export async function GET() {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const movements = await prisma.inventoryMovement.findMany({
            where: {
                lakeId: tenantContext.lakeId,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        priceVnd: true,
                        deletedAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        });

        const safeMovements = movements.map((m) => ({
            id: m.id,
            productId: m.productId,
            productName: m.product.name,
            productSku: m.product.sku,
            isProductDeleted: m.product.deletedAt !== null,
            quantity: Number(m.quantity),
            type: Number(m.quantity) >= 0 ? "IN" : "OUT",
            reason: m.reason,
            createdBy: m.createdBy,
            createdAt: m.createdAt,
        }));

        return NextResponse.json(
            { movements: safeMovements },
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
            { error: "Đã xảy ra lỗi khi lấy lịch sử kho hàng." },
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

        const parsed = createMovementSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const data = parsed.data;

        // Verify product belongs to current lake and is active
        const product = await prisma.product.findFirst({
            where: {
                id: data.productId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Không tìm thấy sản phẩm trong hồ câu này." },
                { status: 404 },
            );
        }

        const signedQuantity =
            data.type === "IN" ? data.quantity : -data.quantity;

        const maxRetries = 3;
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // Double check current stock in transaction with Serializable isolation
                        const aggregate = await tx.inventoryMovement.aggregate({
                            where: {
                                lakeId: tenantContext.lakeId,
                                productId: product.id,
                            },
                            _sum: {
                                quantity: true,
                            },
                        });

                        const currentStock = aggregate._sum.quantity
                            ? Number(aggregate._sum.quantity)
                            : 0;

                        if (data.type === "OUT" && currentStock < data.quantity) {
                            throw new Error("INSUFFICIENT_STOCK");
                        }

                        const movement = await tx.inventoryMovement.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                productId: product.id,
                                quantity: signedQuantity,
                                reason: data.reason.trim(),
                                createdBy: tenantContext.userId,
                            },
                        });

                        const newStock = currentStock + signedQuantity;

                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "InventoryMovement",
                                entityId: movement.id,
                                action: "INVENTORY_MOVEMENT_CREATED",
                                payload: JSON.stringify({
                                    productId: product.id,
                                    productName: product.name,
                                    type: data.type,
                                    quantity: data.quantity,
                                    signedQuantity,
                                    newStock,
                                    reason: data.reason.trim(),
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        return {
                            id: movement.id,
                            productId: product.id,
                            productName: product.name,
                            productSku: product.sku,
                            quantity: Number(movement.quantity),
                            type: data.type,
                            reason: movement.reason,
                            newStock,
                            createdAt: movement.createdAt,
                        };
                    },
                    {
                        isolationLevel:
                            Prisma.TransactionIsolationLevel.Serializable,
                    },
                );

                return NextResponse.json(
                    {
                        message: `${
                            data.type === "IN" ? "Nhập kho" : "Xuất kho"
                        } sản phẩm "${product.name}" thành công.`,
                        movement: result,
                    },
                    { status: 201 },
                );
            } catch (err: unknown) {
                lastError = err;
                if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
                    return NextResponse.json(
                        {
                            error: "Số lượng tồn kho không đủ để thực hiện xuất kho.",
                        },
                        { status: 409 },
                    );
                }

                // If concurrency conflict (P2034), retry
                if (
                    typeof err === "object" &&
                    err !== null &&
                    "code" in err &&
                    err.code === "P2034" &&
                    attempt < maxRetries
                ) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, 50 * attempt),
                    );
                    continue;
                }

                throw err;
            }
        }

        throw lastError;
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tạo phiếu kho hàng." },
            { status: 500 },
        );
    }
}
