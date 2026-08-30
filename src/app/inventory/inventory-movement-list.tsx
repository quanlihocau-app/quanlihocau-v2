"use client";

import { useState } from "react";

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
        <div>
            {/* Tabs Header */}
            <div className="mb-4 flex flex-col justify-between gap-4 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("stock")}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                            activeTab === "stock"
                                ? "bg-slate-900 text-white shadow-sm"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        Tồn kho mặt hàng ({stockItems.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                            activeTab === "history"
                                ? "bg-slate-900 text-white shadow-sm"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        Lịch sử nhập / xuất ({movements.length})
                    </button>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-2">
                    {activeTab === "history" && (
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("ALL")}
                                className={`rounded px-2.5 py-1 font-medium transition ${
                                    historyFilter === "ALL"
                                        ? "bg-slate-100 text-slate-900 font-semibold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Tất cả
                            </button>
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("IN")}
                                className={`rounded px-2.5 py-1 font-medium transition ${
                                    historyFilter === "IN"
                                        ? "bg-emerald-50 text-emerald-700 font-semibold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Nhập kho
                            </button>
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("OUT")}
                                className={`rounded px-2.5 py-1 font-medium transition ${
                                    historyFilter === "OUT"
                                        ? "bg-amber-50 text-amber-700 font-semibold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Xuất kho
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm..."
                            className="block w-48 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </div>

            {/* Tab 1: Current Stock Overview */}
            {activeTab === "stock" && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Mã SKU</th>
                                <th className="px-4 py-3">Tên sản phẩm</th>
                                <th className="px-4 py-3 text-right">Đơn giá bán</th>
                                <th className="px-4 py-3 text-right">Số lượng tồn</th>
                                <th className="px-4 py-3 text-right">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStock.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-sm text-slate-400"
                                    >
                                        {searchTerm
                                            ? "Không tìm thấy sản phẩm nào khớp với tìm kiếm."
                                            : "Chưa có mặt hàng nào trong kho."}
                                    </td>
                                </tr>
                            ) : (
                                filteredStock.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="transition hover:bg-slate-50/50"
                                    >
                                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                                            {item.sku ? (
                                                <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-slate-800">
                                                    {item.sku}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 font-medium text-slate-900">
                                            {item.name}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                                            {formatVnd(item.priceVnd)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-semibold">
                                            <span
                                                className={`font-mono text-sm ${
                                                    item.currentStock === 0
                                                        ? "text-rose-600"
                                                        : item.currentStock <= 5
                                                        ? "text-amber-600"
                                                        : "text-emerald-700"
                                                }`}
                                            >
                                                {item.currentStock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right text-xs">
                                            {item.currentStock === 0 ? (
                                                <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
                                                    Hết hàng
                                                </span>
                                            ) : item.currentStock <= 5 ? (
                                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700 ring-1 ring-inset ring-amber-600/10">
                                                    Sắp hết
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                                    Sẵn sàng
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab 2: Movements History */}
            {activeTab === "history" && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Mặt hàng</th>
                                <th className="px-4 py-3">Loại phiếu</th>
                                <th className="px-4 py-3 text-right">Số lượng</th>
                                <th className="px-4 py-3">Lý do</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMovements.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-sm text-slate-400"
                                    >
                                        Chưa có giao dịch nhập / xuất kho nào.
                                    </td>
                                </tr>
                            ) : (
                                filteredMovements.map((m) => (
                                    <tr
                                        key={m.id}
                                        className="transition hover:bg-slate-50/50"
                                    >
                                        <td className="px-4 py-3.5 text-xs text-slate-500">
                                            {formatDateTime(m.createdAt)}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
                                                <span>{m.productName}</span>
                                                {m.isProductDeleted && (
                                                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-400/20">
                                                        Đã ngừng dùng
                                                    </span>
                                                )}
                                            </div>
                                            {m.productSku && (
                                                <div className="font-mono text-xs text-slate-400">
                                                    {m.productSku}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-xs">
                                            {m.type === "IN" ? (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                                    <svg
                                                        className="h-3 w-3"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={2.5}
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M12 4.5v15m7.5-7.5h-15"
                                                        />
                                                    </svg>
                                                    Nhập kho
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10">
                                                    <svg
                                                        className="h-3 w-3"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={2.5}
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M5 12h14"
                                                        />
                                                    </svg>
                                                    Xuất kho
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-mono font-semibold">
                                            <span
                                                className={
                                                    m.type === "IN"
                                                        ? "text-emerald-700"
                                                        : "text-amber-700"
                                                }
                                            >
                                                {m.type === "IN" ? `+${m.quantity}` : `${m.quantity}`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-slate-600">
                                            {m.reason}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
