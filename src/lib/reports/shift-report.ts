import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { startOfVnDay } from "@/lib/reports/date-utils";
import { parseShiftCloseNote } from "@/lib/shift-helper";
import {
    drawerMovements,
    expectedDrawerCash,
    fishOffsetVnd,
    openSessionMoney,
    reconcileRevenue,
    REVENUE_IDENTITY,
    shiftStartInstant,
    summarizeRevenue,
    type MoneyMovement,
} from "@/lib/money";

type ReportDb = Prisma.TransactionClient | typeof prisma;

export class OpenSessionsNeedConfirmError extends Error {
    sessions: Array<{ id: string; customerName: string; hutName: string; pendingAmountVnd: number; overtimeLabel: string | null }>;

    constructor(sessions: OpenSessionsNeedConfirmError["sessions"]) {
        super("OPEN_SESSIONS_NEED_CONFIRM");
        this.name = "OpenSessionsNeedConfirmError";
        this.sessions = sessions;
    }
}

export function handoverCash(close: { note: string | null; actualCashVnd?: number | null; totalCashVnd: number }): number {
    const parsed = parseShiftCloseNote(close.note);
    if (typeof parsed.actualCashVnd === "number") return parsed.actualCashVnd;
    if (typeof close.actualCashVnd === "number") return close.actualCashVnd;
    return close.totalCashVnd ?? 0;
}

const notDraft = { financialTransactions: { none: { status: "DRAFT" as const } } };

export async function listOpenSessions(db: ReportDb, lakeId: string, now = new Date()) {
    const sessions = await db.fishingSession.findMany({
        where: { lakeId, status: "ACTIVE" },
        include: {
            customer: { select: { name: true } },
            hutLinks: { select: { hut: { select: { name: true } } } },
            invoices: {
                where: { status: { not: "VOIDED" } },
                include: {
                    lines: { select: { name: true, totalVnd: true, productId: true, fishBuybackId: true } },
                    payments: { select: { amountVnd: true, direction: true, method: true, expenseId: true, invoiceId: true } },
                },
            },
        },
        orderBy: { startAt: "asc" },
    });

    return sessions.map((session) => {
        const invoice = session.invoices[0];
        const lines = invoice?.lines ?? [];
        const payments = (invoice?.payments ?? []) as MoneyMovement[];
        const money = openSessionMoney({ now, plannedEndAt: session.plannedEndAt, lines, payments });
        const hutName = session.hutLinks.map((link) => link.hut.name).join(", ") || "—";
        return {
            id: session.id,
            customerName: session.customer?.name || "Khách",
            hutName,
            startTime: session.startAt.toISOString(),
            plannedEndAt: session.plannedEndAt.toISOString(),
            pendingAmountVnd: money.pendingAmountVnd,
            packageName: session.packageNameSnapshot || "",
            overtimeLabel: money.overtimeLabel,
            paymentTiming: session.paymentTiming,
        };
    });
}

