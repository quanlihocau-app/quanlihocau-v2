import { NextResponse } from "next/server";
import { z } from "zod";

import { InvoiceStatus, Role, SessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const createInvoiceSchema = z.object({
    fishingSessionId: z.string().uuid("fishingSessionId phải là UUID hợp lệ."),
});

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];
const MAX_RETRIES = 3;

const invoiceInclude = {
    customer: {
        select: {
            id: true,
            name: true,
            phoneNormalized: true,
        },
    },
    fishingSession: {
        select: {
            id: true,
            startAt: true,
            endedAt: true,
            packageNameSnapshot: true,
            packagePriceVndSnapshot: true,
        },
    },
    lines: {
        select: {
            id: true,
            name: true,
            unitPrice: true,
            quantity: true,
            totalVnd: true,
        },
    },
};

export async function GET() {
    try {
        const tenantContext = await requireTenantContext();

        const invoices = await prisma.invoice.findMany({
            where: {
                lakeId: tenantContext.lakeId,
            },
            include: invoiceInclude,
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(invoices, { status: 200 });
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

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = createInvoiceSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { fishingSessionId } = parsed.data;

        // Retry loop for Serializable P2034 conflicts
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // 1. Check if invoice already exists for this session
                        const existingInvoice = await tx.invoice.findUnique({
                            where: {
                                lakeId_fishingSessionId: {
                                    lakeId: tenantContext.lakeId,
                                    fishingSessionId,
                                },
                            },
                            include: invoiceInclude,
                        });

                        if (existingInvoice) {
                            return {
                                invoice: existingInvoice,
                                isNew: false,
                            };
                        }

                        // 2. Find and validate FishingSession
                        const session = await tx.fishingSession.findFirst({
                            where: {
                                id: fishingSessionId,
                                lakeId: tenantContext.lakeId,
                            },
                        });

                        if (!session) {
                            throw new Error("SESSION_NOT_FOUND");
                        }

                        if (session.status !== SessionStatus.COMPLETED) {
                            throw new Error("SESSION_NOT_COMPLETED");
                        }

                        if (
                            !session.packageNameSnapshot ||
                            session.packagePriceVndSnapshot === null ||
                            session.packagePriceVndSnapshot === undefined
                        ) {
                            throw new Error("MISSING_BILLING_SNAPSHOT");
                        }

                        // 3. Create Invoice and InvoiceLine
                        const newInvoice = await tx.invoice.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                customerId: session.customerId,
                                fishingSessionId: session.id,
                                status: InvoiceStatus.DRAFT,
                                totalAmountVnd: session.packagePriceVndSnapshot,
                                lines: {
                                    create: {
                                        name: session.packageNameSnapshot,
                                        unitPrice: session.packagePriceVndSnapshot,
                                        quantity: 1,
                                        totalVnd: session.packagePriceVndSnapshot,
                                    },
                                },
                            },
                            include: invoiceInclude,
                        });

                        // 4. Create AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "Invoice",
                                entityId: newInvoice.id,
                                action: "INVOICE_CREATED",
                                payload: JSON.stringify({
                                    fishingSessionId: session.id,
                                    totalAmountVnd: session.packagePriceVndSnapshot,
                                    status: InvoiceStatus.DRAFT,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        return {
                            invoice: newInvoice,
                            isNew: true,
                        };
                    },
                    {
                        isolationLevel: "Serializable",
                    },
                );

                if (result.isNew) {
                    return NextResponse.json(
                        { ...result.invoice, alreadyExists: false },
                        { status: 201 },
                    );
                }

                return NextResponse.json(
                    { ...result.invoice, alreadyExists: true },
                    { status: 200 },
                );
            } catch (txError) {
                // Business errors
                if (
                    txError instanceof Error &&
                    txError.message === "SESSION_NOT_FOUND"
                ) {
                    return NextResponse.json(
                        { error: "Phiên câu không tồn tại hoặc không thuộc hồ câu này." },
                        { status: 404 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "SESSION_NOT_COMPLETED"
                ) {
                    return NextResponse.json(
                        {
                            error: "Chỉ có thể tạo hóa đơn cho phiên câu đã kết thúc (COMPLETED).",
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "MISSING_BILLING_SNAPSHOT"
                ) {
                    return NextResponse.json(
                        {
                            error: "Phiên câu thiếu thông tin snapshot gói cước để lập hóa đơn.",
                        },
                        { status: 400 },
                    );
                }

                // P2002: Unique constraint conflict on concurrent insert
                const isUniqueConflict =
                    typeof txError === "object" &&
                    txError !== null &&
                    "code" in txError &&
                    (txError as { code: string }).code === "P2002";

                if (isUniqueConflict) {
                    const existingInvoice = await prisma.invoice.findUnique({
                        where: {
                            lakeId_fishingSessionId: {
                                lakeId: tenantContext.lakeId,
                                fishingSessionId,
                            },
                        },
                        include: invoiceInclude,
                    });

                    if (existingInvoice) {
                        return NextResponse.json(
                            { ...existingInvoice, alreadyExists: true },
                            { status: 200 },
                        );
                    }
                }

                // P2034: Serialization conflict — retry
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
                            error: "Dữ liệu hóa đơn đang được xử lý đồng thời bởi người khác. Vui lòng thử lại.",
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
