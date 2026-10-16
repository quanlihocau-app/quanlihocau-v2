import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { Role } from "@/generated/prisma/client";
import { createInternalErrorResponse } from "@/lib/api-error";

/**
 * PATCH /api/print-jobs/[jobId]
 * Cập nhật trạng thái lệnh in: PRINTED (thành công) hoặc FAILED (thất bại).
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ jobId: string }> }
) {
    try {
        const tenant = await requireTenantContext([Role.OWNER, Role.MANAGER, Role.STAFF]);
        const { jobId } = await context.params;
        const body = await req.json();
        const { status, printedBy, error } = body;

        if (!status || !["PRINTED", "FAILED", "PENDING"].includes(status)) {
            return NextResponse.json(
                { ok: false, error: "Trạng thái không hợp lệ." },
                { status: 400 },
            );
        }

        const existingJob = await prisma.printJob.findFirst({
            where: {
                id: jobId,
                lakeId: tenant.lakeId,
            },
        });

        if (!existingJob) {
            return NextResponse.json(
                { ok: false, error: "Không tìm thấy lệnh in." },
                { status: 404 },
            );
        }

        const updated = await prisma.printJob.update({
            where: { id: jobId },
            data: {
                status,
                printedAt: status === "PRINTED" ? new Date() : undefined,
                printedBy: printedBy || undefined,
                error: error || undefined,
            },
        });

        return NextResponse.json({
            ok: true,
            job: updated,
        });
    } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err) {
            const apiErr = err as { statusCode: number; message: string };
            return NextResponse.json({ ok: false, error: apiErr.message }, { status: apiErr.statusCode });
        }
        return createInternalErrorResponse("PATCH /api/print-jobs/[jobId]", err);
    }
}
