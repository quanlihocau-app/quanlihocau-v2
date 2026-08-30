import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

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
    providers: [
        CredentialsProvider({
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
                };
            },
        }),
    ],
};