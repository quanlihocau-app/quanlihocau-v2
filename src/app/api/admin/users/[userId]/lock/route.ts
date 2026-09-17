import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createInternalErrorResponse } from "@/lib/api-error";
import { createAdminAuditEvent } from "@/lib/admin-audit";

const lockSchema = z.object({
    isLocked: z.boolean(),
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
        const parsed = lockSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: { code: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ." }, requestId },
                { status: 400 },
            );
        }

        const { isLocked, reason } = parsed.data;

        if (isLocked && (!reason || reason.length < 3)) {
            return NextResponse.json(
                { ok: false, error: { code: "REASON_REQUIRED", message: "Vui lòng nhập lý do khóa tài khoản (tối thiểu 3 ký tự)." }, requestId },
                { status: 400 },
            );
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, systemRole: true, isLocked: true },
        });

        if (!targetUser) {
            return NextResponse.json(
                { ok: false, error: { code: "USER_NOT_FOUND", message: "Người dùng không tồn tại." }, requestId },
                { status: 404 },
            );
        }

        // Prevent locking oneself if admin
        if (targetUser.id === admin.id) {
            return NextResponse.json(
                { ok: false, error: { code: "CANNOT_LOCK_SELF", message: "Bạn không thể tự khóa tài khoản của chính mình." }, requestId },
                { status: 400 },
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                isLocked,
                lockedAt: isLocked ? new Date() : null,
                lockedReason: isLocked ? reason : null,
                // If locking, also bump sessionVersion to revoke active sessions
                ...(isLocked ? { sessionVersion: { increment: 1 } } : {}),
            },
            select: {
                id: true,
                email: true,
                name: true,
                isLocked: true,
                lockedAt: true,
                lockedReason: true,
                sessionVersion: true,
            },
        });

        // Record AuditEvent
        await createAdminAuditEvent({
            action: isLocked ? "USER_LOCKED" : "USER_UNLOCKED",
            actorEmail: admin.email,
            targetUserId: targetUser.id,
            reason: reason || (isLocked ? "Khóa bởi SUPER_ADMIN" : "Mở khóa bởi SUPER_ADMIN"),
            metadata: {
                previousLocked: targetUser.isLocked,
                newLocked: isLocked,
            },
            requestId,
        });

        return NextResponse.json({
            ok: true,
            user: updatedUser,
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
        return createInternalErrorResponse("admin-user-lock", err, "Không thể cập nhật trạng thái khóa tài khoản.");
    }
}
