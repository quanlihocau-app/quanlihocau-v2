import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { SystemRole } from "@/generated/prisma/client";
import { normalizeVietnamesePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

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
    email: z.string().trim().min(3),
    password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
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
        CredentialsProvider({
            id: "credentials",
            name: "Email hoặc Số điện thoại",
            credentials: {
                email: {
                    label: "Tài khoản",
                    type: "text",
                    placeholder: "Email hoặc Số điện thoại",
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

                const identifier = parsed.data.email.trim();
                let normalizedPhone: string | null = null;
                try {
                    normalizedPhone = normalizeVietnamesePhone(identifier);
                } catch {
                    normalizedPhone = null;
                }

                let user;
                try {
                    user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: identifier.toLowerCase() },
                                ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                            ],
                        },
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
                    throw new Error("Tài khoản chưa được tạo mật khẩu. Vui lòng đăng nhập qua mã OTP hoặc liên hệ hỗ trợ.");
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
const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "quanlihocau-secret-key-change-in-prod-32chars!";
export const COOKIE_NAME = "qa_session";

export interface SessionPayload {
    userId: string;
    email: string;
    role: string;
    name: string;
}

export function signSession(payload: SessionPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(data)
        .digest("base64url");
    return `${data}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
    try {
        const [data, signature] = token.split(".");
        if (!data || !signature) return null;
        const expectedSig = crypto
            .createHmac("sha256", SESSION_SECRET)
            .update(data)
            .digest("base64url");
        if (signature !== expectedSig) return null;
        return JSON.parse(
            Buffer.from(data, "base64url").toString("utf-8"),
        ) as SessionPayload;
    } catch {
        return null;
    }
}

export async function setSessionCookie(payload: SessionPayload) {
    const token = signSession(payload);
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
        return verifySession(token);
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
        cookieStore.delete(COOKIE_NAME);
    } catch {
        // Safe ignore
    }
}
