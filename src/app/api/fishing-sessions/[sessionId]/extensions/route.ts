import { NextResponse } from "next/server";
import { z } from "zod";

import { InvoiceStatus, Role, SessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

interface RouteParams {
    params: Promise<{
        sessionId: string;
    }>;
}

const extendSessionSchema = z.object({
    packageId: z.string().uuid("ID gói câu không hợp lệ."),
});

interface ExtensionRequestIdentity {
    sessionId: string;
    packageId: string;
}

interface IdempotencyEnvelope {
    request: ExtensionRequestIdentity;
    response: unknown;
}

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];
const MAX_RETRIES = 3;

function handleExistingExtensionKey(
    keyRecord: { responseStatus: number; responseBody: string },
    currentRequest: ExtensionRequestIdentity,
) {
    try {
        const envelope = JSON.parse(
            keyRecord.responseBody,
        ) as IdempotencyEnvelope;

        if (
            envelope.request &&
            (envelope.request.sessionId !== currentRequest.sessionId ||
                envelope.request.packageId !== currentRequest.packageId)
        ) {
            return NextResponse.json(
                {
                    error: "Idempotency-Key đã được sử dụng cho một yêu cầu khác.",
                },
                { status: 422 },
            );
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

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);
        const { sessionId } = await params;

        const idempotencyKeyHeader =
            request.headers.get("idempotency-key") ||
            request.headers.get("Idempotency-Key");

        if (!idempotencyKeyHeader) {
            return NextResponse.json(
                {
                    error: "Header 'Idempotency-Key' là bắt buộc để gia hạn phiên an toàn.",
                },
                { status: 400 },
            );
        }

        const parsedKey = z.string().uuid().safeParse(idempotencyKeyHeader.trim());
        if (!parsedKey.success) {
            return NextResponse.json(
                { error: "Idempotency-Key phải là chuỗi UUID hợp lệ." },
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

        const parsed = extendSessionSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { packageId } = parsed.data;
        const currentRequestIdentity: ExtensionRequestIdentity = {
            sessionId,
            packageId,
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
            return handleExistingExtensionKey(
                existingKey,
                currentRequestIdentity,
            );
        }

        // Retry loop for Serializable P2034 conflicts
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // Double check idempotency key inside tx
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

                        // 1. Find and validate FishingSession
                        const session = await tx.fishingSession.findFirst({
                            where: {
                                id: sessionId,
                                lakeId: tenantContext.lakeId,
                            },
                        });

                        if (!session) {
                            throw new Error("SESSION_NOT_FOUND");
                        }

                        if (session.status !== SessionStatus.ACTIVE) {
                            throw new Error("SESSION_NOT_ACTIVE");
                        }

                        // 2. Find and validate Package
                        const pkg = await tx.package.findFirst({
                            where: {
                                id: packageId,
                                lakeId: tenantContext.lakeId,
                                deletedAt: null,
                            },
                        });

                        if (!pkg) {
                            throw new Error("PACKAGE_NOT_FOUND");
                        }

                        // 3. Find linked DRAFT Invoice
                        const invoice = await tx.invoice.findUnique({
                            where: {
                                lakeId_fishingSessionId: {
                                    lakeId: tenantContext.lakeId,
                                    fishingSessionId: session.id,
                                },
                            },
                        });

                        if (!invoice || invoice.status !== InvoiceStatus.DRAFT) {
                            throw new Error("NO_DRAFT_INVOICE");
                        }

                        // 4. Calculate new plannedEndAt
                        const now = new Date();
                        const baseTime =
                            session.plannedEndAt.getTime() > now.getTime()
                                ? session.plannedEndAt
                                : now;
                        const newPlannedEndAt = new Date(
                            baseTime.getTime() +
                                pkg.durationMinutes * 60 * 1000,
                        );

                        // 5. Update session plannedEndAt
                        const updatedSession = await tx.fishingSession.update({
                            where: { id: session.id },
                            data: {
                                plannedEndAt: newPlannedEndAt,
                                version: { increment: 1 },
                            },
                        });

                        // 6. Create InvoiceLine for extension
                        const line = await tx.invoiceLine.create({
                            data: {
                                invoiceId: invoice.id,
                                name: `Gia hạn: ${pkg.name} (${pkg.durationMinutes} phút)`,
                                unitPrice: pkg.priceVnd,
                                quantity: 1,
                                totalVnd: pkg.priceVnd,
                            },
                        });

                        // 7. Recalculate Invoice totalAmountVnd
                        const linesAgg = await tx.invoiceLine.aggregate({
                            where: { invoiceId: invoice.id },
                            _sum: { totalVnd: true },
                        });
                        const newTotalAmountVnd = linesAgg._sum.totalVnd ?? 0;

                        await tx.invoice.update({
                            where: { id: invoice.id },
                            data: { totalAmountVnd: newTotalAmountVnd },
                        });

                        // 8. Create AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "FishingSession",
                                entityId: session.id,
                                action: "FISHING_SESSION_EXTENDED",
                                payload: JSON.stringify({
                                    packageId: pkg.id,
                                    packageName: pkg.name,
                                    addedMinutes: pkg.durationMinutes,
                                    priceVnd: pkg.priceVnd,
                                    previousPlannedEndAt:
                                        session.plannedEndAt.toISOString(),
                                    newPlannedEndAt:
                                        newPlannedEndAt.toISOString(),
                                    invoiceId: invoice.id,
                                    invoiceLineId: line.id,
                                    newTotalAmountVnd,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        const responsePayload = {
                            message: `Đã gia hạn thêm ${pkg.durationMinutes} phút (${pkg.name}) thành công.`,
                            session: {
                                id: updatedSession.id,
                                plannedEndAt:
                                    updatedSession.plannedEndAt.toISOString(),
                            },
                            extension: {
                                packageId: pkg.id,
                                packageName: pkg.name,
                                durationMinutes: pkg.durationMinutes,
                                priceVnd: pkg.priceVnd,
                            },
                            invoice: {
                                id: invoice.id,
                                newTotalAmountVnd,
                            },
                        };

                        const envelope: IdempotencyEnvelope = {
                            request: currentRequestIdentity,
                            response: responsePayload,
                        };

                        // 9. Save IdempotencyKey record
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
                        isolationLevel: "Serializable",
                    },
                );

                return handleExistingExtensionKey(
                    {
                        responseStatus: result.responseStatus,
                        responseBody: result.responseBody,
                    },
                    currentRequestIdentity,
                );
            } catch (txError: unknown) {
                // Business errors — do not retry
                if (
                    txError instanceof Error &&
                    txError.message === "SESSION_NOT_FOUND"
                ) {
                    return NextResponse.json(
                        {
                            error: "Phiên câu không tồn tại hoặc không thuộc hồ câu này.",
                        },
                        { status: 404 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "SESSION_NOT_ACTIVE"
                ) {
                    return NextResponse.json(
                        {
                            error: "Chỉ có thể gia hạn phiên câu đang hoạt động (ACTIVE). Phiên này đã kết thúc hoặc bị hủy.",
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "PACKAGE_NOT_FOUND"
                ) {
                    return NextResponse.json(
                        {
                            error: "Gói câu không tồn tại hoặc đã bị vô hiệu hóa.",
                        },
                        { status: 404 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "NO_DRAFT_INVOICE"
                ) {
                    return NextResponse.json(
                        {
                            error: "Phiên câu này chưa có hóa đơn nháp (DRAFT) để ghi nhận chi phí gia hạn. Vui lòng kiểm tra hóa đơn trước khi gia hạn.",
                        },
                        { status: 409 },
                    );
                }

                // P2002: Concurrent request with same key
                const isUniqueConflict =
                    typeof txError === "object" &&
                    txError !== null &&
                    "code" in txError &&
                    (txError as { code: string }).code === "P2002";

                if (isUniqueConflict) {
                    const concurrentKey =
                        await prisma.idempotencyKey.findUnique({
                            where: {
                                lakeId_key: {
                                    lakeId: tenantContext.lakeId,
                                    key: idempotencyKey,
                                },
                            },
                        });

                    if (concurrentKey) {
                        return handleExistingExtensionKey(
                            concurrentKey,
                            currentRequestIdentity,
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
                            error: "Dữ liệu phiên câu đang được xử lý đồng thời bởi người khác. Vui lòng thử lại.",
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
