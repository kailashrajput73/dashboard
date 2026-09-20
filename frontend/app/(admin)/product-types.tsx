import React, { useCallback } from "react";
import { CatalogFacetPage } from "@/src/features/catalog-taxonomy/CatalogFacetPage";

export default function AdminProductTypes() {
  const valueOf = useCallback((item: { type?: string }) => item.type, []);
  return (
    <CatalogFacetPage
      title="Product type"
      searchPlaceholder="Search product types"
      emptyText="No product types yet. Import a sheet with a Type column (CPVC, PVC, UPVC)."
      valueOf={valueOf}
      purgeField="type"
      testID="product-type"
    />
  );
}
