import { Role } from "@/generated/prisma/enums";

export type AppPermissionKey =
    | "SESSION_OPEN_CLOSE"
    | "SESSION_EXTEND_TRANSFER"
    | "SESSION_EDIT_START_TIME"
    | "RETAIL_ORDER"
    | "FISH_BUYBACK_CREATE"
    | "INVOICE_COLLECT_PAYMENT"
    | "INVOICE_EDIT_LINES"
    | "INVOICE_VOID_REVERSE"
    | "SHIFT_REPORT_VIEW"
    | "SHIFT_CLOSE"
    | "EXPENSE_CREATE"
    | "FINANCE_VIEW_CASHBOOK"
    | "FINANCE_APPROVE_TRANSACTIONS"
    | "FINANCE_MANAGE_DEBT"
    | "INVENTORY_ADJUST"
    | "CATALOG_MANAGE"
    | "CUSTOMER_MANAGE"
    | "REPORTS_VIEW_ANALYTICS"
    | "AUDIT_LOG_VIEW";

export type PermissionCategoryKey =
    | "OPERATIONS"
    | "BILLING_SHIFT"
    | "FINANCE"
    | "CATALOG_REPORTS";

export interface PermissionDefinition {
    key: AppPermissionKey;
    category: PermissionCategoryKey;
    label: string;
    description: string;
    defaultStaff: boolean;
    defaultManager: boolean;
}

export const PERMISSION_CATEGORIES: Array<{
    key: PermissionCategoryKey;
    title: string;
    subtitle: string;
}> = [
    {
        key: "OPERATIONS",
        title: "1. Vận hành phiên câu & Bán hàng tại hồ",
        subtitle: "Các thao tác mở vé, chuyển chòi, bán nước/mồi và cân cá thu mua lại.",
    },
    {
        key: "BILLING_SHIFT",
        title: "2. Hóa đơn, Thu ngân & Chốt ca hằng ngày",
        subtitle: "Quyền thu tiền, chỉnh sửa hóa đơn, in phiếu nhiệt và bàn giao tiền mặt cuối ca.",
    },
    {
        key: "FINANCE",
        title: "3. Thu chi, Sổ quỹ & Công nợ",
        subtitle: "Ghi nhận phiếu chi vận hành, theo dõi két tiền mặt/ngân hàng và quản lý công nợ.",
    },
    {
        key: "CATALOG_REPORTS",
        title: "4. Kho hàng, Danh mục & Báo cáo quản trị",
        subtitle: "Quản lý tồn kho, bảng giá gói câu/dịch vụ, báo cáo tổng hợp và nhật ký chống gian lận.",
    },
];

