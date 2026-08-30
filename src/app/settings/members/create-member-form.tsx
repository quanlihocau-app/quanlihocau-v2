"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Role } from "@/generated/prisma/enums";

type MemberRole = typeof Role.STAFF | typeof Role.MANAGER;

export function CreateMemberForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<MemberRole>(Role.STAFF);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!name.trim()) {
            setError("Vui lòng nhập họ và tên nhân sự.");
            return;
        }

        if (!email.trim()) {
            setError("Vui lòng nhập địa chỉ email.");
            return;
        }

        if (password.length < 8) {
            setError("Mật khẩu ban đầu phải có tối thiểu 8 ký tự.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/members", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    role,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Không thể tạo tài khoản nhân sự.");
                return;
            }

            setSuccessMessage(
                `Đã thêm tài khoản nhân sự "${data.member?.name}" (${data.member?.email}) thành công.`,
            );

            // Clear inputs for security, especially password
            setName("");
            setEmail("");
            setPassword("");
            setRole(Role.STAFF);

            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    {successMessage}
                </div>
            )}

            <div>
                <label
                    htmlFor="member-name"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                    id="member-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            <div>
                <label
                    htmlFor="member-email"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <input
                    id="member-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nhanvien@hocau.vn"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>

            <div>
                <label
                    htmlFor="member-password"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Mật khẩu ban đầu <span className="text-red-500">*</span>
                </label>
                <input
                    id="member-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                    Cung cấp mật khẩu này cho nhân sự để họ đăng nhập lần đầu.
                </p>
            </div>

            <div>
                <label
                    htmlFor="member-role"
                    className="block text-xs font-semibold text-slate-700"
                >
                    Vai trò (Quyền hạn) <span className="text-red-500">*</span>
                </label>
                <select
                    id="member-role"
                    value={role}
                    onChange={(e) =>
                        setRole(e.target.value as MemberRole)
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                    <option value={Role.STAFF}>
                        NHÂN VIÊN (STAFF) - Mở/kết thúc phiên, lập hóa đơn, thu tiền
                    </option>
                    <option value={Role.MANAGER}>
                        QUẢN LÝ (MANAGER) - Toàn quyền vận hành, hoàn tác thanh toán
                    </option>
                </select>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản nhân sự"}
            </button>
        </form>
    );
}
