"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import {
    APP_PERMISSIONS,
    PERMISSION_CATEGORIES,
    DEFAULT_STAFF_PERMISSIONS,
    DEFAULT_MANAGER_PERMISSIONS,
    type AppPermissionKey,
    type CustomRoleProfile,
    type LakeRolePermissionsConfig,
} from "@/lib/role-permissions";
import { InlineAlert } from "@/components/ui/inline-alert";

interface RolePermissionsMatrixProps {
    lakeName: string;
    organizationName: string;
    initialConfig: LakeRolePermissionsConfig;
    activeStaffCount: number;
    activeManagerCount: number;
}

const PRESET_TEMPLATES: Array<{
    name: string;
    baseRole: typeof Role.STAFF | typeof Role.MANAGER;
    description: string;
    permissions: AppPermissionKey[];
}> = [
    {
        name: "Thu ngân chuyên trách",
        baseRole: Role.STAFF,
        description: "Mở vé, bán lẻ nước/mồi, thu tiền hóa đơn và chốt bàn giao ca trực.",
        permissions: [
            "SESSION_OPEN_CLOSE",
            "SESSION_EXTEND_TRANSFER",
            "RETAIL_ORDER",
            "INVOICE_COLLECT_PAYMENT",
            "INVOICE_EDIT_LINES",
            "SHIFT_REPORT_VIEW",
            "SHIFT_CLOSE",
        ],
    },
    {
        name: "Nhân viên trực hồ & Cân cá",
        baseRole: Role.STAFF,
        description: "Mở vé, đổi chòi, phục vụ nước/mồi tại chòi và cân cá thu mua lại.",
        permissions: [
            "SESSION_OPEN_CLOSE",
            "SESSION_EXTEND_TRANSFER",
            "RETAIL_ORDER",
            "FISH_BUYBACK_CREATE",
            "INVOICE_EDIT_LINES",
        ],
    },
    {
        name: "Quản lý ca trực",
        baseRole: Role.MANAGER,
        description: "Điều hành toàn bộ hoạt động tại hồ, chốt ca, nhập kho và duyệt chi phí.",
        permissions: [...DEFAULT_MANAGER_PERMISSIONS],
    },
    {
        name: "Kế toán & Kiểm soát nội bộ",
        baseRole: Role.MANAGER,
        description: "Theo dõi sổ quỹ, công nợ, báo cáo doanh thu và kiểm tra nhật ký chống gian lận.",
        permissions: [
            "SHIFT_REPORT_VIEW",
            "FINANCE_VIEW_CASHBOOK",
            "FINANCE_APPROVE_TRANSACTIONS",
            "FINANCE_MANAGE_DEBT",
            "REPORTS_VIEW_ANALYTICS",
            "AUDIT_LOG_VIEW",
        ],
    },
];

