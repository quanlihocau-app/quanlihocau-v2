import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";
import {
    createSampleSessions,
    clearSampleSessions,
} from "@/lib/onboarding/seed-sample-lake";
import { createInternalErrorResponse } from "@/lib/api-error";

export async function POST() {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const result = await prisma.$transaction(async (tx) => {
            return await createSampleSessions(
                tx,
                tenantContext.lakeId,
            );
        });

        if (result.error && result.count === 0) {
            return NextResponse.json(
                { error: result.error, ok: false },
                { status: 400 },
            );
        }

        return NextResponse.json({
            ok: true,
            count: result.count,
            message: `Đã nạp ${result.count} vé câu mẫu thành công.`,
        });
    } catch (err) {
        if (err instanceof AuthenticationError) {
            return NextResponse.json(
                { error: "Vui lòng đăng nhập để thực hiện." },
                { status: 401 },
            );
        }
        if (err instanceof ForbiddenError) {
            return NextResponse.json(
                { error: err.message },
                { status: 403 },
            );
        }
        return createInternalErrorResponse(
            "POST /api/fishing-sessions/sample",
            err,
            "Không thể nạp vé câu mẫu.",
        );
    }
}

export async function DELETE() {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const result = await prisma.$transaction(async (tx) => {
            return await clearSampleSessions(tx, tenantContext.lakeId);
        });

        return NextResponse.json({
            ok: true,
            clearedCount: result.clearedCount,
            message: `Đã dọn dẹp ${result.clearedCount} vé câu mẫu.`,
        });
    } catch (err) {
        if (err instanceof AuthenticationError) {
            return NextResponse.json(
                { error: "Vui lòng đăng nhập để thực hiện." },
                { status: 401 },
            );
        }
        if (err instanceof ForbiddenError) {
            return NextResponse.json(
                { error: err.message },
                { status: 403 },
            );
        }
        return createInternalErrorResponse(
            "DELETE /api/fishing-sessions/sample",
            err,
            "Không thể dọn dẹp vé câu mẫu.",
        );
    }
}
