"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export interface StockItem {
    id: string;
    name: string;
    sku: string | null;
    priceVnd: number;
    currentStock: number;
}

export interface MovementItem {
    id: string;
    productId: string;
    productName: string;
    productSku: string | null;
    isProductDeleted?: boolean;
    quantity: number;
    type: "IN" | "OUT";
    reason: string;
    createdBy: string;
    createdAt: Date | string;
}

interface InventoryMovementListProps {
    stockItems: StockItem[];
    movements: MovementItem[];
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

export function InventoryMovementList({
    stockItems,
    movements,
}: InventoryMovementListProps) {
    const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
    const [searchTerm, setSearchTerm] = useState("");
    const [historyFilter, setHistoryFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

    // Filter Stock Items
    const filteredStock = stockItems.filter((item) => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;
        const matchName = item.name.toLowerCase().includes(query);
        const matchSku = item.sku ? item.sku.toLowerCase().includes(query) : false;
        return matchName || matchSku;
    });

    // Filter Movements
    const filteredMovements = movements.filter((m) => {
        const query = searchTerm.toLowerCase().trim();
        const matchType =
            historyFilter === "ALL" ? true : m.type === historyFilter;
        if (!matchType) return false;
        if (!query) return true;
        const matchName = m.productName.toLowerCase().includes(query);
        const matchSku = m.productSku
            ? m.productSku.toLowerCase().includes(query)
            : false;
        const matchReason = m.reason.toLowerCase().includes(query);
        return matchName || matchSku || matchReason;
    });

    return (
        <div className="space-y-4">
            {/* Tabs Header */}
            <div className="flex flex-col justify-between gap-3 border-b border-[#E2DDD2] pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("stock")}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                            activeTab === "stock"
                                ? "bg-[#102A43] text-white shadow-2xs"
                                : "bg-white text-slate-600 border border-[#E2DDD2] hover:bg-[#F8F6F0]"
                        }`}
                    >
                        Tồn kho mặt hàng ({stockItems.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                            activeTab === "history"
                                ? "bg-[#102A43] text-white shadow-2xs"
                                : "bg-white text-slate-600 border border-[#E2DDD2] hover:bg-[#F8F6F0]"
                        }`}
                    >
                        Nhật ký biến động ({movements.length})
                    </button>
                </div>

                <div className="w-full sm:w-64">
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo tên, SKU, lý do..."
                    />
                </div>
            </div>

