const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Flutter `formatInr` — "₹ 12,550". */
export const formatInr = (value: number) => `₹ ${rupees.format(Math.round(value))}`;

/** Fills `{key}` placeholders in mock copy. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
