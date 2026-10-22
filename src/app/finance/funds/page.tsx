import { requireFinancePage } from "@/lib/finance-page";
import { FundsView } from "./funds-view";

export default async function FundsPage() {
    const tenant = await requireFinancePage();

    return (
        <FundsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
