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

export async function getTenantContext(): Promise<TenantContext | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return null;
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
