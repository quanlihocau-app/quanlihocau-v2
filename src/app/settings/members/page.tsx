import { getPageSession } from "@/lib/server-session";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import {
    APP_PERMISSIONS,
    resolveMemberEffectivePermissions,
    type LakeRolePermissionsConfig,
} from "@/lib/role-permissions";
import { loadLakeRolePermissionsConfig } from "@/lib/role-permissions-server";

import { CreateMemberForm } from "./create-member-form";
import { DeactivateMemberButton } from "./deactivate-member-button";
import { ResetPasswordButton } from "./reset-password-button";
import { ChangeMemberRoleButton } from "./change-member-role-button";
import { RolePermissionsMatrix } from "./role-permissions-matrix";
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

function renderRoleBadge(
    config: LakeRolePermissionsConfig,
    membershipId: string,
    role: Role,
) {
    const resolved = resolveMemberEffectivePermissions(config, membershipId, role);

    switch (role) {
        case Role.OWNER:
            return (
                <span className="inline-flex items-center rounded-md bg-[#1B3B2B] px-2.5 py-1 text-xs font-bold text-white">
                    Chủ sở hữu (OWNER) • Toàn quyền
                </span>
            );
        case Role.MANAGER:
            return (
                <div className="inline-flex flex-col items-end sm:items-start gap-0.5">
                    <span className="inline-flex items-center rounded-md bg-[#E8F0EC] px-2.5 py-1 text-xs font-bold text-[#1B3B2B] border border-[#1B3B2B]/20">
                        {resolved.displayRoleName}
                    </span>
                    <span className="text-[11px] font-medium text-[#4B5563]">
                        {resolved.permissions.length}/{APP_PERMISSIONS.length} quyền được cấp
                    </span>
                </div>
            );
        case Role.STAFF:
            return (
                <div className="inline-flex flex-col items-end sm:items-start gap-0.5">
                    <span className="inline-flex items-center rounded-md bg-[#F8FAF8] px-2.5 py-1 text-xs font-bold text-[#111827] border border-[#E5E7EB]">
                        {resolved.displayRoleName}
                    </span>
                    <span className="text-[11px] font-medium text-[#4B5563]">
                        {resolved.permissions.length}/{APP_PERMISSIONS.length} quyền được cấp
                    </span>
                </div>
            );
        default:
            return <Badge variant="neutral">{role}</Badge>;
    }
}

