import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyOtpHash } from "@/lib/otp";
import { maskPhoneNumber, normalizeVietnamesePhone } from "@/lib/phone";
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
        const firstError =
            parsed.error.issues[0]?.message ?? "Dữ liệu xác thực không hợp lệ.";
        return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // 1. Chuẩn hóa SĐT
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
            err instanceof Error ? err.message : "Số điện thoại không hợp lệ.";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const submittedCode = parsed.data.code;
    const masked = maskPhoneNumber(normalizedPhone);

    // 2. Truy vấn bản ghi OTP
    const otpRecord = await prisma.otpCode.findUnique({
        where: { phone: normalizedPhone },
    });

    if (!otpRecord) {
        return NextResponse.json(
            {
                error:
                    "Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.",
            },
            { status: 400 },
        );
    }

    const now = new Date();

    // Tiêu chí 3: Kiểm tra hết hạn (3 phút)
    if (otpRecord.expiresAt < now) {
        await prisma.otpCode.delete({ where: { id: otpRecord.id } });
        return NextResponse.json(
            {
                error:
                    "Mã OTP đã hết hạn hiệu lực (3 phút). Vui lòng yêu cầu mã mới.",
            },
            { status: 400 },
        );
    }

    // Tiêu chí 5: Tối đa 5 lần nhập sai
    if (otpRecord.attempts >= 5) {
        await prisma.otpCode.delete({ where: { id: otpRecord.id } });
        return NextResponse.json(
            {
                error:
                    "Bạn đã nhập sai mã OTP quá 5 lần. Mã đã bị hủy. Vui lòng yêu cầu mã mới.",
            },
            { status: 400 },
        );
    }

    // Tiêu chí 8: So khớp mã bằng hàm Hash an toàn
    const isCodeValid = verifyOtpHash(
        normalizedPhone,
        submittedCode,
        otpRecord.code,
    );

    if (!isCodeValid) {
        const nextAttempts = otpRecord.attempts + 1;

        if (nextAttempts >= 5) {
            // Hủy mã ngay lập tức khi đạt 5 lần sai
            await prisma.otpCode.delete({ where: { id: otpRecord.id } });
            return NextResponse.json(
                {
                    error:
                        "Bạn đã nhập sai mã OTP quá 5 lần. Mã đã bị khóa và hủy hiệu lực. Vui lòng yêu cầu mã mới.",
                },
                { status: 400 },
            );
        }

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

    // 3. OTP hợp lệ! Xóa mã đã sử dụng
    await prisma.otpCode.delete({ where: { id: otpRecord.id } });

    // Tiêu chí 12: Cập nhật nhật ký OtpDeliveryLog sang trạng thái VERIFIED
    try {
        const latestLog = await prisma.otpDeliveryLog.findFirst({
            where: { phone: normalizedPhone, status: "SENT" },
            orderBy: { createdAt: "desc" },
        });

        if (latestLog) {
            await prisma.otpDeliveryLog.update({
                where: { id: latestLog.id },
                data: {
                    status: "VERIFIED",
                    verifiedAt: now,
                },
            });
        }
    } catch (logErr) {
        console.warn("Failed to update OtpDeliveryLog:", logErr);
    }

    // 4. Tiêu chí 14: Chống tạo nhiều tài khoản dùng thử bằng cùng một số điện thoại
    const existingUser = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
    });

    if (existingUser) {
        // Tiêu chí 10: Sau khi xác thực thành công, cập nhật phoneVerifiedAt
        const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                phoneVerified: true,
                phoneVerifiedAt: existingUser.phoneVerifiedAt || now,
            },
        });

        // Nếu người dùng mới xác thực lần đầu và có hồ dùng thử, kích hoạt hạn 7 ngày từ bây giờ
        if (!existingUser.phoneVerified) {
            const membership = await prisma.membership.findFirst({
                where: { userId: existingUser.id, role: "OWNER", deletedAt: null },
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

        return NextResponse.json(
            {
                message: "Xác thực số điện thoại thành công.",
                isNewUser: false,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    phone: updatedUser.phone,
                    maskedPhone: masked,
                    email: updatedUser.email,
                    phoneVerified: true,
                    phoneVerifiedAt: updatedUser.phoneVerifiedAt,
                },
            },
            { status: 200 },
        );
    }

    // 5. Đăng ký tài khoản chủ hồ mới lần đầu tiên kèm 7 ngày TRIAL
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const userName =
        parsed.data.fullName?.trim() || `Chủ hồ ${phoneDigits.slice(-4)}`;
    const lakeName =
        parsed.data.lakeName?.trim() || `Hồ câu ${phoneDigits.slice(-4)}`;
    const email = `user_${phoneDigits}@quanlihocau.vn`;
    const trialExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
                phoneVerifiedAt: now,
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
            phoneVerifiedAt: user.phoneVerifiedAt,
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
                maskedPhone: masked,
                email: result.email,
                phoneVerified: true,
                phoneVerifiedAt: result.phoneVerifiedAt,
            },
            lakeId: result.lakeId,
        },
        { status: 201 },
    );
}
