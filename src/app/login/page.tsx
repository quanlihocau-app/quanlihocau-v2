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

    const [mode, setMode] = useState<LoginMode>("PHONE_OTP");
    const [otpStep, setOtpStep] = useState<OtpStep>("PHONE");

    // Phone OTP states
    const [phone, setPhone] = useState("");
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
        <Card className="p-5 sm:p-7 space-y-4 shadow-xl border border-[#D9D2C8] rounded-2xl bg-white">
            <div>
                <h1 className="text-xl font-bold text-[#27231F] sm:text-2xl tracking-tight">
                    Đăng nhập hệ thống
                </h1>
                <p className="mt-1 text-xs text-[#766F67]">
                    Quản lý hồ câu nhanh chóng, tiện lợi trên mọi thiết bị.
                </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 rounded-xl bg-[#F4F2EE] p-1 text-xs font-bold text-[#766F67]">
                <button
                    type="button"
                    onClick={() => {
                        setMode("PHONE_OTP");
                        setError("");
                    }}
                    className={`rounded-lg py-2 transition-all cursor-pointer ${
                        mode === "PHONE_OTP"
                            ? "bg-white text-[#8A5A20] shadow-xs"
                            : "hover:text-[#27231F]"
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
                            ? "bg-white text-[#8A5A20] shadow-xs"
                            : "hover:text-[#27231F]"
                    }`}
                >
                    ✉️ Email &amp; Mật khẩu
                </button>
            </div>

            {isJustRegistered && (
                <InlineAlert
                    type="success"
                    title="Đăng ký hồ câu thành công!"
                    message="Tài khoản của bạn đã được khởi tạo. Vui lòng nhập mật khẩu hoặc số điện thoại để đăng nhập."
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
                                    htmlFor="phoneInput"
                                    className="block text-xs font-semibold text-[#27231F] mb-1.5"
                                >
                                    Số điện thoại di động *
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-[#766F67] font-bold">
                                        🇻🇳
                                    </div>
                                    <input
                                        id="phoneInput"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="0912 345 678"
                                        required
                                        disabled={isSubmitting}
                                        className="w-full rounded-xl border border-[#D9D2C8] bg-white py-3 pl-10 pr-4 text-base font-semibold text-[#27231F] placeholder-[#A8A29E] focus:border-[#8A5A20] focus:ring-2 focus:ring-[#8A5A20]/20 focus:outline-none"
                                    />
                                </div>
                                <p className="mt-1 text-[11px] text-[#766F67]">
                                    Nhập số điện thoại chủ hồ để nhận mã xác thực qua SMS.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                variant="primary"
                                isLoading={isSubmitting}
                                loadingText="Đang gửi mã…"
                                className="w-full font-bold shadow-md"
                            >
                                Nhận mã xác thực OTP
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-xl bg-[#FAF8F5] border border-[#EBE6DF] p-3 text-center">
                                <p className="text-xs text-[#766F67]">Mã OTP 6 số đã được gửi tới</p>
                                <div className="flex items-center justify-center gap-2 mt-0.5">
                                    <span className="font-mono text-sm font-bold text-[#102A43]">{phone}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOtpStep("PHONE");
                                            setOtpCode("");
                                            setError("");
                                        }}
                                        className="text-[11px] font-bold text-[#8A5A20] hover:underline"
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
                                    className="block text-xs font-semibold text-[#27231F] mb-1.5 text-center"
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
                                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black rounded-xl border border-[#D9D2C8] py-3 text-[#27231F] focus:border-[#8A5A20] focus:ring-2 focus:ring-[#8A5A20]/20 focus:outline-none"
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
                                className="w-full font-bold shadow-md"
                            >
                                Xác nhận &amp; Vào Dashboard
                            </Button>

                            <div className="text-center pt-1">
                                {countdown > 0 ? (
                                    <p className="text-xs text-[#766F67]">
                                        Gửi lại mã sau <strong className="text-[#27231F]">{countdown}s</strong>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSendOtp()}
                                        className="text-xs font-bold text-[#8A5A20] hover:underline cursor-pointer"
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
                        className="w-full font-bold shadow-md"
                    >
                        Đăng nhập vào quầy
                    </Button>
                </form>
            )}

            <div className="border-t border-[#D9D2C8] pt-4 text-center">
                <p className="text-xs text-[#766F67]">
                    Chưa có tài khoản hồ câu?
                </p>
                <Link
                    href="/register"
                    className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#D9D2C8] bg-[#FAF8F5] px-4 text-xs font-bold text-[#8A5A20] hover:bg-[#F4F2EE] transition-colors"
                >
                    Đăng ký tạo hồ câu mới (Dùng thử miễn phí 30 ngày)
                </Link>
            </div>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-6">
            {/* Header Brand */}
            <div className="mb-6 text-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 group focus:outline-none"
                    aria-label="Quản Lí Hồ Câu"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8A5A20] text-white shadow-md">
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
                        <span className="text-sm font-bold tracking-wider text-[#27231F] uppercase">
                            QUẢN LÍ HỒ CÂU
                        </span>
                        <span className="text-[11px] font-semibold text-[#8A5A20]">
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