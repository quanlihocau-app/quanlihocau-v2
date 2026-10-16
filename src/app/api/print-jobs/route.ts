import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { Role } from "@/generated/prisma/client";
import { createInternalErrorResponse } from "@/lib/api-error";

/**
 * GET /api/print-jobs
 * Dành cho "Trạm in bàn":
 * Lấy các lệnh in PENDING mới nhất của hồ để đẩy ra máy in qua USB/Bluetooth.
 */
export async function GET(req: NextRequest) {
    try {
        const tenant = await requireTenantContext([Role.OWNER, Role.MANAGER, Role.STAFF]);
        const url = new URL(req.url);
        const poll = url.searchParams.get("poll") === "true";

        // Tự động hết hạn các job PENDING quá 15 phút để tránh dồn ứ
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        await prisma.printJob.updateMany({
            where: {
                lakeId: tenant.lakeId,
                status: "PENDING",
                createdAt: { lt: fifteenMinutesAgo },
            },
            data: { status: "EXPIRED" },
        });

        // Lấy danh sách job PENDING cần in
        const jobs = await prisma.printJob.findMany({
            where: {
                lakeId: tenant.lakeId,
                status: "PENDING",
            },
            orderBy: { createdAt: "asc" },
            take: poll ? 5 : 20,
        });

        return NextResponse.json({
            ok: true,
            jobs,
        });
    } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err) {
            const apiErr = err as { statusCode: number; message: string };
            return NextResponse.json({ ok: false, error: apiErr.message }, { status: apiErr.statusCode });
        }
        return createInternalErrorResponse("GET /api/print-jobs", err);
    }
}

/**
 * POST /api/print-jobs
 * Tạo lệnh in mới từ điện thoại di động (hoặc bất kỳ thiết bị nào).
 */
export async function POST(req: NextRequest) {
    try {
        const tenant = await requireTenantContext([Role.OWNER, Role.MANAGER, Role.STAFF]);
        const body = await req.json();
        const { jobType, targetName, payload } = body;

        if (!jobType || !payload) {
            return NextResponse.json(
                { ok: false, error: "jobType và payload là bắt buộc." },
                { status: 400 },
            );
        }

        const newJob = await prisma.printJob.create({
            data: {
                lakeId: tenant.lakeId,
                jobType,
                targetName: targetName || null,
                payloadJson: typeof payload === "string" ? payload : JSON.stringify(payload),
                status: "PENDING",
                createdById: tenant.userId,
                createdByName: tenant.userEmail || "Nhân viên",
            },
        });

        return NextResponse.json({
            ok: true,
            job: newJob,
        }, { status: 201 });
    } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err) {
            const apiErr = err as { statusCode: number; message: string };
            return NextResponse.json({ ok: false, error: apiErr.message }, { status: apiErr.statusCode });
        }
        return createInternalErrorResponse("POST /api/print-jobs", err);
    }
}
