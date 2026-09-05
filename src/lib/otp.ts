import crypto from "node:crypto";

/**
 * Generates a cryptographically random numeric OTP code of specified length.
 * Default is 6 digits (e.g. 100000 - 999999).
 */
export function generateNumericOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const num = crypto.randomInt(min, max + 1);
    return num.toString();
}

/**
 * Service to dispatch SMS OTP.
 * In development and test environments, prints clearly to console.
 */
export async function sendSmsOtp(phone: string, code: string): Promise<void> {
    const message = `[QuanLyHoCau] Ma xac thuc OTP cua ban la: ${code}. Hieu luc trong 5 phut. Khong chia se ma nay cho bat ky ai.`;

    // Console logging in dev / test mode
    console.log(`\n======================================================`);
    console.log(`📱 [SMS OTP DISPATCH] -> ${phone}`);
    console.log(`🔑 OTP CODE: ${code}`);
    console.log(`💬 MESSAGE: ${message}`);
    console.log(`======================================================\n`);

    // In production with SMS provider configured (e.g. eSMS, SpeedSMS, Twilio, Zalo ZNS):
    // if (process.env.SMS_PROVIDER_API_KEY) { ... }
}
