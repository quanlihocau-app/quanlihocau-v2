import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resetInMemoryRateLimit } from "@/proxy";
import { isTestRateLimitControlEnabled } from "@/lib/test-rate-limit";

export const dynamic = "force-dynamic";

export async function POST() {
    if (!isTestRateLimitControlEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    resetInMemoryRateLimit();
    await prisma.$executeRaw`DELETE FROM "RateLimitBucket"`;
    return NextResponse.json({ ok: true });
}
