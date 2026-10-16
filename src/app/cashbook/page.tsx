import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { CashbookView } from "@/app/expenses/cashbook/cashbook-view";

export default async function CashbookPage() {
    const tenant = await getTenantContext();
    if (!tenant) redirect("/login");
    return <CashbookView canWrite lakeName={tenant.lakeName} lakeId={tenant.lakeId} />;
}
