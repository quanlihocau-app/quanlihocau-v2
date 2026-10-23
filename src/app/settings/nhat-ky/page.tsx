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
                <h1 className="text-xl font-bold text-[#17201A]">Nhật ký chỉ dành cho chủ hồ và quản lý</h1>
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
    const entries = rows.slice(0, AUDIT_PAGE_SIZE).map(presentAuditEntry);
    const names = new Map(members.map((member) => [member.userId, member.user.name]));
    const filters = {
        actor: query.where.createdBy ?? "",
        action: query.where.action ?? "ALL",
        from: query.from,
        to: query.to,
        entity: params.entity ?? "",
    };
    const csvHref = buildHref(filters, 1, true);

    return (
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame pb-tab-safe">
                <MobileAppHeader lakeName={tenant.lakeName} isSupportMode={tenant.isSupportMode} />
                <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <div>
                        <h1 className="text-lg font-bold text-[#17201A]">Nhật ký thao tác</h1>
                        <p className="mt-1 text-xs leading-5 text-[#66716A]">
                            Ai làm gì, lúc nào, đổi trường nào. Chỉ xem, không sửa và không xóa.
                            Nên giữ khoảng {AUDIT_RETENTION_DAYS} ngày; khi cần dọn, làm tay sau giờ bán và báo trước cho hồ.
                        </p>
                    </div>

                    <form method="get" className="grid grid-cols-1 gap-2 rounded-2xl border border-[#E3E8E3] bg-white p-3 sm:grid-cols-2">
                        <label className="text-xs text-[#66716A]">
                            Nhân viên
                            <select name="actor" defaultValue={filters.actor} className="mt-1 h-10 w-full rounded-xl border border-[#E3E8E3] bg-white px-2 text-sm text-[#17201A]">
                                <option value="">Tất cả</option>
                                {members.map((member) => (
                                    <option key={member.userId} value={member.userId}>
                                        {member.user.name} · {roleLabel(member.role)}
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
                            <button type="submit" className="h-10 flex-1 rounded-full bg-[#4F9D5A] text-sm font-semibold text-white">Lọc</button>
                            <Link href="/settings/nhat-ky" className="inline-flex h-10 items-center rounded-full border border-[#E3E8E3] px-4 text-sm">Xóa lọc</Link>
                            <a href={csvHref} className="inline-flex h-10 items-center rounded-full border border-[#E3E8E3] px-4 text-sm">CSV</a>
                        </div>
                    </form>

                    {query.clamped ? (
                        <p className="text-xs text-[#8A5A20]">Khoảng ngày đã được giới hạn trong {AUDIT_RETENTION_DAYS} ngày.</p>
                    ) : null}

                    {entries.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-[#E3E8E3] bg-white px-4 py-8 text-center text-sm text-[#66716A]">
                            Không có dòng nào trong khoảng này.
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {entries.map((entry) => {
                                const name = entry.actorName || names.get(entry.actorId) || shortId(entry.actorId);
                                return (
                                    <li key={entry.id} className="rounded-2xl border border-[#E3E8E3] bg-white p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-[#17201A]">{entry.actionLabel}</p>
                                                <p className="mt-0.5 text-xs text-[#66716A]">
                                                    {name} · {roleLabel(entry.actorRole)} · {formatWhen(entry.createdAt)}
                                                </p>
                                            </div>
                                            <span className="shrink-0 font-mono text-[10px] text-[#8A938D]">{entry.entityType}</span>
                                        </div>
                                        <p className="mt-2 break-all font-mono text-[11px] text-[#66716A]">{entry.entityId}</p>
                                        <DiffView before={entry.before} after={entry.after} legacy={entry.legacy} />
                                        {entry.ip ? <p className="mt-2 text-[11px] text-[#8A938D]">{entry.ip}</p> : null}
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

function DiffView({
    before,
    after,
    legacy,
}: {
    before: JsonObject | null;
    after: JsonObject | null;
    legacy: JsonObject | null;
}) {
    const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
    if (keys.length === 0) {
        if (!legacy) return null;
        return <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-[#66716A]">{JSON.stringify(legacy)}</pre>;
    }
    return (
        <dl className="mt-2 space-y-1">
            {keys.map((key) => (
                <div key={key} className="text-[11px] leading-4 text-[#17201A]">
                    <dt className="inline font-semibold">{key}: </dt>
                    <dd className="inline break-all">
                        {showValue(before?.[key])} → {showValue(after?.[key])}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function showValue(value: unknown): string {
    if (value === undefined || value === null) return "—";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
}

function formatWhen(iso: string): string {
    return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(iso));
}

function roleLabel(role: string | null | undefined): string {
    if (role === "OWNER") return "Chủ hồ";
    if (role === "MANAGER") return "Quản lý";
    if (role === "STAFF") return "Nhân viên";
    return role || "—";
}

function shortId(value: string): string {
    return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function clampPage(value: string | undefined): number {
    const page = Number(value ?? "1");
    if (!Number.isFinite(page) || page < 1) return 1;
    return Math.min(200, Math.floor(page));
}

function buildHref(filters: { actor: string; action: string; from: string; to: string; entity: string }, page: number, csv: boolean): string {
    const params = new URLSearchParams();
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.action && filters.action !== "ALL") params.set("action", filters.action);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.entity) params.set("entity", filters.entity);
    if (!csv && page > 1) params.set("page", String(page));
    if (csv) {
        params.set("format", "csv");
        return `/api/audit-events?${params.toString()}`;
    }
    const query = params.toString();
    return query ? `/settings/nhat-ky?${query}` : "/settings/nhat-ky";
}