export const APP_PERMISSIONS: readonly PermissionDefinition[] = [
    // 1. OPERATIONS
    {
        key: "SESSION_OPEN_CLOSE",
        category: "OPERATIONS",
        label: "Mở vé mới & Kết thúc phiên câu",
        description: "Tạo phiên câu mới, gán ô/chòi và kết thúc phiên khi khách nghỉ câu.",
        defaultStaff: true,
        defaultManager: true,
    },
    {
        key: "SESSION_EXTEND_TRANSFER",
        category: "OPERATIONS",
        label: "Gia hạn giờ câu & Đổi chòi câu",
        description: "Mua thêm giờ câu hoặc chuyển khách sang ô/chòi khác đang trống.",
        defaultStaff: true,
        defaultManager: true,
    },
    {
        key: "SESSION_EDIT_START_TIME",
        category: "OPERATIONS",
        label: "Chỉnh lùi giờ vào câu thực tế",
        description: "Cho phép nhập giờ vào câu sớm hơn thời điểm bấm tạo vé trên máy.",
        defaultStaff: false,
        defaultManager: true,
    },
    {
        key: "RETAIL_ORDER",
        category: "OPERATIONS",
        label: "Bán lẻ dịch vụ (Nước uống, mồi, đồ ăn)",
        description: "Tạo đơn bán lẻ trực tiếp không cần mở phiên câu và thu tiền ngay.",
        defaultStaff: true,
        defaultManager: true,
    },
    {
        key: "FISH_BUYBACK_CREATE",
        category: "OPERATIONS",
        label: "Cân cá & Ghi phiếu thu mua cá",
        description: "Ghi nhận số kg cá thu mua lại từ cần thủ để trừ vào hóa đơn hoặc chi tiền.",
        defaultStaff: true,
        defaultManager: true,
    },

    // 2. BILLING_SHIFT
    {
        key: "INVOICE_COLLECT_PAYMENT",
        category: "BILLING_SHIFT",
        label: "Thu tiền mặt / Chuyển khoản & In vé",
        description: "Xác nhận thanh toán hóa đơn vé câu, bán lẻ và phát lệnh in máy in nhiệt.",
        defaultStaff: true,
        defaultManager: true,
    },
    {
        key: "INVOICE_EDIT_LINES",
        category: "BILLING_SHIFT",
        label: "Thêm / Xóa món dịch vụ trong hóa đơn",
        description: "Cập nhật danh sách dịch vụ phát sinh của khách trước khi tất toán.",
        defaultStaff: true,
        defaultManager: true,
    },
    {
        key: "INVOICE_VOID_REVERSE",
        category: "BILLING_SHIFT",
        label: "Hủy hóa đơn (Void) & Đảo bút toán thu",
        description: "Thao tác nhạy cảm: hủy hóa đơn đã phát hành hoặc hoàn trả thanh toán.",
        defaultStaff: false,
        defaultManager: false,
    },
    {
        key: "SHIFT_REPORT_VIEW",
        category: "BILLING_SHIFT",
        label: "Xem số liệu ca trực hiện tại",
        description: "Theo dõi doanh thu ca, tiền mặt trong két và bảng đối soát theo nhân viên.",
        defaultStaff: true,
        defaultManager: true,
    },
    {
        key: "SHIFT_CLOSE",
        category: "BILLING_SHIFT",
        label: "Chốt ca hằng ngày & Bàn giao két tiền",
        description: "Thực hiện kiểm đếm tiền thực tế, giải trình chênh lệch và khóa sổ ca trực.",
        defaultStaff: false,
        defaultManager: true,
    },

    // 3. FINANCE
    {
        key: "EXPENSE_CREATE",
        category: "FINANCE",
        label: "Lập phiếu chi phí vận hành tại hồ",
        description: "Ghi nhận các khoản chi mua đá, mồi, sửa chữa nhỏ hoặc chi phí phát sinh.",
        defaultStaff: true,
        defaultManager: true,
    },
    {
        key: "FINANCE_VIEW_CASHBOOK",
        category: "FINANCE",
        label: "Xem sổ quỹ tiền mặt & Ngân hàng",
        description: "Tra cứu lịch sử dòng tiền vào/ra và số dư các quỹ tài chính.",
        defaultStaff: false,
        defaultManager: true,
    },
    {
        key: "FINANCE_APPROVE_TRANSACTIONS",
        category: "FINANCE",
        label: "Duyệt phiếu thu/chi & Kiểm kê quỹ",
        description: "Phê duyệt các phiếu nháp, chuyển tiền nội bộ giữa các quỹ và đối soát.",
        defaultStaff: false,
        defaultManager: true,
    },
    {
        key: "FINANCE_MANAGE_DEBT",
        category: "FINANCE",
        label: "Quản lý sổ công nợ (Khách nợ / Nợ NCC)",
        description: "Theo dõi khoản khách câu nợ lại hoặc công nợ nhập cá, nhập hàng.",
        defaultStaff: false,
        defaultManager: true,
    },

    // 4. CATALOG_REPORTS
    {
        key: "INVENTORY_ADJUST",
        category: "CATALOG_REPORTS",
        label: "Nhập kho & Điều chỉnh tồn kho dịch vụ",
        description: "Cập nhật số lượng nhập hàng, xuất hủy hoặc kiểm kê kho nước ngọt, mồi câu.",
        defaultStaff: false,
        defaultManager: true,
    },
    {
        key: "CATALOG_MANAGE",
        category: "CATALOG_REPORTS",
        label: "Cấu hình Chòi câu, Gói câu & Bảng giá",
        description: "Thêm mới, sửa giá gói câu, khu vực chòi, mặt hàng dịch vụ và đơn giá thu mua cá.",
        defaultStaff: false,
        defaultManager: true,
    },
    {
        key: "CUSTOMER_MANAGE",
        category: "CATALOG_REPORTS",
        label: "Quản lý danh bạ khách hàng",
        description: "Thêm, cập nhật thông tin và xem lịch sử câu của khách hàng thân thiết.",
        defaultStaff: false,
        defaultManager: true,
    },
    {
        key: "REPORTS_VIEW_ANALYTICS",
        category: "CATALOG_REPORTS",
        label: "Xem báo cáo tổng hợp & Xuất file Excel",
        description: "Xem biểu đồ doanh thu theo tuần/tháng, cơ cấu lợi nhuận và tải báo cáo.",
        defaultStaff: false,
        defaultManager: true,
    },
    {
        key: "AUDIT_LOG_VIEW",
        category: "CATALOG_REPORTS",
        label: "Xem nhật ký hoạt động chống gian lận",
        description: "Tra cứu chi tiết lịch sử ai đã tạo vé, sửa món, thu tiền theo từng giây.",
        defaultStaff: false,
        defaultManager: true,
    },
] as const;

