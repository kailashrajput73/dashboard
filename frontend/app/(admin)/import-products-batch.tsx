import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";
import { MASTER_TEMPLATE_HEADERS } from "@/src/utils/import-templates";

const MASTER_COLUMNS = MASTER_TEMPLATE_HEADERS.join(", ");

export default function ImportProductsBatch() {
  return (
    <CatalogSpreadsheetImport
      kind="master"
      title="Import products (batch)"
      subtitle="Same client master format — one sub-category or brand at a time"
      columnHelp={`${MASTER_COLUMNS}. Same rules as full catalog import.`}
    />
  );
}