export default async function MembersSettingsPage() {
    const session = await getPageSession();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-xl border border-red-200 bg-red-50 p-8 text-center">
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

    const [memberships, rolePermissionsConfig] = await Promise.all([
        prisma.membership.findMany({
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
        }),
        loadLakeRolePermissionsConfig(tenantContext.lakeId),
    ]);

    // If MANAGER or STAFF visits, show their App License & Read-only Assigned Permissions
    if (tenantContext.role !== Role.OWNER) {
        const myMembership = memberships.find((m) => m.user.id === tenantContext.userId);
        const resolved = resolveMemberEffectivePermissions(
            rolePermissionsConfig,
            myMembership?.id ?? "",
            tenantContext.role,
        );
        const grantedSet = new Set(resolved.permissions);

        return (
            <main className="mx-auto min-h-screen max-w-4xl bg-[#F8FAF8] px-4 pb-24 pt-6 sm:px-6 space-y-6">
                <PageHeader
                    title="Bản quyền & Phân quyền của bạn"
                    subtitle={`Hồ câu: ${tenantContext.lakeName} • Tài khoản: ${tenantContext.userName}`}
                    backHref="/settings"
                    backLabel="Quay lại Cài đặt"
                    badge={<Badge variant="default">{resolved.displayRoleName}</Badge>}
                />

                <Card className="p-5 sm:p-6 space-y-4">
                    <div className="border-b border-[#E5E7EB] pb-4">
                        <h2 className="text-lg font-bold font-serif text-[#111827]">
                            Chứng nhận Bản quyền sử dụng Ứng dụng Nội bộ
                        </h2>
                        <p className="text-xs text-[#4B5563] mt-1">
                            Tài khoản <strong>{tenantContext.userEmail}</strong> được Chủ sở hữu hồ câu <strong>{tenantContext.lakeName}</strong> cấp quyền truy cập với chức danh <strong>{resolved.displayRoleName}</strong> ({resolved.permissions.length}/{APP_PERMISSIONS.length} chức năng).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {APP_PERMISSIONS.map((perm) => {
                            const allowed = grantedSet.has(perm.key);
                            return (
                                <div
                                    key={perm.key}
                                    className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                                        allowed
                                            ? "border-[#1B3B2B]/25 bg-[#E8F0EC]/50 text-[#111827]"
                                            : "border-[#E5E7EB] bg-white text-[#4B5563]/60"
                                    }`}
                                >
                                    <span className="mt-0.5 text-xs font-bold">
                                        {allowed ? "✓" : "✕"}
                                    </span>
                                    <div>
                                        <p className="text-xs font-bold">{perm.label}</p>
                                        <p className="text-[11px] mt-0.5">{perm.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAF8] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs text-[#4B5563]">
                            Chỉ <strong>Chủ hồ (OWNER)</strong> mới có quyền thêm/xóa nhân sự và thay đổi bảng tích phân quyền.
                        </p>
                        <Link
                            href="/settings"
                            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1B3B2B] px-5 text-sm font-semibold text-white transition hover:bg-[#142d20] shrink-0"
                        >
                            Về Cài đặt
                        </Link>
                    </div>
                </Card>
            </main>
        );
    }

    const activeStaffCount = memberships.filter((m) => m.role === Role.STAFF).length;
    const activeManagerCount = memberships.filter((m) => m.role === Role.MANAGER).length;

    return (
        <main className="mx-auto min-h-screen max-w-6xl bg-[#F8FAF8] px-4 pb-24 pt-6 sm:px-6">
            {/* Header */}
            <PageHeader
                title="Quản lý & Phân quyền nhân sự"
                subtitle={`Hồ câu: ${tenantContext.lakeName} • Tổ chức: ${tenantContext.organizationName}`}
                backHref="/settings"
                backLabel="Quay lại Cài đặt"
                badge={<Badge variant="default">Chủ sở hữu</Badge>}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Cols: Members List */}
                <div className="lg:col-span-2">
                    <Card className="p-5 sm:p-6 space-y-4">
                        <div className="border-b border-[#E5E7EB] pb-4">
                            <h2 className="text-lg font-bold font-serif text-[#111827]">
                                Danh sách tài khoản nhân sự ({memberships.length})
                            </h2>
                            <p className="text-xs text-[#4B5563] font-medium">
                                Tất cả tài khoản được cấp bản quyền truy cập và thao tác tại hồ câu này. Bấm &ldquo;Đổi quyền&rdquo; để gán phân quyền cho từng nhân sự.
                            </p>
                        </div>

                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-2.5 md:hidden">
                            {memberships.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8FAF8] p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-[#111827]">
                                                    {m.user.name}
                                                </span>
                                                {m.user.id === tenantContext.userId && (
                                                    <span className="text-[11px] font-bold text-[#4B5563]">
                                                        (Bạn)
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#4B5563] font-mono mt-0.5">
                                                {m.user.email}
                                            </p>
                                        </div>
                                        {renderRoleBadge(rolePermissionsConfig, m.id, m.role)}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] pt-2.5 text-[11px] text-[#4B5563]">
                                        <span>Tham gia: {formatDateTime(m.createdAt)}</span>
                                        {m.role !== Role.OWNER &&
                                        m.user.id !== tenantContext.userId ? (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <ChangeMemberRoleButton
                                                    membershipId={m.id}
                                                    memberName={m.user.name}
                                                    memberEmail={m.user.email}
                                                    currentRole={m.role}
                                                    currentCustomRoleId={
                                                        rolePermissionsConfig.memberCustomRoleMap[m.id] ?? null
                                                    }
                                                    config={rolePermissionsConfig}
                                                />
                                                <ResetPasswordButton
                                                    membershipId={m.id}
                                                    memberName={m.user.name}
                                                    memberEmail={m.user.email}
                                                />
                                                <DeactivateMemberButton
                                                    membershipId={m.id}
                                                    memberName={m.user.name}
                                                    memberEmail={m.user.email}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white md:block">
                            <table className="w-full text-left text-xs text-[#4B5563]">
                                <thead className="border-b border-[#E5E7EB] bg-[#F8FAF8] text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                                    <tr>
                                        <th className="px-4 py-3.5">Họ và tên</th>
                                        <th className="px-4 py-3.5">Tài khoản</th>
                                        <th className="px-4 py-3.5">Phân quyền hiện tại</th>
                                        <th className="px-4 py-3.5">Ngày tham gia</th>
                                        <th className="px-4 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {memberships.map((m) => (
                                        <tr
                                            key={m.id}
                                            className="hover:bg-[#F8FAF8] transition-colors"
                                        >
                                            <td className="px-4 py-3.5 font-bold text-[#111827]">
                                                {m.user.name}
                                                {m.user.id === tenantContext.userId && (
                                                    <span className="ml-1.5 text-[11px] text-[#4B5563] font-normal">
                                                        (Bạn)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-[#4B5563]">
                                                {m.user.email}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {renderRoleBadge(rolePermissionsConfig, m.id, m.role)}
                                            </td>
                                            <td className="px-4 py-3.5 text-[11px] text-[#4B5563]">
                                                {formatDateTime(m.createdAt)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                {m.role !== Role.OWNER &&
                                                m.user.id !== tenantContext.userId ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <ChangeMemberRoleButton
                                                            membershipId={m.id}
                                                            memberName={m.user.name}
                                                            memberEmail={m.user.email}
                                                            currentRole={m.role}
                                                            currentCustomRoleId={
                                                                rolePermissionsConfig.memberCustomRoleMap[m.id] ?? null
                                                            }
                                                            config={rolePermissionsConfig}
                                                        />
                                                        <ResetPasswordButton
                                                            membershipId={m.id}
                                                            memberName={m.user.name}
                                                            memberEmail={m.user.email}
                                                        />
                                                        <DeactivateMemberButton
                                                            membershipId={m.id}
                                                            memberName={m.user.name}
                                                            memberEmail={m.user.email}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[#4B5563]">
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
                        <div className="border-b border-[#E5E7EB] pb-4">
                            <h2 className="text-lg font-bold font-serif text-[#111827]">
                                Thêm nhân sự mới
                            </h2>
                            <p className="text-xs text-[#4B5563] font-medium">
                                Tạo tài khoản đăng nhập và gán tên phân quyền cho nhân viên hoặc quản lý.
                            </p>
                        </div>

                        <CreateMemberForm rolePermissionsConfig={rolePermissionsConfig} />
                    </Card>
                </div>
            </div>

            {/* Bản quyền sử dụng App + Đặt tên phân quyền + Bảng tích Ma trận quyền */}
            <RolePermissionsMatrix
                lakeName={tenantContext.lakeName}
                organizationName={tenantContext.organizationName}
                initialConfig={rolePermissionsConfig}
                activeStaffCount={activeStaffCount}
                activeManagerCount={activeManagerCount}
            />
        </main>
    );
}
