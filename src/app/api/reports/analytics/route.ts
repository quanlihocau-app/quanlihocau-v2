import { financialScope } from "@/lib/reports/financial-scope";
import { summarizeMoney, summarizeRevenue } from "@/lib/finance";
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
import { createInternalErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

interface InvoiceSummaryItem {
    id: string;
    createdAt: Date;
    status: InvoiceStatus;
    lines: Array<{
        productId: string | null;
        name: string;
        fishBuybackId: string | null;
        totalVnd: number;
        quantity: Prisma.Decimal | number;
    }>;
}

interface SessionSummaryItem {
    id: string;
    createdAt: Date;
    packagePriceVndSnapshot: number;
    status: SessionStatus;
    startAt: Date;
    plannedEndAt: Date;
    endedAt: Date | null;
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
    // new fish metrics
    totalFishCount: number;
    totalFishWeight: number;
    topFish: Array<{ name: string; weight: number; revenue: number }>;
    sessions: SessionSummaryItem[];
    invoices: InvoiceSummaryItem[];
    expenses: Array<{ createdAt: Date; amountVnd: number }>;
    fishBuybacks: Array<{ createdAt: Date; totalVnd: number; weight: Prisma.Decimal | number; fishType: { name: string } | null }>;
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

        const scope = await financialScope(lakeId, searchParams);

        // 3. Helper to aggregate financial & operational data for a given window
        async function fetchMetricsForWindow(range: { from: Date; to: Date }): Promise<WindowMetrics> {
            const { from, to } = range;

            // Invoices in range
            const invoiceWhere: Prisma.InvoiceWhereInput = {
                ...scope.invoice,
                createdAt: { gte: from, lte: to },
            };
            if (filterCustomerId) invoiceWhere.customerId = filterCustomerId;

            const invoicesQuery = prisma.invoice.findMany({
                where: invoiceWhere,
                include: {
                    lines: true,
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
                ...scope.payment,
                createdAt: { gte: from, lte: to },
            };
            if (filterPaymentMethod) paymentWhere.method = filterPaymentMethod;

            const paymentsQuery = prisma.payment.findMany({
                where: paymentWhere,
            });

            // Expenses in range
            const expensesQuery = prisma.expense.findMany({
                where: {
                    ...scope.expense,
                    createdAt: { gte: from, lte: to },
                },
            });

            // Fish buybacks in range
            const fishBuybacksQuery = prisma.fishBuyback.findMany({
                where: {
                    ...scope.buyback,
                    createdAt: { gte: from, lte: to },
                },
                include: { fishType: true },
            });

            // Fishing sessions created in range
            const sessionWhere: Prisma.FishingSessionWhereInput = {
                ...scope.session,
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

            const sessionsQuery = prisma.fishingSession.findMany({
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

            const [invoices, payments, expenses, fishBuybacks, sessions] = await Promise.all([invoicesQuery, paymentsQuery, expensesQuery, fishBuybacksQuery, sessionsQuery]);

            // Calculate metrics strictly according to formula
            const validInvoices = invoices.filter(inv => inv.status !== InvoiceStatus.VOIDED);
            const { ticketRevenue, productRevenue, overtimeRevenue, otherRevenue, refundAmount, refundCount, totalRevenue } = summarizeRevenue(
                validInvoices.map(inv => ({ ...inv, lines: inv.lines.filter(line => !filterProductId || line.productId === filterProductId) }))
            );
            let totalReceivableDebt = 0;
            for (const inv of validInvoices) {
                const paidSum = inv.payments.reduce((acc, p) => p.direction === PaymentDirection.IN ? acc + p.amountVnd : acc - p.amountVnd, 0);
                if (inv.status === InvoiceStatus.DRAFT || inv.status === InvoiceStatus.PARTIALLY_PAID)
                    totalReceivableDebt += Math.max(0, inv.totalAmountVnd - paidSum);
            }
            const { cashIn, cashOut, transferIn, transferOut, netCash, netTransfer } = summarizeMoney(payments);

            // Total expenses
            const totalExpense = expenses.reduce((acc, exp) => acc + exp.amountVnd, 0);

            // Total fish buybacks
            const totalFishBuyback = fishBuybacks.reduce((acc, fb) => acc + fb.totalVnd, 0);
            // New calculations: total fish count and total weight (kg)
            const totalFishCount = fishBuybacks.length;
            const totalFishWeight = fishBuybacks.reduce((acc, fb) => {
                // fb.weight is a Decimal; convert to number
                const weightNum = typeof fb.weight === 'number' ? fb.weight : Number(fb.weight) || 0;
                return acc + weightNum;
            }, 0);
            // Aggregate top fish by weight
            const fishWeightMap = new Map<string, { name: string; weight: number; revenue: number }>();
            for (const fb of fishBuybacks) {
                const key = fb.fishTypeId;
                const weightNum = typeof fb.weight === 'number' ? fb.weight : Number(fb.weight) || 0;
                const existing = fishWeightMap.get(key);
                if (existing) {
                    existing.weight += weightNum;
                    existing.revenue += fb.totalVnd;
                } else {
                    fishWeightMap.set(key, { name: fb.fishType?.name ?? 'Unknown', weight: weightNum, revenue: fb.totalVnd });
                }
            }
            const topFish = Array.from(fishWeightMap.values())
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 5);


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
                // existing metrics
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
                // new metrics
                totalFishCount,
                totalFishWeight,
                topFish,
                // original arrays
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
            pt.revenue += summarizeRevenue([{ ...inv, lines: inv.lines.filter(l => !filterProductId || l.productId === filterProductId) }]).totalRevenue;

            const otLine = inv.lines.find((l) => l.name.toLowerCase().includes("thêm giờ") || l.name.toLowerCase().includes("phụ trội"));
            if (otLine) pt.overtimeVnd += otLine.totalVnd;
        }

        // Populate expenses into chart buckets
        for (const exp of [...primaryData.expenses, ...primaryData.fishBuybacks.map(f => ({ createdAt: f.createdAt, amountVnd: f.totalVnd }))]) {
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
            .slice(0, 5);

        // Top 5 câu nhiều giờ nhất (tính tổng giờ câu từ sessions có customer)
        const customerHoursMap = new Map<string, { id: string; name: string; phone: string | null; totalMinutes: number }>();
        for (const s of primaryData.sessions) {
            if (!s.customer) continue;
            const endTime = s.endedAt || s.plannedEndAt;
            const mins = Math.max(0, Math.round((endTime.getTime() - s.startAt.getTime()) / 60000));
            if (!customerHoursMap.has(s.customer.id)) {
                customerHoursMap.set(s.customer.id, { id: s.customer.id, name: s.customer.name, phone: s.customer.phoneNormalized, totalMinutes: 0 });
            }
            customerHoursMap.get(s.customer.id)!.totalMinutes += mins;
        }
        const top5MostHours = Array.from(customerHoursMap.values())
            .sort((a, b) => b.totalMinutes - a.totalMinutes)
            .slice(0, 5)
            .map(c => ({ ...c, totalHours: Math.round((c.totalMinutes / 60) * 10) / 10 }));

        // Top 5 chi tiêu nhiều nhất (same as topCustomers but slice 5)
        const top5MostSpent = Array.from(customerVisitMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5);

        // Top 5 lâu chưa quay lại: tìm khách có session TRONG DB nhưng lần cuối cách đây lâu nhất
        // Dùng sessions đã fetch trong primaryData — tìm lần ghé cuối cùng của mỗi khách
        const customerLastVisitMap = new Map<string, { id: string; name: string; phone: string | null; lastVisit: Date }>();
        for (const s of primaryData.sessions) {
            if (!s.customer) continue;
            const existing = customerLastVisitMap.get(s.customer.id);
            if (!existing || s.createdAt > existing.lastVisit) {
                customerLastVisitMap.set(s.customer.id, { id: s.customer.id, name: s.customer.name, phone: s.customer.phoneNormalized, lastVisit: s.createdAt });
            }
        }
        const now = new Date();
        const top5LongestAbsent = Array.from(customerLastVisitMap.values())
            .map(c => ({ ...c, daysSince: Math.floor((now.getTime() - c.lastVisit.getTime()) / 86400000) }))
            .sort((a, b) => b.daysSince - a.daysSince)
            .slice(0, 5);

        // Top 5 cá lớn nhất (theo weight từng lần mua)
        const top5BiggestFish = primaryData.fishBuybacks
            .map(fb => ({
                name: fb.fishType?.name ?? 'Unknown',
                weight: typeof fb.weight === 'number' ? fb.weight : Number(fb.weight) || 0,
                revenue: fb.totalVnd,
                date: fb.createdAt,
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5);

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
                // new fish & customer metrics
                totalFishCount: primaryData.totalFishCount,
                totalFishWeight: primaryData.totalFishWeight,
                topFish: primaryData.topFish,
                totalCustomers: customerVisitMap.size,
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
                // New breakdown entries
                totalFishCount: primaryData.totalFishCount,
                totalFishWeight: primaryData.totalFishWeight,
                topFish: primaryData.topFish,
                top5BiggestFish,
                top5MostSpent,
                top5MostHours,
                top5LongestAbsent,
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
        return createInternalErrorResponse(
            "GET /api/reports/analytics error",
            error,
            "Có lỗi hệ thống xảy ra khi tải dữ liệu phân tích báo cáo. Vui lòng thử lại.",
        );
    }
}
