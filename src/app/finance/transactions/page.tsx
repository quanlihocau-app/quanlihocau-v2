import { requireFinancePage } from "@/lib/finance-page";
import { TransactionsView } from "./transactions-view";

export default async function TransactionsPage() {
    const tenant = await requireFinancePage();

    return (
        <TransactionsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
