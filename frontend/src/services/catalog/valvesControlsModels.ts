/**
 * Domain models for the "Valves & Controls" mock catalog
 * (src/mocks/valves_controls_mock_data.json) — mirrors Flutter
 * `valves_controls_catalog_models.dart`.
 *
 * Hierarchy: Catalog -> Category (price-list sheet) -> Group (product family)
 * -> Product (one catalogue number).
 */

export interface ValveProduct {
  catalogueNo: string;
  productName: string;
  /** Short label that tells this product apart within its group (e.g. "1/2\" (15 mm)"). */
  variant: string;
  /** Sheet columns in display order (Item Name, Material, End Connection, ...). */
  specs: Record<string, string>;
  hsnCode: string | null;
  /** Box quantity; null when unknown. */
  packingQty: number | null;
  unit: string;
  price: number;
}

export interface ValveGroup {
  name: string;
  products: ValveProduct[];
}

export interface ValveCategory {
  id: string;
  name: string;
  /** Fits the narrow mobile sidebar. */
  shortName: string;
  /** Flutter `appIcon` key, shown when `imageAsset` is empty. */
  icon: string;
  imageAsset: string;
  description: string;
  groups: ValveGroup[];
}

export interface ValvesControlsCatalog {
  category: string;
  description: string;
  categories: ValveCategory[];
}

type Json = Record<string, unknown>;

const str = (v: unknown): string | null => (v == null ? null : String(v));
const list = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

/** `ValvesControlsCatalog.fromJson` (same null/default handling as Flutter). */
export function valvesControlsCatalogFromJson(json: Json): ValvesControlsCatalog {
  return {
    category: str(json.category) ?? '',
    description: str(json.description) ?? '',
    categories: list(json.categories).map((c) => ({
      id: str(c.id) ?? '',
      name: str(c.name) ?? '',
      shortName: str(c.shortName) ?? '',
      icon: str(c.icon) ?? 'tune',
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
          packingQty: typeof p.packingQty === 'number' ? p.packingQty : null,
          unit: str(p.unit) ?? 'Pcs',
          price: num(p.price),
        })),
      })),
    })),
  };
}
