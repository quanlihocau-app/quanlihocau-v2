"use server";

import { Role } from "@/generated/prisma/client";
import { writeStaffAudit } from "@/lib/audit-log";
import { generateAuditReadToken, hashAuditReadToken } from "@/lib/audit-log-core";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireTenantContext } from "@/lib/tenant";

export async function rotateAuditReadToken(): Promise<
    { ok: true; token: string } | { ok: false; error: string }
> {
    try {
        const tenant = await requireTenantContext([Role.OWNER]);
        if (tenant.isSupportMode) {
            return { ok: false, error: "Chế độ hỗ trợ không được tạo token đọc nhật ký." };
        }

        const membership = await prisma.membership.findFirst({
            where: {
                userId: tenant.userId,
                lakeId: tenant.lakeId,
                role: Role.OWNER,
                deletedAt: null,
            },
            select: { id: true },
        });
        if (!membership) {
            return { ok: false, error: "Chỉ chủ hồ của hồ này mới tạo được token." };
        }

        const token = generateAuditReadToken();
        await prisma.lake.update({
            where: { id: tenant.lakeId },
            data: { auditReadTokenHash: hashAuditReadToken(token) },
        });
        await writeStaffAudit(prisma, {
            lakeId: tenant.lakeId,
            action: "AUDIT_READ_TOKEN_ROTATED",
            entityType: "Lake",
            entityId: tenant.lakeId,
            createdBy: tenant.userId,
            actorName: tenant.userName,
            actorRole: tenant.role,
            before: null,
            after: { rotated: true },
        }, { bestEffort: true });
        return { ok: true, token };
    } catch (error) {
        if (error instanceof ForbiddenError) {
            return { ok: false, error: error.message };
        }
        console.error("[audit] token", error instanceof Error ? error.message : "failed");
        return { ok: false, error: "Không tạo được token. Nhật ký không bị đổi." };
    }
}
