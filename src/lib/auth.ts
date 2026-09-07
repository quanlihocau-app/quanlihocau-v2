import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { SystemRole } from "@/generated/prisma/client";
import { verifyOtpHash } from "@/lib/otp";
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

                const isCodeValid = verifyOtpHash(
                    normalizedPhone,
                    codeInput,
                    otpRecord.code,
                );

                if (!isCodeValid) {
                    const nextAttempts = otpRecord.attempts + 1;
                    if (nextAttempts >= 5) {
                        await prisma.otpCode.delete({ where: { id: otpRecord.id } });
                    } else {
                        await prisma.otpCode.update({
                            where: { id: otpRecord.id },
                            data: { attempts: nextAttempts },
                        });
                    }
                    return null;
                }

                // Delete used OTP
                await prisma.otpCode.delete({ where: { id: otpRecord.id } });

                // Update OtpDeliveryLog if exists
                try {
                    const latestLog = await prisma.otpDeliveryLog.findFirst({
                        where: { phone: normalizedPhone, status: "SENT" },
                        orderBy: { createdAt: "desc" },
                    });
                    if (latestLog) {
                        await prisma.otpDeliveryLog.update({
                            where: { id: latestLog.id },
                            data: { status: "VERIFIED", verifiedAt: new Date() },
                        });
                    }
                } catch {
                    // Non-blocking
                }

                let user = await prisma.user.findFirst({
                    where: { phone: normalizedPhone },
                });

                const now = new Date();

                if (!user) {
                    // Auto-create user with 7-day trial
                    const phoneDigits = normalizedPhone.replace(/\D/g, "");
                    const userName = `Chủ hồ ${phoneDigits.slice(-4)}`;
                    const lakeName = `Hồ câu ${phoneDigits.slice(-4)}`;
                    const email = `user_${phoneDigits}@quanlihocau.vn`;
                    const trialExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
                                phoneVerifiedAt: now,
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
                } else if (!user.phoneVerified || !user.phoneVerifiedAt) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            phoneVerified: true,
                            phoneVerifiedAt: user.phoneVerifiedAt || now,
                        },
                    });

                    // Kích hoạt hạn 7 ngày từ bây giờ cho hồ dùng thử
                    const membership = await prisma.membership.findFirst({
                        where: { userId: user.id, role: "OWNER", deletedAt: null },
                        include: { lake: true },
                    });
                    if (membership?.lake && membership.lake.subscriptionPlan === "TRIAL") {
                        const trialExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        await prisma.lake.update({
                            where: { id: membership.lake.id },
                            data: {
                                subscriptionStatus: "TRIAL",
                                subscriptionExpiresAt: trialExpiresAt,
                            },
                        });
                        await prisma.organization.update({
                            where: { id: membership.lake.organizationId },
                            data: {
                                subscriptionPlan: "TRIAL",
                                validUntil: trialExpiresAt,
                            },
                        });
                    }
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    systemRole: user.systemRole,
                    phoneVerified: true,
                    phone: user.phone,
                };
            },
        }),
    ],
};