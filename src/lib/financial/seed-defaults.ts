import { PrismaClient } from "@/generated/prisma/client";

export const DEFAULT_INCOME_CATEGORIES = [
    { name: "Thu tiền vé câu", code: "THU_VE", icon: "Ticket", color: "#10b981", displayOrder: 1 },
    { name: "Thu dịch vụ câu cá", code: "THU_DICH_VU", icon: "Fish", color: "#06b6d4", displayOrder: 2 },
    { name: "Thu bán mồi, phụ kiện", code: "THU_MOI_PK", icon: "ShoppingBag", color: "#3b82f6", displayOrder: 3 },
    { name: "Thu đồ ăn, nước uống", code: "THU_FNB", icon: "Coffee", color: "#f59e0b", displayOrder: 4 },
    { name: "Thu thuê cần, dụng cụ", code: "THU_THUE_CAN", icon: "Anchor", color: "#8b5cf6", displayOrder: 5 },
    { name: "Thu hồi công nợ khách", code: "THU_CONG_NO", icon: "CreditCard", color: "#ec4899", displayOrder: 6 },
    { name: "Thu tiền đặt cọc", code: "THU_DAT_COC", icon: "ShieldCheck", color: "#14b8a6", displayOrder: 7 },
    { name: "Thu khác", code: "THU_KHAC", icon: "PlusCircle", color: "#64748b", displayOrder: 8 },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
    { name: "Mua cá thả hồ", code: "CHI_MUA_CA", icon: "Fish", color: "#ef4444", displayOrder: 1 },
    { name: "Mua thức ăn cho cá", code: "CHI_THUC_AN", icon: "Package", color: "#f97316", displayOrder: 2 },
    { name: "Mua mồi câu, vật tư", code: "CHI_VAT_TU", icon: "ShoppingCart", color: "#eab308", displayOrder: 3 },
    { name: "Tiền điện, nước, Internet", code: "CHI_TIEN_ICH", icon: "Zap", color: "#84cc16", displayOrder: 4 },
    { name: "Lương và thưởng nhân viên", code: "CHI_LUONG", icon: "Users", color: "#06b6d4", displayOrder: 5 },
    { name: "Thuê mặt bằng hồ", code: "CHI_MAT_BANG", icon: "Home", color: "#6366f1", displayOrder: 6 },
    { name: "Sửa chữa, bảo trì chòi hồ", code: "CHI_SUA_CHUA", icon: "Wrench", color: "#a855f7", displayOrder: 7 },
    { name: "Mua sắm thiết bị, máy móc", code: "CHI_THIET_BI", icon: "Cpu", color: "#d946ef", displayOrder: 8 },
    { name: "Quảng cáo, marketing", code: "CHI_MARKETING", icon: "Megaphone", color: "#f43f5e", displayOrder: 9 },
    { name: "Thanh toán nhà cung cấp", code: "CHI_TRA_NCC", icon: "Truck", color: "#0ea5e9", displayOrder: 10 },
    { name: "Chi quản lý & vận hành khác", code: "CHI_QUAN_LY", icon: "Briefcase", color: "#64748b", displayOrder: 11 },
] as const;

export async function ensureDefaultFinancialData(
    db: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
    lakeId: string,
) {
    // 1. Kiểm tra và tạo danh mục thu mặc định
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
        await db.financialCategory.upsert({
            where: {
                lakeId_type_name: {
                    lakeId,
                    type: "IN",
                    name: cat.name,
                },
            },
            create: {
                lakeId,
                type: "IN",
                name: cat.name,
                code: cat.code,
                icon: cat.icon,
                color: cat.color,
                isSystem: true,
                isActive: true,
                displayOrder: cat.displayOrder,
            },
            update: {},
        });
    }

    // 2. Kiểm tra và tạo danh mục chi mặc định
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        await db.financialCategory.upsert({
            where: {
                lakeId_type_name: {
                    lakeId,
                    type: "OUT",
                    name: cat.name,
                },
            },
            create: {
                lakeId,
                type: "OUT",
                name: cat.name,
                code: cat.code,
                icon: cat.icon,
                color: cat.color,
                isSystem: true,
                isActive: true,
                displayOrder: cat.displayOrder,
            },
            update: {},
        });
    }

    // 3. Kiểm tra và tạo các quỹ mặc định
    const defaultAccounts = [
        { name: "Quỹ tiền mặt quầy", accountType: "CASH" as const, isDefault: true },
        { name: "Tài khoản ngân hàng", accountType: "BANK" as const, isDefault: false },
    ];

    for (const acc of defaultAccounts) {
        await db.financialAccount.upsert({
            where: {
                lakeId_name: {
                    lakeId,
                    name: acc.name,
                },
            },
            create: {
                lakeId,
                name: acc.name,
                accountType: acc.accountType,
                isDefault: acc.isDefault,
                isActive: true,
                initialBalanceVnd: 0,
                currentBalanceVnd: 0,
            },
            update: {},
        });
    }
}
