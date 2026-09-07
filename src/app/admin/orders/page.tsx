import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";
import { OrdersAdminClient, OrderItem } from "./orders-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
    await requireSuperAdmin();

    const [totalCount, pendingCount, paidCount, cancelledCount, orders] =
        await Promise.all([
            prisma.subscriptionOrder.count(),
            prisma.subscriptionOrder.count({ where: { status: "PENDING" } }),
            prisma.subscriptionOrder.count({ where: { status: "PAID" } }),
            prisma.subscriptionOrder.count({
                where: { status: { in: ["CANCELLED", "EXPIRED"] } },
            }),
            prisma.subscriptionOrder.findMany({
                include: {
                    lake: {
                        select: {
                            id: true,
                            name: true,
                            subscriptionStatus: true,
                            subscriptionExpiresAt: true,
                        },
                    },
                    organization: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    plan: {
                        select: {
                            name: true,
                            priceVnd: true,
                            durationDays: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: 15,
            }),
        ]);

    const initialOrders: OrderItem[] = orders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        organizationId: o.organizationId,
        lakeId: o.lakeId,
        planCode: o.planCode as "TRIAL" | "SILVER" | "GOLD",
        amountVnd: o.amountVnd,
        durationDays: o.durationDays,
        status: o.status as "PENDING" | "PAID" | "CANCELLED" | "EXPIRED",
        paymentMethod: o.paymentMethod,
        paidAt: o.paidAt ? o.paidAt.toISOString() : null,
        bankRef: o.bankRef,
        rawWebhookPayload: o.rawWebhookPayload,
        createdAt: o.createdAt.toISOString(),
        lake: {
            id: o.lake.id,
            name: o.lake.name,
            subscriptionStatus: o.lake.subscriptionStatus,
            subscriptionExpiresAt: o.lake.subscriptionExpiresAt
                ? o.lake.subscriptionExpiresAt.toISOString()
                : null,
        },
        organization: {
            id: o.organization.id,
            name: o.organization.name,
        },
        plan: o.plan
            ? {
                  name: o.plan.name,
                  priceVnd: o.plan.priceVnd,
                  durationDays: o.plan.durationDays,
              }
            : undefined,
    }));

    const initialStats = {
        totalCount,
        pendingCount,
        paidCount,
        cancelledCount,
    };

    const initialPagination = {
        page: 1,
        limit: 15,
        totalCount,
        totalPages: Math.ceil(totalCount / 15) || 1,
    };

    return (
        <OrdersAdminClient
            initialOrders={initialOrders}
            initialStats={initialStats}
            initialPagination={initialPagination}
        />
    );
}
