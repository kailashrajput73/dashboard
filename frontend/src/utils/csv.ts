// CSV / spreadsheet row mapping for admin bulk import.
// Handles encoding auto-detect (UTF-8, UTF-8 BOM, UTF-16 LE/BE).

export type CsvParseResult =
  | { ok: true; rows: Record<string, string>[]; encoding: string }
  | { ok: false; error: string };

export type ImportItem = {
  name: string;
  category?: string;
  unit: string;
  standardRate: number;
  type?: string;
  productGroup?: string;
  brand?: string;
  productName?: string;
  subcategory?: string;
  size?: string;
  sizeMm?: number;
  sizeCm?: number;
  sizeInch?: string;
  length?: string;
  productCode?: string;
  stdPkg?: number;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  discount?: number;
  stock?: number;
  imageUrl?: string;
  isActive?: boolean;
};

export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function isBinaryOfficeFile(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return true;
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  ) {
    return true;
  }
  return false;
}

function detectEncodingAndDecode(bytes: Uint8Array): {
  encoding: string;
  text: string;
} {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return {
      encoding: "utf-8-bom",
      text: new TextDecoder("utf-8").decode(bytes.slice(3)),
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      encoding: "utf-16le",
      text: new TextDecoder("utf-16le").decode(bytes.slice(2)),
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      encoding: "utf-16be",
      text: new TextDecoder("utf-16be").decode(bytes.slice(2)),
    };
  }
  return { encoding: "utf-8", text: new TextDecoder("utf-8").decode(bytes) };
}

function sniffDelimiter(headerLine: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuote = false;
  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && ch in counts) counts[ch] += 1;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as string) || ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === delimiter) {
      cells.push(cur);
      cur = "";
    } else if (ch === '"') {
      inQuote = true;
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

export function parseCsvBytes(bytes: Uint8Array): CsvParseResult {
  if (isBinaryOfficeFile(bytes)) {
    return {
      ok: false,
      error:
        "This looks like an Excel file. Choose the .xlsx or export CSV (UTF-8) — the importer now accepts both.",
    };
  }
  const { encoding, text } = detectEncodingAndDecode(bytes);
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return { ok: false, error: "CSV file is empty." };

  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV must have a header row and at least one data row." };
  }

  const delimiter = sniffDelimiter(lines[0]);
  const header = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      if (h) row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return { ok: true, rows, encoding };
}

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function clean(value: string): string | undefined {
  return value.trim() || undefined;
}

function numberOrUndefined(value: string): number | undefined {
  const match = value.replace(/,/g, "").match(/[-+]?\d*\.?\d+/);
  if (!match) return undefined;
  const parsed = parseFloat(match[0]);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseBoolean(value: string): boolean | undefined {
  if (!value.trim()) return undefined;
  return !["false", "0", "no", "inactive"].includes(value.trim().toLowerCase());
}

/** Sheet discount is often 0.25 (= 25%). Older sheets use 25 or 25%. */
export function discountToPercent(value: number | undefined): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  if (value > 0 && value < 1) return Math.round(value * 10000) / 100;
  return value;
}

/**
 * Excel turns 1/2 and 3/4 into dates (Jan 2, Mar 4). Restore inch fractions.
 */
export function recoverSizeInch(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/[½¼¾⅓⅔⅛⅜⅝⅞]/.test(value) || /\d+\s+\d+\s*\/\s*\d+/.test(value)) return value;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (iso) return `${Number(iso[2])}/${Number(iso[3])}`;

  const serial = Number(value);
  // Current-year Excel dates are ~40k–60k. Do not treat 1.5 / 2 as dates.
  if (Number.isFinite(serial) && serial >= 20000 && serial <= 80000 && !value.includes("/")) {
    const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
    const d = new Date(utc);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  }

  const named = value.match(/^(\d{1,2})[- ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
  if (named) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(named[2].slice(0, 3).toLowerCase()) + 1;
    return `${month}/${Number(named[1])}`;
  }
  const dated = value.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]\d{2,4})?$/);
  if (dated) return `${Number(dated[1])}/${Number(dated[2])}`;
  return value;
}

function displayProductName(productName: string, productGroup: string): string {
  const name = productName.trim();
  const group = productGroup.trim();
  if (!group) return name;
  if (name.toLowerCase().includes(group.toLowerCase())) return name;
  return `${name} ${group}`.trim();
}

function stripCode(value: string): string | undefined {
  const cleaned = value.replace(/\^+$/g, "").trim();
  return cleaned || undefined;
}

export function rowsToItems(rows: Record<string, string>[]): {
  items: ImportItem[];
  invalid: number;
} {
  const items: ImportItem[] = [];
  let invalid = 0;
  for (const r of rows) {
    const productName = cell(r, "product_name", "name", "item", "item_name");
    const productGroup = cell(r, "product_group", "productgroup", "group");
    const name = displayProductName(productName, productGroup);
    const category = cell(r, "category");
    const unit = cell(r, "unit", "uom") || "pcs";
    const subcategory = cell(r, "sub_category", "subcategory", "type");
    const sellingRaw = cell(
      r,
      "selling_price",
      "sellingprice",
      "standard_rate",
      "standardrate",
      "rate",
      "price",
    );
    const mrp = numberOrUndefined(
      cell(r, "mrp_rs_per_pc", "mrp_rs_per_pc_", "mrp", "price_rs_per_pc", "price_per_pc"),
    );
    const discount = discountToPercent(numberOrUndefined(cell(r, "discount")));
    let rate = numberOrUndefined(sellingRaw);
    if (rate == null && mrp != null) {
      rate = Math.round(mrp * (1 - Math.max(0, discount || 0) / 100) * 100) / 100;
    }

    if (!name || rate == null) {
      invalid++;
      continue;
    }
    const sizeCm = numberOrUndefined(cell(r, "size_cm", "sizecm"));
    const sizeMm = numberOrUndefined(cell(r, "size_mm", "sizemm"));
    const sizeLegacy = clean(cell(r, "size"));
    items.push({
      name,
      productName: productName || name,
      category: category || undefined,
      unit,
      standardRate: rate,
      type: clean(subcategory) || clean(cell(r, "type")),
      subcategory: clean(subcategory),
      productGroup: clean(productGroup),
      brand: clean(cell(r, "brand")),
      size: sizeCm != null ? `${sizeCm} cm` : sizeMm != null ? `${sizeMm} mm` : sizeLegacy,
      sizeMm,
      sizeCm,
      sizeInch: recoverSizeInch(cell(r, "size_inch", "sizeinch")) || undefined,
      productCode: stripCode(cell(r, "product_code", "productcode", "sku", "code")),
      length: clean(cell(r, "length")),
      stdPkg: numberOrUndefined(cell(r, "std_pkg_nos", "std_pkg", "stdpkg", "packing", "pack_qty")),
      mrp,
      sellingPrice: numberOrUndefined(sellingRaw) ?? rate,
      purchasePrice: numberOrUndefined(cell(r, "purchase_price", "purchaseprice")),
      discount,
      stock: numberOrUndefined(cell(r, "stock_qty", "stockqty", "stock", "qty")),
      imageUrl: clean(cell(r, "image_url", "imageurl", "image", "photo")),
      isActive: parseBoolean(cell(r, "is_active", "isactive")),
    });
  }
  return { items, invalid };
}
