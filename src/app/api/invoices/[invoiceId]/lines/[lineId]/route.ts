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

interface RouteParams {
    params: Promise<{
        invoiceId: string;
        lineId: string;
    }>;
}

const MAX_RETRIES = 3;

interface RemoveLineRequestIdentity {
    invoiceId: string;
    lineId: string;
}

function matchesRemoveLineRequest(
    saved: unknown,
    current: RemoveLineRequestIdentity,
): boolean {
    if (!saved || typeof saved !== "object") return false;
    const req = (saved as { request?: unknown }).request;
    if (!req || typeof req !== "object") return false;
    const r = req as {
        operation?: unknown;
        invoiceId?: unknown;
        lineId?: unknown;
    };
    return (
        r.operation === "invoice-product-line:remove" &&
        r.invoiceId === current.invoiceId &&
        r.lineId === current.lineId
    );
}

function handleExistingRemoveLineKey(
    existingKey: { responseStatus: number; responseBody: string },
    current: RemoveLineRequestIdentity,
): NextResponse {
    try {
        const envelope = JSON.parse(existingKey.responseBody);
        if (!matchesRemoveLineRequest(envelope, current)) {
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

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const { invoiceId, lineId } = await params;
        const invoiceIdParse = uuidSchema.safeParse(invoiceId);
        const lineIdParse = uuidSchema.safeParse(lineId);

        if (!invoiceIdParse.success || !lineIdParse.success) {
            return NextResponse.json(
                { error: "ID hóa đơn hoặc ID dòng hàng không hợp lệ." },
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
        const currentRequestIdentity: RemoveLineRequestIdentity = {
            invoiceId,
            lineId,
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
            return handleExistingRemoveLineKey(
                existingKey,
                currentRequestIdentity,
            );
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
                    error: "Chỉ có thể gỡ dòng sản phẩm khi hóa đơn ở trạng thái Nháp (DRAFT).",
                },
                { status: 409 },
            );
        }

        // 3. Find target invoice line
        const line = await prisma.invoiceLine.findFirst({
            where: {
                id: lineId,
                invoiceId: invoice.id,
            },
        });

        if (!line) {
            return NextResponse.json(
                { error: "Không tìm thấy dòng hàng trong hóa đơn này." },
                { status: 404 },
            );
        }

        // 4. Ensure only product lines can be removed (cannot delete session package line or other types)
        if (!line.productId) {
            return NextResponse.json(
                {
                    error: "Chỉ được gỡ các dòng sản phẩm, không thể xóa gói dịch vụ câu gốc hoặc các mục khác khỏi hóa đơn.",
                },
                { status: 400 },
            );
        }

        const productId = line.productId;
        const lineQuantity = Number(line.quantity);

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

                        // Delete the line
                        await tx.invoiceLine.delete({
                            where: { id: line.id },
                        });

                        // Create InventoryMovement (positive quantity for restock/return)
                        await tx.inventoryMovement.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                productId,
                                quantity: lineQuantity,
                                reason: `Hoàn kho do gỡ dòng khỏi hóa đơn #${invoice.id.slice(0, 8)}`,
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

                        // Record AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "Invoice",
                                entityId: invoice.id,
                                action: "INVOICE_PRODUCT_LINE_REMOVED",
                                payload: JSON.stringify({
                                    lineId: line.id,
                                    productId,
                                    productName: line.name,
                                    quantity: lineQuantity,
                                    lineTotalVnd: line.totalVnd,
                                    newTotalAmountVnd,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        const responsePayload = {
                            message: `Đã gỡ sản phẩm "${line.name}" khỏi hóa đơn và hoàn kho thành công.`,
                            invoice: updatedInvoice,
                        };

                        const envelope = {
                            request: {
                                operation:
                                    "invoice-product-line:remove" as const,
                                invoiceId,
                                lineId,
                            },
                            response: responsePayload,
                        };

                        // Save IdempotencyKey record in same tx
                        await tx.idempotencyKey.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                key: idempotencyKey,
                                responseStatus: 200,
                                responseBody: JSON.stringify(envelope),
                            },
                        });

                        return {
                            isIdempotent: false,
                            responseStatus: 200,
                            responseBody: JSON.stringify(envelope),
                        };
                    },
                    {
                        isolationLevel:
                            Prisma.TransactionIsolationLevel.Serializable,
                    },
                );

                return handleExistingRemoveLineKey(
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
                        return handleExistingRemoveLineKey(
                            concurrentKey,
                            currentRequestIdentity,
                        );
                    }
                }

                if (
                    txError instanceof Error &&
                    txError.message === "INVOICE_NOT_DRAFT"
                ) {
                    return NextResponse.json(
                        {
                            error: "Chỉ có thể gỡ dòng sản phẩm khi hóa đơn ở trạng thái Nháp (DRAFT).",
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
            { error: "Đã xảy ra lỗi khi gỡ dòng sản phẩm khỏi hóa đơn." },
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
            { error: "Đã xảy ra lỗi khi gỡ dòng sản phẩm khỏi hóa đơn." },
            { status: 500 },
        );
    }
}
