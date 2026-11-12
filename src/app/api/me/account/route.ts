import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { readRequestMeta, writeStaffAudit } from "@/lib/audit-log";
import { anonymizedUserFields, deletionDecision } from "@/lib/account-deletion";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const tenant = await requireTenantContext();

        const [user, lake] = await Promise.all([
            prisma.user.findUnique({
                where: { id: tenant.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    phoneVerified: true,
                    sessionVersion: true,
                    lastLoginAt: true,
                    passwordHash: true,
                },
            }),
            prisma.lake.findUnique({
                where: { id: tenant.lakeId },
                select: {
                    id: true,
                    name: true,
                    contactPhone: true,
                },
            }),
        ]);

        if (!user || !lake) {
            return NextResponse.json({ error: "Không tìm thấy thông tin tài khoản hoặc hồ câu." }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                phoneVerified: user.phoneVerified,
                role: tenant.role,
                sessionVersion: user.sessionVersion,
                lastLoginAt: user.lastLoginAt,
                hasPassword: Boolean(user.passwordHash),
            },
            lake: {
                id: lake.id,
                name: lake.name,
                contactPhone: lake.contactPhone,
            },
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không tải được thông tin tài khoản." }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const tenant = await requireTenantContext();
        const body = await request.json().catch(() => ({})) as { phrase?: unknown; password?: unknown };
        const phrase = typeof body.phrase === "string" ? body.phrase.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const user = await prisma.user.findUnique({
            where: { id: tenant.userId },
            select: { id: true, passwordHash: true, email: true, isLocked: true },
        });
        if (!user || user.isLocked) {
            return NextResponse.json({ error: "Không tìm thấy tài khoản đang dùng." }, { status: 404 });
        }
        const passwordOk = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : true;
        const decision = deletionDecision({
            phrase,
            hasPassword: Boolean(user.passwordHash),
            passwordOk,
        });
        if (!decision.ok) {
            return NextResponse.json({ error: decision.error }, { status: 400 });
        }

        const now = new Date();
        await prisma.$transaction(async (tx) => {
            const meta = await readRequestMeta();
            await writeStaffAudit(tx, {
                lakeId: tenant.lakeId,
                entityType: "User",
                entityId: user.id,
                action: "USER_ACCOUNT_DELETED",
                createdBy: tenant.userId,
                actorName: tenant.userName,
                actorRole: tenant.role,
                before: { accountDeleted: false },
                after: { accountDeleted: true },
                ip: meta.ip,
                userAgent: meta.userAgent,
            });
            await tx.membership.updateMany({
                where: { userId: user.id, deletedAt: null },
                data: { deletedAt: now },
            });
            await tx.user.update({
                where: { id: user.id },
                data: {
                    ...anonymizedUserFields(user.id, now),
                    sessionVersion: { increment: 1 },
                },
            });
        });

        return NextResponse.json({
            ok: true,
            message: "Đã xóa tài khoản. Vé và hóa đơn của hồ vẫn được giữ.",
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        console.error("[account] delete failed:", error instanceof Error ? error.name : "unknown");
        return NextResponse.json({ error: "Chưa xóa được tài khoản. Thử lại." }, { status: 500 });
    }
}