export const ALL_PERMISSION_KEYS: AppPermissionKey[] = APP_PERMISSIONS.map((p) => p.key);

export const DEFAULT_STAFF_PERMISSIONS: AppPermissionKey[] = APP_PERMISSIONS
    .filter((p) => p.defaultStaff)
    .map((p) => p.key);

export const DEFAULT_MANAGER_PERMISSIONS: AppPermissionKey[] = APP_PERMISSIONS
    .filter((p) => p.defaultManager)
    .map((p) => p.key);

export interface CustomRoleProfile {
    id: string;
    name: string;
    baseRole: typeof Role.STAFF | typeof Role.MANAGER;
    description?: string;
    permissions: AppPermissionKey[];
    updatedAt: string;
}

export interface LakeRolePermissionsConfig {
    staffRoleLabel: string;
    managerRoleLabel: string;
    staffPermissions: AppPermissionKey[];
    managerPermissions: AppPermissionKey[];
    customRoles: CustomRoleProfile[];
    /** Map từ membershipId sang customRoleId (nếu nhân sự được gán tên phân quyền riêng) */
    memberCustomRoleMap: Record<string, string>;
    updatedAt: string | null;
    updatedBy: string | null;
}

export function getDefaultLakeRolePermissionsConfig(): LakeRolePermissionsConfig {
    return {
        staffRoleLabel: "Nhân viên (STAFF)",
        managerRoleLabel: "Quản lý (MANAGER)",
        staffPermissions: [...DEFAULT_STAFF_PERMISSIONS],
        managerPermissions: [...DEFAULT_MANAGER_PERMISSIONS],
        customRoles: [],
        memberCustomRoleMap: {},
        updatedAt: null,
        updatedBy: null,
    };
}

export function sanitizePermissionKeys(input: unknown, fallback: AppPermissionKey[]): AppPermissionKey[] {
    if (!Array.isArray(input)) return [...fallback];
    const validSet = new Set<string>(ALL_PERMISSION_KEYS);
    const unique = new Set<AppPermissionKey>();
    for (const item of input) {
        if (typeof item === "string" && validSet.has(item)) {
            unique.add(item as AppPermissionKey);
        }
    }
    return Array.from(unique);
}

