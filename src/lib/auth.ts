import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

import { SystemRole, Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { seedSampleLakeData } from "@/lib/onboarding/seed-sample-lake";

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            systemRole?: SystemRole;
            phoneVerified?: boolean;
            phone?: string | null;
            sessionVersion?: number;
        };
    }
    interface User {
        id: string;
        name: string;
        email: string;
        systemRole?: SystemRole;
        phoneVerified?: boolean;
        phone?: string | null;
        sessionVersion?: number;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        systemRole?: SystemRole;
        phoneVerified?: boolean;
        phone?: string | null;
        sessionVersion?: number;
    }
}

const loginSchema = z.object({
    email: z.string().trim().email({ message: 'Email không hợp lệ' }),
    password: z.string().min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' }),
});

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider !== "google") return true;

            const email = user.email?.trim().toLowerCase();
            const googleProfile = profile as { email_verified?: unknown } | null;
            const isEmailVerified = googleProfile?.email_verified === true || googleProfile?.email_verified === "true";

            console.log("[auth:signIn] Google sign-in attempt:", {
                email,
                profileEmailVerified: googleProfile?.email_verified,
                isEmailVerified,
            });

            if (!email || !isEmailVerified) {
                console.warn("[auth:signIn] Denied: Email is missing or not verified:", email);
                return false;
            }

            let dbUser = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    isLocked: true,
                    systemRole: true,
                    memberships: {
                        where: { deletedAt: null },
                        select: { role: true },
                    },
                },
            });

            console.log("[auth:signIn] Found existing dbUser:", dbUser);

            // Quy tắc: Nhân viên do chủ hồ tạo chỉ đăng nhập bằng tài khoản/mật khẩu, KHÔNG đăng nhập bằng Google
            if (dbUser) {
                if (dbUser.isLocked) {
                    console.warn("[auth:signIn] Denied: User is locked:", email);
                    return false;
                }

                const isSuperAdmin = dbUser.systemRole === "SUPER_ADMIN";
                const hasOwnerMembership = dbUser.memberships?.some((m) => m.role === Role.OWNER) ?? false;

                if (!isSuperAdmin && !hasOwnerMembership && (dbUser.memberships?.length ?? 0) > 0) {
                    console.warn("[auth:signIn] Denied: Staff account must sign in with credentials, not Google:", email);
                    return "/login?error=StaffMustUseCredentials";
                }
            }

            if (!dbUser) {
                const now = new Date();
                const trialExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const ownerName = (user.name?.trim() || email.split("@")[0] || "Chủ hồ").slice(0, 100);
                const lakeName = `Hồ câu của ${ownerName}`;

                try {
                    const result = await prisma.$transaction(
                        async (tx) => {
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
                                },
                            });
                            await tx.membership.create({
                                data: { userId: owner.id, lakeId: lake.id, role: "OWNER" },
                            });
                            return { lakeId: lake.id, ownerId: owner.id };
                        },
                        {
                            maxWait: 15000,
                            timeout: 25000,
                        }
                    );

                    console.log("[auth:signIn] Created new user, lake, and org for:", email);

                    // Khởi tạo bộ dữ liệu mẫu sau khi transaction người dùng và hồ đã commit thành công
                    if (result?.lakeId) {
                        try {
                            await seedSampleLakeData(prisma as unknown as Prisma.TransactionClient, result.lakeId, ownerName, result.ownerId);
                            console.log("[auth:signIn] Seeded sample data for lake:", result.lakeId);
                        } catch (seedErr) {
                            console.warn("[auth:signIn] Non-fatal: seedSampleLakeData warning:", seedErr);
                        }
                    }
                } catch (txErr) {
                    console.error("[auth:signIn] Error in user creation transaction:", txErr);
                }

                const createdUser = await prisma.user.findUnique({
                    where: { email },
                    select: { isLocked: true },
                });
                console.log("[auth:signIn] dbUser after transaction:", createdUser);
                return Boolean(createdUser && !createdUser.isLocked);
            }

            const allowed = Boolean(dbUser && !dbUser.isLocked);
            console.log("[auth:signIn] Final sign-in allowed:", allowed, "isLocked:", dbUser?.isLocked);
            return allowed;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.systemRole = user.systemRole;
                token.phoneVerified = user.phoneVerified;
                token.phone = user.phone;
                token.sessionVersion = user.sessionVersion;
            }
            if (token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email.toLowerCase() },
                    select: {
                        id: true,
                        systemRole: true,
                        phoneVerified: true,
                        phone: true,
                        isLocked: true,
                        sessionVersion: true,
                    },
                });

                // Invalidate if account deleted, locked, or session was revoked
                if (
                    !dbUser ||
                    dbUser.isLocked ||
                    (token.sessionVersion !== undefined &&
                        dbUser.sessionVersion !== token.sessionVersion)
                ) {
                    return {};
                }

                token.id = dbUser.id;
                token.systemRole = dbUser.systemRole;
                token.phoneVerified = dbUser.phoneVerified;
                token.phone = dbUser.phone;
                token.sessionVersion = dbUser.sessionVersion;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
                session.user.systemRole = token.systemRole as SystemRole;
                session.user.phoneVerified = Boolean(token.phoneVerified);
                session.user.phone = (token.phone as string) || null;
                session.user.sessionVersion = token.sessionVersion as number;
            } else if (!token.id) {
                return null as unknown as typeof session;
            }
            return session;
        },
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        CredentialsProvider({
            id: "credentials",
            name: "Email",
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                    placeholder: "Email đăng nhập",
                },
                password: {
                    label: "Mật khẩu",
                    type: "password",
                },
            },
            async authorize(credentials) {
                const parsed = loginSchema.safeParse(credentials);

                if (!parsed.success) {
                    return null;
                }

                let user;
                try {
                    user = await prisma.user.findUnique({
                        where: { email: parsed.data.email.trim().toLowerCase() },
                    });
                } catch (dbErr: unknown) {
                    console.error("[auth] Database query error during authorize:", dbErr);
                    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
                    if (
                        msg.includes("planLimitReached") ||
                        msg.includes("Failed to identify your database") ||
                        msg.includes("restriction")
                    ) {
                        throw new Error(
                            "Cơ sở dữ liệu đang chạm hạn mức gói cước (planLimitReached). Vui lòng nâng cấp gói Prisma hoặc cấu hình lại DATABASE_URL.",
                        );
                    }
                    throw new Error("Lỗi kết nối cơ sở dữ liệu. Vui lòng kiểm tra lại đường truyền mạng.");
                }

                if (!user) {
                    return null;
                }

                if (user.isLocked) {
                    throw new Error("Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.");
                }

                if (!user.passwordHash) {
                    throw new Error("Tài khoản chưa được tạo mật khẩu. Vui lòng liên hệ quản trị viên hồ để được hỗ trợ.");
                }

                const passwordMatches = await bcrypt.compare(
                    parsed.data.password,
                    user.passwordHash,
                );

                if (!passwordMatches) {
                    return null;
                }

                // Update lastLoginAt safely
                prisma.user
                    .update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date() },
                    })
                    .catch((err) => {
                        console.error("[auth] Failed to update lastLoginAt:", err);
                    });

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    systemRole: user.systemRole,
                    phoneVerified: user.phoneVerified,
                    phone: user.phone,
                    sessionVersion: user.sessionVersion,
                };
            },
        }),
    ],
};

