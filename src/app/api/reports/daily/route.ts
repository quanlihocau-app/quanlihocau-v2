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

        const shiftStart = currentShift.startTime;
        const shiftEnd = currentShift.endTime ?? new Date();

        // 1. Sessions aggregation in this shift window
        const shiftSessions = await prisma.fishingSession.findMany({
            where: {
                lakeId,
                createdAt: {
                    gte: shiftStart,
                    lte: shiftEnd,
                },
            },
            include: {
                hutLinks: {
                    select: { hut: { select: { name: true } } },
                },
            },
        });

        const totalSessionsCount = shiftSessions.length;
        const completedSessionsCount = shiftSessions.filter(
            (s) => s.status === "COMPLETED",
        ).length;
        const activeSessionsCount = shiftSessions.filter(
            (s) => s.status === "ACTIVE",
        ).length;
        const cancelledSessionsCount = shiftSessions.filter(
            (s) => s.status === "CANCELLED",
        ).length;

        const pkgMap = new Map<string, { count: number; totalVnd: number }>();
        for (const s of shiftSessions) {
            const pkgName = s.packageNameSnapshot || "Gói tiêu chuẩn";
            const cur = pkgMap.get(pkgName) || { count: 0, totalVnd: 0 };
            cur.count += 1;
            cur.totalVnd +=
                s.packagePriceVndSnapshot * Math.max(s.hutLinks.length, 1);
            pkgMap.set(pkgName, cur);
        }
        const packagesBreakdown = Array.from(pkgMap.entries()).map(
            ([packageName, data]) => ({
                packageName,
                count: data.count,
                totalVnd: data.totalVnd,
            }),
        );

        // 2. Invoice Lines aggregation (Products sold & extensions)
        const invoiceLines = await prisma.invoiceLine.findMany({
            where: {
                invoice: {
                    lakeId,
                    createdAt: {
                        gte: shiftStart,
                        lte: shiftEnd,
                    },
                },
            },
            select: {
                productId: true,
                name: true,
                quantity: true,
                totalVnd: true,
            },
        });

        const prodMap = new Map<
            string,
            { name: string; quantity: number; totalVnd: number }
        >();
        let extensionsCount = 0;
        let extensionsTotalVnd = 0;

        for (const line of invoiceLines) {
            if (line.productId) {
                const cur = prodMap.get(line.productId) || {
                    name: line.name,
                    quantity: 0,
                    totalVnd: 0,
                };
                cur.quantity += Number(line.quantity);
                cur.totalVnd += line.totalVnd;
                prodMap.set(line.productId, cur);
            } else if (line.name.toLowerCase().includes("gia hạn")) {
                extensionsCount += 1;
                extensionsTotalVnd += line.totalVnd;
            }
        }

        const productItems = Array.from(prodMap.values());
        const totalProductQty = productItems.reduce(
            (s, p) => s + p.quantity,
            0,
        );
        const totalProductVnd = productItems.reduce(
            (s, p) => s + p.totalVnd,
            0,
        );

        // 3. Inventory movements in shift window
        const invMovements = await prisma.inventoryMovement.findMany({
            where: {
                lakeId,
                createdAt: {
                    gte: shiftStart,
                    lte: shiftEnd,
                },
            },
            select: {
                quantity: true,
            },
        });
        let invInCount = 0;
        let invOutCount = 0;
        for (const m of invMovements) {
            const q = Number(m.quantity);
            if (q > 0) {
                invInCount += q;
            } else {
                invOutCount += Math.abs(q);
            }
        }

        // 4. Payments aggregation (Single source of truth for money received/reversed)
        const payments = await prisma.payment.findMany({
            where: {
                lakeId,
                createdAt: {
                    gte: shiftStart,
                    lte: shiftEnd,
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
        const totalRevenue = isClosed && shiftClose ? shiftClose.totalRevenueVnd : netCash + netTransfer;

        // 5. Fish Buybacks aggregation
        const fishBuybacksAgg = await prisma.fishBuyback.aggregate({
            where: {
                lakeId,
                createdAt: {
                    gte: shiftStart,
                    lte: shiftEnd,
                },
            },
            _sum: {
                totalVnd: true,
            },
        });
        const fishBuybackTotal = isClosed && shiftClose ? shiftClose.fishBuybackVnd : (fishBuybacksAgg._sum.totalVnd ?? 0);

        // 6. Other Expenses aggregation
        const expensesAgg = await prisma.expense.aggregate({
            where: {
                lakeId,
                createdAt: {
                    gte: shiftStart,
                    lte: shiftEnd,
                },
            },
            _sum: {
                amountVnd: true,
            },
        });
        const otherExpenseTotal = isClosed && shiftClose ? shiftClose.otherExpenseVnd : (expensesAgg._sum.amountVnd ?? 0);

        const totalExpense = isClosed && shiftClose ? shiftClose.totalExpenseVnd : fishBuybackTotal + otherExpenseTotal;
        const netProfit = totalRevenue - totalExpense;

        const breakdown = {
            sessions: {
                total: totalSessionsCount,
                completed: completedSessionsCount,
                active: activeSessionsCount,
                cancelled: cancelledSessionsCount,
                packages: packagesBreakdown,
            },
            products: {
                totalQuantity: totalProductQty,
                totalVnd: totalProductVnd,
                items: productItems,
            },
            services: {
                extensionsCount,
                extensionsTotalVnd,
            },
            payments: {
                cashInVnd: cashIn,
                cashOutVnd: cashOut,
                transferInVnd: transferIn,
                transferOutVnd: transferOut,
                totalPaidInVnd: cashIn + transferIn,
                totalRefundVnd: cashOut + transferOut,
            },
            inventory: {
                inCount: invInCount,
                outCount: invOutCount,
            },
        };

        return NextResponse.json({
            shift: {
                id: currentShift.id,
                startTime: currentShift.startTime.toISOString(),
                endTime: currentShift.endTime?.toISOString() ?? null,
                isClosed,
            },
            summary: {
                revenueVnd: totalRevenue,
                expenseVnd: totalExpense,
                cashVnd: isClosed && shiftClose ? shiftClose.totalCashVnd : netCash,
                transferVnd: isClosed && shiftClose ? shiftClose.totalTransferVnd : netTransfer,
                fishBuybackVnd: fishBuybackTotal,
                otherExpenseVnd: otherExpenseTotal,
                netProfitVnd: netProfit,
            },
            breakdown,
            shiftClose: shiftClose
                ? {
                      id: shiftClose.id,
                      closedBy: shiftClose.closedBy,
                      closedAt: shiftClose.createdAt.toISOString(),
                      note: shiftClose.note,
                  }
                : null,
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