export function RolePermissionsMatrix({
    lakeName,
    organizationName,
    initialConfig,
    activeStaffCount,
    activeManagerCount,
}: RolePermissionsMatrixProps) {
    const router = useRouter();

    const [staffRoleLabel, setStaffRoleLabel] = useState(initialConfig.staffRoleLabel);
    const [managerRoleLabel, setManagerRoleLabel] = useState(initialConfig.managerRoleLabel);
    const [staffPerms, setStaffPerms] = useState<Set<AppPermissionKey>>(
        () => new Set(initialConfig.staffPermissions),
    );
    const [managerPerms, setManagerPerms] = useState<Set<AppPermissionKey>>(
        () => new Set(initialConfig.managerPermissions),
    );
    const [customRoles, setCustomRoles] = useState<CustomRoleProfile[]>(
        initialConfig.customRoles,
    );

    // State cho trình tạo / sửa tên phân quyền tùy chỉnh
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [showRoleBuilder, setShowRoleBuilder] = useState(false);
    const [customName, setCustomName] = useState("");
    const [customBaseRole, setCustomBaseRole] = useState<typeof Role.STAFF | typeof Role.MANAGER>(
        Role.STAFF,
    );
    const [customDescription, setCustomDescription] = useState("");
    const [customPerms, setCustomPerms] = useState<Set<AppPermissionKey>>(
        () => new Set(DEFAULT_STAFF_PERMISSIONS),
    );

    const [savingMatrix, setSavingMatrix] = useState(false);
    const [savingCustom, setSavingCustom] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    function toggleStaffPerm(key: AppPermissionKey) {
        setStaffPerms((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function toggleManagerPerm(key: AppPermissionKey) {
        setManagerPerms((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function toggleCustomPerm(key: AppPermissionKey) {
        setCustomPerms((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    async function persistConfig(
        nextStaffLabel: string,
        nextManagerLabel: string,
        nextStaffPerms: AppPermissionKey[],
        nextManagerPerms: AppPermissionKey[],
        nextCustomRoles: CustomRoleProfile[],
        successText: string,
    ) {
        setError(null);
        setSuccessMessage(null);

        const res = await fetch("/api/members", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                staffRoleLabel: nextStaffLabel.trim() || "Nhân viên (STAFF)",
                managerRoleLabel: nextManagerLabel.trim() || "Quản lý (MANAGER)",
                staffPermissions: nextStaffPerms,
                managerPermissions: nextManagerPerms,
                customRoles: nextCustomRoles,
                memberCustomRoleMap: initialConfig.memberCustomRoleMap,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || "Không thể lưu cấu hình phân quyền.");
        }

        setSuccessMessage(successText);
        router.refresh();
    }

    async function handleSaveMatrix() {
        setSavingMatrix(true);
        try {
            await persistConfig(
                staffRoleLabel,
                managerRoleLabel,
                Array.from(staffPerms),
                Array.from(managerPerms),
                customRoles,
                "Đã lưu bảng tích phân quyền Nhân viên & Quản lý thành công.",
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi kết nối mạng.");
        } finally {
            setSavingMatrix(false);
        }
    }

    async function handleResetDefaultMatrix() {
        const defaultStaff = [...DEFAULT_STAFF_PERMISSIONS];
        const defaultManager = [...DEFAULT_MANAGER_PERMISSIONS];
        setStaffRoleLabel("Nhân viên (STAFF)");
        setManagerRoleLabel("Quản lý (MANAGER)");
        setStaffPerms(new Set(defaultStaff));
        setManagerPerms(new Set(defaultManager));

        setSavingMatrix(true);
        try {
            await persistConfig(
                "Nhân viên (STAFF)",
                "Quản lý (MANAGER)",
                defaultStaff,
                defaultManager,
                customRoles,
                "Đã khôi phục bảng phân quyền mặc định chuẩn của hệ thống.",
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi kết nối mạng.");
        } finally {
            setSavingMatrix(false);
        }
    }

    function openCreateCustomRole(template?: (typeof PRESET_TEMPLATES)[number]) {
        setEditingRoleId(null);
        setCustomName(template ? template.name : "");
        setCustomBaseRole(template ? template.baseRole : Role.STAFF);
        setCustomDescription(template ? template.description : "");
        setCustomPerms(
            new Set(template ? template.permissions : Array.from(staffPerms)),
        );
        setShowRoleBuilder(true);
        setError(null);
    }

    function openEditCustomRole(roleProfile: CustomRoleProfile) {
        setEditingRoleId(roleProfile.id);
        setCustomName(roleProfile.name);
        setCustomBaseRole(roleProfile.baseRole);
        setCustomDescription(roleProfile.description ?? "");
        setCustomPerms(new Set(roleProfile.permissions));
        setShowRoleBuilder(true);
        setError(null);
    }

    async function handleSaveCustomRole() {
        if (!customName.trim()) {
            setError("Vui lòng nhập tên phân quyền (ví dụ: Thu ngân ca sáng, Nhân viên cân cá…).");
            return;
        }
        if (customPerms.size === 0) {
            setError("Vui lòng tích chọn ít nhất 1 quyền hạn trong bảng cho phân quyền này.");
            return;
        }

        const newProfile: CustomRoleProfile = {
            id: editingRoleId || `role-${Date.now()}`,
            name: customName.trim(),
            baseRole: customBaseRole,
            description: customDescription.trim() || undefined,
            permissions: Array.from(customPerms),
            updatedAt: new Date().toISOString(),
        };

        const nextCustomRoles = editingRoleId
            ? customRoles.map((r) => (r.id === editingRoleId ? newProfile : r))
            : [...customRoles, newProfile];

        setSavingCustom(true);
        try {
            await persistConfig(
                staffRoleLabel,
                managerRoleLabel,
                Array.from(staffPerms),
                Array.from(managerPerms),
                nextCustomRoles,
                editingRoleId
                    ? `Đã cập nhật phân quyền "${newProfile.name}" thành công.`
                    : `Đã tạo phân quyền mới "${newProfile.name}" thành công.`,
            );
            setCustomRoles(nextCustomRoles);
            setShowRoleBuilder(false);
            setEditingRoleId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi kết nối mạng.");
        } finally {
            setSavingCustom(false);
        }
    }

    async function handleDeleteCustomRole(roleId: string, roleName: string) {
        const nextCustomRoles = customRoles.filter((r) => r.id !== roleId);
        setSavingCustom(true);
        try {
            await persistConfig(
                staffRoleLabel,
                managerRoleLabel,
                Array.from(staffPerms),
                Array.from(managerPerms),
                nextCustomRoles,
                `Đã xóa phân quyền "${roleName}".`,
            );
            setCustomRoles(nextCustomRoles);
            if (editingRoleId === roleId) {
                setShowRoleBuilder(false);
                setEditingRoleId(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi kết nối mạng.");
        } finally {
            setSavingCustom(false);
        }
    }

    return (
        <div className="space-y-6 mt-6">
            {error && <InlineAlert type="error" message={error} />}
            {successMessage && <InlineAlert type="success" message={successMessage} />}

            {/* 1. BẢN QUYỀN SỬ DỤNG ỨNG DỤNG CHO NHÂN VIÊN & QUẢN LÝ */}
            <section className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                <div className="border-b border-[#E5E7EB] bg-[#1B3B2B] px-5 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white text-lg font-bold">
                            🛡️
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-bold font-serif text-white">
                                    Bản quyền sử dụng ứng dụng — Nhân viên &amp; Quản lý
                                </h2>
                                <span className="inline-flex items-center rounded-md bg-[#E8F0EC] px-2.5 py-0.5 text-xs font-bold text-[#1B3B2B]">
                                    Đã cấp phép chính thức
                                </span>
                            </div>
                            <p className="text-xs text-white/85 mt-0.5">
                                Đơn vị chủ quản: <strong>{lakeName}</strong> ({organizationName})
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 rounded-lg px-3.5 py-2 shrink-0">
                        <span>
                            Đang cấp quyền: {activeManagerCount} Quản lý • {activeStaffCount} Nhân viên
                        </span>
                    </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8FAF8]">
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#1B3B2B]">
                            <span>1. Quyền sử dụng theo hồ câu</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#4B5563]">
                            Tài khoản <strong>Nhân viên (STAFF)</strong> và <strong>Quản lý (MANAGER)</strong> được cấp bản quyền sử dụng ứng dụng Quản Lý Hồ Câu trực thuộc gói thuê bao của Chủ sở hữu hồ câu <strong>{lakeName}</strong>.
                        </p>
                    </div>

                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#1B3B2B]">
                            <span>2. Định danh &amp; Chống gian lận ca trực</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#4B5563]">
                            Mọi thao tác mở vé, thêm/bớt nước uống, thu tiền mặt/chuyển khoản và chốt ca đều tự động gắn tên tài khoản thực hiện. <strong>Nghiêm cấm dùng chung tài khoản</strong> giữa các ca.
                        </p>
                    </div>

                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#1B3B2B]">
                            <span>3. Bảo mật dữ liệu &amp; Thu hồi quyền</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#4B5563]">
                            Dữ liệu khách hàng, doanh thu và công nợ là tài sản riêng của Chủ hồ. Chủ hồ có toàn quyền điều chỉnh bảng tích phân quyền hoặc khóa tài khoản nhân sự ngay lập tức khi nghỉ việc.
                        </p>
                    </div>
                </div>
            </section>

            {/* 2. ĐẶT TÊN PHÂN QUYỀN TÙY CHỈNH DỰA THEO BẢNG TÍCH QUYỀN CÓ SẴN */}
            <section className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                <div className="border-b border-[#E5E7EB] bg-[#F8FAF8] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold font-serif text-[#111827]">
                            Đặt tên phân quyền tùy chỉnh theo bảng tích chọn ({customRoles.length})
                        </h2>
                        <p className="text-xs font-medium text-[#4B5563]">
                            Chủ hồ tự đặt tên chức danh (VD: Thu ngân ca sáng, Nhân viên cân cá, Quản lý ca đêm…) và tích chọn các quyền được phép từ danh sách có sẵn.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => openCreateCustomRole()}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1B3B2B] px-4 text-sm font-semibold text-white hover:bg-[#142d20] transition-colors cursor-pointer shrink-0"
                    >
                        <span>+ Đặt tên phân quyền mới</span>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Gợi ý mẫu tạo nhanh 1 chạm */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#4B5563]">
                            Mẫu gợi ý nhanh:
                        </span>
                        {PRESET_TEMPLATES.map((tpl) => (
                            <button
                                key={tpl.name}
                                type="button"
                                onClick={() => openCreateCustomRole(tpl)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F8FAF8] px-3 text-xs font-semibold text-[#1B3B2B] hover:bg-[#E8F0EC] transition-colors cursor-pointer"
                            >
                                <span>+ {tpl.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Danh sách các phân quyền đã đặt tên */}
                    {customRoles.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAF8] p-5 text-center">
                            <p className="text-sm font-semibold text-[#111827]">
                                Chưa có tên phân quyền tùy chỉnh nào
                            </p>
                            <p className="text-xs text-[#4B5563] mt-1">
                                Bấm <strong>&ldquo;Đặt tên phân quyền mới&rdquo;</strong> hoặc chọn một mẫu gợi ý phía trên để tích chọn các quyền riêng cho từng vị trí công việc tại hồ.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {customRoles.map((cr) => (
                                <div
                                    key={cr.id}
                                    className="rounded-xl border border-[#E5E7EB] bg-[#F8FAF8] p-4 flex flex-col justify-between gap-3"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-base font-bold font-serif text-[#111827]">
                                                {cr.name}
                                            </span>
                                            <span className="inline-flex items-center rounded-md bg-[#E8F0EC] px-2.5 py-0.5 text-xs font-semibold text-[#1B3B2B]">
                                                Cấp {cr.baseRole === Role.MANAGER ? "Quản lý" : "Nhân viên"} • {cr.permissions.length} quyền
                                            </span>
                                        </div>
                                        {cr.description && (
                                            <p className="text-xs text-[#4B5563]">
                                                {cr.description}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {APP_PERMISSIONS.filter((p) =>
                                                cr.permissions.includes(p.key),
                                            )
                                                .slice(0, 6)
                                                .map((p) => (
                                                    <span
                                                        key={p.key}
                                                        className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2 py-0.5 text-[11px] font-medium text-[#111827]"
                                                    >
                                                        <span className="text-[#166534] font-bold">✓</span>
                                                        {p.label}
                                                    </span>
                                                ))}
                                            {cr.permissions.length > 6 && (
                                                <span className="inline-flex items-center rounded-md bg-[#E8F0EC] px-2 py-0.5 text-[11px] font-semibold text-[#1B3B2B]">
                                                    +{cr.permissions.length - 6} quyền khác
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-3">
                                        <button
                                            type="button"
                                            onClick={() => openEditCustomRole(cr)}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#111827] hover:bg-[#E8F0EC] cursor-pointer"
                                        >
                                            <span>Sửa bảng tích &amp; Tên</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={savingCustom}
                                            onClick={() => handleDeleteCustomRole(cr.id, cr.name)}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-[#B91C1C] hover:bg-red-100 cursor-pointer disabled:opacity-40"
                                        >
                                            <span>Xóa</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Form Builder: Đặt tên phân quyền & Tích chọn ô trống */}
                    {showRoleBuilder && (
                        <div className="rounded-xl border-2 border-[#1B3B2B] bg-white p-5 space-y-5">
                            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                                <div>
                                    <h3 className="text-base font-bold font-serif text-[#111827]">
                                        {editingRoleId
                                            ? "Chỉnh sửa tên phân quyền & Bảng tích quyền hạn"
                                            : "Tạo tên phân quyền mới theo bảng tích chọn"}
                                    </h3>
                                    <p className="text-xs text-[#4B5563]">
                                        Nhập tên gọi phân quyền và tích vào các ô trống bên dưới để cấp đúng chức năng mong muốn.
                                    </p>
                                </div>
                                <span className="inline-flex items-center rounded-md bg-[#E8F0EC] px-2.5 py-1 text-xs font-bold text-[#1B3B2B]">
                                    Đã tích: {customPerms.size}/{APP_PERMISSIONS.length} quyền
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="custom-role-name"
                                        className="text-sm font-semibold text-[#111827]"
                                    >
                                        Tên phân quyền (Chủ hồ tự đặt) *
                                    </label>
                                    <input
                                        id="custom-role-name"
                                        type="text"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        placeholder="VD: Thu ngân ca sáng, Nhân viên cân cá…"
                                        className="h-12 w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-sm font-medium text-[#111827] focus:border-[#1B3B2B] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="custom-role-base"
                                        className="text-sm font-semibold text-[#111827]"
                                    >
                                        Nhóm cấp quyền gốc *
                                    </label>
                                    <select
                                        id="custom-role-base"
                                        value={customBaseRole}
                                        onChange={(e) => {
                                            const nextRole =
                                                e.target.value === Role.MANAGER
                                                    ? Role.MANAGER
                                                    : Role.STAFF;
                                            setCustomBaseRole(nextRole);
                                        }}
                                        className="h-12 w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-sm font-medium text-[#111827] focus:border-[#1B3B2B] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                                    >
                                        <option value={Role.STAFF}>
                                            Cấp Nhân viên (STAFF)
                                        </option>
                                        <option value={Role.MANAGER}>
                                            Cấp Quản lý (MANAGER)
                                        </option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="custom-role-desc"
                                        className="text-sm font-semibold text-[#111827]"
                                    >
                                        Mô tả nhiệm vụ (Tùy chọn)
                                    </label>
                                    <input
                                        id="custom-role-desc"
                                        type="text"
                                        value={customDescription}
                                        onChange={(e) => setCustomDescription(e.target.value)}
                                        placeholder="VD: Chuyên thu tiền vé và bán nước ca ngày"
                                        className="h-12 w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-sm font-medium text-[#111827] focus:border-[#1B3B2B] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs font-semibold text-[#4B5563]">
                                    Tích nhanh:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCustomPerms(new Set(staffPerms))}
                                    className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-[#F8FAF8] px-2.5 text-xs font-semibold text-[#111827] hover:bg-[#E8F0EC] cursor-pointer"
                                >
                                    Theo bảng Nhân viên ({staffPerms.size})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomPerms(new Set(managerPerms))}
                                    className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-[#F8FAF8] px-2.5 text-xs font-semibold text-[#111827] hover:bg-[#E8F0EC] cursor-pointer"
                                >
                                    Theo bảng Quản lý ({managerPerms.size})
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCustomPerms(
                                            new Set(APP_PERMISSIONS.map((p) => p.key)),
                                        )
                                    }
                                    className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-[#F8FAF8] px-2.5 text-xs font-semibold text-[#1B3B2B] hover:bg-[#E8F0EC] cursor-pointer"
                                >
                                    Tích chọn tất cả
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomPerms(new Set())}
                                    className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#4B5563] hover:bg-[#F8FAF8] cursor-pointer"
                                >
                                    Bỏ tích hết
                                </button>
                            </div>

                            {/* Bảng tích vào ô trống liệt kê các quyền có sẵn */}
                            <div className="space-y-4">
                                {PERMISSION_CATEGORIES.map((cat) => {
                                    const items = APP_PERMISSIONS.filter(
                                        (p) => p.category === cat.key,
                                    );
                                    return (
                                        <div
                                            key={cat.key}
                                            className="rounded-xl border border-[#E5E7EB] overflow-hidden"
                                        >
                                            <div className="bg-[#F8FAF8] px-4 py-2.5 border-b border-[#E5E7EB]">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B3B2B]">
                                                    {cat.title}
                                                </h4>
                                            </div>
                                            <div className="divide-y divide-[#E5E7EB] bg-white">
                                                {items.map((perm) => {
                                                    const checked = customPerms.has(perm.key);
                                                    return (
                                                        <label
                                                            key={perm.key}
                                                            htmlFor={`custom-perm-${perm.key}`}
                                                            className={`flex items-start gap-3.5 px-4 py-3 cursor-pointer transition-colors ${
                                                                checked
                                                                    ? "bg-[#E8F0EC]/45"
                                                                    : "hover:bg-[#F8FAF8]"
                                                            }`}
                                                        >
                                                            <input
                                                                id={`custom-perm-${perm.key}`}
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() =>
                                                                    toggleCustomPerm(perm.key)
                                                                }
                                                                className="mt-0.5 h-5 w-5 rounded border-[#E5E7EB] accent-[#1B3B2B] cursor-pointer shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-[#111827]">
                                                                    {perm.label}
                                                                </p>
                                                                <p className="text-xs text-[#4B5563]">
                                                                    {perm.description}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRoleBuilder(false);
                                        setEditingRoleId(null);
                                    }}
                                    className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827] hover:bg-[#F8FAF8] cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    disabled={savingCustom}
                                    onClick={handleSaveCustomRole}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1B3B2B] px-5 text-sm font-semibold text-white hover:bg-[#142d20] disabled:opacity-40 cursor-pointer"
                                >
                                    <span>
                                        {savingCustom
                                            ? "Đang lưu…"
                                            : "Lưu tên phân quyền này"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. BẢNG TÍCH CHỨC NĂNG & QUYỀN HẠN CỦA NHÂN VIÊN (STAFF) VÀ QUẢN LÝ (MANAGER) */}
            <section className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                <div className="border-b border-[#E5E7EB] bg-[#F8FAF8] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold font-serif text-[#111827]">
                            Bảng tích chức năng &amp; Quyền sử dụng của Nhân viên và Quản lý
                        </h2>
                        <p className="text-xs font-medium text-[#4B5563]">
                            Tích vào ô trống tương ứng để cấp hoặc thu hồi từng chức năng cho nhóm Nhân viên và Quản lý. Chủ hồ có thể đổi tên hiển thị của từng nhóm ngay tại đầu bảng.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            disabled={savingMatrix}
                            onClick={handleResetDefaultMatrix}
                            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-xs font-semibold text-[#111827] hover:bg-[#F8FAF8] disabled:opacity-40 cursor-pointer"
                        >
                            <span>↺ Mặc định</span>
                        </button>
                        <button
                            type="button"
                            disabled={savingMatrix}
                            onClick={handleSaveMatrix}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1B3B2B] px-4 text-sm font-semibold text-white hover:bg-[#142d20] disabled:opacity-40 cursor-pointer"
                        >
                            <span>
                                {savingMatrix ? "Đang lưu…" : "Lưu bảng phân quyền"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Chỉnh tên hiển thị 2 nhóm mặc định */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-4 bg-white border-b border-[#E5E7EB]">
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="staff-role-label"
                            className="text-xs font-bold uppercase tracking-wider text-[#4B5563]"
                        >
                            Tên gọi nhóm Nhân viên (STAFF)
                        </label>
                        <input
                            id="staff-role-label"
                            type="text"
                            value={staffRoleLabel}
                            onChange={(e) => setStaffRoleLabel(e.target.value)}
                            placeholder="Nhân viên (STAFF)"
                            className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F8FAF8] px-3.5 text-sm font-semibold text-[#111827] focus:border-[#1B3B2B] focus:bg-white focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="manager-role-label"
                            className="text-xs font-bold uppercase tracking-wider text-[#4B5563]"
                        >
                            Tên gọi nhóm Quản lý (MANAGER)
                        </label>
                        <input
                            id="manager-role-label"
                            type="text"
                            value={managerRoleLabel}
                            onChange={(e) => setManagerRoleLabel(e.target.value)}
                            placeholder="Quản lý (MANAGER)"
                            className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F8FAF8] px-3.5 text-sm font-semibold text-[#111827] focus:border-[#1B3B2B] focus:bg-white focus:outline-none"
                        />
                    </div>
                </div>

                {/* Bảng ma trận tích chọn */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#F8FAF8] text-xs font-bold uppercase tracking-wider text-[#111827]">
                                <th className="px-5 py-3.5 min-w-[240px]">
                                    Chức năng &amp; Nghiệp vụ trên App
                                </th>
                                <th className="px-4 py-3.5 text-center w-36">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[#111827]">{staffRoleLabel}</span>
                                        <span className="text-[11px] font-medium text-[#4B5563] normal-case">
                                            ({staffPerms.size}/{APP_PERMISSIONS.length} quyền)
                                        </span>
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 text-center w-36">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[#1B3B2B]">{managerRoleLabel}</span>
                                        <span className="text-[11px] font-medium text-[#4B5563] normal-case">
                                            ({managerPerms.size}/{APP_PERMISSIONS.length} quyền)
                                        </span>
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 text-center w-32 bg-[#E8F0EC]/40">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[#1B3B2B]">Chủ hồ (OWNER)</span>
                                        <span className="text-[11px] font-medium text-[#166534] normal-case">
                                            Toàn quyền
                                        </span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                            {PERMISSION_CATEGORIES.map((cat) => {
                                const items = APP_PERMISSIONS.filter(
                                    (p) => p.category === cat.key,
                                );
                                return (
                                    <FragmentCategoryRows
                                        key={cat.key}
                                        title={cat.title}
                                        subtitle={cat.subtitle}
                                        items={items}
                                        staffPerms={staffPerms}
                                        managerPerms={managerPerms}
                                        onToggleStaff={toggleStaffPerm}
                                        onToggleManager={toggleManagerPerm}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-[#E5E7EB] bg-[#F8FAF8] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-[#4B5563]">
                        Mẹo: Sau khi tích chọn các ô chức năng, bấm <strong>&ldquo;Lưu bảng phân quyền&rdquo;</strong> để áp dụng cho toàn bộ tài khoản thuộc nhóm tương ứng.
                    </p>
                    <button
                        type="button"
                        disabled={savingMatrix}
                        onClick={handleSaveMatrix}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1B3B2B] px-5 text-sm font-semibold text-white hover:bg-[#142d20] disabled:opacity-40 cursor-pointer shrink-0"
                    >
                        <span>
                            {savingMatrix ? "Đang lưu cấu hình…" : "Lưu bảng phân quyền"}
                        </span>
                    </button>
                </div>
            </section>
        </div>
    );
}

function FragmentCategoryRows({
    title,
    subtitle,
    items,
    staffPerms,
    managerPerms,
    onToggleStaff,
    onToggleManager,
}: {
    title: string;
    subtitle: string;
    items: typeof APP_PERMISSIONS;
    staffPerms: Set<AppPermissionKey>;
    managerPerms: Set<AppPermissionKey>;
    onToggleStaff: (key: AppPermissionKey) => void;
    onToggleManager: (key: AppPermissionKey) => void;
}) {
    return (
        <>
            <tr className="bg-[#F8FAF8]">
                <td colSpan={4} className="px-5 py-3">
                    <p className="text-sm font-bold font-serif text-[#1B3B2B]">{title}</p>
                    <p className="text-xs text-[#4B5563]">{subtitle}</p>
                </td>
            </tr>
            {items.map((perm) => {
                const isStaffChecked = staffPerms.has(perm.key);
                const isManagerChecked = managerPerms.has(perm.key);
                return (
                    <tr
                        key={perm.key}
                        className="bg-white hover:bg-[#F8FAF8] transition-colors"
                    >
                        <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-[#111827]">
                                {perm.label}
                            </p>
                            <p className="text-xs text-[#4B5563] mt-0.5">
                                {perm.description}
                            </p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                            <label
                                htmlFor={`matrix-staff-${perm.key}`}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#E8F0EC]/60 cursor-pointer"
                            >
                                <input
                                    id={`matrix-staff-${perm.key}`}
                                    type="checkbox"
                                    checked={isStaffChecked}
                                    onChange={() => onToggleStaff(perm.key)}
                                    aria-label={`Nhân viên - ${perm.label}`}
                                    className="h-5 w-5 rounded border-[#E5E7EB] accent-[#1B3B2B] cursor-pointer"
                                />
                            </label>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                            <label
                                htmlFor={`matrix-manager-${perm.key}`}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#E8F0EC]/60 cursor-pointer"
                            >
                                <input
                                    id={`matrix-manager-${perm.key}`}
                                    type="checkbox"
                                    checked={isManagerChecked}
                                    onChange={() => onToggleManager(perm.key)}
                                    aria-label={`Quản lý - ${perm.label}`}
                                    className="h-5 w-5 rounded border-[#E5E7EB] accent-[#1B3B2B] cursor-pointer"
                                />
                            </label>
                        </td>
                        <td className="px-4 py-3.5 text-center bg-[#E8F0EC]/25">
                            <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#E8F0EC] text-[#166534] font-bold text-sm"
                                title="Chủ hồ luôn có toàn quyền"
                            >
                                ✓
                            </span>
                        </td>
                    </tr>
                );
            })}
        </>
    );
}
