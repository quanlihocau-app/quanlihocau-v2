"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    async function submit() {
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/void`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Không huỷ được hoá đơn.");
                setSaving(false);
                return;
            }
            setOpen(false);
            router.refresh();
        } catch {
            setError("Lỗi kết nối.");
            setSaving(false);
        }
    }

    return (
        <div className="print:hidden">
            {!open ? (
                <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                    Huỷ hoá đơn
                </button>
            ) : (
                <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-bold text-red-900">Huỷ hoá đơn đã chốt. Tiền đã thu sẽ được ghi phiếu chi hoàn.</p>
                    <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={2}
                        placeholder="Lý do (bắt buộc, ít nhất 3 ký tự)"
                        className="w-full rounded-lg border border-red-200 p-2 text-xs"
                    />
                    {error && <p className="text-xs font-bold text-red-700">{error}</p>}
                    <div className="flex gap-2">
                        <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1.5 text-xs">Đóng</button>
                        <button type="button" disabled={saving || reason.trim().length < 3} onClick={submit} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                            {saving ? "Đang huỷ…" : "Xác nhận huỷ"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
