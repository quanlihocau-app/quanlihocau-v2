export const CASHBOOK_QUICK_CREATE_EVENT = "cashbook:quick-create";
export type CashbookQuickAction = "receipt" | "expense";

const OPERATING_PAGES = ["home", "dashboard", "sessions", "invoices", "reports", "expenses", "cashbook", "products", "inventory", "customers", "fish-buybacks", "fish-types", "facilities", "pricing", "settings", "activity"];

export function isQuickActionPage(pathname: string) {
    return OPERATING_PAGES.some(page => pathname === `/${page}` || pathname.startsWith(`/${page}/`));
}

export function isCashbookList(pathname: string) {
    return pathname === "/cashbook" || pathname === "/expenses/cashbook";
}

export function cashbookQuickAction(value: string | null): CashbookQuickAction | null {
    return value === "receipt" || value === "expense" ? value : null;
}
