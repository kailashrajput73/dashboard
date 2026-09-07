export function formatProductSize(item: {
  size?: string | null;
  sizeMm?: number | null;
  sizeInch?: string | null;
  length?: string | null;
}) {
  const parts = [
    item.size?.trim() || (item.sizeMm != null && item.sizeMm !== undefined ? `${item.sizeMm} mm` : ""),
    item.sizeInch?.trim() || "",
    item.length?.trim() || "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function parseSizeMm(value: string) {
  const match = String(value || "").replace(/,/g, "").match(/[-+]?\d*\.?\d+/);
  if (!match) return undefined;
  const n = parseFloat(match[0]);
  return Number.isNaN(n) ? undefined : n;
}
