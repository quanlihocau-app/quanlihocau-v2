import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 text-slate-900">
            <section aria-labelledby="not-found-title" className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7">
                <p className="text-sm font-semibold text-slate-600">Quản Lý Hồ Câu · 404</p>
                <h1 id="not-found-title" className="text-2xl font-bold">Không tìm thấy trang</h1>
                <p className="leading-relaxed text-slate-600">Kiểm tra lại đường dẫn hoặc chọn một mục bên dưới để tiếp tục.</p>
                <nav aria-label="Điều hướng khi không tìm thấy trang" className="grid gap-3">
                    <Link href="/sessions" className="flex min-h-14 items-center justify-center rounded-xl bg-green-700 px-4 font-semibold text-white hover:bg-green-800">Danh sách phiên câu</Link>
                    <Link href="/" className="flex min-h-14 items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold hover:bg-slate-50">Về trang chủ</Link>
                </nav>
            </section>
        </main>
    );
}
