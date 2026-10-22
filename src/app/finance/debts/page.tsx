import { requireFinancePage } from "@/lib/finance-page";
import { DebtsView } from "./debts-view";

export default async function DebtsPage() {
    const tenant = await requireFinancePage();

    return (
        <DebtsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
