import { NextResponse } from "next/server";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInternalErrorResponse } from "@/lib/api-error";

export async function GET() {
    try {
        await requireSuperAdmin();

        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { priceVnd: "asc" },
            select: {
                id: true,
                code: true,
                name: true,
                priceVnd: true,
                durationDays: true,
                description: true,
                maxSpots: true,
                maxStaff: true,
            },
        });

        return NextResponse.json({
            ok: true,
            plans,
        });
    } catch (err) {
        if (err instanceof AuthenticationError) {
            return NextResponse.json(
                { ok: false, error: { code: "UNAUTHORIZED", message: err.message }, requestId: crypto.randomUUID() },
                { status: 401 },
            );
        }
        if (err instanceof ForbiddenError) {
            return NextResponse.json(
                { ok: false, error: { code: "FORBIDDEN", message: err.message }, requestId: crypto.randomUUID() },
                { status: 403 },
            );
        }
        return createInternalErrorResponse("admin-plans-get", err, "Không thể tải danh sách gói dịch vụ.");
    }
}
