"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
            setError("Email hoặc mật khẩu không đúng.");
            setIsSubmitting(false);
            return;
        }

        router.push("/dashboard");
        router.refresh();
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
            <form
                onSubmit={handleSubmit}
                className="w-full space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
            >
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Đăng nhập để quản lý hồ câu của bạn.
                    </p>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                    Email
                    <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                    Mật khẩu
                    <input
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </label>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
                >
                    {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
            </form>
        </main>
    );
}