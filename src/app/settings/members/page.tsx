import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateMemberForm } from "./create-member-form";
import { DeactivateMemberButton } from "./deactivate-member-button";

function formatDateTime(date: Date | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(date));
}

function getRoleBadge(role: Role) {
    switch (role) {
        case Role.OWNER:
            return (
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/10">
                    Chủ sở hữu (OWNER)
                </span>
            );
        case Role.MANAGER:
            return (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    Quản lý (MANAGER)
                </span>
            );
        case Role.STAFF:
            return (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
                    Nhân viên (STAFF)
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {role}
                </span>
            );
    }
}

export default async function MembersSettingsPage() {
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

    // Only OWNER can access member management
    if (tenantContext.role !== Role.OWNER) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-rose-900">
                        Không có quyền truy cập
                    </h1>
                    <p className="mt-2 text-sm text-rose-700">
                        Chỉ Chủ hồ (OWNER) mới có quyền quản lý danh sách và phân
                        quyền nhân sự của hồ câu này.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                        >
                            Về Bảng điều khiển
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const memberships = await prisma.membership.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Quản lý nhân sự hồ câu
                        </h1>
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/10">
                            Chủ sở hữu
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        Hồ câu:{" "}
                        <span className="font-semibold text-slate-800">
                            {tenantContext.lakeName}
                        </span>{" "}
                        • Tổ chức:{" "}
                        <span className="font-semibold text-slate-800">
                            {tenantContext.organizationName}
                        </span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/settings"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <span>Cài đặt chung</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
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
                                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                            />
                        </svg>
                        <span>Bảng điều khiển</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left 2 Cols: Members List */}
                <div className="lg:col-span-2">
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Danh sách nhân sự ({memberships.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                                Tất cả tài khoản có quyền truy cập và thao tác tại hồ câu này.
                            </p>
                        </div>

                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Họ và tên</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Vai trò</th>
                                        <th className="px-4 py-3">Ngày tham gia</th>
                                        <th className="px-4 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {memberships.map((m) => (
                                        <tr
                                            key={m.id}
                                            className="transition hover:bg-slate-50/50"
                                        >
                                            <td className="px-4 py-3.5 font-medium text-slate-900">
                                                {m.user.name}
                                                {m.user.id === tenantContext.userId && (
                                                    <span className="ml-1.5 text-xs text-slate-400">
                                                        (Bạn)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                                                {m.user.email}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {getRoleBadge(m.role)}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-400">
                                                {formatDateTime(m.createdAt)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                {m.role !== Role.OWNER &&
                                                m.user.id !== tenantContext.userId ? (
                                                    <DeactivateMemberButton
                                                        membershipId={m.id}
                                                        memberName={m.user.name}
                                                        memberEmail={m.user.email}
                                                    />
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right 1 Col: Create Member Form */}
                <div className="lg:col-span-1">
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Thêm nhân sự mới
                            </h2>
                            <p className="text-xs text-slate-500">
                                Tạo tài khoản đăng nhập cho nhân viên hoặc quản lý.
                            </p>
                        </div>

                        <div className="mt-4">
                            <CreateMemberForm />
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
