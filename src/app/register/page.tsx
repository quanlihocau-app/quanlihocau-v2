"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { registerUser } from "@/app/actions/auth";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [lakeName, setLakeName] = useState("");
    const [error, setError] = useState<string | null>(null);

    async function registerWithGoogle() {
        setLoading(true);
        await signIn("google", {
            callbackUrl: "/api/auth/sync-session?next=/dashboard",
        });
    }

    async function registerWithPhone(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        const result = await registerUser({
            name,
            phone,
            password,
            lakeName,
        });
        setLoading(false);
        if (!result.success) {
            setError(result.message || "Không đăng ký được.");
            return;
        }
        router.push("/login?registered=1");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white shadow-md">
                    🎣
                </div>
                <h1 className="text-center text-2xl font-bold text-slate-900">Tạo tài khoản hồ câu</h1>
                <p className="mt-2 text-center text-sm leading-6 text-slate-600">
                    Đăng ký bằng số điện thoại và mật khẩu để dùng thử 30 ngày. Không cần Gmail.
                </p>
                <form onSubmit={registerWithPhone} className="mt-6 space-y-3">
                    <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Họ tên chủ hồ" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    <input required value={lakeName} onChange={(event) => setLakeName(event.target.value)} placeholder="Tên hồ câu" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    <input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại 0901234567" inputMode="tel" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu, ít nhất 8 ký tự" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    {error && <p className="text-xs font-medium text-red-700">{error}</p>}
                    <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-60">
                        {loading ? "Đang tạo tài khoản…" : "Đăng ký và dùng thử 30 ngày"}
                    </button>
                </form>
                <button
                    type="button"
                    onClick={registerWithGoogle}
                    disabled={loading}
                    className="mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                    <span aria-hidden="true" className="text-lg font-bold text-[#4285F4]">G</span>
                    Đăng ký bằng Google
                </button>
                <p className="mt-5 text-center text-xs text-slate-500">
                    Đã có tài khoản? <a href="/login" className="font-semibold text-emerald-700 hover:underline">Đăng nhập</a>
                </p>
            </section>
        </main>
    );
}
