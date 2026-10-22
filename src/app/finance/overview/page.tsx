import { requireFinancePage } from "@/lib/finance-page";
import { OverviewView } from "./overview-view";

export default async function FinanceOverviewPage() {
    const tenant = await requireFinancePage();

    return (
        <OverviewView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
