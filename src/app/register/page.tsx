"use client";

import { FormEvent, useState } from "react";

export default function RegisterPage() {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess(false);
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);

        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fullName: formData.get("fullName"),
                email: formData.get("email"),
                password: formData.get("password"),
                organizationName: formData.get("organizationName"),
                lakeName: formData.get("lakeName"),
            }),
        });

        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
            setError(result.error ?? "Đăng ký chưa thành công.");
            setIsSubmitting(false);
            return;
        }

        setSuccess(true);
        event.currentTarget.reset();
        setIsSubmitting(false);
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
            <form
                onSubmit={handleSubmit}
                className="w-full space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
            >
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Tạo hồ câu mới
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Tài khoản này sẽ là chủ hồ (OWNER).
                    </p>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                    Họ và tên
                    <input
                        name="fullName"
                        required
                        minLength={2}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                    Email
                    <input
                        name="email"
                        type="email"
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                    Mật khẩu
                    <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                    Tên doanh nghiệp
                    <input
                        name="organizationName"
                        required
                        minLength={2}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                    Tên hồ câu
                    <input
                        name="lakeName"
                        required
                        minLength={2}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </label>

                {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : null}

                {success ? (
                    <p className="text-sm text-green-700">
                        Đăng ký thành công. Tiếp theo bạn sẽ đăng nhập.
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
                >
                    {isSubmitting ? "Đang tạo..." : "Tạo hồ câu"}
                </button>
            </form>
        </main>
    );
}