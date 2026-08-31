import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateMemberForm } from "./create-member-form";
import { DeactivateMemberButton } from "./deactivate-member-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDateTime(date: Date | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(date));
}

function getRoleBadge(role: Role) {
    switch (role) {
        case Role.OWNER:
            return (
                <span className="inline-flex items-center rounded-lg bg-[#102A43]/10 px-2.5 py-1 text-xs font-bold text-[#102A43] border border-[#102A43]/20">
                    Chủ sở hữu (OWNER)
                </span>
            );
        case Role.MANAGER:
            return (
                <span className="inline-flex items-center rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 border border-teal-200">
                    Quản lý (MANAGER)
                </span>
            );
        case Role.STAFF:
            return (
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                    Nhân viên (STAFF)
                </span>
            );
        default:
            return <Badge variant="neutral">{role}</Badge>;
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
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                    <h1 className="text-xl font-bold text-red-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-red-700">
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
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
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
                    <h1 className="text-xl font-bold text-red-900">
                        Không có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-red-700">
                        Chỉ Chủ hồ (OWNER) mới có quyền quản lý danh sách và phân
                        quyền nhân sự của hồ câu này.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/dashboard"
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#102A43] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#1E3A5F]"
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
        <main className="mx-auto min-h-screen max-w-6xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6">
            {/* Header */}
            <PageHeader
                title="Quản lý nhân sự hồ câu"
                subtitle={`Hồ câu: ${tenantContext.lakeName} • Tổ chức: ${tenantContext.organizationName}`}
                backHref="/settings"
                backLabel="Cài đặt chung"
                badge={<Badge variant="default">Chủ sở hữu</Badge>}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Cols: Members List */}
                <div className="lg:col-span-2">
                    <Card className="p-5 sm:p-6 space-y-4">
                        <div className="border-b border-[#E2DDD2] pb-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                Danh sách nhân sự ({memberships.length})
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Tất cả tài khoản có quyền truy cập và thao tác tại hồ câu này.
                            </p>
                        </div>

                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-2.5 md:hidden">
                            {memberships.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex flex-col gap-2 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-slate-900">
                                                {m.user.name}
                                            </span>
                                            {m.user.id === tenantContext.userId && (
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    (Bạn)
                                                </span>
                                            )}
                                        </div>
                                        {getRoleBadge(m.role)}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-mono">
                                        {m.user.email}
                                    </p>
                                    <div className="flex items-center justify-between border-t border-[#E2DDD2] pt-2 text-[10px] text-slate-400">
                                        <span>Tham gia: {formatDateTime(m.createdAt)}</span>
                                        {m.role !== Role.OWNER &&
                                        m.user.id !== tenantContext.userId ? (
                                            <DeactivateMemberButton
                                                membershipId={m.id}
                                                memberName={m.user.name}
                                                memberEmail={m.user.email}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden overflow-hidden rounded-xl border border-[#E2DDD2] bg-white md:block">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3.5">Họ và tên</th>
                                        <th className="px-4 py-3.5">Email</th>
                                        <th className="px-4 py-3.5">Vai trò</th>
                                        <th className="px-4 py-3.5">Ngày tham gia</th>
                                        <th className="px-4 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2DDD2]">
                                    {memberships.map((m) => (
                                        <tr
                                            key={m.id}
                                            className="hover:bg-[#F8F6F0]/60 transition-colors"
                                        >
                                            <td className="px-4 py-3.5 font-bold text-slate-900">
                                                {m.user.name}
                                                {m.user.id === tenantContext.userId && (
                                                    <span className="ml-1.5 text-[11px] text-slate-400 font-normal">
                                                        (Bạn)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-slate-600">
                                                {m.user.email}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {getRoleBadge(m.role)}
                                            </td>
                                            <td className="px-4 py-3.5 text-[11px] text-slate-400">
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
                    </Card>
                </div>

                {/* Right 1 Col: Create Member Form */}
                <div className="lg:col-span-1">
                    <Card className="p-5 sm:p-6 space-y-4">
                        <div className="border-b border-[#E2DDD2] pb-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                Thêm nhân sự mới
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Tạo tài khoản đăng nhập cho nhân viên hoặc quản lý.
                            </p>
                        </div>

                        <CreateMemberForm />
                    </Card>
                </div>
            </div>
        </main>
    );
}
