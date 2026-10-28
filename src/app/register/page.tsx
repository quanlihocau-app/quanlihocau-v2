"use client";

import { signIn } from "next-auth/react";
import { useRef, useState, type FormEvent } from "react";
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
    const [showPassword, setShowPassword] = useState(false);
    const inFlight = useRef(false);

    async function registerWithGoogle() {
        if (inFlight.current) return;
        inFlight.current = true;
        setLoading(true);
        setError(null);
        try {
            await signIn("google", {
                callbackUrl: "/api/auth/sync-session?next=/dashboard",
            });
        } catch {
            setError("Chưa kết nối được với Google. Vui lòng thử lại hoặc đăng ký bằng số điện thoại.");
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }

    async function registerWithPhone(event: FormEvent) {
        event.preventDefault();
        if (inFlight.current) return;
        inFlight.current = true;
        setLoading(true);
        setError(null);
        try {
            const result = await registerUser({ name, phone, password, lakeName });
            if (!result.success) {
                setError(result.message || "Không đăng ký được.");
                return;
            }
            router.push("/login?registered=1");
        } catch {
            setError("Chưa nhận được kết quả đăng ký. Hãy thử đăng nhập bằng số điện thoại vừa nhập trước khi đăng ký lại.");
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
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
                <form onSubmit={registerWithPhone} aria-busy={loading} className="mt-6 space-y-3">
                    <label htmlFor="owner-name" className="block text-sm font-medium text-slate-700">Họ tên chủ hồ</label>
                    <input id="owner-name" name="name" autoComplete="name" maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Họ tên chủ hồ" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    <label htmlFor="lake-name" className="block text-sm font-medium text-slate-700">Tên hồ câu</label>
                    <input id="lake-name" name="lakeName" maxLength={200} required value={lakeName} onChange={(event) => setLakeName(event.target.value)} placeholder="Tên hồ câu" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    <label htmlFor="owner-phone" className="block text-sm font-medium text-slate-700">Số điện thoại đăng nhập</label>
                    <input id="owner-phone" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại 0901234567" inputMode="tel" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    <label htmlFor="owner-password" className="block text-sm font-medium text-slate-700">Mật khẩu (ít nhất 8 ký tự)</label>
                    <input id="owner-password" name="password" autoComplete="new-password" required type={showPassword ? "text" : "password"} minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu, ít nhất 8 ký tự" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    <button type="button" aria-controls="owner-password" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="min-h-11 text-sm font-semibold text-emerald-800 underline">{showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</button>
                    {error && <p role="alert" className="text-sm font-medium text-red-700">{error} <a href="/login" className="underline">Đi tới đăng nhập</a></p>}
                    <p className="text-xs leading-5 text-slate-600">Sau khi tạo tài khoản, bạn đăng nhập bằng số điện thoại và mật khẩu. Hiện không cần mã SMS. Chủ hồ có thể chỉnh lại ô câu, bảng giá và hàng hóa mẫu trong phần cài đặt.</p>
                    <p className="text-xs leading-5 text-slate-600">Khi đăng ký, bạn đồng ý với <a href="/dieu-khoan" className="text-emerald-800 underline">Điều khoản dịch vụ</a> và <a href="/chinh-sach-bao-mat" className="text-emerald-800 underline">Chính sách bảo mật</a>.</p>
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
