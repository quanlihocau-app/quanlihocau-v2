"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface ResetPasswordButtonProps {
    membershipId: string;
    memberName: string;
    memberEmail: string;
}

export function ResetPasswordButton({
    membershipId,
    memberName,
    memberEmail,
}: ResetPasswordButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleResetPassword() {
        const newPassword = window.prompt(
            `Nhập mật khẩu mới cho nhân sự "${memberName}" (${memberEmail}):\n(Tối thiểu 4 ký tự, ví dụ: 123456)`
        );

        if (newPassword === null) {
            return;
        }

        if (newPassword.trim().length < 4) {
            alert("Mật khẩu phải có tối thiểu 4 ký tự.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`/api/members/${membershipId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "RESET_PASSWORD",
                    newPassword: newPassword.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Không thể đặt lại mật khẩu.");
                return;
            }

            alert(
                data.message ||
                    `Đã cập nhật mật khẩu mới cho "${memberName}" thành công. Hãy gửi mật khẩu mới cho nhân sự để họ đăng nhập.`
            );
            router.refresh();
        } catch {
            alert("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleResetPassword}
            disabled={loading}
            className="text-[11px] h-7 px-2 font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
        >
            {loading ? "Đang lưu..." : "Đổi mật khẩu"}
        </Button>
    );
}
