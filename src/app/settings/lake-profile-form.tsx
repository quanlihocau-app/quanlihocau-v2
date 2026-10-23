"use client";

import { useState } from "react";

import { VIETQR_BANKS } from "@/lib/vietqr";

export function LakeProfileForm({
    initialName,
    initialPhone,
    initialBankCode,
    initialAccountNumber,
    initialAccountName,
    canEdit,
}: {
    initialName: string;
    initialPhone: string | null;
    initialBankCode: string | null;
    initialAccountNumber: string | null;
    initialAccountName: string | null;
    canEdit: boolean;
}) {
    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState(initialPhone ?? "");
    const [bankCode, setBankCode] = useState(initialBankCode ?? "");
    const [accountNumber, setAccountNumber] = useState(initialAccountNumber ?? "");
    const [accountName, setAccountName] = useState(initialAccountName ?? "");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    if (!canEdit) {
        return (
            <div className="mb-4 rounded-2xl border border-[#E3E8E3] bg-white p-4 text-xs text-[#66716A]">
                Tài khoản nhận tiền và tên hồ chỉ chủ hồ được sửa. Mã VietQR trên bill dùng đúng tài khoản này.
            </div>
        );
    }

    async function save() {
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
            const response = await fetch("/api/lake/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    contactPhone: phone.trim() || null,
                    bankCode: bankCode || null,
                    bankAccountNumber: accountNumber.trim() || null,
                    bankAccountName: accountName.trim() || null,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Không lưu được.");
            } else {
                setMessage("Đã lưu. Mã VietQR trên màn thu tiền và hoá đơn dùng tài khoản này.");
            }
        } catch {
            setError("Lỗi kết nối.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mb-4 rounded-2xl border border-[#E3E8E3] bg-white p-4 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#17201A]">Hồ câu và tài khoản nhận tiền</h2>
            <p className="text-[11px] text-[#66716A]">
                Tên hồ, số điện thoại và tài khoản ngân hàng in trên mã VietQR khi khách chuyển khoản. Không dùng tài khoản mẫu.
            </p>
            <label className="block text-xs font-bold text-slate-700">
                Tên hồ
                <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm" />
            </label>
            <label className="block text-xs font-bold text-slate-700">
                Số điện thoại hồ
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0901234567" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm" />
            </label>
            <label className="block text-xs font-bold text-slate-700">
                Ngân hàng
                <select value={bankCode} onChange={(event) => setBankCode(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm">
                    <option value="">Chưa khai báo</option>
                    {VIETQR_BANKS.map((bank) => (
                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                    ))}
                </select>
            </label>
            <label className="block text-xs font-bold text-slate-700">
                Số tài khoản
                <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-sm" />
            </label>
            <label className="block text-xs font-bold text-slate-700">
                Tên chủ tài khoản
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm" />
            </label>
            {error && <p className="text-xs font-bold text-red-700">{error}</p>}
            {message && <p className="text-xs font-bold text-emerald-700">{message}</p>}
            <button type="button" disabled={saving} onClick={save} className="h-10 rounded-xl bg-[#2C4C3B] px-4 text-xs font-bold text-white disabled:opacity-60">
                {saving ? "Đang lưu…" : "Lưu thông tin hồ"}
            </button>
        </div>
    );
}
