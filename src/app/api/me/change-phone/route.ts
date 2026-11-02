import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { normalizeVietnamesePhone } from "@/lib/phone";
import { readRequestMeta, writeStaffAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const schema = z.object({
    phone: z.string().trim().min(9, "Số điện thoại quá ngắn.").max(15, "Số điện thoại không hợp lệ."),
});

export async function POST(request: Request) {
    try {
        const tenant = await requireTenantContext();

        const body = await request.json().catch(() => ({}));
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Số điện thoại không hợp lệ." }, { status: 400 });
        }

        let normalizedPhone: string;
        try {
            const result = normalizeVietnamesePhone(parsed.data.phone);
            if (!result) {
                return NextResponse.json({ error: "Vui lòng nhập số điện thoại hợp lệ." }, { status: 400 });
            }
            normalizedPhone = result;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Số điện thoại không hợp lệ.";
            return NextResponse.json({ error: message }, { status: 400 });
        }

        // Check if phone number is already used by another user
        const existing = await prisma.user.findFirst({
            where: {
                phone: normalizedPhone,
                id: { not: tenant.userId },
            },
            select: { id: true },
        });

        if (existing) {
            return NextResponse.json({ error: "Số điện thoại này đã được sử dụng bởi tài khoản khác." }, { status: 409 });
        }

        const userBefore = await prisma.user.findUnique({
            where: { id: tenant.userId },
            select: { phone: true },
        });

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: tenant.userId },
                data: {
                    phone: normalizedPhone,
                },
            });

            // If OWNER, also update lake contactPhone
            if (tenant.role === Role.OWNER) {
                await tx.lake.update({
                    where: { id: tenant.lakeId },
                    data: { contactPhone: normalizedPhone },
                });
            }

            const meta = await readRequestMeta();
            await writeStaffAudit(tx, {
                lakeId: tenant.lakeId,
                entityType: "User",
                entityId: tenant.userId,
                action: "USER_PHONE_CHANGED",
                createdBy: tenant.userId,
                actorName: tenant.userName,
                actorRole: tenant.role,
                before: { phone: userBefore?.phone },
                after: { phone: normalizedPhone },
                ip: meta.ip,
                userAgent: meta.userAgent,
            });
        });

        return NextResponse.json({
            ok: true,
            message: "Đã cập nhật số điện thoại thành công.",
            phone: normalizedPhone,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không thể đổi số điện thoại." }, { status: 500 });
    }
}

