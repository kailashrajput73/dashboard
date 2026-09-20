import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";

export default function ImportProductsBatch() {
  return (
    <CatalogSpreadsheetImport
      kind="master"
      title="Import products (batch)"
      subtitle="Same columns as full import — for one sub-category or brand"
      showCategoryMode
      columnHelp="Use the same master columns as the full catalog import. Rows merge on product_code; new codes are added, existing codes update details only (not stock or prices)."
    />
  );
}
