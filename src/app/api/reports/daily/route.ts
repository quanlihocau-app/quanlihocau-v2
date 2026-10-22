import { summarizeMoney, summarizeRevenue } from "@/lib/finance";
import { parseShiftCloseNote } from "@/lib/shift-helper";
import { NextResponse } from "next/server";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);
        const lakeId = tenantContext.lakeId;

        const url = new URL(request.url);
        const requestedShiftId = url.searchParams.get("shiftId");

        // Fetch recent shifts list for historical selector
        const rawRecentShifts = await prisma.shift.findMany({
            where: { lakeId },
            include: {
                closes: {
                    select: {
                        id: true,
                        closedBy: true,
                        totalRevenueVnd: true,
                        totalCashVnd: true,
                        createdAt: true,
                        note: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { startTime: "desc" },
            take: 10,
        });

        let currentShift = null;

        if (requestedShiftId) {
            currentShift = await prisma.shift.findFirst({
                where: {
                    id: requestedShiftId,
                    lakeId,
                },
                include: {
                    closes: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            });
        }

        if (!currentShift) {
            // Find active open shift
            currentShift = await prisma.shift.findFirst({
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
        }

        // If no open shift exists, find the most recent closed shift to calculate opening cash
        const lastClosedShift = await prisma.shift.findFirst({
            where: {
                lakeId,
                endTime: { not: null },
            },
            include: {
                closes: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: {
                endTime: "desc",
            },
        });

        // Determine opening cash from last shift handover
        let previousHandoverCash = 0;
        if (lastClosedShift?.closes[0]) {
            const parsedMeta = parseShiftCloseNote(lastClosedShift.closes[0].note);
            previousHandoverCash = parsedMeta.actualCashVnd ?? lastClosedShift.closes[0].totalCashVnd ?? 0;
        }

        // If no active shift was requested or exists, automatically create a new active open shift starting now
        if (!currentShift) {
            const now = new Date();
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            // If last closed shift was closed recently (under 12 hours), continue from that endTime; otherwise start from start of today
            const shouldContinueFromLast =
                lastClosedShift?.endTime &&
                now.getTime() - lastClosedShift.endTime.getTime() < 12 * 60 * 60 * 1000;
            const shiftStartTime = shouldContinueFromLast ? lastClosedShift.endTime! : startOfToday;

            currentShift = await prisma.shift.create({
                data: {
                    lakeId,
                    startTime: shiftStartTime,
                },
                include: {
                    closes: true,
                },
            });
        }

        const isClosed = currentShift.endTime !== null && currentShift.closes.length > 0;
        const rawShiftClose = currentShift.closes[0] ?? null;
        const parsedCloseMeta = rawShiftClose ? parseShiftCloseNote(rawShiftClose.note) : null;

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
                invoices: {
                    where: { status: { not: "VOIDED" } },
                    select: { totalAmountVnd: true, balanceDueVnd: true },
                },
                customer: {
                    select: { name: true },
                },
            },
        });

        const totalSessionsCount = shiftSessions.length;
        const completedSessionsCount = shiftSessions.filter((s) => s.status === "COMPLETED").length;
        const activeSessionsCount = shiftSessions.filter((s) => s.status === "ACTIVE").length;
        const cancelledSessionsCount = shiftSessions.filter((s) => s.status === "CANCELLED").length;

        const pkgMap = new Map<string, { count: number; totalVnd: number }>();
        for (const s of shiftSessions) {
            const pkgName = s.packageNameSnapshot || "Gói tiêu chuẩn";
            const cur = pkgMap.get(pkgName) || { count: 0, totalVnd: 0 };
            cur.count += 1;
            cur.totalVnd += s.packagePriceVndSnapshot * Math.max(s.hutLinks.length, 1);
            pkgMap.set(pkgName, cur);
        }
        const packagesBreakdown = Array.from(pkgMap.entries()).map(([packageName, data]) => ({
            packageName,
            count: data.count,
            totalVnd: data.totalVnd,
        }));

        // 2. Invoice Lines aggregation (Products sold & extensions)
        const invoiceLines = await prisma.invoiceLine.findMany({
            where: {
                invoice: {
                    lakeId,
                    status: { not: "VOIDED" },
                    createdAt: {
                        gte: shiftStart,
                        lte: shiftEnd,
                    },
                },
            },
            select: {
                productId: true,
                fishBuybackId: true,
                invoice: { select: { fishingSessionId: true } },
                name: true,
                quantity: true,
                totalVnd: true,
            },
        });

        const prodMap = new Map<string, { name: string; quantity: number; totalVnd: number }>();
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
        const totalProductQty = productItems.reduce((s, p) => s + p.quantity, 0);
        const totalProductVnd = productItems.reduce((s, p) => s + p.totalVnd, 0);

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
                expenseId: true,
            },
        });

        const totals = summarizeMoney(payments);
        const { cashIn, cashOut, transferIn, transferOut, netCash, netTransfer } = totals;
        const totalRevenue = isClosed && rawShiftClose
            ? rawShiftClose.totalRevenueVnd
            : summarizeRevenue(
                  invoiceLines.map((line) => ({
                      fishingSessionId: line.invoice.fishingSessionId,
                      lines: [line],
                  })),
              ).totalRevenue;

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
        const fishBuybackTotal = isClosed && rawShiftClose
            ? rawShiftClose.fishBuybackVnd
            : fishBuybacksAgg._sum.totalVnd ?? 0;

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
        const otherExpenseTotal = isClosed && rawShiftClose
            ? rawShiftClose.otherExpenseVnd
            : expensesAgg._sum.amountVnd ?? 0;

        const totalExpense = isClosed && rawShiftClose
            ? rawShiftClose.totalExpenseVnd
            : fishBuybackTotal + otherExpenseTotal;
        const netProfit = totalRevenue - totalExpense;

        // Cash in drawer at start of shift
        const openingCash = previousHandoverCash;
        // Accurate expected cash in drawer = Opening cash + Cash In - Cash Out
        const expectedCashInDrawer = openingCash + cashIn - cashOut;

        // Active sessions detail list (for shift handover awareness)
        const activeSessionsList = shiftSessions
            .filter((s) => s.status === "ACTIVE")
            .map((s) => {
                const pendingVnd = s.invoices.reduce((sum, inv) => sum + inv.balanceDueVnd, 0);
                const hutNames = s.hutLinks.map((hl: { hut: { name: string } }) => hl.hut.name).join(", ");
                return {
                    id: s.id,
                    customerName: s.customer?.name || "Khách",
                    hutName: hutNames || "—",
                    startTime: s.startAt.toISOString(),
                    pendingAmountVnd: Math.max(0, pendingVnd),
                    packageName: s.packageNameSnapshot || "",
                };
            });
        const totalActivePendingVnd = activeSessionsList.reduce((s, sess) => s + sess.pendingAmountVnd, 0);

        const breakdown = {
            sessions: {
                total: totalSessionsCount,
                completed: completedSessionsCount,
                active: activeSessionsCount,
                cancelled: cancelledSessionsCount,
                packages: packagesBreakdown,
                activeList: activeSessionsList,
                totalActivePendingVnd,
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
                totalRefundVnd: totals.refunds,
            },
            inventory: {
                inCount: invInCount,
                outCount: invOutCount,
            },
        };

        const recentShiftsList = rawRecentShifts.map((s) => ({
            id: s.id,
            startTime: s.startTime.toISOString(),
            endTime: s.endTime?.toISOString() ?? null,
            isClosed: s.endTime !== null && s.closes.length > 0,
            revenueVnd: s.closes[0]?.totalRevenueVnd ?? 0,
            cashVnd: s.closes[0]?.totalCashVnd ?? 0,
            closedBy: s.closes[0]?.closedBy ?? null,
        }));

        return NextResponse.json({
            shift: {
                id: currentShift.id,
                startTime: currentShift.startTime.toISOString(),
                endTime: currentShift.endTime?.toISOString() ?? null,
                isClosed,
                openingCashVnd: openingCash,
                expectedCashVnd: expectedCashInDrawer,
            },
            summary: {
                revenueVnd: totalRevenue,
                expenseVnd: totalExpense,
                cashVnd: isClosed && rawShiftClose ? rawShiftClose.totalCashVnd : netCash,
                cashInVnd: cashIn,
                cashOutVnd: cashOut,
                transferVnd: isClosed && rawShiftClose ? rawShiftClose.totalTransferVnd : netTransfer,
                transferInVnd: transferIn,
                transferOutVnd: transferOut,
                fishBuybackVnd: fishBuybackTotal,
                otherExpenseVnd: otherExpenseTotal,
                netProfitVnd: netProfit,
            },
            breakdown,
            shiftClose: rawShiftClose
                ? {
                      id: rawShiftClose.id,
                      closedBy: rawShiftClose.closedBy,
                      receivedBy: parsedCloseMeta?.receivedBy ?? null,
                      closedAt: rawShiftClose.createdAt.toISOString(),
                      note: parsedCloseMeta?.cleanNote ?? rawShiftClose.note,
                      actualCashVnd: parsedCloseMeta?.actualCashVnd ?? rawShiftClose.totalCashVnd,
                      cashDifferenceVnd: parsedCloseMeta?.cashDifferenceVnd ?? 0,
                      differenceReason: parsedCloseMeta?.differenceReason ?? null,
                  }
                : null,
            recentShifts: recentShiftsList,
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
