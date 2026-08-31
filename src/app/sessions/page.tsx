import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InvoiceStatus, Role, SessionStatus } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { SessionActions } from "./session-actions";
import { SessionCountdown } from "./session-countdown";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SessionsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
                    <h1 className="text-lg font-bold text-red-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-red-700">
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

    // ── Fetch active packages for extensions ─────────────────────────────
    const packages = await prisma.package.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceVnd: true,
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
        <main className="mx-auto min-h-screen max-w-md bg-[#F8F6F0] px-4 pb-24 pt-6">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="mb-5 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#102A43]">
                        Đang câu
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500 font-medium">
                        {tenantContext.lakeName}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[11px] font-bold">
                        {activeSessions.length} / {totalHuts} ô
                    </Badge>
                    {canOpenSession ? (
                        <Link
                            href="/sessions/new"
                            className="inline-flex h-11 min-w-[48px] items-center justify-center rounded-xl bg-[#102A43] px-4 text-xs font-bold text-white shadow-sm transition-transform duration-150 ease-out active:scale-95 hover:bg-[#1E3A5F]"
                        >
                            + Tạo vé
                        </Link>
                    ) : null}
                </div>
            </header>

            {/* ── Active Sessions Grid ───────────────────────────────── */}
            {activeSessions.length === 0 && availableHuts.length === 0 ? (
                <Card className="text-center p-8">
                    <p className="text-sm text-slate-500">
                        Chưa có ô câu nào. Vui lòng thêm chòi trong phần
                        Cài đặt.
                    </p>
                </Card>
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
                            <Card
                                key={s.id}
                                className="p-4 transition-all duration-150 ease-out hover:border-slate-300"
                            >
                                {/* Top row: hut code + timer */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-extrabold text-[#102A43]">
                                                {hutNames || "—"}
                                            </span>
                                            {areaName ? (
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                    {areaName}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-600">
                                            {s.package.name} ·{" "}
                                            <span className="tabular-nums font-bold text-[#0D9488]">
                                                {formatPrice(s.package.priceVnd)}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Live countdown */}
                                    <SessionCountdown
                                        plannedEndAt={s.plannedEndAt.toISOString()}
                                    />
                                </div>

                                {/* Customer + start time */}
                                <div className="mt-3 flex items-center justify-between border-t border-[#E2DDD2] pt-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#102A43]/10 text-[#102A43]">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
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
                                            <p className="text-xs font-bold text-slate-900">
                                                {s.customer?.name ?? (
                                                    <span className="font-normal italic text-slate-400">
                                                        Khách vãng lai
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Vào lúc{" "}
                                                <span className="tabular-nums font-semibold text-slate-600">
                                                    {formatTime(s.startAt)}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-extrabold text-[#0D9488] tabular-nums">
                                        {formatPrice(s.package.priceVnd)}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="mt-3 border-t border-[#E2DDD2] pt-3">
                                    <SessionActions
                                        sessionId={s.id}
                                        canComplete={canComplete}
                                        canCancel={canCancel}
                                        invoiceId={draftInvoiceId}
                                        packages={packages}
                                    />
                                </div>
                            </Card>
                        );
                    })}

                    {/* Available huts section */}
                    {availableHuts.length > 0 ? (
                        <div className="mt-5">
                            <p className="mb-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Ô trống sẵn sàng ({availableHuts.length})
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {availableHuts.map((h) => (
                                    <div
                                        key={h.id}
                                        className="rounded-2xl border border-dashed border-[#E2DDD2] bg-white/70 p-3 text-center transition-all duration-150 ease-out"
                                    >
                                        <p className="text-sm font-bold text-slate-500">
                                            {h.name}
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-semibold text-teal-700">
                                            {h.area.name} · Sẵn sàng
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            <MobileBottomNav />
        </main>
    );
}