            {/* TAB 1: CURRENT STOCK */}
            {activeTab === "stock" && (
                <div>
                    {/* Mobile Cards */}
                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
                        {filteredStock.length === 0 ? (
                            <p className="py-8 text-center text-xs text-slate-500 font-medium">
                                Không tìm thấy mặt hàng nào khớp với tìm kiếm.
                            </p>
                        ) : (
                            filteredStock.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                                >
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">
                                            {item.name}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                            {item.sku ? `SKU: ${item.sku}` : "Không có SKU"} • {formatVnd(item.priceVnd)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                                                item.currentStock > 10
                                                    ? "bg-teal-50 text-[#0D9488] border border-teal-200"
                                                    : item.currentStock > 0
                                                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                                                    : "bg-red-50 text-red-700 border border-red-200"
                                            }`}
                                        >
                                            {item.currentStock}
                                        </span>
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
                                    <th className="px-4 py-3.5">Mã SKU</th>
                                    <th className="px-4 py-3.5">Tên sản phẩm</th>
                                    <th className="px-4 py-3.5 text-right">Đơn giá bán</th>
                                    <th className="px-4 py-3.5 text-right">Số lượng tồn kho</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2DDD2]">
                                {filteredStock.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-8 text-center text-xs text-slate-400"
                                        >
                                            Không tìm thấy mặt hàng nào khớp với tìm kiếm.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStock.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-[#F8F6F0]/60 transition-colors"
                                        >
                                            <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                                                {item.sku ? (
                                                    <span className="inline-flex items-center rounded-md bg-[#F8F6F0] px-2 py-0.5 text-slate-800 border border-[#E2DDD2]">
                                                        {item.sku}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-slate-900">
                                                {item.name}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                                                {formatVnd(item.priceVnd)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <span
                                                    className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                                                        item.currentStock > 10
                                                            ? "bg-teal-50 text-[#0D9488] border border-teal-200"
                                                            : item.currentStock > 0
                                                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                                                            : "bg-red-50 text-red-700 border border-red-200"
                                                    }`}
                                                >
                                                    {item.currentStock}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: MOVEMENT HISTORY */}
            {activeTab === "history" && (
                <div className="space-y-3">
                    {/* Filter buttons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setHistoryFilter("ALL")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                historyFilter === "ALL"
                                    ? "bg-[#102A43] text-white shadow-2xs"
                                    : "bg-white text-slate-600 border border-[#E2DDD2]"
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            type="button"
                            onClick={() => setHistoryFilter("IN")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                historyFilter === "IN"
                                    ? "bg-[#0D9488] text-white shadow-2xs"
                                    : "bg-white text-slate-600 border border-[#E2DDD2]"
                            }`}
                        >
                            + Nhập kho
                        </button>
                        <button
                            type="button"
                            onClick={() => setHistoryFilter("OUT")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                historyFilter === "OUT"
                                    ? "bg-orange-600 text-white shadow-2xs"
                                    : "bg-white text-slate-600 border border-[#E2DDD2]"
                            }`}
                        >
                            - Xuất kho
                        </button>
                    </div>

                    {/* Mobile Cards */}
                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
                        {filteredMovements.length === 0 ? (
                            <p className="py-8 text-center text-xs text-slate-500 font-medium">
                                Chưa có nhật ký biến động kho nào.
                            </p>
                        ) : (
                            filteredMovements.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex flex-col gap-1.5 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900">
                                            {m.productName}
                                        </span>
                                        <span
                                            className={`font-mono text-xs font-extrabold tabular-nums ${
                                                m.type === "IN"
                                                    ? "text-[#0D9488]"
                                                    : "text-orange-600"
                                            }`}
                                        >
                                            {m.quantity > 0
                                                ? `+${m.quantity}`
                                                : m.quantity}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 font-medium">
                                        Lý do: {m.reason}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-[#E2DDD2] pt-1.5">
                                        <span>Bởi: {m.createdBy}</span>
                                        <span>{formatDateTime(m.createdAt)}</span>
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
                                    <th className="px-4 py-3.5">Mặt hàng</th>
                                    <th className="px-4 py-3.5">Loại</th>
                                    <th className="px-4 py-3.5 text-right">Số lượng</th>
                                    <th className="px-4 py-3.5">Lý do</th>
                                    <th className="px-4 py-3.5">Thực hiện bởi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2DDD2]">
                                {filteredMovements.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-8 text-center text-xs text-slate-400"
                                        >
                                            Chưa có nhật ký biến động kho nào.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMovements.map((m) => (
                                        <tr
                                            key={m.id}
                                            className="hover:bg-[#F8F6F0]/60 transition-colors"
                                        >
                                            <td className="px-4 py-3.5 text-slate-500">
                                                {formatDateTime(m.createdAt)}
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-slate-900">
                                                {m.productName}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {m.type === "IN" ? (
                                                    <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                                                        Nhập kho
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-800 border border-orange-200">
                                                        Xuất kho
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono text-sm font-extrabold tabular-nums">
                                                <span
                                                    className={
                                                        m.type === "IN"
                                                            ? "text-[#0D9488]"
                                                            : "text-orange-600"
                                                    }
                                                >
                                                    {m.quantity > 0
                                                        ? `+${m.quantity}`
                                                        : m.quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-700">
                                                {m.reason}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                                                {m.createdBy}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
