import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { normalizeVietnamesePhone } from "@/lib/phone";

const loginMembershipInclude = {
    memberships: {
        where: { deletedAt: null },
        select: { lakeId: true, role: true },
        orderBy: { createdAt: "asc" as const },
        take: 3,
    },
};

/**
 * Resolve the account for a phone, email, or staff username.
 * An exact email, phone, or `name@hocau.vn` / `name@hocau.com` match wins.
 * A short username is only matched against other addresses when the password
 * fits, so a different person's `nv@gmail.com` cannot block `nv@company.com`.
 */
export async function findLoginUser(rawIdentifier: string, password?: string) {
    const identifier = rawIdentifier.trim().toLowerCase();
    if (!identifier) return null;

    const exact = await prisma.user.findFirst({
        where: { email: { equals: identifier, mode: "insensitive" } },
        include: loginMembershipInclude,
    });
    if (exact) return exact;

    if (identifier.includes("@")) return null;

    let phone: string | null = null;
    try {
        phone = normalizeVietnamesePhone(identifier);
    } catch {
        phone = null;
    }
    if (phone) {
        const byPhone = await prisma.user.findUnique({
            where: { phone },
            include: loginMembershipInclude,
        });
        if (byPhone) return byPhone;
    }

    const syntheticVn = await prisma.user.findFirst({
        where: { email: { equals: `${identifier}@hocau.vn`, mode: "insensitive" } },
        include: loginMembershipInclude,
    });
    if (syntheticVn) return syntheticVn;

    const syntheticCom = await prisma.user.findFirst({
        where: { email: { equals: `${identifier}@hocau.com`, mode: "insensitive" } },
        include: loginMembershipInclude,
    });
    if (syntheticCom) return syntheticCom;

    const candidates = await prisma.user.findMany({
        where: {
            email: { startsWith: `${identifier}@`, mode: "insensitive" },
        },
        include: loginMembershipInclude,
        take: 8,
    });
    const ordered = [...candidates].sort((a, b) => a.email.length - b.email.length || a.email.localeCompare(b.email));
    if (!password) return ordered[0] ?? null;

    for (const candidate of ordered) {
        if (!candidate.passwordHash) continue;
        if (await bcrypt.compare(password, candidate.passwordHash)) return candidate;
    }
    return null;
}
