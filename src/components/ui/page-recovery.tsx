"use client";

import { useTransition } from "react";
import Link from "next/link";

export function PageRecovery({ retry }: { retry: () => void }) {
    const [isPending, startTransition] = useTransition();

    return (
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px", background: "#F8FAFC", color: "#0F172A", fontFamily: "Arial, sans-serif" }}>
            <section aria-labelledby="recovery-title" style={{ width: "100%", maxWidth: "440px", padding: "28px", borderRadius: "20px", border: "1px solid #E2E8F0", background: "white" }}>
                <p style={{ color: "#475569", fontSize: "14px" }}>Quản Lý Hồ Câu</p>
                <h1 id="recovery-title" style={{ fontSize: "24px", lineHeight: 1.3 }}>Chưa thể hiển thị trang</h1>
                <p style={{ lineHeight: 1.6 }}>Kiểm tra kết nối mạng rồi thử tải lại nội dung.</p>
                <p style={{ lineHeight: 1.6, color: "#475569" }}>
                    Nếu lỗi xuất hiện khi đang mở vé hoặc thanh toán, hãy kiểm tra danh sách phiên câu và hóa đơn trước khi thực hiện lại thao tác.
                </p>
                <div style={{ display: "grid", gap: "12px", marginTop: "24px" }}>
                    <button
                        type="button"
                        disabled={isPending}
                        aria-busy={isPending}
                        onClick={() => startTransition(() => retry())}
                        style={{ minHeight: "56px", padding: "12px 16px", border: 0, borderRadius: "12px", background: "#15803D", color: "white", fontSize: "16px", fontWeight: 700, cursor: isPending ? "wait" : "pointer", opacity: isPending ? 0.7 : 1 }}
                    >
                        {isPending ? "Đang tải lại…" : "Tải lại nội dung"}
                    </button>
                    <Link href="/sessions" prefetch={false} style={{ minHeight: "56px", display: "grid", placeItems: "center", borderRadius: "12px", border: "1px solid #CBD5E1", color: "#0F172A", textDecoration: "underline", fontSize: "16px" }}>Xem danh sách phiên câu</Link>
                    <Link href="/invoices" prefetch={false} style={{ minHeight: "48px", display: "grid", placeItems: "center", color: "#166534", textDecoration: "underline", fontSize: "16px" }}>Kiểm tra hóa đơn</Link>
                </div>
            </section>
        </main>
    );
}
