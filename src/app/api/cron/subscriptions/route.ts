import { NextResponse } from "next/server";

import { verifyWebhookSecret } from "@/lib/bank-webhook";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_GRACE_MS } from "@/lib/subscription-access";

export const dynamic = "force-dynamic";

function cronAuthorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error("Cron subscriptions rejected: CRON_SECRET is unset.");
        return false;
    }
    return verifyWebhookSecret(request, "", secret);
}

async function markExpiredSubscriptions() {
    const now = new Date();
    const graceCutoff = new Date(now.getTime() - SUBSCRIPTION_GRACE_MS);

    const grace = await prisma.lake.updateMany({
        where: {
            deletedAt: null,
            subscriptionExpiresAt: { not: null, lt: now, gte: graceCutoff },
            subscriptionStatus: { in: ["TRIAL", "ACTIVE"] },
        },
        data: { subscriptionStatus: "GRACE_PERIOD" },
    });

    const suspended = await prisma.lake.updateMany({
        where: {
            deletedAt: null,
            subscriptionExpiresAt: { not: null, lt: graceCutoff },
            subscriptionStatus: { in: ["TRIAL", "ACTIVE", "GRACE_PERIOD"] },
        },
        data: { subscriptionStatus: "SUSPENDED" },
    });

    return NextResponse.json({
        ok: true,
        graceMarked: grace.count,
        suspendedMarked: suspended.count,
        checkedAt: now.toISOString(),
    });
}

export async function GET(request: Request) {
    if (!cronAuthorized(request)) {
        return NextResponse.json({ error: "Không có quyền gọi cron." }, { status: 401 });
    }
    try {
        return await markExpiredSubscriptions();
    } catch (error) {
        console.error("Cron subscriptions failed:", error instanceof Error ? error.message : "unknown");
        return NextResponse.json({ error: "Không cập nhật được hạn dùng." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return GET(request);
}
