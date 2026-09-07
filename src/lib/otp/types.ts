export interface SendOtpParams {
    phone: string; // E.164 (+84...)
    code: string; // 6-digit numeric OTP
    ip?: string | null;
}

export interface SendOtpResult {
    success: boolean;
    providerName: "SPEEDSMS" | "ZALO_ZNS" | "MOCK";
    providerMessageId?: string;
    costVnd: number;
    error?: string;
}

export interface OtpProvider {
    readonly name: "SPEEDSMS" | "ZALO_ZNS" | "MOCK";
    sendOtp(params: SendOtpParams): Promise<SendOtpResult>;
}
