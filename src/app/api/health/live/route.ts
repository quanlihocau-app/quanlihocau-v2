import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness công khai: không đụng cơ sở dữ liệu, không nhận secret. */
export function GET() {
    return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
    );
}
