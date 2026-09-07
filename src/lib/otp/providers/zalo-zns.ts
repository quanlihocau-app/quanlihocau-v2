import { maskPhoneNumber } from "@/lib/phone";
import { OtpProvider, SendOtpParams, SendOtpResult } from "../types";

/**
 * Zalo Notification Service (ZNS) Provider Skeleton
 * Ready for drop-in integration without modifying the core system.
 */
export class ZaloZnsProvider implements OtpProvider {
    readonly name = "ZALO_ZNS" as const;

    private readonly accessToken: string;
    private readonly templateId: string;

    constructor() {
        this.accessToken = process.env.ZALO_ZNS_ACCESS_TOKEN || "";
        this.templateId = process.env.ZALO_ZNS_TEMPLATE_ID || "";
    }

    async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
        const masked = maskPhoneNumber(params.phone);

        if (!this.accessToken || !this.templateId) {
            console.error(`[ZaloZNS] Missing ZALO_ZNS_ACCESS_TOKEN or ZALO_ZNS_TEMPLATE_ID for ${masked}`);
            return {
                success: false,
                providerName: this.name,
                costVnd: 0,
                error: "Chưa cấu hình Zalo ZNS Token / Template ID.",
            };
        }

        try {
            // Zalo ZNS API Call (https://business.openapi.zalo.me/message/template)
            const response = await fetch("https://business.openapi.zalo.me/message/template", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    access_token: this.accessToken,
                },
                body: JSON.stringify({
                    phone: params.phone.replace(/^\+/, ""),
                    template_id: this.templateId,
                    template_data: {
                        otp: params.code,
                    },
                }),
            });

            const data = await response.json();

            if (data?.error === 0) {
                return {
                    success: true,
                    providerName: this.name,
                    providerMessageId: String(data?.data?.msg_id || ""),
                    costVnd: 300, // Typical ZNS rate
                };
            }

            return {
                success: false,
                providerName: this.name,
                costVnd: 0,
                error: data?.message || "Lỗi gửi Zalo ZNS",
            };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Lỗi kết nối Zalo ZNS API";
            return {
                success: false,
                providerName: this.name,
                costVnd: 0,
                error: message,
            };
        }
    }
}
