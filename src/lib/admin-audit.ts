import { prisma } from "@/lib/prisma";

export type AdminAuditAction =
    | "USER_LOCKED"
    | "USER_UNLOCKED"
    | "TRIAL_EXTENDED"
    | "SUBSCRIPTION_EXTENDED"
    | "PLAN_CHANGED"
    | "SESSIONS_REVOKED";

export interface CreateAdminAuditInput {
    action: AdminAuditAction;
    actorEmail: string;
    targetUserId: string;
    lakeId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    requestId: string;
}

/**
 * Ghi lại AuditEvent dành cho các thao tác quản trị SUPER_ADMIN.
 * Tuyệt đối không chứa password, hash, token hay secret trong metadata.
 */
export async function createAdminAuditEvent(input: CreateAdminAuditInput) {
    try {
        const safeMetadata: Record<string, unknown> = { ...(input.metadata || {}) };
        // Đảm bảo không có trường nhạy cảm lọt vào payload
        delete safeMetadata.password;
        delete safeMetadata.passwordHash;
        delete safeMetadata.code;
        delete safeMetadata.token;

        const payloadObj = {
            actor: input.actorEmail,
            targetUserId: input.targetUserId,
            reason: input.reason || null,
            requestId: input.requestId,
            metadata: safeMetadata,
            timestamp: new Date().toISOString(),
        };

        return await prisma.auditEvent.create({
            data: {
                lakeId: input.lakeId || null,
                entityType: "User",
                entityId: input.targetUserId,
                action: input.action,
                payload: JSON.stringify(payloadObj),
                createdBy: input.actorEmail,
            },
        });
    } catch (err) {
        console.error("[createAdminAuditEvent error]:", err);
        return null;
    }
}
