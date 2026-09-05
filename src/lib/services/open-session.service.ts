import { z } from "zod";
import {
    InvoiceStatus,
    PaymentDirection,
    PaymentMethod,
    Prisma,
    SessionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export const openSessionSchema = z.object({
    clientMutationId: z.string().uuid("clientMutationId không hợp lệ.").optional(),
    packageId: z.string().uuid("ID gói câu không hợp lệ."),
    hutIds: z
        .array(z.string().uuid("ID chòi không hợp lệ."))
        .min(1, "Phải chọn ít nhất 1 chòi.")
        .max(10, "Tối đa 10 chòi mỗi phiên.")
        .refine(
            (ids) => new Set(ids).size === ids.length,
            "Danh sách chòi không được trùng lặp.",
        ),
    customer: z
        .object({
            mode: z.enum(["GUEST", "EXISTING", "NEW"]).default("GUEST"),
            id: z.string().uuid().nullable().optional(),
            name: z
                .string()
                .trim()
                .min(2, "Tên khách hàng phải có ít nhất 2 ký tự.")
                .nullable()
                .optional(),
            phone: z.string().trim().nullable().optional(),
        })
        .optional(),
    // Backward compatibility for flat customerId
    customerId: z.string().uuid().nullable().optional(),
    paymentMode: z.enum(["PREPAID", "POSTPAID"]).default("POSTPAID").optional(),
    payments: z
        .array(
            z.object({
                method: z.nativeEnum(PaymentMethod),
                amountVnd: z
                    .number()
                    .int("Số tiền thanh toán phải là số nguyên.")
                    .positive("Số tiền thanh toán phải lớn hơn 0."),
                reference: z.string().nullable().optional(),
            }),
        )
        .optional(),
    items: z
        .array(
            z.object({
                productId: z.string().uuid("ID sản phẩm không hợp lệ."),
                quantity: z
                    .number()
                    .positive("Số lượng sản phẩm phải lớn hơn 0."),
            }),
        )
        .optional(),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;

export interface OpenSessionResult {
    ok: boolean;
    data: {
        session: {
            id: string;
            status: SessionStatus;
            startTime: string;
            endTime: string;
        };
        invoice: {
            id: string;
            status: InvoiceStatus;
            totalAmountVnd: number;
            paidAmountVnd: number;
            balanceDueVnd: number;
        };
        serverNow: string;
    };
    id: string;
    startTime: string;
    endTime: string;
    startAt: string;
    plannedEndAt: string;
    invoiceId: string;
    totalAmountVnd: number;
    packageNameSnapshot: string;
    packagePriceVndSnapshot: number;
    packageDurationMinutesSnapshot: number;
    customer: {
        id: string;
        name: string;
        phoneNormalized: string | null;
    } | null;
    requestId: string;
}

export async function openSession(
    rawInput: unknown,
    tenantContext: TenantContext,
    idempotencyKey?: string | null,
): Promise<OpenSessionResult> {
    const parsed = openSessionSchema.safeParse(rawInput);
    if (!parsed.success) {
        const firstError =
            parsed.error.issues[0]?.message ?? "Dữ liệu mở phiên không hợp lệ.";
        throw new Error(`VALIDATION_ERROR: ${firstError}`);
    }

    const input = parsed.data;
    const effectiveKey = idempotencyKey || input.clientMutationId;

    // Retry loop for Serializable P2034 conflicts
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    // 1. Idempotency Check inside transaction
                    if (effectiveKey) {
                        const existingKey = await tx.idempotencyKey.findUnique({
                            where: {
                                lakeId_key: {
                                    lakeId: tenantContext.lakeId,
                                    key: effectiveKey,
                                },
                            },
                        });

                        if (existingKey) {
                            try {
                                return JSON.parse(
                                    existingKey.responseBody,
                                ) as OpenSessionResult;
                            } catch {
                                // proceed if parse fails
                            }
                        }
                    }

                    // 2. Validate Package belongs to lake and is not deleted
                    const pkg = await tx.package.findFirst({
                        where: {
                            id: input.packageId,
                            lakeId: tenantContext.lakeId,
                            deletedAt: null,
                        },
                    });

                    if (!pkg) {
                        throw new Error(
                            "PACKAGE_NOT_FOUND: Gói câu không tồn tại hoặc đã ngừng áp dụng.",
                        );
                    }

                    // 3. Handle Customer (GUEST, EXISTING, NEW)
                    let resolvedCustomerId: string | null = null;
                    let customerRecord: {
                        id: string;
                        name: string;
                        phoneNormalized: string | null;
                    } | null = null;

                    const customerMode = input.customer?.mode ?? (input.customerId ? "EXISTING" : "GUEST");

                    if (customerMode === "NEW") {
                        if (!input.customer?.name || input.customer.name.trim().length < 2) {
                            throw new Error(
                                "VALIDATION_ERROR: Tên khách hàng mới phải có ít nhất 2 ký tự.",
                            );
                        }
                        const phone = input.customer.phone?.trim() || null;

                        if (phone) {
                            const existingCust = await tx.customer.findFirst({
                                where: {
                                    lakeId: tenantContext.lakeId,
                                    phoneNormalized: phone,
                                    deletedAt: null,
                                },
                            });
                            if (existingCust) {
                                resolvedCustomerId = existingCust.id;
                                customerRecord = {
                                    id: existingCust.id,
                                    name: existingCust.name,
                                    phoneNormalized: existingCust.phoneNormalized,
                                };
                            }
                        }

                        if (!resolvedCustomerId) {
                            const createdCustomer = await tx.customer.create({
                                data: {
                                    lakeId: tenantContext.lakeId,
                                    name: input.customer.name.trim(),
                                    phoneNormalized: phone,
                                },
                            });
                            resolvedCustomerId = createdCustomer.id;
                            customerRecord = {
                                id: createdCustomer.id,
                                name: createdCustomer.name,
                                phoneNormalized: createdCustomer.phoneNormalized,
                            };
                        }
                    } else if (customerMode === "EXISTING" || input.customerId) {
                        const targetId = input.customer?.id || input.customerId;
                        if (targetId) {
                            const existingCust = await tx.customer.findFirst({
                                where: {
                                    id: targetId,
                                    lakeId: tenantContext.lakeId,
                                    deletedAt: null,
                                },
                            });
                            if (!existingCust) {
                                throw new Error(
                                    "CUSTOMER_NOT_FOUND: Khách hàng không tồn tại trong hồ này.",
                                );
                            }
                            resolvedCustomerId = existingCust.id;
                            customerRecord = {
                                id: existingCust.id,
                                name: existingCust.name,
                                phoneNormalized: existingCust.phoneNormalized,
                            };
                        }
                    } else {
                        // GUEST: Do not create any customer record
                        resolvedCustomerId = null;
                        customerRecord = null;
                    }

                    // 4. Calculate Server-Authoritative Times
                    const now = new Date();
                    const plannedEndAt = new Date(
                        now.getTime() + pkg.durationMinutes * 60 * 1000,
                    );

                    // 5. Create FishingSession
                    const session = await tx.fishingSession.create({
                        data: {
                            lakeId: tenantContext.lakeId,
                            customerId: resolvedCustomerId,
                            packageId: pkg.id,
                            startAt: now,
                            plannedEndAt,
                            status: SessionStatus.ACTIVE,
                            packageNameSnapshot: pkg.name,
                            packageDurationMinutesSnapshot: pkg.durationMinutes,
                            packagePriceVndSnapshot: pkg.priceVnd,
                            overtimeHourlyVndSnapshot: pkg.overtimeHourlyVnd,
                        },
                    });

                    // 6. Atomically claim each Hut — fails if any hut is occupied
                    for (const hutId of input.hutIds) {
                        const updated = await tx.hut.updateMany({
                            where: {
                                id: hutId,
                                lakeId: tenantContext.lakeId,
                                currentSessionId: null,
                                deletedAt: null,
                            },
                            data: {
                                currentSessionId: session.id,
                                version: { increment: 1 },
                            },
                        });

                        if (updated.count === 0) {
                            throw new Error("SPOT_OCCUPIED");
                        }
                    }

                    // 7. Create FishingSessionHut records
                    await tx.fishingSessionHut.createMany({
                        data: input.hutIds.map((hutId) => ({
                            lakeId: tenantContext.lakeId,
                            fishingSessionId: session.id,
                            hutId,
                        })),
                    });

                    // 8. Prepare Invoice lines and calculate total
                    const totalPackageVnd = pkg.priceVnd * input.hutIds.length;
                    const initialPackageLineName = `Tiền ca: ${pkg.name}${input.hutIds.length > 1 ? ` (${input.hutIds.length} ô)` : ""}`;

                    const linesToCreate: Array<{
                        productId?: string;
                        name: string;
                        unitPrice: number;
                        quantity: Prisma.Decimal | number;
                        totalVnd: number;
                    }> = [
                        {
                            name: initialPackageLineName,
                            unitPrice: pkg.priceVnd,
                            quantity: input.hutIds.length,
                            totalVnd: totalPackageVnd,
                        },
                    ];

                    let totalItemsVnd = 0;
                    if (input.items && input.items.length > 0) {
                        for (const item of input.items) {
                            const product = await tx.product.findFirst({
                                where: {
                                    id: item.productId,
                                    lakeId: tenantContext.lakeId,
                                    deletedAt: null,
                                },
                            });
                            if (!product) {
                                throw new Error(
                                    `PRODUCT_NOT_FOUND: Sản phẩm không tồn tại trong hồ câu.`,
                                );
                            }

                            const itemTotal = product.priceVnd * item.quantity;
                            totalItemsVnd += itemTotal;

                            linesToCreate.push({
                                productId: product.id,
                                name: product.name,
                                unitPrice: product.priceVnd,
                                quantity: new Prisma.Decimal(item.quantity),
                                totalVnd: itemTotal,
                            });

                            await tx.inventoryMovement.create({
                                data: {
                                    lakeId: tenantContext.lakeId,
                                    productId: product.id,
                                    quantity: new Prisma.Decimal(-item.quantity),
                                    reason: `Bán kèm mở ca câu (${session.id})`,
                                    createdBy: tenantContext.userId,
                                },
                            });
                        }
                    }

                    const totalGrossAmountVnd = totalPackageVnd + totalItemsVnd;

                    // 9. Initial payments if prepaid
                    let totalPaidVnd = 0;
                    const paymentsToCreate: Array<{
                        lakeId: string;
                        amountVnd: number;
                        method: PaymentMethod;
                        direction: PaymentDirection;
                        createdAt: Date;
                    }> = [];

                    if (input.payments && input.payments.length > 0) {
                        for (const p of input.payments) {
                            totalPaidVnd += p.amountVnd;
                            paymentsToCreate.push({
                                lakeId: tenantContext.lakeId,
                                amountVnd: p.amountVnd,
                                method: p.method,
                                direction: PaymentDirection.IN,
                                createdAt: now,
                            });
                        }
                    }

                    const invoiceStatus =
                        totalPaidVnd >= totalGrossAmountVnd
                            ? InvoiceStatus.PAID
                            : totalPaidVnd > 0
                              ? InvoiceStatus.PARTIALLY_PAID
                              : InvoiceStatus.DRAFT;

                    // 10. Atomically create Invoice with lines and payments
                    const invoice = await tx.invoice.create({
                        data: {
                            lakeId: tenantContext.lakeId,
                            customerId: resolvedCustomerId,
                            fishingSessionId: session.id,
                            status: invoiceStatus,
                            totalAmountVnd: totalGrossAmountVnd,
                            lines: {
                                create: linesToCreate,
                            },
                            payments:
                                paymentsToCreate.length > 0
                                    ? {
                                          create: paymentsToCreate,
                                      }
                                    : undefined,
                        },
                    });

                    // 11. Audit logs
                    await tx.auditEvent.create({
                        data: {
                            lakeId: tenantContext.lakeId,
                            entityType: "FishingSession",
                            entityId: session.id,
                            action: "FISHING_SESSION_OPENED",
                            payload: JSON.stringify({
                                packageId: pkg.id,
                                hutIds: input.hutIds,
                                customerId: resolvedCustomerId,
                                startAt: now.toISOString(),
                                plannedEndAt: plannedEndAt.toISOString(),
                            }),
                            createdBy: tenantContext.userId,
                        },
                    });

                    await tx.auditEvent.create({
                        data: {
                            lakeId: tenantContext.lakeId,
                            entityType: "Invoice",
                            entityId: invoice.id,
                            action: "INVOICE_CREATED",
                            payload: JSON.stringify({
                                fishingSessionId: session.id,
                                status: invoice.status,
                                totalAmountVnd: totalGrossAmountVnd,
                                paidAmountVnd: totalPaidVnd,
                            }),
                            createdBy: tenantContext.userId,
                        },
                    });

                    const requestId = crypto.randomUUID();

                    const result: OpenSessionResult = {
                        ok: true,
                        data: {
                            session: {
                                id: session.id,
                                status: session.status,
                                startTime: now.toISOString(),
                                endTime: plannedEndAt.toISOString(),
                            },
                            invoice: {
                                id: invoice.id,
                                status: invoice.status,
                                totalAmountVnd: totalGrossAmountVnd,
                                paidAmountVnd: totalPaidVnd,
                                balanceDueVnd: totalGrossAmountVnd - totalPaidVnd,
                            },
                            serverNow: now.toISOString(),
                        },
                        // Direct root fields for backward compatibility
                        id: session.id,
                        startTime: now.toISOString(),
                        endTime: plannedEndAt.toISOString(),
                        startAt: now.toISOString(),
                        plannedEndAt: plannedEndAt.toISOString(),
                        invoiceId: invoice.id,
                        totalAmountVnd: totalGrossAmountVnd,
                        packageNameSnapshot: pkg.name,
                        packagePriceVndSnapshot: pkg.priceVnd,
                        packageDurationMinutesSnapshot: pkg.durationMinutes,
                        customer: customerRecord,
                        requestId,
                    };

                    // 12. Save IdempotencyKey record
                    if (effectiveKey) {
                        await tx.idempotencyKey.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                key: effectiveKey,
                                responseStatus: 201,
                                responseBody: JSON.stringify(result),
                            },
                        });
                    }

                    return result;
                },
                {
                    isolationLevel: "Serializable",
                },
            );
        } catch (err: unknown) {
            const isP2034 =
                typeof err === "object" &&
                err !== null &&
                "code" in err &&
                (err as { code: string }).code === "P2034";

            if (isP2034 && attempt < MAX_RETRIES) {
                // Backoff retry on serialization conflict
                await new Promise((r) => setTimeout(r, 50 * Math.pow(2, attempt)));
                continue;
            }

            // Check if concurrent request completed with idempotency key
            if (effectiveKey) {
                const concurrentKey = await prisma.idempotencyKey.findUnique({
                    where: {
                        lakeId_key: {
                            lakeId: tenantContext.lakeId,
                            key: effectiveKey,
                        },
                    },
                });
                if (concurrentKey) {
                    try {
                        return JSON.parse(
                            concurrentKey.responseBody,
                        ) as OpenSessionResult;
                    } catch {
                        // proceed with original error
                    }
                }
            }

            throw err;
        }
    }

    throw new Error("Không thể mở phiên câu do xung đột hệ thống.");
}
