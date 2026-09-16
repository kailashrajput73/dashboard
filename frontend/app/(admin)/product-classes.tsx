import React, { useCallback } from "react";
import { CatalogFacetPage } from "@/src/features/catalog-taxonomy/CatalogFacetPage";

export default function AdminProductClasses() {
  const valueOf = useCallback((item: { productClass?: string }) => item.productClass, []);
  return (
    <CatalogFacetPage
      title="Product class"
      searchPlaceholder="Search product classes"
      emptyText="No product classes yet. Import a sheet with a Class column (SDR11, Sch 40)."
      valueOf={valueOf}
      testID="product-class"
    />
  );
}
