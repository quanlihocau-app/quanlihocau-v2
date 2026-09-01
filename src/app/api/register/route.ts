import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { normalizeVietnamesePhone } from "@/lib/phone";
import { consumeRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";

const registerSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim(),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128),
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

    // 1. Validate and normalize Vietnamese Phone
    let normalizedPhone: string;
    try {
        const phoneStd = normalizeVietnamesePhone(data.phone);
        if (!phoneStd) {
            return NextResponse.json(
                { error: "Số điện thoại chủ hồ là bắt buộc." },
                { status: 400 },
            );
        }
        normalizedPhone = phoneStd;
    } catch (phoneErr: unknown) {
        const errMsg = phoneErr instanceof Error ? phoneErr.message : "Số điện thoại di động không hợp lệ.";
        return NextResponse.json(
            { error: errMsg },
            { status: 400 },
        );
    }

    const email = data.email.toLowerCase();

    // 2. Database Rate Limiting (IP, Email, Phone)
    // NOTE: x-forwarded-for is only trusted when the application is deployed behind a properly configured reverse proxy.
    const rawIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "";
    const validIp = rawIp !== "unknown" && rawIp !== "" ? rawIp : null;

    try {
        const rateLimitChecks = [
            consumeRateLimit({
                namespace: "register:email",
                identifier: email,
                maxRequests: 3,
                windowSeconds: 3600, // 3 requests per 60 minutes
            }),
            consumeRateLimit({
                namespace: "register:phone",
                identifier: normalizedPhone,
                maxRequests: 3,
                windowSeconds: 3600, // 3 requests per 60 minutes
            }),
        ];

        if (validIp) {
            rateLimitChecks.push(
                consumeRateLimit({
                    namespace: "register:ip",
                    identifier: validIp,
                    maxRequests: 10,
                    windowSeconds: 900, // 10 requests per 15 minutes
                }),
            );
        }

        const rateResults = await Promise.all(rateLimitChecks);
        const exceeded = rateResults.find((r) => !r.allowed);

        if (exceeded) {
            return NextResponse.json(
                { error: "Bạn đã thao tác đăng ký quá nhiều lần. Vui lòng thử lại sau." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": Math.max(1, exceeded.retryAfterSeconds).toString(),
                    },
                },
            );
        }
    } catch (err: unknown) {
        if (err instanceof RateLimitUnavailableError) {
            return NextResponse.json(
                { error: "Hệ thống đăng ký tạm thời chưa sẵn sàng. Vui lòng thử lại sau." },
                {
                    status: 503,
                    headers: {
                        "Retry-After": "60",
                    },
                },
            );
        }
        throw err;
    }

    // Check existing email
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

    // Check existing phone
    const existingPhone = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true },
    });

    if (existingPhone) {
        return NextResponse.json(
            { error: "Số điện thoại này đã được đăng ký tài khoản khác." },
            { status: 409 },
        );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({
                data: {
                    name: `Doanh nghiệp của ${data.fullName}`,
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
                    phone: normalizedPhone,
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
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code: string }).code === "P2002"
        ) {
            const meta = (error as { meta?: { target?: string[] | string } }).meta;
            const targetStr = JSON.stringify(meta?.target || "");

            if (targetStr.includes("email") || targetStr.includes("User_email_key")) {
                return NextResponse.json(
                    { error: "Email này đã được sử dụng." },
                    { status: 409 },
                );
            }

            if (targetStr.includes("phone") || targetStr.includes("User_phone_key")) {
                return NextResponse.json(
                    { error: "Số điện thoại này đã được đăng ký tài khoản khác." },
                    { status: 409 },
                );
            }

            return NextResponse.json(
                { error: "Thông tin đăng ký đã tồn tại trong hệ thống." },
                { status: 409 },
            );
        }

        return NextResponse.json(
            { error: "Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại sau." },
            { status: 500 },
        );
    }
}
