import { NextResponse } from "next/server";

import { PaymentDirection, PaymentMethod, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];

export async function GET() {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);
        const lakeId = tenantContext.lakeId;

        // 1. Find active open shift or most recent shift for this lake
        let currentShift = await prisma.shift.findFirst({
            where: {
                lakeId,
                endTime: null,
            },
            include: {
                closes: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: {
                startTime: "desc",
            },
        });

        // If no open shift exists, find the most recent closed shift
        if (!currentShift) {
            currentShift = await prisma.shift.findFirst({
                where: {
                    lakeId,
                },
                include: {
                    closes: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
                orderBy: {
                    startTime: "desc",
                },
            });
        }

        // If still no shift exists in database for this lake, create an initial open shift starting today
        if (!currentShift) {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            currentShift = await prisma.shift.create({
                data: {
                    lakeId,
                    startTime: startOfToday,
                },
                include: {
                    closes: true,
                },
            });
        }

        const isClosed = currentShift.endTime !== null && currentShift.closes.length > 0;
        const shiftClose = currentShift.closes[0] ?? null;

        // If shift is already closed, return stored snapshot
        if (isClosed && shiftClose) {
            return NextResponse.json({
                shift: {
                    id: currentShift.id,
                    startTime: currentShift.startTime.toISOString(),
                    endTime: currentShift.endTime?.toISOString() ?? null,
                    isClosed: true,
                },
                summary: {
                    revenueVnd: shiftClose.totalRevenueVnd,
                    expenseVnd: shiftClose.totalExpenseVnd,
                    cashVnd: shiftClose.totalCashVnd,
                    transferVnd: shiftClose.totalTransferVnd,
                    fishBuybackVnd: shiftClose.fishBuybackVnd,
                    otherExpenseVnd: shiftClose.otherExpenseVnd,
                    netProfitVnd: shiftClose.totalRevenueVnd - shiftClose.totalExpenseVnd,
                },
                shiftClose: {
                    id: shiftClose.id,
                    closedBy: shiftClose.closedBy,
                    closedAt: shiftClose.createdAt.toISOString(),
                    note: shiftClose.note,
                },
            });
        }

        // Calculate live metrics for currently open shift from [shift.startTime, now]
        const startTime = currentShift.startTime;
        const endTime = new Date();

        // 1. Payments aggregation (Single source of truth for money received/reversed)
        const payments = await prisma.payment.findMany({
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
            },
        });

        let cashIn = 0;
        let cashOut = 0;
        let transferIn = 0;
        let transferOut = 0;

        for (const p of payments) {
            if (p.method === PaymentMethod.CASH) {
                if (p.direction === PaymentDirection.IN) {
                    cashIn += p.amountVnd;
                } else {
                    cashOut += p.amountVnd;
                }
            } else if (p.method === PaymentMethod.BANK_TRANSFER) {
                if (p.direction === PaymentDirection.IN) {
                    transferIn += p.amountVnd;
                } else {
                    transferOut += p.amountVnd;
                }
            }
        }

        const netCash = Math.max(0, cashIn - cashOut);
        const netTransfer = Math.max(0, transferIn - transferOut);
        const totalRevenue = netCash + netTransfer;

        // 2. Fish Buybacks aggregation
        const fishBuybacksAgg = await prisma.fishBuyback.aggregate({
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
        const fishBuybackTotal = fishBuybacksAgg._sum.totalVnd ?? 0;

        // 3. Other Expenses aggregation
        const expensesAgg = await prisma.expense.aggregate({
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
        const otherExpenseTotal = expensesAgg._sum.amountVnd ?? 0;

        const totalExpense = fishBuybackTotal + otherExpenseTotal;
        const netProfit = totalRevenue - totalExpense;

        return NextResponse.json({
            shift: {
                id: currentShift.id,
                startTime: currentShift.startTime.toISOString(),
                endTime: null,
                isClosed: false,
            },
            summary: {
                revenueVnd: totalRevenue,
                expenseVnd: totalExpense,
                cashVnd: netCash,
                transferVnd: netTransfer,
                fishBuybackVnd: fishBuybackTotal,
                otherExpenseVnd: otherExpenseTotal,
                netProfitVnd: netProfit,
            },
            shiftClose: null,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy báo cáo ngày." },
            { status: 500 },
        );
    }
}
