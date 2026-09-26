import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";
import { STOCK_TEMPLATE_HEADERS } from "@/src/utils/import-templates";

export default function ImportStock() {
  return (
    <CatalogSpreadsheetImport
      kind="stock"
      title="Import stock quantities"
      subtitle="Sets on-hand qty — use Purchases when goods arrive from supplier"
      columnHelp={`${STOCK_TEMPLATE_HEADERS.join(", ")} (stock_qty also accepted). Sets absolute on-hand count. For stock IN from supplier invoices, use Purchases → bulk CSV.`}
    />
  );
}
