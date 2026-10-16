import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { FinancialReportsView } from "./reports-view";

export default async function FinancialReportsPage() {
    const tenant = await getTenantContext();
    if (!tenant) {
        redirect("/login");
    }

    return (
        <FinancialReportsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
