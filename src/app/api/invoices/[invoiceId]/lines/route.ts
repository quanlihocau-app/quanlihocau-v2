import { NextResponse } from "next/server";
import { z } from "zod";

import {
    InvoiceStatus,
    Prisma,
    Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const uuidSchema = z.string().uuid({
    message: "ID không đúng định dạng UUID.",
});

const addProductLineSchema = z
    .object({
        productId: z.string().uuid({
            message: "ID sản phẩm không đúng định dạng UUID.",
        }),
        weight: z.never().optional(),
        quantity: z
            .number({
                message: "Số lượng sản phẩm phải là số.",
            })
            .positive("Số lượng sản phẩm phải lớn hơn 0."),
    })
    .strict();

interface RouteParams {
    params: Promise<{
        invoiceId: string;
    }>;
}

const MAX_RETRIES = 3;

interface AddLineRequestIdentity {
    invoiceId: string;
    productId: string;
    quantity: number;
}

function matchesAddLineRequest(
    saved: unknown,
    current: AddLineRequestIdentity,
): boolean {
    if (!saved || typeof saved !== "object") return false;
    const req = (saved as { request?: unknown }).request;
    if (!req || typeof req !== "object") return false;
    const r = req as {
        operation?: unknown;
        invoiceId?: unknown;
        productId?: unknown;
        quantity?: unknown;
    };
    return (
        r.operation === "invoice-product-line:add" &&
        r.invoiceId === current.invoiceId &&
        r.productId === current.productId &&
        r.quantity === current.quantity
    );
}

function handleExistingAddLineKey(
    existingKey: { responseStatus: number; responseBody: string },
    current: AddLineRequestIdentity,
): NextResponse {
    try {
        const envelope = JSON.parse(existingKey.responseBody);
        if (!matchesAddLineRequest(envelope, current)) {
            return NextResponse.json(
                {
                    error: "Khóa Idempotency-Key đã được sử dụng cho một yêu cầu khác.",
                },
                { status: 409 },
            );
        }
        return NextResponse.json(envelope.response, {
            status: existingKey.responseStatus,
        });
    } catch {
        return NextResponse.json(
            {
                error: "Khóa Idempotency-Key không hợp lệ hoặc đã dùng cho yêu cầu khác.",
            },
            { status: 409 },
        );
    }
}

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const { invoiceId } = await params;
        const idParse = uuidSchema.safeParse(invoiceId);
        if (!idParse.success) {
            return NextResponse.json(
                { error: "ID hóa đơn không hợp lệ." },
                { status: 400 },
            );
        }

        // Validate Idempotency-Key header
        const rawIdempotencyKey =
            request.headers.get("idempotency-key") ||
            request.headers.get("Idempotency-Key");

        if (!rawIdempotencyKey) {
            return NextResponse.json(
                { error: "Thiếu header Idempotency-Key." },
                { status: 400 },
            );
        }

        const parsedKey = uuidSchema.safeParse(rawIdempotencyKey);
        if (!parsedKey.success) {
            return NextResponse.json(
                { error: "Header Idempotency-Key phải là UUID hợp lệ." },
                { status: 400 },
            );
        }
        const idempotencyKey = parsedKey.data;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = addProductLineSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const data = parsed.data;
        const currentRequestIdentity: AddLineRequestIdentity = {
            invoiceId,
            productId: data.productId,
            quantity: data.quantity,
        };

        // Check if idempotency key already processed
        const existingKey = await prisma.idempotencyKey.findUnique({
            where: {
                lakeId_key: {
                    lakeId: tenantContext.lakeId,
                    key: idempotencyKey,
                },
            },
        });

        if (existingKey) {
            return handleExistingAddLineKey(existingKey, currentRequestIdentity);
        }

        // 1. Verify invoice exists in current lake
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                lakeId: tenantContext.lakeId,
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { error: "Không tìm thấy hóa đơn trong hồ câu này." },
                { status: 404 },
            );
        }

        // 2. Strict status check: only DRAFT allowed
        if (invoice.status !== InvoiceStatus.DRAFT) {
            return NextResponse.json(
                {
                    error: "Chỉ có thể thêm sản phẩm khi hóa đơn ở trạng thái Nháp (DRAFT).",
                },
                { status: 409 },
            );
        }

        // 3. Verify product belongs to current lake and is active
        const product = await prisma.product.findFirst({
            where: {
                id: data.productId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!product) {
            return NextResponse.json(
                {
                    error: "Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng kinh doanh.",
                },
                { status: 404 },
            );
        }

        // 4. Calculate totalVnd using Decimal and half-up rounding
        const lineTotalDecimal = new Prisma.Decimal(data.quantity)
            .mul(product.priceVnd)
            .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
        const lineTotalVnd = lineTotalDecimal.toNumber();

        // 5. Transaction with Serializable isolation level and retry loop for P2034
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // Check idempotency inside tx
                        const existingInTx = await tx.idempotencyKey.findUnique({
                            where: {
                                lakeId_key: {
                                    lakeId: tenantContext.lakeId,
                                    key: idempotencyKey,
                                },
                            },
                        });

                        if (existingInTx) {
                            return {
                                isIdempotent: true,
                                responseStatus: existingInTx.responseStatus,
                                responseBody: existingInTx.responseBody,
                            };
                        }

                        // Re-check invoice status inside tx
                        const txInvoice = await tx.invoice.findUnique({
                            where: { id: invoice.id },
                        });

                        if (!txInvoice || txInvoice.status !== InvoiceStatus.DRAFT) {
                            throw new Error("INVOICE_NOT_DRAFT");
                        }

                        // Fetch lake settings regarding negative inventory
                        const lake = await tx.lake.findUnique({
                            where: { id: tenantContext.lakeId },
                            select: { allowNegativeInventory: true },
                        });
                        const allowNegative = lake?.allowNegativeInventory ?? false;

                        // Check current inventory stock
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

                        const remainingStock = currentStock - data.quantity;
                        const isNegativeStock = remainingStock < 0;

                        if (isNegativeStock && !allowNegative) {
                            throw new Error("INSUFFICIENT_STOCK");
                        }

                        // Create InvoiceLine
                        const line = await tx.invoiceLine.create({
                            data: {
                                invoiceId: invoice.id,
                                productId: product.id,
                                name: product.name,
                                unitPrice: product.priceVnd,
                                quantity: data.quantity,
                                totalVnd: lineTotalVnd,
                            },
                        });

                        // Create InventoryMovement (negative quantity for sale)
                        await tx.inventoryMovement.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                productId: product.id,
                                quantity: -data.quantity,
                                reason: `Xuất bán theo hóa đơn #${invoice.id.slice(0, 8)}`,
                                createdBy: tenantContext.userId,
                            },
                        });

                        // Recalculate and update Invoice totalAmountVnd
                        const linesAgg = await tx.invoiceLine.aggregate({
                            where: {
                                invoiceId: invoice.id,
                            },
                            _sum: {
                                totalVnd: true,
                            },
                        });

                        const newTotalAmountVnd = linesAgg._sum.totalVnd ?? 0;

                        const updatedInvoice = await tx.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                totalAmountVnd: newTotalAmountVnd,
                            },
                        });

                        // Record AuditEvent (reflects negative stock if occurred)
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "Invoice",
                                entityId: invoice.id,
                                action: "INVOICE_PRODUCT_LINE_ADDED",
                                payload: JSON.stringify({
                                    lineId: line.id,
                                    productId: product.id,
                                    productName: product.name,
                                    quantity: data.quantity,
                                    unitPrice: product.priceVnd,
                                    lineTotalVnd,
                                    newTotalAmountVnd,
                                    isNegativeStock,
                                    remainingStock,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        const responsePayload = {
                            message: isNegativeStock
                                ? `Đã thêm ${data.quantity} "${product.name}" vào hóa đơn thành công (cảnh báo: tồn kho âm, còn ${remainingStock}).`
                                : `Đã thêm ${data.quantity} "${product.name}" vào hóa đơn thành công.`,
                            negativeInventoryWarning: isNegativeStock,
                            warningMessage: isNegativeStock
                                ? `Sản phẩm đã được bán nhưng tồn kho đang âm (${remainingStock}). Hãy kiểm tra và bổ sung kho.`
                                : undefined,
                            line: {
                                id: line.id,
                                productId: line.productId,
                                name: line.name,
                                unitPrice: line.unitPrice,
                                quantity: Number(line.quantity),
                                totalVnd: line.totalVnd,
                            },
                            invoice: updatedInvoice,
                        };

                        const envelope = {
                            request: {
                                operation: "invoice-product-line:add" as const,
                                invoiceId,
                                productId: product.id,
                                quantity: data.quantity,
                            },
                            response: responsePayload,
                        };

                        // Save IdempotencyKey envelope in same tx
                        await tx.idempotencyKey.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                key: idempotencyKey,
                                responseStatus: 201,
                                responseBody: JSON.stringify(envelope),
                            },
                        });

                        return {
                            isIdempotent: false,
                            responseStatus: 201,
                            responseBody: JSON.stringify(envelope),
                        };
                    },
                    {
                        isolationLevel:
                            Prisma.TransactionIsolationLevel.Serializable,
                    },
                );

                return handleExistingAddLineKey(
                    {
                        responseStatus: result.responseStatus,
                        responseBody: result.responseBody,
                    },
                    currentRequestIdentity,
                );
            } catch (txError: unknown) {
                if (
                    txError instanceof Prisma.PrismaClientKnownRequestError &&
                    txError.code === "P2002"
                ) {
                    // Concurrent request with same key
                    const concurrentKey = await prisma.idempotencyKey.findUnique({
                        where: {
                            lakeId_key: {
                                lakeId: tenantContext.lakeId,
                                key: idempotencyKey,
                            },
                        },
                    });

                    if (concurrentKey) {
                        return handleExistingAddLineKey(
                            concurrentKey,
                            currentRequestIdentity,
                        );
                    }
                }

                if (
                    txError instanceof Error &&
                    txError.message === "INSUFFICIENT_STOCK"
                ) {
                    return NextResponse.json(
                        {
                            error: `Số lượng tồn kho không đủ để xuất bán (cần ${data.quantity}). Cấu hình hồ hiện tại không cho phép bán âm kho.`,
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "INVOICE_NOT_DRAFT"
                ) {
                    return NextResponse.json(
                        {
                            error: "Chỉ có thể thêm sản phẩm khi hóa đơn ở trạng thái Nháp (DRAFT).",
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Prisma.PrismaClientKnownRequestError &&
                    txError.code === "P2034"
                ) {
                    if (attempt < MAX_RETRIES) {
                        await new Promise((r) =>
                            setTimeout(r, 50 * Math.pow(2, attempt)),
                        );
                        continue;
                    }
                    return NextResponse.json(
                        {
                            error: "Hệ thống đang có giao dịch đồng thời. Vui lòng thử lại.",
                        },
                        { status: 409 },
                    );
                }

                throw txError;
            }
        }

        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi thêm sản phẩm vào hóa đơn." },
            { status: 500 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi thêm sản phẩm vào hóa đơn." },
            { status: 500 },
        );
    }
}
