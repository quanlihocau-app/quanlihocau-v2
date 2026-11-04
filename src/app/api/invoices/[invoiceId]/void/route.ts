import { NextResponse } from "next/server";
import { z } from "zod";

import { InvoiceStatus, Role, SessionStatus } from "@/generated/prisma/client";
import { readRequestMeta, writeStaffAudit } from "@/lib/audit-log";
import { syncInvoiceTotals } from "@/lib/invoice-totals";
import { refundsDueByMethod } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const bodySchema = z.object({
    reason: z.string().trim().min(3, "Cần ghi lý do huỷ hoá đơn, ít nhất 3 ký tự.").max(500),
});

interface RouteParams {
    params: Promise<{ invoiceId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { invoiceId } = await params;
        if (!z.string().uuid().safeParse(invoiceId).success) {
            return NextResponse.json({ error: "Mã hoá đơn không hợp lệ." }, { status: 400 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Thiếu lý do." }, { status: 400 });
        }

        const tenantContext = await requireTenantContext([Role.OWNER]);
        const requestMeta = await readRequestMeta();

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findFirst({
                where: { id: invoiceId, lakeId: tenantContext.lakeId },
                include: {
                    payments: true,
                    fishingSession: { select: { id: true, status: true } },
                },
            });
            if (!invoice) throw new Error("INVOICE_NOT_FOUND");
            if (invoice.status === InvoiceStatus.VOIDED) throw new Error("ALREADY_VOIDED");
            if (invoice.fishingSession?.status === SessionStatus.ACTIVE) {
                throw new Error("SESSION_STILL_OPEN");
            }
            const closedOrPaid = invoice.status === InvoiceStatus.PAID
                || invoice.status === InvoiceStatus.PARTIALLY_PAID
                || invoice.fishingSession?.status === SessionStatus.COMPLETED;
            if (!closedOrPaid) throw new Error("NOT_CLOSABLE");

            const refunds = refundsDueByMethod(invoice.payments);
            let refundedVnd = 0;
            for (const refund of refunds) {
                await tx.payment.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        invoiceId: invoice.id,
                        amountVnd: refund.amountVnd,
                        method: refund.method,
                        direction: "OUT",
                        idempotencyKey: crypto.randomUUID(),
                    },
                });
                refundedVnd += refund.amountVnd;
            }

            await syncInvoiceTotals(tx, invoice.id, tenantContext.lakeId, { forceStatus: "VOIDED" });
            await writeStaffAudit(tx, {
                lakeId: tenantContext.lakeId,
                entityType: "Invoice",
                entityId: invoice.id,
                action: "INVOICE_VOIDED",
                createdBy: tenantContext.userId,
                actorName: tenantContext.userName,
                actorRole: tenantContext.role,
                before: {
                    status: invoice.status,
                    totalAmountVnd: invoice.totalAmountVnd,
                    paidAmountVnd: invoice.paidAmountVnd,
                },
                after: { status: "VOIDED", refundedVnd },
                extra: { reason: parsed.data.reason, refunds, sessionId: invoice.fishingSessionId },
                ip: requestMeta.ip,
                userAgent: requestMeta.userAgent,
            });

            return { refundedVnd, refunds };
        });

        return NextResponse.json({
            message: result.refundedVnd > 0
                ? "Đã huỷ hoá đơn và ghi nhận hoàn tiền."
                : "Đã huỷ hoá đơn. Hoá đơn này chưa thu tiền nên không có khoản hoàn.",
            refundedVnd: result.refundedVnd,
            refunds: result.refunds,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: "Chỉ chủ hồ mới được huỷ hoá đơn đã chốt hoặc đã thu." }, { status: 403 });
        }
        if (error instanceof Error) {
            if (error.message === "INVOICE_NOT_FOUND") {
                return NextResponse.json({ error: "Không tìm thấy hoá đơn." }, { status: 404 });
            }
            if (error.message === "ALREADY_VOIDED") {
                return NextResponse.json({ error: "Hoá đơn này đã được huỷ trước đó." }, { status: 409 });
            }
            if (error.message === "SESSION_STILL_OPEN") {
                return NextResponse.json({ error: "Phiên câu vẫn đang mở. Hãy huỷ phiên để hoàn tiền và trả chòi." }, { status: 409 });
            }
            if (error.message === "NOT_CLOSABLE") {
                return NextResponse.json({ error: "Chỉ huỷ được hoá đơn đã thu hoặc của phiên đã kết thúc." }, { status: 409 });
            }
        }
        return NextResponse.json({ error: "Không huỷ được hoá đơn." }, { status: 500 });
    }
}
