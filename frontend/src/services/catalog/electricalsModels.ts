/**
 * Domain models for the "Electricals & Lights" mock catalog
 * (src/mocks/electricals_mock_data.json) — mirrors Flutter
 * `electricals_catalog_models.dart`.
 *
 * Hierarchy: Catalog -> Category (price-list sheet) -> Group (product family)
 * -> Product (one catalogue number).
 */

export interface ElectricalProduct {
  catalogueNo: string;
  productName: string;
  /** Short label that tells this product apart within its group (e.g. "32A R/F"). */
  variant: string;
  /** Sheet columns in display order (Amps, Poles, Volts, Size, ...). */
  specs: Record<string, string>;
  hsnCode: string | null;
  packingQty: number;
  unit: string;
  price: number;
}

export interface ElectricalGroup {
  name: string;
  products: ElectricalProduct[];
}

export interface ElectricalCategory {
  id: string;
  name: string;
  /** Fits the narrow mobile sidebar. */
  shortName: string;
  /** Flutter `appIcon` key, shown when `imageAsset` is empty. */
  icon: string;
  imageAsset: string;
  description: string;
  groups: ElectricalGroup[];
}

export interface ElectricalsCatalog {
  category: string;
  description: string;
  categories: ElectricalCategory[];
}

type Json = Record<string, unknown>;

const str = (v: unknown): string | null => (v == null ? null : String(v));
const list = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

/** `ElectricalsCatalog.fromJson` (same null/default handling as Flutter). */
export function electricalsCatalogFromJson(json: Json): ElectricalsCatalog {
  return {
    category: str(json.category) ?? '',
    description: str(json.description) ?? '',
    categories: list(json.categories).map((c) => ({
      id: str(c.id) ?? '',
      name: str(c.name) ?? '',
      shortName: str(c.shortName) ?? '',
      icon: str(c.icon) ?? 'bolt',
      imageAsset: str(c.imageAsset) ?? '',
      description: str(c.description) ?? '',
      groups: list(c.groups).map((g) => ({
        name: str(g.name) ?? '',
        products: list(g.products).map((p) => ({
          catalogueNo: str(p.catalogueNo) ?? '',
          productName: str(p.productName) ?? '',
          variant: str(p.variant) ?? '',
          specs: Object.fromEntries(
            Object.entries((p.specs as Json | null) ?? {}).map(([k, v]) => [k, str(v) ?? '']),
          ),
          hsnCode: str(p.hsnCode),
          packingQty: num(p.packingQty),
          unit: str(p.unit) ?? 'Pcs',
          price: num(p.price),
        })),
      })),
    })),
  };
}
