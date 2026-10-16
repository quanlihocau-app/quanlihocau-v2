import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const createExpenseSchema = z
    .object({
        description: z
            .string({
                message: "Nội dung phiếu thu là bắt buộc.",
            })
            .trim().min(1, "Nội dung phiếu thu không được để trống.")
            .max(255, "Nội dung phiếu thu không được vượt quá 255 ký tự."),
        amountVnd: z
            .number({
                message: "Số tiền phiếu thu phải là số.",
            })
            .int("Số tiền phiếu thu phải là số nguyên VNĐ.")
            .positive("Số tiền phiếu thu phải là số nguyên dương lớn hơn 0.")
            .max(2147483647, "Số tiền vượt quá giới hạn cho một phiếu."),
        category: z.string().max(50).optional(),
        paymentMethod: z.enum(["CASH", "BANK_TRANSFER"]).optional(),
    })
    .strict();

interface ExpenseRequestIdentity {
    type: string;
    lakeId: string;
    description: string;
    amountVnd: number;
}

interface IdempotencyEnvelope {
    request: ExpenseRequestIdentity;
    response: unknown;
}

const WRITE_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];
const MAX_RETRIES = 3;

function handleExistingKey(
    keyRecord: { responseStatus: number; responseBody: string },
    identity: ExpenseRequestIdentity,
) {
    try {
        const envelope = JSON.parse(
            keyRecord.responseBody,
        ) as IdempotencyEnvelope;
        if (JSON.stringify(envelope.request) !== JSON.stringify(identity)) {
            return NextResponse.json({ error: "Mã yêu cầu đã dùng cho nội dung khác." }, { status: 409 });
        }
        return NextResponse.json(envelope.response, {
            status: keyRecord.responseStatus,
        });
    } catch {
        return new NextResponse(keyRecord.responseBody, {
            status: keyRecord.responseStatus,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(WRITE_ROLES);
        const lakeId = tenantContext.lakeId;

        // 1. Validate Idempotency-Key header
        const idempotencyKeyHeader =
            request.headers.get("idempotency-key") ||
            request.headers.get("Idempotency-Key");

        if (!idempotencyKeyHeader) {
            return NextResponse.json(
                {
                    error: "Header 'Idempotency-Key' là bắt buộc để tạo phiếu thu an toàn.",
                },
                { status: 400 },
            );
        }

        const parsedKey = z
            .string()
            .uuid()
            .safeParse(idempotencyKeyHeader.trim());
        if (!parsedKey.success) {
            return NextResponse.json(
                { error: "Idempotency-Key phải là chuỗi UUID hợp lệ." },
                { status: 400 },
            );
        }
        const idempotencyKey = parsedKey.data;

        // 2. Validate JSON body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = createExpenseSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { description, amountVnd, category } = parsed.data;
        const paymentMethod = parsed.data.paymentMethod ?? "CASH";

        // Format clean full description
        let fullDescription = description.trim();
        const prefixParts: string[] = [];
        if (category && category.trim()) {
            prefixParts.push(category.trim());
        }
        if (paymentMethod) {
            prefixParts.push(
                paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản",
            );
        }
        if (prefixParts.length > 0) {
            fullDescription = `[${prefixParts.join(" - ")}] ${fullDescription}`;
        }

        const currentRequestIdentity: ExpenseRequestIdentity = {
            type: "RECEIPT",
            lakeId,
            description: fullDescription,
            amountVnd,
        };

        // 3. Check existing idempotency key
        const existingKey = await prisma.idempotencyKey.findUnique({
            where: {
                lakeId_key: {
                    lakeId,
                    key: idempotencyKey,
                },
            },
        });

        if (existingKey) {
            return handleExistingKey(existingKey, currentRequestIdentity);
        }

        // 4. Retry loop with Serializable isolation level
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        const existingInTx = await tx.idempotencyKey.findUnique({
                            where: {
                                lakeId_key: {
                                    lakeId,
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

                        // Create Expense
                        const createdExpense = await tx.invoice.create({
                            data: { lakeId, status: "PAID", totalAmountVnd: amountVnd,
                                subtotalVnd: amountVnd, paidAmountVnd: amountVnd, balanceDueVnd: 0,
                                lines: { create: { name: "Thu khác: " + fullDescription,
                                    quantity: 1, unitPrice: amountVnd, totalVnd: amountVnd } } },
                        });

                        await tx.payment.create({
                            data: { lakeId, invoiceId: createdExpense.id, amountVnd,
                                method: paymentMethod, direction: "IN", idempotencyKey },
                        });

                        // Record AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId,
                                entityType: "Invoice",
                                entityId: createdExpense.id,
                                action: "RECEIPT_CREATED",
                                payload: JSON.stringify({
                                    receiptId: createdExpense.id,
                                    description: fullDescription,
                                    amountVnd,
                                    category: category ?? null,
                                    paymentMethod: paymentMethod ?? null,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        const responsePayload = {
                            message: "Đã ghi nhận phiếu thu thành công.",
                            receipt: {
                                id: createdExpense.id,
                                description: fullDescription,
                                amountVnd: createdExpense.totalAmountVnd,
                                createdAt: createdExpense.createdAt.toISOString(),
                            },
                        };

                        const envelope: IdempotencyEnvelope = {
                            request: currentRequestIdentity,
                            response: responsePayload,
                        };

                        await tx.idempotencyKey.create({
                            data: {
                                lakeId,
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
                        isolationLevel: "Serializable",
                    },
                );

                return handleExistingKey({
                    responseStatus: result.responseStatus,
                    responseBody: result.responseBody,
                }, currentRequestIdentity);
            } catch (txError: unknown) {
                // Unique conflict on idempotency key
                const isUniqueConflict =
                    typeof txError === "object" &&
                    txError !== null &&
                    "code" in txError &&
                    (txError as { code: string }).code === "P2002";

                if (isUniqueConflict) {
                    const concurrentKey = await prisma.idempotencyKey.findUnique({
                        where: {
                            lakeId_key: {
                                lakeId,
                                key: idempotencyKey,
                            },
                        },
                    });

                    if (concurrentKey) {
                        return handleExistingKey(concurrentKey, currentRequestIdentity);
                    }
                }

                // Serialization conflict retry
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
                            error: "Dữ liệu phiếu thu đang được xử lý đồng thời bởi người khác. Vui lòng thử lại.",
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
            return NextResponse.json(
                { error: "Tài khoản không có quyền tạo phiếu thu." },
                { status: 403 },
            );
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tạo phiếu thu." },
            { status: 500 },
        );
    }
}