export async function measureShiftWindow(db: ReportDb, lakeId: string, start: Date, end: Date, now = new Date()) {
    const [shiftSessions, invoiceLines, payments, fishBuybacksAgg, expensesAgg, inventory, openSessions] = await Promise.all([
        db.fishingSession.findMany({
            where: { lakeId, createdAt: { gte: start, lte: end } },
            select: {
                status: true,
                packageNameSnapshot: true,
                packagePriceVndSnapshot: true,
                hutLinks: { select: { hutId: true } },
            },
        }),
        db.invoiceLine.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                invoice: { lakeId, status: { not: "VOIDED" } },
            },
            select: {
                productId: true,
                fishBuybackId: true,
                name: true,
                quantity: true,
                totalVnd: true,
                invoice: { select: { fishingSessionId: true } },
            },
        }),
        db.payment.findMany({
            where: { lakeId, createdAt: { gte: start, lte: end }, ...notDraft },
            select: { amountVnd: true, method: true, direction: true, expenseId: true, invoiceId: true },
        }),
        db.fishBuyback.aggregate({
            where: { lakeId, createdAt: { gte: start, lte: end } },
            _sum: { totalVnd: true },
        }),
        db.expense.aggregate({
            where: { lakeId, createdAt: { gte: start, lte: end }, ...notDraft },
            _sum: { amountVnd: true },
        }),
        db.inventoryMovement.findMany({
            where: { lakeId, createdAt: { gte: start, lte: end } },
            select: { quantity: true },
        }),
        listOpenSessions(db, lakeId, now),
    ]);

    const revenue = summarizeRevenue(invoiceLines.map((line) => ({
        fishingSessionId: line.invoice.fishingSessionId,
        lines: [line],
    })));
    const drawer = drawerMovements(payments);
    const fishOffset = fishOffsetVnd(invoiceLines);
    const reconciliationCore = reconcileRevenue({
        revenueVnd: revenue.totalRevenue,
        payments,
        fishOffsetVnd: fishOffset,
    });
    const fishBuybackVnd = fishBuybacksAgg._sum.totalVnd ?? 0;
    const approvedExpenseVnd = expensesAgg._sum.amountVnd ?? 0;

    const countedSessions = shiftSessions.filter((session) => session.status !== "CANCELLED");
    const pkgMap = new Map<string, { count: number; totalVnd: number }>();
    for (const session of countedSessions) {
        const name = session.packageNameSnapshot || "Gói tiêu chuẩn";
        const current = pkgMap.get(name) || { count: 0, totalVnd: 0 };
        current.count += 1;
        current.totalVnd += session.packagePriceVndSnapshot * Math.max(session.hutLinks.length, 1);
        pkgMap.set(name, current);
    }

    const prodMap = new Map<string, { name: string; quantity: number; totalVnd: number }>();
    let extensionsCount = 0;
    let extensionsTotalVnd = 0;
    for (const line of invoiceLines) {
        if (line.productId) {
            const current = prodMap.get(line.productId) || { name: line.name, quantity: 0, totalVnd: 0 };
            current.quantity += Number(line.quantity);
            current.totalVnd += line.totalVnd;
            prodMap.set(line.productId, current);
        } else if (line.name.toLowerCase().includes("gia hạn")) {
            extensionsCount += 1;
            extensionsTotalVnd += line.totalVnd;
        }
    }

    let invInCount = 0;
    let invOutCount = 0;
    for (const movement of inventory) {
        const quantity = Number(movement.quantity);
        if (quantity > 0) invInCount += quantity;
        else invOutCount += Math.abs(quantity);
    }

    const openSessionBalanceVnd = openSessions.reduce((sum, session) => sum + session.pendingAmountVnd, 0);

    return {
        revenue,
        drawer,
        fishOffsetVnd: fishOffset,
        fishBuybackVnd,
        approvedExpenseVnd,
        totalExpenseVnd: fishBuybackVnd + approvedExpenseVnd,
        netProfitVnd: revenue.totalRevenue - fishBuybackVnd - approvedExpenseVnd,
        reconciliationCore,
        openSessions,
        openSessionBalanceVnd,
        sessions: {
            total: shiftSessions.length,
            completed: shiftSessions.filter((session) => session.status === "COMPLETED").length,
            active: shiftSessions.filter((session) => session.status === "ACTIVE").length,
            cancelled: shiftSessions.filter((session) => session.status === "CANCELLED").length,
            packages: Array.from(pkgMap.entries()).map(([packageName, data]) => ({ packageName, ...data })),
        },
        products: {
            totalQuantity: Array.from(prodMap.values()).reduce((sum, item) => sum + item.quantity, 0),
            totalVnd: Array.from(prodMap.values()).reduce((sum, item) => sum + item.totalVnd, 0),
            items: Array.from(prodMap.values()),
        },
        services: { extensionsCount, extensionsTotalVnd },
        inventory: { inCount: invInCount, outCount: invOutCount },
    };
}

export interface StaffAttributionItem {
    userId: string;
    userName: string;
    role: string;
    roleLabel: string;
    cashCollectedVnd: number;
    transferCollectedVnd: number;
    totalCollectedVnd: number;
    expenseVnd: number;
    actionsCount: number;
}

