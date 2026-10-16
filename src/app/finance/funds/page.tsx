import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { FundsView } from "./funds-view";

export default async function FundsPage() {
    const tenant = await getTenantContext();
    if (!tenant) {
        redirect("/login");
    }

    return (
        <FundsView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
