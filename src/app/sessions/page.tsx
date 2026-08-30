import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role, SessionStatus } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export default async function SessionsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
                    <h1 className="text-xl font-semibold text-amber-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-sm text-amber-700">
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền
                        hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

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
        },
        orderBy: {
            startAt: "desc",
        },
    });

    const canOpenSession =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER ||
        tenantContext.role === Role.STAFF;

    function formatTime(dateStr: Date | string) {
        const d = new Date(dateStr);
        return d.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "Asia/Ho_Chi_Minh",
        });
    }

    function formatPrice(vnd: number) {
        return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
    }

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
            <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Phiên câu
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Hồ câu:{" "}
                        <span className="font-semibold text-slate-800">
                            {tenantContext.lakeName}
                        </span>{" "}
                        ({tenantContext.organizationName})
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800">
                        Vai trò: {tenantContext.role}
                    </div>
                    {canOpenSession ? (
                        <Link
                            href="/sessions/new"
                            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                        >
                            Mở phiên câu
                        </Link>
                    ) : null}
                </div>
            </header>

            {activeSessions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <p className="text-sm text-slate-500">
                        Không có phiên câu nào đang hoạt động.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-600">
                        Đang hoạt động: {activeSessions.length} phiên
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activeSessions.map((s) => (
                            <div
                                key={s.id}
                                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                            ACTIVE
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {formatPrice(s.package.priceVnd)}
                                    </span>
                                </div>

                                <div className="mt-3 space-y-2">
                                    <div>
                                        <p className="text-xs font-medium uppercase text-slate-400">
                                            Khách hàng
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {s.customer?.name ?? (
                                                <span className="font-normal italic text-slate-400">
                                                    Khách vãng lai
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase text-slate-400">
                                            Gói câu
                                        </p>
                                        <p className="text-sm text-slate-700">
                                            {s.package.name} ({s.package.durationMinutes} phút)
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase text-slate-400">
                                            Chòi
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                            {s.hutLinks.map((hl) => (
                                                <span
                                                    key={hl.hut.id}
                                                    className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                                                >
                                                    {hl.hut.name}
                                                    <span className="ml-0.5 text-slate-400">
                                                        ({hl.hut.area.name})
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                            <p className="text-xs font-medium uppercase text-slate-400">
                                                Bắt đầu
                                            </p>
                                            <p className="text-xs text-slate-600">
                                                {formatTime(s.startAt)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium uppercase text-slate-400">
                                                Dự kiến kết thúc
                                            </p>
                                            <p className="text-xs text-slate-600">
                                                {formatTime(s.plannedEndAt)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
