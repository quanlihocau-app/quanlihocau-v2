import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface TenantContext {
    userId: string;
    userName: string;
    userEmail: string;
    lakeId: string;
    lakeName: string;
    organizationId: string;
    organizationName: string;
    role: Role;
    isSupportMode?: boolean;
}

export class AuthenticationError extends Error {
    constructor(message = "Chưa đăng nhập.") {
        super(message);
        this.name = "AuthenticationError";
    }
}

export class ForbiddenError extends Error {
    constructor(message = "Không có quyền truy cập.") {
        super(message);
        this.name = "ForbiddenError";
    }
}

export async function requireSuperAdmin(): Promise<{ id: string; email: string; name: string }> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        throw new AuthenticationError("Chưa đăng nhập.");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, email: true, name: true, systemRole: true },
    });

    if (user?.systemRole !== "SUPER_ADMIN") {
        throw new ForbiddenError("Yêu cầu quyền Quản trị viên hệ thống (SUPER_ADMIN).");
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
    };
}

export async function getTenantContext(): Promise<TenantContext | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return null;
    }

    // Support Mode (Impersonate) for SUPER_ADMIN
    try {
        const cookieStore = await cookies();
        const supportLakeId = cookieStore.get("support_lake_id")?.value;

        if (supportLakeId) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email.toLowerCase() },
                select: { id: true, name: true, email: true, systemRole: true },
            });

            if (user?.systemRole === "SUPER_ADMIN") {
                const supportLake = await prisma.lake.findUnique({
                    where: { id: supportLakeId, deletedAt: null },
                    include: {
                        organization: true,
                    },
                });

                if (supportLake) {
                    return {
                        userId: user.id,
                        userName: user.name,
                        userEmail: user.email,
                        lakeId: supportLake.id,
                        lakeName: supportLake.name,
                        organizationId: supportLake.organization.id,
                        organizationName: supportLake.organization.name,
                        role: Role.OWNER,
                        isSupportMode: true,
                    };
                }
            }
        }
    } catch {
        // cookies() may fail if called outside request context
    }

    const membership = await prisma.membership.findFirst({
        where: {
            user: {
                email: session.user.email,
            },
            deletedAt: null,
        },
        include: {
            user: true,
            lake: {
                include: {
                    organization: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    if (!membership) {
        return null;
    }

    return {
        userId: membership.user.id,
        userName: membership.user.name,
        userEmail: membership.user.email,
        lakeId: membership.lake.id,
        lakeName: membership.lake.name,
        organizationId: membership.lake.organization.id,
        organizationName: membership.lake.organization.name,
        role: membership.role,
    };
}

export async function requireTenantContext(
    allowedRoles?: Role[],
): Promise<TenantContext> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        throw new AuthenticationError("Chưa đăng nhập.");
    }

    const membership = await prisma.membership.findFirst({
        where: {
            user: {
                email: session.user.email,
            },
            deletedAt: null,
        },
        include: {
            user: true,
            lake: {
                include: {
                    organization: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    if (!membership) {
        throw new ForbiddenError(
            "Không tìm thấy thông tin hồ câu hoặc quyền truy cập đã bị vô hiệu hóa.",
        );
    }

    if (
        allowedRoles &&
        allowedRoles.length > 0 &&
        !allowedRoles.includes(membership.role)
    ) {
        throw new ForbiddenError("Bạn không có quyền thực hiện thao tác này.");
    }

    return {
        userId: membership.user.id,
        userName: membership.user.name,
        userEmail: membership.user.email,
        lakeId: membership.lake.id,
        lakeName: membership.lake.name,
        organizationId: membership.lake.organization.id,
        organizationName: membership.lake.organization.name,
        role: membership.role,
    };
}
