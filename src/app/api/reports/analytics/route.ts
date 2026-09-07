import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
    InvoiceStatus,
    PaymentDirection,
    PaymentMethod,
    Prisma,
    SessionStatus,
} from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    calculateDelta,
    CompareMode,
    DatePreset,
    DeltaComparison,
    formatVnDateTimeDisplay,
    getComparativeRange,
    getDateRangeForPreset,
    getVnParts,
} from "@/lib/reports/date-utils";
import { getTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

interface InvoiceSummaryItem {
    id: string;
    createdAt: Date;
    status: InvoiceStatus;
    lines: Array<{
        productId: string | null;
        name: string;
        totalVnd: number;
        quantity: Prisma.Decimal | number;
    }>;
}

interface SessionSummaryItem {
    id: string;
    createdAt: Date;
    packagePriceVndSnapshot: number;
    hutLinks: Array<{ hut: { id: string; name: string; area: { id: string; name: string } } }>;
    customer?: { id: string; name: string; phoneNormalized: string | null } | null;
}

interface WindowMetrics {
    totalRevenue: number;
    ticketRevenue: number;
    productRevenue: number;
    overtimeRevenue: number;
    otherRevenue: number;
    refundAmount: number;
    refundCount: number;
    totalExpense: number;
    totalFishBuyback: number;
    netProfit: number;
    totalReceivableDebt: number;
    cashIn: number;
    cashOut: number;
    netCash: number;
    transferIn: number;
    transferOut: number;
    netTransfer: number;
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    totalFishingHours: number;
    totalOvertimeHours: number;
    averageTicketValue: number;
    sessions: SessionSummaryItem[];
    invoices: InvoiceSummaryItem[];
    expenses: Array<{ createdAt: Date; amountVnd: number }>;
    fishBuybacks: unknown[];
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantContext = await getTenantContext();
        if (!tenantContext?.lakeId) {
            return NextResponse.json({ error: "Forbidden: No lake assigned" }, { status: 403 });
        }

        const lakeId = tenantContext.lakeId;
        const { searchParams } = new URL(request.url);

        const preset = (searchParams.get("preset") as DatePreset) || "today";
        const customFrom = searchParams.get("from") || undefined;
        const customTo = searchParams.get("to") || undefined;
        const customFromTime = searchParams.get("fromTime") || "00:00";
        const customToTime = searchParams.get("toTime") || "23:59";

        const compareMode = (searchParams.get("compare") as CompareMode) || "none";
        const customCompareFrom = searchParams.get("compareFrom") || undefined;
        const customCompareTo = searchParams.get("compareTo") || undefined;

        // Advanced filter parameters
        const filterAreaId = searchParams.get("areaId") || undefined;
        const filterHutId = searchParams.get("hutId") || undefined;
        const filterCustomerId = searchParams.get("customerId") || undefined;
        const filterPackageId = searchParams.get("packageId") || undefined;
        const filterProductId = searchParams.get("productId") || undefined;
        const filterPaymentMethod = (searchParams.get("paymentMethod") as PaymentMethod) || undefined;
        const filterSessionStatus = (searchParams.get("sessionStatus") as SessionStatus) || undefined;

        // 1. Determine primary date range
        const primaryRange = getDateRangeForPreset(
            preset,
            new Date(),
            customFrom,
            customTo,
            customFromTime,
            customToTime
        );

        // 2. Determine comparative range
        const compareRange = getComparativeRange(
            primaryRange,
            compareMode,
            customCompareFrom,
            customCompareTo
        );

        // 3. Helper to aggregate financial & operational data for a given window
        async function fetchMetricsForWindow(range: { from: Date; to: Date }): Promise<WindowMetrics> {
            const { from, to } = range;

            // Invoices in range
            const invoiceWhere: Prisma.InvoiceWhereInput = {
                lakeId,
                createdAt: { gte: from, lte: to },
            };
            if (filterCustomerId) invoiceWhere.customerId = filterCustomerId;

            const invoices = await prisma.invoice.findMany({
                where: invoiceWhere,
                include: {
                    lines: {
                        include: {
                            product: true,
                            fishBuyback: true,
                        },
                    },
                    payments: true,
                    fishingSession: {
                        include: {
                            hutLinks: {
                                include: {
                                    hut: {
                                        include: { area: true },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            // Payments in range
            const paymentWhere: Prisma.PaymentWhereInput = {
                lakeId,
                createdAt: { gte: from, lte: to },
            };
            if (filterPaymentMethod) paymentWhere.method = filterPaymentMethod;

            const payments = await prisma.payment.findMany({
                where: paymentWhere,
            });

            // Expenses in range
            const expenses = await prisma.expense.findMany({
                where: {
                    lakeId,
                    createdAt: { gte: from, lte: to },
                },
            });

            // Fish buybacks in range
            const fishBuybacks = await prisma.fishBuyback.findMany({
                where: {
                    lakeId,
                    createdAt: { gte: from, lte: to },
                },
                include: { fishType: true },
            });

            // Fishing sessions created in range
            const sessionWhere: Prisma.FishingSessionWhereInput = {
                lakeId,
                createdAt: { gte: from, lte: to },
            };
            if (filterCustomerId) sessionWhere.customerId = filterCustomerId;
            if (filterPackageId) sessionWhere.packageId = filterPackageId;
            if (filterSessionStatus) sessionWhere.status = filterSessionStatus;
            if (filterHutId) {
                sessionWhere.hutLinks = { some: { hutId: filterHutId } };
            } else if (filterAreaId) {
                sessionWhere.hutLinks = { some: { hut: { areaId: filterAreaId } } };
            }

            const sessions = await prisma.fishingSession.findMany({
                where: sessionWhere,
                include: {
                    hutLinks: {
                        include: {
                            hut: {
                                include: { area: true },
                            },
                        },
                    },
                    customer: true,
                    package: true,
                },
            });

            // Calculate metrics strictly according to formula
            let ticketRevenue = 0;
            let productRevenue = 0;
            let overtimeRevenue = 0;
            let otherRevenue = 0;
            let refundAmount = 0;
            let refundCount = 0;
            let totalReceivableDebt = 0;

            for (const inv of invoices) {
                // Ignore VOIDED
                if (inv.status === InvoiceStatus.VOIDED) continue;

                // Debt: If DRAFT or PARTIALLY_PAID
                const paidSum = inv.payments.reduce((acc, p) => {
                    return p.direction === PaymentDirection.IN ? acc + p.amountVnd : acc - p.amountVnd;
                }, 0);

                if (inv.status === InvoiceStatus.DRAFT || inv.status === InvoiceStatus.PARTIALLY_PAID) {
                    const remaining = Math.max(0, inv.totalAmountVnd - paidSum);
                    totalReceivableDebt += remaining;
                }

                for (const line of inv.lines) {
                    if (filterProductId && line.productId !== filterProductId) continue;

                    if (line.totalVnd < 0) {
                        // Negative line indicates refund or discount or buyback deduction
                        refundAmount += Math.abs(line.totalVnd);
                        refundCount++;
                    } else if (line.productId) {
                        productRevenue += line.totalVnd;
                    } else if (line.name.toLowerCase().includes("thêm giờ") || line.name.toLowerCase().includes("phụ trội")) {
                        overtimeRevenue += line.totalVnd;
                    } else if (inv.fishingSessionId) {
                        ticketRevenue += line.totalVnd;
                    } else {
                        otherRevenue += line.totalVnd;
                    }
                }
            }

            const totalRevenue = Math.max(
                0,
                ticketRevenue + productRevenue + overtimeRevenue + otherRevenue - refundAmount
            );

            // Cash and Bank Transfer from payments
            let cashIn = 0;
            let cashOut = 0;
            let transferIn = 0;
            let transferOut = 0;

            for (const p of payments) {
                if (p.method === PaymentMethod.CASH) {
                    if (p.direction === PaymentDirection.IN) cashIn += p.amountVnd;
                    else cashOut += p.amountVnd;
                } else if (p.method === PaymentMethod.BANK_TRANSFER) {
                    if (p.direction === PaymentDirection.IN) transferIn += p.amountVnd;
                    else transferOut += p.amountVnd;
                }
            }

            const netCash = cashIn - cashOut;
            const netTransfer = transferIn - transferOut;

            // Total expenses
            const totalExpense = expenses.reduce((acc, exp) => acc + exp.amountVnd, 0);

            // Total fish buybacks
            const totalFishBuyback = fishBuybacks.reduce((acc, fb) => acc + fb.totalVnd, 0);

            // Net Estimated Profit = Total Revenue - Expenses - Fish Buybacks
            const netProfit = totalRevenue - totalExpense - totalFishBuyback;

            // Session status counts and durations
            let activeSessions = 0;
            let completedSessions = 0;
            let cancelledSessions = 0;
            let totalFishingMinutes = 0;
            let totalOvertimeMinutes = 0;

            for (const s of sessions) {
                if (s.status === SessionStatus.ACTIVE) activeSessions++;
                else if (s.status === SessionStatus.COMPLETED) completedSessions++;
                else if (s.status === SessionStatus.CANCELLED) cancelledSessions++;

                const endTime = s.endedAt || (s.status === SessionStatus.ACTIVE ? new Date() : s.plannedEndAt);
                const durationMinutes = Math.max(0, Math.round((endTime.getTime() - s.startAt.getTime()) / 60000));
                totalFishingMinutes += durationMinutes;

                if (endTime.getTime() > s.plannedEndAt.getTime()) {
                    totalOvertimeMinutes += Math.round((endTime.getTime() - s.plannedEndAt.getTime()) / 60000);
                }
            }

            const totalSessions = sessions.length;
            const averageTicketValue = totalSessions > 0 ? Math.round(ticketRevenue / Math.max(1, completedSessions + activeSessions)) : 0;

            return {
                totalRevenue,
                ticketRevenue,
                productRevenue,
                overtimeRevenue,
                otherRevenue,
                refundAmount,
                refundCount,
                totalExpense,
                totalFishBuyback,
                netProfit,
                totalReceivableDebt,
                cashIn,
                cashOut,
                netCash,
                transferIn,
                transferOut,
                netTransfer,
                totalSessions,
                activeSessions,
                completedSessions,
                cancelledSessions,
                totalFishingHours: Math.round((totalFishingMinutes / 60) * 10) / 10,
                totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
                averageTicketValue,
                sessions,
                invoices,
                expenses,
                fishBuybacks,
            };
        }

        // 4. Fetch metrics for Primary window
        const primaryData = await fetchMetricsForWindow(primaryRange);

        // 5. Fetch metrics for Compare window if requested
        let deltas: Record<string, DeltaComparison> | null = null;

        if (compareRange) {
            const compareData = await fetchMetricsForWindow(compareRange);
            deltas = {
                totalRevenue: calculateDelta(primaryData.totalRevenue, compareData.totalRevenue),
                ticketRevenue: calculateDelta(primaryData.ticketRevenue, compareData.ticketRevenue),
                productRevenue: calculateDelta(primaryData.productRevenue, compareData.productRevenue),
                overtimeRevenue: calculateDelta(primaryData.overtimeRevenue, compareData.overtimeRevenue),
                totalExpense: calculateDelta(primaryData.totalExpense, compareData.totalExpense),
                totalFishBuyback: calculateDelta(primaryData.totalFishBuyback, compareData.totalFishBuyback),
                netProfit: calculateDelta(primaryData.netProfit, compareData.netProfit),
                totalSessions: calculateDelta(primaryData.totalSessions, compareData.totalSessions),
                completedSessions: calculateDelta(primaryData.completedSessions, compareData.completedSessions),
                netCash: calculateDelta(primaryData.netCash, compareData.netCash),
                netTransfer: calculateDelta(primaryData.netTransfer, compareData.netTransfer),
            };
        }

        // 6. Generate time-series chart data
        const durationDays = (primaryRange.to.getTime() - primaryRange.from.getTime()) / (86400 * 1000);
        let grouping: "hourly" | "daily" | "monthly" | "yearly" = "daily";

        if (durationDays <= 1.5) {
            grouping = "hourly";
        } else if (durationDays <= 65) {
            grouping = "daily";
        } else if (durationDays <= 735) {
            grouping = "monthly";
        } else {
            grouping = "yearly";
        }

        const chartPointsMap = new Map<string, {
            key: string;
            label: string;
            revenue: number;
            expense: number;
            profit: number;
            sessions: number;
            overtimeVnd: number;
        }>();

        // Seed time buckets so chart has continuous timeline
        if (grouping === "hourly") {
            for (let h = 0; h < 24; h++) {
                const key = `${String(h).padStart(2, "0")}:00`;
                chartPointsMap.set(key, {
                    key,
                    label: `${h}h`,
                    revenue: 0,
                    expense: 0,
                    profit: 0,
                    sessions: 0,
                    overtimeVnd: 0,
                });
            }
        }

        // Populate revenue and tickets into chart buckets
        for (const inv of primaryData.invoices) {
            if (inv.status === InvoiceStatus.VOIDED) continue;
            const p = getVnParts(inv.createdAt);
            let bucketKey = "";
            let bucketLabel = "";

            if (grouping === "hourly") {
                bucketKey = `${String(p.hours).padStart(2, "0")}:00`;
                bucketLabel = `${p.hours}h`;
            } else if (grouping === "daily") {
                bucketKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
                bucketLabel = `${p.day}/${p.month}`;
            } else if (grouping === "monthly") {
                bucketKey = `${p.year}-${String(p.month).padStart(2, "0")}`;
                bucketLabel = `T${p.month}/${p.year}`;
            } else {
                bucketKey = `${p.year}`;
                bucketLabel = `${p.year}`;
            }

            if (!chartPointsMap.has(bucketKey)) {
                chartPointsMap.set(bucketKey, {
                    key: bucketKey,
                    label: bucketLabel,
                    revenue: 0,
                    expense: 0,
                    profit: 0,
                    sessions: 0,
                    overtimeVnd: 0,
                });
            }

            const pt = chartPointsMap.get(bucketKey)!;
            const invTotal = inv.lines.reduce((acc, l) => acc + l.totalVnd, 0);
            pt.revenue += Math.max(0, invTotal);

            const otLine = inv.lines.find((l) => l.name.toLowerCase().includes("thêm giờ") || l.name.toLowerCase().includes("phụ trội"));
            if (otLine) pt.overtimeVnd += otLine.totalVnd;
        }

        // Populate expenses into chart buckets
        for (const exp of primaryData.expenses) {
            const p = getVnParts(exp.createdAt);
            let bucketKey = "";
            let bucketLabel = "";

            if (grouping === "hourly") {
                bucketKey = `${String(p.hours).padStart(2, "0")}:00`;
                bucketLabel = `${p.hours}h`;
            } else if (grouping === "daily") {
                bucketKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
                bucketLabel = `${p.day}/${p.month}`;
            } else if (grouping === "monthly") {
                bucketKey = `${p.year}-${String(p.month).padStart(2, "0")}`;
                bucketLabel = `T${p.month}/${p.year}`;
            } else {
                bucketKey = `${p.year}`;
                bucketLabel = `${p.year}`;
            }

            if (!chartPointsMap.has(bucketKey)) {
                chartPointsMap.set(bucketKey, {
                    key: bucketKey,
                    label: bucketLabel,
                    revenue: 0,
                    expense: 0,
                    profit: 0,
                    sessions: 0,
                    overtimeVnd: 0,
                });
            }

            const pt = chartPointsMap.get(bucketKey)!;
            pt.expense += exp.amountVnd;
        }

        // Populate sessions count
        for (const s of primaryData.sessions) {
            const p = getVnParts(s.createdAt);
            let bucketKey = "";

            if (grouping === "hourly") {
                bucketKey = `${String(p.hours).padStart(2, "0")}:00`;
            } else if (grouping === "daily") {
                bucketKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
            } else if (grouping === "monthly") {
                bucketKey = `${p.year}-${String(p.month).padStart(2, "0")}`;
            } else {
                bucketKey = `${p.year}`;
            }

            if (chartPointsMap.has(bucketKey)) {
                chartPointsMap.get(bucketKey)!.sessions += 1;
            }
        }

        // Calculate profit for each chart point
        const chartSeries = Array.from(chartPointsMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => ({
                ...v,
                profit: v.revenue - v.expense,
            }));

        // 7. Breakdown by Area & Hut
        const areaStatsMap = new Map<string, { id: string; name: string; sessionCount: number; revenueVnd: number }>();
        const hutStatsMap = new Map<string, { id: string; name: string; areaName: string; sessionCount: number; revenueVnd: number }>();

        for (const s of primaryData.sessions) {
            for (const link of s.hutLinks) {
                const hut = link.hut;
                const area = hut.area;

                if (!areaStatsMap.has(area.id)) {
                    areaStatsMap.set(area.id, { id: area.id, name: area.name, sessionCount: 0, revenueVnd: 0 });
                }
                const aStat = areaStatsMap.get(area.id)!;
                aStat.sessionCount += 1;
                aStat.revenueVnd += s.packagePriceVndSnapshot;

                if (!hutStatsMap.has(hut.id)) {
                    hutStatsMap.set(hut.id, { id: hut.id, name: hut.name, areaName: area.name, sessionCount: 0, revenueVnd: 0 });
                }
                const hStat = hutStatsMap.get(hut.id)!;
                hStat.sessionCount += 1;
                hStat.revenueVnd += s.packagePriceVndSnapshot;
            }
        }

        // 8. Top products sold & inventory overview
        const productSalesMap = new Map<string, { id: string; name: string; quantity: number; revenueVnd: number }>();
        for (const inv of primaryData.invoices) {
            if (inv.status === InvoiceStatus.VOIDED) continue;
            for (const line of inv.lines) {
                if (line.productId && line.totalVnd > 0) {
                    if (!productSalesMap.has(line.productId)) {
                        productSalesMap.set(line.productId, {
                            id: line.productId,
                            name: line.name,
                            quantity: 0,
                            revenueVnd: 0,
                        });
                    }
                    const pStat = productSalesMap.get(line.productId)!;
                    pStat.quantity += Number(line.quantity);
                    pStat.revenueVnd += line.totalVnd;
                }
            }
        }

        const topProducts = Array.from(productSalesMap.values())
            .sort((a, b) => b.revenueVnd - a.revenueVnd)
            .slice(0, 10);

        // Inventory movements count
        const inventoryMovementCount = await prisma.inventoryMovement.count({
            where: {
                lakeId,
                createdAt: { gte: primaryRange.from, lte: primaryRange.to },
            },
        });

        // 9. Customer summary
        const customerVisitMap = new Map<string, { id: string; name: string; phone: string | null; sessions: number; totalSpent: number }>();
        for (const s of primaryData.sessions) {
            if (s.customer) {
                if (!customerVisitMap.has(s.customer.id)) {
                    customerVisitMap.set(s.customer.id, {
                        id: s.customer.id,
                        name: s.customer.name,
                        phone: s.customer.phoneNormalized,
                        sessions: 0,
                        totalSpent: 0,
                    });
                }
                const cStat = customerVisitMap.get(s.customer.id)!;
                cStat.sessions += 1;
                cStat.totalSpent += s.packagePriceVndSnapshot;
            }
        }

        const topCustomers = Array.from(customerVisitMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        // 10. Staff / Membership overview
        const memberships = await prisma.membership.findMany({
            where: { lakeId },
            include: { user: true },
        });

        const staffReport = memberships.map(m => ({
            id: m.userId,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
        }));

        // 11. Audit Events count in period
        const auditEventsCount = await prisma.auditEvent.count({
            where: {
                lakeId,
                createdAt: { gte: primaryRange.from, lte: primaryRange.to },
            },
        });

        // 12. OTP logs count in period
        const otpLogs = await prisma.otpDeliveryLog.findMany({
            where: {
                createdAt: { gte: primaryRange.from, lte: primaryRange.to },
            },
        });
        const totalOtpSent = otpLogs.length;
        const totalOtpSuccess = otpLogs.filter(o => o.status === "DELIVERED" || o.status === "SENT").length;
        const totalOtpVerified = otpLogs.filter(o => o.verifiedAt !== null).length;
        const totalOtpCostVnd = otpLogs.reduce((acc, o) => acc + o.costVnd, 0);

        // 13. SaaS & Lake subscription info
        const lake = await prisma.lake.findUnique({
            where: { id: lakeId },
            include: { organization: true },
        });

        const saasOrders = await prisma.subscriptionOrder.findMany({
            where: {
                lakeId,
                createdAt: { gte: primaryRange.from, lte: primaryRange.to },
            },
            include: { plan: true },
        });

        // 14. Catalog options for advanced filter dropdowns
        const [areas, huts, packages, products] = await Promise.all([
            prisma.area.findMany({ where: { lakeId, deletedAt: null } }),
            prisma.hut.findMany({ where: { lakeId, deletedAt: null }, include: { area: true } }),
            prisma.package.findMany({ where: { lakeId, deletedAt: null } }),
            prisma.product.findMany({ where: { lakeId, deletedAt: null } }),
        ]);

        return NextResponse.json({
            lake: {
                id: lake?.id,
                name: lake?.name,
                plan: lake?.subscriptionPlan,
                status: lake?.subscriptionStatus,
                expiresAt: lake?.subscriptionExpiresAt,
            },
            timeWindow: {
                preset,
                from: primaryRange.from.toISOString(),
                to: primaryRange.to.toISOString(),
                label: primaryRange.label,
                fromDisplay: formatVnDateTimeDisplay(primaryRange.from),
                toDisplay: formatVnDateTimeDisplay(primaryRange.to),
                grouping,
            },
            comparativeWindow: compareRange
                ? {
                    mode: compareMode,
                    from: compareRange.from.toISOString(),
                    to: compareRange.to.toISOString(),
                    label: compareRange.label,
                    fromDisplay: formatVnDateTimeDisplay(compareRange.from),
                    toDisplay: formatVnDateTimeDisplay(compareRange.to),
                }
                : null,
            summary: {
                totalRevenue: primaryData.totalRevenue,
                ticketRevenue: primaryData.ticketRevenue,
                productRevenue: primaryData.productRevenue,
                overtimeRevenue: primaryData.overtimeRevenue,
                totalFishBuyback: primaryData.totalFishBuyback,
                totalExpense: primaryData.totalExpense,
                netProfit: primaryData.netProfit,
                totalReceivableDebt: primaryData.totalReceivableDebt,
                cashIn: primaryData.cashIn,
                cashOut: primaryData.cashOut,
                netCash: primaryData.netCash,
                transferIn: primaryData.transferIn,
                transferOut: primaryData.transferOut,
                netTransfer: primaryData.netTransfer,
                otherRevenue: primaryData.otherRevenue,
                totalSessions: primaryData.totalSessions,
                activeSessions: primaryData.activeSessions,
                completedSessions: primaryData.completedSessions,
                cancelledSessions: primaryData.cancelledSessions,
                totalFishingHours: primaryData.totalFishingHours,
                totalOvertimeHours: primaryData.totalOvertimeHours,
                averageTicketValue: primaryData.averageTicketValue,
                refundAmount: primaryData.refundAmount,
                refundCount: primaryData.refundCount,
            },
            deltas,
            chartSeries,
            breakdown: {
                areas: Array.from(areaStatsMap.values()),
                huts: Array.from(hutStatsMap.values()),
                topProducts,
                inventoryMovementsCount: inventoryMovementCount,
                topCustomers,
                staff: staffReport,
                auditEventsCount,
                otp: {
                    totalSent: totalOtpSent,
                    totalSuccess: totalOtpSuccess,
                    totalVerified: totalOtpVerified,
                    totalCostVnd: totalOtpCostVnd,
                },
                saasOrders: saasOrders.map(o => ({
                    id: o.id,
                    orderCode: o.orderCode,
                    planName: o.plan.name,
                    amountVnd: o.amountVnd,
                    status: o.status,
                    createdAt: o.createdAt,
                })),
            },
            filterOptions: {
                areas: areas.map(a => ({ id: a.id, name: a.name })),
                huts: huts.map(h => ({ id: h.id, name: h.name, areaName: h.area.name })),
                packages: packages.map(p => ({ id: p.id, name: p.name })),
                products: products.map(p => ({ id: p.id, name: p.name })),
                staff: staffReport.map(s => ({ id: s.id, name: s.name })),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in GET /api/reports/analytics:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: message },
            { status: 500 }
        );
    }
}
