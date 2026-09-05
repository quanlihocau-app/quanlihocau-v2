"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionStatus } from "@/generated/prisma/enums";

export interface LakeItem {
    id: string;
    lakeName: string;
    organizationName: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
    subscriptionStatus: SubscriptionStatus;
    subscriptionExpiresAt: string | null;
    currentMonthSessionsCount: number;
    currentMonthInvoicesCount: number;
    createdAt: string;
}

export interface StatsOverview {
    totalLakes: number;
    activeCount: number;
    trialCount: number;
    graceCount: number;
    suspendedCount: number;
}

interface LakesAdminClientProps {
    initialLakes: LakeItem[];
    initialPagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
    };
    initialStats: StatsOverview;
}

function getStatusBadge(status: SubscriptionStatus) {
    switch (status) {
        case SubscriptionStatus.ACTIVE:
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    HOẠT ĐỘNG (ACTIVE)
                </span>
            );
        case SubscriptionStatus.TRIAL:
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    DÙNG THỬ (TRIAL)
                </span>
            );
        case SubscriptionStatus.GRACE_PERIOD:
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    GIA HẠN (GRACE)
                </span>
            );
        case SubscriptionStatus.SUSPENDED:
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                    TẠM NGƯNG (SUSPENDED)
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {status}
                </span>
            );
    }
}

function formatDate(dateString: string | null) {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
}

