"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
    UserListItem,
    UserAdminStats,
    AvailablePlan,
    UserDetailData,
} from "./types";

export type { UserListItem, UserAdminStats, AvailablePlan, UserDetailData };

interface UsersAdminClientProps {
    initialUsers: UserListItem[];
    initialStats: UserAdminStats;
    initialPagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    availablePlans: AvailablePlan[];
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

function formatDateOnly(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
}

function getStatusBadge(status: string, isLocked?: boolean) {
    if (isLocked) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                BỊ KHÓA
            </span>
        );
    }

    switch (status) {
        case "ACTIVE":
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    HOẠT ĐỘNG
                </span>
            );
        case "TRIAL":
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    DÙNG THỬ
                </span>
            );
        case "GRACE_PERIOD":
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    GIA HẠN NỢ
                </span>
            );
        case "SUSPENDED":
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                    HẾT HẠN / TẠM NGƯNG
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700">
                    {status}
                </span>
            );
    }
}

export function UsersAdminClient({
    initialUsers,
    initialStats,
    initialPagination,
    availablePlans,
}: UsersAdminClientProps) {
    // Data State
    const [users, setUsers] = useState<UserListItem[]>(initialUsers);
    const [stats, setStats] = useState<UserAdminStats>(initialStats);
    const [pagination, setPagination] = useState(initialPagination);
    const [isLoading, setIsLoading] = useState(false);

    // Filters State
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [planFilter, setPlanFilter] = useState("ALL");
    const [rangeFilter, setRangeFilter] = useState("all");

    // Modal & Drawer State
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userDetail, setUserDetail] = useState<UserDetailData | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Action Modals State
    const [activeActionModal, setActiveActionModal] = useState<
        "LOCK" | "EXTEND_TRIAL" | "CHANGE_PLAN" | "EXTEND_SUB" | "REVOKE_SESSIONS" | null
    >(null);
    const [targetUser, setTargetUser] = useState<UserListItem | null>(null);
    const [actionSubmitting, setActionSubmitting] = useState(false);

    // Action Inputs
    const [lockReason, setLockReason] = useState("");
    const [extendDays, setExtendDays] = useState<number>(7);
    const [extendReason, setExtendReason] = useState("");
    const [selectedPlanCode, setSelectedPlanCode] = useState<string>("SILVER");
    const [planChangeDays, setPlanChangeDays] = useState<number>(30);
    const [planChangeReason, setPlanChangeReason] = useState("");
    const [revokeReason, setRevokeReason] = useState("");

    // Debounce timer for fast responsive search
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Fetch users with current filters & pagination
    const fetchUsers = useCallback(
        async (
            page = 1,
            currentQ = q,
            status = statusFilter,
            plan = planFilter,
            range = rangeFilter,
        ) => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    page: String(page),
                    limit: "20",
                    range,
                });
                if (currentQ.trim()) params.set("q", currentQ.trim());
                if (status !== "ALL") params.set("status", status);
                if (plan !== "ALL") params.set("plan", plan);

                const res = await fetch(`/api/admin/users?${params.toString()}`);
                const data = await res.json();

                if (res.ok && data.ok) {
                    setUsers(data.users);
                    setPagination(data.pagination);
                    setStats(data.metrics);
                } else {
                    toast.error(data?.error?.message || "Không thể tải danh sách người dùng.");
                }
            } catch {
                toast.error("Lỗi kết nối khi tải danh sách người dùng.");
            } finally {
                setIsLoading(false);
            }
        },
        [q, statusFilter, planFilter, rangeFilter],
    );

    const handleSearchChange = useCallback(
        (val: string) => {
            setQ(val);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                fetchUsers(1, val, statusFilter, planFilter, rangeFilter);
            }, 350);
        },
        [fetchUsers, statusFilter, planFilter, rangeFilter],
    );

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    // Open User Detail Drawer
    async function openUserDetail(userId: string) {
        setSelectedUserId(userId);
        setIsLoadingDetail(true);
        setUserDetail(null);

        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            const data = await res.json();
            if (res.ok && data.ok) {
                setUserDetail(data.user);
            } else {
                toast.error(data?.error?.message || "Không thể tải chi tiết người dùng.");
                setSelectedUserId(null);
            }
        } catch {
            toast.error("Lỗi khi kết nối đến máy chủ.");
            setSelectedUserId(null);
        } finally {
            setIsLoadingDetail(false);
        }
    }

    // Handlers for Dangerous Actions
    function handleOpenLockModal(u: UserListItem) {
        setTargetUser(u);
        setLockReason("");
        setActiveActionModal("LOCK");
    }

    function handleOpenExtendTrialModal(u: UserListItem) {
        setTargetUser(u);
        setExtendDays(7);
        setExtendReason("");
        setActiveActionModal("EXTEND_TRIAL");
    }

    function handleOpenChangePlanModal(u: UserListItem) {
        setTargetUser(u);
        setSelectedPlanCode(u.lake?.subscriptionPlan || "SILVER");
        setPlanChangeDays(30);
        setPlanChangeReason("");
        setActiveActionModal("CHANGE_PLAN");
    }

    function handleOpenExtendSubModal(u: UserListItem) {
        setTargetUser(u);
        setExtendDays(30);
        setExtendReason("");
        setActiveActionModal("EXTEND_SUB");
    }

    function handleOpenRevokeSessionsModal(u: UserListItem) {
        setTargetUser(u);
        setRevokeReason("");
        setActiveActionModal("REVOKE_SESSIONS");
    }

    // Submit Lock/Unlock with Optimistic UI Update
    async function submitLock() {
        if (!targetUser) return;
        const newIsLocked = !targetUser.isLocked;

        if (newIsLocked && lockReason.trim().length < 3) {
            toast.error("Vui lòng nhập lý do khóa tài khoản (tối thiểu 3 ký tự).");
            return;
        }

        const rollbackUsers = [...users];
        const rollbackDetail = userDetail ? { ...userDetail } : null;

        // Optimistic update (0ms delay)
        setUsers((prev) =>
            prev.map((u) =>
                u.id === targetUser.id
                    ? {
                          ...u,
                          isLocked: newIsLocked,
                          lockedReason: newIsLocked ? lockReason.trim() : null,
                          visualStatus: newIsLocked ? "LOCKED" : u.lake?.subscriptionStatus || "TRIAL",
                      }
                    : u,
            ),
        );
        if (userDetail && userDetail.id === targetUser.id) {
            setUserDetail((prev) =>
                prev
                    ? {
                          ...prev,
                          isLocked: newIsLocked,
                          lockedReason: newIsLocked ? lockReason.trim() : null,
                      }
                    : null,
            );
        }
        setActiveActionModal(null);

        setActionSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}/lock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    isLocked: newIsLocked,
                    reason: lockReason.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success(newIsLocked ? "Đã khóa tài khoản thành công." : "Đã mở khóa tài khoản.");
            } else {
                // Revert on error
                setUsers(rollbackUsers);
                if (rollbackDetail) setUserDetail(rollbackDetail);
                toast.error(data?.error?.message || "Thao tác thất bại.");
            }
        } catch {
            setUsers(rollbackUsers);
            if (rollbackDetail) setUserDetail(rollbackDetail);
            toast.error("Lỗi kết nối máy chủ.");
        } finally {
            setActionSubmitting(false);
        }
    }

    // Submit Extend Trial with Optimistic UI Update
    async function submitExtendTrial() {
        if (!targetUser) return;
        if (!extendDays || extendDays < 1) {
            toast.error("Số ngày gia hạn phải từ 1 trở lên.");
            return;
        }

        const rollbackUsers = [...users];
        const previewNewExpiresAt = computePreviewIso(targetUser.lake?.subscriptionExpiresAt, extendDays);

        // Optimistic update
        setUsers((prev) =>
            prev.map((u) =>
                u.id === targetUser.id && u.lake
                    ? {
                          ...u,
                          lake: {
                              ...u.lake,
                              subscriptionStatus: "TRIAL",
                              subscriptionPlan: "TRIAL",
                              subscriptionExpiresAt: previewNewExpiresAt,
                          },
                          visualStatus: "TRIAL",
                      }
                    : u,
            ),
        );
        setActiveActionModal(null);

        setActionSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}/extend-trial`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    days: Number(extendDays),
                    reason: extendReason.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success(`Đã gia hạn dùng thử +${extendDays} ngày!`);
                if (selectedUserId === targetUser.id) openUserDetail(targetUser.id);
            } else {
                setUsers(rollbackUsers);
                toast.error(data?.error?.message || "Không thể gia hạn dùng thử.");
            }
        } catch {
            setUsers(rollbackUsers);
            toast.error("Lỗi kết nối máy chủ.");
        } finally {
            setActionSubmitting(false);
        }
    }

    // Submit Change Plan with Optimistic UI Update
    async function submitChangePlan() {
        if (!targetUser) return;

        const rollbackUsers = [...users];

        // Optimistic update
        setUsers((prev) =>
            prev.map((u) =>
                u.id === targetUser.id && u.lake
                    ? {
                          ...u,
                          lake: {
                              ...u.lake,
                              subscriptionPlan: selectedPlanCode,
                              subscriptionStatus: selectedPlanCode === "TRIAL" ? "TRIAL" : "ACTIVE",
                          },
                          visualStatus: selectedPlanCode === "TRIAL" ? "TRIAL" : "ACTIVE",
                      }
                    : u,
            ),
        );
        setActiveActionModal(null);

        setActionSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}/change-plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planCode: selectedPlanCode,
                    days: Number(planChangeDays) || 30,
                    reason: planChangeReason.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success(`Đã đổi gói sang ${selectedPlanCode} thành công!`);
                if (selectedUserId === targetUser.id) openUserDetail(targetUser.id);
            } else {
                setUsers(rollbackUsers);
                toast.error(data?.error?.message || "Không thể đổi gói dịch vụ.");
            }
        } catch {
            setUsers(rollbackUsers);
            toast.error("Lỗi kết nối máy chủ.");
        } finally {
            setActionSubmitting(false);
        }
    }

    // Submit Extend Subscription with Optimistic UI Update
    async function submitExtendSubscription() {
        if (!targetUser) return;
        if (!extendDays || extendDays < 1) {
            toast.error("Số ngày gia hạn phải lớn hơn 0.");
            return;
        }

        const rollbackUsers = [...users];
        const previewNewExpiresAt = computePreviewIso(targetUser.lake?.subscriptionExpiresAt, extendDays);

        // Optimistic update
        setUsers((prev) =>
            prev.map((u) =>
                u.id === targetUser.id && u.lake
                    ? {
                          ...u,
                          lake: {
                              ...u.lake,
                              subscriptionStatus: "ACTIVE",
                              subscriptionExpiresAt: previewNewExpiresAt,
                          },
                          visualStatus: "ACTIVE",
                      }
                    : u,
            ),
        );
        setActiveActionModal(null);

        setActionSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}/extend-subscription`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    days: Number(extendDays),
                    reason: extendReason.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success(`Đã gia hạn thuê bao +${extendDays} ngày!`);
                if (selectedUserId === targetUser.id) openUserDetail(targetUser.id);
            } else {
                setUsers(rollbackUsers);
                toast.error(data?.error?.message || "Không thể gia hạn ngày sử dụng.");
            }
        } catch {
            setUsers(rollbackUsers);
            toast.error("Lỗi kết nối máy chủ.");
        } finally {
            setActionSubmitting(false);
        }
    }

    // Submit Revoke Sessions
    async function submitRevokeSessions() {
        if (!targetUser) return;

        setActiveActionModal(null);
        setActionSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}/revoke-sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: revokeReason.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success("Đã đăng xuất tài khoản khỏi tất cả thiết bị!");
                if (selectedUserId === targetUser.id) openUserDetail(targetUser.id);
            } else {
                toast.error(data?.error?.message || "Không thể thu hồi phiên.");
            }
        } catch {
            toast.error("Lỗi kết nối máy chủ.");
        } finally {
            setActionSubmitting(false);
        }
    }

    // Helpers: Compute preview expiration date
    function computePreviewIso(currentExpiresAt: string | null | undefined, addedDays: number): string {
        const now = new Date();
        const base = currentExpiresAt && new Date(currentExpiresAt) > now ? new Date(currentExpiresAt) : now;
        const newD = new Date(base.getTime() + (Number(addedDays) || 0) * 24 * 60 * 60 * 1000);
        return newD.toISOString();
    }

    function computePreviewDate(currentExpiresAt: string | null | undefined, addedDays: number): string {
        return formatDateOnly(computePreviewIso(currentExpiresAt, addedDays));
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            {/* Header Title & Date Range Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#102A43] tracking-tight">
                        Quản lý Người dùng SaaS
                    </h1>
                    <p className="text-xs sm:text-sm text-[#766F67] mt-1">
                        Quản trị tập trung tài khoản chủ hồ, gói dịch vụ, gia hạn và phân quyền hệ thống.
                    </p>
                </div>

                {/* Range Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#D9D2C8] bg-white p-1 shadow-xs">
                    {[
                        { label: "Hôm nay", value: "today" },
                        { label: "7 ngày", value: "7d" },
                        { label: "30 ngày", value: "30d" },
                        { label: "Tháng này", value: "month" },
                        { label: "Tất cả", value: "all" },
                    ].map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                                setRangeFilter(item.value);
                                fetchUsers(1, q, statusFilter, planFilter, item.value);
                            }}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                rangeFilter === item.value
                                    ? "bg-[#102A43] text-white"
                                    : "text-[#766F67] hover:bg-[#F4F2EE] hover:text-[#102A43]"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dashboard Overview Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-[#D9D2C8] bg-white p-3.5 shadow-xs">
                    <span className="text-[11px] font-semibold text-[#766F67] uppercase tracking-wider">
                        Tổng tài khoản
                    </span>
                    <p className="mt-1 text-2xl font-bold text-[#102A43] tabular-nums">
                        {stats.totalUsers}
                    </p>
                    <span className="text-[10px] text-[#766F67]">
                        {stats.totalOrganizations} tổ chức / {stats.totalLakes} hồ
                    </span>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs">
                    <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                        Dùng thử (Trial)
                    </span>
                    <p className="mt-1 text-2xl font-bold text-blue-700 tabular-nums">
                        {stats.trialUsers}
                    </p>
                    <span className="text-[10px] text-blue-600">Đang thử nghiệm</span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                        Đang trả phí
                    </span>
                    <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
                        {stats.activeUsers}
                    </p>
                    <span className="text-[10px] text-emerald-600">Gói thuê bao Active</span>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
                    <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                        Sắp hết hạn (7d)
                    </span>
                    <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
                        {stats.expiringSoonUsers}
                    </p>
                    <span className="text-[10px] text-amber-600">Cần gia hạn sớm</span>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs">
                    <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                        Bị khóa / Hết hạn
                    </span>
                    <p className="mt-1 text-2xl font-bold text-rose-700 tabular-nums">
                        {stats.lockedUsers + stats.expiredUsers}
                    </p>
                    <span className="text-[10px] text-rose-600">
                        {stats.lockedUsers} khóa, {stats.expiredUsers} hết hạn
                    </span>
                </div>
            </div>

            {/* Search & Filters Toolbar */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4 shadow-xs space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    {/* Search Input */}
                    <div className="md:col-span-5 relative">
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                                    fetchUsers(1, q, statusFilter, planFilter, rangeFilter);
                                }
                            }}
                            placeholder="Tìm kiếm theo Tên, Số điện thoại, Email, Tên hồ..."
                            className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/40 px-3.5 py-2 text-xs sm:text-sm text-[#27231F] placeholder:text-[#766F67] focus:border-[#102A43] focus:bg-white focus:outline-none transition-colors"
                        />
                        {q && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                                    setQ("");
                                    fetchUsers(1, "", statusFilter, planFilter, rangeFilter);
                                }}
                                className="absolute right-2.5 top-2.5 text-xs text-[#766F67] hover:text-[#102A43] cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="md:col-span-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                fetchUsers(1, q, e.target.value, planFilter, rangeFilter);
                            }}
                            className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/40 px-3 py-2 text-xs sm:text-sm text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="TRIAL">Dùng thử (TRIAL)</option>
                            <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                            <option value="GRACE_PERIOD">Gia hạn nợ (GRACE)</option>
                            <option value="SUSPENDED">Hết hạn (SUSPENDED)</option>
                            <option value="LOCKED">Bị khóa (LOCKED)</option>
                        </select>
                    </div>

                    {/* Plan Filter */}
                    <div className="md:col-span-2">
                        <select
                            value={planFilter}
                            onChange={(e) => {
                                setPlanFilter(e.target.value);
                                fetchUsers(1, q, statusFilter, e.target.value, rangeFilter);
                            }}
                            className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/40 px-3 py-2 text-xs sm:text-sm text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">Tất cả gói</option>
                            {availablePlans.map((p) => (
                                <option key={p.code} value={p.code}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Submit Search Button */}
                    <div className="md:col-span-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fetchUsers(1, q, statusFilter, planFilter, rangeFilter)}
                            disabled={isLoading}
                            className="w-full rounded-xl bg-[#102A43] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1E3A5F] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {isLoading ? "Đang tìm..." : "Tìm kiếm"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area: Responsive Mobile Cards + Desktop Table */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white shadow-xs overflow-hidden">
                {/* Desktop Table View (md and above) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-[#D9D2C8] bg-[#F4F2EE]/60 text-[11px] font-bold text-[#766F67] uppercase tracking-wider">
                                <th className="px-4 py-3.5">Người dùng</th>
                                <th className="px-4 py-3.5">Hồ / Tổ chức</th>
                                <th className="px-4 py-3.5">Gói &amp; Hết hạn</th>
                                <th className="px-4 py-3.5">Trạng thái</th>
                                <th className="px-4 py-3.5">Đăng nhập gần nhất</th>
                                <th className="px-4 py-3.5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D9D2C8]/60">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-[#766F67]">
                                        Không tìm thấy người dùng nào phù hợp với điều kiện tìm kiếm.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="hover:bg-[#F4F2EE]/40 transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#102A43] group-hover:underline cursor-pointer" onClick={() => openUserDetail(u.id)}>
                                                    {u.name}
                                                </span>
                                                <span className="text-[11px] text-[#766F67]">
                                                    {u.phone || "Chưa có SĐT"} • {u.email}
                                                </span>
                                                <span className="text-[10px] text-[#766F67]/80">
                                                    Đăng ký: {formatDateOnly(u.createdAt)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-[#27231F]">
                                                    {u.lake?.name || "Chưa có hồ"}
                                                </span>
                                                <span className="text-[11px] text-[#766F67]">
                                                    {u.organization?.name || "—"}
                                                </span>
                                                <span className="text-[10px] text-[#8A5A20] font-medium">
                                                    Vai trò: {u.role || u.systemRole}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#102A43]">
                                                    {u.lake?.subscriptionPlan || "TRIAL"}
                                                </span>
                                                <span className="text-[11px] text-[#766F67]">
                                                    Hết hạn: {formatDateOnly(u.lake?.subscriptionExpiresAt)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(u.visualStatus, u.isLocked)}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] text-[#766F67]">
                                            {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Chưa đăng nhập"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openUserDetail(u.id)}
                                                    className="rounded-lg border border-[#D9D2C8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#102A43] hover:bg-[#F4F2EE] cursor-pointer"
                                                >
                                                    Chi tiết
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenLockModal(u)}
                                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                                                        u.isLocked
                                                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                            : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                                    }`}
                                                >
                                                    {u.isLocked ? "Mở khóa" : "Khóa"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View (< md) */}
                <div className="block md:hidden divide-y divide-[#D9D2C8]/70">
                    {users.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#766F67]">
                            Không tìm thấy người dùng nào.
                        </div>
                    ) : (
                        users.map((u) => (
                            <div key={u.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col">
                                        <span
                                            className="font-bold text-[#102A43] text-sm hover:underline cursor-pointer"
                                            onClick={() => openUserDetail(u.id)}
                                        >
                                            {u.name}
                                        </span>
                                        <span className="text-xs text-[#766F67]">
                                            {u.phone || "—"} • {u.email}
                                        </span>
                                    </div>
                                    {getStatusBadge(u.visualStatus, u.isLocked)}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-[#F4F2EE]/50 p-2.5 border border-[#D9D2C8]/50">
                                    <div>
                                        <span className="text-[10px] text-[#766F67] block">Hồ câu:</span>
                                        <span className="font-semibold text-[#27231F]">
                                            {u.lake?.name || "Chưa có"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[#766F67] block">Gói &amp; Hạn:</span>
                                        <span className="font-bold text-[#102A43]">
                                            {u.lake?.subscriptionPlan || "TRIAL"} (
                                            {formatDateOnly(u.lake?.subscriptionExpiresAt)})
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] text-[#766F67]">
                                        Đăng nhập: {u.lastLoginAt ? formatDateOnly(u.lastLoginAt) : "—"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openUserDetail(u.id)}
                                            className="rounded-lg border border-[#D9D2C8] bg-white px-2.5 py-1 text-xs font-semibold text-[#102A43] cursor-pointer"
                                        >
                                            Chi tiết
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenLockModal(u)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                                                u.isLocked
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-red-50 text-red-700 border border-red-200"
                                            }`}
                                        >
                                            {u.isLocked ? "Mở" : "Khóa"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination Toolbar */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[#D9D2C8] bg-[#F4F2EE]/40 px-4 py-3">
                        <span className="text-xs text-[#766F67]">
                            Trang <strong>{pagination.page}</strong> / <strong>{pagination.totalPages}</strong> ({pagination.total} người dùng)
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => fetchUsers(pagination.page - 1)}
                                disabled={pagination.page <= 1 || isLoading}
                                className="rounded-lg border border-[#D9D2C8] bg-white px-3 py-1 text-xs font-medium text-[#27231F] disabled:opacity-40 cursor-pointer"
                            >
                                Trước
                            </button>
                            <button
                                type="button"
                                onClick={() => fetchUsers(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                className="rounded-lg border border-[#D9D2C8] bg-white px-3 py-1 text-xs font-medium text-[#27231F] disabled:opacity-40 cursor-pointer"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* USER DETAIL DRAWER / MODAL */}
            {/* ========================================================================= */}
            {selectedUserId && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
                    <div
                        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-[#D9D2C8] overflow-y-auto animate-in slide-in-from-right duration-200"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Drawer Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9D2C8] bg-white px-5 py-4">
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-[#102A43]">
                                    Chi tiết Tài khoản SaaS
                                </h2>
                                <p className="text-xs text-[#766F67]">
                                    ID: <span className="font-mono">{selectedUserId}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedUserId(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#766F67] hover:bg-[#F4F2EE] hover:text-[#102A43] cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Drawer Content */}
                        {isLoadingDetail ? (
                            <div className="flex-1 flex items-center justify-center p-8">
                                <div className="text-center space-y-2">
                                    <div className="h-6 w-6 border-2 border-[#102A43] border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-xs text-[#766F67]">Đang tải dữ liệu chi tiết...</p>
                                </div>
                            </div>
                        ) : userDetail ? (
                            <div className="p-5 space-y-6 flex-1">
                                {/* Quick Action Bar inside Drawer */}
                                <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#F4F2EE] border border-[#D9D2C8]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const item = users.find((u) => u.id === userDetail.id) || {
                                                ...userDetail,
                                                visualStatus: userDetail.primaryLake?.subscriptionStatus || "TRIAL",
                                                organization: null,
                                                lake: userDetail.primaryLake,
                                                role: null,
                                                membershipCount: userDetail.memberships.length,
                                            };
                                            handleOpenLockModal(item);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                            userDetail.isLocked
                                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                                : "bg-red-600 text-white hover:bg-red-700"
                                        }`}
                                    >
                                        {userDetail.isLocked ? "🔓 Mở khóa tài khoản" : "🔒 Khóa tài khoản"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const item = users.find((u) => u.id === userDetail.id) || {
                                                ...userDetail,
                                                visualStatus: userDetail.primaryLake?.subscriptionStatus || "TRIAL",
                                                organization: null,
                                                lake: userDetail.primaryLake,
                                                role: null,
                                                membershipCount: userDetail.memberships.length,
                                            };
                                            handleOpenExtendTrialModal(item);
                                        }}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D9D2C8] text-[#102A43] hover:bg-[#F4F2EE] cursor-pointer"
                                    >
                                        ⏳ Gia hạn Trial
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const item = users.find((u) => u.id === userDetail.id) || {
                                                ...userDetail,
                                                visualStatus: userDetail.primaryLake?.subscriptionStatus || "TRIAL",
                                                organization: null,
                                                lake: userDetail.primaryLake,
                                                role: null,
                                                membershipCount: userDetail.memberships.length,
                                            };
                                            handleOpenChangePlanModal(item);
                                        }}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D9D2C8] text-[#102A43] hover:bg-[#F4F2EE] cursor-pointer"
                                    >
                                        🔄 Đổi gói
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const item = users.find((u) => u.id === userDetail.id) || {
                                                ...userDetail,
                                                visualStatus: userDetail.primaryLake?.subscriptionStatus || "TRIAL",
                                                organization: null,
                                                lake: userDetail.primaryLake,
                                                role: null,
                                                membershipCount: userDetail.memberships.length,
                                            };
                                            handleOpenExtendSubModal(item);
                                        }}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D9D2C8] text-[#102A43] hover:bg-[#F4F2EE] cursor-pointer"
                                    >
                                        ➕ Gia hạn ngày
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const item = users.find((u) => u.id === userDetail.id) || {
                                                ...userDetail,
                                                visualStatus: userDetail.primaryLake?.subscriptionStatus || "TRIAL",
                                                organization: null,
                                                lake: userDetail.primaryLake,
                                                role: null,
                                                membershipCount: userDetail.memberships.length,
                                            };
                                            handleOpenRevokeSessionsModal(item);
                                        }}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200 cursor-pointer"
                                    >
                                        🚪 Đăng xuất mọi thiết bị
                                    </button>
                                </div>

                                {/* SECTION 1: THÔNG TIN TÀI KHOẢN */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#766F67] border-b border-[#D9D2C8] pb-1.5">
                                        1. Thông tin Tài khoản
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <span className="text-[#766F67] block">Họ và tên:</span>
                                            <span className="font-bold text-[#102A43]">{userDetail.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#766F67] block">Số điện thoại:</span>
                                            <span className="font-semibold text-[#27231F]">
                                                {userDetail.phone || "—"}{" "}
                                                {userDetail.phoneVerified && (
                                                    <span className="text-emerald-600 font-bold text-[10px]">
                                                        (Đã xác thực OTP)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[#766F67] block">Email:</span>
                                            <span className="font-mono text-[#27231F]">{userDetail.email}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#766F67] block">Trạng thái:</span>
                                            {getStatusBadge(
                                                userDetail.primaryLake?.subscriptionStatus || "TRIAL",
                                                userDetail.isLocked
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-[#766F67] block">Ngày tạo:</span>
                                            <span className="text-[#27231F]">{formatDate(userDetail.createdAt)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#766F67] block">Đăng nhập gần nhất:</span>
                                            <span className="text-[#27231F]">
                                                {userDetail.lastLoginAt ? formatDate(userDetail.lastLoginAt) : "Chưa từng"}
                                            </span>
                                        </div>
                                        {userDetail.isLocked && (
                                            <div className="col-span-2 rounded-xl bg-red-50 p-2.5 border border-red-200">
                                                <span className="text-red-800 font-bold block text-[11px]">
                                                    Lý do khóa:
                                                </span>
                                                <p className="text-xs text-red-700 mt-0.5">{userDetail.lockedReason}</p>
                                                <span className="text-[10px] text-red-600 block mt-1">
                                                    Thời gian khóa: {formatDate(userDetail.lockedAt)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SECTION 2: TỔ CHỨC & HỒ CÂU */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#766F67] border-b border-[#D9D2C8] pb-1.5">
                                        2. Tổ chức &amp; Hồ câu
                                    </h3>
                                    {userDetail.memberships.length === 0 ? (
                                        <p className="text-xs text-[#766F67]">Chưa được gán hồ câu nào.</p>
                                    ) : (
                                        userDetail.memberships.map((m) => (
                                            <div
                                                key={m.id}
                                                className="rounded-xl border border-[#D9D2C8] p-3 text-xs bg-[#F4F2EE]/30 space-y-1"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-[#102A43] text-sm">
                                                        🏞️ {m.lake.name}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-[#102A43]/10 text-[#102A43] font-bold text-[10px]">
                                                        {m.role}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[#766F67]">
                                                    Tổ chức: <strong>{m.lake.organization.name}</strong>
                                                </p>
                                                <div className="flex gap-4 text-[11px] text-[#766F67] pt-1">
                                                    <span>
                                                        Gói: <strong>{m.lake.subscriptionPlan}</strong>
                                                    </span>
                                                    <span>
                                                        Trạng thái: <strong>{m.lake.subscriptionStatus}</strong>
                                                    </span>
                                                    <span>
                                                        Hết hạn:{" "}
                                                        <strong>{formatDateOnly(m.lake.subscriptionExpiresAt)}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* SECTION 3: SUBSCRIPTION & ĐƠN HÀNG */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#766F67] border-b border-[#D9D2C8] pb-1.5">
                                        3. Đơn Hàng Dịch Vụ
                                    </h3>
                                    {userDetail.orders.length === 0 ? (
                                        <p className="text-xs text-[#766F67]">Chưa có đơn đặt mua gói dịch vụ nào.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {userDetail.orders.map((o) => (
                                                <div
                                                    key={o.id}
                                                    className="rounded-xl border border-[#D9D2C8] p-2.5 text-xs flex items-center justify-between"
                                                >
                                                    <div>
                                                        <span className="font-mono font-bold text-[#102A43]">
                                                            {o.orderCode}
                                                        </span>
                                                        <span className="text-[#766F67] ml-2 font-medium">
                                                            {o.planCode} ({o.durationDays} ngày)
                                                        </span>
                                                        <span className="block text-[10px] text-[#766F67]">
                                                            {formatDate(o.createdAt)} • {o.paymentMethod}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-[#102A43] block">
                                                            {formatVnd(o.amountVnd)}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold ${
                                                                o.status === "PAID"
                                                                    ? "text-emerald-700"
                                                                    : o.status === "PENDING"
                                                                      ? "text-amber-700"
                                                                      : "text-rose-700"
                                                            }`}
                                                        >
                                                            {o.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* SECTION 4: AUDIT LOGS */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#766F67] border-b border-[#D9D2C8] pb-1.5">
                                        4. Lịch sử Quản trị (Audit Events)
                                    </h3>
                                    {userDetail.auditLogs.length === 0 ? (
                                        <p className="text-xs text-[#766F67]">Chưa có ghi chép thao tác nào.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {userDetail.auditLogs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    className="rounded-xl border border-[#D9D2C8]/70 p-2 text-xs bg-[#F4F2EE]/40"
                                                >
                                                    <div className="flex justify-between items-center text-[11px]">
                                                        <span className="font-bold text-[#102A43]">{log.action}</span>
                                                        <span className="text-[10px] text-[#766F67]">
                                                            {formatDate(log.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[#766F67] mt-0.5">
                                                        Thực hiện bởi: <strong>{log.createdBy}</strong>
                                                    </p>
                                                    {Boolean(log.payload?.reason) && (
                                                        <p className="text-[11px] text-[#8A5A20] mt-0.5">
                                                            Lý do: {String(log.payload.reason)}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ACTION MODAL: LOCK / UNLOCK */}
            {/* ========================================================================= */}
            {activeActionModal === "LOCK" && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#D9D2C8] bg-white p-5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                                    targetUser.isLocked ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                }`}
                            >
                                {targetUser.isLocked ? "🔓" : "🔒"}
                            </div>
                            <div>
                                <h3 className="font-bold text-[#102A43]">
                                    {targetUser.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản người dùng"}
                                </h3>
                                <p className="text-xs text-[#766F67]">
                                    Người dùng: <strong>{targetUser.name}</strong> ({targetUser.email})
                                </p>
                            </div>
                        </div>

                        {!targetUser.isLocked ? (
                            <div className="space-y-3">
                                <p className="text-xs text-[#766F67] leading-relaxed">
                                    Khi khóa tài khoản, người dùng sẽ bị <strong>thu hồi ngay lập tức toàn bộ phiên đăng nhập</strong> trên mọi thiết bị và không thể đăng nhập lại cho đến khi được mở khóa.
                                </p>
                                <div>
                                    <label className="block text-xs font-bold text-[#27231F] mb-1">
                                        Lý do khóa <span className="text-red-600">*</span>
                                    </label>
                                    <textarea
                                        value={lockReason}
                                        onChange={(e) => setLockReason(e.target.value)}
                                        rows={3}
                                        placeholder="Ví dụ: Vi phạm điều khoản sử dụng, kiểm tra bảo mật, yêu cầu chủ hồ..."
                                        className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 p-2.5 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-[#766F67] leading-relaxed">
                                Bạn có chắc chắn muốn mở khóa tài khoản này? Người dùng sẽ có thể đăng nhập lại bình thường vào hệ thống.
                            </p>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D2C8]">
                            <button
                                type="button"
                                onClick={() => setActiveActionModal(null)}
                                disabled={actionSubmitting}
                                className="rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2 text-xs font-semibold text-[#766F67] hover:bg-[#F4F2EE] cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={submitLock}
                                disabled={actionSubmitting}
                                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer ${
                                    targetUser.isLocked
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-red-600 hover:bg-red-700"
                                } disabled:opacity-50`}
                            >
                                {actionSubmitting
                                    ? "Đang lưu..."
                                    : targetUser.isLocked
                                      ? "Xác nhận Mở khóa"
                                      : "Xác nhận Khóa tài khoản"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ACTION MODAL: EXTEND TRIAL */}
            {/* ========================================================================= */}
            {activeActionModal === "EXTEND_TRIAL" && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#D9D2C8] bg-white p-5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800 text-lg">
                                ⏳
                            </div>
                            <div>
                                <h3 className="font-bold text-[#102A43]">Gia hạn Dùng thử (Trial)</h3>
                                <p className="text-xs text-[#766F67]">
                                    Hồ: <strong>{targetUser.lake?.name || "Chưa gán"}</strong> • Chủ hồ: {targetUser.name}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Preset Buttons */}
                            <div>
                                <span className="block text-xs font-bold text-[#27231F] mb-1.5">
                                    Chọn số ngày thêm:
                                </span>
                                <div className="grid grid-cols-4 gap-2">
                                    {[3, 7, 15, 30].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setExtendDays(d)}
                                            className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                                                extendDays === d
                                                    ? "border-[#102A43] bg-[#102A43] text-white"
                                                    : "border-[#D9D2C8] bg-[#F4F2EE]/40 text-[#27231F] hover:bg-[#F4F2EE]"
                                            }`}
                                        >
                                            +{d} ngày
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Days Input */}
                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Hoặc nhập số ngày khác:
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={extendDays}
                                    onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                />
                            </div>

                            {/* Preview Calculation Box */}
                            <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-xs space-y-1 text-blue-900">
                                <div className="flex justify-between">
                                    <span>Hết hạn hiện tại:</span>
                                    <span className="font-semibold">
                                        {formatDateOnly(targetUser.lake?.subscriptionExpiresAt)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Gia hạn thêm:</span>
                                    <span className="font-bold text-blue-700">+{extendDays} ngày</span>
                                </div>
                                <div className="flex justify-between border-t border-blue-200 pt-1 font-bold text-blue-950">
                                    <span>Hết hạn mới:</span>
                                    <span>
                                        {computePreviewDate(targetUser.lake?.subscriptionExpiresAt, extendDays)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Ghi chú / Lý do (tùy chọn):
                                </label>
                                <input
                                    type="text"
                                    value={extendReason}
                                    onChange={(e) => setExtendReason(e.target.value)}
                                    placeholder="Ví dụ: Khách cần thêm thời gian test tính năng..."
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D2C8]">
                            <button
                                type="button"
                                onClick={() => setActiveActionModal(null)}
                                disabled={actionSubmitting}
                                className="rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2 text-xs font-semibold text-[#766F67] hover:bg-[#F4F2EE] cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={submitExtendTrial}
                                disabled={actionSubmitting}
                                className="rounded-xl bg-[#102A43] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1E3A5F] cursor-pointer disabled:opacity-50"
                            >
                                {actionSubmitting ? "Đang xử lý..." : "Xác nhận gia hạn"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ACTION MODAL: CHANGE PLAN */}
            {/* ========================================================================= */}
            {activeActionModal === "CHANGE_PLAN" && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#D9D2C8] bg-white p-5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-800 text-lg">
                                🔄
                            </div>
                            <div>
                                <h3 className="font-bold text-[#102A43]">Thay đổi Gói Thuê bao (Plan)</h3>
                                <p className="text-xs text-[#766F67]">
                                    Hồ: <strong>{targetUser.lake?.name || "Chưa gán"}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Current vs New Plan Selection */}
                            <div className="rounded-xl bg-[#F4F2EE] p-3 text-xs border border-[#D9D2C8] flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] text-[#766F67] block">Gói hiện tại:</span>
                                    <span className="font-bold text-[#102A43] text-sm">
                                        {targetUser.lake?.subscriptionPlan || "TRIAL"}
                                    </span>
                                </div>
                                <span className="text-lg text-[#766F67]">→</span>
                                <div>
                                    <span className="text-[10px] text-[#766F67] block">Gói chuyển đổi:</span>
                                    <span className="font-bold text-purple-900 text-sm">{selectedPlanCode}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Chọn gói từ cơ sở dữ liệu:
                                </label>
                                <select
                                    value={selectedPlanCode}
                                    onChange={(e) => setSelectedPlanCode(e.target.value)}
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none cursor-pointer"
                                >
                                    {availablePlans.map((p) => (
                                        <option key={p.code} value={p.code}>
                                            {p.name} ({formatVnd(p.priceVnd)} / {p.durationDays} ngày)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Thời hạn sử dụng tính từ hôm nay (ngày):
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={3650}
                                    value={planChangeDays}
                                    onChange={(e) => setPlanChangeDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                />
                                <span className="text-[10px] text-[#766F67] mt-1 block">
                                    Hạn mới dự kiến: <strong>{computePreviewDate(null, planChangeDays)}</strong>
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Lý do thay đổi:
                                </label>
                                <input
                                    type="text"
                                    value={planChangeReason}
                                    onChange={(e) => setPlanChangeReason(e.target.value)}
                                    placeholder="Ví dụ: Nâng cấp trực tiếp theo thỏa thuận hợp đồng..."
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D2C8]">
                            <button
                                type="button"
                                onClick={() => setActiveActionModal(null)}
                                disabled={actionSubmitting}
                                className="rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2 text-xs font-semibold text-[#766F67] hover:bg-[#F4F2EE] cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={submitChangePlan}
                                disabled={actionSubmitting}
                                className="rounded-xl bg-[#102A43] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1E3A5F] cursor-pointer disabled:opacity-50"
                            >
                                {actionSubmitting ? "Đang cập nhật..." : "Xác nhận đổi gói"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ACTION MODAL: EXTEND SUBSCRIPTION */}
            {/* ========================================================================= */}
            {activeActionModal === "EXTEND_SUB" && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#D9D2C8] bg-white p-5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-lg">
                                ➕
                            </div>
                            <div>
                                <h3 className="font-bold text-[#102A43]">Gia hạn Ngày sử dụng Thuê bao</h3>
                                <p className="text-xs text-[#766F67]">
                                    Hồ: <strong>{targetUser.lake?.name || "Chưa gán"}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Preset Buttons */}
                            <div>
                                <span className="block text-xs font-bold text-[#27231F] mb-1.5">
                                    Chọn số ngày cộng thêm:
                                </span>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[1, 3, 7, 15, 30].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setExtendDays(d)}
                                            className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                                                extendDays === d
                                                    ? "border-[#102A43] bg-[#102A43] text-white"
                                                    : "border-[#D9D2C8] bg-[#F4F2EE]/40 text-[#27231F] hover:bg-[#F4F2EE]"
                                            }`}
                                        >
                                            +{d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Days Input */}
                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Hoặc nhập số ngày (chỉ nhận số dương):
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={3650}
                                    value={extendDays}
                                    onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                />
                            </div>

                            {/* Preview Box */}
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-1 text-emerald-950">
                                <div className="flex justify-between">
                                    <span>Hết hạn hiện tại:</span>
                                    <span className="font-semibold">
                                        {formatDateOnly(targetUser.lake?.subscriptionExpiresAt)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Gia hạn thêm:</span>
                                    <span className="font-bold text-emerald-700">+{extendDays} ngày</span>
                                </div>
                                <div className="flex justify-between border-t border-emerald-200 pt-1 font-bold text-emerald-950">
                                    <span>Hết hạn mới:</span>
                                    <span>
                                        {computePreviewDate(targetUser.lake?.subscriptionExpiresAt, extendDays)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Lý do gia hạn:
                                </label>
                                <input
                                    type="text"
                                    value={extendReason}
                                    onChange={(e) => setExtendReason(e.target.value)}
                                    placeholder="Ví dụ: Đền bù gián đoạn mạng, khuyến mãi sinh nhật..."
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D2C8]">
                            <button
                                type="button"
                                onClick={() => setActiveActionModal(null)}
                                disabled={actionSubmitting}
                                className="rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2 text-xs font-semibold text-[#766F67] hover:bg-[#F4F2EE] cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={submitExtendSubscription}
                                disabled={actionSubmitting}
                                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
                            >
                                {actionSubmitting ? "Đang lưu..." : "Xác nhận gia hạn"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ACTION MODAL: REVOKE ALL SESSIONS */}
            {/* ========================================================================= */}
            {activeActionModal === "REVOKE_SESSIONS" && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#D9D2C8] bg-white p-5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-lg">
                                🚪
                            </div>
                            <div>
                                <h3 className="font-bold text-[#102A43]">Đăng xuất khỏi tất cả thiết bị</h3>
                                <p className="text-xs text-[#766F67]">
                                    Người dùng: <strong>{targetUser.name}</strong> ({targetUser.email})
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs text-[#766F67] leading-relaxed">
                                Thao tác này sẽ nâng <code className="font-mono text-amber-800 font-bold">sessionVersion</code> của tài khoản trên máy chủ. Tất cả JWT session hiện tại của người dùng trên mọi trình duyệt, ứng dụng điện thoại và máy tính sẽ <strong>bị vô hiệu hóa ngay lập tức</strong>. Người dùng sẽ phải đăng nhập lại.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-[#27231F] mb-1">
                                    Lý do thu hồi phiên:
                                </label>
                                <input
                                    type="text"
                                    value={revokeReason}
                                    onChange={(e) => setRevokeReason(e.target.value)}
                                    placeholder="Ví dụ: Nghi ngờ lộ mật khẩu, yêu cầu đăng xuất khẩn cấp..."
                                    className="w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE]/30 px-3 py-2 text-xs text-[#27231F] focus:border-[#102A43] focus:bg-white focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9D2C8]">
                            <button
                                type="button"
                                onClick={() => setActiveActionModal(null)}
                                disabled={actionSubmitting}
                                className="rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2 text-xs font-semibold text-[#766F67] hover:bg-[#F4F2EE] cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={submitRevokeSessions}
                                disabled={actionSubmitting}
                                className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-800 cursor-pointer disabled:opacity-50"
                            >
                                {actionSubmitting ? "Đang thu hồi..." : "Xác nhận Đăng xuất"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
