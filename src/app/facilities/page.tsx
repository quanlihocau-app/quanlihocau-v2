import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateAreaForm, CreateHutForm } from "./facility-forms";

export default async function FacilitiesPage() {
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
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    const [areas, huts] = await Promise.all([
        prisma.area.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            include: {
                _count: {
                    select: { huts: { where: { deletedAt: null } } },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        }),
        prisma.hut.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            include: {
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
        }),
    ]);

    const canManage =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
            <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Quản lý Khu vực & Chòi câu
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Hồ câu: <span className="font-semibold text-slate-800">{tenantContext.lakeName}</span> ({tenantContext.organizationName})
                    </p>
                </div>
                <div className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800">
                    Vai trò: {tenantContext.role}
                </div>
            </header>

            {canManage ? (
                <section className="mb-12 grid gap-6 md:grid-cols-2">
                    <CreateAreaForm />
                    <CreateHutForm
                        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
                    />
                </section>
            ) : null}

            <div className="grid gap-8 md:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Danh sách Khu vực ({areas.length})
                        </h2>
                    </div>

                    {areas.length === 0 ? (
                        <p className="mt-6 text-center text-sm text-slate-500">
                            Chưa có khu vực nào.
                        </p>
                    ) : (
                        <ul className="mt-4 divide-y divide-slate-100">
                            {areas.map((area) => (
                                <li
                                    key={area.id}
                                    className="flex items-center justify-between py-3 text-sm"
                                >
                                    <span className="font-medium text-slate-900">
                                        {area.name}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                                        {area._count.huts} chòi
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Danh sách Chòi câu ({huts.length})
                        </h2>
                    </div>

                    {huts.length === 0 ? (
                        <p className="mt-6 text-center text-sm text-slate-500">
                            Chưa có chòi câu nào.
                        </p>
                    ) : (
                        <ul className="mt-4 divide-y divide-slate-100">
                            {huts.map((hut) => (
                                <li
                                    key={hut.id}
                                    className="flex items-center justify-between py-3 text-sm"
                                >
                                    <span className="font-medium text-slate-900">
                                        {hut.name}
                                    </span>
                                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                        {hut.area.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}
