// CSV parsing utilities for admin bulk import.
// Handles encoding auto-detect (UTF-8, UTF-8 BOM, UTF-16 LE/BE) and blocks
// binary xlsx/xls uploads with a clear signal.

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
  sizeMm?: number;
  sizeInch?: string;
  productCode?: string;
  length?: string;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  discount?: number;
  imageUrl?: string;
  isActive?: boolean;
};

// Excel file magic bytes:
//   .xlsx (ZIP): PK\x03\x04         -> 50 4B 03 04
//   .xls (OLE):  D0 CF 11 E0 A1 B1 1A E1
function isBinaryOfficeFile(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    return true;
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  ) {
    return true;
  }
  return false;
}

function detectEncodingAndDecode(bytes: Uint8Array): {
  encoding: string;
  text: string;
} {
  // BOM checks
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

// Minimal RFC-4180-ish CSV row parser (handles quoted fields with commas / escaped quotes).
function parseCsvLine(line: string): string[] {
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
    } else {
      if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuote = true;
      } else {
        cur += ch;
      }
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
        "Excel files (.xlsx / .xls) are not supported. Please export as CSV (UTF-8) and try again.",
    };
  }
  const { encoding, text } = detectEncodingAndDecode(bytes);
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return { ok: false, error: "CSV file is empty." };

  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV must have a header row and at least one data row." };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return { ok: true, rows, encoding };
}

// Map CSV rows (case-insensitive headers) to ImportItem[].
// Accepted headers: name, category (optional), unit, rate | standardrate | price
export function rowsToItems(rows: Record<string, string>[]): {
  items: ImportItem[];
  invalid: number;
} {
  const items: ImportItem[] = [];
  let invalid = 0;
  for (const r of rows) {
    const name = (r["product_name"] || r["name"] || r["item"] || r["item name"] || "").trim();
    const category = (r["category"] || "").trim();
    const unit = (r["unit"] || r["uom"] || "").trim();
    const rateRaw = r["selling_price"] ?? r["sellingprice"] ?? r["standardrate"] ?? r["standard rate"] ?? r["rate"] ?? r["price"] ?? "";
    const rate = parseFloat(String(rateRaw).replace(/[,\s]/g, ""));

    if (!name || !unit || Number.isNaN(rate)) {
      invalid++;
      continue;
    }
    items.push({
      name,
      productName: name,
      category: category || undefined,
      unit,
      standardRate: rate,
      type: clean(r["type"]),
      productGroup: clean(r["product_group"] || r["productgroup"]),
      brand: clean(r["brand"]),
      sizeMm: numberOrUndefined(r["size_mm"] || r["sizemm"]),
      sizeInch: clean(r["size_inch"] || r["sizeinch"]),
      productCode: clean(r["product_code"] || r["productcode"]),
      length: clean(r["length"]),
      mrp: numberOrUndefined(r["mrp"]),
      sellingPrice: numberOrUndefined(r["selling_price"] || r["sellingprice"]),
      purchasePrice: numberOrUndefined(r["purchase_price"] || r["purchaseprice"]),
      discount: numberOrUndefined(r["discount"]),
      imageUrl: clean(r["image_url"] || r["imageurl"]),
      isActive: parseBoolean(r["is_active"] || r["isactive"]),
    });
  }

  function clean(value: string | undefined): string | undefined {
    const trimmed = (value || "").trim();
    return trimmed || undefined;
  }

  function numberOrUndefined(value: string | undefined): number | undefined {
    const parsed = parseFloat((value || "").replace(/[,\s]/g, ""));
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  function parseBoolean(value: string | undefined): boolean | undefined {
    if (!value?.trim()) return undefined;
    return !["false", "0", "no", "inactive"].includes(value.trim().toLowerCase());
  }
  return { items, invalid };
}
