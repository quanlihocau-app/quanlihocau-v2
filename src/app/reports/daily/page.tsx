import { getPageSession } from "@/lib/server-session";
import { redirect } from "next/navigation";

import {
    PaymentDirection,
    PaymentMethod,
    Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseShiftCloseNote } from "@/lib/shift-helper";
import { getTenantContext } from "@/lib/tenant";

import { DailyReportView } from "./daily-report-view";

interface PageProps {
    searchParams: Promise<{
        shiftId?: string;
    }>;
}

export default async function DailyReportPage({ searchParams }: PageProps) {
    const session = await getPageSession();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
                    <h1 className="text-xl font-semibold text-amber-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-sm text-amber-700">
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền
                        hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    const lakeId = tenantContext.lakeId;
    const { shiftId: requestedShiftId } = await searchParams;

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

    // Find last closed shift to determine opening cash
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

    let previousHandoverCash = 0;
    if (lastClosedShift?.closes[0]) {
        const parsedMeta = parseShiftCloseNote(lastClosedShift.closes[0].note);
        previousHandoverCash = parsedMeta.actualCashVnd ?? lastClosedShift.closes[0].totalCashVnd ?? 0;
    }

    if (!currentShift) {
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

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
    const shiftClose = currentShift.closes[0] ?? null;
    const parsedCloseMeta = shiftClose ? parseShiftCloseNote(shiftClose.note) : null;

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

    // 4. Payments (Single Source of Truth)
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

    // 5. Fish Buybacks
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

    // 6. Other Expenses
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

    const openingCash = previousHandoverCash;
    const expectedCashInDrawer = openingCash + cashIn - cashOut;

    const summary = {
        revenueVnd: totalRevenue,
        expenseVnd: totalExpense,
        cashVnd: isClosed && shiftClose ? shiftClose.totalCashVnd : netCash,
        cashInVnd: cashIn,
        cashOutVnd: cashOut,
        transferVnd: isClosed && shiftClose ? shiftClose.totalTransferVnd : netTransfer,
        transferInVnd: transferIn,
        transferOutVnd: transferOut,
        fishBuybackVnd: fishBuybackTotal,
        otherExpenseVnd: otherExpenseTotal,
        netProfitVnd: netProfit,
    };

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

    const recentShiftsList = rawRecentShifts.map((s) => ({
        id: s.id,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime?.toISOString() ?? null,
        isClosed: s.endTime !== null && s.closes.length > 0,
        revenueVnd: s.closes[0]?.totalRevenueVnd ?? 0,
        cashVnd: s.closes[0]?.totalCashVnd ?? 0,
        closedBy: s.closes[0]?.closedBy ?? null,
    }));

    const canCloseShift =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    return (
        <DailyReportView
            shift={{
                id: currentShift.id,
                startTime: currentShift.startTime.toISOString(),
                endTime: currentShift.endTime?.toISOString() ?? null,
                isClosed,
                openingCashVnd: openingCash,
                expectedCashVnd: expectedCashInDrawer,
            }}
            summary={summary}
            breakdown={breakdown}
            shiftClose={
                shiftClose
                    ? {
                          id: shiftClose.id,
                          closedBy: shiftClose.closedBy,
                          receivedBy: parsedCloseMeta?.receivedBy ?? null,
                          closedAt: shiftClose.createdAt.toISOString(),
                          note: parsedCloseMeta?.cleanNote ?? shiftClose.note,
                          actualCashVnd: parsedCloseMeta?.actualCashVnd ?? shiftClose.totalCashVnd,
                          cashDifferenceVnd: parsedCloseMeta?.cashDifferenceVnd ?? 0,
                          differenceReason: parsedCloseMeta?.differenceReason ?? null,
                      }
                    : null
            }
            canCloseShift={canCloseShift}
            lakeName={tenantContext.lakeName}
            recentShifts={recentShiftsList}
        />
    );
}
