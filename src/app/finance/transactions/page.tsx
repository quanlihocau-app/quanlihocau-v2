import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { TransactionsView } from "./transactions-view";

export default async function TransactionsPage() {
    const tenant = await getTenantContext();
    if (!tenant) {
        redirect("/login");
    }

    return (
        <TransactionsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
