import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";
import { MASTER_TEMPLATE_HEADERS } from "@/src/utils/import-templates";

const MASTER_COLUMNS = MASTER_TEMPLATE_HEADERS.join(", ");

export default function ImportProducts() {
  return (
    <CatalogSpreadsheetImport
      kind="master"
      title="Import products (full catalog)"
      subtitle="Client master sheet — merge by Product Code"
      showCategoryMode
      columnHelp={`${MASTER_COLUMNS}. Type = material (UPVC/CPVC/PVC). class = Sch 40 / SDR11. Sub-Category = subcategory line. ROL → reorder level (low stock). image_url optional. Re-import updates details; existing stock/prices unchanged — use Prices/Stock imports.`}
    />
  );
}
