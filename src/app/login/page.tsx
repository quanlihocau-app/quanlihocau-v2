"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";

type LoginMode = "PHONE_OTP" | "EMAIL_PASSWORD";
type OtpStep = "PHONE" | "OTP";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isJustRegistered = searchParams.get("registered") === "1";
    const initialEmail = searchParams.get("email") || "";
    const initialPhone = searchParams.get("phone") || "";

    const [mode, setMode] = useState<LoginMode>("PHONE_OTP");
    const [otpStep, setOtpStep] = useState<OtpStep>("PHONE");

    // Phone OTP states
    const [phone, setPhone] = useState(initialPhone);
    const [otpCode, setOtpCode] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

    // Common states
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Countdown effect for resend OTP
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // Handle send OTP
    async function handleSendOtp(e?: FormEvent) {
        if (e) e.preventDefault();
        setError("");
        setIsSubmitting(true);
        setDevOtpHint(null);

        const cleanPhone = phone.trim();
        if (!cleanPhone) {
            setError("Vui lòng nhập số điện thoại.");
            setIsSubmitting(false);
            return;
        }

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

            setOtpStep("OTP");
            setCountdown(60);
            if (data.devOtp) {
                setDevOtpHint(data.devOtp);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi gửi mã OTP.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Handle verify OTP & login
    async function handleVerifyOtp(codeToVerify?: string) {
        const code = codeToVerify || otpCode;
        if (code.length !== 6) return;

        setError("");
        setIsSubmitting(true);

        try {
            // Sign in directly via NextAuth credentials phone-otp
            const result = await signIn("phone-otp", {
                redirect: false,
                phone: phone.trim(),
                code,
            });

            if (result?.error) {
                setError("Mã OTP không chính xác hoặc đã hết hạn.");
                setIsSubmitting(false);
                return;
            }

            router.push("/sessions");
            router.refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Đã xảy ra lỗi xác thực.";
            setError(message);
            setIsSubmitting(false);
        }
    }

    // Auto verify when 6 digits typed
    function handleOtpChange(val: string) {
        const digitsOnly = val.replace(/\D/g, "").slice(0, 6);
        setOtpCode(digitsOnly);
        if (digitsOnly.length === 6) {
            handleVerifyOtp(digitsOnly);
        }
    }

    // Handle Email & Password login
    async function handleEmailPasswordSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);

        const result = await signIn("credentials", {
            redirect: false,
            email: formData.get("email"),
            password: formData.get("password"),
        });

        if (result?.error) {
            setError("Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
            setIsSubmitting(false);
            return;
        }

        router.push("/sessions");
        router.refresh();
    }

    return (
        <Card className="p-5 sm:p-7 space-y-4 shadow-xl border border-[#E3E8E3] rounded-2xl bg-white">
            <div>
                <h1 className="text-xl font-bold text-[#17201A] sm:text-2xl tracking-tight">
                    Đăng nhập hệ thống
                </h1>
                <p className="mt-1 text-xs text-[#66716A]">
                    Quản lý hồ câu nhanh chóng, tiện lợi trên mọi thiết bị.
                </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 rounded-xl bg-[#EEF3EB] p-1 text-xs font-bold text-[#66716A]">
                <button
                    type="button"
                    onClick={() => {
                        setMode("PHONE_OTP");
                        setError("");
                    }}
                    className={`rounded-lg py-2 transition-all cursor-pointer ${
                        mode === "PHONE_OTP"
                            ? "bg-white text-[#246B38] shadow-xs"
                            : "hover:text-[#17201A]"
                    }`}
                >
                    📱 Số điện thoại (OTP)
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode("EMAIL_PASSWORD");
                        setError("");
                    }}
                    className={`rounded-lg py-2 transition-all cursor-pointer ${
                        mode === "EMAIL_PASSWORD"
                            ? "bg-white text-[#246B38] shadow-xs"
                            : "hover:text-[#17201A]"
                    }`}
                >
                    ✉️ Email &amp; Mật khẩu
                </button>
            </div>

            {isJustRegistered && (
                <InlineAlert
                    type="success"
                    title="Đăng ký hồ câu thành công!"
                    message="Tài khoản của bạn đã được khởi tạo. Vui lòng xác thực số điện thoại bằng mã SMS OTP để kích hoạt gói Dùng thử 7 ngày và vào ứng dụng."
                />
            )}

            {error && <InlineAlert type="error" message={error} />}

            {/* ── MODE 1: PHONE & OTP ─────────────────────────────────────── */}
            {mode === "PHONE_OTP" && (
                <div className="space-y-4 pt-1">
                    {otpStep === "PHONE" ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-xs font-semibold text-[#17201A] mb-1.5"
                                >
                                    Số điện thoại đăng nhập *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8A938D]">
                                        🇻🇳
                                    </span>
                                    <input
                                        id="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="0912 345 678"
                                        required
                                        disabled={isSubmitting}
                                        className="w-full rounded-xl border border-[#E3E8E3] bg-white py-3 pl-10 pr-4 text-base font-semibold text-[#17201A] placeholder-[#8A938D] focus:border-[#4F9D5A] focus:ring-2 focus:ring-[#4F9D5A]/20 focus:outline-none transition-colors"
                                    />
                                </div>
                                <p className="mt-1 text-[11px] text-[#66716A]">
                                    Nhập số điện thoại chủ hồ để nhận mã xác thực qua SMS.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                variant="primary"
                                isLoading={isSubmitting}
                                loadingText="Đang gửi mã…"
                                className="w-full font-bold shadow-md bg-[#4F9D5A] hover:bg-[#408249]"
                            >
                                Nhận mã xác thực OTP
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-xl bg-[#F7F9F5] border border-[#E3E8E3] p-3 text-center">
                                <p className="text-xs text-[#66716A]">Mã OTP 6 số đã được gửi tới</p>
                                <div className="flex items-center justify-center gap-2 mt-0.5">
                                    <span className="font-mono text-sm font-bold text-[#17201A]">{phone}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOtpStep("PHONE");
                                            setOtpCode("");
                                            setError("");
                                        }}
                                        className="text-[11px] font-bold text-[#4F9D5A] hover:underline"
                                    >
                                        (Đổi số)
                                    </button>
                                </div>
                            </div>

                            {devOtpHint && (
                                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center text-xs font-mono font-bold text-emerald-800">
                                    🔑 Mã OTP thử nghiệm: {devOtpHint}
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="otpInput"
                                    className="block text-xs font-semibold text-[#17201A] mb-1.5 text-center"
                                >
                                    Nhập mã 6 chữ số
                                </label>
                                <input
                                    id="otpInput"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    autoFocus
                                    value={otpCode}
                                    onChange={(e) => handleOtpChange(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black rounded-xl border border-[#E3E8E3] py-3 text-[#17201A] focus:border-[#4F9D5A] focus:ring-2 focus:ring-[#4F9D5A]/20 focus:outline-none transition-colors"
                                />
                            </div>

                            <Button
                                type="button"
                                onClick={() => handleVerifyOtp()}
                                size="lg"
                                variant="primary"
                                isLoading={isSubmitting}
                                loadingText="Đang xác thực…"
                                disabled={otpCode.length !== 6 || isSubmitting}
                                className="w-full font-bold shadow-md bg-[#4F9D5A] hover:bg-[#408249]"
                            >
                                Xác nhận &amp; Vào Dashboard
                            </Button>

                            <div className="text-center pt-1">
                                {countdown > 0 ? (
                                    <p className="text-xs text-[#66716A]">
                                        Gửi lại mã sau <strong className="text-[#17201A]">{countdown}s</strong>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSendOtp()}
                                        className="text-xs font-bold text-[#4F9D5A] hover:underline cursor-pointer"
                                    >
                                        Gửi lại mã OTP qua SMS
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── MODE 2: EMAIL & PASSWORD ─────────────────────────────────── */}
            {mode === "EMAIL_PASSWORD" && (
                <form onSubmit={handleEmailPasswordSubmit} className="space-y-4 pt-1">
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        label="Email đăng nhập *"
                        defaultValue={initialEmail}
                        placeholder="owner@example.com"
                        required
                        autoComplete="email"
                        disabled={isSubmitting}
                    />

                    <Input
                        id="password"
                        name="password"
                        type="password"
                        label="Mật khẩu *"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        disabled={isSubmitting}
                    />

                    <Button
                        type="submit"
                        size="lg"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang đăng nhập…"
                        className="w-full font-bold shadow-md bg-[#4F9D5A] hover:bg-[#408249]"
                    >
                        Đăng nhập vào quầy
                    </Button>
                </form>
            )}

            <div className="border-t border-[#E3E8E3] pt-4 text-center">
                <p className="text-xs text-[#66716A]">
                    Chưa có tài khoản hồ câu?
                </p>
                <Link
                    href="/register"
                    className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#4F9D5A]/30 bg-[#E8F3E5] px-4 text-xs font-bold text-[#246B38] hover:bg-[#D5E8D1] transition-colors"
                >
                    Đăng ký tạo hồ câu mới (Dùng thử miễn phí 7 ngày)
                </Link>
            </div>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-6 bg-[#F7F9F5]">
            {/* Header Brand */}
            <div className="mb-6 text-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 group focus:outline-none"
                    aria-label="Quản Lí Hồ Câu"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F9D5A] text-white shadow-md">
                        <svg
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                        <span className="text-sm font-bold tracking-wider text-[#17201A] uppercase">
                            QUẢN LÍ HỒ CÂU
                        </span>
                        <span className="text-[11px] font-semibold text-[#246B38]">
                            Phần mềm vận hành hồ câu dịch vụ
                        </span>
                    </div>
                </Link>
            </div>

            <Suspense fallback={
                <Card className="p-8 text-center text-xs text-[#766F67]">
                    Đang tải form đăng nhập…
                </Card>
            }>
                <LoginForm />
            </Suspense>
        </main>
    );
}