export async function loadShiftReport(lakeId: string, requestedShiftId?: string | null) {
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

    let currentShift = requestedShiftId
        ? await prisma.shift.findFirst({
            where: { id: requestedShiftId, lakeId },
            include: { closes: { orderBy: { createdAt: "desc" }, take: 1 } },
        })
        : null;

    if (!currentShift) {
        currentShift = await prisma.shift.findFirst({
            where: { lakeId, endTime: null },
            include: { closes: { orderBy: { createdAt: "desc" }, take: 1 } },
            orderBy: { startTime: "desc" },
        });
    }

    const lastClosedShift = await prisma.shift.findFirst({
        where: { lakeId, endTime: { not: null } },
        include: { closes: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { endTime: "desc" },
    });

    const previousHandoverCash = lastClosedShift?.closes[0] ? handoverCash(lastClosedShift.closes[0]) : 0;
    const now = new Date();
    const syntheticStart = shiftStartInstant(now, lastClosedShift?.endTime ?? null, startOfVnDay(now));

    const shift = currentShift ?? {
        id: "",
        startTime: syntheticStart,
        endTime: null as Date | null,
        closes: [] as Array<{
            id: string;
            closedBy: string | null;
            note: string | null;
            createdAt: Date;
            totalRevenueVnd: number;
            totalCashVnd: number;
            totalTransferVnd: number;
            totalExpenseVnd: number;
            fishBuybackVnd: number;
            otherExpenseVnd: number;
        }>,
    };

    const isClosed = shift.endTime !== null && shift.closes.length > 0;
    const rawClose = shift.closes[0] ?? null;
    const parsedClose = rawClose ? parseShiftCloseNote(rawClose.note) : null;
    const openingCashVnd = shift.endTime === null ? previousHandoverCash : 0;

    const measured = await measureShiftWindow(prisma, lakeId, shift.startTime, shift.endTime ?? now, now);
    const expectedDrawerVnd = expectedDrawerCash(openingCashVnd, measured.drawer.cashIn, measured.drawer.cashOut);
    const useFrozen = isClosed && rawClose;
    const revenueVnd = useFrozen ? rawClose.totalRevenueVnd : measured.revenue.totalRevenue;
    const expenseVnd = useFrozen ? rawClose.totalExpenseVnd : measured.totalExpenseVnd;
    const fishBuybackVnd = useFrozen ? rawClose.fishBuybackVnd : measured.fishBuybackVnd;
    const otherExpenseVnd = useFrozen ? rawClose.otherExpenseVnd : measured.approvedExpenseVnd;

    // ── Giám sát trách nhiệm thu/chi theo từng nhân viên (Chống gian lận) ────
    const shiftStartTime = shift.startTime;
    const shiftEndTime = shift.endTime ?? now;

    const [shiftAuditEvents, lakeUsers] = await Promise.all([
        prisma.auditEvent.findMany({
            where: {
                lakeId,
                createdAt: { gte: shiftStartTime, lte: shiftEndTime },
            },
            select: {
                id: true,
                action: true,
                payload: true,
                createdBy: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        }),
        prisma.user.findMany({
            where: {
                memberships: { some: { lakeId } },
            },
            select: {
                id: true,
                name: true,
                email: true,
                memberships: {
                    where: { lakeId },
                    select: { role: true },
                },
            },
        }),
    ]);

    const staffStatsMap = new Map<string, StaffAttributionItem>();

    for (const u of lakeUsers) {
        const role = u.memberships[0]?.role || "STAFF";
        const roleLabel = role === "OWNER" ? "Chủ hồ" : role === "MANAGER" ? "Quản lý" : "Nhân viên";
        staffStatsMap.set(u.id, {
            userId: u.id,
            userName: u.name || u.email,
            role,
            roleLabel,
            cashCollectedVnd: 0,
            transferCollectedVnd: 0,
            totalCollectedVnd: 0,
            expenseVnd: 0,
            actionsCount: 0,
        });
    }

    for (const ev of shiftAuditEvents) {
        if (!ev.createdBy || ev.createdBy === "system" || ev.createdBy === "anonymous") continue;

        let staff = staffStatsMap.get(ev.createdBy);
        if (!staff) {
            staff = {
                userId: ev.createdBy,
                userName: "Nhân viên",
                role: "STAFF",
                roleLabel: "Nhân viên",
                cashCollectedVnd: 0,
                transferCollectedVnd: 0,
                totalCollectedVnd: 0,
                expenseVnd: 0,
                actionsCount: 0,
            };
            staffStatsMap.set(ev.createdBy, staff);
        }

        staff.actionsCount += 1;

        try {
            const data = JSON.parse(ev.payload);
            if (data.actorName && (staff.userName === "Nhân viên" || !staff.userName)) {
                staff.userName = data.actorName;
            }
            if (data.actorRole) {
                staff.role = data.actorRole;
                staff.roleLabel = data.actorRole === "OWNER" ? "Chủ hồ" : data.actorRole === "MANAGER" ? "Quản lý" : "Nhân viên";
            }

            if (ev.action === "PAYMENT_RECORDED") {
                const amount = Math.abs(Number(data.amountVnd || 0));
                if (data.method === "CASH") {
                    staff.cashCollectedVnd += amount;
                } else {
                    staff.transferCollectedVnd += amount;
                }
            } else if (ev.action === "RETAIL_SALE_COMPLETED") {
                const amount = Math.abs(Number(data.totalAmountVnd || 0));
                if (data.paymentMethod === "CASH") {
                    staff.cashCollectedVnd += amount;
                } else {
                    staff.transferCollectedVnd += amount;
                }
            } else if (ev.action === "INVOICE_PREPAID") {
                if (Array.isArray(data.extra?.payments)) {
                    for (const p of data.extra.payments) {
                        const amt = Math.abs(Number(p.amountVnd || 0));
                        if (p.method === "CASH") {
                            staff.cashCollectedVnd += amt;
                        } else {
                            staff.transferCollectedVnd += amt;
                        }
                    }
                } else if (data.after?.paidAmountVnd) {
                    staff.cashCollectedVnd += Math.abs(Number(data.after.paidAmountVnd || 0));
                }
            } else if (ev.action === "FISH_BUYBACK_CREATED") {
                staff.expenseVnd += Math.abs(Number(data.totalVnd || 0));
            } else if (ev.action === "EXPENSE_CREATED") {
                staff.expenseVnd += Math.abs(Number(data.amountVnd || 0));
            }
        } catch {
            // ignore JSON parse
        }

        staff.totalCollectedVnd = staff.cashCollectedVnd + staff.transferCollectedVnd;
    }

    const staffAttribution = Array.from(staffStatsMap.values())
        .filter((s) => s.actionsCount > 0 || s.totalCollectedVnd > 0 || s.expenseVnd > 0)
        .sort((a, b) => b.totalCollectedVnd - a.totalCollectedVnd);

    const reconciliation = {
        ...measured.reconciliationCore,
        ticketVnd: measured.revenue.ticketRevenue,
        productVnd: measured.revenue.productRevenue,
        overtimeVnd: measured.revenue.overtimeRevenue,
        otherVnd: measured.revenue.otherRevenue,
        fishCashOutVnd: measured.drawer.fishCashOutVnd,
        approvedExpenseVnd: measured.approvedExpenseVnd,
        openingCashVnd,
        cashInVnd: measured.drawer.cashIn,
        cashOutVnd: measured.drawer.cashOut,
        expectedDrawerVnd,
        identity: REVENUE_IDENTITY,
        openSessions: measured.openSessions,
        openSessionBalanceVnd: measured.openSessionBalanceVnd,
        frozen: Boolean(useFrozen),
    };

    return {
        shift: {
            id: shift.id,
            startTime: shift.startTime.toISOString(),
            endTime: shift.endTime?.toISOString() ?? null,
            isClosed,
            openingCashVnd,
            expectedCashVnd: expectedDrawerVnd,
        },
        summary: {
            revenueVnd,
            expenseVnd,
            cashVnd: useFrozen ? rawClose.totalCashVnd : measured.drawer.netCash,
            cashInVnd: measured.drawer.cashIn,
            cashOutVnd: measured.drawer.cashOut,
            transferVnd: useFrozen ? rawClose.totalTransferVnd : measured.drawer.netTransfer,
            transferInVnd: measured.drawer.transferIn,
            transferOutVnd: measured.drawer.transferOut,
            fishBuybackVnd,
            otherExpenseVnd,
            netProfitVnd: revenueVnd - expenseVnd,
        },
        breakdown: {
            sessions: {
                ...measured.sessions,
                activeList: measured.openSessions,
                totalActivePendingVnd: measured.openSessions.reduce(
                    (sum, session) => sum + Math.max(0, session.pendingAmountVnd),
                    0,
                ),
            },
            products: measured.products,
            services: measured.services,
            payments: {
                cashInVnd: measured.drawer.cashIn,
                cashOutVnd: measured.drawer.cashOut,
                transferInVnd: measured.drawer.transferIn,
                transferOutVnd: measured.drawer.transferOut,
                totalPaidInVnd: measured.drawer.cashIn + measured.drawer.transferIn,
                totalRefundVnd: measured.drawer.refunds,
            },
            inventory: measured.inventory,
        },
        reconciliation,
        staffAttribution,
        shiftClose: rawClose
            ? {
                id: rawClose.id,
                closedBy: rawClose.closedBy,
                receivedBy: parsedClose?.receivedBy ?? null,
                closedAt: rawClose.createdAt.toISOString(),
                note: parsedClose?.cleanNote ?? rawClose.note,
                actualCashVnd: parsedClose?.actualCashVnd ?? rawClose.totalCashVnd,
                cashDifferenceVnd: parsedClose?.cashDifferenceVnd ?? 0,
                differenceReason: parsedClose?.differenceReason ?? null,
            }
            : null,
        recentShifts: rawRecentShifts.map((item) => {
            const close = item.closes[0];
            const parsed = close ? parseShiftCloseNote(close.note) : null;
            return {
                id: item.id,
                startTime: item.startTime.toISOString(),
                endTime: item.endTime?.toISOString() ?? null,
                isClosed: item.endTime !== null && item.closes.length > 0,
                revenueVnd: close?.totalRevenueVnd ?? 0,
                cashVnd: close?.totalCashVnd ?? 0,
                closedBy: close?.closedBy ?? null,
                receivedBy: parsed?.receivedBy ?? null,
                actualCashVnd: parsed?.actualCashVnd ?? null,
                cashDifferenceVnd: parsed?.cashDifferenceVnd ?? 0,
                differenceReason: parsed?.differenceReason ?? null,
            };
        }),
    };
}
