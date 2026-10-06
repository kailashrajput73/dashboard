import { downloadCsv } from "./download-csv";

/** Final client master sheet (2026-09-30) — keep in sync with csv mappers + demo-notes/SHEET-FORMAT.md */
export const MASTER_TEMPLATE_HEADERS = [
  "Category",
  "Type",
  "Sub-Category",
  "class",
  "Brand",
  "Product Name",
  "Size (cm)",
  "Length",
  "Product Code",
  "HSN Code",
  "GST",
  "UoM",
  "MRP (Rs) per nos",
  "discount",
  "Selling Price",
  "Pack Size",
  "MRP Pkg",
  "ROL",
  "image_url",
];

export const PRICING_TEMPLATE_HEADERS = [
  "Product Code",
  "MRP (Rs) per nos",
  "discount",
  "Selling Price",
];

export const STOCK_TEMPLATE_HEADERS = ["Product Code", "qty"];

export const PURCHASE_TEMPLATE_HEADERS = [
  "productCode",
  "quantity",
  "listPrice",
  "purchaseDiscount",
  "rackId",
  "rackSlot",
];

export const SUBCATEGORY_TEMPLATE_HEADERS = ["name", "category"];

export type ImportTemplateKind = "master" | "pricing" | "stock" | "purchase" | "subcategory";

const FILE_NAMES: Record<ImportTemplateKind, string> = {
  master: "product-master-template.csv",
  pricing: "product-prices-template.csv",
  stock: "stock-qty-template.csv",
  purchase: "purchase-lines-template.csv",
  subcategory: "subcategories-template.csv",
};

const HEADERS: Record<ImportTemplateKind, string[]> = {
  master: MASTER_TEMPLATE_HEADERS,
  pricing: PRICING_TEMPLATE_HEADERS,
  stock: STOCK_TEMPLATE_HEADERS,
  purchase: PURCHASE_TEMPLATE_HEADERS,
  subcategory: SUBCATEGORY_TEMPLATE_HEADERS,
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildTemplateCsv(kind: ImportTemplateKind): string {
  const row = HEADERS[kind].map(escapeCsvCell).join(",");
  return `\uFEFF${row}\n`;
}

export function downloadImportTemplate(kind: ImportTemplateKind): void {
  const csv = buildTemplateCsv(kind);
  const fileName = FILE_NAMES[kind];
  downloadCsv(csv, fileName);
}

export function templateColumnSummary(kind: ImportTemplateKind): string {
  return HEADERS[kind].join(", ");
}
