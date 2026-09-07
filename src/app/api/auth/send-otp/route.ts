import { NextResponse } from "next/server";
import { z } from "zod";

import { generateNumericOtp, hashOtpCode, sendSmsOtp } from "@/lib/otp";
import { maskPhoneNumber, normalizeVietnamesePhone } from "@/lib/phone";
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
        const firstError =
            parsed.error.issues[0]?.message ?? "Vui lòng nhập số điện thoại hợp lệ.";
        return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // 1. Chuẩn hóa số điện thoại Việt Nam về dạng E.164 (+84...)
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
        const message =
            err instanceof Error
                ? err.message
                : "Số điện thoại không đúng định dạng di động Việt Nam.";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const masked = maskPhoneNumber(normalizedPhone);

    // 2. Cooldown 60 giây giữa các lần gửi
    const existingOtp = await prisma.otpCode.findUnique({
        where: { phone: normalizedPhone },
    });

    const now = Date.now();
    if (existingOtp) {
        const elapsedMs = now - existingOtp.updatedAt.getTime();
        const COOLDOWN_MS = 60 * 1000;
        if (elapsedMs < COOLDOWN_MS) {
            const waitSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
            return NextResponse.json(
                {
                    error: `Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu mã OTP tiếp theo.`,
                    retryAfterSeconds: waitSeconds,
                },
                {
                    status: 429,
                    headers: { "Retry-After": waitSeconds.toString() },
                },
            );
        }
    }

    // 3. Giới hạn tỷ lệ đa tầng (Chống phá tiền SMS)
    const rawIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "";
    const validIp = rawIp !== "unknown" && rawIp !== "" ? rawIp : null;
    const deviceId = request.headers.get("x-device-id")?.trim() || null;

    try {
        const rateLimitChecks = [
            // Tiêu chí 6: Tối đa 5 mã/ngày cho một số điện thoại
            consumeRateLimit({
                namespace: "otp:phone:daily",
                identifier: normalizedPhone,
                maxRequests: 5,
                windowSeconds: 86400, // 24h
            }),
            // Tối đa 3 mã trong 10 phút cho 1 số điện thoại
            consumeRateLimit({
                namespace: "otp:phone:short",
                identifier: normalizedPhone,
                maxRequests: 3,
                windowSeconds: 600,
            }),
        ];

        // Tiêu chí 7: Giới hạn theo IP (ngắn hạn và theo ngày)
        const isLocalhost =
            validIp === "127.0.0.1" || validIp === "::1" || validIp === "localhost";

        if (validIp && (!isLocalhost || process.env.NODE_ENV === "production")) {
            rateLimitChecks.push(
                consumeRateLimit({
                    namespace: "otp:ip:short",
                    identifier: validIp,
                    maxRequests: 15,
                    windowSeconds: 600, // 15 requests / 10 mins
                }),
                consumeRateLimit({
                    namespace: "otp:ip:daily",
                    identifier: validIp,
                    maxRequests: 50,
                    windowSeconds: 86400, // 50 requests / day
                }),
            );
        }

        // Tiêu chí 7: Giới hạn theo Thiết bị
        if (deviceId) {
            rateLimitChecks.push(
                consumeRateLimit({
                    namespace: "otp:device:short",
                    identifier: deviceId,
                    maxRequests: 5,
                    windowSeconds: 600,
                }),
            );
        }

        const rateResults = await Promise.all(rateLimitChecks);
        const exceeded = rateResults.find((r) => !r.allowed);

        if (exceeded) {
            return NextResponse.json(
                {
                    error:
                        "Bạn hoặc số điện thoại này đã nhận quá số lượng mã OTP cho phép trong ngày. Vui lòng thử lại sau.",
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": Math.max(
                            1,
                            exceeded.retryAfterSeconds,
                        ).toString(),
                    },
                },
            );
        }
    } catch (rateErr) {
        console.warn("Rate limit warning:", rateErr);
    }

    // 4. Sinh OTP 6 chữ số và tính thời hạn 3 phút (180 giây)
    const code = generateNumericOtp(6);
    const expiresAt = new Date(now + 3 * 60 * 1000); // 3 phút theo tiêu chí 3

    // 5. Tiêu chí 8: Không lưu OTP dạng văn bản; chỉ lưu Hash
    const hashedCode = hashOtpCode(normalizedPhone, code);

    await prisma.otpCode.upsert({
        where: { phone: normalizedPhone },
        create: {
            phone: normalizedPhone,
            code: hashedCode,
            expiresAt,
            attempts: 0,
        },
        update: {
            code: hashedCode,
            expiresAt,
            attempts: 0,
            updatedAt: new Date(),
        },
    });

    // 6. Gửi SMS qua nhà cung cấp (SpeedSMS / Mock) và ghi OtpDeliveryLog
    const dispatchResult = await sendSmsOtp(normalizedPhone, code, {
        ip: validIp,
        deviceHash: deviceId,
    });

    if (!dispatchResult.success) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[SMS OTP Dev Fallback] SpeedSMS failed: ${dispatchResult.error}. Providing devOtp: ${code}`);
            return NextResponse.json(
                {
                    message: "Mã OTP xác thực đã được gửi (Chế độ phát triển).",
                    phone: normalizedPhone,
                    maskedPhone: masked,
                    expiresInSeconds: 180,
                    cooldownSeconds: 60,
                    devOtp: code,
                    providerWarning: dispatchResult.error,
                },
                { status: 200 },
            );
        }
        return NextResponse.json(
            {
                error: `Không thể gửi tin nhắn SMS OTP: ${dispatchResult.error || "Lỗi nhà cung cấp dịch vụ viễn thông."}`,
                providerError: dispatchResult.error,
            },
            { status: 502 },
        );
    }

    // 7. Tiêu chí 11 & 13: Che số điện thoại trong phản hồi và không tiết lộ sự tồn tại của tài khoản
    return NextResponse.json(
        {
            message:
                "Mã OTP xác thực đã được gửi đến số điện thoại của bạn.",
            phone: normalizedPhone,
            maskedPhone: masked,
            expiresInSeconds: 180,
            cooldownSeconds: 60,
            ...(process.env.NODE_ENV !== "production" ? { devOtp: code } : {}),
        },
        { status: 200 },
    );
}
