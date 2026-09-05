import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateAreaForm, CreateHutForm } from "./facility-forms";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FacilitiesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                    <h1 className="text-xl font-bold text-red-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-red-700">
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
        <main className="mx-auto min-h-screen max-w-5xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6">
            <PageHeader
                title="Quản lý Khu vực & Chòi câu"
                subtitle={`Hồ câu: ${tenantContext.lakeName} (${tenantContext.organizationName})`}
                backHref="/settings"
                backLabel="Cài đặt"
                badge={<Badge variant="default">Vai trò: {tenantContext.role}</Badge>}
            />

            {canManage ? (
                <section className="mb-8 grid gap-6 md:grid-cols-2">
                    <CreateAreaForm />
                    <CreateHutForm
                        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
                    />
                </section>
            ) : null}

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-5 sm:p-6 space-y-4">
                    <div className="border-b border-[#E2DDD2] pb-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                            Danh sách Khu vực ({areas.length})
                        </h2>
                    </div>

                    {areas.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-500 font-medium">
                            Chưa có khu vực nào.
                        </p>
                    ) : (
                        <ul className="divide-y divide-[#E2DDD2]">
                            {areas.map((area) => (
                                <li
                                    key={area.id}
                                    className="flex items-center justify-between py-3 text-xs"
                                >
                                    <span className="font-bold text-slate-900">
                                        {area.name}
                                    </span>
                                    <span className="rounded-lg bg-[#102A43]/10 px-2.5 py-1 text-[11px] font-bold text-[#102A43]">
                                        {area._count.huts} chòi
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="p-5 sm:p-6 space-y-4">
                    <div className="border-b border-[#E2DDD2] pb-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                            Danh sách Chòi câu ({huts.length})
                        </h2>
                    </div>

                    {huts.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-500 font-medium">
                            Chưa có chòi câu nào.
                        </p>
                    ) : (
                        <ul className="divide-y divide-[#E2DDD2]">
                            {huts.map((hut) => (
                                <li
                                    key={hut.id}
                                    className="flex items-center justify-between py-3 text-xs"
                                >
                                    <span className="font-bold text-slate-900">
                                        {hut.name}
                                    </span>
                                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                                        {hut.area.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </main>
    );
}
