import { requireFinancePage } from "@/lib/finance-page";
import { FinancialReportsView } from "./reports-view";

export default async function FinancialReportsPage() {
    const tenant = await requireFinancePage();

    return (
        <FinancialReportsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
