import { requireFinancePage } from "@/lib/finance-page";
import { CategoriesView } from "./categories-view";

export default async function CategoriesPage() {
    const tenant = await requireFinancePage();

    return (
        <CategoriesView
            lakeId={tenant.lakeId}
            lakeName={tenant.lakeName}
        />
    );
}
