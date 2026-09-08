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
        };
    }
    interface User {
        id: string;
        name: string;
        email: string;
        systemRole?: SystemRole;
        phoneVerified?: boolean;
        phone?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        systemRole?: SystemRole;
        phoneVerified?: boolean;
        phone?: string | null;
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
            }
            if (token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email.toLowerCase() },
                    select: { id: true, systemRole: true, phoneVerified: true, phone: true },
                });
                if (dbUser) {
                    token.id = dbUser.id;
                    token.systemRole = dbUser.systemRole;
                    token.phoneVerified = dbUser.phoneVerified;
                    token.phone = dbUser.phone;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.systemRole = token.systemRole as SystemRole;
                session.user.phoneVerified = Boolean(token.phoneVerified);
                session.user.phone = (token.phone as string) || null;
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

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: identifier.toLowerCase() },
                            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                        ],
                    },
                });

                if (!user?.passwordHash) {
                    return null;
                }

                const passwordMatches = await bcrypt.compare(
                    parsed.data.password,
                    user.passwordHash,
                );

                if (!passwordMatches) {
                    return null;
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    systemRole: user.systemRole,
                    phoneVerified: user.phoneVerified,
                    phone: user.phone,
                };
            },
        }),
    ],
};