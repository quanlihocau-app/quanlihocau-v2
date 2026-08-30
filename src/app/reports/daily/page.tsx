import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import {
    PaymentDirection,
    PaymentMethod,
    Role,
} from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { DailyReportView } from "./daily-report-view";

export default async function DailyReportPage() {
    const session = await getServerSession(authOptions);

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

    const isClosed =
        currentShift.endTime !== null && currentShift.closes.length > 0;
    const shiftClose = currentShift.closes[0] ?? null;

    let summary = {
        revenueVnd: 0,
        expenseVnd: 0,
        cashVnd: 0,
        transferVnd: 0,
        fishBuybackVnd: 0,
        otherExpenseVnd: 0,
        netProfitVnd: 0,
    };

    if (isClosed && shiftClose) {
        summary = {
            revenueVnd: shiftClose.totalRevenueVnd,
            expenseVnd: shiftClose.totalExpenseVnd,
            cashVnd: shiftClose.totalCashVnd,
            transferVnd: shiftClose.totalTransferVnd,
            fishBuybackVnd: shiftClose.fishBuybackVnd,
            otherExpenseVnd: shiftClose.otherExpenseVnd,
            netProfitVnd:
                shiftClose.totalRevenueVnd - shiftClose.totalExpenseVnd,
        };
    } else {
        const startTime = currentShift.startTime;
        const endTime = new Date();

        // Payments (Single Source of Truth)
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

        // Fish Buybacks
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

        // Other Expenses
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

        summary = {
            revenueVnd: totalRevenue,
            expenseVnd: totalExpense,
            cashVnd: netCash,
            transferVnd: netTransfer,
            fishBuybackVnd: fishBuybackTotal,
            otherExpenseVnd: otherExpenseTotal,
            netProfitVnd: netProfit,
        };
    }

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
            }}
            summary={summary}
            shiftClose={
                shiftClose
                    ? {
                          id: shiftClose.id,
                          closedBy: shiftClose.closedBy,
                          closedAt: shiftClose.createdAt.toISOString(),
                          note: shiftClose.note,
                      }
                    : null
            }
            canCloseShift={canCloseShift}
            lakeName={tenantContext.lakeName}
            organizationName={tenantContext.organizationName}
        />
    );
}
