import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";

export default function ImportStock() {
  return (
    <CatalogSpreadsheetImport
      kind="stock"
      title="Import stock quantities"
      subtitle="Sets on-hand qty — use Purchases when goods arrive from supplier"
      columnHelp="product_code and qty (or stock_qty). Sets absolute on-hand count for each code. For stock IN from invoices, prefer Purchases → Bulk CSV instead."
    />
  );
}
