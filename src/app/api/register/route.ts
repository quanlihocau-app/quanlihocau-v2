import { NextResponse } from "next/server";
import { z } from "zod";

import { registerUser } from "@/app/actions/auth";
import { normalizeVietnamesePhone } from "@/lib/phone";
import { consumeRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";

const registerSchema = z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    email: z.union([z.string().trim().email("Email không hợp lệ.").max(255), z.literal("")]).optional(),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự.").max(128),
    phone: z.string().trim().min(1, "Số điện thoại chủ hồ là bắt buộc."),
    lakeName: z.string().trim().min(2).max(200),
}).refine((value) => Boolean(value.fullName || value.name), {
    message: "Vui lòng nhập họ tên.",
});

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: "Dữ liệu gửi lên không hợp lệ.", message: "Dữ liệu gửi lên không hợp lệ." },
            { status: 400 },
        );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message || "Vui lòng kiểm tra lại thông tin đăng ký.";
        return NextResponse.json(
            { success: false, error: message, message },
            { status: 400 },
        );
    }

    let normalizedPhone: string;
    try {
        const phone = normalizeVietnamesePhone(parsed.data.phone);
        if (!phone) {
            return NextResponse.json(
                { success: false, error: "Số điện thoại chủ hồ là bắt buộc.", message: "Số điện thoại chủ hồ là bắt buộc." },
                { status: 400 },
            );
        }
        normalizedPhone = phone;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Số điện thoại di động không hợp lệ.";
        return NextResponse.json(
            { success: false, error: message, message },
            { status: 400 },
        );
    }

    const email = parsed.data.email?.trim().toLowerCase() || undefined;
    const rawIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "";
    const loopback = rawIp === "127.0.0.1" || rawIp === "::1" || rawIp === "::ffff:127.0.0.1";
    const validIp = rawIp !== "" && rawIp !== "unknown" && !loopback ? rawIp : null;

    try {
        const checks = [
            consumeRateLimit({ namespace: "register:phone", identifier: normalizedPhone, maxRequests: 3, windowSeconds: 3600 }),
        ];
        if (email) {
            checks.push(consumeRateLimit({ namespace: "register:email", identifier: email, maxRequests: 3, windowSeconds: 3600 }));
        }
        if (validIp) {
            checks.push(consumeRateLimit({
                namespace: "register:ip",
                identifier: validIp,
                maxRequests: 10,
                windowSeconds: 900,
            }));
        }
        const results = await Promise.all(checks);
        const exceeded = results.find((result) => !result.allowed);
        if (exceeded) {
            return NextResponse.json(
                { success: false, error: "Bạn đã thao tác đăng ký quá nhiều lần. Vui lòng thử lại sau.", message: "Bạn đã thao tác đăng ký quá nhiều lần. Vui lòng thử lại sau." },
                { status: 429, headers: { "Retry-After": String(Math.max(1, exceeded.retryAfterSeconds)) } },
            );
        }
    } catch (error: unknown) {
        if (error instanceof RateLimitUnavailableError) {
            return NextResponse.json(
                { success: false, error: "Hệ thống đăng ký tạm thời chưa sẵn sàng. Vui lòng thử lại sau.", message: "Hệ thống đăng ký tạm thời chưa sẵn sàng. Vui lòng thử lại sau." },
                { status: 503, headers: { "Retry-After": "60" } },
            );
        }
        throw error;
    }

    const result = await registerUser({
        email,
        password: parsed.data.password,
        name: (parsed.data.fullName || parsed.data.name || "").trim(),
        phone: normalizedPhone,
        lakeName: parsed.data.lakeName,
    });

    if (!result.success) {
        return NextResponse.json(
            { success: false, message: result.message, error: result.message },
            { status: result.conflict ? 409 : 400 },
        );
    }

    return NextResponse.json(
        {
            success: true,
            message: result.message,
            data: result.data,
            userId: result.data?.id,
            lakeId: result.data?.lakeId,
            organizationId: result.data?.organizationId,
        },
        { status: 201 },
    );
}
