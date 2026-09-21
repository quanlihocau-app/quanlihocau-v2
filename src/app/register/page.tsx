"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { registerUser } from "@/app/actions/auth";

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setFieldErrors({});
        setSuccessMessage("");
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "");
        const lakeName = String(formData.get("lakeName") || "").trim();

        // 1. Client pre-validation
        if (!name) {
            setError("Họ và tên chủ hồ không được để trống.");
            setIsSubmitting(false);
            return;
        }

        if (!email) {
            setError("Địa chỉ email không được để trống.");
            setIsSubmitting(false);
            return;
        }

        if (password.length < 6) {
            setError("Mật khẩu phải có tối thiểu 6 ký tự.");
            setIsSubmitting(false);
            return;
        }

        if (phone) {
            const cleanedPhone = phone.replace(/[\s.\-()]/g, "");
            const vnPhoneRegex = /^(0|84|\+84)(3|5|7|8|9)([0-9]{8})$/;
            if (!vnPhoneRegex.test(cleanedPhone)) {
                setError("Số điện thoại không đúng định dạng di động Việt Nam (VD: 0901234567).");
                setIsSubmitting(false);
                return;
            }
        }

        try {
            // 2. Thực thi Server Action (Chuẩn ACID & Neon Connection Pooling)
            const result = await registerUser({
                name,
                email,
                password,
                phone: phone || undefined,
                lakeName: lakeName || undefined,
            });

            if (!result.success) {
                setError(result.message);
                setIsSubmitting(false);
                return;
            }

            setSuccessMessage(
                "Đăng ký tài khoản thành công! Đang chuyển hướng vào bảng điều khiển...",
            );

            // Đồng bộ thêm phiên đăng nhập NextAuth client-side nếu cần
            try {
                await signIn("credentials", {
                    redirect: false,
                    email,
                    password,
                });
            } catch {
                // Cookie qa_session từ Server Action đã được lưu tự động trên server
            }

            // Chuyển hướng trực tiếp vào /dashboard
            router.push("/dashboard");
            router.refresh();
        } catch {
            setError("Lỗi kết nối máy chủ trong quá trình đăng ký. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 bg-transparent">
            {/* Header Brand */}
            <div className="mb-6 text-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 group focus:outline-none"
                    aria-label="Quản Lí Hồ Câu"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#246B38] text-white shadow-md">
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
                        <span className="text-sm font-black tracking-wider text-white uppercase drop-shadow-sm">
                            QUẢN LÍ HỒ CÂU
                        </span>
                        <span className="text-[11px] font-bold text-emerald-300">
                            Phần mềm vận hành hồ câu dịch vụ
                        </span>
                    </div>
                </Link>
            </div>

            {/* Registration Form Card */}
            <Card className="p-6 sm:p-7 space-y-5 border border-[#E3E8E3] shadow-xl rounded-2xl bg-white">
                <div>
                    <span className="text-[11px] font-bold tracking-wider text-[#246B38] uppercase block mb-1">
                        QUẢN LÝ HỒ CÂU SAAS
                    </span>
                    <h1 className="text-xl font-bold text-[#17201A] sm:text-2xl">
                        Tạo tài khoản Chủ hồ
                    </h1>
                    <p className="mt-1 text-xs text-[#66716A]">
                        Đăng ký tài khoản quản trị để trải nghiệm trọn gói 30 ngày dùng thử miễn phí, không giới hạn tính năng.
                    </p>
                </div>

                {/* Banner lưu ý quyền lợi & thông tin thực tế */}
                <div className="rounded-xl border border-[#246B38]/30 bg-[#F2F8F4] p-3.5 text-xs text-[#17201A] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#246B38]">
                        <svg
                            className="h-4 w-4 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        </svg>
                        <span>Gói dùng thử 30 ngày tự động kích hoạt</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#4F5952]">
                        Sau khi hoàn tất đăng ký, hệ thống tự động gán vai trò <strong>Chủ hồ (OWNER)</strong>, tạo ngay cơ sở hồ câu và mở đầy đủ tính năng tính giờ, bán đồ, in bill, báo cáo doanh thu.
                    </p>
                </div>

                {error && <InlineAlert type="error" message={error} />}

                {successMessage && (
                    <InlineAlert type="success" message={successMessage} />
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="name"
                        name="name"
                        label="Họ và tên chủ hồ *"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        required
                        minLength={2}
                        disabled={isSubmitting}
                        error={fieldErrors.name?.[0]}
                    />

                    <Input
                        id="email"
                        name="email"
                        type="email"
                        label="Địa chỉ Email *"
                        placeholder="tenban@gmail.com"
                        required
                        disabled={isSubmitting}
                        helperText="Dùng để đăng nhập chính và nhận thông báo doanh thu."
                        error={fieldErrors.email?.[0]}
                    />

                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        label="Số điện thoại di động"
                        placeholder="Ví dụ: 0912345678 (tùy chọn)"
                        disabled={isSubmitting}
                        helperText="Dùng để đăng nhập nhanh qua SMS OTP hoặc khôi phục mật khẩu."
                        error={fieldErrors.phone?.[0]}
                    />

                    <Input
                        id="password"
                        name="password"
                        type="password"
                        label="Mật khẩu *"
                        placeholder="Tối thiểu 6 ký tự"
                        required
                        minLength={6}
                        disabled={isSubmitting}
                        error={fieldErrors.password?.[0]}
                    />

                    <Input
                        id="lakeName"
                        name="lakeName"
                        label="Tên hồ câu của bạn"
                        placeholder="Ví dụ: Hồ Câu Cá Giải Trí Xanh (tùy chọn)"
                        disabled={isSubmitting}
                        helperText="Nếu để trống, hệ thống sẽ tự động đặt theo họ tên của bạn."
                        error={fieldErrors.lakeName?.[0]}
                    />

                    <p className="text-[11px] leading-relaxed text-[#766F67] text-center pt-1">
                        Bằng việc bấm Tạo tài khoản, bạn đồng ý với{" "}
                        <Link href="/dieu-khoan" target="_blank" className="font-semibold text-[#246B38] underline">
                            Điều khoản dịch vụ
                        </Link>{" "}
                        và{" "}
                        <Link href="/chinh-sach-bao-mat" target="_blank" className="font-semibold text-[#246B38] underline">
                            Chính sách bảo mật
                        </Link>{" "}
                        của Quản Lý Hồ Câu.
                    </p>

                    <Button
                        type="submit"
                        size="lg"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang khởi tạo tài khoản…"
                        className="w-full bg-[#246B38] hover:bg-[#1E5A2F] text-white font-bold"
                    >
                        Tạo tài khoản &amp; Bắt đầu dùng thử
                    </Button>
                </form>

                {/* Link sang trang Đăng nhập */}
                <div className="border-t border-[#E3E8E3] pt-4 text-center">
                    <p className="text-xs text-[#66716A]">
                        Đã có tài khoản từ trước?
                    </p>
                    <Link
                        href="/login"
                        className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#E3E8E3] bg-[#EEF3EB] px-4 text-xs font-bold text-[#17201A] hover:bg-[#E3E8E3] transition-colors"
                    >
                        Đăng nhập ngay
                    </Link>
                </div>
            </Card>
        </main>
    );
}
