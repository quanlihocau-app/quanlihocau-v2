"use client";

import { useState } from "react";

export interface OtpLogItem {
    id: string;
    phone: string;
    maskedPhone: string;
    provider: string;
    status: string;
    ipAddress: string | null;
    deviceHash: string | null;
    costVnd: number;
    errorMessage: string | null;
    createdAt: string;
    verifiedAt: string | null;
}

interface OtpAdminClientProps {
    initialLogs: OtpLogItem[];
    initialStats: {
        totalCount: number;
        totalVerified: number;
        totalFailed: number;
        sentToday: number;
        totalCostVnd: number;
        verificationRate: number;
    };
    initialPagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
    };
}

export function OtpAdminClient({
    initialLogs,
    initialStats,
    initialPagination,
}: OtpAdminClientProps) {
    const [logs, setLogs] = useState<OtpLogItem[]>(initialLogs);
    const [stats, setStats] = useState(initialStats);
    const [pagination, setPagination] = useState(initialPagination);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [isLoading, setIsLoading] = useState(false);

    async function fetchLogs(page = 1, status = selectedStatus, query = searchQuery) {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            if (status !== "ALL") params.set("status", status);
            if (query.trim()) params.set("q", query.trim());

            const res = await fetch(`/api/admin/otp?${params.toString()}`);
            if (!res.ok) throw new Error("Lỗi khi tải nhật ký OTP");

            const data = await res.json();
            setLogs(data.logs);
            setStats(data.stats);
            setPagination(data.pagination);
        } catch (err) {
            console.error("Fetch OTP logs error:", err);
        } finally {
            setIsLoading(false);
        }
    }

    function handleFilterStatus(status: string) {
        setSelectedStatus(status);
        fetchLogs(1, status, searchQuery);
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        fetchLogs(1, selectedStatus, searchQuery);
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#102A43]">
                        Quản lý SMS OTP &amp; Chi Phí
                    </h1>
                    <p className="text-xs text-[#627D98] mt-1">
                        Theo dõi lưu lượng gửi tin nhắn xác thực qua SpeedSMS, giám sát tỷ lệ chuyển đổi và đối soát chi phí viễn thông.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => fetchLogs(pagination.page, selectedStatus, searchQuery)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9D2C8] bg-white px-3.5 py-2 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                        <span>🔄 Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                        Tổng OTP Đã Gửi
                    </span>
                    <div className="mt-1 text-2xl font-black text-[#102A43]">
                        {stats.totalCount.toLocaleString("vi-VN")}
                    </div>
                    <span className="text-[10px] text-[#627D98] mt-0.5 block">
                        Hôm nay: <strong className="text-[#102A43]">{stats.sentToday}</strong> tin
                    </span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Xác Thực Thành Công
                    </span>
                    <div className="mt-1 text-2xl font-black text-emerald-700">
                        {stats.totalVerified.toLocaleString("vi-VN")}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
                        Tỷ lệ: {stats.verificationRate}%
                    </span>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                        Gửi Thất Bại / Lỗi
                    </span>
                    <div className="mt-1 text-2xl font-black text-rose-700">
                        {stats.totalFailed.toLocaleString("vi-VN")}
                    </div>
                    <span className="text-[10px] text-rose-600 mt-0.5 block">
                        Lỗi mạng hoặc sai nhà mạng
                    </span>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Chi Phí SMS Dự Kiến
                    </span>
                    <div className="mt-1 text-2xl font-black text-amber-700 font-mono">
                        {stats.totalCostVnd.toLocaleString("vi-VN")} đ
                    </div>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                        Ước tính theo cước SpeedSMS
                    </span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#D9D2C8] shadow-xs">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {[
                        { key: "ALL", label: "Tất cả" },
                        { key: "SENT", label: "Đã gửi" },
                        { key: "VERIFIED", label: "Đã xác thực" },
                        { key: "FAILED", label: "Thất bại" },
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
                        placeholder="Tìm SĐT, IP, Nhà cung cấp..."
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

            {/* OTP Logs Table */}
            <div className="overflow-hidden rounded-2xl border border-[#D9D2C8] bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#27231F]">
                        <thead className="border-b border-[#D9D2C8] bg-[#F4F2EE]/80 text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                            <tr>
                                <th className="px-4 py-3.5">Số điện thoại</th>
                                <th className="px-4 py-3.5">Cổng dịch vụ</th>
                                <th className="px-4 py-3.5">Trạng thái</th>
                                <th className="px-4 py-3.5">Cước phí</th>
                                <th className="px-4 py-3.5">Địa chỉ IP</th>
                                <th className="px-4 py-3.5">Thời gian gửi</th>
                                <th className="px-4 py-3.5">Thời gian xác thực</th>
                                <th className="px-4 py-3.5">Ghi chú / Lỗi</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#EBE6DF]">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-xs text-[#627D98]">
                                        Chưa có nhật ký gửi SMS OTP nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#F9F8F6] transition-colors">
                                        <td className="px-4 py-3.5 font-mono font-bold text-[#102A43]">
                                            {item.maskedPhone || item.phone}
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    item.provider === "SPEEDSMS"
                                                        ? "bg-blue-100 text-blue-900 border border-blue-200"
                                                        : item.provider === "ZALO_ZNS"
                                                          ? "bg-cyan-100 text-cyan-900 border border-cyan-200"
                                                          : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {item.provider}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            {item.status === "VERIFIED" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                                    ĐÃ XÁC THỰC
                                                </span>
                                            ) : item.status === "SENT" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                                                    ĐÃ GỬI
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                                                    THẤT BẠI
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3.5 font-mono font-bold text-[#8A5A20]">
                                            {item.costVnd > 0 ? `${item.costVnd.toLocaleString("vi-VN")} đ` : "0 đ"}
                                        </td>

                                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#627D98]">
                                            {item.ipAddress || "—"}
                                        </td>

                                        <td className="px-4 py-3.5 text-[#627D98] text-[11px]">
                                            {new Date(item.createdAt).toLocaleString("vi-VN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}
                                        </td>

                                        <td className="px-4 py-3.5 text-[11px]">
                                            {item.verifiedAt ? (
                                                <span className="text-emerald-700 font-semibold">
                                                    {new Date(item.verifiedAt).toLocaleTimeString("vi-VN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                    })}
                                                </span>
                                            ) : (
                                                <span className="text-[#9FB3C8]">—</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3.5 text-[11px] text-rose-600 max-w-xs truncate">
                                            {item.errorMessage || "—"}
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
                        Trang {pagination.page} / {pagination.totalPages} (Tổng cộng {pagination.totalCount} bản ghi)
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => fetchLogs(pagination.page - 1)}
                            className="rounded-lg border border-[#D9D2C8] bg-white px-2.5 py-1 text-xs font-semibold text-[#27231F] disabled:opacity-40"
                        >
                            ← Trước
                        </button>
                        <button
                            type="button"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => fetchLogs(pagination.page + 1)}
                            className="rounded-lg border border-[#D9D2C8] bg-white px-2.5 py-1 text-xs font-semibold text-[#27231F] disabled:opacity-40"
                        >
                            Sau →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
