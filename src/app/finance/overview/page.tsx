import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { OverviewView } from "./overview-view";

export default async function FinanceOverviewPage() {
    const tenant = await getTenantContext();
    if (!tenant) {
        redirect("/login");
    }

    return (
        <OverviewView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