// -----------------------------------------------------------------------------
// LIGHTWEIGHT SESSION COOKIE UTILITIES (HMAC-SHA256)
// -----------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET && !process.env.NEXTAUTH_SECRET) {
        throw new Error('SESSION_SECRET or NEXTAUTH_SECRET must be set in production');
    }
}
const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-in-production');
export const COOKIE_NAME = "qa_session";

export interface SessionPayload {
    userId: string;
    email: string;
    role: string;
    name: string;
    sessionVersion?: number;
    expiresAt?: number;
}

export function signSession(payload: SessionPayload): string {
    const data = Buffer.from(JSON.stringify({
        ...payload,
        sessionVersion: payload.sessionVersion ?? 0,
        expiresAt: payload.expiresAt ?? Date.now() + 7 * 24 * 60 * 60 * 1000,
    })).toString("base64url");
    const signature = crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(data)
        .digest("base64url");
    return `${data}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
    try {
        const [data, signature, extra] = token.split(".");
        if (!data || !signature || extra !== undefined) return null;
        const expectedSig = crypto
            .createHmac("sha256", SESSION_SECRET)
            .update(data)
            .digest("base64url");
        const actual = Buffer.from(signature);
        const expected = Buffer.from(expectedSig);
        if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
        const payload = JSON.parse(
            Buffer.from(data, "base64url").toString("utf-8"),
        ) as SessionPayload;
        if (!payload || typeof payload.userId !== "string" || typeof payload.email !== "string") return null;
        if (payload.expiresAt !== undefined && (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now())) return null;
        return payload;
    } catch {
        return null;
    }
}

export async function setSessionCookie(payload: SessionPayload) {
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { sessionVersion: true, isLocked: true },
    });
    if (!user || user.isLocked) throw new Error("Tài khoản không khả dụng.");
    const token = signSession({ ...payload, sessionVersion: user.sessionVersion });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 ngày
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    });
}

export async function getSessionCookie(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (!token) return null;
        const payload = verifySession(token);
        if (!payload) return null;
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { email: true, systemRole: true, isLocked: true, sessionVersion: true },
        });
        if (!user || user.isLocked || user.sessionVersion !== (payload.sessionVersion ?? 0) || user.email !== payload.email) return null;
        return { ...payload, role: user.systemRole };
    } catch {
        return null;
    }
}

export async function getSession(): Promise<SessionPayload | null> {
    return getSessionCookie();
}

export async function clearSessionCookie() {
    try {
        const cookieStore = await cookies();
        for (const name of [
            COOKIE_NAME,
            "next-auth.session-token",
            "__Secure-next-auth.session-token",
            "next-auth.csrf-token",
            "__Host-next-auth.csrf-token",
            "next-auth.callback-url",
            "__Secure-next-auth.callback-url",
        ]) {
            cookieStore.delete(name);
        }
    } catch {
        // Safe ignore
    }
}

