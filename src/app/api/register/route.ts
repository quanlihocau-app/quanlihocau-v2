import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128),
    organizationName: z.string().trim().min(2).max(120),
    lakeName: z.string().trim().min(2).max(120),
});

export async function POST(request: Request) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Dữ liệu gửi lên không hợp lệ." },
            { status: 400 },
        );
    }

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Vui lòng kiểm tra lại thông tin đăng ký." },
            { status: 400 },
        );
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existingUser) {
        return NextResponse.json(
            { error: "Email này đã được sử dụng." },
            { status: 409 },
        );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
            data: {
                name: data.organizationName,
            },
        });

        const lake = await tx.lake.create({
            data: {
                organizationId: organization.id,
                name: data.lakeName,
            },
        });

        const user = await tx.user.create({
            data: {
                name: data.fullName,
                email,
                passwordHash,
            },
        });

        await tx.membership.create({
            data: {
                userId: user.id,
                lakeId: lake.id,
                role: "OWNER",
            },
        });

        return {
            organizationId: organization.id,
            lakeId: lake.id,
            userId: user.id,
        };
    });

    return NextResponse.json(
        {
            message: "Đăng ký thành công.",
            ...result,
        },
        { status: 201 },
    );
}