import { NextResponse } from "next/server";
import { z } from "zod";

import { generateNumericOtp, sendSmsOtp } from "@/lib/otp";
import { normalizeVietnamesePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";

const sendOtpSchema = z.object({
    phone: z.string().trim().min(9, "Số điện thoại tối thiểu 9 ký tự"),
});

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Dữ liệu JSON không hợp lệ." },
            { status: 400 },
        );
    }

    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? "Vui lòng nhập số điện thoại hợp lệ.";
        return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // 1. Normalize phone number
    let normalizedPhone: string;
    try {
        const normalized = normalizeVietnamesePhone(parsed.data.phone);
        if (!normalized) {
            return NextResponse.json(
                { error: "Số điện thoại không được để trống." },
                { status: 400 },
            );
        }
        normalizedPhone = normalized;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Số điện thoại không đúng định dạng di động Việt Nam.";
        return NextResponse.json(
            { error: message },
            { status: 400 },
        );
    }

    // 2. Rate Limiting to prevent SMS flooding
    const rawIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "";
    const validIp = rawIp !== "unknown" && rawIp !== "" ? rawIp : null;

    try {
        const rateLimitChecks = [
            consumeRateLimit({
                namespace: "otp:phone",
                identifier: normalizedPhone,
                maxRequests: 3,
                windowSeconds: 300, // 3 requests per 5 minutes
            }),
        ];

        if (validIp) {
            rateLimitChecks.push(
                consumeRateLimit({
                    namespace: "otp:ip",
                    identifier: validIp,
                    maxRequests: 10,
                    windowSeconds: 600, // 10 requests per 10 minutes
                }),
            );
        }

        const rateResults = await Promise.all(rateLimitChecks);
        const exceeded = rateResults.find((r) => !r.allowed);

        if (exceeded) {
            return NextResponse.json(
                { error: "Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng đợi trong giây lát." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": Math.max(1, exceeded.retryAfterSeconds).toString(),
                    },
                },
            );
        }
    } catch (rateErr) {
        // Fallthrough if rate limit storage has transient issue
        console.warn("Rate limit check warning:", rateErr);
    }

    // 3. Generate OTP & Save
    const code = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.otpCode.upsert({
        where: { phone: normalizedPhone },
        create: {
            phone: normalizedPhone,
            code,
            expiresAt,
            attempts: 0,
        },
        update: {
            code,
            expiresAt,
            attempts: 0,
        },
    });

    // 4. Dispatch SMS
    await sendSmsOtp(normalizedPhone, code);

    return NextResponse.json(
        {
            message: "Mã OTP đã được gửi đến số điện thoại của bạn.",
            phone: normalizedPhone,
            expiresInSeconds: 300,
            ...(process.env.NODE_ENV !== "production" ? { devOtp: code } : {}),
        },
        { status: 200 },
    );
}
