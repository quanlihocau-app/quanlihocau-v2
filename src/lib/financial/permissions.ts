import { Role, SystemRole } from "@/generated/prisma/client";
import { ForbiddenError, TenantContext } from "@/lib/tenant";

export const FINANCE_ROLES: Role[] = [Role.OWNER, Role.MANAGER];

export type FinancialPermission =
    | "FINANCIAL_VIEW_TRANSACTIONS"   // Xem danh sách phiếu thu/chi
    | "FINANCIAL_CREATE_TRANSACTIONS" // Tạo phiếu thu/chi mới
    | "FINANCIAL_EDIT_DRAFT"          // Sửa phiếu ở trạng thái nháp (DRAFT)
    | "FINANCIAL_APPROVE_TRANSACTIONS"// Duyệt phiếu chi/thu
    | "FINANCIAL_CANCEL_TRANSACTIONS" // Hủy/Hoàn phiếu
    | "FINANCIAL_VIEW_REPORTS"        // Xem báo cáo doanh thu, chi phí, KQKD, dòng tiền
    | "FINANCIAL_EXPORT_REPORTS"      // Xuất Excel, CSV, PDF báo cáo
    | "FINANCIAL_VIEW_FUNDS"          // Xem số dư sổ quỹ tiền mặt, tài khoản ngân hàng
    | "FINANCIAL_MANAGE_FUNDS"        // Tạo/sửa tài khoản quỹ
    | "FINANCIAL_TRANSFER_FUNDS"      // Chuyển quỹ nội bộ giữa các tài khoản
    | "FINANCIAL_MANAGE_CATEGORIES"   // Quản lý danh mục thu chi
    | "FINANCIAL_LOCK_PERIOD"         // Khóa / mở kỳ tài chính
    | "FINANCIAL_RECONCILE"           // Kiểm kê, đối soát chênh lệch quỹ
    | "FINANCIAL_MANAGE_DEBT";        // Quản lý và thu/trả công nợ

const ROLE_PERMISSIONS: Record<Role, readonly FinancialPermission[]> = {
    [Role.OWNER]: [
        "FINANCIAL_VIEW_TRANSACTIONS",
        "FINANCIAL_CREATE_TRANSACTIONS",
        "FINANCIAL_EDIT_DRAFT",
        "FINANCIAL_APPROVE_TRANSACTIONS",
        "FINANCIAL_CANCEL_TRANSACTIONS",
        "FINANCIAL_VIEW_REPORTS",
        "FINANCIAL_EXPORT_REPORTS",
        "FINANCIAL_VIEW_FUNDS",
        "FINANCIAL_MANAGE_FUNDS",
        "FINANCIAL_TRANSFER_FUNDS",
        "FINANCIAL_MANAGE_CATEGORIES",
        "FINANCIAL_LOCK_PERIOD",
        "FINANCIAL_RECONCILE",
        "FINANCIAL_MANAGE_DEBT",
    ],
    [Role.MANAGER]: [
        "FINANCIAL_VIEW_TRANSACTIONS",
        "FINANCIAL_CREATE_TRANSACTIONS",
        "FINANCIAL_EDIT_DRAFT",
        "FINANCIAL_APPROVE_TRANSACTIONS",
        "FINANCIAL_VIEW_REPORTS",
        "FINANCIAL_EXPORT_REPORTS",
        "FINANCIAL_VIEW_FUNDS",
        "FINANCIAL_TRANSFER_FUNDS",
        "FINANCIAL_MANAGE_CATEGORIES",
        "FINANCIAL_RECONCILE",
        "FINANCIAL_MANAGE_DEBT",
    ],
    [Role.STAFF]: [],
};

const PERMISSION_DESCRIPTIONS: Record<FinancialPermission, string> = {
    FINANCIAL_VIEW_TRANSACTIONS: "Xem danh sách phiếu thu chi",
    FINANCIAL_CREATE_TRANSACTIONS: "Tạo phiếu thu chi",
    FINANCIAL_EDIT_DRAFT: "Chỉnh sửa phiếu nháp",
    FINANCIAL_APPROVE_TRANSACTIONS: "Phê duyệt phiếu tài chính",
    FINANCIAL_CANCEL_TRANSACTIONS: "Hủy phiếu giao dịch",
    FINANCIAL_VIEW_REPORTS: "Xem báo cáo tài chính",
    FINANCIAL_EXPORT_REPORTS: "Xuất dữ liệu báo cáo",
    FINANCIAL_VIEW_FUNDS: "Xem số dư quỹ tiền",
    FINANCIAL_MANAGE_FUNDS: "Quản lý danh sách quỹ tài khoản",
    FINANCIAL_TRANSFER_FUNDS: "Chuyển tiền giữa các quỹ",
    FINANCIAL_MANAGE_CATEGORIES: "Quản lý danh mục thu chi",
    FINANCIAL_LOCK_PERIOD: "Khóa hoặc mở kỳ tài chính",
    FINANCIAL_RECONCILE: "Kiểm kê và đối soát quỹ",
    FINANCIAL_MANAGE_DEBT: "Quản lý sổ công nợ",
};

/**
 * Kiểm tra xem role của user có quyền thực hiện hành động tài chính không
 */
export function hasFinancialPermission(
    role: Role | SystemRole | string,
    permission: FinancialPermission,
): boolean {
    if (role === "SUPER_ADMIN") {
        return true;
    }
    const permissions = ROLE_PERMISSIONS[role as Role];
    if (!permissions) {
        return false;
    }
    return permissions.includes(permission);
}

/**
 * Bắt buộc kiểm tra quyền tài chính, ném ra ForbiddenError nếu không đủ quyền
 */
export function assertFinancialPermission(
    context: Pick<TenantContext, "role"> & { isSupportMode?: boolean },
    permission: FinancialPermission,
): void {
    if (context.isSupportMode) {
        return; // Super admin support impersonation mode
    }
    if (!hasFinancialPermission(context.role, permission)) {
        const actionName = PERMISSION_DESCRIPTIONS[permission] || permission;
        throw new ForbiddenError(
            `Bạn không có quyền thực hiện hành động: "${actionName}". Vui lòng liên hệ Chủ hồ hoặc Quản lý.`,
        );
    }
}
