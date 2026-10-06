export function inferProductClass(item: {
  productClass?: string;
  name?: string;
  productName?: string;
}): string {
  const explicit = (item.productClass || "").trim();
  if (explicit) return explicit;
  const blob = `${item.name || ""} ${item.productName || ""}`;
  const match = blob.match(
    /SDR\s*13\.?5|SDR\s*11|Sch(?:edule)?\s*80|Sch(?:edule)?\s*40/i,
  );
  if (!match) return "";
  const token = match[0].replace(/\s+/g, " ").trim();
  if (/13/i.test(token)) return "SDR13.5";
  if (/11/i.test(token)) return "SDR11";
  if (/80/.test(token)) return "Sch 80";
  if (/40/.test(token)) return "Sch 40";
  return token;
}