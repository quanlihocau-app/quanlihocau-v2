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

const uuidSchema = z.string().uuid();

const paymentBodySchema = z
    .object({
        amountVnd: z
            .number({
                message: "Số tiền thanh toán phải là số.",
            })
            .int("Số tiền thanh toán phải là số nguyên.")
            .positive("Số tiền thanh toán phải là số nguyên dương."),
        method: z.nativeEnum(PaymentMethod, {
            message:
                "Phương thức thanh toán không hợp lệ (CASH hoặc BANK_TRANSFER).",
        }),
    })
    .strict();

interface RouteParams {
    params: Promise<{
        invoiceId: string;
    }>;
}

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];
const MAX_RETRIES = 3;

function matchesPaymentRequest(
    payment: {
        invoiceId: string | null;
        amountVnd: number;
        method: PaymentMethod;
        direction: PaymentDirection;
    },
    target: {
        invoiceId: string;
        amountVnd: number;
        method: PaymentMethod;
    },
): boolean {
    return (
        payment.invoiceId === target.invoiceId &&
        payment.amountVnd === target.amountVnd &&
        payment.method === target.method &&
        payment.direction === PaymentDirection.IN
    );
}

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { invoiceId } = await params;

        // Validate invoiceId UUID
        const parsedInvoiceId = uuidSchema.safeParse(invoiceId);
        if (!parsedInvoiceId.success) {
            return NextResponse.json(
                { error: "Mã hóa đơn (invoiceId) không đúng định dạng UUID." },
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

        // Validate JSON body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsedBody = paymentBodySchema.safeParse(body);
        if (!parsedBody.success) {
            const firstError =
                parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { amountVnd, method } = parsedBody.data;

        // Require RBAC tenant context
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);

        // Retry loop for Serializable isolation conflicts (P2034)
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // a. Check if payment already exists for (lakeId, idempotencyKey)
                        const existingPayment = await tx.payment.findUnique({
                            where: {
                                lakeId_idempotencyKey: {
                                    lakeId: tenantContext.lakeId,
                                    idempotencyKey,
                                },
                            },
                        });

                        if (existingPayment) {
                            if (
                                !matchesPaymentRequest(existingPayment, {
                                    invoiceId,
                                    amountVnd,
                                    method,
                                })
                            ) {
                                throw new Error("IDEMPOTENCY_KEY_REUSED");
                            }

                            return {
                                payment: existingPayment,
                                isNew: false,
                            };
                        }

                        // b. Find Invoice belonging to this tenant
                        const invoice = await tx.invoice.findFirst({
                            where: {
                                id: invoiceId,
                                lakeId: tenantContext.lakeId,
                            },
                        });

                        if (!invoice) {
                            throw new Error("INVOICE_NOT_FOUND");
                        }

                        // c. Guard against PAID or VOIDED invoices
                        if (invoice.status === InvoiceStatus.PAID) {
                            throw new Error("INVOICE_ALREADY_PAID");
                        }
                        if (invoice.status === InvoiceStatus.VOIDED) {
                            throw new Error("INVOICE_VOIDED");
                        }

                        // d. Calculate already paid amount (direction = IN, direction = OUT)
                        const payments = await tx.payment.findMany({
                            where: {
                                invoiceId: invoice.id,
                                lakeId: tenantContext.lakeId,
                            },
                            select: { amountVnd: true, direction: true },
                        });

                        const netPaid = payments.reduce(
                            (sum, p) =>
                                p.direction === PaymentDirection.IN
                                    ? sum + p.amountVnd
                                    : sum - p.amountVnd,
                            0,
                        );
                        const paidAmount = Math.max(0, netPaid);

                        // e. Calculate remaining balance
                        const remaining = Math.max(
                            0,
                            invoice.totalAmountVnd - paidAmount,
                        );

                        // f. Overpayment check
                        if (amountVnd > remaining) {
                            throw new Error(`OVERPAYMENT_${remaining}`);
                        }

                        // g. Create Payment record
                        const payment = await tx.payment.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                invoiceId: invoice.id,
                                amountVnd,
                                method,
                                direction: PaymentDirection.IN,
                                idempotencyKey,
                            },
                        });

                        // h. Update Invoice status
                        const newPaidTotal = paidAmount + amountVnd;
                        const newStatus =
                            newPaidTotal >= invoice.totalAmountVnd
                                ? InvoiceStatus.PAID
                                : InvoiceStatus.PARTIALLY_PAID;

                        await tx.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                status: newStatus,
                            },
                        });

                        // i. Create AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "Payment",
                                entityId: payment.id,
                                action: "PAYMENT_RECORDED",
                                payload: JSON.stringify({
                                    invoiceId: invoice.id,
                                    amountVnd,
                                    method,
                                    newInvoiceStatus: newStatus,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        return {
                            payment,
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
                // Business errors
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
                    txError.message === "INVOICE_NOT_FOUND"
                ) {
                    return NextResponse.json(
                        { error: "Hóa đơn không tồn tại hoặc không thuộc hồ câu này." },
                        { status: 404 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "INVOICE_ALREADY_PAID"
                ) {
                    return NextResponse.json(
                        { error: "Hóa đơn đã được thanh toán đầy đủ." },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "INVOICE_VOIDED"
                ) {
                    return NextResponse.json(
                        {
                            error: "Hóa đơn đã bị hủy (VOIDED), không thể ghi nhận thanh toán.",
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message.startsWith("OVERPAYMENT_")
                ) {
                    const remainingStr = txError.message.replace("OVERPAYMENT_", "");
                    const remainingNum = parseInt(remainingStr, 10);
                    const formattedRemaining = isNaN(remainingNum)
                        ? remainingStr
                        : new Intl.NumberFormat("vi-VN").format(remainingNum) + " đ";

                    return NextResponse.json(
                        {
                            error: `Số tiền thanh toán vượt quá số tiền còn lại của hóa đơn (${formattedRemaining}).`,
                        },
                        { status: 409 },
                    );
                }

                // P2002 unique constraint conflict (concurrent same idempotencyKey)
                const isUniqueConflict =
                    typeof txError === "object" &&
                    txError !== null &&
                    "code" in txError &&
                    (txError as { code: string }).code === "P2002";

                if (isUniqueConflict) {
                    const existingPayment = await prisma.payment.findUnique({
                        where: {
                            lakeId_idempotencyKey: {
                                lakeId: tenantContext.lakeId,
                                idempotencyKey,
                            },
                        },
                    });

                    if (existingPayment) {
                        if (
                            !matchesPaymentRequest(existingPayment, {
                                invoiceId,
                                amountVnd,
                                method,
                            })
                        ) {
                            return NextResponse.json(
                                {
                                    error: "Idempotency-Key này đã được dùng cho một yêu cầu thanh toán khác.",
                                },
                                { status: 409 },
                            );
                        }

                        return NextResponse.json(
                            { ...existingPayment, alreadyExists: true },
                            { status: 200 },
                        );
                    }
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

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { invoiceId } = await params;

        // Validate invoiceId UUID
        const parsedInvoiceId = uuidSchema.safeParse(invoiceId);
        if (!parsedInvoiceId.success) {
            return NextResponse.json(
                { error: "Mã hóa đơn (invoiceId) không đúng định dạng UUID." },
                { status: 400 },
            );
        }

        // requireTenantContext() for all valid tenant memberships
        const tenantContext = await requireTenantContext();

        // Verify invoice belongs to this tenant lake
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                lakeId: tenantContext.lakeId,
            },
            select: { id: true },
        });

        if (!invoice) {
            return NextResponse.json(
                { error: "Hóa đơn không tồn tại hoặc không thuộc hồ câu này." },
                { status: 404 },
            );
        }

        // Fetch payments belonging to this invoice and lake
        const payments = await prisma.payment.findMany({
            where: {
                invoiceId: invoice.id,
                lakeId: tenantContext.lakeId,
            },
            select: {
                id: true,
                amountVnd: true,
                method: true,
                direction: true,
                reversalOfId: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(payments, { status: 200 });
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
