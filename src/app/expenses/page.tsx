import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { ExpenseManager } from "./expense-manager";

export default async function ExpensesPage() {
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

    const limit = 20;
    const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
            where: {
                lakeId: tenantContext.lakeId,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
        }),
        prisma.expense.count({
            where: {
                lakeId: tenantContext.lakeId,
            },
        }),
    ]);

    const canCreateExpense =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    return (
        <ExpenseManager
            initialExpenses={expenses.map((e) => ({
                id: e.id,
                description: e.description,
                amountVnd: e.amountVnd,
                createdAt: e.createdAt.toISOString(),
            }))}
            initialPagination={{
                page: 1,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            }}
            canCreateExpense={canCreateExpense}
            lakeName={tenantContext.lakeName}
        />
    );
}
