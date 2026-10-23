import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import {
    loginAuditTargets,
    writeStaffAudit,
} from "@/lib/audit-log-core";

export type LoginMembership = {
    lakeId: string;
    role: string;
};

export { writeStaffAudit };

export async function readRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
    try {
        const headerStore = await headers();
        const forwarded = headerStore.get("x-forwarded-for");
        const ip = (forwarded?.split(",")[0] || headerStore.get("x-real-ip") || "").trim();
        return {
            ip: ip ? ip.slice(0, 64) : null,
            userAgent: headerStore.get("user-agent")?.slice(0, 160) ?? null,
        };
    } catch {
        return { ip: null, userAgent: null };
    }
}

/**
 * Login rows are best-effort and never throw.
 * Unknown accounts are not written: they belong to no pond, and a scanner
 * rotating emails would burn the database quota. Failures against a real
 * membership are written, one row per pond (at most 3).
 */
export async function recordLoginAudit(input: {
    success: boolean;
    userId: string | null;
    name?: string | null;
    account: string;
    reason: string;
    memberships?: LoginMembership[] | null;
}): Promise<void> {
    try {
        const targets = loginAuditTargets(input.success, input.memberships);
        if (!targets) return;

        const meta = await readRequestMeta();
        const account = input.account.trim().toLowerCase().slice(0, 120);

        for (const target of targets) {
            await writeStaffAudit(prisma, {
                lakeId: target.lakeId,
                action: input.success ? "LOGIN_SUCCEEDED" : "LOGIN_FAILED",
                entityType: "User",
                entityId: input.userId || "anonymous",
                createdBy: input.userId || "anonymous",
                actorName: input.name ?? null,
                actorRole: target.role,
                before: null,
                after: {
                    result: input.success ? "success" : "failure",
                    reason: input.success ? null : input.reason,
                    account,
                },
                ip: meta.ip,
                userAgent: meta.userAgent,
            }, { bestEffort: true });
        }
    } catch (error) {
        console.error("[audit] login", error instanceof Error ? error.message : "failed");
    }
}
