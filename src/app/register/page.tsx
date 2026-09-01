"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess(false);
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const fullName = String(formData.get("fullName") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "");
        const lakeName = String(formData.get("lakeName") || "").trim();

        if (!fullName) {
            setError("Họ và tên chủ hồ không được để trống.");
            setIsSubmitting(false);
            return;
        }

        if (!phone) {
            setError("Số điện thoại không được để trống.");
            setIsSubmitting(false);
            return;
        }

        // Clean space/dots/hyphens/parentheses to validate VN mobile format
        const cleanedPhone = phone.replace(/[\s.\-()]/g, "");
        const vnPhoneRegex = /^(0|84|\+84)(3|5|7|8|9)([0-9]{8})$/;
        if (!vnPhoneRegex.test(cleanedPhone)) {
            setError("Số điện thoại không đúng định dạng di động Việt Nam (VD: 0901234567).");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fullName,
                    phone,
                    email,
                    password,
                    lakeName,
                }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setError(result.error ?? "Đăng ký chưa thành công. Vui lòng kiểm tra lại thông tin.");
                setIsSubmitting(false);
                return;
            }

            setSuccess(true);
            setIsSubmitting(false);

            // Chuyển hướng ngay sang trang đăng nhập
            setTimeout(() => {
                router.push(`/login?registered=1&email=${encodeURIComponent(email)}`);
            }, 600);
        } catch {
            setError("Lỗi kết nối mạng khi đăng ký. Vui lòng thử lại.");
            setIsSubmitting(false);
        }
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6">
            {/* Header Brand */}
            <div className="mb-6 text-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 group focus:outline-none"
                    aria-label="Quản Lí Hồ Câu"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8A5A20] text-white">
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

            {/* Registration Form Card */}
            <Card className="p-6 sm:p-7 space-y-5">
                <div>
                    <span className="text-[11px] font-bold tracking-wider text-[#8A5A20] uppercase block mb-1">
                        QUẢN LÝ HỒ CÂU
                    </span>
                    <h1 className="text-xl font-bold text-[#27231F] sm:text-2xl">
                        Tạo hồ câu mới
                    </h1>
                    <p className="mt-1 text-xs text-[#766F67]">
                        Tài khoản đăng ký sẽ là Chủ hồ (OWNER) có toàn quyền quản trị.
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#766F67]">
                        Vui lòng nhập đúng họ tên và số điện thoại đang sử dụng để được hỗ trợ khi cần. Không đăng ký thông tin giả hoặc tạo nhiều tài khoản.
                    </p>
                </div>

                {/* Thông báo nhắc nhở khai báo thông tin thực tế */}
                <div className="rounded-xl border border-[#9A4C16]/30 bg-[#F8ECE2] p-3.5 text-xs text-[#27231F] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#9A4C16]">
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
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                            />
                        </svg>
                        <span>Lưu ý thông tin đăng ký:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#766F67]">
                        Vui lòng nhập <strong className="text-[#27231F]">Email</strong>, <strong className="text-[#27231F]">Số điện thoại</strong> và <strong className="text-[#27231F]">Tên hồ câu chính xác</strong> để phục vụ đăng nhập, quản lý vận hành và nhận hỗ trợ tài khoản khi cần thiết.
                    </p>
                </div>

                {error && <InlineAlert type="error" message={error} />}

                {success && (
                    <InlineAlert
                        type="success"
                        message="Đăng ký thành công! Đang chuyển hướng sang trang đăng nhập…"
                    />
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="fullName"
                        name="fullName"
                        label="Họ và tên chủ hồ *"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        required
                        minLength={2}
                        disabled={isSubmitting}
                    />

                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        label="Số điện thoại chủ hồ *"
                        placeholder="Ví dụ: 0912345678"
                        required
                        disabled={isSubmitting}
                    />

                    <Input
                        id="email"
                        name="email"
                        type="email"
                        label="Địa chỉ Email chính xác *"
                        placeholder="tenban@gmail.com"
                        required
                        disabled={isSubmitting}
                        helperText="Dùng để đăng nhập và nhận thông tin tài khoản."
                    />

                    <Input
                        id="password"
                        name="password"
                        type="password"
                        label="Mật khẩu *"
                        placeholder="Tối thiểu 8 ký tự"
                        required
                        minLength={8}
                        disabled={isSubmitting}
                    />

                    <Input
                        id="lakeName"
                        name="lakeName"
                        label="Tên hồ câu hoạt động *"
                        placeholder="Ví dụ: Hồ Câu Đồng Quê Cơ Sở 1"
                        required
                        minLength={2}
                        disabled={isSubmitting}
                    />

                    <Button
                        type="submit"
                        size="lg"
                        variant="primary"
                        isLoading={isSubmitting}
                        loadingText="Đang tạo hồ câu…"
                        className="w-full"
                    >
                        Tạo hồ câu &amp; Bắt đầu
                    </Button>
                </form>

                {/* Link sang trang Đăng nhập cho ai đã có tài khoản */}
                <div className="border-t border-[#D9D2C8] pt-4 text-center">
                    <p className="text-xs text-[#766F67]">
                        Đã có tài khoản hồ câu từ trước?
                    </p>
                    <Link
                        href="/login"
                        className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[#D9D2C8] bg-white px-4 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] transition-colors"
                    >
                        Đăng nhập ngay
                    </Link>
                </div>
            </Card>
        </main>
    );
}
