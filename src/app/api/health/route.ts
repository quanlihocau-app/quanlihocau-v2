import { NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/bank-webhook";
import { pool } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Authenticated readiness probe: verify the application and database together. */
export async function GET(request: Request) {
    if (!verifyWebhookSecret(request, "", process.env.CRON_SECRET)) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
    try {
        await pool.query("SELECT 1");
        return NextResponse.json({ ok: true, database: "ready" }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch {
        return NextResponse.json({ ok: false, database: "unavailable" }, {
            status: 503, headers: { "Cache-Control": "no-store" },
        });
    }
}
