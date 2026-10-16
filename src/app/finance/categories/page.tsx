import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { CategoriesView } from "./categories-view";

export default async function CategoriesPage() {
    const tenant = await getTenantContext();
    if (!tenant) {
        redirect("/login");
    }

    return (
        <CategoriesView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
