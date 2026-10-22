import { downloadCsv } from "./download-csv";

/** Final client master sheet (2026-09-30) — keep in sync with csv mappers + demo-notes/SHEET-FORMAT.md */
/** Pipes & fittings v1 — see migration-db/CATALOG-DESIGN-RULES.md */
export const PIPES_FITTINGS_TEMPLATE_HEADERS = [
  "Category",
  "Type",
  "Sub-Category",
  "class",
  "Brand",
  "HSN Code",
  "GST",
  "UoM",
  "product_family",
  "Product Name",
  "Size (mm,cm,in)",
  "Length",
  "product code",
  "MRP (Rs) per nos",
  "discount",
  "Selling Price",
  "Pack Size",
  "MRP Pkg",
  "ROL",
];

export const PIPES_FITTINGS_IMAGE_HEADERS = [
  "brand",
  "product_family",
  "type",
  "class",
  "image_url",
];

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

export type ImportTemplateKind =
  | "master"
  | "pricing"
  | "stock"
  | "purchase"
  | "subcategory"
  | "pipes_fittings"
  | "pipes_fittings_images";

const FILE_NAMES: Record<ImportTemplateKind, string> = {
  master: "product-master-template.csv",
  pricing: "product-prices-template.csv",
  stock: "stock-qty-template.csv",
  purchase: "purchase-lines-template.csv",
  subcategory: "subcategories-template.csv",
  pipes_fittings: "pipes-fittings-v1-template.csv",
  pipes_fittings_images: "pipes-fittings-images-template.csv",
};

const HEADERS: Record<ImportTemplateKind, string[]> = {
  master: MASTER_TEMPLATE_HEADERS,
  pricing: PRICING_TEMPLATE_HEADERS,
  stock: STOCK_TEMPLATE_HEADERS,
  purchase: PURCHASE_TEMPLATE_HEADERS,
  subcategory: SUBCATEGORY_TEMPLATE_HEADERS,
  pipes_fittings: PIPES_FITTINGS_TEMPLATE_HEADERS,
  pipes_fittings_images: PIPES_FITTINGS_IMAGE_HEADERS,
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

export function downloadCsvFromObjects(
  headers: string[],
  rows: Record<string, string>[],
  fileName: string,
): void {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h] ?? "")).join(",")),
  ];
  downloadCsv(`\uFEFF${lines.join("\n")}\n`, fileName);
}

export function templateColumnSummary(kind: ImportTemplateKind): string {
  return HEADERS[kind].join(", ");
}
