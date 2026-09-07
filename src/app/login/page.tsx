"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isJustRegistered = searchParams.get("registered") === "1";
    const initialEmail = searchParams.get("email") || "";
    const initialPhone = searchParams.get("phone") || "";

    // Allow user to log in with either phone number or email
    const [identifier, setIdentifier] = useState(initialPhone || initialEmail);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const cleanIdentifier = identifier.trim();
        if (!cleanIdentifier) {
            setError("Vui lòng nhập số điện thoại hoặc email.");
            return;
        }

        if (!password) {
            setError("Vui lòng nhập mật khẩu.");
            return;
        }

        setIsSubmitting(true);

        try {
            // NextAuth credentials provider accepts either email or phone in the "email" field
            const result = await signIn("credentials", {
                redirect: false,
                email: cleanIdentifier,
                password,
            });

            if (result?.error) {
                setError("Số điện thoại, email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
                setIsSubmitting(false);
                return;
            }

            router.push("/sessions");
            router.refresh();
        } catch {
            setError("Đã xảy ra lỗi kết nối. Vui lòng kiểm tra lại đường truyền mạng.");
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="p-6 sm:p-8 space-y-5 shadow-xl border border-[#E3E8E3] rounded-2xl bg-white">
            <div className="text-center sm:text-left">
                <h1 className="text-2xl font-black text-[#17201A] tracking-tight">
                    Đăng nhập hệ thống
                </h1>
                <p className="mt-1 text-xs text-[#66716A]">
                    Nhập số điện thoại hoặc email để vào quầy quản lý hồ câu.
                </p>
            </div>

            {/* Thông báo đăng ký thành công nếu vừa chuyển từ trang đăng ký */}
            {isJustRegistered && (
                <InlineAlert
                    type="success"
                    title="Đăng ký hồ câu thành công!"
                    message="Tài khoản của bạn đã được kích hoạt gói dùng thử 7 ngày miễn phí toàn bộ tính năng. Vui lòng đăng nhập để bắt đầu."
                />
            )}

            {error && <InlineAlert type="error" message={error} />}

            {/* Form đăng nhập tinh gọn 1 bước */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="identifier"
                        className="block text-xs font-semibold text-[#17201A] mb-1.5"
                    >
                        Số điện thoại hoặc Email *
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8A938D]">
                            👤
                        </span>
                        <input
                            id="identifier"
                            type="text"
                            autoComplete="username"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="0912 345 678 hoặc email@example.com"
                            required
                            disabled={isSubmitting}
                            autoFocus={!identifier}
                            className="w-full rounded-xl border border-[#E3E8E3] bg-white py-3 pl-10 pr-4 text-sm font-semibold text-[#17201A] placeholder-[#8A938D] focus:border-[#4F9D5A] focus:ring-2 focus:ring-[#4F9D5A]/20 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label
                            htmlFor="password"
                            className="block text-xs font-semibold text-[#17201A]"
                        >
                            Mật khẩu *
                        </label>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8A938D]">
                            🔒
                        </span>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            required
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-[#E3E8E3] bg-white py-3 pl-10 pr-11 text-sm font-semibold text-[#17201A] placeholder-[#8A938D] focus:border-[#4F9D5A] focus:ring-2 focus:ring-[#4F9D5A]/20 focus:outline-none transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8A938D] hover:text-[#17201A] focus:outline-none"
                            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    isLoading={isSubmitting}
                    loadingText="Đang đăng nhập…"
                    className="w-full font-bold shadow-md bg-[#4F9D5A] hover:bg-[#408249] text-base py-3.5 mt-2"
                >
                    Đăng nhập vào hồ câu
                </Button>
            </form>

            <div className="border-t border-[#E3E8E3] pt-5 text-center space-y-2">
                <p className="text-xs text-[#66716A]">
                    Chưa có tài khoản quản lý hồ câu?
                </p>
                <Link
                    href="/register"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#4F9D5A]/30 bg-[#E8F3E5] px-4 text-xs font-bold text-[#246B38] hover:bg-[#D5E8D1] transition-colors"
                >
                    Đăng ký tạo hồ câu (Dùng thử miễn phí 7 ngày)
                </Link>
                <div className="flex items-center justify-center gap-3 text-[11px] text-[#8A938D] pt-1">
                    <span>✓ Kích hoạt tức thì</span>
                    <span>•</span>
                    <span>✓ 7 ngày trải nghiệm trọn vẹn</span>
                </div>
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

            <Suspense
                fallback={
                    <Card className="p-8 text-center text-xs text-[#766F67]">
                        Đang tải form đăng nhập…
                    </Card>
                }
            >
                <LoginForm />
            </Suspense>
        </main>
    );
}