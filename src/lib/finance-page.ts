import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { getTenantContext, type TenantContext } from "@/lib/tenant";

export async function requireFinancePage(): Promise<TenantContext> {
    const tenant = await getTenantContext();
    if (!tenant) {
        redirect("/login");
    }
    if (tenant.role === Role.STAFF) {
        redirect("/403");
    }
    return tenant;
}
