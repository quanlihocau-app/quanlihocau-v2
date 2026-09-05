import { NextResponse } from "next/server";
import { z } from "zod";

import {
    InvoiceStatus,
    PaymentDirection,
    PaymentMethod,
    Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const uuidSchema = z.string().uuid("ID không đúng định dạng UUID.");

const retailSaleSchema = z.object({
    customerId: uuidSchema.nullable().optional(),
    items: z
        .array(
            z.object({
                productId: uuidSchema,
                quantity: z
                    .number()
                    .int("Số lượng phải là số nguyên.")
                    .positive("Số lượng phải lớn hơn 0."),
            }),
        )
        .min(1, "Đơn bán lẻ phải có ít nhất 1 mặt hàng."),
    paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER], {
        message: "Phương thức thanh toán không hợp lệ.",
    }),
    note: z.string().trim().max(255).optional(),
});

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];
const MAX_RETRIES = 3;

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);

        // Check Idempotency-Key
        const rawIdempotencyKey =
            request.headers.get("idempotency-key") ||
            request.headers.get("Idempotency-Key");

        if (!rawIdempotencyKey) {
            return NextResponse.json(
                { error: "Thiếu header Idempotency-Key để chống giao dịch trùng lặp." },
                { status: 400 },
            );
        }

        const parsedKey = uuidSchema.safeParse(rawIdempotencyKey);
        if (!parsedKey.success) {
            return NextResponse.json(
                { error: "Header Idempotency-Key phải là định dạng UUID hợp lệ." },
                { status: 400 },
            );
        }
        const idempotencyKey = parsedKey.data;

        // Check existing idempotency record
        const existingKey = await prisma.idempotencyKey.findUnique({
            where: {
                lakeId_key: {
                    lakeId: tenantContext.lakeId,
                    key: idempotencyKey,
                },
            },
        });

        if (existingKey) {
            try {
                const parsedBody = JSON.parse(existingKey.responseBody);
                return NextResponse.json(parsedBody, {
                    status: existingKey.responseStatus,
                });
            } catch {
                return NextResponse.json(
                    { error: "Giao dịch đã được xử lý trước đó." },
                    { status: existingKey.responseStatus },
                );
            }
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON gửi lên không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = retailSaleSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { customerId, items, paymentMethod, note } = parsed.data;

        // Execute atomic transaction with retry loop for Serializable conflicts
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const transactionResult = await prisma.$transaction(
                    async (tx) => {
                        // 1. Validate customer if provided
                        let customerName = "Khách lẻ";
                        let customerPhone: string | null = null;
                        if (customerId) {
                            const cust = await tx.customer.findFirst({
                                where: {
                                    id: customerId,
                                    lakeId: tenantContext.lakeId,
                                    deletedAt: null,
                                },
                            });
                            if (!cust) {
                                throw new Error("CUSTOMER_NOT_FOUND");
                            }
                            customerName = cust.name;
                            customerPhone = cust.phoneNormalized;
                        }

                        // 2. Fetch and validate each product, check stock
                        const lineItemsToCreate: Array<{
                            productId: string;
                            name: string;
                            unitPrice: number;
                            quantity: number;
                            totalVnd: number;
                        }> = [];

                        let grossTotalVnd = 0;

                        for (const it of items) {
                            const product = await tx.product.findFirst({
                                where: {
                                    id: it.productId,
                                    lakeId: tenantContext.lakeId,
                                    deletedAt: null,
                                },
                            });

                            if (!product) {
                                throw new Error(`PRODUCT_NOT_FOUND:${it.productId}`);
                            }

                            // Compute current live stock from ledger
                            const stockAgg = await tx.inventoryMovement.aggregate({
                                where: {
                                    lakeId: tenantContext.lakeId,
                                    productId: product.id,
                                },
                                _sum: {
                                    quantity: true,
                                },
                            });

                            const currentStock = stockAgg._sum.quantity
                                ? Number(stockAgg._sum.quantity)
                                : 0;

                            if (currentStock < it.quantity) {
                                throw new Error(
                                    `INSUFFICIENT_STOCK:${product.name}:${currentStock}:${it.quantity}`,
                                );
                            }

                            const lineTotal = product.priceVnd * it.quantity;
                            grossTotalVnd += lineTotal;

                            lineItemsToCreate.push({
                                productId: product.id,
                                name: product.name,
                                unitPrice: product.priceVnd,
                                quantity: it.quantity,
                                totalVnd: lineTotal,
                            });
                        }

                        // 3. Create Retail Invoice (fishingSessionId must strictly be null)
                        const invoice = await tx.invoice.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                customerId: customerId || null,
                                fishingSessionId: null,
                                status: InvoiceStatus.PAID,
                                totalAmountVnd: grossTotalVnd,
                                lines: {
                                    create: lineItemsToCreate,
                                },
                            },
                            include: {
                                lines: true,
                            },
                        });

                        // 4. Create Payment record
                        const payment = await tx.payment.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                invoiceId: invoice.id,
                                amountVnd: grossTotalVnd,
                                method: paymentMethod,
                                direction: PaymentDirection.IN,
                            },
                        });

                        // 5. Create InventoryMovement for each product (negative for OUT)
                        for (const it of items) {
                            await tx.inventoryMovement.create({
                                data: {
                                    lakeId: tenantContext.lakeId,
                                    productId: it.productId,
                                    quantity: -it.quantity,
                                    reason: `Bán lẻ đơn #${invoice.id.slice(0, 8)}`,
                                    createdBy: tenantContext.userId,
                                },
                            });
                        }

                        // 6. Create AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "Invoice",
                                entityId: invoice.id,
                                action: "RETAIL_SALE_COMPLETED",
                                payload: JSON.stringify({
                                    invoiceId: invoice.id,
                                    paymentId: payment.id,
                                    totalAmountVnd: grossTotalVnd,
                                    paymentMethod,
                                    itemsCount: items.length,
                                    customerId,
                                    note,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        // 7. Format receiptData for 58mm printer
                        const receiptData = {
                            invoiceId: invoice.id,
                            lakeName: tenantContext.lakeName,
                            customerName,
                            customerPhone,
                            hutNames: "Bán lẻ",
                            packageName: "Đơn hàng bán lẻ",
                            lines: invoice.lines.map((l) => ({
                                name: l.name,
                                quantity: Number(l.quantity),
                                unitPrice: l.unitPrice,
                                totalVnd: l.totalVnd,
                            })),
                            totalAmountVnd: grossTotalVnd,
                            paidAmountVnd: grossTotalVnd,
                            paymentAmountVnd: grossTotalVnd,
                            remainingVnd: 0,
                            refundAmountVnd: 0,
                            paymentMethod,
                            paymentTime: new Date().toISOString(),
                            cashierName: tenantContext.userId,
                        };

                        const responsePayload = {
                            ok: true,
                            invoice: {
                                id: invoice.id,
                                totalAmountVnd: invoice.totalAmountVnd,
                                status: invoice.status,
                                lines: invoice.lines,
                            },
                            receiptData,
                        };

                        // 8. Record IdempotencyKey
                        await tx.idempotencyKey.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                key: idempotencyKey,
                                responseStatus: 201,
                                responseBody: JSON.stringify(responsePayload),
                            },
                        });

                        return responsePayload;
                    },
                    {
                        isolationLevel: "Serializable",
                    },
                );

                return NextResponse.json(transactionResult, { status: 201 });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);

                if (message.startsWith("INSUFFICIENT_STOCK:")) {
                    const [, prodName, available, requested] = message.split(":");
                    return NextResponse.json(
                        {
                            error: `Sản phẩm "${prodName}" không đủ số lượng tồn kho (Còn: ${available}, yêu cầu: ${requested}).`,
                            code: "INSUFFICIENT_STOCK",
                        },
                        { status: 409 },
                    );
                }

                if (message.startsWith("PRODUCT_NOT_FOUND")) {
                    return NextResponse.json(
                        { error: "Sản phẩm không tồn tại hoặc đã bị xóa." },
                        { status: 404 },
                    );
                }

                if (message === "CUSTOMER_NOT_FOUND") {
                    return NextResponse.json(
                        { error: "Khách hàng không tồn tại trong hồ này." },
                        { status: 404 },
                    );
                }

                // Check for Serializable retryable error (P2034)
                const isRetryable =
                    err instanceof Error &&
                    "code" in err &&
                    (err as { code: string }).code === "P2034";

                if (isRetryable && attempt < MAX_RETRIES) {
                    await new Promise((res) => setTimeout(res, 50 * attempt));
                    continue;
                }

                throw err;
            }
        }

        return NextResponse.json(
            { error: "Hệ thống đang quá tải, vui lòng thử lại." },
            { status: 503 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi thanh toán đơn bán lẻ." },
            { status: 500 },
        );
    }
}
