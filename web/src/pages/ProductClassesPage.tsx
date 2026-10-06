import { useCallback } from "react";
import type { CatalogItem } from "../api/endpoints";
import { CatalogFacetPage } from "../features/catalog-taxonomy/CatalogFacetPage";

export default function ProductClassesPage() {
  const valueOf = useCallback(
    (item: CatalogItem) => item.productClass,
    [],
  );
  return (
    <CatalogFacetPage
      title="Product class"
      searchPlaceholder="Search product classes"
      emptyText="No product classes yet. Import a sheet with a Class column (SDR11, Sch 40)."
      valueOf={valueOf}
      purgeField="productClass"
      testID="product-class"
    />
  );
}