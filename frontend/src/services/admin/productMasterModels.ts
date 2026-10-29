/** Admin Product master (web-only) — shapes of `product_master_mock_data.json`. */

export type MasterStatus = 'active' | 'inactive';

export interface MasterCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  /** PrimeIcons class, as in `catalog_mock_data.json`. */
  icon: string;
  imageAsset: string;
  iconColor: string;
  iconBackground: string;
  displayOrder: number;
  status: MasterStatus;
  updatedAt: string;
}

export interface MasterSubCategory {
  id: string;
  code: string;
  name: string;
  shortName: string;
  categoryId: string;
  description: string;
  hsnCode: string;
  status: MasterStatus;
  updatedAt: string;
}

/** Brand + its mapping to categories and sub-categories. */
export interface MasterBrand {
  id: string;
  code: string;
  name: string;
  description: string;
  website: string;
  logoColor: string;
  categoryIds: string[];
  subCategoryIds: string[];
  status: MasterStatus;
  updatedAt: string;
}

export interface MasterProduct {
  id: string;
  sku: string;
  name: string;
  brandId: string;
  categoryId: string;
  subCategoryId: string;
  unit: string;
  price: number;
}

export interface ProductGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  productIds: string[];
  status: MasterStatus;
  updatedAt: string;
}

/** One row read from a sub-category Excel file (columns match the template). */
export interface SubCategoryImportRow {
  code: string;
  name: string;
  shortName: string;
  categoryCode: string;
  description: string;
  hsnCode: string;
}

export const subCategoryColumns: (keyof SubCategoryImportRow)[] = [
  'code',
  'name',
  'shortName',
  'categoryCode',
  'description',
  'hsnCode',
];

/** A product group needs at least this many products. */
export const MIN_GROUP_PRODUCTS = 2;

/** "12 Oct 2026" — the date format used across the mocks. */
export const todayLabel = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

/** Case-insensitive match of `query` against any of `fields`. */
export const matchesQuery = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return q === '' || fields.some((f) => f.toLowerCase().includes(q));
};

const BOM = String.fromCharCode(0xfeff);

/** Downloads rows as a UTF-8 CSV (with BOM so Excel reads ₹ and ½ correctly). */
export function downloadCsv(fileName: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([BOM, csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Everything the Product master tabs read and edit (local state, seeded from the mock). */
export interface MasterData {
  categories: MasterCategory[];
  subCategories: MasterSubCategory[];
  brands: MasterBrand[];
  products: MasterProduct[];
  groups: ProductGroup[];
}

/** A saved row as editable form values (drops `id` and `updatedAt`). */
export function formOf<T extends { id: string; updatedAt: string }>(
  row: T,
): Omit<T, 'id' | 'updatedAt'> {
  const form: Partial<T> = { ...row };
  delete form.id;
  delete form.updatedAt;
  return form as Omit<T, 'id' | 'updatedAt'>;
}
