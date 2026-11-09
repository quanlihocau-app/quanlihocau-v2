"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import {
    APP_PERMISSIONS,
    type CustomRoleProfile,
    type LakeRolePermissionsConfig,
} from "@/lib/role-permissions";

interface ChangeMemberRoleButtonProps {
    membershipId: string;
    memberName: string;
    memberEmail: string;
    currentRole: Role;
    currentCustomRoleId: string | null;
    config: LakeRolePermissionsConfig;
}

export function ChangeMemberRoleButton({
    membershipId,
    memberName,
    memberEmail,
    currentRole,
    currentCustomRoleId,
    config,
}: ChangeMemberRoleButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string>(
        currentCustomRoleId
            ? `CUSTOM:${currentCustomRoleId}`
            : `BASE:${currentRole === Role.MANAGER ? Role.MANAGER : Role.STAFF}`,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function getPreviewPermissions(val: string) {
        if (val.startsWith("CUSTOM:")) {
            const cId = val.slice("CUSTOM:".length);
            const found = config.customRoles.find((r) => r.id === cId);
            if (found) return found.permissions;
        }
        if (val === `BASE:${Role.MANAGER}`) {
            return config.managerPermissions;
        }
        return config.staffPermissions;
    }

    async function handleSave() {
        setError(null);
        setLoading(true);

        try {
            let role: typeof Role.STAFF | typeof Role.MANAGER = Role.STAFF;
            let customRoleId: string | null = null;

            if (selectedValue.startsWith("CUSTOM:")) {
                const cId = selectedValue.slice("CUSTOM:".length);
                const found: CustomRoleProfile | undefined = config.customRoles.find(
                    (r) => r.id === cId,
                );
                if (found) {
                    role = found.baseRole;
                    customRoleId = found.id;
                }
            } else if (selectedValue === `BASE:${Role.MANAGER}`) {
                role = Role.MANAGER;
            } else {
                role = Role.STAFF;
            }

            const res = await fetch(`/api/members/${membershipId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "UPDATE_ROLE",
                    role,
                    customRoleId,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Không thể cập nhật phân quyền.");
                return;
            }

            setOpen(false);
            router.refresh();
        } catch {
            setError("Lỗi kết nối mạng, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    const previewKeys = new Set(getPreviewPermissions(selectedValue));
    const enabledPermissions = APP_PERMISSIONS.filter((p) => previewKeys.has(p.key));

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setSelectedValue(
                        currentCustomRoleId
                            ? `CUSTOM:${currentCustomRoleId}`
                            : `BASE:${currentRole === Role.MANAGER ? Role.MANAGER : Role.STAFF}`,
                    );
                    setError(null);
                    setOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#1B3B2B]/25 bg-[#E8F0EC] px-2.5 text-xs font-semibold text-[#1B3B2B] hover:bg-[#dceae3] transition-colors cursor-pointer"
            >
                <span>🛡️ Đổi quyền</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left">
                    <div className="w-full max-w-lg rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4 bg-[#F8FAF8]">
                            <div>
                                <h3 className="text-lg font-bold font-serif text-[#111827]">
                                    Cấp &amp; Đổi phân quyền nhân sự
                                </h3>
                                <p className="text-xs font-medium text-[#4B5563]">
                                    {memberName} ({memberEmail})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#E8F0EC] cursor-pointer text-base font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4 max-h-[65dvh] overflow-y-auto">
                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-[#B91C1C]">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label
                                    htmlFor={`select-role-${membershipId}`}
                                    className="block text-sm font-semibold text-[#111827]"
                                >
                                    Chọn nhóm phân quyền áp dụng
                                </label>
                                <select
                                    id={`select-role-${membershipId}`}
                                    value={selectedValue}
                                    onChange={(e) => setSelectedValue(e.target.value)}
                                    className="h-12 w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-sm font-medium text-[#111827] focus:border-[#1B3B2B] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                                >
                                    <optgroup label="Phân quyền tiêu chuẩn của hồ">
                                        <option value={`BASE:${Role.STAFF}`}>
                                            {config.staffRoleLabel} ({config.staffPermissions.length} quyền)
                                        </option>
                                        <option value={`BASE:${Role.MANAGER}`}>
                                            {config.managerRoleLabel} ({config.managerPermissions.length} quyền)
                                        </option>
                                    </optgroup>
                                    {config.customRoles.length > 0 && (
                                        <optgroup label="Phân quyền tùy chỉnh do Chủ hồ đặt tên">
                                            {config.customRoles.map((cr) => (
                                                <option key={cr.id} value={`CUSTOM:${cr.id}`}>
                                                    {cr.name} — Cấp {cr.baseRole === Role.MANAGER ? "Quản lý" : "Nhân viên"} ({cr.permissions.length} quyền)
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>

                            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAF8] p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#1B3B2B]">
                                        Các quyền được phép thực hiện ({enabledPermissions.length}/{APP_PERMISSIONS.length})
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                    {APP_PERMISSIONS.map((perm) => {
                                        const allowed = previewKeys.has(perm.key);
                                        return (
                                            <div
                                                key={perm.key}
                                                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                                                    allowed
                                                        ? "bg-[#E8F0EC] text-[#1B3B2B] font-semibold"
                                                        : "bg-white text-[#4B5563]/60 line-through"
                                                }`}
                                            >
                                                <span className="shrink-0 font-bold">
                                                    {allowed ? "✓" : "✕"}
                                                </span>
                                                <span className="truncate">{perm.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] px-5 py-4 bg-white">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827] hover:bg-[#F8FAF8] cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleSave}
                                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1B3B2B] px-5 text-sm font-semibold text-white hover:bg-[#142d20] disabled:opacity-40 cursor-pointer"
                            >
                                {loading ? "Đang lưu…" : "Lưu phân quyền"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
