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
      columnHelp={`${MASTER_COLUMNS}. Sub-Category = material (UPVC); Type = class (Sch 40). Image_url can be empty until you have URLs. Re-import updates details; existing stock and prices stay unless the product is new.`}
    />
  );
}
