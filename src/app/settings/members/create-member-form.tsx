"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

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
                <InlineAlert type="error" message={error} />
            )}

            {successMessage && (
                <InlineAlert type="success" message={successMessage} />
            )}

            <Input
                id="member-name"
                label="Họ và tên *"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
            />

            <Input
                id="member-email"
                label="Địa chỉ Email *"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nhanvien@hocau.vn"
            />

            <Input
                id="member-password"
                label="Mật khẩu ban đầu *"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                helperText="Cung cấp mật khẩu này cho nhân sự để họ đăng nhập lần đầu."
            />

            <Select
                id="member-role"
                label="Vai trò (Quyền hạn) *"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
            >
                <option value={Role.STAFF}>
                    NHÂN VIÊN (STAFF) - Mở/kết thúc phiên, thu tiền
                </option>
                <option value={Role.MANAGER}>
                    QUẢN LÝ (MANAGER) - Toàn quyền vận hành
                </option>
            </Select>

            <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                loadingText="Đang tạo tài khoản…"
                className="w-full"
            >
                Tạo tài khoản nhân sự
            </Button>
        </form>
    );
}
