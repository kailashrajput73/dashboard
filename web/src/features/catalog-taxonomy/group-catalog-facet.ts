import type { CatalogItem } from "../../api/endpoints";
import { inferProductClass } from "../../utils/infer-product-class";

export type CatalogFacet = { id: string; name: string; count: number };

export function groupCatalogFacet(
  products: CatalogItem[],
  valueOf: (item: CatalogItem) => string | undefined,
): CatalogFacet[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const item of products) {
    const raw = (valueOf(item) || inferProductClass(item) || "").trim();
    if (!raw) continue;
    const id = raw.toLowerCase();
    const current = map.get(id);
    if (current) {
      current.count += 1;
    } else {
      map.set(id, { name: raw, count: 1 });
    }
  }
  return [...map.entries()]
    .map(([id, row]) => ({ id, name: row.name, count: row.count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}