import { summarizeMoney, summarizeRevenue } from "@/lib/finance";
import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const closeShiftBodySchema = z
    .object({
        note: z.string().max(500).optional(),
        actualCashVnd: z.number().int().min(0).optional(),
        differenceReason: z.string().max(500).optional(),
        receivedBy: z.string().max(100).optional(),
    })
    .optional();

interface ShiftCloseRequestIdentity {
    lakeId: string;
    shiftId?: string;
}

interface IdempotencyEnvelope {
    request: ShiftCloseRequestIdentity;
    response: unknown;
}

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER];
const MAX_RETRIES = 3;

function handleExistingKey(
    keyRecord: { responseStatus: number; responseBody: string },
) {
    try {
        const envelope = JSON.parse(
            keyRecord.responseBody,
        ) as IdempotencyEnvelope;
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
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);
        const lakeId = tenantContext.lakeId;

        // 1. Validate Idempotency-Key header
        const idempotencyKeyHeader =
            request.headers.get("idempotency-key") ||
            request.headers.get("Idempotency-Key");

        if (!idempotencyKeyHeader) {
            return NextResponse.json(
                {
                    error: "Header 'Idempotency-Key' là bắt buộc để chốt ca an toàn.",
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

        // 2. Parse optional body
        let note: string | undefined;
        let actualCashVnd: number | undefined;
        let differenceReason: string | undefined;
        let receivedBy: string | undefined;
        try {
            const body = await request.json();
            const parsedBody = closeShiftBodySchema.safeParse(body);
            if (parsedBody.success && parsedBody.data) {
                note = parsedBody.data.note;
                actualCashVnd = parsedBody.data.actualCashVnd;
                differenceReason = parsedBody.data.differenceReason;
                receivedBy = parsedBody.data.receivedBy;
            }
        } catch {
            // Body is optional
        }

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
            return handleExistingKey(existingKey);
        }

        // 4. Retry loop with Serializable isolation level
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // Double check idempotency in tx
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

                        // Find active open shift
                        let currentShift = await tx.shift.findFirst({
                            where: {
                                lakeId,
                                endTime: null,
                            },
                            include: {
                                closes: true,
                            },
                            orderBy: {
                                startTime: "desc",
                            },
                        });

                        // If no open shift exists, find if one was opened today, otherwise create one
                        if (!currentShift) {
                            const startOfToday = new Date();
                            startOfToday.setHours(0, 0, 0, 0);

                            currentShift = await tx.shift.create({
                                data: {
                                    lakeId,
                                    startTime: startOfToday,
                                },
                                include: {
                                    closes: true,
                                },
                            });
                        }

                        if (currentShift.endTime !== null || currentShift.closes.length > 0) {
                            throw new Error("SHIFT_ALREADY_CLOSED");
                        }

                        const startTime = currentShift.startTime;
                        const endTime = new Date();

                        // 1. Calculate Payments
                        const payments = await tx.payment.findMany({
                            where: {
                                lakeId,
                                createdAt: {
                                    gte: startTime,
                                    lte: endTime,
                                },
                            },
                            select: {
                                amountVnd: true,
                                method: true,
                                direction: true,
                                expenseId: true,
                            },
                        });

                        const totals = summarizeMoney(payments);
                        const totalCashVnd = totals.netCash;
                        const totalTransferVnd = totals.netTransfer;
                        const revenueLines = await tx.invoiceLine.findMany({
                            where: { invoice: { lakeId, status: { not: "VOIDED" }, createdAt: { gte: startTime, lte: endTime } } },
                            include: { invoice: { select: { fishingSessionId: true } } },
                        });
                        const totalRevenueVnd = summarizeRevenue(revenueLines.map(line => ({
                            fishingSessionId: line.invoice.fishingSessionId, lines: [line],
                        }))).totalRevenue;

                        // 2. Calculate Fish Buybacks
                        const fishBuybacksAgg = await tx.fishBuyback.aggregate({
                            where: {
                                lakeId,
                                createdAt: {
                                    gte: startTime,
                                    lte: endTime,
                                },
                            },
                            _sum: {
                                totalVnd: true,
                            },
                        });
                        const fishBuybackVnd = fishBuybacksAgg._sum.totalVnd ?? 0;

                        // 3. Calculate Other Expenses
                        const expensesAgg = await tx.expense.aggregate({
                            where: {
                                lakeId,
                                createdAt: {
                                    gte: startTime,
                                    lte: endTime,
                                },
                            },
                            _sum: {
                                amountVnd: true,
                            },
                        });
                        const otherExpenseVnd = expensesAgg._sum.amountVnd ?? 0;
                        const totalExpenseVnd = fishBuybackVnd + otherExpenseVnd;

                        // 4. Calculate cash difference
                        const openingCashVnd = (currentShift as { openingCashVnd?: number }).openingCashVnd ?? 0;
                        const expectedCashVnd = totalCashVnd + openingCashVnd;
                        const cashDifferenceVnd = actualCashVnd !== undefined
                            ? actualCashVnd - expectedCashVnd
                            : 0;

                        // 5. Validate: if there's a discrepancy, reason is required
                        if (actualCashVnd !== undefined && cashDifferenceVnd !== 0 && !differenceReason?.trim()) {
                            throw new Error("DIFFERENCE_REASON_REQUIRED");
                        }

                        // 6. Update Shift endTime
                        await tx.shift.update({
                            where: { id: currentShift.id },
                            data: { endTime },
                        });

                        const closeNoteParts: string[] = [];
                        if (note) closeNoteParts.push(note);
                        if (actualCashVnd !== undefined) closeNoteParts.push(`Tiền đếm thực tế: ${actualCashVnd} đ`);
                        if (cashDifferenceVnd !== 0) closeNoteParts.push(`Chênh lệch: ${cashDifferenceVnd} đ (Lý do: ${differenceReason || "Không"})`);
                        if (receivedBy) closeNoteParts.push(`Người nhận bàn giao: ${receivedBy}`);
                        const compositeNote = closeNoteParts.length > 0 ? closeNoteParts.join(" | ") : null;

                        // 7. Create ShiftClose snapshot
                        const shiftClose = await tx.shiftClose.create({
                            data: {
                                shiftId: currentShift.id,
                                totalCashVnd,
                                totalTransferVnd,
                                totalRevenueVnd,
                                totalExpenseVnd,
                                fishBuybackVnd,
                                otherExpenseVnd,
                                closedBy: tenantContext.userName,
                                note: compositeNote,
                            },
                        });

                        // 8. Create new shift for next period (auto-open)
                        await tx.shift.create({
                            data: {
                                lakeId,
                                startTime: endTime,
                            },
                        });

                        // 9. Record AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId,
                                entityType: "Shift",
                                entityId: currentShift.id,
                                action: "SHIFT_CLOSED",
                                payload: JSON.stringify({
                                    shiftId: currentShift.id,
                                    shiftCloseId: shiftClose.id,
                                    startTime: startTime.toISOString(),
                                    endTime: endTime.toISOString(),
                                    totalRevenueVnd,
                                    totalExpenseVnd,
                                    totalCashVnd,
                                    totalTransferVnd,
                                    fishBuybackVnd,
                                    otherExpenseVnd,
                                    actualCashVnd: actualCashVnd ?? null,
                                    cashDifferenceVnd,
                                    differenceReason: differenceReason?.trim() || null,
                                    closedBy: tenantContext.userName,
                                    receivedBy: receivedBy?.trim() || null,
                                    note: note ?? null,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        const responsePayload = {
                            message: "Đã chốt ca thành công.",
                            shift: {
                                id: currentShift.id,
                                startTime: startTime.toISOString(),
                                endTime: endTime.toISOString(),
                                isClosed: true,
                            },
                            summary: {
                                revenueVnd: totalRevenueVnd,
                                expenseVnd: totalExpenseVnd,
                                cashVnd: totalCashVnd,
                                transferVnd: totalTransferVnd,
                                fishBuybackVnd,
                                otherExpenseVnd,
                                netProfitVnd: totalRevenueVnd - totalExpenseVnd,
                            },
                            shiftClose: {
                                id: shiftClose.id,
                                closedBy: tenantContext.userName,
                                receivedBy: receivedBy?.trim() || null,
                                closedAt: shiftClose.createdAt.toISOString(),
                                note: shiftClose.note,
                                actualCashVnd: actualCashVnd ?? null,
                                cashDifferenceVnd,
                                differenceReason: differenceReason?.trim() || null,
                            },
                        };

                        const envelope: IdempotencyEnvelope = {
                            request: { lakeId, shiftId: currentShift.id },
                            response: responsePayload,
                        };

                        await tx.idempotencyKey.create({
                            data: {
                                lakeId,
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

                return handleExistingKey({
                    responseStatus: result.responseStatus,
                    responseBody: result.responseBody,
                });
            } catch (txError: unknown) {
                if (
                    txError instanceof Error &&
                    txError.message === "SHIFT_ALREADY_CLOSED"
                ) {
                    return NextResponse.json(
                        { error: "Ca hiện tại đã được chốt trước đó." },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "DIFFERENCE_REASON_REQUIRED"
                ) {
                    return NextResponse.json(
                        { error: "Tiền mặt thực tế chênh lệch. Vui lòng nhập lý do." },
                        { status: 422 },
                    );
                }

                // Handle unique conflict on idempotency key
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
                        return handleExistingKey(concurrentKey);
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
                            error: "Dữ liệu ca đang được xử lý đồng thời bởi người khác. Vui lòng thử lại.",
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
                { error: "Chỉ Chủ hồ hoặc Quản lý mới có quyền chốt ca." },
                { status: 403 },
            );
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi chốt ca." },
            { status: 500 },
        );
    }
}
