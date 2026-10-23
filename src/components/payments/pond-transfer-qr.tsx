"use client";

import { useEffect, useState } from "react";

import { generatePondVietQrUrl } from "@/lib/vietqr";

type BankProfile = {
    bankCode: string;
    bankName: string | null;
    accountNumber: string;
    accountName: string;
} | null;

export function PondTransferQr({
    amountVnd,
    orderCode,
    showQr = true,
}: {
    amountVnd: number;
    orderCode: string;
    showQr?: boolean;
}) {
    const [bank, setBank] = useState<BankProfile | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/lake/profile", { credentials: "same-origin" })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (!cancelled) setBank(data?.bank ?? null);
            })
            .catch(() => {
                if (!cancelled) setBank(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (bank === undefined) {
        return <p className="text-xs text-slate-500">Đang tải tài khoản nhận tiền…</p>;
    }

    const qr = generatePondVietQrUrl({
        amount: Math.max(0, amountVnd),
        orderCode: orderCode || "VECAU",
        bankCode: bank?.bankCode,
        accountNumber: bank?.accountNumber,
        accountName: bank?.accountName,
    });

    if (qr.missingAccount || !qr.qrUrl) {
        return (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900">
                Chủ hồ chưa khai báo tài khoản ngân hàng trong Cài đặt. Chưa có mã VietQR.
            </p>
        );
    }

    return (
        <div className="space-y-2 text-xs">
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex justify-between gap-3">
                    <span className="text-slate-600">Ngân hàng:</span>
                    <span className="font-bold text-slate-900">{qr.bankName}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span className="text-slate-600">Số tài khoản:</span>
                    <span className="font-mono font-extrabold text-emerald-700">{qr.accountNumber}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span className="text-slate-600">Chủ tài khoản:</span>
                    <span className="font-bold text-slate-900">{qr.accountName}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span className="text-slate-600">Nội dung CK:</span>
                    <span className="font-mono font-bold text-slate-900">{qr.memo}</span>
                </div>
            </div>
            {showQr && (
                <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr.qrUrl} alt="VietQR chuyển khoản của hồ" className="h-full w-full object-contain" />
                </div>
            )}
        </div>
    );
}
