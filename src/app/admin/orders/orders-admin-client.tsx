"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface OrderItem {
    id: string;
    orderCode: string;
    organizationId: string;
    lakeId: string;
    planCode: "TRIAL" | "SILVER" | "GOLD";
    amountVnd: number;
    durationDays: number;
    status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
    paymentMethod: string;
    paidAt: string | null;
    bankRef: string | null;
    rawWebhookPayload: string | null;
    createdAt: string;
    lake: {
        id: string;
        name: string;
        subscriptionStatus: string;
        subscriptionExpiresAt: string | null;
    };
    organization: {
        id: string;
        name: string;
    };
    plan?: {
        name: string;
        priceVnd: number;
        durationDays: number;
    };
}

interface OrdersAdminClientProps {
    initialOrders: OrderItem[];
    initialStats: {
        totalCount: number;
        pendingCount: number;
        paidCount: number;
        cancelledCount: number;
    };
    initialPagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
    };
}

export function OrdersAdminClient({
    initialOrders,
    initialStats,
    initialPagination,
}: OrdersAdminClientProps) {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
    const [stats, setStats] = useState(initialStats);
    const [pagination, setPagination] = useState(initialPagination);

    // Search and filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
    const [isLoading, setIsLoading] = useState(false);

    // Modal state for manual confirmation
    const [confirmModalOrder, setConfirmModalOrder] = useState<OrderItem | null>(null);
    const [reason, setReason] = useState("");
    const [bankRef, setBankRef] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    async function fetchOrders(page = 1, status = selectedStatus, query = searchQuery) {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            if (status !== "ALL") params.set("status", status);
            if (query.trim()) params.set("q", query.trim());

            const res = await fetch(`/api/admin/orders?${params.toString()}`);
            if (!res.ok) throw new Error("Lỗi khi tải danh sách đơn hàng");

            const data = await res.json();
            setOrders(data.orders);
            setPagination(data.pagination);
        } catch (err: unknown) {
            console.error("Fetch orders error:", err);
            setActionMessage({
                type: "error",
                text: "Không thể tải danh sách đơn hàng.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    function handleFilterStatus(status: string) {
        setSelectedStatus(status);
        fetchOrders(1, status, searchQuery);
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        fetchOrders(1, selectedStatus, searchQuery);
    }

    function openConfirmModal(order: OrderItem) {
        setConfirmModalOrder(order);
        setReason(`Đã kiểm tra chuyển khoản ngân hàng Techcombank khớp số tiền ${order.amountVnd.toLocaleString("vi-VN")}đ`);
        setBankRef("");
        setActionMessage(null);
    }

    async function handleConfirmSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!confirmModalOrder) return;
        if (!reason.trim() || reason.trim().length < 5) {
            setActionMessage({
                type: "error",
                text: "Vui lòng nhập lý do xác nhận (ít nhất 5 ký tự).",
            });
            return;
        }

        setIsSubmitting(true);
        setActionMessage(null);

        try {
            const res = await fetch(`/api/admin/orders/${confirmModalOrder.id}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: reason.trim(),
                    bankRef: bankRef.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Không thể xác nhận đơn hàng.");
            }

            setActionMessage({
                type: "success",
                text: data.message || "Xác nhận thanh toán thủ công thành công!",
            });

            // Update stats & refresh order list
            setConfirmModalOrder(null);
            router.refresh();
            await fetchOrders(pagination.page, selectedStatus, searchQuery);

            setStats((prev) => ({
                ...prev,
                pendingCount: Math.max(0, prev.pendingCount - 1),
                paidCount: prev.paidCount + 1,
            }));
        } catch (err: unknown) {
            const error = err as Error;
            setActionMessage({
                type: "error",
                text: error.message || "Đã xảy ra lỗi khi xác nhận.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    function calculateEstimatedNewExpires(order: OrderItem) {
        const now = new Date();
        const currentExpiresAt = order.lake.subscriptionExpiresAt
            ? new Date(order.lake.subscriptionExpiresAt)
            : null;
        const durationDays = order.durationDays || 30;
        const durationMs = durationDays * 24 * 60 * 60 * 1000;

        const baseDate =
            currentExpiresAt && currentExpiresAt.getTime() > now.getTime()
                ? currentExpiresAt
                : now;
        return new Date(baseDate.getTime() + durationMs);
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#102A43]">
                        Quản lý Đơn Thanh Toán &amp; Đối Soát
                    </h1>
                    <p className="text-xs text-[#627D98] mt-1">
                        Theo dõi các giao dịch gia hạn VietQR, xử lý đối soát ngân hàng và kích hoạt dịch vụ thủ công cho hồ câu.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => fetchOrders(pagination.page, selectedStatus, searchQuery)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                        <span>🔄 Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Alert Message */}
            {actionMessage && (
                <div
                    className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
                        actionMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span>{actionMessage.type === "success" ? "✓" : "⚠️"}</span>
                        <span>{actionMessage.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActionMessage(null)}
                        className="text-xs opacity-60 hover:opacity-100"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                        Tổng số đơn
                    </span>
                    <div className="mt-1 text-2xl font-black text-[#102A43]">
                        {stats.totalCount}
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Chờ thanh toán (PENDING)
                    </span>
                    <div className="mt-1 text-2xl font-black text-amber-700">
                        {stats.pendingCount}
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Đã thanh toán (PAID)
                    </span>
                    <div className="mt-1 text-2xl font-black text-emerald-700">
                        {stats.paidCount}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Đã hủy / Quá hạn
                    </span>
                    <div className="mt-1 text-2xl font-black text-slate-700">
                        {stats.cancelledCount}
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#D9D2C8] shadow-xs">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {[
                        { key: "ALL", label: "Tất cả" },
                        { key: "PENDING", label: "Chờ thanh toán" },
                        { key: "PAID", label: "Đã thanh toán" },
                        { key: "CANCELLED", label: "Đã hủy" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleFilterStatus(tab.key)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                selectedStatus === tab.key
                                    ? "bg-[#102A43] text-white shadow-xs"
                                    : "text-[#627D98] hover:bg-[#F4F2EE]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm mã đơn, tên hồ, bankRef..."
                        className="h-9 w-full sm:w-64 rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/50 px-3 text-xs text-[#27231F] placeholder:text-[#9FB3C8] focus:border-[#102A43] focus:bg-white focus:outline-hidden"
                    />
                    <button
                        type="submit"
                        className="h-9 rounded-xl bg-[#102A43] px-3.5 text-xs font-bold text-white hover:bg-[#1E3A5F] active:scale-95 transition-all cursor-pointer"
                    >
                        Tìm
                    </button>
                </form>
            </div>

            {/* Orders Table */}
            <div className="overflow-hidden rounded-2xl border border-[#D9D2C8] bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#27231F]">
                        <thead className="border-b border-[#D9D2C8] bg-[#F4F2EE]/80 text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                            <tr>
                                <th className="px-4 py-3.5">Mã đơn</th>
                                <th className="px-4 py-3.5">Hồ câu &amp; Tổ chức</th>
                                <th className="px-4 py-3.5">Gói cước</th>
                                <th className="px-4 py-3.5">Số tiền</th>
                                <th className="px-4 py-3.5">Trạng thái</th>
                                <th className="px-4 py-3.5">Mã giao dịch / BankRef</th>
                                <th className="px-4 py-3.5">Ngày tạo</th>
                                <th className="px-4 py-3.5 text-right">Thao tác</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#EBE6DF]">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-xs text-[#627D98]">
                                        Không tìm thấy đơn thanh toán nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-[#F9F8F6] transition-colors">
                                        <td className="px-4 py-3.5 font-mono font-bold text-[#102A43]">
                                            {order.orderCode}
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <div className="font-bold text-[#27231F]">
                                                {order.lake.name}
                                            </div>
                                            <div className="text-[11px] text-[#627D98]">
                                                {order.organization.name}
                                            </div>
                                            <div className="text-[10px] text-[#8A5A20] mt-0.5">
                                                Hạn: {order.lake.subscriptionExpiresAt ? new Date(order.lake.subscriptionExpiresAt).toLocaleDateString("vi-VN") : "Chưa có"}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                    order.planCode === "GOLD"
                                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                                        : order.planCode === "SILVER"
                                                          ? "bg-slate-100 text-slate-800 border border-slate-300"
                                                          : "bg-blue-100 text-blue-800"
                                                }`}
                                            >
                                                {order.planCode === "GOLD" ? "🥇 Gói Vàng" : order.planCode === "SILVER" ? "🥈 Gói Bạc" : order.planCode}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5 font-bold font-mono text-[#102A43]">
                                            {order.amountVnd.toLocaleString("vi-VN")} đ
                                        </td>

                                        <td className="px-4 py-3.5">
                                            {order.status === "PAID" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                                    ĐÃ THANH TOÁN
                                                </span>
                                            ) : order.status === "PENDING" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                                    CHỜ THANH TOÁN
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                                                    {order.status}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#627D98]">
                                            {order.bankRef || "—"}
                                        </td>

                                        <td className="px-4 py-3.5 text-[#627D98] text-[11px]">
                                            {new Date(order.createdAt).toLocaleString("vi-VN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}
                                        </td>

                                        <td className="px-4 py-3.5 text-right">
                                            {order.status === "PENDING" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openConfirmModal(order)}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-[#246B38] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1C542C] active:scale-95 transition-all shadow-xs cursor-pointer"
                                                >
                                                    <span>✓ Xác nhận thủ công</span>
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-emerald-700 font-bold">
                                                    ✓ Đã hoàn tất
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-[#D9D2C8] bg-[#F4F2EE]/40 px-4 py-3 text-xs text-[#627D98]">
                    <span>
                        Trang {pagination.page} / {pagination.totalPages} (Tổng cộng {pagination.totalCount} đơn)
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => fetchOrders(pagination.page - 1)}
                            className="rounded-lg border border-[#D9D2C8] bg-white px-2.5 py-1 text-xs font-semibold text-[#27231F] disabled:opacity-40"
                        >
                            ← Trước
                        </button>
                        <button
                            type="button"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => fetchOrders(pagination.page + 1)}
                            className="rounded-lg border border-[#D9D2C8] bg-white px-2.5 py-1 text-xs font-semibold text-[#27231F] disabled:opacity-40"
                        >
                            Sau →
                        </button>
                    </div>
                </div>
            </div>

            {/* Manual Confirm Modal */}
            {confirmModalOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#D9D2C8] animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-[#EBE6DF] pb-3 mb-4">
                            <div>
                                <h3 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                                    <span>👑</span>
                                    <span>Xác Nhận Thanh Toán Thủ Công</span>
                                </h3>
                                <p className="text-xs text-[#627D98] mt-0.5">
                                    Kích hoạt dịch vụ và gia hạn gói cước cho hồ câu
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setConfirmModalOrder(null)}
                                className="rounded-lg p-1 text-[#627D98] hover:bg-[#F4F2EE]"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleConfirmSubmit} className="space-y-4">
                            {/* Order summary */}
                            <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/60 p-3 text-xs space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-[#627D98]">Mã đơn:</span>
                                    <span className="font-mono font-bold text-[#102A43]">{confirmModalOrder.orderCode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#627D98]">Hồ câu:</span>
                                    <span className="font-bold text-[#27231F]">{confirmModalOrder.lake.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#627D98]">Gói cước:</span>
                                    <span className="font-bold text-[#8A5A20]">{confirmModalOrder.planCode} (30 ngày)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#627D98]">Số tiền thanh toán:</span>
                                    <span className="font-mono font-bold text-rose-600">
                                        {confirmModalOrder.amountVnd.toLocaleString("vi-VN")} đ
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-[#D9D2C8]/60">
                                    <span className="text-[#627D98]">Hạn mới dự kiến:</span>
                                    <span className="font-bold text-emerald-700">
                                        {calculateEstimatedNewExpires(confirmModalOrder).toLocaleDateString("vi-VN")}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Mã giao dịch ngân hàng (Tùy chọn)
                                </label>
                                <input
                                    type="text"
                                    value={bankRef}
                                    onChange={(e) => setBankRef(e.target.value)}
                                    placeholder="Ví dụ: FT262507891234 hoặc để trống hệ thống tự sinh"
                                    className="w-full rounded-xl border border-[#D9D2C8] px-3 py-2 text-xs text-[#27231F] placeholder:text-[#9FB3C8] focus:border-[#102A43] focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Lý do xác nhận <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    required
                                    placeholder="Ghi rõ thông tin sao kê, thời gian hoặc biên lai chuyển khoản..."
                                    className="w-full rounded-xl border border-[#D9D2C8] p-3 text-xs text-[#27231F] placeholder:text-[#9FB3C8] focus:border-[#102A43] focus:outline-hidden"
                                />
                                <span className="text-[10px] text-[#627D98]">
                                    Lý do này sẽ được ghi vĩnh viễn vào nhật ký Audit Log của hệ thống.
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmModalOrder(null)}
                                    className="flex-1 rounded-xl border border-[#D9D2C8] py-2.5 text-xs font-semibold text-[#627D98] hover:bg-[#F4F2EE]"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-xl bg-[#246B38] py-2.5 text-xs font-bold text-white hover:bg-[#1C542C] active:scale-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? "Đang xác nhận..." : "✓ Xác nhận kích hoạt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
