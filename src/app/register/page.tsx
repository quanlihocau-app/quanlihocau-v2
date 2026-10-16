"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);

    async function registerWithGoogle() {
        setLoading(true);
        await signIn("google", {
            callbackUrl: "/api/auth/sync-session?next=/dashboard",
        });
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white shadow-md">
                    🎣
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản hồ câu</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Tiếp tục bằng Google để tạo tài khoản chủ hồ và bắt đầu dùng thử miễn phí 7 ngày.
                    Tên hồ ban đầu sẽ được tạo tự động và có thể chỉnh trong phần cài đặt.
                </p>
                <button
                    type="button"
                    onClick={registerWithGoogle}
                    disabled={loading}
                    className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                    <span aria-hidden="true" className="text-lg font-bold text-[#4285F4]">G</span>
                    {loading ? "Đang chuyển đến Google..." : "Đăng ký bằng Google"}
                </button>
                <p className="mt-5 text-xs text-slate-500">
                    Đã có tài khoản? <a href="/login" className="font-semibold text-emerald-700 hover:underline">Đăng nhập</a>
                </p>
            </section>
        </main>
    );
}