export function LakesAdminClient({
    initialLakes,
    initialPagination,
    initialStats,
}: LakesAdminClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [lakes, setLakes] = useState<LakeItem[]>(initialLakes);
    const [pagination, setPagination] = useState(initialPagination);
    const [stats, setStats] = useState<StatsOverview>(initialStats);

    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modal: Update Subscription
    const [editingLake, setEditingLake] = useState<LakeItem | null>(null);
    const [newStatus, setNewStatus] = useState<SubscriptionStatus>(SubscriptionStatus.ACTIVE);
    const [newExpiresAt, setNewExpiresAt] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Modal: Impersonate Confirm
    const [impersonatingLake, setImpersonatingLake] = useState<LakeItem | null>(null);
    const [isImpersonating, setIsImpersonating] = useState(false);

    async function fetchLakes(page = 1, currentSearch = search, currentStatus = selectedStatus) {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("limit", pagination.limit.toString());
            if (currentSearch) params.set("search", currentSearch);
            if (currentStatus !== "ALL") params.set("status", currentStatus);

            const res = await fetch(`/api/admin/lakes?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLakes(data.data);
                setPagination(data.pagination);
                setStats(data.stats);
            }
        } catch {
            console.error("Lỗi khi tải danh sách hồ.");
        } finally {
            setLoading(false);
        }
    }

    // Debounced search / filter trigger
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchLakes(1, search, selectedStatus);
        }, 300);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, selectedStatus]);

    function openEditModal(lake: LakeItem) {
        setEditingLake(lake);
        setNewStatus(lake.subscriptionStatus);
        setNewExpiresAt(
            lake.subscriptionExpiresAt
                ? new Date(lake.subscriptionExpiresAt).toISOString().split("T")[0]
                : ""
        );
        setReason("");
    }

    function addDaysToExpiry(days: number) {
        const base = newExpiresAt ? new Date(newExpiresAt) : new Date();
        base.setDate(base.getDate() + days);
        setNewExpiresAt(base.toISOString().split("T")[0]);
    }

    async function handleUpdateSubscription(e: React.FormEvent) {
        e.preventDefault();
        if (!editingLake) return;

        setIsUpdating(true);
        try {
            const res = await fetch(`/api/admin/lakes/${editingLake.id}/subscription`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
                    reason: reason.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setToastMessage(data.message || "Đã cập nhật trạng thái thuê bao.");
                setEditingLake(null);
                fetchLakes(pagination.page);
            } else {
                alert(data.error || "Không thể cập nhật trạng thái.");
            }
        } catch {
            alert("Lỗi kết nối máy chủ khi cập nhật.");
        } finally {
            setIsUpdating(false);
        }
    }

    async function handleStartImpersonate() {
        if (!impersonatingLake) return;

        setIsImpersonating(true);
        try {
            const res = await fetch(`/api/admin/lakes/${impersonatingLake.id}/impersonate`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                startTransition(() => {
                    router.push(data.redirectUrl || "/sessions");
                    router.refresh();
                });
            } else {
                alert(data.error || "Không thể khởi tạo phiên hỗ trợ.");
                setIsImpersonating(false);
            }
        } catch {
            alert("Lỗi kết nối mạng khi khởi tạo hỗ trợ kỹ thuật.");
            setIsImpersonating(false);
        }
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-[#766F67] uppercase tracking-wider">
                        Tổng số hồ
                    </span>
                    <p className="mt-1 text-2xl font-bold text-[#102A43] tabular-nums">
                        {stats.totalLakes}
                    </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                        Đang hoạt động
                    </span>
                    <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
                        {stats.activeCount}
                    </p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                        Đang dùng thử
                    </span>
                    <p className="mt-1 text-2xl font-bold text-blue-700 tabular-nums">
                        {stats.trialCount}
                    </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                        Đang gia hạn
                    </span>
                    <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
                        {stats.graceCount}
                    </p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                        Tạm ngưng
                    </span>
                    <p className="mt-1 text-2xl font-bold text-rose-700 tabular-nums">
                        {stats.suspendedCount}
                    </p>
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-sm animate-in fade-in">
                    <span>{toastMessage}</span>
                    <button
                        onClick={() => setToastMessage(null)}
                        className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Main Panel */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white shadow-xs overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="border-b border-[#D9D2C8] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FBF9F5]">
                    <div className="relative w-full sm:w-80">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm tên hồ, tổ chức, tên chủ hồ..."
                            className="w-full rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2.5 text-xs text-[#27231F] placeholder-[#766F67] focus:border-[#8A5A20] focus:outline-none focus:ring-1 focus:ring-[#8A5A20]"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-[#766F67] shrink-0">
                            Trạng thái:
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full sm:w-auto rounded-xl border border-[#D9D2C8] bg-white px-3 py-2 text-xs font-medium text-[#27231F] focus:border-[#8A5A20] focus:outline-none"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value={SubscriptionStatus.ACTIVE}>Hoạt động (ACTIVE)</option>
                            <option value={SubscriptionStatus.TRIAL}>Dùng thử (TRIAL)</option>
                            <option value={SubscriptionStatus.GRACE_PERIOD}>Gia hạn (GRACE_PERIOD)</option>
                            <option value={SubscriptionStatus.SUSPENDED}>Tạm ngưng (SUSPENDED)</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-[#D9D2C8] bg-[#F4F2EE] text-[11px] font-bold text-[#766F67] uppercase tracking-wider">
                                <th className="px-4 py-3.5 sm:px-6">Hồ câu & Tổ chức</th>
                                <th className="px-4 py-3.5">Chủ hồ & Liên hệ</th>
                                <th className="px-4 py-3.5">Trạng thái Thuê bao</th>
                                <th className="px-4 py-3.5">Hạn thuê bao</th>
                                <th className="px-4 py-3.5">Sử dụng trong tháng</th>
                                <th className="px-4 py-3.5 text-right sm:px-6">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D9D2C8]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-[#766F67]">
                                        Đang tải dữ liệu hồ câu...
                                    </td>
                                </tr>
                            ) : lakes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-[#766F67]">
                                        Không tìm thấy hồ câu nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                lakes.map((lake) => (
                                    <tr key={lake.id} className="hover:bg-[#FDF9F0]/60 transition-colors">
                                        {/* Lake Info */}
                                        <td className="px-4 py-4 sm:px-6">
                                            <div className="font-bold text-[#27231F] text-sm">
                                                {lake.lakeName}
                                            </div>
                                            <div className="text-[11px] text-[#766F67]">
                                                {lake.organizationName}
                                            </div>
                                        </td>

                                        {/* Owner Info */}
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-[#27231F]">
                                                {lake.ownerName}
                                            </div>
                                            <div className="text-[11px] text-[#766F67]">
                                                {lake.ownerPhone !== "—" ? lake.ownerPhone : lake.ownerEmail}
                                            </div>
                                        </td>

                                        {/* Subscription Status */}
                                        <td className="px-4 py-4">
                                            {getStatusBadge(lake.subscriptionStatus)}
                                        </td>

                                        {/* Expiry Date */}
                                        <td className="px-4 py-4 tabular-nums text-[#27231F] font-medium">
                                            {formatDate(lake.subscriptionExpiresAt)}
                                        </td>

                                        {/* Usage Metrics (Counts only - NO financial figures) */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-md bg-slate-100 px-2 py-1 text-[11px]">
                                                    <span className="text-[#766F67]">Phiên: </span>
                                                    <strong className="text-[#102A43] tabular-nums">
                                                        {lake.currentMonthSessionsCount}
                                                    </strong>
                                                </div>
                                                <div className="rounded-md bg-slate-100 px-2 py-1 text-[11px]">
                                                    <span className="text-[#766F67]">Hóa đơn: </span>
                                                    <strong className="text-[#102A43] tabular-nums">
                                                        {lake.currentMonthInvoicesCount}
                                                    </strong>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-4 text-right sm:px-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(lake)}
                                                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#D9D2C8] bg-white px-2.5 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] active:scale-95 transition-all shadow-2xs"
                                                >
                                                    Đổi trạng thái
                                                </button>
                                                <button
                                                    onClick={() => setImpersonatingLake(lake)}
                                                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#8A5A20]/40 bg-[#FDF9F0] px-2.5 text-xs font-bold text-[#8A5A20] hover:bg-[#F8EFE1] active:scale-95 transition-all shadow-2xs"
                                                >
                                                    🛠️ Hỗ trợ kỹ thuật
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-[#D9D2C8] px-4 py-3.5 sm:px-6 flex items-center justify-between bg-[#FBF9F5]">
                    <span className="text-xs text-[#766F67]">
                        Hiển thị <strong>{lakes.length}</strong> / <strong>{pagination.totalCount}</strong> hồ
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={pagination.page <= 1 || loading}
                            onClick={() => fetchLakes(pagination.page - 1)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-[#D9D2C8] bg-white px-3 text-xs font-semibold text-[#27231F] disabled:opacity-40 hover:bg-[#F4F2EE] transition-colors"
                        >
                            ← Trước
                        </button>
                        <span className="text-xs font-medium text-[#27231F] px-1">
                            {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            disabled={pagination.page >= pagination.totalPages || loading}
                            onClick={() => fetchLakes(pagination.page + 1)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-[#D9D2C8] bg-white px-3 text-xs font-semibold text-[#27231F] disabled:opacity-40 hover:bg-[#F4F2EE] transition-colors"
                        >
                            Sau →
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal: Update Subscription Status */}
            {editingLake && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#D9D2C8] bg-white p-6 shadow-xl space-y-5">
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <h3 className="text-base font-bold text-[#27231F]">
                                Điều chỉnh Thuê bao Hồ câu
                            </h3>
                            <button
                                onClick={() => setEditingLake(null)}
                                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="rounded-xl bg-[#F8F6F0] p-3 text-xs space-y-1">
                            <p className="font-bold text-[#102A43]">{editingLake.lakeName}</p>
                            <p className="text-[#766F67]">Chủ hồ: {editingLake.ownerName}</p>
                        </div>

                        <form onSubmit={handleUpdateSubscription} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-[#27231F] mb-1.5">
                                    Trạng thái Thuê bao mới
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as SubscriptionStatus)}
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-white p-2.5 font-semibold text-[#27231F] focus:border-[#8A5A20] focus:outline-none"
                                >
                                    <option value={SubscriptionStatus.ACTIVE}>Hoạt động (ACTIVE)</option>
                                    <option value={SubscriptionStatus.TRIAL}>Dùng thử (TRIAL)</option>
                                    <option value={SubscriptionStatus.GRACE_PERIOD}>Gia hạn (GRACE_PERIOD)</option>
                                    <option value={SubscriptionStatus.SUSPENDED}>Tạm ngưng (SUSPENDED)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-[#27231F] mb-1.5">
                                    Ngày hết hạn thuê bao
                                </label>
                                <input
                                    type="date"
                                    value={newExpiresAt}
                                    onChange={(e) => setNewExpiresAt(e.target.value)}
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-white p-2.5 font-medium text-[#27231F] focus:border-[#8A5A20] focus:outline-none"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => addDaysToExpiry(30)}
                                        className="rounded-lg border border-[#D9D2C8] bg-[#F4F2EE] px-2 py-1 text-[10px] font-semibold text-[#27231F] hover:bg-[#EAE6DF]"
                                    >
                                        +30 ngày
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addDaysToExpiry(90)}
                                        className="rounded-lg border border-[#D9D2C8] bg-[#F4F2EE] px-2 py-1 text-[10px] font-semibold text-[#27231F] hover:bg-[#EAE6DF]"
                                    >
                                        +90 ngày
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addDaysToExpiry(365)}
                                        className="rounded-lg border border-[#D9D2C8] bg-[#F4F2EE] px-2 py-1 text-[10px] font-semibold text-[#27231F] hover:bg-[#EAE6DF]"
                                    >
                                        +1 năm
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-[#27231F] mb-1.5">
                                    Lý do thay đổi (Ghi Audit Log)
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Ví dụ: Khách hàng chuyển khoản gói năm..."
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-white p-2.5 text-[#27231F] placeholder-[#766F67] focus:border-[#8A5A20] focus:outline-none"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setEditingLake(null)}
                                    className="h-9 rounded-xl border border-[#D9D2C8] bg-white px-4 font-semibold text-[#27231F] hover:bg-[#F4F2EE]"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="h-9 rounded-xl bg-[#8A5A20] px-4 font-bold text-white hover:bg-[#704716] disabled:opacity-50"
                                >
                                    {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Impersonate Confirmation */}
            {impersonatingLake && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-white p-6 shadow-xl space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[#27231F]">
                                    Xác nhận Hỗ trợ Kỹ thuật
                                </h3>
                                <p className="text-[11px] text-[#766F67]">
                                    Cảnh báo truy cập không gian hồ câu
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 leading-relaxed">
                            Bạn chuẩn bị truy cập vào không gian vận hành của hồ <strong>{impersonatingLake.lakeName}</strong>.
                            <p className="mt-1 font-semibold text-rose-700">
                                ⚠️ Hệ thống sẽ ghi nhận Audit Log cảnh báo: &quot;System Admin đang truy cập hồ {impersonatingLake.lakeName} để hỗ trợ&quot;.
                            </p>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2.5 text-xs">
                            <button
                                type="button"
                                disabled={isImpersonating}
                                onClick={() => setImpersonatingLake(null)}
                                className="h-9 rounded-xl border border-[#D9D2C8] bg-white px-4 font-semibold text-[#27231F] hover:bg-[#F4F2EE]"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={isImpersonating || isPending}
                                onClick={handleStartImpersonate}
                                className="h-9 rounded-xl bg-[#102A43] px-4 font-bold text-white hover:bg-[#1E3A5F] disabled:opacity-50"
                            >
                                {isImpersonating ? "Đang chuyển không gian..." : "Bắt đầu Hỗ trợ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
