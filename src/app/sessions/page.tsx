import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InvoiceStatus, Role, SessionStatus } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { SessionActions } from "./session-actions";
import { SessionCountdown } from "./session-countdown";

export default async function SessionsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
                <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
                    <h1 className="text-lg font-bold text-amber-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-amber-700">
                        Tài khoản ({session.user.email}) hiện chưa được
                        gán quyền hoặc hồ câu đã bị xóa. Vui lòng liên
                        hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    // ── Fetch active sessions with all relations ────────────────────────
    const activeSessions = await prisma.fishingSession.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            status: SessionStatus.ACTIVE,
        },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    phoneNormalized: true,
                },
            },
            package: {
                select: {
                    id: true,
                    name: true,
                    durationMinutes: true,
                    priceVnd: true,
                },
            },
            hutLinks: {
                include: {
                    hut: {
                        select: {
                            id: true,
                            name: true,
                            area: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
            invoices: {
                where: {
                    status: InvoiceStatus.DRAFT,
                },
                select: {
                    id: true,
                },
                take: 1,
            },
        },
        orderBy: {
            startAt: "desc",
        },
    });

    // ── Fetch all huts for this lake to determine available spots ────────
    const allHuts = await prisma.hut.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            currentSessionId: true,
            area: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    const totalHuts = allHuts.length;
    const availableHuts = allHuts.filter(
        (h) => h.currentSessionId === null,
    );

    const canOpenSession =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER ||
        tenantContext.role === Role.STAFF;

    const canComplete = canOpenSession;
    const canCancel =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    function formatPrice(vnd: number) {
        return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
    }

    function formatTime(dateStr: Date | string) {
        const d = new Date(dateStr);
        return d.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
        });
    }

    return (
        <main className="mx-auto min-h-screen max-w-md bg-[#F5F2EB] px-4 pb-24 pt-6">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="mb-5 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        Đang câu
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {tenantContext.lakeName}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                        {activeSessions.length} / {totalHuts} ô
                    </span>
                    {canOpenSession ? (
                        <Link
                            href="/sessions/new"
                            className="inline-flex h-10 min-w-[44px] items-center justify-center rounded-xl bg-[#9E6B05] px-4 text-xs font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-95"
                        >
                            + Tạo vé
                        </Link>
                    ) : null}
                </div>
            </header>

            {/* ── Active Sessions Grid ───────────────────────────────── */}
            {activeSessions.length === 0 && availableHuts.length === 0 ? (
                <div className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm text-slate-500">
                        Chưa có ô câu nào. Vui lòng thêm chòi trong phần
                        Cài đặt.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Active session cards */}
                    {activeSessions.map((s) => {
                        const hutNames = s.hutLinks
                            .map((hl) => hl.hut.name)
                            .join(" + ");
                        const areaName =
                            s.hutLinks[0]?.hut.area.name ?? "";
                        const draftInvoiceId =
                            s.invoices[0]?.id ?? null;

                        return (
                            <div
                                key={s.id}
                                className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-sm transition-all duration-150 ease-out"
                            >
                                {/* Top row: hut code + timer */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold text-slate-900">
                                                {hutNames || "—"}
                                            </span>
                                            {areaName ? (
                                                <span className="rounded-full bg-[#EAE2CE] px-2 py-0.5 text-[10px] font-semibold text-[#8A5B00]">
                                                    {areaName}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {s.package.name} ·{" "}
                                            {formatPrice(
                                                s.package.priceVnd,
                                            )}
                                        </p>
                                    </div>

                                    {/* Live countdown (client component) */}
                                    <SessionCountdown
                                        plannedEndAt={s.plannedEndAt.toISOString()}
                                    />
                                </div>

                                {/* Customer + start time */}
                                <div className="mt-3 flex items-center justify-between border-t border-[#EAE4D7] pt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAE2CE]">
                                            <svg
                                                className="h-4 w-4 text-[#9E6B05]"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-900">
                                                {s.customer?.name ?? (
                                                    <span className="font-normal italic text-slate-400">
                                                        Khách vãng lai
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                Từ{" "}
                                                {formatTime(s.startAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-[#9E6B05]">
                                        {formatPrice(
                                            s.package.priceVnd,
                                        )}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="mt-3 border-t border-[#EAE4D7] pt-3">
                                    <SessionActions
                                        sessionId={s.id}
                                        canComplete={canComplete}
                                        canCancel={canCancel}
                                        invoiceId={draftInvoiceId}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Available huts section */}
                    {availableHuts.length > 0 ? (
                        <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Ô trống · Sẵn sàng
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {availableHuts.map((h) => (
                                    <div
                                        key={h.id}
                                        className="rounded-2xl border border-dashed border-[#D5CFC3] bg-[#F7F4EE] p-3 text-center transition-all duration-150 ease-out"
                                    >
                                        <p className="text-sm font-bold text-slate-400">
                                            {h.name}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                            {h.area.name} · Trống
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </main>
    );
}
