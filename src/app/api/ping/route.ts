import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint kiểm tra kết nối mạng và đồng bộ thời gian máy chủ.
 * Trả về status 200 OK kèm ISO timestamp hiện tại của server.
 */
export async function GET() {
    return NextResponse.json({
        ok: true,
        serverNow: new Date().toISOString(),
        timestamp: Date.now(),
    });
}
