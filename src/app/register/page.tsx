"use client";

import { signIn } from "next-auth/react";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { loginUser, registerUser } from "@/app/actions/auth";

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
                callbackUrl: "/api/auth/sync-session?next=/sessions",
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
            const resolvedLakeName = lakeName.trim() || "Hồ câu của tôi";
            const resolvedName = name.trim() || `Chủ ${resolvedLakeName}`;
            const result = await registerUser({
                name: resolvedName,
                phone,
                password,
                lakeName: resolvedLakeName,
            });
            if (!result.success) {
                setError(result.message || "Không đăng ký được.");
                return;
            }

            let autoLoggedIn = false;
            if (typeof loginUser === "function") {
                try {
                    const loginResult = await loginUser({ email: phone, password });
                    if (loginResult?.success) {
                        autoLoggedIn = true;
                        try {
                            const resolvedEmail = (loginResult as { email?: string }).email || phone;
                            await signIn("credentials", {
                                redirect: false,
                                email: resolvedEmail,
                                password,
                            });
                        } catch {
                            // Fallback cookie qa_session is already active from loginUser
                        }
                    }
                } catch {
                    // Fallback to login screen if auto-login fails
                }
            }

            router.push(autoLoggedIn ? "/sessions" : "/login?registered=1");
        } catch {
            setError(
                "Chưa nhận được kết quả đăng ký. Hãy thử đăng nhập bằng số điện thoại vừa nhập trước khi đăng ký lại.",
            );
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#F8FAF8] text-[#111827] antialiased">
            {/* Minimal Top Header */}
            <header className="border-b border-[#E2E8F0] bg-white">
                <div className="mx-auto flex min-h-17 max-w-5xl items-center justify-between px-4 sm:px-6">
                    <button type="button" onClick={() => router.push("/")} className="flex items-center gap-2.5 text-left cursor-pointer">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B3B2B] text-sm font-extrabold text-white">
                            HC
                        </span>
                        <span>
                            <strong className="block text-sm font-extrabold text-[#1B3B2B]">Quản Lý Hồ Câu</strong>
                            <span className="block text-[11px] text-[#64748B]">Khởi tạo hồ dùng thử miễn phí</span>
                        </span>
                    </button>
                    <div className="flex items-center gap-3 text-xs font-semibold">
                        <a
                            href="/preview"
                            className="hidden rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[#334155] hover:border-[#1B3B2B] hover:text-[#1B3B2B] sm:inline-block"
                        >
                            Xem quầy mẫu không cần đăng ký
                        </a>
                        <a
                            href="/login"
                            className="rounded-lg bg-[#E8F0EC] px-3.5 py-2 font-bold text-[#1B3B2B] hover:bg-[#d6e6dd]"
                        >
                            Đã có tài khoản? Đăng nhập
                        </a>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:items-start lg:py-12">
                {/* Left Column: Registration Form */}
                <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs sm:p-8 lg:col-span-7">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CFE0D6] bg-[#E8F0EC] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#1B3B2B]">
                        <span className="h-2 w-2 rounded-full bg-[#1B3B2B]" />
                        Miễn phí 30 ngày · Tự động vào thẳng quầy thu ngân
                    </div>

                    <h1
                        className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl"
                        style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                    >
                        Mở hồ câu của bạn trong 10 giây
                    </h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">
                        Hệ thống tự động tạo sẵn <strong>6 chòi mẫu, gói câu 4 giờ, nước ngọt &amp; mồi câu</strong> để
                        bạn bấm thử vé đầu tiên ngay lập tức.
                    </p>

                    {/* Primary 1-Click Google Signup */}
                    <button
                        type="button"
                        onClick={registerWithGoogle}
                        disabled={loading}
                        className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-bold text-[#111827] shadow-2xs transition hover:border-[#1B3B2B] hover:bg-[#F8FAF8] disabled:opacity-60 cursor-pointer"
                    >
                        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
                            <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                            />
                            <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
                            />
                            <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                            />
                        </svg>
                        <span>Tiếp tục nhanh bằng Google (1 chạm)</span>
                    </button>

                    <div className="my-5 flex items-center gap-3">
                        <span className="h-px flex-1 bg-[#E2E8F0]" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                            HOẶC ĐĂNG KÝ BẰNG SỐ ĐIỆN THOẠI (KHÔNG CẦN GMAIL)
                        </span>
                        <span className="h-px flex-1 bg-[#E2E8F0]" />
                    </div>

                    <form onSubmit={registerWithPhone} aria-busy={loading} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="owner-phone" className="mb-1 block text-xs font-bold text-[#1E293B]">
                                    Số điện thoại đăng nhập <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="owner-phone"
                                    name="phone"
                                    type="tel"
                                    autoComplete="tel"
                                    required
                                    value={phone}
                                    onChange={(event) => setPhone(event.target.value)}
                                    placeholder="Ví dụ: 0901234567"
                                    inputMode="tel"
                                    className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-sm font-medium text-[#111827] tabular-nums focus:border-[#1B3B2B] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20"
                                />
                            </div>

                            <div>
                                <label htmlFor="owner-password" className="mb-1 block text-xs font-bold text-[#1E293B]">
                                    Mật khẩu (tối thiểu 8 ký tự) <span className="text-red-600">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="owner-password"
                                        name="password"
                                        autoComplete="new-password"
                                        required
                                        type={showPassword ? "text" : "password"}
                                        minLength={8}
                                        maxLength={128}
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Nhập ít nhất 8 ký tự"
                                        className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white pl-3.5 pr-16 text-sm text-[#111827] focus:border-[#1B3B2B] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20"
                                    />
                                    <button
                                        type="button"
                                        aria-controls="owner-password"
                                        aria-pressed={showPassword}
                                        onClick={() => setShowPassword((value) => !value)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-bold text-[#1B3B2B] hover:bg-[#E8F0EC]"
                                    >
                                        {showPassword ? "Ẩn" : "Hiện"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="lake-name" className="mb-1 block text-xs font-semibold text-[#475569]">
                                    Tên hồ câu (Có thể đổi sau)
                                </label>
                                <input
                                    id="lake-name"
                                    name="lakeName"
                                    maxLength={200}
                                    value={lakeName}
                                    onChange={(event) => setLakeName(event.target.value)}
                                    placeholder="VD: Hồ Câu An Nhiên"
                                    className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAF8] px-3.5 text-sm text-[#111827] focus:border-[#1B3B2B] focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="owner-name" className="mb-1 block text-xs font-semibold text-[#475569]">
                                    Tên chủ hồ (Không bắt buộc)
                                </label>
                                <input
                                    id="owner-name"
                                    name="name"
                                    autoComplete="name"
                                    maxLength={100}
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="VD: Anh Minh"
                                    className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAF8] px-3.5 text-sm text-[#111827] focus:border-[#1B3B2B] focus:bg-white focus:outline-none"
                                />
                            </div>
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
                            >
                                {error}{" "}
                                <a href="/login" className="font-bold underline">
                                    Đi tới đăng nhập
                                </a>
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex min-h-13 w-full items-center justify-center rounded-lg bg-[#1B3B2B] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#2C5E43] disabled:opacity-60 cursor-pointer"
                        >
                            {loading ? "Đang tạo hồ mẫu & đăng nhập…" : "Mở hồ dùng thử 30 ngày ngay ↗"}
                        </button>

                        <p className="text-center text-xs leading-relaxed text-[#64748B]">
                            Không cần mã OTP SMS · Không yêu cầu thẻ ngân hàng. Khi đăng ký, bạn đồng ý với{" "}
                            <a href="/dieu-khoan" className="font-semibold text-[#1B3B2B] underline">
                                Điều khoản
                            </a>{" "}
                            &amp;{" "}
                            <a href="/chinh-sach-bao-mat" className="font-semibold text-[#1B3B2B] underline">
                                Chính sách bảo mật
                            </a>
                            .
                        </p>
                    </form>
                </section>

                {/* Right Column: What happens immediately after clicking */}
                <aside className="space-y-4 lg:col-span-5">
                    <div className="rounded-xl border border-[#CFE0D6] bg-white p-6">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#1B3B2B]">
                            CÓ SẴN NGAY SAU KHI BẤM NÚT
                        </span>
                        <h2
                            className="mt-1.5 text-xl font-bold text-[#111827]"
                            style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                        >
                            Vào thẳng bảng quản lý hồ — không phải cài đặt từ đầu
                        </h2>

                        <ul className="mt-4 space-y-3 text-xs leading-relaxed text-[#334155]">
                            <li className="flex items-start gap-2.5">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0EC] font-bold text-[#1B3B2B]">
                                    1
                                </span>
                                <span>
                                    <strong>Sơ đồ 6 chòi câu mẫu (Chòi 1 → Chòi 6):</strong> Chạm vào chòi trống bất kỳ
                                    là mở được vé câu đầu tiên trong 3 giây.
                                </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0EC] font-bold text-[#1B3B2B]">
                                    2
                                </span>
                                <span>
                                    <strong>Bảng giá &amp; Menu dịch vụ mẫu:</strong> Đã nạp sẵn gói câu 4 giờ, nước
                                    suối, bò húc, mồi câu để bạn bấm cộng thử vào vé.
                                </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0EC] font-bold text-[#1B3B2B]">
                                    3
                                </span>
                                <span>
                                    <strong>Cân cá cấn trừ &amp; Thanh toán VietQR:</strong> Thử nghiệm ngay tính năng
                                    trừ tiền thu mua cá và tách tiền mặt / chuyển khoản cuối ca.
                                </span>
                            </li>
                        </ul>

                        <div className="mt-5 rounded-lg border border-[#E2E8F0] bg-[#F8FAF8] p-3.5 text-xs text-[#475569]">
                            <strong className="block font-bold text-[#111827]">
                                Muốn xem giao diện trước khi tạo tài khoản?
                            </strong>
                            <span className="mt-0.5 block">
                                Bạn có thể mở xem ngay màn hình quầy mẫu với dữ liệu mô phỏng trực tiếp:
                            </span>
                            <a
                                href="/preview"
                                className="mt-2 inline-flex items-center font-bold text-[#1B3B2B] underline"
                            >
                                Mở màn hình quầy mẫu (Không cần đăng ký) ↗
                            </a>
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-xs text-[#475569]">
                        <div className="flex items-center justify-between font-bold text-[#111827]">
                            <span>Hỗ trợ cài đặt &amp; hướng dẫn 1-1</span>
                            <span className="text-[#1B3B2B] tabular-nums">0855 550 813</span>
                        </div>
                        <p className="mt-1 leading-relaxed">
                            Nếu bạn muốn đội ngũ kỹ thuật nhập sẵn đúng số chòi và bảng giá hồ của bạn miễn phí, hãy
                            nhắn Zalo bất cứ lúc nào.
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}
