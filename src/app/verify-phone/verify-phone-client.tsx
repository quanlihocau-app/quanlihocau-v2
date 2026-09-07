"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";

interface VerifyPhoneClientProps {
    userName: string;
    lakeName: string;
    initialPhone: string;
    email: string;
}

export function VerifyPhoneClient({
    userName,
    lakeName,
    initialPhone,
    email,
}: VerifyPhoneClientProps) {
    const router = useRouter();

    const [phone, setPhone] = useState(initialPhone);
    const [otpCode, setOtpCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Cooldown timer
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    async function handleSendOtp() {
        const cleanPhone = phone.trim();
        if (!cleanPhone) {
            setError("Vui lòng nhập số điện thoại để nhận mã OTP.");
            return;
        }

        setError("");
        setIsLoading(true);
        setDevOtpHint(null);

        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleanPhone }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Không thể gửi mã OTP.");
            }

            setOtpSent(true);
            setCountdown(60);
            if (data.devOtp) {
                setDevOtpHint(data.devOtp);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Lỗi khi gửi mã OTP qua SMS.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleVerifyOtp(codeToTest?: string) {
        const code = (codeToTest || otpCode).trim();
        if (code.length !== 6) {
            setError("Mã OTP bao gồm chính xác 6 chữ số.");
            return;
        }

        setError("");
        setIsVerifying(true);

        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: phone.trim(),
                    code,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Mã OTP không chính xác.");
            }

            setSuccessMessage("Xác thực thành công! Gói Dùng thử 7 ngày đã được kích hoạt.");

            // Refresh route & session, redirect into app
            setTimeout(() => {
                router.push("/sessions");
                router.refresh();
            }, 800);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Xác thực OTP thất bại.";
            setError(message);
            setIsVerifying(false);
        }
    }

    function onCodeChange(val: string) {
        const digits = val.replace(/\D/g, "").slice(0, 6);
        setOtpCode(digits);
        if (digits.length === 6) {
            handleVerifyOtp(digits);
        }
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-6 bg-[#F7F9F5]">
            {/* Header Brand */}
            <div className="mb-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F9D5A] text-white shadow-md shadow-[#4F9D5A]/20">
                    <svg
                        className="h-7 w-7 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                        />
                    </svg>
                </div>
                <h1 className="mt-3 text-xl font-bold text-[#17201A] sm:text-2xl tracking-tight">
                    Xác thực số điện thoại
                </h1>
                <p className="mt-1 text-xs text-[#66716A]">
                    Kích hoạt gói <strong>Dùng thử 7 ngày</strong> cho {lakeName}
                </p>
            </div>

            <Card className="p-5 sm:p-7 space-y-4 shadow-xl border border-[#E3E8E3] rounded-2xl bg-white">
                {/* Benefits Notice */}
                <div className="rounded-xl border border-[#4F9D5A]/25 bg-[#E8F3E5] p-3 text-xs text-[#246B38] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                        <span>🎁</span>
                        <span>Đặc quyền kích hoạt ngay sau khi xác thực:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#246B38]/90">
                        <li>Gói <strong>Dùng thử 7 ngày</strong> miễn phí trọn bộ chức năng</li>
                        <li>Quản lý hồ câu, tạo vé, tính giờ tự động và báo cáo ca</li>
                        <li>Bảo vệ tài khoản và lịch sử giao dịch chính chủ</li>
                    </ul>
                </div>

                {error && (
                    <InlineAlert type="error" message={error} />
                )}

                {successMessage && (
                    <InlineAlert type="success" message={successMessage} />
                )}

                {devOtpHint && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                        🔑 <strong>Mã OTP thử nghiệm (DEV):</strong>{" "}
                        <span className="font-mono text-sm font-bold tracking-widest">{devOtpHint}</span>
                    </div>
                )}

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-[#17201A]">
                            Số điện thoại nhận mã SMS
                        </label>
                        <div className="mt-1 flex gap-2">
                            <Input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0901234567"
                                disabled={isLoading || isVerifying || (otpSent && countdown > 0)}
                                className="font-medium"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSendOtp}
                                disabled={isLoading || (otpSent && countdown > 0)}
                                className="shrink-0 text-xs font-bold border-[#4F9D5A] text-[#246B38] hover:bg-[#E8F3E5]"
                            >
                                {isLoading ? (
                                    "Đang gửi..."
                                ) : countdown > 0 ? (
                                    `Gửi lại (${countdown}s)`
                                ) : otpSent ? (
                                    "Gửi lại mã"
                                ) : (
                                    "Gửi mã OTP"
                                )}
                            </Button>
                        </div>
                    </div>

                    {otpSent && (
                        <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-semibold text-[#17201A] flex justify-between items-center">
                                <span>Nhập 6 chữ số mã OTP</span>
                                <span className="text-[11px] text-[#66716A]">Hiệu lực trong 3 phút</span>
                            </label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={otpCode}
                                onChange={(e) => onCodeChange(e.target.value)}
                                placeholder="••••••"
                                maxLength={6}
                                className="text-center font-mono text-lg tracking-[0.5em] font-bold py-3"
                                disabled={isVerifying}
                                autoFocus
                            />
                            <p className="text-[11px] text-[#66716A]">
                                Mã xác nhận đã được gửi đến số{" "}
                                <span className="font-semibold text-[#17201A]">{phone}</span>.
                            </p>

                            <Button
                                type="button"
                                onClick={() => handleVerifyOtp()}
                                disabled={isVerifying || otpCode.length !== 6}
                                className="w-full mt-3 bg-[#4F9D5A] text-white font-bold hover:bg-[#246B38] transition-colors py-2.5 shadow-sm"
                            >
                                {isVerifying ? "Đang xác thực..." : "Xác nhận & Kích hoạt gói 7 ngày"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer Account Switch */}
                <div className="pt-2 border-t border-[#E3E8E3] flex justify-between items-center text-xs text-[#66716A]">
                    <span>
                        Đang đăng nhập: <strong>{userName}</strong> ({email})
                    </span>
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-[#8B1E1E] hover:underline font-semibold cursor-pointer"
                    >
                        Đăng xuất
                    </button>
                </div>
            </Card>
        </main>
    );
}
