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
        };
    }
    interface User {
        id: string;
        name: string;
        email: string;
        systemRole?: SystemRole;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        systemRole?: SystemRole;
    }
}

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
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
            }
            if (token.email && !token.systemRole) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email.toLowerCase() },
                    select: { id: true, systemRole: true },
                });
                if (dbUser) {
                    token.id = dbUser.id;
                    token.systemRole = dbUser.systemRole;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.systemRole = token.systemRole as SystemRole;
            }
            return session;
        },
    },
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Email và mật khẩu",
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                    placeholder: "owner@example.com",
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

                const user = await prisma.user.findUnique({
                    where: { email: parsed.data.email.toLowerCase() },
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
                };
            },
        }),
        CredentialsProvider({
            id: "phone-otp",
            name: "Số điện thoại OTP",
            credentials: {
                phone: { label: "Số điện thoại", type: "text" },
                code: { label: "Mã OTP", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.phone || !credentials?.code) {
                    return null;
                }

                const phoneInput = credentials.phone.trim();
                const codeInput = credentials.code.trim();

                let normalizedPhone: string;
                try {
                    const normalized = normalizeVietnamesePhone(phoneInput);
                    if (!normalized) return null;
                    normalizedPhone = normalized;
                } catch {
                    return null;
                }

                const otpRecord = await prisma.otpCode.findUnique({
                    where: { phone: normalizedPhone },
                });

                if (!otpRecord) return null;
                if (otpRecord.expiresAt < new Date()) return null;
                if (otpRecord.attempts >= 5) return null;

                if (otpRecord.code !== codeInput) {
                    await prisma.otpCode.update({
                        where: { id: otpRecord.id },
                        data: { attempts: { increment: 1 } },
                    });
                    return null;
                }

                // Delete used OTP
                await prisma.otpCode.delete({ where: { id: otpRecord.id } });

                let user = await prisma.user.findFirst({
                    where: { phone: normalizedPhone },
                });

                if (!user) {
                    // Auto-create user with 30-day trial
                    const phoneDigits = normalizedPhone.replace(/\D/g, "");
                    const userName = `Chủ hồ ${phoneDigits.slice(-4)}`;
                    const lakeName = `Hồ câu ${phoneDigits.slice(-4)}`;
                    const email = `user_${phoneDigits}@quanlihocau.vn`;
                    const trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    user = await prisma.$transaction(async (tx) => {
                        const org = await tx.organization.create({
                            data: {
                                name: `Doanh nghiệp của ${userName}`,
                                subscriptionPlan: "TRIAL",
                                validUntil: trialExpiresAt,
                            },
                        });

                        const lake = await tx.lake.create({
                            data: {
                                organizationId: org.id,
                                name: lakeName,
                                subscriptionStatus: "TRIAL",
                                subscriptionPlan: "TRIAL",
                                subscriptionExpiresAt: trialExpiresAt,
                            },
                        });

                        const newUser = await tx.user.create({
                            data: {
                                name: userName,
                                email,
                                phone: normalizedPhone,
                                phoneVerified: true,
                            },
                        });

                        await tx.membership.create({
                            data: {
                                userId: newUser.id,
                                lakeId: lake.id,
                                role: "OWNER",
                            },
                        });

                        return newUser;
                    });
                } else if (!user.phoneVerified) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { phoneVerified: true },
                    });
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    systemRole: user.systemRole,
                };
            },
        }),
    ],
};