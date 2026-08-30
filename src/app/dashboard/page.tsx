import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const membership = await prisma.membership.findFirst({
        where: {
            user: {
                email: session.user.email,
            },
            deletedAt: null,
        },
        include: {
            user: true,
            lake: {
                include: {
                    organization: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    if (!membership) {
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

    const { user, lake, role } = membership;
    const organization = lake.organization;

    return (
        <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Bảng điều khiển</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Thông tin hồ câu và tài khoản hiện tại.
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Thông tin tổ chức & Hồ câu
                    </h2>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <dt className="text-slate-500">Tổ chức:</dt>
                            <dd className="font-medium text-slate-900">
                                {organization.name}
                            </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <dt className="text-slate-500">Tên hồ câu:</dt>
                            <dd className="font-medium text-slate-900">{lake.name}</dd>
                        </div>
                    </dl>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Thông tin tài khoản
                    </h2>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <dt className="text-slate-500">Họ và tên:</dt>
                            <dd className="font-medium text-slate-900">
                                {user.name || session.user.name || "N/A"}
                            </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <dt className="text-slate-500">Email:</dt>
                            <dd className="font-medium text-slate-900">{user.email}</dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <dt className="text-slate-500">Vai trò (Role):</dt>
                            <dd className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                                {role}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>
        </main>
    );
}
