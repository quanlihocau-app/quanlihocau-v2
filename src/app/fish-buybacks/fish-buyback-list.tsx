"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

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
        timeZone: "Asia/Ho_Chi_Minh",
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
        <div className="space-y-4">
            {/* Search Input Bar */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="w-full max-w-sm">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm theo tên loại cá..."
                    />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Hiển thị{" "}
                    <span className="font-bold text-slate-800">
                        {filteredBuybacks.length}
                    </span>{" "}
                    / {buybacks.length} lượt thu mua
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {filteredBuybacks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 font-medium">
                        {search
                            ? "Không tìm thấy lượt thu mua nào khớp với tìm kiếm."
                            : "Chưa có lượt thu mua cá nào được ghi nhận."}
                    </p>
                ) : (
                    filteredBuybacks.map((b) => (
                        <div
                            key={b.id}
                            className="flex flex-col gap-2 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                                    <span>{b.fishTypeName}</span>
                                    {b.isFishTypeDeleted && (
                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 border border-slate-200">
                                            Đã ngừng
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-extrabold text-[#0D9488] tabular-nums">
                                    {formatVnd(b.totalVnd)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>{b.weight} kg • {formatVnd(b.pricePerKg)}/kg</span>
                                <span>{formatDateTime(b.createdAt)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#E2DDD2] bg-white md:block">
                <table className="w-full text-left text-xs text-slate-600">
                    <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3.5">Thời gian</th>
                            <th className="px-4 py-3.5">Loại cá</th>
                            <th className="px-4 py-3.5 text-right">Khối lượng</th>
                            <th className="px-4 py-3.5 text-right">Đơn giá thu mua</th>
                            <th className="px-4 py-3.5 text-right">Tổng thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DDD2]">
                        {filteredBuybacks.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-xs text-slate-400"
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
                                    className="hover:bg-[#F8F6F0]/60 transition-colors"
                                >
                                    <td className="px-4 py-3.5 text-xs text-slate-500">
                                        {formatDateTime(b.createdAt)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-900">
                                            <span>{b.fishTypeName}</span>
                                            {b.isFishTypeDeleted && (
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                                                    Đã ngừng dùng
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 tabular-nums">
                                        {b.weight} kg
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-xs text-slate-600 tabular-nums">
                                        {formatVnd(b.pricePerKg)} / kg
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-[#0D9488] tabular-nums text-sm">
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
