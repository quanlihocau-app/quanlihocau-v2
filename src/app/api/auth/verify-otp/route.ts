import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeVietnamesePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

const verifyOtpSchema = z.object({
    phone: z.string().trim().min(9, "Số điện thoại tối thiểu 9 ký tự"),
    code: z.string().trim().length(6, "Mã OTP phải gồm 6 chữ số"),
    fullName: z.string().trim().optional(),
    lakeName: z.string().trim().optional(),
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

    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? "Dữ liệu xác thực không hợp lệ.";
        return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // 1. Normalize phone
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
        const message = err instanceof Error ? err.message : "Số điện thoại không hợp lệ.";
        return NextResponse.json(
            { error: message },
            { status: 400 },
        );
    }

    const submittedCode = parsed.data.code;

    // 2. Query OTP
    const otpRecord = await prisma.otpCode.findUnique({
        where: { phone: normalizedPhone },
    });

    if (!otpRecord) {
        return NextResponse.json(
            { error: "Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới." },
            { status: 400 },
        );
    }

    const now = new Date();

    // Check expiration
    if (otpRecord.expiresAt < now) {
        await prisma.otpCode.delete({ where: { id: otpRecord.id } });
        return NextResponse.json(
            { error: "Mã OTP đã hết hạn hiệu lực (5 phút). Vui lòng yêu cầu mã mới." },
            { status: 400 },
        );
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
        await prisma.otpCode.delete({ where: { id: otpRecord.id } });
        return NextResponse.json(
            { error: "Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu mã mới để tiếp tục." },
            { status: 400 },
        );
    }

    // Check code match
    if (otpRecord.code !== submittedCode) {
        const nextAttempts = otpRecord.attempts + 1;
        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { attempts: nextAttempts },
        });

        const remaining = Math.max(0, 5 - nextAttempts);
        return NextResponse.json(
            { error: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.` },
            { status: 400 },
        );
    }

    // 3. OTP Validated! Delete used record
    await prisma.otpCode.delete({ where: { id: otpRecord.id } });

    // 4. Find or Create User
    const existingUser = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
    });

    if (existingUser) {
        // Update phoneVerified if needed
        if (!existingUser.phoneVerified) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { phoneVerified: true },
            });
        }

        return NextResponse.json(
            {
                message: "Xác thực OTP thành công.",
                isNewUser: false,
                user: {
                    id: existingUser.id,
                    name: existingUser.name,
                    phone: existingUser.phone,
                    email: existingUser.email,
                    phoneVerified: true,
                },
            },
            { status: 200 },
        );
    }

    // 5. New user auto-registration with 30-day TRIAL
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const userName = parsed.data.fullName?.trim() || `Chủ hồ ${phoneDigits.slice(-4)}`;
    const lakeName = parsed.data.lakeName?.trim() || `Hồ câu ${phoneDigits.slice(-4)}`;
    const email = `user_${phoneDigits}@quanlihocau.vn`;
    const trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
            data: {
                name: `Doanh nghiệp của ${userName}`,
                subscriptionPlan: "TRIAL",
                validUntil: trialExpiresAt,
            },
        });

        const lake = await tx.lake.create({
            data: {
                organizationId: organization.id,
                name: lakeName,
                subscriptionStatus: "TRIAL",
                subscriptionPlan: "TRIAL",
                subscriptionExpiresAt: trialExpiresAt,
            },
        });

        const user = await tx.user.create({
            data: {
                name: userName,
                email,
                phone: normalizedPhone,
                phoneVerified: true,
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
            userId: user.id,
            userName: user.name,
            email: user.email,
            phone: user.phone,
            lakeId: lake.id,
            lakeName: lake.name,
            organizationId: organization.id,
        };
    });

    return NextResponse.json(
        {
            message: "Đăng ký và xác thực tài khoản hồ câu mới thành công.",
            isNewUser: true,
            user: {
                id: result.userId,
                name: result.userName,
                phone: result.phone,
                email: result.email,
                phoneVerified: true,
            },
            lakeId: result.lakeId,
        },
        { status: 201 },
    );
}
