import Link from "next/link";

export default function ForbiddenPage() {
    return (
        <main className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl border border-[#D9D2C8] bg-white p-8 text-center shadow-sm space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <span className="text-xs font-bold tracking-widest text-rose-600 uppercase">
                        Lỗi 403 • Truy cập bị từ chối
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-[#27231F]">
                        Khu vực Quản trị Nền tảng
                    </h1>
                    <p className="text-xs text-[#766F67] leading-relaxed">
                        Tài khoản của bạn không có đặc quyền <strong>SUPER_ADMIN</strong> để truy cập bảng điều khiển vận hành SaaS này.
                    </p>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                    <Link
                        href="/sessions"
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#8A5A20] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#704716] active:scale-95 transition-all"
                    >
                        Về màn hình Quầy thu ngân
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white px-4 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] active:scale-95 transition-all"
                    >
                        Đăng nhập bằng tài khoản khác
                    </Link>
                </div>
            </div>
        </main>
    );
}
