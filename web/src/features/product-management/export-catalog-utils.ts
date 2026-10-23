import { listCatalogPage, type CatalogItem, type CatalogListFilters } from "../../api/endpoints";
import { downloadCsv } from "../../utils/download-csv";
import { gstToPercent } from "../../utils/csv";
import { inferProductClass } from "../../utils/infer-product-class";
import { MASTER_TEMPLATE_HEADERS } from "../../utils/import-templates";

export type ExportScopeMode = "full" | "filtered" | "selected";

function cell(value: string | number | undefined) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function catalogItemsToMasterCsv(items: CatalogItem[]) {
  const header = MASTER_TEMPLATE_HEADERS.join(",");
  const rows = items.map((item) =>
    [
      item.category,
      item.type,
      item.subcategory,
      inferProductClass(item),
      item.brand,
      item.name,
      item.sizeCm ?? (item.sizeMm == null ? undefined : item.sizeMm / 10),
      item.length,
      item.productCode,
      item.hsnCode,
      gstToPercent(item.gstRate),
      item.unit,
      item.mrp,
      item.discount,
      item.sellingPrice ?? item.standardRate,
      item.stdPkg,
      item.mrpPkg,
      item.reorderLevel,
      item.imageUrl && /^https?:\/\//i.test(item.imageUrl) ? item.imageUrl : "",
    ]
      .map(cell)
      .join(","),
  );
  return `\uFEFF${[header, ...rows].join("\n")}`;
}

export function downloadMasterCatalogCsv(items: CatalogItem[], filename: string) {
  downloadCsv(catalogItemsToMasterCsv(items), filename);
}

export async function fetchAllCatalogMatching(params: {
  category?: string;
  search?: string;
  filters?: CatalogListFilters;
  sort?: string;
  limit?: number;
}): Promise<CatalogItem[]> {
  const limit = params.limit ?? 200;
  const first = await listCatalogPage({
    category: params.category,
    search: params.search,
    filters: params.filters,
    page: 1,
    limit,
    sort: params.sort ?? "updated_desc",
  });
  const all = [...(first.items || [])];
  const totalPages = first.totalPages || 1;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await listCatalogPage({
      category: params.category,
      search: params.search,
      filters: params.filters,
      page,
      limit,
      sort: params.sort ?? "updated_desc",
    });
    all.push(...(next.items || []));
  }
  return all;
}

export async function exportFullCatalogCsv() {
  const items = await fetchAllCatalogMatching({});
  downloadMasterCatalogCsv(items, "catalog-full.csv");
  return items.length;
}
