import { maskPhoneNumber, toSpeedSmsPhone } from "../../phone";
import { OtpProvider, SendOtpParams, SendOtpResult } from "../types";

export class SpeedSmsProvider implements OtpProvider {
    readonly name = "SPEEDSMS" as const;

    private readonly authToken: string;
    private readonly appId: string;
    private readonly sender: string;
    private readonly smsType: number;

    constructor() {
        this.authToken =
            process.env.SPEEDSMS_AUTH_TOKEN ||
            process.env.SMS_PROVIDER_API_KEY ||
            "";
        this.appId = process.env.SPEEDSMS_APP_ID || "";
        this.sender =
            process.env.SPEEDSMS_SENDER ||
            process.env.SMS_BRANDNAME ||
            "";
        // Nếu không có Brandname đã đăng ký, tự động dùng sms_type 5 (đầu số ngẫu nhiên/notify) hoặc 3 (đầu số cố định)
        const envType = process.env.SPEEDSMS_SMS_TYPE;
        if (envType) {
            this.smsType = parseInt(envType, 10);
        } else {
            this.smsType = this.sender ? 2 : 5;
        }
    }

    async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
        const masked = maskPhoneNumber(params.phone);
        const destination = toSpeedSmsPhone(params.phone);

        if (!this.authToken) {
            console.error(`[SpeedSMS] Missing SPEEDSMS_AUTH_TOKEN for recipient ${masked}`);
            return {
                success: false,
                providerName: this.name,
                costVnd: 0,
                error: "Chưa cấu hình SpeedSMS Auth Token trên máy chủ.",
            };
        }

        const messageContent = `[QuanLyHoCau] Ma xac thuc OTP cua ban la: ${params.code}. Hieu luc trong 3 phut. Khong chia se ma nay.`;

        try {
            const basicAuth = Buffer.from(`${this.authToken}:x`).toString("base64");

            // 1. Nếu có App ID (2FA Application), ưu tiên gọi qua endpoint pin/create của SpeedSMS
            if (this.appId) {
                try {
                    const pinResponse = await fetch("https://api.speedsms.vn/index.php/pin/create", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Basic ${basicAuth}`,
                        },
                        body: JSON.stringify({
                            to: destination,
                            content: `[QuanLyHoCau] Ma xac thuc OTP cua ban la ${params.code}. Hieu luc 3 phut.`,
                            app_id: this.appId,
                        }),
                    });

                    const pinData = await pinResponse.json();
                    if (pinData?.status === "success" || pinData?.code === "00") {
                        const tranId = String(pinData.data?.tranId || pinData.data?.pin_id || "");
                        const cost = Number(pinData.data?.totalPrice) || 350;

                        console.log(`[SpeedSMS 2FA] Sent OTP successfully to ${masked}, tranId=${tranId}, cost=${cost}đ`);
                        return {
                            success: true,
                            providerName: this.name,
                            providerMessageId: tranId,
                            costVnd: cost,
                        };
                    }
                    console.warn(`[SpeedSMS 2FA] /pin/create returned:`, pinData?.message || pinData);
                } catch (pinErr) {
                    console.warn("[SpeedSMS 2FA] Failed /pin/create, falling back to /sms/send:", pinErr);
                }
            }

            // 2. Gọi qua SMS Gateway tiêu chuẩn (/sms/send)
            const sendBody: Record<string, unknown> = {
                to: [destination],
                content: messageContent,
                sms_type: this.smsType,
            };
            if (this.sender) {
                sendBody.sender = this.sender;
            }

            const response = await fetch("https://api.speedsms.vn/index.php/sms/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${basicAuth}`,
                },
                body: JSON.stringify(sendBody),
            });

            const data = await response.json();

            if (data?.status === "success") {
                const tranId = String(data.data?.tranId || "");
                const cost = Number(data.data?.totalPrice) || 500;

                console.log(`[SpeedSMS] Sent OTP successfully to ${masked}, tranId=${tranId}, cost=${cost}đ`);
                return {
                    success: true,
                    providerName: this.name,
                    providerMessageId: tranId,
                    costVnd: cost,
                };
            }

            const errorMsg = data?.message || `Lỗi nhà mạng SpeedSMS (code: ${data?.code || "unknown"})`;
            console.error(`[SpeedSMS] Dispatch failed for ${masked}: ${errorMsg}`);
            return {
                success: false,
                providerName: this.name,
                costVnd: 0,
                error: errorMsg,
            };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Lỗi kết nối API SpeedSMS";
            console.error(`[SpeedSMS] Network exception for ${masked}:`, message);
            return {
                success: false,
                providerName: this.name,
                costVnd: 0,
                error: message,
            };
        }
    }
}
