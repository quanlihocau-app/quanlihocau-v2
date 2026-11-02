import { NextResponse } from "next/server";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { readRequestMeta, writeStaffAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const tenant = await requireTenantContext();

        const updated = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: tenant.userId },
                data: {
                    sessionVersion: { increment: 1 },
                },
                select: {
                    id: true,
                    sessionVersion: true,
                },
            });

            const meta = await readRequestMeta();
            await writeStaffAudit(tx, {
                lakeId: tenant.lakeId,
                entityType: "User",
                entityId: tenant.userId,
                action: "USER_ALL_SESSIONS_REVOKED",
                createdBy: tenant.userId,
                actorName: tenant.userName,
                actorRole: tenant.role,
                before: { sessionRevoked: false },
                after: { sessionVersion: user.sessionVersion },
                ip: meta.ip,
                userAgent: meta.userAgent,
            });

            return user;
        });

        return NextResponse.json({
            ok: true,
            message: "Đã đăng xuất khỏi tất cả thiết bị thành công.",
            sessionVersion: updated.sessionVersion,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không thể thu hồi phiên đăng nhập." }, { status: 500 });
    }
}

