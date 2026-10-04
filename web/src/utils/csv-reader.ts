export type CsvParseResult =
  | { ok: true; rows: Record<string, string>[]; encoding: string }
  | { ok: false; error: string };

export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function isBinaryOfficeFile(bytes: Uint8Array): boolean {
  return (
    (bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04) ||
    (bytes.length >= 8 &&
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0)
  );
}

function decode(bytes: Uint8Array): { encoding: string; text: string } {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { encoding: "utf-8-bom", text: new TextDecoder("utf-8").decode(bytes.slice(3)) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { encoding: "utf-16le", text: new TextDecoder("utf-16le").decode(bytes.slice(2)) };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { encoding: "utf-16be", text: new TextDecoder("utf-16be").decode(bytes.slice(2)) };
  }
  return { encoding: "utf-8", text: new TextDecoder("utf-8").decode(bytes) };
}

function sniffDelimiter(headerLine: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuote = false;
  for (const character of headerLine) {
    if (character === '"') {
      inQuote = !inQuote;
    } else if (!inQuote && character in counts) {
      counts[character] += 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ",";
}

function parseLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let value = "";
  let inQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (inQuote) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          inQuote = false;
        }
      } else {
        value += character;
      }
    } else if (character === delimiter) {
      cells.push(value);
      value = "";
    } else if (character === '"') {
      inQuote = true;
    } else {
      value += character;
    }
  }
  cells.push(value);
  return cells.map((cell) => cell.trim());
}

function findHeaderRowIndex(table: string[][]): number {
  for (let index = 0; index < Math.min(table.length, 8); index += 1) {
    const headers = table[index].map(normalizeHeader);
    if (
      headers.includes("category") ||
      headers.includes("product_name") ||
      headers.includes("product_code") ||
      headers.includes("name")
    ) {
      return index;
    }
  }
  return 0;
}

function tableToRowRecords(table: string[][]): Record<string, string>[] {
  if (table.length < 2) return [];
  const headerIndex = findHeaderRowIndex(table);
  const headers = table[headerIndex].map(normalizeHeader);
  const rows: Record<string, string>[] = [];
  for (let index = headerIndex + 1; index < table.length; index += 1) {
    const cells = table[index];
    if (!cells.some((cell) => cell.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, column) => {
      if (header) row[header] = (cells[column] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

export function parseCsvBytes(bytes: Uint8Array): CsvParseResult {
  if (isBinaryOfficeFile(bytes)) {
    return {
      ok: false,
      error:
        "This looks like an Excel file. Choose the .xlsx or export CSV (UTF-8) \u2014 the importer now accepts both.",
    };
  }

  const { encoding, text } = decode(bytes);
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return { ok: false, error: "CSV file is empty." };

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV must have a header row and at least one data row." };
  }

  const delimiter = sniffDelimiter(lines[0]);
  const rows = tableToRowRecords(lines.map((line) => parseLine(line, delimiter)));
  if (rows.length === 0) {
    return { ok: false, error: "CSV must have a header row and at least one data row." };
  }
  return { ok: true, rows, encoding };
}