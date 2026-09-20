import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";

export default function ImportPrices() {
  return (
    <CatalogSpreadsheetImport
      kind="pricing"
      title="Import prices & discount"
      subtitle="Fortnightly rate updates — product_code required"
      columnHelp="product_code, MRP (Rs) per nos, Discount %, Selling price (optional — recalculated from MRP + discount when both are present). Empty discount keeps the current discount on that product."
    />
  );
}