export function parseLakeRolePermissionsPayload(rawPayload: string | null | undefined): LakeRolePermissionsConfig {
    const defaults = getDefaultLakeRolePermissionsConfig();
    if (!rawPayload) return defaults;
    try {
        const parsed = JSON.parse(rawPayload) as Record<string, unknown>;
        const staffRoleLabel =
            typeof parsed.staffRoleLabel === "string" && parsed.staffRoleLabel.trim().length > 0
                ? parsed.staffRoleLabel.trim().slice(0, 60)
                : defaults.staffRoleLabel;
        const managerRoleLabel =
            typeof parsed.managerRoleLabel === "string" && parsed.managerRoleLabel.trim().length > 0
                ? parsed.managerRoleLabel.trim().slice(0, 60)
                : defaults.managerRoleLabel;
        const staffPermissions = sanitizePermissionKeys(parsed.staffPermissions, defaults.staffPermissions);
        const managerPermissions = sanitizePermissionKeys(parsed.managerPermissions, defaults.managerPermissions);

        const customRoles: CustomRoleProfile[] = [];
        if (Array.isArray(parsed.customRoles)) {
            for (const item of parsed.customRoles) {
                if (typeof item !== "object" || item === null) continue;
                const rec = item as Record<string, unknown>;
                const id = typeof rec.id === "string" ? rec.id.trim() : "";
                const name = typeof rec.name === "string" ? rec.name.trim().slice(0, 60) : "";
                const baseRole = rec.baseRole === Role.MANAGER ? Role.MANAGER : Role.STAFF;
                if (!id || !name) continue;
                customRoles.push({
                    id,
                    name,
                    baseRole,
                    description: typeof rec.description === "string" ? rec.description.trim().slice(0, 200) : undefined,
                    permissions: sanitizePermissionKeys(
                        rec.permissions,
                        baseRole === Role.MANAGER ? managerPermissions : staffPermissions,
                    ),
                    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : new Date().toISOString(),
                });
            }
        }

        const memberCustomRoleMap: Record<string, string> = {};
        if (typeof parsed.memberCustomRoleMap === "object" && parsed.memberCustomRoleMap !== null) {
            const validCustomIds = new Set(customRoles.map((r) => r.id));
            for (const [mId, cId] of Object.entries(parsed.memberCustomRoleMap as Record<string, unknown>)) {
                if (typeof cId === "string" && validCustomIds.has(cId)) {
                    memberCustomRoleMap[mId] = cId;
                }
            }
        }

        return {
            staffRoleLabel,
            managerRoleLabel,
            staffPermissions,
            managerPermissions,
            customRoles,
            memberCustomRoleMap,
            updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
            updatedBy: typeof parsed.updatedBy === "string" ? parsed.updatedBy : null,
        };
    } catch {
        return defaults;
    }
}

export function resolveMemberEffectivePermissions(
    config: LakeRolePermissionsConfig,
    membershipId: string,
    role: Role,
): {
    displayRoleName: string;
    customRole: CustomRoleProfile | null;
    permissions: AppPermissionKey[];
} {
    if (role === Role.OWNER) {
        return {
            displayRoleName: "Chủ sở hữu (OWNER)",
            customRole: null,
            permissions: [...ALL_PERMISSION_KEYS],
        };
    }

    const customRoleId = config.memberCustomRoleMap[membershipId];
    if (customRoleId) {
        const found = config.customRoles.find((r) => r.id === customRoleId);
        if (found) {
            return {
                displayRoleName: found.name,
                customRole: found,
                permissions: found.permissions,
            };
        }
    }

    if (role === Role.MANAGER) {
        return {
            displayRoleName: config.managerRoleLabel,
            customRole: null,
            permissions: config.managerPermissions,
        };
    }

    return {
        displayRoleName: config.staffRoleLabel,
        customRole: null,
        permissions: config.staffPermissions,
    };
}
