export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function sellingFromMrpDiscount(mrp: number, discountPercent: number) {
  return roundMoney(mrp * (1 - Math.max(0, discountPercent) / 100));
}

export function discountFromMrpSelling(mrp: number, selling: number) {
  if (!mrp) return 0;
  return roundMoney((1 - selling / mrp) * 100);
}
