"use client";

import { useState } from "react";

import { rotateAuditReadToken } from "./token-action";

export function AuditTokenButton({ hasToken }: { hasToken: boolean }) {
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    async function onRotate() {
        const confirmed = window.confirm(
            hasToken || token
                ? "Token cũ sẽ ngừng dùng ngay. Tạo token mới?"
                : "Tạo token để bot chỉ đọc nhật ký của hồ này?",
        );
        if (!confirmed) return;
        setPending(true);
        setError("");
        try {
            const result = await rotateAuditReadToken();
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setToken(result.token);
        } catch {
            setError("Không tạo được token.");
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4">
            <p className="text-sm font-semibold text-[#17201A]">Token cho bot</p>
            <p className="mt-1 text-xs leading-5 text-[#66716A]">
                Gửi header <span className="font-mono">Authorization: Bearer qlh_...</span> tới
                GET /api/audit-events. Token chỉ đọc, gắn với hồ này. Không lưu lại sau khi rời trang.
            </p>
            <button
                type="button"
                onClick={() => void onRotate()}
                disabled={pending}
                className="mt-3 inline-flex h-10 items-center rounded-full bg-[#17201A] px-4 text-xs font-semibold text-white disabled:opacity-60"
            >
                {pending ? "Đang tạo..." : hasToken || token ? "Tạo token mới" : "Tạo token"}
            </button>
            {error ? <p className="mt-2 text-xs text-[#8B1E1E]">{error}</p> : null}
            {token ? (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-[#F7F9F5] p-3 text-xs text-[#17201A]">{token}</pre>
            ) : null}
        </div>
    );
}
