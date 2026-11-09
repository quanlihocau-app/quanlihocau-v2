"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import type { LakeRolePermissionsConfig } from "@/lib/role-permissions";

type MemberRole = typeof Role.STAFF | typeof Role.MANAGER;

interface CreateMemberFormProps {
    rolePermissionsConfig?: LakeRolePermissionsConfig;
}

export function CreateMemberForm({ rolePermissionsConfig }: CreateMemberFormProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedRoleOption, setSelectedRoleOption] = useState<string>(
        `BASE:${Role.STAFF}`,
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const staffLabel = rolePermissionsConfig?.staffRoleLabel ?? "NHÂN VIÊN (STAFF)";
    const managerLabel = rolePermissionsConfig?.managerRoleLabel ?? "QUẢN LÝ (MANAGER)";
    const customRoles = rolePermissionsConfig?.customRoles ?? [];

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!name.trim()) {
            setError("Vui lòng nhập họ và tên nhân sự.");
            return;
        }

        if (!email.trim()) {
            setError("Vui lòng nhập tên đăng nhập hoặc địa chỉ email.");
            return;
        }

        if (password.length < 4) {
            setError("Mật khẩu ban đầu phải có tối thiểu 4 ký tự.");
            return;
        }

        let role: MemberRole = Role.STAFF;
        let customRoleId: string | null = null;

        if (selectedRoleOption.startsWith("CUSTOM:")) {
            const cId = selectedRoleOption.slice("CUSTOM:".length);
            const found = customRoles.find((r) => r.id === cId);
            if (found) {
                role = found.baseRole;
                customRoleId = found.id;
            }
        } else if (selectedRoleOption === `BASE:${Role.MANAGER}`) {
            role = Role.MANAGER;
        } else {
            role = Role.STAFF;
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
                    ...(customRoleId ? { customRoleId } : {}),
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
            setSelectedRoleOption(`BASE:${Role.STAFF}`);

            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <InlineAlert type="error" message={error} />}

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
                label="Tên đăng nhập hoặc Email *"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ví dụ: hienql hoặc email@..."
                helperText="Chủ hồ có thể nhập tên đăng nhập bất kỳ (ví dụ: hienql) hoặc email của nhân viên."
            />

            <Input
                id="member-password"
                label="Mật khẩu *"
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 4 ký tự (ví dụ: 123456)"
                helperText="Cung cấp mật khẩu này cho nhân sự để đăng nhập vào ca làm việc."
            />

            <Select
                id="member-role"
                label="Phân quyền sử dụng App *"
                value={selectedRoleOption}
                onChange={(e) => setSelectedRoleOption(e.target.value)}
            >
                <optgroup label="Phân quyền tiêu chuẩn">
                    <option value={`BASE:${Role.STAFF}`}>
                        {staffLabel} — Mở/kết thúc phiên, bán lẻ, thu tiền
                    </option>
                    <option value={`BASE:${Role.MANAGER}`}>
                        {managerLabel} — Điều hành, chốt ca, báo cáo
                    </option>
                </optgroup>
                {customRoles.length > 0 && (
                    <optgroup label="Tên phân quyền do Chủ hồ đặt">
                        {customRoles.map((cr) => (
                            <option key={cr.id} value={`CUSTOM:${cr.id}`}>
                                {cr.name} ({cr.permissions.length} quyền)
                            </option>
                        ))}
                    </optgroup>
                )}
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
