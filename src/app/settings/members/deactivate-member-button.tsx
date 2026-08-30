"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeactivateMemberButtonProps {
    membershipId: string;
    memberName: string;
    memberEmail: string;
}

export function DeactivateMemberButton({
    membershipId,
    memberName,
    memberEmail,
}: DeactivateMemberButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleDeactivate() {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn vô hiệu hóa tài khoản của nhân sự "${memberName}" (${memberEmail}) không?\n\nSau khi vô hiệu hóa, tài khoản này sẽ không còn quyền truy cập và thao tác tại hồ câu nữa.`,
        );

        if (!confirmed) {
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
                    action: "DEACTIVATE",
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Không thể vô hiệu hóa nhân sự.");
                return;
            }

            alert(
                data.message ||
                    `Đã vô hiệu hóa tài khoản nhân sự "${memberName}" thành công.`,
            );
            router.refresh();
        } catch {
            alert("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            disabled={loading}
            onClick={handleDeactivate}
            className="inline-flex items-center rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {loading ? "Đang xử lý..." : "Vô hiệu hóa"}
        </button>
    );
}
