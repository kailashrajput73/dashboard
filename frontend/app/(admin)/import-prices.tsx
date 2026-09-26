import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";
import { PRICING_TEMPLATE_HEADERS } from "@/src/utils/import-templates";

export default function ImportPrices() {
  return (
    <CatalogSpreadsheetImport
      kind="pricing"
      title="Import prices & discount"
      subtitle="Fortnightly rate updates — Product Code required"
      columnHelp={`${PRICING_TEMPLATE_HEADERS.join(", ")}. You can also upload the full client master sheet — only price columns are used. Discount may be decimal (0.49 = 49%). Empty Selling Price is calculated from MRP + discount.`}
    />
  );
}
