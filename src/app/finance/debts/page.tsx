import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { DebtsView } from "./debts-view";

export default async function DebtsPage() {
    const tenant = await getTenantContext();
    if (!tenant) {
        redirect("/login");
    }

    return (
        <DebtsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
