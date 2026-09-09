export function sizeMmLabel(item: { size?: string | null; sizeMm?: number | null; sizeCm?: number | null }) {
  if (item.sizeCm != null) return `${item.sizeCm} cm`;
  if (item.size?.trim()) return item.size.trim();
  if (item.sizeMm != null) return `${item.sizeMm} mm`;
  return "";
}

export function sizeInchLabel(item: { sizeInch?: string | null }) {
  return item.sizeInch?.trim() || "";
}

export function sizeLengthLabel(item: { length?: string | null }) {
  return item.length?.trim() || "";
}

export function formatProductSize(item: {
  size?: string | null;
  sizeMm?: number | null;
  sizeCm?: number | null;
  sizeInch?: string | null;
  length?: string | null;
}) {
  return [sizeMmLabel(item), sizeInchLabel(item), sizeLengthLabel(item)].filter(Boolean).join(" · ");
}

export function parseSizeMm(value: string) {
  const match = String(value || "").replace(/,/g, "").match(/[-+]?\d*\.?\d+/);
  if (!match) return undefined;
  const n = parseFloat(match[0]);
  return Number.isNaN(n) ? undefined : n;
}
