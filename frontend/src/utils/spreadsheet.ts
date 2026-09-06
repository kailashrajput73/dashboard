import { parseCsvBytes, normalizeHeader, type CsvParseResult } from "./csv";

const LOCAL_FILE = 0x04034b50;
const CENTRAL_DIR = 0x02014b50;
const EOCD = 0x06054b50;

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read Excel files. Export CSV (UTF-8) and try again.");
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEocd(bytes: Uint8Array): number {
  const min = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (u32(bytes, i) === EOCD) return i;
  }
  return -1;
}

async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const eocd = findEocd(bytes);
  if (eocd < 0) throw new Error("Could not read the Excel workbook.");
  let offset = u32(bytes, eocd + 16);
  const entries = u16(bytes, eocd + 10);
  for (let n = 0; n < entries; n++) {
    if (u32(bytes, offset) !== CENTRAL_DIR) break;
    const method = u16(bytes, offset + 10);
    const compSize = u32(bytes, offset + 20);
    const nameLen = u16(bytes, offset + 28);
    const extraLen = u16(bytes, offset + 30);
    const commentLen = u16(bytes, offset + 32);
    const localOffset = u32(bytes, offset + 42);
    const name = new TextDecoder("utf-8").decode(bytes.slice(offset + 46, offset + 46 + nameLen));
    const localNameLen = u16(bytes, localOffset + 26);
    const localExtraLen = u16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = bytes.slice(dataStart, dataStart + compSize);
    let raw = compressed;
    if (method === 8) raw = await inflateRaw(compressed);
    else if (method !== 0) throw new Error(`Unsupported Excel compression (${method}). Export CSV and try again.`);
    files.set(name, raw);
    offset += 46 + nameLen + extraLen + commentLen;
  }
  if (files.size === 0 && u32(bytes, 0) === LOCAL_FILE) {
    throw new Error("Could not read the Excel workbook. Export CSV (UTF-8) and try again.");
  }
  return files;
}

function decodeXml(bytes: Uint8Array) {
  return new TextDecoder("utf-8").decode(bytes);
}

function localName(node: Element) {
  return node.localName || node.tagName.replace(/^.*:/, "");
}

function descendants(root: ParentNode, name: string): Element[] {
  return Array.from(root.getElementsByTagName("*")).filter(
    (el) => el instanceof Element && localName(el) === name,
  ) as Element[];
}

function colIndex(ref: string) {
  const match = ref.match(/^[A-Z]+/i);
  if (!match) return 0;
  let n = 0;
  for (const ch of match[0].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSharedStrings(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return descendants(doc, "si").map((si) =>
    descendants(si, "t")
      .map((t) => t.textContent || "")
      .join(""),
  );
}

function cellText(cell: Element, shared: string[]): string {
  const type = cell.getAttribute("t") || "";
  if (type === "inlineStr") {
    return descendants(cell, "t")
      .map((t) => t.textContent || "")
      .join("");
  }
  const value = descendants(cell, "v")[0]?.textContent || "";
  if (type === "s") return shared[Number(value)] || "";
  if (type === "b") return value === "1" ? "true" : "false";
  return value;
}

function parseSheetRows(xml: string, shared: string[]): string[][] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const rows: string[][] = [];
  for (const row of descendants(doc, "row")) {
    const line: string[] = [];
    for (const cell of descendants(row, "c")) {
      if (cell.parentElement !== row) continue;
      const ref = cell.getAttribute("r") || "";
      const idx = colIndex(ref);
      while (line.length < idx) line.push("");
      line[idx] = cellText(cell, shared).trim();
    }
    if (line.some((c) => c)) rows.push(line);
  }
  return rows;
}

function sheetPath(files: Map<string, Uint8Array>): string | null {
  const rels = files.get("xl/_rels/workbook.xml.rels");
  if (rels) {
    const xml = decodeXml(rels);
    const targets = [...xml.matchAll(/Target="([^"]+)"/g)].map((m) => m[1].replace(/^\//, ""));
    const sheet = targets.find((t) => t.includes("worksheets/"));
    if (sheet) return sheet.startsWith("xl/") ? sheet : `xl/${sheet.replace(/^\.\//, "")}`;
  }
  for (const name of files.keys()) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(name)) return name;
  }
  return null;
}

async function parseXlsxBytes(bytes: Uint8Array): Promise<CsvParseResult> {
  if (typeof DOMParser === "undefined") {
    return { ok: false, error: "Excel import needs a web browser. Export CSV (UTF-8) if you are on a phone." };
  }
  try {
    const files = await unzip(bytes);
    const path = sheetPath(files);
    if (!path || !files.has(path)) {
      return { ok: false, error: "The Excel file has no worksheet to import." };
    }
    const sharedXml = files.get("xl/sharedStrings.xml");
    const shared = sharedXml ? parseSharedStrings(decodeXml(sharedXml)) : [];
    const table = parseSheetRows(decodeXml(files.get(path)!), shared);
    if (table.length < 2) {
      return { ok: false, error: "Spreadsheet must have a header row and at least one data row." };
    }
    const header = table[0].map((h) => normalizeHeader(h));
    const rows = table.slice(1).map((cells) => {
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        if (h) row[h] = cells[idx] ?? "";
      });
      return row;
    });
    return { ok: true, rows, encoding: "xlsx" };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not read the Excel file. Export CSV (UTF-8) and try again." };
  }
}

export async function parseSpreadsheetBytes(bytes: Uint8Array, fileName = ""): Promise<CsvParseResult> {
  const lower = fileName.toLowerCase();
  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  const isXls =
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;
  if (isXls || lower.endsWith(".xls")) {
    return {
      ok: false,
      error: "Old Excel .xls files are not supported. Save as .xlsx or CSV (UTF-8) and try again.",
    };
  }
  if (isZip || lower.endsWith(".xlsx")) return parseXlsxBytes(bytes);
  return parseCsvBytes(bytes);
}
