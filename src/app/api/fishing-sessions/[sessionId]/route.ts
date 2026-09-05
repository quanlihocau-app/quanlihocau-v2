import { NextResponse } from "next/server";
import { z } from "zod";

import { InvoiceStatus, Prisma, Role, SessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const actionSchema = z.object({
    action: z.enum(["COMPLETE", "CANCEL"], {
        message: 'Hành động phải là "COMPLETE" hoặc "CANCEL".',
    }),
    settlement: z
        .object({
            amountVnd: z.number().int().nonnegative().optional(),
            paymentMethod: z
                .enum(["CASH", "BANK_TRANSFER"])
                .optional()
                .default("CASH"),
            refundVnd: z.number().int().nonnegative().optional(),
            note: z.string().trim().max(255).optional(),
        })
        .optional(),
});

interface RouteParams {
    params: Promise<{
        sessionId: string;
    }>;
}

const ROLE_COMPLETE = [Role.OWNER, Role.MANAGER, Role.STAFF];
const ROLE_CANCEL = [Role.OWNER, Role.MANAGER];

const MAX_RETRIES = 3;

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { sessionId } = await params;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = actionSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { action } = parsed.data;

        // RBAC: CANCEL requires OWNER/MANAGER; COMPLETE allows STAFF too
        const allowedRoles = action === "CANCEL" ? ROLE_CANCEL : ROLE_COMPLETE;
        const tenantContext = await requireTenantContext(allowedRoles);

        // Retry loop for Serializable P2034 conflicts
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // 1. Find ACTIVE session belonging to this tenant
                        const session = await tx.fishingSession.findFirst({
                            where: {
                                id: sessionId,
                                lakeId: tenantContext.lakeId,
                                status: SessionStatus.ACTIVE,
                            },
                            include: {
                                hutLinks: {
                                    select: { hutId: true },
                                },
                                customer: {
                                    select: { name: true, phoneNormalized: true },
                                },
                            },
                        });

                        if (!session) {
                            throw new Error("SESSION_NOT_ACTIVE");
                        }

                        const hutIds = session.hutLinks.map((hl) => hl.hutId);
                        const endedAt = new Date();

                        // 2. Invariant Guard: Session must have a linked Invoice before completing
                        if (action === "COMPLETE") {
                            const existingInvoice = await tx.invoice.findFirst({
                                where: {
                                    fishingSessionId: session.id,
                                    lakeId: tenantContext.lakeId,
                                },
                            });

                            let finalInvoice = existingInvoice;
                            if (!existingInvoice) {
                                // Must authoritatively reconstruct from snapshot, extensions and inventory movements
                                if (
                                    !session.packageNameSnapshot ||
                                    !session.packagePriceVndSnapshot ||
                                    session.packagePriceVndSnapshot <= 0
                                ) {
                                    throw new Error(
                                        "INVOICE_INVARIANT_BROKEN: Thiếu hoặc sai lệch giá gói snapshot gốc của phiên câu.",
                                    );
                                }

                                const hutCount = Math.max(hutIds.length, 1);
                                const basePackageTotal = session.packagePriceVndSnapshot * hutCount;
                                const reconstructedLines: Array<{
                                    productId?: string;
                                    name: string;
                                    unitPrice: number;
                                    quantity: Prisma.Decimal | number;
                                    totalVnd: number;
                                }> = [
                                    {
                                        name: `Tiền ca: ${session.packageNameSnapshot}${hutCount > 1 ? ` (${hutCount} ô)` : ""}`,
                                        unitPrice: session.packagePriceVndSnapshot,
                                        quantity: hutCount,
                                        totalVnd: basePackageTotal,
                                    },
                                ];

                                // 2a. Reconcile extension history from AuditEvent
                                const extensionEvents = await tx.auditEvent.findMany({
                                    where: {
                                        lakeId: tenantContext.lakeId,
                                        entityType: "FishingSession",
                                        entityId: session.id,
                                        action: "FISHING_SESSION_EXTENDED",
                                    },
                                    orderBy: { createdAt: "asc" },
                                });

                                for (const ev of extensionEvents) {
                                    try {
                                        const payload = JSON.parse(ev.payload);
                                        if (
                                            !payload ||
                                            typeof payload.priceVnd !== "number" ||
                                            payload.priceVnd <= 0
                                        ) {
                                            throw new Error("Dữ liệu giá gia hạn không hợp lệ.");
                                        }
                                        reconstructedLines.push({
                                            name: `Gia hạn: ${payload.packageName || "Thêm giờ"}`,
                                            unitPrice: payload.priceVnd,
                                            quantity: 1,
                                            totalVnd: payload.priceVnd,
                                        });
                                    } catch (err: unknown) {
                                        throw new Error(
                                            `INVOICE_INVARIANT_BROKEN: Lỗi đối chiếu lịch sử gia hạn (${err instanceof Error ? err.message : String(err)})`,
                                        );
                                    }
                                }

                                // 2b. Reconcile products sold linked to this session
                                const inventoryMovements = await tx.inventoryMovement.findMany({
                                    where: {
                                        lakeId: tenantContext.lakeId,
                                        reason: { contains: session.id },
                                    },
                                    include: { product: true },
                                    orderBy: { createdAt: "asc" },
                                });

                                for (const im of inventoryMovements) {
                                    if (!im.product || im.product.priceVnd <= 0) {
                                        throw new Error(
                                            "INVOICE_INVARIANT_BROKEN: Sản phẩm bán kèm phiên câu không còn thông tin đơn giá hợp lệ.",
                                        );
                                    }
                                    const qty = Math.abs(Number(im.quantity));
                                    const lineTotal = im.product.priceVnd * qty;
                                    reconstructedLines.push({
                                        productId: im.productId,
                                        name: im.product.name,
                                        unitPrice: im.product.priceVnd,
                                        quantity: new Prisma.Decimal(qty),
                                        totalVnd: lineTotal,
                                    });
                                }

                                // 2c. Calculate and validate reconstructed total amount
                                const reconstructedTotalAmountVnd = reconstructedLines.reduce(
                                    (sum, line) => sum + line.totalVnd,
                                    0,
                                );

                                if (
                                    !Number.isInteger(reconstructedTotalAmountVnd) ||
                                    reconstructedTotalAmountVnd <= 0
                                ) {
                                    throw new Error(
                                        "INVOICE_INVARIANT_BROKEN: Tổng tiền tái tạo không phải là số nguyên hợp lệ.",
                                    );
                                }

                                finalInvoice = await tx.invoice.create({
                                    data: {
                                        lakeId: tenantContext.lakeId,
                                        customerId: session.customerId,
                                        fishingSessionId: session.id,
                                        status: InvoiceStatus.DRAFT,
                                        totalAmountVnd: reconstructedTotalAmountVnd,
                                        lines: {
                                            create: reconstructedLines,
                                        },
                                    },
                                });

                                await tx.auditEvent.create({
                                    data: {
                                        lakeId: tenantContext.lakeId,
                                        entityType: "Invoice",
                                        entityId: finalInvoice.id,
                                        action: "INVOICE_AUTO_REPAIRED_ON_COMPLETE",
                                        payload: JSON.stringify({
                                            sessionId: session.id,
                                            linesCount: reconstructedLines.length,
                                            totalAmountVnd: reconstructedTotalAmountVnd,
                                            reason: "Auto-repaired missing invoice with full authoritative reconciliation",
                                        }),
                                        createdBy: tenantContext.userId,
                                    },
                                });
                            }

                            if (finalInvoice) {
                                const invLines = await tx.invoiceLine.findMany({
                                    where: { invoiceId: finalInvoice.id },
                                });
                                const invPayments = await tx.payment.findMany({
                                    where: { invoiceId: finalInvoice.id },
                                });

                                const grossAmount = invLines.reduce((s, l) => s + l.totalVnd, 0);
                                let netPaid = invPayments.reduce((s, p) => {
                                    return p.direction === "IN" ? s + p.amountVnd : s - p.amountVnd;
                                }, 0);

                                if (parsed.data.settlement?.amountVnd && parsed.data.settlement.amountVnd > 0) {
                                    await tx.payment.create({
                                        data: {
                                            lakeId: tenantContext.lakeId,
                                            invoiceId: finalInvoice.id,
                                            amountVnd: parsed.data.settlement.amountVnd,
                                            method: parsed.data.settlement.paymentMethod || "CASH",
                                            direction: "IN",
                                            idempotencyKey: crypto.randomUUID(),
                                        },
                                    });
                                    netPaid += parsed.data.settlement.amountVnd;
                                } else if (parsed.data.settlement?.refundVnd && parsed.data.settlement.refundVnd > 0) {
                                    await tx.payment.create({
                                        data: {
                                            lakeId: tenantContext.lakeId,
                                            invoiceId: finalInvoice.id,
                                            amountVnd: parsed.data.settlement.refundVnd,
                                            method: parsed.data.settlement.paymentMethod || "CASH",
                                            direction: "OUT",
                                            idempotencyKey: crypto.randomUUID(),
                                        },
                                    });
                                    netPaid -= parsed.data.settlement.refundVnd;
                                }

                                const finalStatus =
                                    (netPaid >= grossAmount && grossAmount > 0) ||
                                    (parsed.data.settlement?.refundVnd && parsed.data.settlement.refundVnd > 0) ||
                                    (grossAmount <= 0 && netPaid === grossAmount) ||
                                    parsed.data.settlement !== undefined
                                        ? InvoiceStatus.PAID
                                        : netPaid > 0
                                        ? InvoiceStatus.PARTIALLY_PAID
                                        : finalInvoice.status;

                                await tx.invoice.update({
                                    where: { id: finalInvoice.id },
                                    data: {
                                        totalAmountVnd: grossAmount,
                                        status: finalStatus,
                                    },
                                });
                            }
                        }

                        // 3. Update session status
                        const newStatus =
                            action === "COMPLETE"
                                ? SessionStatus.COMPLETED
                                : SessionStatus.CANCELLED;

                        await tx.fishingSession.update({
                            where: { id: session.id },
                            data: {
                                status: newStatus,
                                endedAt,
                            },
                        });

                        // 3. Release huts — only where currentSessionId matches exactly
                        if (hutIds.length > 0) {
                            const released = await tx.hut.updateMany({
                                where: {
                                    id: { in: hutIds },
                                    lakeId: tenantContext.lakeId,
                                    currentSessionId: sessionId,
                                },
                                data: {
                                    currentSessionId: null,
                                    version: { increment: 1 },
                                },
                            });

                            if (released.count !== hutIds.length) {
                                throw new Error("HUT_RELEASE_MISMATCH");
                            }
                        }

                        // 4. Audit event
                        const auditAction =
                            action === "COMPLETE"
                                ? "FISHING_SESSION_COMPLETED"
                                : "FISHING_SESSION_CANCELLED";

                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "FishingSession",
                                entityId: session.id,
                                action: auditAction,
                                payload: JSON.stringify({
                                    endedAt: endedAt.toISOString(),
                                    hutIds,
                                    settlement: parsed.data.settlement || null,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        // 5. Return updated session with relations
                        const updatedSession =
                            await tx.fishingSession.findUniqueOrThrow({
                                where: { id: session.id },
                                include: {
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                            phoneNormalized: true,
                                        },
                                    },
                                    package: {
                                        select: {
                                            id: true,
                                            name: true,
                                            durationMinutes: true,
                                            priceVnd: true,
                                        },
                                    },
                                    hutLinks: {
                                        include: {
                                            hut: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                    area: {
                                                        select: {
                                                            id: true,
                                                            name: true,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            });

                        let receiptData = null;
                        if (action === "COMPLETE") {
                            const finalInv = await tx.invoice.findFirst({
                                where: {
                                    fishingSessionId: session.id,
                                    lakeId: tenantContext.lakeId,
                                },
                                include: { lines: true, payments: true },
                            });
                            if (finalInv) {
                                const gTotal = finalInv.lines.reduce((s, l) => s + l.totalVnd, 0);
                                const pTotal = finalInv.payments.reduce(
                                    (s, p) => (p.direction === "IN" ? s + p.amountVnd : s - p.amountVnd),
                                    0,
                                );
                                receiptData = {
                                    invoiceId: finalInv.id,
                                    sessionId: session.id,
                                    lakeName: tenantContext.lakeName,
                                    customerName: session.customer?.name || "Khách lẻ",
                                    customerPhone: session.customer?.phoneNormalized || null,
                                    hutNames:
                                        updatedSession.hutLinks.map((hl) => hl.hut.name).join(", ") || "Tự do",
                                    packageName: session.packageNameSnapshot || "Gói câu",
                                    lines: finalInv.lines.map((l) => ({
                                        name: l.name,
                                        quantity: Number(l.quantity),
                                        unitPrice: l.unitPrice,
                                        totalVnd: l.totalVnd,
                                    })),
                                    totalAmountVnd: gTotal,
                                    paidAmountVnd: pTotal,
                                    paymentAmountVnd: parsed.data.settlement?.amountVnd ?? 0,
                                    remainingVnd: Math.max(0, gTotal - pTotal),
                                    refundAmountVnd:
                                        parsed.data.settlement?.refundVnd ??
                                        (pTotal > gTotal ? pTotal - gTotal : 0),
                                    paymentMethod: parsed.data.settlement?.paymentMethod || "CASH",
                                    paymentTime: endedAt.toISOString(),
                                    cashierName: tenantContext.userId || null,
                                };
                            }
                        }

                        return {
                            ...updatedSession,
                            receiptData,
                        };
                    },
                    {
                        isolationLevel: "Serializable",
                    },
                );

                return NextResponse.json(result, { status: 200 });
            } catch (txError) {
                // Business errors — never retry
                if (
                    txError instanceof Error &&
                    txError.message === "SESSION_NOT_ACTIVE"
                ) {
                    return NextResponse.json(
                        {
                            error: "Phiên câu không còn hoạt động hoặc không tồn tại.",
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message.startsWith("INVOICE_INVARIANT_BROKEN")
                ) {
                    const requestId = crypto.randomUUID();
                    return NextResponse.json(
                        {
                            ok: false,
                            code: "INVOICE_INVARIANT_BROKEN",
                            error: "Không thể hoàn tất phiên câu: Phiên chưa có hóa đơn và không thể đối chiếu dữ liệu gốc an toàn. Vui lòng liên hệ Chủ hồ (OWNER) hoặc Thu ngân (CASHIER) để xử lý.",
                            details: txError.message,
                            requestId,
                        },
                        { status: 422 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "HUT_RELEASE_MISMATCH"
                ) {
                    return NextResponse.json(
                        {
                            error: "Dữ liệu chòi không nhất quán. Không thể đóng phiên an toàn. Vui lòng liên hệ quản trị viên.",
                        },
                        { status: 409 },
                    );
                }

                // P2034: serialization conflict — retry if attempts remain
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
                            error: "Dữ liệu chòi vừa thay đổi bởi người khác. Vui lòng tải lại trang và thử lại.",
                        },
                        { status: 409 },
                    );
                }

                throw txError;
            }
        }

        // Unreachable — loop always returns or throws — but satisfies TypeScript
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

export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const { sessionId } = await params;
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const session = await prisma.fishingSession.findFirst({
            where: {
                id: sessionId,
                lakeId: tenantContext.lakeId,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phoneNormalized: true,
                    },
                },
                package: {
                    select: {
                        id: true,
                        name: true,
                        durationMinutes: true,
                        priceVnd: true,
                    },
                },
                hutLinks: {
                    include: {
                        hut: {
                            select: {
                                id: true,
                                name: true,
                                area: { select: { name: true } },
                            },
                        },
                    },
                },
                invoices: {
                    include: {
                        lines: true,
                        payments: true,
                    },
                },
            },
        });

        if (!session) {
            return NextResponse.json(
                { error: "Không tìm thấy phiên câu trong hồ này." },
                { status: 404 },
            );
        }

        const invoice = session.invoices[0] || null;
        const hutCount = Math.max(session.hutLinks.length, 1);
        const packagePrice =
            session.packagePriceVndSnapshot || session.package?.priceVnd || 0;
        const packageTotal = packagePrice * hutCount;

        const lines = invoice?.lines || [];
        const payments = invoice?.payments || [];

        const itemsLines = lines.filter((l) => l.productId);
        const itemsTotal = itemsLines.reduce((s, l) => s + l.totalVnd, 0);

        const extensionLines = lines.filter(
            (l) => !l.productId && !l.fishBuybackId && l.name.toLowerCase().includes("gia hạn"),
        );
        const extensionsTotal = extensionLines.reduce((s, l) => s + l.totalVnd, 0);

        const fishBuybackLines = lines.filter(
            (l) => l.fishBuybackId !== null || l.totalVnd < 0,
        );
        const fishBuybackTotal = Math.abs(
            fishBuybackLines.reduce((s, l) => s + l.totalVnd, 0),
        );

        const otherLines = lines.filter(
            (l) =>
                !l.productId &&
                !l.fishBuybackId &&
                l.totalVnd >= 0 &&
                !l.name.toLowerCase().includes("gia hạn") &&
                !l.name.toLowerCase().includes("tiền ca"),
        );
        const otherTotal = otherLines.reduce((s, l) => s + l.totalVnd, 0);

        // Tổng chi phí dịch vụ: Gói câu + Sản phẩm + Gia hạn + Khác
        const grossCharge =
            packageTotal + itemsTotal + extensionsTotal + otherTotal;

        // Tiền tạm tính / đã thu trước từ khách
        const paidIn = payments
            .filter((p) => p.direction === "IN")
            .reduce((s, p) => s + p.amountVnd, 0);
        const paidOut = payments
            .filter((p) => p.direction === "OUT")
            .reduce((s, p) => s + p.amountVnd, 0);
        const totalPaid = Math.max(0, paidIn - paidOut);

        // Tổng giảm trừ = Tiền đã thanh toán trước (tạm tính) + Tiền thu mua cá
        const totalDeductions = totalPaid + fishBuybackTotal;

        // Kết quả = Tổng chi phí - (Tiền tạm tính + Tiền thu cá)
        const netBalance = grossCharge - totalDeductions;
        const netDue = netBalance > 0 ? netBalance : 0;
        const refund = netBalance < 0 ? Math.abs(netBalance) : 0;

        return NextResponse.json({
            session: {
                id: session.id,
                status: session.status,
                startTime: session.startAt.toISOString(),
                endTime: (session.endedAt || session.plannedEndAt).toISOString(),
                customerName: session.customer?.name || "Khách lẻ",
                customerPhone: session.customer?.phoneNormalized || null,
                packageName:
                    session.packageNameSnapshot ||
                    session.package?.name ||
                    "Gói câu",
                packageDurationMinutes:
                    session.packageDurationMinutesSnapshot ||
                    session.package?.durationMinutes ||
                    0,
                huts: session.hutLinks.map((hl) => ({
                    id: hl.hut.id,
                    name: hl.hut.name,
                    areaName: hl.hut.area?.name || null,
                })),
            },
            invoice: invoice
                ? {
                      id: invoice.id,
                      status: invoice.status,
                      lines: lines.map((l) => ({
                          id: l.id,
                          name: l.name,
                          quantity: Number(l.quantity),
                          unitPrice: l.unitPrice,
                          totalVnd: l.totalVnd,
                          productId: l.productId,
                          fishBuybackId: l.fishBuybackId,
                      })),
                      payments: payments.map((p) => ({
                          id: p.id,
                          amountVnd: p.amountVnd,
                          direction: p.direction,
                          method: p.method,
                          createdAt: p.createdAt,
                      })),
                  }
                : null,
            financials: {
                packageTotalVnd: packageTotal,
                itemsTotalVnd: itemsTotal,
                extensionsTotalVnd: extensionsTotal,
                fishBuybackTotalVnd: fishBuybackTotal,
                otherTotalVnd: otherTotal,
                grossChargeVnd: grossCharge,
                totalPaidVnd: totalPaid,
                totalDeductionsVnd: totalDeductions,
                netBalanceVnd: netBalance,
                netDueVnd: netDue,
                refundVnd: refund,
            },
            lakeName: tenantContext.lakeName,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tải dữ liệu quyết toán phiên câu." },
            { status: 500 },
        );
    }
}
