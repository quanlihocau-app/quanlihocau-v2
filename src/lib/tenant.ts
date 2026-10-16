import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { Role } from "@/generated/prisma/client";
import { authOptions, getSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface TenantContext {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string | null;
    phoneVerified: boolean;
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
        select: { id: true, email: true, name: true, systemRole: true, isLocked: true },
    });

    if (!user || user.isLocked) {
        throw new ForbiddenError("Tài khoản đã bị tạm khóa hoặc không tồn tại.");
    }

    // The app issues both a qa_session and a NextAuth session. If both are
    // present, bind this privileged request to the same account so an older
    // administrator cookie cannot outlive an account switch.
    const cookieStore = await cookies();
    if (cookieStore.has("qa_session")) {
        const appSession = await getSessionCookie();
        if (!appSession || appSession.email.toLowerCase() !== user.email.toLowerCase()) {
            throw new ForbiddenError("Phiên đăng nhập không khớp với tài khoản hiện tại.");
        }
    }

    if (user.systemRole !== "SUPER_ADMIN") {
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
    // qa_session is issued by the app's login action. When both auth systems
    // have cookies, use that signed app identity so a stale NextAuth cookie
    // cannot silently select another account's lake and hide the user's data.
    const cookieStore = await cookies();
    const hasAppSession = cookieStore.has("qa_session");
    const sessionCookie = hasAppSession || !session?.user?.email
        ? await getSessionCookie()
        : null;
    // Older app cookies can become stale after a deployment or database
    // reconnect. Preserve a valid regular NextAuth session so users retain
    // access to their existing lake membership and records.
    if (
        hasAppSession &&
        !sessionCookie &&
        (!session?.user?.email || session.user.systemRole === "SUPER_ADMIN")
    ) {
        return null;
    }
    const userEmail = hasAppSession && sessionCookie
        ? sessionCookie.email
        : session?.user?.email || sessionCookie?.email;

    if (!userEmail) {
        return null;
    }

    // Support Mode (Impersonate) for SUPER_ADMIN
    try {
        const cookieStore = await cookies();
        const supportLakeId = cookieStore.get("support_lake_id")?.value;

        if (supportLakeId) {
            const user = await prisma.user.findUnique({
                where: { email: userEmail.toLowerCase() },
                select: { id: true, name: true, email: true, phone: true, phoneVerified: true, systemRole: true },
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
                        userPhone: user.phone,
                        phoneVerified: true,
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
                email: userEmail.toLowerCase(),
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

    if (membership?.user?.isLocked) {
        return null;
    }

    if (!membership) {
        const user = await prisma.user.findUnique({
            where: { email: userEmail.toLowerCase() },
            select: { id: true, name: true, email: true, phone: true, phoneVerified: true, systemRole: true, isLocked: true },
        });

        if (!user || user.isLocked) {
            return null;
        }

        if (user.systemRole === "SUPER_ADMIN") {
            const fallbackLake = await prisma.lake.findFirst({
                where: { deletedAt: null },
                include: { organization: true },
                orderBy: { createdAt: "asc" },
            });

            if (fallbackLake) {
                return {
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    userPhone: user.phone,
                    phoneVerified: true,
                    lakeId: fallbackLake.id,
                    lakeName: fallbackLake.name,
                    organizationId: fallbackLake.organization.id,
                    organizationName: fallbackLake.organization.name,
                    role: Role.OWNER,
                    isSupportMode: false,
                };
            }
        }

        return null;
    }

    const isPhoneVerified = Boolean(membership.user.phoneVerified);

    return {
        userId: membership.user.id,
        userName: membership.user.name,
        userEmail: membership.user.email,
        userPhone: membership.user.phone,
        phoneVerified: isPhoneVerified,
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
    const cookieStore = await cookies();
    const hasAppSession = cookieStore.has("qa_session");
    const sessionCookie = hasAppSession || !session?.user?.email
        ? await getSessionCookie()
        : null;
    const userEmail = hasAppSession && sessionCookie
        ? sessionCookie.email
        : session?.user?.email || sessionCookie?.email;

    if (!userEmail) {
        throw new AuthenticationError("Chưa đăng nhập.");
    }
    if (
        hasAppSession &&
        !sessionCookie &&
        session?.user?.systemRole === "SUPER_ADMIN"
    ) {
        throw new AuthenticationError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
    }

    const context = await getTenantContext();
    if (!context) {
        throw new ForbiddenError(
            "Không tìm thấy thông tin hồ câu hoặc quyền truy cập đã bị vô hiệu hóa.",
        );
    }

    const isSuperAdmin = (hasAppSession && !sessionCookie
        ? false
        : sessionCookie?.role || session?.user?.systemRole) === "SUPER_ADMIN";

    if (
        !isSuperAdmin &&
        allowedRoles &&
        allowedRoles.length > 0 &&
        !allowedRoles.includes(context.role)
    ) {
        throw new ForbiddenError("Bạn không có quyền thực hiện thao tác này.");
    }

    return context;
}
