import { Role } from "@/generated/prisma/client";
import { recordLoginAudit } from "@/lib/audit-log";
import { seedSampleLakeData } from "@/lib/onboarding/seed-sample-lake";
import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/vietqr";

const membershipSelect = {
    where: { deletedAt: null },
    select: { lakeId: true, role: true },
    orderBy: { createdAt: "asc" as const },
    take: 3,
};

export interface AppleSessionUser {
    id: string;
    email: string;
    name: string;
    systemRole: "USER" | "SUPER_ADMIN";
    phoneVerified: boolean;
    phone: string | null;
    sessionVersion: number;
}

export async function resolveAppleAccount(input: {
    sub: string;
    email?: string | null;
    name?: string | null;
    emailVerified: boolean;
}): Promise<{ ok: true; user: AppleSessionUser } | { ok: false; error: "locked" | "staff" | "email" | "unverified" | "failed" }> {
    const sub = input.sub.trim();
    const email = input.email?.trim().toLowerCase() || "";
    if (!sub) return { ok: false, error: "failed" };

    const existingBySub = await prisma.user.findUnique({
        where: { appleSub: sub },
        include: { memberships: membershipSelect },
    });
    const existing = existingBySub || (email
        ? await prisma.user.findUnique({
            where: { email },
            include: { memberships: membershipSelect },
        })
        : null);

    if (existing) {
        if (existing.isLocked) return { ok: false, error: "locked" };
        if (existing.appleSub && existing.appleSub !== sub) return { ok: false, error: "failed" };
        const isSuperAdmin = existing.systemRole === "SUPER_ADMIN";
        const ownsLake = existing.memberships.some((membership) => membership.role === Role.OWNER);
        if (!isSuperAdmin && !ownsLake && existing.memberships.length > 0) {
            await recordLoginAudit({
                success: false,
                userId: existing.id,
                name: existing.name,
                account: existing.email,
                reason: "staff_apple_blocked",
                memberships: existing.memberships,
            });
            return { ok: false, error: "staff" };
        }
        if (!existing.appleSub) {
            await prisma.user.update({ where: { id: existing.id }, data: { appleSub: sub } });
        }
        await recordLoginAudit({
            success: true,
            userId: existing.id,
            name: existing.name,
            account: existing.email,
            reason: "apple",
            memberships: existing.memberships,
        });
        return {
            ok: true,
            user: {
                id: existing.id,
                email: existing.email,
                name: existing.name,
                systemRole: existing.systemRole,
                phoneVerified: existing.phoneVerified,
                phone: existing.phone,
                sessionVersion: existing.sessionVersion,
            },
        };
    }

    if (!email) return { ok: false, error: "email" };
    if (!input.emailVerified) return { ok: false, error: "unverified" };

    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const ownerName = (input.name?.trim() || email.split("@")[0] || "Chủ hồ").slice(0, 100);
    const lakeName = `Hồ câu của ${ownerName}`;

    try {
        const created = await prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({
                data: {
                    name: `Doanh nghiệp ${lakeName}`,
                    subscriptionPlan: "TRIAL",
                    validUntil: trialExpiresAt,
                },
            });
            const lake = await tx.lake.create({
                data: {
                    organizationId: organization.id,
                    name: lakeName,
                    subscriptionStatus: "TRIAL",
                    subscriptionPlan: "TRIAL",
                    subscriptionExpiresAt: trialExpiresAt,
                },
            });
            const owner = await tx.user.create({
                data: {
                    email,
                    name: ownerName,
                    systemRole: "USER",
                    phoneVerified: false,
                    appleSub: sub,
                },
            });
            await tx.membership.create({
                data: { userId: owner.id, lakeId: lake.id, role: "OWNER" },
            });
            await seedSampleLakeData(tx, lake.id, ownerName, owner.id);
            return owner;
        }, { maxWait: 15000, timeout: 25000 });

        await recordLoginAudit({
            success: true,
            userId: created.id,
            name: created.name,
            account: created.email,
            reason: "apple",
            memberships: [],
        });
        return {
            ok: true,
            user: {
                id: created.id,
                email: created.email,
                name: created.name,
                systemRole: created.systemRole,
                phoneVerified: created.phoneVerified,
                phone: created.phone,
                sessionVersion: created.sessionVersion,
            },
        };
    } catch (error) {
        console.error("[auth] Apple account was not created:", error instanceof Error ? error.name : "unknown");
        return { ok: false, error: "failed" };
    }
}
