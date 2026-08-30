"use client";

import { useState } from "react";

export interface FishBuybackItem {
    id: string;
    fishTypeId: string;
    fishTypeName: string;
    isFishTypeDeleted: boolean;
    weight: number;
    pricePerKg: number;
    totalVnd: number;
    createdAt: Date | string;
}

interface FishBuybackListProps {
    buybacks: FishBuybackItem[];
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function formatDateTime(date: Date | string | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(date));
}

export function FishBuybackList({ buybacks }: FishBuybackListProps) {
    const [search, setSearch] = useState("");

    const filteredBuybacks = buybacks.filter((b) => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return b.fishTypeName.toLowerCase().includes(query);
    });

    return (
        <div>
            {/* Search Input Bar */}
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg
                            className="h-4 w-4 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm theo tên loại cá..."
                        className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                <div className="text-xs text-slate-500">
                    Hiển thị{" "}
                    <span className="font-semibold text-slate-800">
                        {filteredBuybacks.length}
                    </span>{" "}
                    / {buybacks.length} lượt thu mua
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Loại cá</th>
                            <th className="px-4 py-3 text-right">Khối lượng</th>
                            <th className="px-4 py-3 text-right">Đơn giá thu mua</th>
                            <th className="px-4 py-3 text-right">Tổng thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBuybacks.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-sm text-slate-400"
                                >
                                    {search
                                        ? "Không tìm thấy lượt thu mua nào khớp với tìm kiếm."
                                        : "Chưa có lượt thu mua cá nào được ghi nhận."}
                                </td>
                            </tr>
                        ) : (
                            filteredBuybacks.map((b) => (
                                <tr
                                    key={b.id}
                                    className="transition hover:bg-slate-50/50"
                                >
                                    <td className="px-4 py-3.5 text-xs text-slate-500">
                                        {formatDateTime(b.createdAt)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
                                            <span>{b.fishTypeName}</span>
                                            {b.isFishTypeDeleted && (
                                                <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-400/20">
                                                    Đã ngừng dùng
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800">
                                        {b.weight} kg
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-xs text-slate-600">
                                        {formatVnd(b.pricePerKg)} / kg
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                                        {formatVnd(b.totalVnd)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
