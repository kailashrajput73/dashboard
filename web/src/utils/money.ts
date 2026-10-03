export function formatMoney(value: number): string {
  const amount = Number(value) || 0;
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
