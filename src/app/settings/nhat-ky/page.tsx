import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Role } from "@/generated/prisma/client";
import {
    AUDIT_ACTION_OPTIONS,
    AUDIT_PAGE_SIZE,
    AUDIT_RETENTION_DAYS,
    buildAuditEventWhere,
    canViewStaffAudit,
    presentAuditEntry,
    type JsonObject,
} from "@/lib/audit-log-core";
import { authOptions } from "@/lib/auth";
import { privateRouteMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { AuditTokenButton } from "./token-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    ...privateRouteMetadata,
    title: "Nhật ký thao tác",
};

type Search = {
    actor?: string;
    action?: string;
    from?: string;
    to?: string;
    entity?: string;
    page?: string;
    risk?: string;
};

export default async function StaffAuditPage({
    searchParams,
}: {
    searchParams?: Promise<Search>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/login");

    const tenant = await getTenantContext();
    if (!tenant) {
        return (
            <main className="mx-auto max-w-lg px-6 py-16 text-center">
                <h1 className="text-xl font-bold text-[#8B1E1E]">Chưa có quyền truy cập</h1>
            </main>
        );
    }

    if (!canViewStaffAudit(tenant.role)) {
        return (
            <main className="mx-auto max-w-lg px-6 py-16 text-center">
                <h1 className="text-xl font-bold text-[#17201A]">Nhật ký chỉ dành cho Chủ hồ và Quản lý</h1>
                <p className="mt-2 text-sm text-[#66716A]">Nhân viên không xem được trang này.</p>
                <Link href="/sessions" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#4F9D5A] px-5 text-sm font-semibold text-white">
                    Về màn hình Đang câu
                </Link>
            </main>
        );
    }

    const params = (await searchParams) ?? {};
    const page = clampPage(params.page);
    const query = buildAuditEventWhere(tenant.lakeId, {
        actorId: params.actor,
        action: params.action,
        entityId: params.entity,
        from: params.from,
        to: params.to,
    });

    const [members, rows, lakeToken] = await Promise.all([
        prisma.membership.findMany({
            where: { lakeId: tenant.lakeId, deletedAt: null },
            select: { userId: true, role: true, user: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
        }),
        prisma.auditEvent.findMany({
            where: query.where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * AUDIT_PAGE_SIZE,
            take: AUDIT_PAGE_SIZE + 1,
            select: {
                id: true,
                createdAt: true,
                action: true,
                entityType: true,
                entityId: true,
                payload: true,
                createdBy: true,
            },
        }),
        tenant.role === Role.OWNER
            ? prisma.lake.findUnique({
                where: { id: tenant.lakeId },
                select: { auditReadTokenHash: true },
            })
            : Promise.resolve(null),
    ]);

    const hasNext = rows.length > AUDIT_PAGE_SIZE;
    const isSuspiciousOnly = params.risk === "SUSPICIOUS" || params.action === "SUSPICIOUS_ONLY";
    const rawEntries = rows.slice(0, AUDIT_PAGE_SIZE).map(presentAuditEntry);
    const suspiciousCount = rawEntries.filter((e) => e.riskLevel === "SUSPICIOUS").length;
    const entries = isSuspiciousOnly
        ? rawEntries.filter((e) => e.riskLevel === "SUSPICIOUS")
        : rawEntries;

    const names = new Map(members.map((member) => [member.userId, member.user.name]));
    const filters = {
        actor: query.where.createdBy ?? "",
        action: query.where.action ?? "ALL",
        from: query.from,
        to: query.to,
        entity: params.entity ?? "",
        risk: params.risk ?? "",
    };
    const csvHref = buildHref(filters, 1, true);

    return (
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame pb-tab-safe">
                <MobileAppHeader lakeName={tenant.lakeName} isSupportMode={tenant.isSupportMode} />
                <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <div>
                        <h1 className="text-lg font-bold text-[#17201A]">Nhật ký thao tác & Chống thất thoát</h1>
                        <p className="mt-1 text-xs leading-5 text-[#66716A]">
                            Ai làm gì, lúc nào, đối tượng nào. Hệ thống tự động phát hiện hành động đáng nghi và cảnh báo cho chủ hồ.
                        </p>
                    </div>

                    {/* Quick Filter Pill Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/settings/nhat-ky"
                            className={`inline-flex h-9 items-center rounded-xl px-3.5 text-xs font-bold transition-all ${
                                !isSuspiciousOnly
                                    ? "bg-[#1B3B2B] text-white shadow-xs"
                                    : "border border-[#E3E8E3] bg-white text-[#66716A] hover:bg-[#F0F4F0]"
                            }`}
                        >
                            Tất cả thao tác
                        </Link>
                        <Link
                            href="/settings/nhat-ky?risk=SUSPICIOUS"
                            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                                isSuspiciousOnly
                                    ? "bg-red-600 text-white shadow-xs"
                                    : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                        >
                            <span>⚠️ Chỉ xem Đáng nghi / Cảnh báo</span>
                            {suspiciousCount > 0 && (
                                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                                    isSuspiciousOnly ? "bg-white text-red-600" : "bg-red-600 text-white"
                                }`}>
                                    {suspiciousCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    <form method="get" className="grid grid-cols-1 gap-2 rounded-2xl border border-[#E3E8E3] bg-white p-3 sm:grid-cols-2">
                        <label className="text-xs text-[#66716A]">
                            Nhân viên
                            <select name="actor" defaultValue={filters.actor} className="mt-1 h-10 w-full rounded-xl border border-[#E3E8E3] bg-white px-2 text-sm text-[#17201A]">
                                <option value="">Tất cả</option>
                                {members.map((member) => (
                                    <option key={member.userId} value={member.userId}>
                                        {member.user.name} - {roleLabel(member.role)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-xs text-[#66716A]">
                            Thao tác
                            <select name="action" defaultValue={filters.action} className="mt-1 h-10 w-full rounded-xl border border-[#E3E8E3] bg-white px-2 text-sm text-[#17201A]">
                                {AUDIT_ACTION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="text-xs text-[#66716A]">
                            Từ ngày
                            <input type="date" name="from" defaultValue={filters.from} className="mt-1 h-10 w-full rounded-xl border border-[#E3E8E3] px-2 text-sm" />
                        </label>
                        <label className="text-xs text-[#66716A]">
                            Đến ngày
                            <input type="date" name="to" defaultValue={filters.to} className="mt-1 h-10 w-full rounded-xl border border-[#E3E8E3] px-2 text-sm" />
                        </label>
                        <label className="text-xs text-[#66716A] sm:col-span-2">
                            Mã phiên, hóa đơn hoặc đối tượng
                            <input name="entity" defaultValue={filters.entity} placeholder="UUID" className="mt-1 h-10 w-full rounded-xl border border-[#E3E8E3] px-3 text-sm" />
                        </label>
                        <div className="flex gap-2 sm:col-span-2">
                            <button type="submit" className="h-10 flex-1 rounded-full bg-[#4F9D5A] text-sm font-semibold text-white cursor-pointer active:scale-95 transition-all">Lọc</button>
                            <Link href="/settings/nhat-ky" className="inline-flex h-10 items-center rounded-full border border-[#E3E8E3] px-4 text-sm text-[#17201A]">Xóa lọc</Link>
                            <a href={csvHref} className="inline-flex h-10 items-center rounded-full border border-[#E3E8E3] px-4 text-sm text-[#17201A]">CSV</a>
                        </div>
                    </form>

                    {query.clamped ? (
                        <p className="text-xs text-[#8A5A20]">Khoảng ngày đã được giới hạn trong {AUDIT_RETENTION_DAYS} ngày.</p>
                    ) : null}

                    {entries.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-[#E3E8E3] bg-white px-4 py-8 text-center text-sm text-[#66716A]">
                            {isSuspiciousOnly ? "Không phát hiện hành động đáng nghi nào trong khoảng này." : "Không có dòng nào trong khoảng này."}
                        </p>
                    ) : (
                        <ol className="space-y-3">
                            {entries.map((entry) => {
                                const name = entry.actorName || names.get(entry.actorId) || shortId(entry.actorId);
                                const isSuspicious = entry.riskLevel === "SUSPICIOUS";
                                const isAttention = entry.riskLevel === "ATTENTION";

                                return (
                                    <li
                                        key={entry.id}
                                        className={`rounded-2xl border p-3.5 transition-shadow ${
                                            isSuspicious
                                                ? "border-red-400 bg-red-50/50 shadow-xs ring-1 ring-red-300/60"
                                                : isAttention
                                                ? "border-amber-300 bg-amber-50/40"
                                                : "border-[#E3E8E3] bg-white shadow-xs"
                                        }`}
                                    >
                                        {/* Suspicious or Attention Banner */}
                                        {isSuspicious && (
                                            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-red-600 px-2.5 py-1 text-white shadow-xs">
                                                <span className="flex items-center gap-1.5 text-xs font-bold">
                                                    <span>⚠️</span>
                                                    <span>CẢNH BÁO ĐÁNG NGHI:</span>
                                                    <span className="font-medium">{entry.riskReason || "Hành động nhạy cảm"}</span>
                                                </span>
                                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                    Cần kiểm tra
                                                </span>
                                            </div>
                                        )}
                                        {isAttention && !isSuspicious && (
                                            <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                                                <span>LƯU Ý:</span>
                                                <span className="font-medium">{entry.riskReason}</span>
                                            </div>
                                        )}

                                        {/* Top Row: Action & Entity */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className={`text-sm font-bold ${isSuspicious ? "text-red-900" : "text-[#17201A]"}`}>
                                                    {entry.actionLabel}
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                                    <span className="font-bold text-[#17201A]">{name}</span>
                                                    <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                                        entry.actorRole === "OWNER"
                                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                            : entry.actorRole === "MANAGER"
                                                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                                                            : "bg-slate-100 text-slate-700 border border-slate-300"
                                                    }`}>
                                                        {roleLabel(entry.actorRole)}
                                                    </span>
                                                    <span className="text-[#8A938D]">•</span>
                                                    <span className="font-mono text-[#66716A]">{formatWhen(entry.createdAt)}</span>
                                                </div>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-[#EBF3ED] px-2.5 py-0.5 text-[11px] font-bold text-[#1B3B2B]">
                                                {entityLabel(entry.entityType)}
                                            </span>
                                        </div>

                                        <p className="mt-1.5 font-mono text-[11px] text-[#8A938D]">
                                            Mã: <span className="select-all font-semibold text-[#546257]">{entry.entityId}</span>
                                        </p>

                                        {/* Diff View */}
                                        <DiffView before={entry.before} after={entry.after} legacy={entry.legacy} />

                                        {entry.ip && (
                                            <p className="mt-2 text-[11px] text-[#8A938D]">
                                                IP: <span className="font-mono">{entry.ip}</span>
                                            </p>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}

                    <div className="flex items-center justify-between text-sm">
                        {page > 1 ? (
                            <Link href={buildHref(filters, page - 1, false)} className="text-[#246B38]">Trang trước</Link>
                        ) : <span />}
                        <span className="text-xs text-[#66716A]">Trang {page}</span>
                        {hasNext ? (
                            <Link href={buildHref(filters, page + 1, false)} className="text-[#246B38]">Trang sau</Link>
                        ) : <span />}
                    </div>

                    {tenant.role === Role.OWNER && !tenant.isSupportMode ? (
                        <AuditTokenButton hasToken={Boolean(lakeToken?.auditReadTokenHash)} />
                    ) : null}
                </main>
                <MobileBottomNav isSuperAdmin={session.user.systemRole === "SUPER_ADMIN"} />
            </div>
        </div>
    );
}

// ---- Nhãn tiếng Việt cho các thực thể đối tượng ----
const ENTITY_LABELS: Record<string, string> = {
    Invoice: "Hóa đơn",
    FishingSession: "Phiên câu",
    Receipt: "Phiếu thu",
    Expense: "Phiếu chi",
    Shift: "Ca trực",
    Product: "Sản phẩm",
    Package: "Gói câu",
    Hut: "Ô số câu",
    Area: "Khu vực",
    User: "Tài khoản",
    Membership: "Nhân viên",
    FishBuyback: "Thu mua cá",
    ApprovalRequest: "Phê duyệt",
};

function entityLabel(type: string): string {
    return ENTITY_LABELS[type] ?? type;
}

// Các ID kỹ thuật không cần hiển thị rối mắt
const HIDDEN_KEYS = new Set([
    "receiptId",
    "shiftId",
    "shiftCloseId",
    "productId",
    "packageId",
    "lineId",
    "sessionId",
    "lakeId",
    "idempotencyKey",
    "token",
    "raw",
]);

// ---- Nhãn tiếng Việt cho các trường dữ liệu ----
const FIELD_LABELS: Record<string, string> = {
    status: "Trạng thái",
    totalAmountVnd: "Tổng tiền",
    paidAmountVnd: "Đã thanh toán",
    balanceDueVnd: "Còn nợ",
    priceVnd: "Giá",
    price: "Giá",
    quantity: "Số lượng",
    name: "Tên",
    amountVnd: "Số tiền",
    method: "Hình thức",
    direction: "Chiều giao dịch",
    note: "Ghi chú",
    reason: "Lý do",
    packageId: "Gói câu",
    packageName: "Tên gói câu",
    addedMinutes: "Thời gian thêm (phút)",
    previousPlannedEndAt: "Giờ kết thúc cũ",
    newPlannedEndAt: "Giờ kết thúc mới",
    startAt: "Giờ bắt đầu",
    plannedEndAt: "Giờ dự kiến ra",
    endedAt: "Giờ kết thúc thực tế",
    hutIds: "Ô số câu",
    customerId: "Khách hàng",
    refundedVnd: "Hoàn tiền",
    settlement: "Thanh toán kết ca",
    paymentMethod: "Phương thức thanh toán",
    weight: "Cân nặng (kg)",
    totalVnd: "Tổng tiền",
    fishTypeId: "Loại cá",
    description: "Nội dung",
    category: "Phân loại",
    lineName: "Tên món",
    lineTotalVnd: "Thành tiền",
    unitPrice: "Đơn giá",
    isNegativeStock: "Cảnh báo kho âm",
    remainingStock: "Tồn kho còn",
    productName: "Tên sản phẩm",
    newTotalAmountVnd: "Tổng tiền mới",
    refunds: "Khoản hoàn trả",
    account: "Tài khoản đăng nhập",
    result: "Kết quả",
    // Ca trực
    totalRevenueVnd: "Tổng doanh thu",
    totalExpenseVnd: "Tổng chi phí",
    totalCashVnd: "Tiền mặt thu",
    totalTransferVnd: "Chuyển khoản thu",
    fishBuybackVnd: "Chi thu mua cá",
    otherExpenseVnd: "Chi phí khác",
    actualCashVnd: "Tiền mặt kiểm đếm",
    cashDifferenceVnd: "Chênh lệch tiền mặt",
    differenceReason: "Lý do chênh lệch",
    closedBy: "Người chốt ca",
    startTime: "Giờ mở ca",
    endTime: "Giờ đóng ca",
};

function fieldLabel(key: string): string {
    return FIELD_LABELS[key] ?? key;
}

// ---- Component hiển thị trước / sau khi thay đổi ----
function DiffView({
    before,
    after,
    legacy,
}: {
    before: JsonObject | null;
    after: JsonObject | null;
    legacy: JsonObject | null;
}) {
    const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter(
        (k) => !HIDDEN_KEYS.has(k)
    );

    if (keys.length === 0) {
        if (!legacy) return null;
        const visibleLegacyKeys = Object.keys(legacy).filter((k) => !HIDDEN_KEYS.has(k));
        if (visibleLegacyKeys.length === 0) return null;

        return (
            <div className="mt-2 rounded-xl border border-[#E3E8E3] bg-[#F7F9F7] p-2.5">
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {visibleLegacyKeys.map((key) => (
                        <div key={key} className="text-xs leading-5">
                            <span className="font-semibold text-[#546257]">{fieldLabel(key)}: </span>
                            <span className="font-bold text-[#17201A]">{showValue(legacy[key], key)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 rounded-xl border border-[#E3E8E3] bg-[#F7F9F7] p-2.5">
            <dl className="space-y-1.5">
                {keys.map((key) => (
                    <div key={key} className="text-xs leading-5 flex flex-wrap items-baseline gap-1.5">
                        <dt className="font-semibold text-[#546257]">{fieldLabel(key)}:</dt>
                        <dd className="break-all">
                            <span className="text-[#8A938D] line-through">{showValue(before?.[key], key)}</span>
                            <span className="mx-1 font-bold text-[#546257]">➔</span>
                            <span className="font-bold text-[#246B38]">{showValue(after?.[key], key)}</span>
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function showValue(value: unknown, key?: string): string {
    if (value === undefined || value === null || value === "") return "(trống)";

    // Định dạng ngày giờ chuẩn Việt Nam nếu là chuỗi ISO
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        try {
            return new Intl.DateTimeFormat("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }).format(new Date(value));
        } catch {
            return value;
        }
    }

    // Định dạng tiền tệ nếu là trường tiền
    if (typeof value === "number") {
        if (key && (key.endsWith("Vnd") || /amount|price|revenue|expense|total|balance|refund/i.test(key))) {
            return new Intl.NumberFormat("vi-VN").format(value) + " đ";
        }
        return new Intl.NumberFormat("vi-VN").format(value);
    }

    // Việt hóa các giá trị trạng thái tiếng Anh phổ biến
    if (typeof value === "string") {
        const ENUM_MAP: Record<string, string> = {
            ACTIVE: "Đang hoạt động",
            COMPLETED: "Đã hoàn thành",
            CANCELLED: "Đã hủy",
            VOIDED: "Đã hủy",
            CASH: "Tiền mặt",
            BANK_TRANSFER: "Chuyển khoản",
            PAID: "Đã thanh toán",
            PARTIALLY_PAID: "Thanh toán một phần",
            DRAFT: "Bản nháp",
            PENDING: "Chờ xử lý",
            IN: "Thu vào",
            OUT: "Chi ra",
            success: "Thành công",
            failure: "Thất bại",
            true: "Có",
            false: "Không",
        };
        return ENUM_MAP[value] ?? value;
    }

    if (typeof value === "boolean") {
        return value ? "Có" : "Không";
    }

    if (Array.isArray(value)) {
        return value.map((v) => showValue(v, key)).join(", ");
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function formatWhen(iso: string): string {
    return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(iso));
}

function roleLabel(role: string | null | undefined): string {
    if (role === "OWNER") return "Chủ hồ";
    if (role === "MANAGER") return "Quản lý";
    if (role === "STAFF") return "Nhân viên";
    return "Nhân sự";
}

function shortId(value: string): string {
    return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function clampPage(value: string | undefined): number {
    const page = Number(value ?? "1");
    if (!Number.isFinite(page) || page < 1) return 1;
    return Math.min(200, Math.floor(page));
}

function buildHref(filters: { actor: string; action: string; from: string; to: string; entity: string; risk?: string }, page: number, csv: boolean): string {
    const params = new URLSearchParams();
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.action && filters.action !== "ALL") params.set("action", filters.action);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.entity) params.set("entity", filters.entity);
    if (filters.risk) params.set("risk", filters.risk);
    if (!csv && page > 1) params.set("page", String(page));
    if (csv) {
        params.set("format", "csv");
        return `/api/audit-events?${params.toString()}`;
    }
    const query = params.toString();
    return query ? `/settings/nhat-ky?${query}` : "/settings/nhat-ky";
}
