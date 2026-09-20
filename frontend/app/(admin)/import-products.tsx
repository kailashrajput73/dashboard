import React from "react";
import { CatalogSpreadsheetImport } from "@/src/features/catalog-import/CatalogSpreadsheetImport";

export default function ImportProducts() {
  return (
    <CatalogSpreadsheetImport
      kind="master"
      title="Import products (full catalog)"
      subtitle="Merge by product_code — existing items keep stock and prices"
      showCategoryMode
      columnHelp="Category, Type, Sub-Category, Class, Brand, Product Name, product_code, Product_group, Length, Size (cm), unit (optional, default pcs), Image_url. Do not include MRP, discount, selling price, or stock on this sheet."
    />
  );
}
