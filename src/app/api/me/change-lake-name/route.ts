import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { readRequestMeta, writeStaffAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const schema = z.object({
    name: z.string().trim().min(2, "Tên hồ phải có ít nhất 2 ký tự.").max(100, "Tên hồ không được quá 100 ký tự."),
});

export async function POST(request: Request) {
    try {
        const tenant = await requireTenantContext([Role.OWNER]);

        const body = await request.json().catch(() => ({}));
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Tên hồ không hợp lệ." }, { status: 400 });
        }

        const newName = parsed.data.name;

        const before = await prisma.lake.findUnique({
            where: { id: tenant.lakeId },
            select: { name: true },
        });

        const updated = await prisma.$transaction(async (tx) => {
            const lake = await tx.lake.update({
                where: { id: tenant.lakeId },
                data: { name: newName },
                select: { id: true, name: true },
            });

            const meta = await readRequestMeta();
            await writeStaffAudit(tx, {
                lakeId: tenant.lakeId,
                entityType: "Lake",
                entityId: tenant.lakeId,
                action: "LAKE_NAME_UPDATED",
                createdBy: tenant.userId,
                actorName: tenant.userName,
                actorRole: tenant.role,
                before: { name: before?.name },
                after: { name: lake.name },
                ip: meta.ip,
                userAgent: meta.userAgent,
            });

            return lake;
        });

        return NextResponse.json({
            ok: true,
            message: "Đã đổi tên hồ thành công.",
            lake: updated,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không thể đổi tên hồ." }, { status: 500 });
    }
}

