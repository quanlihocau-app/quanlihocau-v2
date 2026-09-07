import crypto from "node:crypto";

import { maskPhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { MockOtpProvider } from "./otp/providers/mock";
import { SpeedSmsProvider } from "./otp/providers/speed-sms";
import { ZaloZnsProvider } from "./otp/providers/zalo-zns";
import { OtpProvider, SendOtpResult } from "./otp/types";

export * from "./otp/types";

/**
 * Generates a cryptographically random 6-digit numeric OTP code (100000 - 999999).
 */
export function generateNumericOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const num = crypto.randomInt(min, max + 1);
    return num.toString();
}

/**
 * Computes an HMAC-SHA256 hash of an OTP code bound to a specific phone number.
 * Never stores plain text OTP codes in the database.
 */
export function hashOtpCode(phone: string, code: string): string {
    const secret = process.env.NEXTAUTH_SECRET || "qlhc_otp_secure_salt_2026";
    return crypto
        .createHmac("sha256", secret)
        .update(`${phone.trim()}:${code.trim()}`)
        .digest("hex");
}

/**
 * Timing-safe comparison of submitted code against stored hash or fallback plain code.
 */
export function verifyOtpHash(
    phone: string,
    inputCode: string,
    storedHashOrCode: string,
): boolean {
    const trimmedInput = inputCode.trim();
    const expectedHash = hashOtpCode(phone, trimmedInput);

    if (storedHashOrCode.length === 64) {
        try {
            return crypto.timingSafeEqual(
                Buffer.from(expectedHash, "hex"),
                Buffer.from(storedHashOrCode, "hex"),
            );
        } catch {
            return false;
        }
    }

    // Fallback for transition/legacy test data
    return storedHashOrCode === trimmedInput;
}

/**
 * Provider factory based on environment configuration.
 * Extensible for Zalo ZNS and other gateways.
 */
export function getOtpProvider(): OtpProvider {
    const configured = process.env.OTP_PROVIDER?.toUpperCase();

    if (configured === "ZALO_ZNS") {
        return new ZaloZnsProvider();
    }

    // If explicitly SPEEDSMS or if SpeedSMS credentials are provided
    if (
        configured === "SPEEDSMS" ||
        Boolean(process.env.SPEEDSMS_AUTH_TOKEN || process.env.SMS_PROVIDER_API_KEY)
    ) {
        return new SpeedSmsProvider();
    }

    return new MockOtpProvider();
}

/**
 * Dispatches an SMS OTP via the active provider and records an audit log.
 */
export async function sendSmsOtp(
    phone: string,
    code: string,
    meta?: { ip?: string | null; deviceHash?: string | null },
): Promise<SendOtpResult> {
    const provider = getOtpProvider();
    const result = await provider.sendOtp({
        phone,
        code,
        ip: meta?.ip,
    });

    const maskedPhone = maskPhoneNumber(phone);

    // Record into OtpDeliveryLog for audit and cost tracking
    try {
        await prisma.otpDeliveryLog.create({
            data: {
                phone,
                maskedPhone,
                provider: result.providerName,
                status: result.success ? "SENT" : "FAILED",
                ipAddress: meta?.ip || null,
                deviceHash: meta?.deviceHash || null,
                costVnd: result.costVnd,
                errorMessage: result.error || null,
            },
        });
    } catch (logErr) {
        console.warn("Failed to write OtpDeliveryLog:", logErr);
    }

    return result;
}
