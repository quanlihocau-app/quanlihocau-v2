import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { readRequestMeta, writeStaffAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const schema = z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự.").max(100),
});

export async function POST(request: Request) {
    try {
        const tenant = await requireTenantContext();

        const body = await request.json().catch(() => ({}));
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
        }

        const { currentPassword, newPassword } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { id: tenant.userId },
            select: { id: true, passwordHash: true, email: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
        }

        // If user already has a password, verify current password
        if (user.passwordHash) {
            if (!currentPassword) {
                return NextResponse.json({ error: "Vui lòng nhập mật khẩu hiện tại." }, { status: 400 });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                return NextResponse.json({ error: "Mật khẩu hiện tại không chính xác." }, { status: 400 });
            }
        }

        const newHash = await bcrypt.hash(newPassword, 12);

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: user.id },
                data: {
                    passwordHash: newHash,
                    sessionVersion: { increment: 1 }, // Invalidate sessions on other devices for security
                },
            });

            const meta = await readRequestMeta();
            await writeStaffAudit(tx, {
                lakeId: tenant.lakeId,
                entityType: "User",
                entityId: user.id,
                action: "USER_PASSWORD_CHANGED",
                createdBy: tenant.userId,
                actorName: tenant.userName,
                actorRole: tenant.role,
                before: { passwordChanged: false },
                after: { passwordChanged: true },
                ip: meta.ip,
                userAgent: meta.userAgent,
            });
        });

        return NextResponse.json({
            ok: true,
            message: "Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất an toàn.",
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không thể đổi mật khẩu." }, { status: 500 });
    }
}

