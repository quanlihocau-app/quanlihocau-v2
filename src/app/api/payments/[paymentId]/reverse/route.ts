import { NextResponse } from "next/server";
import { z } from "zod";

import {
    InvoiceStatus,
    PaymentDirection,
    Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const uuidSchema = z.string().uuid();

interface RouteParams {
    params: Promise<{
        paymentId: string;
    }>;
}

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER];
const MAX_RETRIES = 3;

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { paymentId } = await params;

        // 1. Validate paymentId UUID
        const parsedPaymentId = uuidSchema.safeParse(paymentId);
        if (!parsedPaymentId.success) {
            return NextResponse.json(
                { error: "Mã thanh toán (paymentId) không đúng định dạng UUID." },
                { status: 400 },
            );
        }

        // 2. Validate Idempotency-Key header
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

        // 3. Require RBAC tenant context: Only OWNER and MANAGER allowed
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);

        // 4. Retry loop for Serializable isolation conflicts (P2034)
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // a. Check if payment already exists for (lakeId, idempotencyKey)
                        const existingByKey = await tx.payment.findUnique({
                            where: {
                                lakeId_idempotencyKey: {
                                    lakeId: tenantContext.lakeId,
                                    idempotencyKey,
                                },
                            },
                        });

                        if (existingByKey) {
                            if (
                                existingByKey.direction === PaymentDirection.OUT &&
                                existingByKey.reversalOfId === paymentId
                            ) {
                                return {
                                    payment: existingByKey,
                                    isNew: false,
                                };
                            }

                            throw new Error("IDEMPOTENCY_KEY_REUSED");
                        }

                        // b. Find original Payment belonging to current lake
                        const originalPayment = await tx.payment.findFirst({
                            where: {
                                id: paymentId,
                                lakeId: tenantContext.lakeId,
                            },
                        });

                        if (!originalPayment) {
                            throw new Error("PAYMENT_NOT_FOUND");
                        }

                        // c. Validate original payment can be reversed
                        if (
                            !originalPayment.invoiceId ||
                            originalPayment.direction !== PaymentDirection.IN ||
                            originalPayment.reversalOfId !== null
                        ) {
                            throw new Error("PAYMENT_NOT_REVERSIBLE");
                        }

                        // d. Check if original payment already has a reversal record
                        const existingReversal = await tx.payment.findFirst({
                            where: {
                                lakeId: tenantContext.lakeId,
                                reversalOfId: originalPayment.id,
                            },
                        });

                        if (existingReversal) {
                            if (existingReversal.idempotencyKey === idempotencyKey) {
                                return {
                                    payment: existingReversal,
                                    isNew: false,
                                };
                            }
                            throw new Error("PAYMENT_ALREADY_REVERSED");
                        }

                        // e. Find associated Invoice
                        const invoice = await tx.invoice.findFirst({
                            where: {
                                id: originalPayment.invoiceId,
                                lakeId: tenantContext.lakeId,
                            },
                        });

                        if (!invoice) {
                            throw new Error("INVOICE_NOT_FOUND");
                        }

                        if (invoice.status === InvoiceStatus.VOIDED) {
                            throw new Error("INVOICE_VOIDED");
                        }

                        // f. Create reversal Payment (direction = OUT, reversalOfId = originalPayment.id)
                        const reversalPayment = await tx.payment.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                invoiceId: originalPayment.invoiceId,
                                amountVnd: originalPayment.amountVnd,
                                method: originalPayment.method,
                                direction: PaymentDirection.OUT,
                                reversalOfId: originalPayment.id,
                                idempotencyKey,
                            },
                        });

                        // g. Recalculate net paid amount for the invoice
                        const allPayments = await tx.payment.findMany({
                            where: {
                                invoiceId: invoice.id,
                                lakeId: tenantContext.lakeId,
                            },
                            select: {
                                amountVnd: true,
                                direction: true,
                            },
                        });

                        const netPaid = allPayments.reduce(
                            (sum, p) =>
                                p.direction === PaymentDirection.IN
                                    ? sum + p.amountVnd
                                    : sum - p.amountVnd,
                            0,
                        );
                        const paidAmount = Math.max(0, netPaid);

                        // If paidAmount is 0 => DRAFT, if > 0 => PARTIALLY_PAID (or PAID if >= total)
                        const newStatus =
                            paidAmount <= 0
                                ? InvoiceStatus.DRAFT
                                : paidAmount >= invoice.totalAmountVnd
                                ? InvoiceStatus.PAID
                                : InvoiceStatus.PARTIALLY_PAID;

                        await tx.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                status: newStatus,
                            },
                        });

                        // h. Create AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "Payment",
                                entityId: reversalPayment.id,
                                action: "PAYMENT_REVERSED",
                                payload: JSON.stringify({
                                    originalPaymentId: originalPayment.id,
                                    invoiceId: originalPayment.invoiceId,
                                    amountVnd: originalPayment.amountVnd,
                                    method: originalPayment.method,
                                    newInvoiceStatus: newStatus,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        return {
                            payment: reversalPayment,
                            isNew: true,
                        };
                    },
                    {
                        isolationLevel: "Serializable",
                    },
                );

                if (result.isNew) {
                    return NextResponse.json(
                        { ...result.payment, alreadyExists: false },
                        { status: 201 },
                    );
                }

                return NextResponse.json(
                    { ...result.payment, alreadyExists: true },
                    { status: 200 },
                );
            } catch (txError) {
                if (
                    txError instanceof Error &&
                    txError.message === "IDEMPOTENCY_KEY_REUSED"
                ) {
                    return NextResponse.json(
                        {
                            error: "Idempotency-Key này đã được dùng cho một yêu cầu thanh toán khác.",
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "PAYMENT_NOT_FOUND"
                ) {
                    return NextResponse.json(
                        {
                            error: "Khoản thanh toán không tồn tại hoặc không thuộc hồ câu này.",
                        },
                        { status: 404 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "PAYMENT_NOT_REVERSIBLE"
                ) {
                    return NextResponse.json(
                        {
                            error: "Khoản thanh toán không hợp lệ để hoàn tác.",
                        },
                        { status: 400 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "PAYMENT_ALREADY_REVERSED"
                ) {
                    return NextResponse.json(
                        { error: "Khoản thanh toán này đã được hoàn tác." },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "INVOICE_NOT_FOUND"
                ) {
                    return NextResponse.json(
                        { error: "Hóa đơn không tồn tại hoặc không thuộc hồ câu này." },
                        { status: 404 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "INVOICE_VOIDED"
                ) {
                    return NextResponse.json(
                        {
                            error: "Hóa đơn đã bị hủy (VOIDED), không thể hoàn tác thanh toán.",
                        },
                        { status: 409 },
                    );
                }

                // P2002 unique constraint conflict (concurrent same idempotencyKey or reversalOfId)
                const isUniqueConflict =
                    typeof txError === "object" &&
                    txError !== null &&
                    "code" in txError &&
                    (txError as { code: string }).code === "P2002";

                if (isUniqueConflict) {
                    const existingByKey = await prisma.payment.findUnique({
                        where: {
                            lakeId_idempotencyKey: {
                                lakeId: tenantContext.lakeId,
                                idempotencyKey,
                            },
                        },
                    });

                    if (
                        existingByKey &&
                        existingByKey.direction === PaymentDirection.OUT &&
                        existingByKey.reversalOfId === paymentId
                    ) {
                        return NextResponse.json(
                            { ...existingByKey, alreadyExists: true },
                            { status: 200 },
                        );
                    }

                    const existingByReversal = await prisma.payment.findFirst({
                        where: {
                            lakeId: tenantContext.lakeId,
                            reversalOfId: paymentId,
                        },
                    });

                    if (existingByReversal) {
                        return NextResponse.json(
                            { error: "Khoản thanh toán này đã được hoàn tác." },
                            { status: 409 },
                        );
                    }

                    return NextResponse.json(
                        {
                            error: "Idempotency-Key này đã được dùng cho một yêu cầu thanh toán khác.",
                        },
                        { status: 409 },
                    );
                }

                // P2034 serialization conflict retry
                const isSerializationConflict =
                    typeof txError === "object" &&
                    txError !== null &&
                    "code" in txError &&
                    (txError as { code: string }).code === "P2034";

                if (isSerializationConflict && attempt < MAX_RETRIES) {
                    continue;
                }

                if (isSerializationConflict) {
                    return NextResponse.json(
                        {
                            error: "Dữ liệu thanh toán đang được xử lý đồng thời bởi người khác. Vui lòng thử lại.",
                        },
                        { status: 409 },
                    );
                }

                throw txError;
            }
        }

        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}
