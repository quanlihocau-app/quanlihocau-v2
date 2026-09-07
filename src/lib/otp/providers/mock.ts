import { maskPhoneNumber } from "@/lib/phone";
import { OtpProvider, SendOtpParams, SendOtpResult } from "../types";

export class MockOtpProvider implements OtpProvider {
    readonly name = "MOCK" as const;

    async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
        const masked = maskPhoneNumber(params.phone);

        console.log(`\n======================================================`);
        console.log(`📱 [MOCK OTP DISPATCH] -> ${masked} (Raw: ${params.phone})`);
        console.log(`🔑 6-DIGIT OTP CODE: ${params.code}`);
        console.log(`⏱️ VALIDITY: 3 minutes (180s)`);
        console.log(`💬 MESSAGE: [QuanLyHoCau] Ma xac thuc cua ban la ${params.code}`);
        console.log(`======================================================\n`);

        return {
            success: true,
            providerName: this.name,
            providerMessageId: `MOCK_${Date.now()}`,
            costVnd: 0,
        };
    }
}
