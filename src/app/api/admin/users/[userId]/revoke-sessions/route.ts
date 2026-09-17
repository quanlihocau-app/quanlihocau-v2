import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInternalErrorResponse } from "@/lib/api-error";
import { createAdminAuditEvent } from "@/lib/admin-audit";

const revokeSchema = z.object({
    reason: z.string().trim().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    const requestId = crypto.randomUUID();
    try {
        const admin = await requireSuperAdmin();
        const { userId } = await params;

        const body = await request.json().catch(() => ({}));
        const parsed = revokeSchema.safeParse(body);

        const reason = parsed.success ? parsed.data.reason : undefined;

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, sessionVersion: true },
        });

        if (!targetUser) {
            return NextResponse.json(
                { ok: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." }, requestId },
                { status: 404 },
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                sessionVersion: { increment: 1 },
            },
            select: {
                id: true,
                sessionVersion: true,
            },
        });

        await createAdminAuditEvent({
            action: "SESSIONS_REVOKED",
            actorEmail: admin.email,
            targetUserId: targetUser.id,
            reason: reason || "Đăng xuất khỏi tất cả thiết bị bởi SUPER_ADMIN",
            metadata: {
                previousSessionVersion: targetUser.sessionVersion,
                newSessionVersion: updatedUser.sessionVersion,
            },
            requestId,
        });

        return NextResponse.json({
            ok: true,
            message: "Đã thu hồi tất cả phiên đăng nhập trên mọi thiết bị thành công.",
            sessionVersion: updatedUser.sessionVersion,
            requestId,
        });
    } catch (err) {
        if (err instanceof AuthenticationError) {
            return NextResponse.json(
                { ok: false, error: { code: "UNAUTHORIZED", message: err.message }, requestId },
                { status: 401 },
            );
        }
        if (err instanceof ForbiddenError) {
            return NextResponse.json(
                { ok: false, error: { code: "FORBIDDEN", message: err.message }, requestId },
                { status: 403 },
            );
        }
        return createInternalErrorResponse("admin-revoke-sessions", err, "Không thể thu hồi phiên đăng nhập.");
    }
}
